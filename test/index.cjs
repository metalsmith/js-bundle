const assert = require('assert')
const equals = require('assert-dir-equal')
const { describe, it } = require('mocha')
const Metalsmith = require('metalsmith')
const { name } = require('../package.json')
// eslint-disable-next-line node/no-missing-require
const plugin = require('../lib/index.cjs')

function fixture(p) {
  return require('path').resolve(__dirname, 'fixtures', p)
}

describe('@metalsmith/~core-plugin~', function () {
  it('should export a named plugin function matching package.json name', function () {
    const namechars = name.split('/')[1]
    const camelCased = namechars.split('').reduce((str, char, i) => {
      str += namechars[i - 1] === '-' ? char.toUpperCase() : char === '-' ? '' : char
      return str
    }, '')
    assert.strictEqual(plugin().name, camelCased.replace(/~/g, ''))
  })
  it('should not crash the metalsmith build when using default options', function (done) {
    Metalsmith(fixture('default'))
      .use(plugin())
      .build((err) => {
        if (err) done(err)
        assert.strictEqual(err, null)
        equals(fixture('default/build'), fixture('default/expected'))
        done()
      })
  })
})
