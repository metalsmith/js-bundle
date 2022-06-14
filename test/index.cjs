/* eslint-env node, mocha */

const assert = require('assert')
const equals = require('assert-dir-equal')
const Metalsmith = require('metalsmith')
const { name } = require('../package.json')
/* eslint-disable-next-line */
const plugin = require('../lib/index.cjs')
const tomlPlugin = require('esbuild-plugin-toml')
const updateSnapshots = Array.prototype.slice.call(process.argv, 2).indexOf('--updateSnapshots') > -1

function fixture(p) {
  return require('path').resolve(__dirname, 'fixtures', p)
}

function initUnitTestSnapshots(destination) {
  return function unitTesting(files, metalsmith, done) {
    const cloned = Object.entries(files).reduce((all, [key, value]) => {
      all[key] = Object.assign({}, value)
      return all
    }, {})
    const cachedDest = metalsmith.destination()
    const cachedClean = metalsmith.clean()
    let err
    metalsmith
      .destination(destination)
      .clean(true)
      .run(cloned, metalsmith.plugins.filter(x => x !== unitTesting))
      .then((cloned) => {
        return metalsmith.write(cloned)
      })
      .then(() => {
        done()
      })
      .catch(error => {
        err = error
      })
      .finally(() => {
        metalsmith.destination(cachedDest).clean(cachedClean)
        done(err)
      })
  }
}
const testcases = [
  {
    name: 'should not crash the metalsmith build when using default options',
    dir: 'default'
  },
  {
    name: 'should do simple bundling',
    dir: 'basic',
    options: {
      entries: { 'index': 'index.js' }
    }
  },
  {
    name: 'should support built-in loaders',
    dir: 'built-in-loaders',
    options: {
      entries: { 'index': 'index.js' },
      loader: {
        '.png': 'dataurl',
        '.svg': 'text',
        '.jpg': 'file'
      }
    }
  },
  {
    name: 'should support compiling in-source files',
    dir: 'in-source',
    options: {
      entries: { 'index': './src/index.js' },
      loader: {
        '.png': 'file',
        '.svg': 'file',
        '.jpg': 'file',
        '.css': 'file'
      },
      assetNames: '[dir]/[name]'
    }
  },
  {
    name: 'should support custom plugins',
    dir: 'custom-plugins',
    options: {
      entries: { 'index': './index.js' },
      plugins: [tomlPlugin()]
    }
  },
  {
    name: 'should fall back to babel when target is es5',
    dir: 'babel-fallback',
    options: {
      entries: { 'index': './index.js' },
      target: 'es5'
    }
  }
  // @TODO: add testcase for React/JSX
  // @TODO: add testcase for Typescript
]

describe('@metalsmith/js-bundle', function () {
  it('should export a named plugin function matching package.json name', function () {
    const namechars = name.split('/')[1]
    const camelCased = namechars.split('').reduce((str, char, i) => {
      str += namechars[i - 1] === '-' ? char.toUpperCase() : char === '-' ? '' : char
      return str
    }, '')
    assert.strictEqual(plugin().name, camelCased.replace(/~/g, ''))
  })

  testcases.forEach(({ name, dir, options }) => {
    it(name, function (done) {
      const ms = Metalsmith(fixture(dir))
        .env('DEBUG', process.env.DEBUG)
        .use(plugin(options))

      if (updateSnapshots) {
        ms.use(initUnitTestSnapshots('expected'))
      }

      ms.build()
        .then(() => {
          equals(fixture(`${dir}/build`), fixture(`${dir}/expected`))
          done()
        })
        .catch(done)
    })
  })
})
