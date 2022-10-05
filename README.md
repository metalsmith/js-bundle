# @metalsmith/js-bundle

A metalsmith plugin that bundles your JS using [esbuild](https://esbuild.github.io) with sensible defaults (and [babel](https://babeljs.io) for ES5)

[![metalsmith: core plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![ci: build][ci-badge]][ci-url]
[![code coverage][codecov-badge]][codecov-url]
[![license: MIT][license-badge]][license-url]

## Features

- Transpiles ESnext to ES6 with esbuild, and falls back on a Babel compatibility layer for ES5
- Supports most ESbuild options including custom loaders and plugins
- Available in CommonJS and ESM

## Installation

NPM:

```
npm install @metalsmith/js-bundle
```

Yarn:

```
yarn add @metalsmith/js-bundle
```

## Usage

Pass `@metalsmith/js-bundle` to `metalsmith.use` :

```js
import jsBundle from '@metalsmith/js-bundle'

metalsmith.use(
  jsBundle({
    // defaults
    entries: {
      index: 'lib/index.js'
    }
  })
)

const isProd = metalsmith.env('NODE_ENV') !== 'development'
metalsmith.use(
  jsBundle({
    // explicit defaults
    bundle: true,
    minify: isProd,
    sourcemap: !isProd,
    platform: 'browser',
    target: 'es6',
    assetNames: '[dir]/[name]',
    // accessible as process.env.<NAME> in your JS files
    define: metalsmith.env(),
    // removes console & debugger statements
    drop: isProd ? ['console', 'debugger'] : [],
    entries: {
      index: 'lib/index.js'
    }
  })
)
```

The key of the `entries` option determines the location of the processed file. For example `index: 'lib/index.js'` will result in `/index.js`, while `'/assets/index': 'lib/index.js'` will result in `/assets/index.js'.

The paths in the `entries` option should be relative to `metalsmith.directory()`.

### Options

`@metalsmith/js-bundle` provides access to most underlying [esbuild options](https://esbuild.github.io/api/#build-api), with a few notable differences:

The options `absWorkingDir` (=`metalsmith.directory()`), `outdir` (=`metalsmith.destination()`), `write` (=`false`), and `metafile` (=`true`) can not be set, they are determined by the plugin.

The option `entryPoints` is renamed to `entries`. Specify `entries` as a `{'target': 'path/to/source.js' }`} object, and mind that the target _should not have an extension_.

The option `define` is automatically filled with `metalsmith.env()`, but can be overwritten if desired. `metalsmith.env('DEBUG')` would be accessible in the bundle as `process.env.DEBUG`.

### Loading assets

You can load assets with any of the [ESbuild loaders](https://esbuild.github.io/content-types/) by specifying a loader map. By default there is support for `.js`,`.ts`,`.css`,`.json`,`.jsx`,`.tsx`, and `.txt` loading. It's important to note 2 things:

- assets loaded with any loader but the `file` loader will be "embedded" in the resulting JS bundle and removed from the build (=not available for other plugins), increasing bundle size.
- if you would like to process assets loaded with the `file` loader with other metalsmith plugins (eg [metalsmith-imagemin](https://github.com/ahmadnassri/metalsmith-imagemin))
  `@metalsmith/js-bundle` needs to be _run first_ and you should not overwrite the default [`assetNames` option](https://esbuild.github.io/api/#asset-names) `[dir]/[name]`.

The [file loader](https://esbuild.github.io/content-types/#external-file) is the loader you need for most large asset types you wouldn't want to bloat your JS bundle with.
If you want to use inline SVG's, you would set its loader to `text`, while if you prefer loading them in image tags, you could set them to `dataurl` (embedded) or `file` (external).

The [`publicPath` option](https://esbuild.github.io/api/#public-path) will prepend a path to each asset loaded with the `file` loader. This can be useful if you are serving the metalsmith build from a non-root URI.

```js
metalsmith.use(
  jsbundle({
    entries: { index: 'src/index.js' },
    loader: {
      '.png': 'file',
      '.svg': 'dataurl',
      '.jpg': 'file', // this will be a relative URI
      '.yaml': 'text' // this will be a parseable string
    },
    publicPath: metalsmith.env('NODE_ENV') === 'development' ? '' : 'https://johndoe.com'
  })
)
```

### ES5 transpilation support

ESbuild does not support compiling to ES5 (ie. supporting IE 11 and some older mobile browsers).
Nevertheless you can specify the `target: 'es5'` option and `@metalsmith/js-bundle` will let ESbuild handle bundling and fall back on Babel to provide a compatibility layer. The side effects of this are a slower and bigger build and currently, no support for source maps. However, you can make the target depend on an environment variable and enjoy sourcemaps in development, eg:

```js
const isDev = process.env.NODE_ENV === 'development'

metalsmith.use(
  jsbundle({
    entries: { index: 'src/index.js' },
    target: isDev ? 'es6' : 'es5'
  })
)
```

At the moment, passing options to Babel is not supported. A Babel production build will have basic minification, but without further (mangling) optimizations. You could choose to use [metalsmith-uglifyjs](https://github.com/ubenzer/metalsmith-uglifyjs) to further optimize it.

Alternatively you could run `@metalsmith/jsbundle` twice, 1 with target es5, and 1 with higher, and decide with an inline script at run-time which bundle to inject.

### Debug

To enable debug logs, set `metalsmith.env('DEBUG', '@metalsmith/js-bundle*')` or in `metalsmith.json`: `"env": { "DEBUG": "@metalsmith/js-bundle*" }`.
You can also pass the live environment variable by running `metalsmith.env('DEBUG', process.env.DEBUG)` or in `metalsmith.json`: `"env": { "DEBUG": "$DEBUG" }`

Alternatively you can set `DEBUG` to `@metalsmith/*` to debug all Metalsmith core plugins.

### CLI usage

To use this plugin with the Metalsmith CLI, add `@metalsmith/js-bundle` to the `plugins` key in your `metalsmith.json` file:

```json
{
  "plugins": [
    {
      "@metalsmith/js-bundle": {
        "entries": {
          "app": "lib/main.js"
        }
      }
    }
  ]
}
```

## License

[MIT](LICENSE)

[npm-badge]: https://img.shields.io/npm/v/@metalsmith/js-bundle.svg
[npm-url]: https://www.npmjs.com/package/@metalsmith/js-bundle
[ci-badge]: https://github.com/metalsmith/js-bundle/actions/workflows/test.yml/badge.svg
[ci-url]: https://github.com/metalsmith/js-bundle/actions/workflows/test.yml
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-core_plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[codecov-badge]: https://img.shields.io/coveralls/github/metalsmith/js-bundle
[codecov-url]: https://coveralls.io/github/metalsmith/js-bundle
[license-badge]: https://img.shields.io/github/license/metalsmith/js-bundle
[license-url]: LICENSE
