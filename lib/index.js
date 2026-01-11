import { build } from 'esbuild';
import { relative, extname } from 'path';
import { loadOptions, transform } from '@babel/core';

function es5PluginInit() {
  return function es5Plugin(files, ms, done) {
    const isDev = ms.env('NODE_ENV') === 'development';
    const transforms = [];
    const options = loadOptions({
      envName: ms.env('NODE_ENV'),
      presets: [['@babel/preset-env', {
        useBuiltIns: 'entry',
        corejs: '3.22'
      }]],
      targets: '> 0.25%, not dead',
      minified: !isDev,
      comments: isDev,
      cwd: ms.directory()
      //inputSourceMap
    });
    Object.values(files).forEach(file => {
      if (file.__babelPostProcess) {
        transforms.push(new Promise((resolve, reject) => {
          transform(file.contents.toString(), options, (err, result) => {
            if (err) reject(err);
            file.contents = Buffer.from(result.code);
            delete file.__babelPostProcess;
            resolve();
          });
        }));
      }
    });
    Promise.all(transforms).then(() => done()).catch(done);
  };
}

const debugNs = '@metalsmith/js-bundle';

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
  const entryPoints = options.entries || {};
  const msDir = metalsmith.directory();
  const isProd = metalsmith.env('NODE_ENV') !== 'development';
  const define = Object.entries(options.define || metalsmith.env()).reduce((acc, [name, value]) => {
    if (typeof value === 'undefined') {
      debug.warn('Define option "%s" value is undefined', name);
      acc[`process.env.${name}`] = 'undefined';
      return acc;
    }
    // see notes at https://esbuild.github.io/api/#define, string values require explicit quotes
    acc[`process.env.${name}`] = typeof value === 'string' ? `'${value}'` : ['boolean', 'number', 'function'].includes(typeof value) ? value.toString() : JSON.stringify(value);
    return acc;
  }, {});

  /** @type {Options} */
  const defaults = {
    bundle: true,
    minify: isProd,
    sourcemap: !isProd,
    platform: 'browser',
    target: 'es6',
    assetNames: '[dir]/[name]',
    drop: isProd ? ['console', 'debugger'] : []
  };

  /** @type {Options} */
  const overwrites = {
    entryPoints,
    absWorkingDir: msDir,
    outdir: relative(msDir, metalsmith.destination()),
    write: false,
    metafile: true,
    define
  };

   
  const {
    entries,
    ...otherOptions
  } = options;
  return {
    ...defaults,
    ...otherOptions,
    ...overwrites
  };
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
  let babelPostProcess = false;
  if (options.target === 'es5') {
    babelPostProcess = true;
    options.target = 'es6';
    options.minify = false;
  }
  return function jsBundle(files, metalsmith, done) {
    const debug = metalsmith.debug(debugNs);
    const normalizedOptions = normalizeOptions(options, metalsmith, debug);
    const entrypoints = normalizedOptions.entryPoints;
    debug('Running with options %O', normalizedOptions);
    if (Object.keys(entrypoints).length === 0) {
      debug.warn('No files to process, skipping.');
      done();
      return;
    }
    const src = metalsmith.source();
    const dest = metalsmith.destination();
    const isFullyInSource = Object.values(entrypoints).every(sourcepath => {
      return metalsmith.path(sourcepath).startsWith(src);
    });
    if (isFullyInSource) {
      debug.info('All entries to bundle are in metalsmith.source(), setting `outbase` to metalsmith.source()');
      normalizedOptions.outbase = src;
    }
    normalizedOptions.entryPoints = Object.entries(entrypoints).reduce((mapped, current) => {
      const [dest, src] = current;
      mapped[dest] = src;
      return mapped;
    }, {});
    const sourceRelPath = relative(metalsmith.directory(), src);
    build(normalizedOptions).then(result => {
      // the lines below until #L138 must be revisited, they can definitely be simplified.
      // esbuild outputFiles return absolute paths, while metafile.outputs has a { 'output/path': { inputs: { 'input/path' }, imports: {...}}} format
      // furthermore it looks like 'file' loader inputs will NOT be removed from the build
      debug('Finished processing files %O', result.outputFiles.map(o => relative(dest, o.path)));

      // first read esbuild metafile to remove the compilation inputs from the build
      Object.values(result.metafile.outputs).forEach(o => {
        if (o.inputs) {
          metalsmith.match(`${sourceRelPath}/**`, Object.keys(o.inputs)).forEach(input => {
            delete files[relative(src, metalsmith.path(input))];
          });
        }
      });
      debug('Adding processed files to build');
      result.outputFiles.forEach(file => {
        // strip the metalsmith.destination()
        const destPath = relative(dest, file.path);
        files[destPath] = {
          contents: Buffer.from(file.contents.buffer)
        };
        if (babelPostProcess && extname(destPath) === '.js') {
          files[destPath].__babelPostProcess = true;
        }
      });
      if (babelPostProcess) {
        debug('Post-processing with babel');
        es5PluginInit()(files, metalsmith, done);
      } else {
        done();
      }
    }).catch(err => {
      done(err);
    });
  };
}

export { initJsBundle as default };
//# sourceMappingURL=index.js.map
