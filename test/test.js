const postcss = require('postcss')
let expect = require('chai').expect

let plugin = require('../')

function process (input, opts) {
  return postcss([plugin(opts)]).process(input)
}

function test (input, output, opts, done) {
  process(input, opts)
    .then(function (result) {
      console.log(result.css.replace(/\s/g, ''))
      expect(result.css.replace(/\s/g, '')).to.eql(output)
      expect(result.warnings()).to.be.empty
      done()
    })
    .catch(function (error) {
      done(error)
    })
}

function testWarnings (input, output, warnings, opts, done) {
  process(input, opts)
    .then(function (result) {
      let occuredWarnings = result.warnings()
      expect(result.css).to.eql(output)
      expect(occuredWarnings.length).to.be.equal(warnings.length)
      occuredWarnings.forEach(function (warning, i) {
        expect(warning.type).to.be.equal('warning')
        expect(warning.text).to.be.equal(warnings[i])
      })
      done()
    })
    .catch(function (error) {
      done(error)
    })
}

function testErrors (input, reason, opts, done) {
  process(input, opts)
    .then(function () {
      done(new Error('No errors thrown'))
    })
    .catch(function (error) {
      expect(error.constructor.name).to.be.equal('CssSyntaxError')
      expect(reason).to.be.equal(error.reason)
      done()
    })
}

describe('postcss-suit', function () {
  describe('@utility', function () {
    it('works with name', function (done) {
      test('@utility utilityName {}', '.u-utilityName{}', {}, done)
    })

    it('works with multiple names', function (done) {
      test(
        '@utility utilityName1, utilityName2 {}',
        '.u-utilityName1,.u-utilityName2{}',
        {},
        done
      )
    })

    it('works with small', function (done) {
      test('@utility utilityName:small {}', '.u-sm-utilityName{}', {}, done)
    })

    it('works with medium', function (done) {
      test('@utility utilityName:medium {}', '.u-md-utilityName{}', {}, done)
    })

    it('works with large', function (done) {
      test('@utility utilityName:large {}', '.u-lg-utilityName{}', {}, done)
    })

    it('works with multiple names and sizes', function (done) {
      test(
        '@utility utilityName1:small, utilityName2:medium, utilityName3:large {}',
        '.u-sm-utilityName1,.u-md-utilityName2,.u-lg-utilityName3{}',
        {},
        done
      )
    })

    it('throws when no args are supplied', function (done) {
      testErrors('@utility {}', 'No names supplied to @utility', {}, done)
    })

    it('works when two args are supplied, the second of which is ignored', function (done) {
      test('@utility a b {}', '.u-a{}', {}, done)
    })
  })

  describe('@component-namespace', function () {
    it('should get removed when empty', function (done) {
      test('@component-namespace nmsp {}', '', {}, done)
    })
  })

  describe('@component', function () {
    it('works without properties', function (done) {
      test('@component ComponentName {}', '.ComponentName{}', {}, done)
    })

    it('works with properties', function (done) {
      test(
        '@component ComponentName { color: red; text-align: right; }',
        '.ComponentName{color:red;text-align:right;}',
        {},
        done
      )
    })

    it('works in @component-namespace', function (done) {
      test(
        '@component-namespace nmsp { @component ComponentName { color: red; text-align: right; } }',
        '.nmsp-ComponentName{color:red;text-align:right;}',
        {},
        done
      )
    })

    it('works with default namespace', function (done) {
      test(
        '@component ComponentName {color: red; text-align: right; }',
        '.myNS-ComponentName{color:red;text-align:right;}',
        {
          defaultNamespace: 'myNS'
        },
        done
      )
    })

    it('works in @component-namespace with default namespace', function (done) {
      test(
        '@component-namespace nmsp { @component ComponentName {color: red; text-align: right; } }',
        '.nmsp-ComponentName{color:red;text-align:right;}',
        {
          defaultNamespace: 'nmmmmsp'
        },
        done
      )
    })
  })

  describe('@modifier', function () {
    it('works without properties', function (done) {
      test(
        '@component ComponentName { @modifier modifierName {} }',
        '.ComponentName{}.ComponentName--modifierName{}',
        {},
        done
      )
    })

    it('works with properties', function (done) {
      test(
        `@component ComponentName { color: red; text-align: right; \n @modifier modifierName { color: blue; text-align: left; } }`,
        '.ComponentName{color:red;text-align:right;}.ComponentName--modifierName{color:blue;text-align:left;}',
        {},
        done
      )
    })
  })

  // describe("@descendent", function() {
  //   it("works without properties", function(done) {
  //     test(
  //       "@component ComponentName {@descendent descendentName {}}",
  //       ".ComponentName {}\n.ComponentName-descendentName {}",
  //       {},
  //       done
  //     )
  //   })

  //   it("works with properties", function(done) {
  //     test(
  //       "@component ComponentName {color: red text-align: right @descendent descendentName {color: blue text-align: left}}",
  //       ".ComponentName {\n    color: red\n    text-align: right\n}\n.ComponentName-descendentName {\n    color: blue\n    text-align: left\n}",
  //       {},
  //       done
  //     )
  //   })
  // })

  // describe("@when", function() {
  //   it("works without properties", function(done) {
  //     test(
  //       "@component ComponentName {@when stateName {}}",
  //       ".ComponentName {}\n.ComponentName.is-stateName {}",
  //       {},
  //       done
  //     )
  //   })

  //   it("works with properties", function(done) {
  //     test(
  //       "@component ComponentName {color: red text-align: right @when stateName {color: blue text-align: left}}",
  //       ".ComponentName {\n    color: red\n    text-align: right\n}\n.ComponentName.is-stateName {\n    color: blue\n    text-align: left\n}",
  //       {},
  //       done
  //     )
  //   })

  //   it("can be used in any selector", function(done) {
  //     test(
  //       ".ComponentName {color: red text-align: right @when stateName {color: blue text-align: left}}",
  //       ".ComponentName {color: red text-align: right}\n.ComponentName.is-stateName {color: bluetext-align: left}",
  //       {},
  //       done
  //     )
  //   })

  //   it("can not be used in root", function(done) {
  //     testErrors(
  //       "@when stateName {color: blue text-align: left}",
  //       "@when can only be used in rules which are not the root node",
  //       {},
  //       done
  //     )
  //   })
  // })
})
