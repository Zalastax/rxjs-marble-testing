declare var global: any
declare var expect: any

export function hot() {
  if (!global.rxTestScheduler) {
    throw "tried to use hot() in async test"
  }
  return global.rxTestScheduler.createHotObservable.apply(global.rxTestScheduler, arguments)
}

export function cold() {
  if (!global.rxTestScheduler) {
    throw "tried to use cold() in async test"
  }
  return global.rxTestScheduler.createColdObservable.apply(global.rxTestScheduler, arguments)
}

export function expectObservable() {
  if (!global.rxTestScheduler) {
    throw "tried to use expectObservable() in async test"
  }
  return global.rxTestScheduler.expectObservable.apply(global.rxTestScheduler, arguments)
}

export function expectSubscriptions() {
  if (!global.rxTestScheduler) {
    throw "tried to use expectSubscriptions() in async test"
  }
  return global.rxTestScheduler.expectSubscriptions.apply(global.rxTestScheduler, arguments)
}

export function assertDeepEqual(actual: any, expected: any) {
  (<any> expect(actual)).toDeepEqual(expected)
}

