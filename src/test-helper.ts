declare var global: any
// declare var beforeEach: any
// declare var afterEach: any
// declare var jasmine: any
declare var Symbol: any

// jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000

// import * as isEqual from "lodash/isEqual"

import { root } from "rxjs/util/root"
import {TestScheduler} from "rxjs/testing/TestScheduler"

import * as marbleHelpers from "./marble-testing"

global.rxTestScheduler = null
global.cold = marbleHelpers.cold
global.hot = marbleHelpers.hot
global.expectObservable = marbleHelpers.expectObservable
global.expectSubscriptions = marbleHelpers.expectSubscriptions

const assertDeepEqual = marbleHelpers.assertDeepEqual

const glit = global.it

global.it = function(this: any, description: any, cb: any, _timeout: any) {
  if (cb.length === 0) {
    glit(description, function() {
      global.rxTestScheduler = new TestScheduler(assertDeepEqual)
      cb()
      global.rxTestScheduler.flush()
    })
  } else {
    glit.apply(this, arguments)
  }
}

global.it.asDiagram = function() {
  return global.it
}

const glfit = global.fit

global.fit = function(this: any, description: any, cb: any, _timeout: any) {
  if (cb.length === 0) {
    glfit(description, function() {
      global.rxTestScheduler = new TestScheduler(assertDeepEqual)
      cb()
      global.rxTestScheduler.flush()
    })
  } else {
    glfit.apply(this, arguments)
  }
}

function stringify(x: any): any {
  return JSON.stringify(x, function(_key: any, value: any) {
    if (Array.isArray(value)) {
      return "[" + value
        .map(function(i) {
          return "\n\t" + stringify(i)
        }) + "\n]"
    }
    return value
  })
    .replace(/\\"/g, '"')
    .replace(/\\t/g, "\t")
    .replace(/\\n/g, "\n")
}

/*
beforeEach(function() {
  jasmine.addMatchers({
    toDeepEqual: function(_util: any, _customEqualityTesters: any) {
      return {
        compare: function(actual: any, expected: any) {
          let result: any = { pass: isEqual(actual, expected) }

          if (!result.pass && Array.isArray(actual) && Array.isArray(expected)) {
            result.message = "Expected \n"
            actual.forEach(function(x) {
              result.message += stringify(x) + "\n"
            })
            result.message += "\nto deep equal \n"
            expected.forEach(function(x) {
              result.message += stringify(x) + "\n"
            })
          }

          return result
        },
      }
    },
  })
})
*/
/*
afterEach(function() {
  global.rxTestScheduler = null
});
*/
(function() {
  Object.defineProperty(Error.prototype, "toJSON", {
    value: function(this: any) {
      let alt: any = {}

      Object.getOwnPropertyNames(this).forEach(function(this: any, key: any) {
        if (key !== "stack") {
          alt[key] = this[key]
        }
      }, this)
      return alt
    },
    configurable: true,
  })

  global.__root__ = root
})()

global.lowerCaseO = function lowerCaseO() {
  const values = [].slice.apply(arguments)

  const o: any = {
    subscribe: function(observer: any) {
      values.forEach(function(v: any) {
        observer.next(v)
      })
      observer.complete()
    },
  }

  o[(<any> Symbol).observable] = function(this: any) {
    return this
  }

  return o
}
