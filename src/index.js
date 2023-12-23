import { build } from 'esbuild'
import { relative, extname } from 'path'
import es5Plugin from './es5.js'

const debugNs = '@metalsmith/js-bundle'

/**
 * @typedef {import('esbuild').BuildOptions} Options
 */

/**
 * Normalize plugin options
 * @param {Options} [options]
 * @param {import('metalsmith').Metalsmith} metalsmith
 * @returns {Object}
 */
function normalizeOptions(options = {}, metalsmith, debug) {
  const entryPoints = options.entries || {}
  const isProd = metalsmith.env('NODE_ENV') !== 'development'
  const define = Object.entries(options.define || metalsmith.env()).reduce((acc, [name, value]) => {
    if (typeof value === 'undefined') {
      debug.warn('Define option "%s" value is undefined', name)
      acc[`process.env.${name}`] = 'undefined'
      return acc
    }
    // see notes at https://esbuild.github.io/api/#define, string values require explicit quotes
    acc[`process.env.${name}`] =
      typeof value === 'string'
        ? `'${value}'`
        : ['boolean', 'number', 'function'].includes(typeof value)
          ? value.toString()
          : JSON.stringify(value)
    return acc
  }, {})

  /** @type {Options} */
  const defaults = {
    bundle: true,
    minify: isProd,
    sourcemap: !isProd,
    platform: 'browser',
    target: 'es6',
    assetNames: '[dir]/[name]',
    drop: isProd ? ['console', 'debugger'] : []
  }

  /** @type {Options} */
  const overwrites = {
    entryPoints,
    absWorkingDir: metalsmith.directory(),
    outdir: relative(metalsmith.directory(), metalsmith.destination()),
    write: false,
    metafile: true,
    define
  }

  // eslint-disable-next-line no-unused-vars
  const { entries, ...otherOptions } = options

  return {
    ...defaults,
    ...otherOptions,
    ...overwrites
  }
}

/**
 * A metalsmith plugin that bundles your JS using [esbuild](https://esbuild.github.io)
 * @example
 *
 * metalsmith.use(
 *   jsBundle({ entries: {
 *     index: 'lib/index.js',
 *     'second/src/file': 'second/bundle/output.js'
 *   }})
 * )
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
function initJsBundle(options = {}) {
  // esbuild does not support ES5 compilation
  // to avoid it throw an error, force at least ES6 and let esbuild do all the bundling, then postprocess and minify with babel
  let babelPostProcess = false
  if (options.target === 'es5') {
    babelPostProcess = true
    options.target = 'es6'
    options.minify = false
  }

  return function jsBundle(files, metalsmith, done) {
    const debug = metalsmith.debug(debugNs)
    const normalizedOptions = normalizeOptions(options, metalsmith, debug)
    debug('%o', options)
    debug('Running with options %O', normalizedOptions)
    if (Object.keys(normalizedOptions.entryPoints).length === 0) {
      debug.warn('No files to process, skipping.')
      done()
      return
    }

    const isFullyInSource = Object.values(normalizedOptions.entryPoints).every((sourcepath) => {
      return metalsmith.path(sourcepath).startsWith(metalsmith.source())
    })

    if (isFullyInSource) {
      debug.info('All entries to bundle are in metalsmith.source(), setting `outbase` to metalsmith.source()')
      normalizedOptions.outbase = metalsmith.source()
    }

    normalizedOptions.entryPoints = Object.entries(normalizedOptions.entryPoints).reduce((mapped, current) => {
      const [dest, src] = current
      mapped[dest] = src
      return mapped
    }, {})

    const sourceRelPath = relative(metalsmith.directory(), metalsmith.source())

    build(normalizedOptions)
      .then((result) => {
        debug(
          'Finished bundling %O',
          result.outputFiles.map((o) => relative(metalsmith.destination(), o.path))
        )

        // first read esbuild metafile to remove the compilation inputs from the build
        Object.values(result.metafile.outputs).forEach((o) => {
          if (o.inputs) {
            metalsmith.match(`${sourceRelPath}/**`, Object.keys(o.inputs)).forEach((input) => {
              delete files[relative(metalsmith.source(), metalsmith.path(input))]
            })
          }
        })

        result.outputFiles.forEach((file) => {
          // For in-source files, esbuild returns entries in the format 'build/src/path/to/file.ext'
          // first we strip the metalsmith.destination()
          let destPath = relative(metalsmith.destination(), file.path)

          // if the file was in-source, we strip the source path part (eg 'src') too.
          if (destPath.startsWith(sourceRelPath)) {
            destPath = relative(metalsmith.source(), metalsmith.path(destPath))
          }

          files[destPath] = {
            contents: Buffer.from(file.contents.buffer)
          }
          if (babelPostProcess && extname(destPath) === '.js') {
            files[destPath].__babelPostProcess = true
          }
        })

        if (babelPostProcess) {
          es5Plugin()(files, metalsmith, done)
        } else {
          done()
        }
      })
      .catch((err) => {
        done(err)
      })
  }
}

export default initJsBundle
