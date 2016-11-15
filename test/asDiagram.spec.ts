import { expect } from 'chai'
import 'mocha'

import { Observable, Notification, TimeoutError, Subject } from 'rxjs'

declare var expectObservable: any
declare var expectSubscriptions: any
declare var cold: any
declare var hot: any
declare var rxTestScheduler: any
declare function asDiagram(operatorLabel: any, glit?: any): (description: any, specFn: any) => void

describe('Hi', () => {

  asDiagram('hello')('ahoj', () => {
    expect(1).to.equal(1)

    const source   = cold('---a---b---|')
    const expected =      '---a---b---|'
    expectObservable(source).toBe(expected)
  })
})

describe('Observable.catch', () => {
  asDiagram('catch')('should catch error and replace with a cold Observable', () => {
    const e1 =    hot('--a--b--#        ')
    const e2 =  cold('-1-2-3-|         ')
    const expected = '--a--b---1-2-3-|)'

    const result = e1.catch((_err: any) => e2)

    expectObservable(result).toBe(expected)
  })
})

describe('Observable.empty', () => {
  asDiagram('empty')('should create a cold observable with only complete', () => {
    const expected = '|'
    const e1 = Observable.empty()
    expectObservable(e1).toBe(expected)
  })
})

describe('Observable.never', () => {
  asDiagram('never')('should create a cold observable that never emits', () => {
    const expected = '-'
    const e1 = Observable.never()
    expectObservable(e1).toBe(expected)
  })
})

describe('Observable.pairs', () => {
  asDiagram('pairs({a: 1, b:2})')('should create an observable emits key-value pair', () => {
    const e1 = Observable.pairs({a: 1, b: 2}, rxTestScheduler)
    const expected = '(ab|)'
    const values = {
      a: ['a', 1],
      b: ['b', 2],
    }

    expectObservable(e1).toBe(expected, values)
  })
})

describe('Observable.throw', () => {
  asDiagram('throw(e)')('should create a cold observable that just emits an error', () => {
    const expected = '#'
    const e1 = Observable.throw('error')
    expectObservable(e1).toBe(expected)
  })
})

describe('Observable.generate', () => {
  asDiagram('generate(1, x => false, x => x + 1)')
  ('should complete if condition does not meet', () => {
    const source = Observable.generate(1, _x => false, x => x + 1)
    const expected = '|'

    expectObservable(source).toBe(expected)
  })

  asDiagram('generate(1, x => x == 1, x => x + 1)')
  ('should produce first value immediately', () => {
    const source = Observable.generate(1, x => x === 1, x => x + 1)
    const expected = '(1|)'

    expectObservable(source).toBe(expected, { '1': 1 })
  })

  asDiagram('generate(1, x => x < 3, x => x + 1)')
  ('should produce all values synchronously', () => {
    const source = Observable.generate(1, x => x < 3, x => x + 1)
    const expected = '(12|)'

    expectObservable(source).toBe(expected, { '1': 1, '2': 2 })
  })
})

describe('Observable.prototype.pairwise', () => {
  asDiagram('pairwise')('should group consecutive emissions as arrays of two', () => {
    const e1 =   hot('--a--b-c----d--e---|')
    const expected = '-----u-v----w--x---|'

    const values = {
      u: ['a', 'b'],
      v: ['b', 'c'],
      w: ['c', 'd'],
      x: ['d', 'e'],
    }

    const source = (<any> e1).pairwise()

    expectObservable(source).toBe(expected, values)
  })
})

describe('Observable.prototype.defaultIfEmpty', () => {
  asDiagram('defaultIfEmpty(42)')('should return the Observable if not empty with a default value', () => {
    const e1 =   hot('--------|')
    const expected = '--------(x|)'

    expectObservable(e1.defaultIfEmpty(42)).toBe(expected, { x: 42 })
  })
})

describe('Observable.prototype.ignoreElements', () => {
  asDiagram('ignoreElements')('should ignore all the elements of the source', () => {
    const source = hot('--a--b--c--d--|')
    const subs =       '^             !'
    const expected =   '--------------|'

    expectObservable(source.ignoreElements()).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.isEmpty', () => {
  asDiagram('isEmpty')('should return true if source is empty', () => {
    const source = hot('-----|')
    const subs =       '^    !'
    const expected =   '-----(T|)'

    expectObservable((<any> source).isEmpty()).toBe(expected, { T: true })
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.mapTo', () => {
  asDiagram('mapTo(\'a\')')('should map multiple values', () => {
    const a =   cold('--1--2--3--|')
    const asubs =    '^          !'
    const expected = '--a--a--a--|'

    expectObservable(a.mapTo('a')).toBe(expected)
    expectSubscriptions(a.subscriptions).toBe(asubs)
  })
})

describe('Observable.prototype.observeOn', () => {
  asDiagram('observeOn(scheduler)')('should observe on specified scheduler', () => {
    const e1 =    hot('--a--b--|')
    const expected =  '--a--b--|'
    const sub =       '^       !'

    expectObservable(e1.observeOn(rxTestScheduler)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(sub)
  })
})

describe('Observable.prototype.subscribeOn', () => {
  asDiagram('subscribeOn(scheduler)')('should subscribe on specified scheduler', () => {
    const e1 =   hot('--a--b--|')
    const expected = '--a--b--|'
    const sub =      '^       !'

    expectObservable(e1.subscribeOn(rxTestScheduler)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(sub)
  })
})

describe('Observable.defer', () => {
  asDiagram('defer(() => Observable.of(a, b, c))')
  ('should defer the creation of a simple Observable', () => {
    const expected =    '-a--b--c--|'
    const e1 = Observable.defer(() => cold('-a--b--c--|'))
    expectObservable(e1).toBe(expected)
  })
})

describe('Observable.from', () => {
  asDiagram('from([10, 20, 30])')
  ('should create an observable from an array', () => {
    const e1 = Observable.from([10, 20, 30])
      // for the purpose of making a nice diagram, spread out the synchronous emissions
      .concatMap((x, i) => Observable.of(x).delay(i === 0 ? 0 : 20, rxTestScheduler))
    const expected = 'x-y-(z|)'
    expectObservable(e1).toBe(expected, {x: 10, y: 20, z: 30})
  })
})

describe('Observable.fromEventPattern', () => {
  asDiagram('fromEventPattern(addHandler, removeHandler)')
  ('should create an observable from the handler API', () => {
    function addHandler(h: any) {
      Observable.timer(50, 20, rxTestScheduler)
        .mapTo('ev')
        .take(2)
        .concat(Observable.never())
        .subscribe(h)
    }
    const e1 = Observable.fromEventPattern(addHandler, () => void 0)
    const expected = '-----x-x---'
    expectObservable(e1).toBe(expected, {x: 'ev'})
  })
})

describe('Observable.of', () => {
  asDiagram('of(1, 2, 3)')('should create a cold observable that emits 1, 2, 3', () => {
    const e1 = Observable.of(1, 2, 3)
      // for the purpose of making a nice diagram, spread out the synchronous emissions
      .concatMap((x, i) => Observable.of(x).delay(i === 0 ? 0 : 20, rxTestScheduler))
    const expected = 'x-y-(z|)'
    expectObservable(e1).toBe(expected, {x: 1, y: 2, z: 3})
  })
})

describe('Observable.range', () => {
  asDiagram('range(1, 10)')('should create an observable with numbers 1 to 10', () => {
    const e1 = Observable.range(1, 10)
      // for the purpose of making a nice diagram, spread out the synchronous emissions
      .concatMap((x, i) => Observable.of(x).delay(i === 0 ? 0 : 20, rxTestScheduler))
    const expected = 'a-b-c-d-e-f-g-h-i-(j|)'
    const values = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
      e: 5,
      f: 6,
      g: 7,
      h: 8,
      i: 9,
      j: 10,
    }
    expectObservable(e1).toBe(expected, values)
  })
})

describe('Observable.timer', () => {
  asDiagram('timer(3000, 1000)')('should create an observable emitting periodically', () => {
    const e1 = Observable.timer(60, 20, rxTestScheduler)
      .take(4) // make it actually finite, so it can be rendered
      .concat(Observable.never()) // but pretend it's infinite by not completing
    const expected = '------a-b-c-d-'
    const values = {
      a: 0,
      b: 1,
      c: 2,
      d: 3,
    }
    expectObservable(e1).toBe(expected, values)
  })
})

describe('Observable.prototype.pluck', () => {
  asDiagram('pluck(\'v\')')('should dematerialize an Observable', () => {
    const values = {
      a: '{v:1}',
      b: '{v:2}',
      c: '{v:3}',
    }

    const e1 =  cold('--a--b--c--|', values)
    const expected = '--x--y--z--|'

    const result = e1.map((x: string) => ({v: x.charAt(3)})).pluck('v')

    expectObservable(result).toBe(expected, {x: '1', y: '2', z: '3'})
  })
})

describe('ConnectableObservable.prototype.refCount', () => {
  asDiagram('refCount')('should turn a multicasted Observable an automatically ' +
  '(dis)connecting hot one', () => {
    const source = cold('--1-2---3-4--5-|')
    const sourceSubs =  '^              !'
    const expected =    '--1-2---3-4--5-|'

    const result = source.publish().refCount()

    expectObservable(result).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)
  })
})

describe('Observable.prototype.materialize', () => {
  asDiagram('materialize')('should materialize an Observable', () => {
    const e1 =   hot('--x--y--z--|')
    const expected = '--a--b--c--(d|)'
    const values = { a: '{x}', b: '{y}', c: '{z}', d: '|' }

    const result = e1
      .materialize()
      .map((x: Notification<any>) => {
        if (x.kind === 'C') {
          return '|'
        } else {
          return '{' + x.value + '}'
        }
      })

    expectObservable(result).toBe(expected, values)
  })
})

describe('Observable.prototype.toArray', () => {
  asDiagram('toArray')('should reduce the values of an observable into an array', () => {
    const e1 =   hot('---a--b--|')
    const e1subs =   '^        !'
    const expected = '---------(w|)'

    expectObservable(e1.toArray()).toBe(expected, { w: ['a', 'b'] })
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.bufferCount', () => {
  asDiagram('bufferCount(3,2)')('should emit buffers at intervals', () => {
    const values = {
      v: ['a', 'b', 'c'],
      w: ['c', 'd', 'e'],
      x: ['e', 'f', 'g'],
      y: ['g', 'h', 'i'],
      z: ['i'],
    }
    const e1 =   hot('--a--b--c--d--e--f--g--h--i--|')
    const expected = '--------v-----w-----x-----y--(z|)'

    expectObservable(e1.bufferCount(3, 2)).toBe(expected, values)
  })
})

describe('Observable.prototype.auditTime', () => {
  asDiagram('auditTime(50)')('should emit the last value in each time window', () => {
    const e1 =   hot('-a-x-y----b---x-cx---|')
    const subs =     '^                    !'
    const expected = '------y--------x-----|'

    const result = e1.auditTime(50, rxTestScheduler)

    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.debounceTime', () => {
  asDiagram('debounceTime(20)')('should debounce values by 20 time units', () => {
    const e1 =   hot('-a--bc--d---|')
    const expected = '---a---c--d-|'

    expectObservable(e1.debounceTime(20, rxTestScheduler)).toBe(expected)
  })
})

// TODO
/*
describe('Observable.prototype.delay', () => {
  asDiagram('delay(20)')('should delay by specified timeframe', () => {
    const e1 =   hot('---a--b--|  ')
    const t =   time(   '--|      ')
    const expected = '-----a--b--|'
    const subs =     '^          !'

    const result = e1.delay(t, rxTestScheduler)

    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(subs)
  })
})
*/

describe('Observable.prototype.dematerialize', () => {
  asDiagram('dematerialize')('should dematerialize an Observable', () => {
    const values = {
      a: '{x}',
      b: '{y}',
      c: '{z}',
      d: '|',
    }

    const e1 =   hot('--a--b--c--d-|', values)
    const expected = '--x--y--z--|'

    const result = e1.map((x: string) => {
      if (x === '|') {
        return Notification.createComplete()
      } else {
        return Notification.createNext(x.replace('{', '').replace('}', ''))
      }
    }).dematerialize()

    expectObservable(result).toBe(expected)
  })
})

describe('Observable.prototype.do', () => {
  asDiagram('do(x => console.log(x))')('should mirror multiple values and complete', () => {
    const e1 =  cold('--1--2--3--|')
    const e1subs =   '^          !'
    const expected = '--1--2--3--|'

    const result = e1.do(() => {
      // noop
    })
    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.elementAt', () => {
  asDiagram('elementAt(2)')('should return last element by zero-based index', () => {
    const source = hot('--a--b--c-d---|')
    const subs =       '^       !      '
    const expected =   '--------(c|)   '

    expectObservable((<any> source).elementAt(2)).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.find', () => {
  asDiagram('find(x => x % 5 === 0)')('should return matching element from source emits single element', () => {
    const values = {a: 3, b: 9, c: 15, d: 20}
    const source = hot('---a--b--c--d---|', values)
    const subs =       '^        !       '
    const expected =   '---------(c|)    '

    const predicate = function (x: any) { return x % 5 === 0 }

    expectObservable((<any> source).find(predicate)).toBe(expected, values)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.findIndex', () => {
  asDiagram('findIndex(x => x % 5 === 0)')('should return matching element from source emits single element', () => {
    const values = {a: 3, b: 9, c: 15, d: 20}
    const source = hot('---a--b--c--d---|', values)
    const subs =       '^        !       '
    const expected =   '---------(x|)    '

    const predicate = function (x: any) { return x % 5 === 0 }

    expectObservable((<any> source).findIndex(predicate)).toBe(expected, { x: 2 })
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.last', () => {
  asDiagram('last')('should take the last value of an observable', () => {
    const e1 =   hot('--a----b--c--|')
    const e1subs =   '^            !'
    const expected = '-------------(c|)'

    expectObservable(e1.last()).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.onErrorResumeNext', () => {
  asDiagram('onErrorResumeNext')('should continue observable sequence with next observable', () => {
    const source =  hot('--a--b--#')
    const next   = cold(        '--c--d--|')
    const subs =        '^               !'
    const expected =    '--a--b----c--d--|'

    expectObservable(source.onErrorResumeNext(next)).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.partition', () => {
  function expectObservableArray(result: any, expected: any) {
    for (let idx = 0; idx < result.length; idx++ ) {
      expectObservable(result[idx]).toBe(expected[idx])
    }
  }

  asDiagram('partition(x => x % 2 === 1)')('should partition an observable of ' +
  'integers into even and odd', () => {
    const e1 =    hot('--1-2---3------4--5---6--|')
    const e1subs =    '^                        !'
    const expected = ['--1-----3---------5------|',
                    '----2----------4------6--|']

    const result = e1.partition((x: any) => x % 2 === 1)

    expectObservableArray(result, expected)
    expectSubscriptions(e1.subscriptions).toBe([e1subs, e1subs])
  })
})

describe('Observable.prototype.retry', () => {
  asDiagram('retry(2)')('should handle a basic source that emits next then errors, count=3', () => {
    const source = cold('--1-2-3-#')
    const subs =       ['^       !                ',
                      '        ^       !        ',
                      '                ^       !']
    const expected =    '--1-2-3---1-2-3---1-2-3-#'

    const result = source.retry(2)

    expectObservable(result).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.sampleTime', () => {
  asDiagram('sampleTime(70)')('should get samples on a delay', () => {
    const e1 =   hot('a---b-c---------d--e---f-g-h--|')
    const e1subs =   '^                             !'
    const expected = '-------c-------------e------h-|'
    // timer          -------!------!------!------!--

    expectObservable(e1.sampleTime(70, rxTestScheduler)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.single', () => {
  asDiagram('single')('should raise error from empty predicate if observable emits multiple time', () => {
    const e1 =    hot('--a--b--c--|')
    const e1subs =    '^    !      '
    const expected =  '-----#      '
    const errorMsg = 'Sequence contains more than one element'

    expectObservable(e1.single()).toBe(expected, null, errorMsg)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.skip', () => {
  asDiagram('skip(3)')('should skip values before a total', () => {
    const source = hot('--a--b--c--d--e--|')
    const subs =       '^                !'
    const expected =   '-----------d--e--|'

    expectObservable(source.skip(3)).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.skipWhile', () => {
  asDiagram('skipWhile(x => x < 4)')('should skip all elements until predicate is false', () => {
    const source = hot('-1-^2--3--4--5--6--|')
    const sourceSubs =    '^               !'
    const expected =      '-------4--5--6--|'

    const predicate = function (v: number) {
      return +v < 4
    }

    expectObservable(source.skipWhile(predicate)).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)
  })
})

describe('Observable.prototype.startWith', () => {
  asDiagram('startWith(s)')('should prepend to a cold Observable', () => {
    const e1 =  cold('---a--b--c--|')
    const e1subs =   '^           !'
    const expected = 's--a--b--c--|'

    expectObservable(e1.startWith('s')).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.takeLast', () => {
  asDiagram('takeLast(2)')('should take two values of an observable with many values', () => {
    const e1 =  cold('--a-----b----c---d--|    ')
    const e1subs =   '^                   !    '
    const expected = '--------------------(cd|)'

    expectObservable(e1.takeLast(2)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.throttleTime', () => {
  asDiagram('throttleTime(50)')('should immediately emit the first value in each time window', () => {
    const e1 =   hot('-a-x-y----b---x-cx---|')
    const subs =     '^                    !'
    const expected = '-a--------b-----c----|'

    const result = e1.throttleTime(50, rxTestScheduler)

    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.timeInterval', () => {
  asDiagram('timeInterval')('should record the time interval between source elements', () => {
    const e1 = hot('--a--^b-c-----d--e--|')
    const e1subs =      '^              !'
    const expected =    '-w-x-----y--z--|'
    const expectedValue = { w: 10, x: 20, y: 60, z: 30 }

    const result = (<any> e1).timeInterval(rxTestScheduler)
      .map((x: any) => x.interval)

    expectObservable(result).toBe(expected, expectedValue)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.timestamp', () => {
  asDiagram('timestamp')('should record the time stamp per each source elements', () => {
    const e1 =   hot('-b-c-----d--e--|')
    const e1subs =   '^              !'
    const expected = '-w-x-----y--z--|'
    const expectedValue = { w: 10, x: 30, y: 90, z: 120 }

    const result = e1.timestamp(rxTestScheduler)
      .map((x: any) => x.timestamp)

    expectObservable(result).toBe(expected, expectedValue)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.windowCount', () => {
  asDiagram('windowCount(3)')('should emit windows with count 3, no skip specified', () => {
    const source =   hot('---a---b---c---d---e---f---g---h---i---|')
    const sourceSubs =   '^                                      !'
    const expected =     'x----------y-----------z-----------w---|'
    const x = cold(      '---a---b---(c|)                         ')
    const y = cold(                 '----d---e---(f|)             ')
    const z = cold(                             '----g---h---(i|) ')
    const w = cold(                                         '----|')
    const expectedValues = { x: x, y: y, z: z, w: w }

    const result = source.windowCount(3)

    expectObservable(result).toBe(expected, expectedValues)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)
  })
})

describe('Observable.prototype.scan', () => {
  asDiagram('scan((acc, curr) => acc + curr, 0)')('should scan', () => {
    const values = {
      a: 1, b: 3, c: 5,
      x: 1, y: 4, z: 9,
    }
    const e1 =     hot('--a--b--c--|', values)
    const e1subs =     '^          !'
    const expected =   '--x--y--z--|'

    const scanFunction = function (o: any, x: any) {
      return o + x
    }

    expectObservable(e1.scan(scanFunction, 0)).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.catch', () => {
  asDiagram('catch')('should catch error and replace with a cold Observable', () => {
    const e1 =   hot('--a--b--#        ')
    const e2 =  cold('-1-2-3-|         ')
    const expected = '--a--b---1-2-3-|)'

    const result = e1.catch((_err: any) => e2)

    expectObservable(result).toBe(expected)
  })
})

describe('Observable.prototype.timeout', () => {
  const defaultTimeoutError = new TimeoutError()

  asDiagram('timeout(50)')('should timeout after a specified timeout period', () => {
    const e1 =  cold('-------a--b--|')
    const e1subs =   '^    !        '
    const expected = '-----#        '

    const result = e1.timeout(50, null, rxTestScheduler)

    expectObservable(result).toBe(expected, null, defaultTimeoutError)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.interval', () => {
  asDiagram('interval(1000)')('should create an observable emitting periodically', () => {
    const e1 = Observable.interval(20, rxTestScheduler)
      .take(6) // make it actually finite, so it can be rendered
      .concat(Observable.never()) // but pretend it's infinite by not completing
    const expected = '--a-b-c-d-e-f-'
    const values = {
      a: 0,
      b: 1,
      c: 2,
      d: 3,
      e: 4,
      f: 5,
    }
    expectObservable(e1).toBe(expected, values)
  })
})

describe('Observable.prototype.take', () => {
  asDiagram('take(2)')('should take two values of an observable with many values', () => {
    const e1 =  cold('--a-----b----c---d--|')
    const e1subs =   '^       !            '
    const expected = '--a-----(b|)         '

    expectObservable(e1.take(2)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.fromEvent', () => {
  asDiagram('fromEvent(element, \'click\')')
  ('should create an observable of click on the element', () => {
    const target = {
      addEventListener: (_eventType: any, listener: any) => {
        Observable.timer(50, 20, rxTestScheduler)
          .mapTo('ev')
          .take(2)
          .concat(Observable.never())
          .subscribe(listener)
      },
      removeEventListener: () => void 0,
      dispatchEvent: () => void 0,
    }
    const e1 = Observable.fromEvent(target as any, 'click')
    const expected = '-----x-x---'
    expectObservable(e1).toBe(expected, {x: 'ev'})
  })
})

describe('Observable.prototype.mergeMap', () => {
  asDiagram('mergeMap(i => 10*i\u2014\u201410*i\u2014\u201410*i\u2014| )')
  ('should map-and-flatten each item to an Observable', () => {
    const e1 =    hot('--1-----3--5-------|')
    const e1subs =    '^                  !'
    const e2 =   cold('x-x-x|              ', {x: 10})
    const expected =  '--x-x-x-y-yzyz-z---|'
    const values = {x: 10, y: 30, z: 50}

    const result = e1.mergeMap((x: any) => e2.map((i: any) => i * x))

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.concatMap', () => {
  asDiagram('concatMap(i => 10*i\u2014\u201410*i\u2014\u201410*i\u2014| )')
  ('should map-and-flatten each item to an Observable', () => {
    const e1 =    hot('--1-----3--5-------|')
    const e1subs =    '^                  !'
    const e2 =   cold('x-x-x|              ', {x: 10})
    const expected =  '--x-x-x-y-y-yz-z-z-|'
    const values = {x: 10, y: 30, z: 50}

    const result = e1.concatMap((x: any) => e2.map((i: any) => i * x))

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.sequenceEqual', () => {
  const booleans = { T: true, F: false }

  asDiagram('sequenceEqual(observable)')('should return true for two equal sequences', () => {
    const s1 = hot('--a--^--b--c--d--e--f--g--|')
    const s1subs =      '^                        !'
    const s2 = hot('-----^-----b--c--d-e-f------g-|')
    const s2subs =      '^                        !'
    const expected =    '-------------------------(T|)'

    const source = s1.sequenceEqual(s2)

    expectObservable(source).toBe(expected, booleans)
    expectSubscriptions(s1.subscriptions).toBe(s1subs)
    expectSubscriptions(s2.subscriptions).toBe(s2subs)
  })
})

describe('Observable.prototype.multicast', () => {
  asDiagram('multicast(() => new Subject())')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|')
    const sourceSubs =  '^              !'
    const multicasted = source.multicast(() => new Subject())
    const expected =    '--1-2---3-4--5-|'

    expectObservable(multicasted).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)

    multicasted.connect()
  })
})

describe('Observable.prototype.zipAll', () => {
  asDiagram('zipAll')('should combine paired events from two observables', () => {
    const x =    cold(               '-a-----b-|')
    const y =    cold(               '--1-2-----')
    const outer = hot('-x----y--------|         ', { x: x, y: y })
    const expected =  '-----------------A----B-|'

    const result = outer.zipAll((a: string, b: string) => String(a) + String(b))

    expectObservable(result).toBe(expected, { A: 'a1', B: 'b2' })
  })
})

describe('Observable.prototype.combineLatest', () => {
  asDiagram('combineLatest')('should combine events from two cold observables', () => {
    const e1 =   cold('-a--b-----c-d-e-|')
    const e2 =   cold('--1--2-3-4---|   ')
    const expected = '--A-BC-D-EF-G-H-|'

    const result = e1.combineLatest(e2, (a: any, b: any) => String(a) + String(b))

    expectObservable(result).toBe(expected, {
      A: 'a1', B: 'b1', C: 'b2', D: 'b3', E: 'b4', F: 'c4', G: 'd4', H: 'e4',
    })
  })
})

describe('Observable.prototype.combineAll', () => {
  asDiagram('combineAll')('should combine events from two observables', () => {
    const x =    cold(               '-a-----b---|')
    const y =    cold(               '--1-2-|     ')
    const outer = hot('-x----y--------|           ', { x: x, y: y })
    const expected =  '-----------------A-B--C---|'

    const result = outer.combineAll((a: any, b: any) => String(a) + String(b))

    expectObservable(result).toBe(expected, { A: 'a1', B: 'a2', C: 'b2' })
  })
})

describe('Observable.create', () => {
  asDiagram('create(obs => { obs.next(1) })')
  ('should create a cold observable that emits just 1', () => {
    const e1 = Observable.create((obs: any) => { obs.next(1) })
    const expected = 'x'
    expectObservable(e1).toBe(expected, {x: 1})
  })
})

describe('Observable.prototype.expand', () => {
  asDiagram('expand(x => x === 8 ? empty : \u2014\u20142*x\u2014| )')
  ('should recursively map-and-flatten each item to an Observable', () => {
    const e1 =    hot('--x----|  ', {x: 1})
    const e1subs =    '^        !'
    const e2 =   cold(  '--c|    ', {c: 2})
    const expected =  '--a-b-c-d|'
    const values = {a: 1, b: 2, c: 4, d: 8}

    const result = e1.expand((x: number) => x === 8 ? Observable.empty() : e2.map((c: number) => c * x))

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.windowToggle', () => {
  asDiagram('windowToggle')('should emit windows governed by openings and closings', () => {
    const source = hot('--1--2--^-a--b--c--d--e--f--g--h-|')
    const subs =               '^                        !'
    const e2 = cold(           '----w--------w--------w--|')
    const e2subs =             '^                        !'
    const e3 = cold(               '-----|                ')
    //                                     -----(c|)
    //                                              -----(c|)
    const e3subs = [           '    ^    !                ', // eslint-disable-line array-bracket-spacing
                             '             ^    !       ',
                             '                      ^  !']
    const expected =           '----x--------y--------z--|'
    const x = cold(                '-b--c|                ')
    const y = cold(                         '-e--f|       ')
    const z = cold(                                  '-h-|')
    const values = { x: x, y: y, z: z }

    const result = source.windowToggle(e2, () => e3)

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(source.subscriptions).toBe(subs)
    expectSubscriptions(e2.subscriptions).toBe(e2subs)
    expectSubscriptions(e3.subscriptions).toBe(e3subs)
  })
})

describe('Observable.prototype.publishReplay', () => {
  asDiagram('publishReplay(1)')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|')
    const sourceSubs =  '^              !'
    const published = source.publishReplay(1)
    const expected =    '--1-2---3-4--5-|'

    expectObservable(published).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)

    published.connect()
  })
})

describe('Observable.prototype.mergeMapTo', () => {
  asDiagram('mergeMapTo( 10\u2014\u201410\u2014\u201410\u2014| )')
  ('should map-and-flatten each item to an Observable', () => {
    const e1 =    hot('--1-----3--5-------|')
    const e1subs =    '^                  !'
    const e2 =   cold('x-x-x|              ', {x: 10})
    const expected =  '--x-x-x-x-xxxx-x---|'
    const values = {x: 10}

    const result = e1.mergeMapTo(e2)

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.mergeAll', () => {
  asDiagram('mergeAll')('should merge a hot observable of cold observables', () => {
    const x = cold(    '--a---b--c---d--|      ')
    const y = cold(           '----e---f--g---|')
    const e1 = hot(  '--x------y-------|       ', { x: x, y: y })
    const expected = '----a---b--c-e-d-f--g---|'

    expectObservable(e1.mergeAll()).toBe(expected)
  })
})

describe('Observable.prototype.concatMapTo', () => {
  asDiagram('concatMapTo( 10\u2014\u201410\u2014\u201410\u2014| )')
  ('should map-and-flatten each item to an Observable', () => {
    const e1 =    hot('--1-----3--5-------|')
    const e1subs =    '^                  !'
    const e2 =   cold('x-x-x|              ', {x: 10})
    const expected =  '--x-x-x-x-x-xx-x-x-|'
    const values = {x: 10}

    const result = e1.concatMapTo(e2)

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.concatAll', () => {
  asDiagram('concatAll')('should concat an observable of observables', () => {
    const x = cold(    '----a------b------|                 ')
    const y = cold(                      '---c-d---|        ')
    const z = cold(                               '---e--f-|')
    const outer = hot('-x---y----z------|              ', { x: x, y: y, z: z })
    const expected =  '-----a------b---------c-d------e--f-|'

    const result = outer.concatAll()

    expectObservable(result).toBe(expected)
  })
})

describe('Observable.prototype.bufferToggle', () => {
  asDiagram('bufferToggle')('should emit buffers using hot openings and hot closings', () => {
    const e1 =   hot('---a---b---c---d---e---f---g---|')
    const e2 =   hot('--o------------------o---------|')
    const e3 =   hot('---------c---------------c-----|')
    const expected = '---------x---------------y-----|'
    const values = {
      x: ['a', 'b'],
      y: ['f'],
    }

    const result = e1.bufferToggle(e2, (_x: any) => e3)

    expectObservable(result).toBe(expected, values)
  })
})

describe('Observable.prototype.windowWhen', () => {
  asDiagram('windowWhen')('should emit windows that close and reopen', () => {
    const e1 = hot('--a--^--b--c--d--e--f--g--h--i--|')
    const e1subs =      '^                          !'
    const e2 = cold(    '-----------|                ')
    const e2subs =     ['^          !                ',
                      '           ^          !     ',
                      '                      ^    !']
    const a = cold(     '---b--c--d-|                ')
    const b = cold(                '-e--f--g--h|     ')
    const c = cold(                           '--i--|')
    const expected =    'a----------b----------c----|'
    const values = { a: a, b: b, c: c }

    const source = e1.windowWhen(() => e2)

    expectObservable(source).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
    expectSubscriptions(e2.subscriptions).toBe(e2subs)
  })
})

describe('Observable.prototype.timeoutWith', () => {
  asDiagram('timeoutWith(50)')
    ('should timeout after a specified period then subscribe to the passed observable', () => {
    const e1 =  cold('-------a--b--|')
    const e1subs =   '^    !        '
    const e2 =       cold('x-y-z-|  ')
    const e2subs =   '     ^     !  '
    const expected = '-----x-y-z-|  '

    const result = e1.timeoutWith(50, e2, rxTestScheduler)

    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
    expectSubscriptions(e2.subscriptions).toBe(e2subs)
  })
})

describe('Observable.prototype.throttle', () =>  {
  asDiagram('throttle')('should immediately emit the first value in each time window', () =>  {
    const e1 =   hot('-a-xy-----b--x--cxxx-|')
    const e1subs =   '^                    !'
    const e2 =  cold( '----|                ')
    const e2subs =  [' ^   !                ',
                   '          ^   !       ',
                   '                ^   ! ']
    const expected = '-a--------b-----c----|'

    const result = e1.throttle(() =>  e2)

    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
    expectSubscriptions(e2.subscriptions).toBe(e2subs)
  })
})

describe('Observable.prototype.switchMap', () => {
  asDiagram('switchMap(i => 10*i\u2014\u201410*i\u2014\u201410*i\u2014| )')
  ('should map-and-flatten each item to an Observable', () => {
    const e1 =    hot('--1-----3--5-------|')
    const e1subs =    '^                  !'
    const e2 =   cold('x-x-x|              ', {x: 10})
    const expected =  '--x-x-x-y-yz-z-z---|'
    const values = {x: 10, y: 30, z: 50}

    const result = e1.switchMap((x: any) => e2.map((i: any) => i * x))

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.share', () => {
  asDiagram('share')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|')
    const sourceSubs =  '^              !'
    const expected =    '--1-2---3-4--5-|'

    const shared = source.share()

    expectObservable(shared).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)
  })
})

describe('Observable.prototype.retryWhen', () => {
  asDiagram('retryWhen')('should handle a source with eventual error using a hot notifier', () => {
    const source =  cold('-1--2--#')
    const subs =        ['^      !                     ',
                       '             ^      !        ',
                       '                          ^ !']
    const notifier = hot('-------------r------------r-|')
    const expected =     '-1--2---------1--2---------1|'

    const result = source.retryWhen((_errors: any) => notifier)

    expectObservable(result).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.repeatWhen', () => {
  asDiagram('repeatWhen')('should handle a source with eventual complete using a hot notifier', () => {
    const source =  cold('-1--2--|')
    const subs =        ['^      !                     ',
                       '             ^      !        ',
                       '                          ^ !']
    const notifier = hot('-------------r------------r-|')
    const expected =     '-1--2---------1--2---------1|'

    const result = source.repeatWhen((_notifications: any) => notifier)

    expectObservable(result).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.publishBehavior', () => {
  asDiagram('publishBehavior(0)')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|')
    const sourceSubs =  '^              !'
    const published = source.publishBehavior('0')
    const expected =    '0-1-2---3-4--5-|'

    expectObservable(published).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)

    published.connect()
  })
})

describe('Observable.prototype.publish', () => {
  asDiagram('publish')('should mirror a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|')
    const sourceSubs =  '^              !'
    const published = source.publish()
    const expected =    '--1-2---3-4--5-|'

    expectObservable(published).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)

    published.connect()
  })
})

describe('Observable.prototype.merge', () => {
  asDiagram('merge')('should handle merging two hot observables', () => {
    const e1 =    hot('--a-----b-----c----|')
    const e1subs =    '^                  !'
    const e2 =    hot('-----d-----e-----f---|')
    const e2subs =    '^                    !'
    const expected =  '--a--d--b--e--c--f---|'

    const result = e1.merge(e2, rxTestScheduler)

    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
    expectSubscriptions(e2.subscriptions).toBe(e2subs)
  })
})

describe('Observable.prototype.exhaustMap', () => {
  asDiagram('exhaustMap(i => 10*i\u2014\u201410*i\u2014\u201410*i\u2014| )')
  ('should map-and-flatten each item to an Observable', () => {
    const e1 =    hot('--1-----3--5-------|')
    const e1subs =    '^                  !'
    const e2 =   cold('x-x-x|              ', {x: 10})
    const expected =  '--x-x-x-y-y-y------|'
    const values = {x: 10, y: 30, z: 50}

    const result = e1.exhaustMap((x: any) => e2.map((i: any) => i * x))

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.debounce', () => {
  asDiagram('debounce')('should debounce values by a specified cold Observable', () => {
    const e1 =   hot('-a--bc--d---|')
    const e2 =  cold('--|          ')
    const expected = '---a---c--d-|'

    const result = e1.debounce(() => e2)

    expectObservable(result).toBe(expected)
  })
})

describe('Observable.prototype.concat', () => {
  asDiagram('concat')('should concatenate two cold observables', () => {
    const e1 =   cold('--a--b-|')
    const e2 =   cold(       '--x---y--|')
    const expected =  '--a--b---x---y--|'

    expectObservable(e1.concat(e2, rxTestScheduler)).toBe(expected)
  })
})

describe('Observable.prototype.bufferWhen', () => {
  asDiagram('bufferWhen')('should emit buffers that close and reopen', () => {
    const e1 = hot('--a--^---b---c---d---e---f---g---------|')
    const e2 = cold(    '--------------(s|)')
    //                               --------------(s|)
    const expected =    '--------------x-------------y-----(z|)'
    const values = {
      x: ['b', 'c', 'd'],
      y: ['e', 'f', 'g'],
      z: [],
    }

    expectObservable(e1.bufferWhen(() => e2)).toBe(expected, values)
  })
})

describe('Observable.prototype.audit', () => {
  asDiagram('audit')('should emit the last value in each time window', () => {
    const e1 =   hot('-a-xy-----b--x--cxxx-|')
    const e1subs =   '^                    !'
    const e2 =  cold( '----|                ')
    const e2subs =  [' ^   !                ',
                   '          ^   !       ',
                   '                ^   ! ']
    const expected = '-----y--------x-----x|'

    const result = e1.audit(() => e2)

    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
    expectSubscriptions(e2.subscriptions).toBe(e2subs)
  })
})

describe('Observable.prototype.finally', () => {
  it('should call finally after complete', (done: MochaDone) => {
    let completed = false
    Observable.of(1, 2, 3)
      .finally(() => {
        expect(completed).to.be.true
        done()
      })
      .subscribe(undefined, undefined, () => {
        completed = true
      })
  })
})

describe('Observable.prototype.sample', () => {
  asDiagram('sample')('should get samples when the notifier emits', () => {
    const e1 =   hot('---a----b---c----------d-----|   ')
    const e1subs =   '^                            !   '
    const e2 =   hot('-----x----------x---x------x---|')
    const e2subs =   '^                            !   '
    const expected = '-----a----------c----------d-|   '

    expectObservable(e1.sample(e2)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
    expectSubscriptions(e2.subscriptions).toBe(e2subs)
  })
})

/*
describe('Observable.prototype.bufferTime', () => {
  asDiagram('bufferTime(100)')('should emit buffers at intervals', () => {
    const e1 =   hot('---a---b---c---d---e---f---g-----|');
    const subs =     '^                                !';
    const t = time(  '----------|');
    const expected = '----------w---------x---------y--(z|)';
    const values = {
      w: ['a', 'b'],
      x: ['c', 'd', 'e'],
      y: ['f', 'g'],
      z: []
    };

    const result = e1.bufferTime(t, null, Number.POSITIVE_INFINITY, rxTestScheduler);

    expectObservable(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });
})
*/

describe('Observable.prototype.reduce', () => {
  asDiagram('reduce((acc, curr) => acc + curr, 0)')('should reduce', () => {
    const values = {
      a: 1, b: 3, c: 5, x: 9,
    }
    const e1 =     hot('--a--b--c--|', values)
    const e1subs =     '^          !'
    const expected =   '-----------(x|)'

    const reduceFunction = function (o: number, x: number) {
      return o + x
    }

    expectObservable(e1.reduce(reduceFunction, 0)).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.withLatestFrom', () => {
  asDiagram('withLatestFrom')('should combine events from cold observables', () => {
    const e1 =   hot('-a--b-----c-d-e-|')
    const e2 =   hot('--1--2-3-4---|   ')
    const expected = '----B-----C-D-E-|'

    const result = e1.withLatestFrom(e2, (a: string, b: string) => String(a) + String(b))

    expectObservable(result).toBe(expected, { B: 'b1', C: 'c4', D: 'd4', E: 'e4' })
  })
})

describe('Observable.prototype.windowTime', () => {
  asDiagram('windowTime(50, 100)')('should emit windows given windowTimeSpan ' +
  'and windowCreationInterval', () => {
    const source = hot('--1--2--^-a--b--c--d--e---f--g--h-|')
    const subs =               '^                         !'
    //  100 frames            0---------1---------2-----|
    //  50                     ----|
    //  50                               ----|
    //  50                                         ----|
    const expected =           'x---------y---------z-----|'
    const x = cold(            '--a--(b|)                  ')
    const y = cold(                      '-d--e|           ')
    const z = cold(                                '-g--h| ')
    const values = { x: x, y: y, z: z }

    const result = source.windowTime(50, 100, rxTestScheduler)

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.window', () => {
  asDiagram('window')('should emit windows that close and reopen', () => {
    const source =   hot('---a---b---c---d---e---f---g---h---i---|    ')
    const sourceSubs =   '^                                      !    '
    const closings = hot('-------------w------------w----------------|')
    const closingSubs =  '^                                      !    '
    const expected =     'x------------y------------z------------|    '
    const x = cold(      '---a---b---c-|                              ')
    const y = cold(                   '--d---e---f--|                 ')
    const z = cold(                                '-g---h---i---|    ')
    const expectedValues = { x: x, y: y, z: z }

    const result = source.window(closings)

    expectObservable(result).toBe(expected, expectedValues)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)
    expectSubscriptions(closings.subscriptions).toBe(closingSubs)
  })
})

describe('Observable.prototype.takeWhile', () => {
  asDiagram('takeWhile(x => x < 4)')('should take all elements until predicate is false', () => {
    const source = hot('-1-^2--3--4--5--6--|')
    const sourceSubs =    '^      !         '
    const expected =      '-2--3--|         '

    const result = source.takeWhile((v: any) => +v < 4)

    expectObservable(result).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)
  })
})

describe('Observable.prototype.takeUntil', () => {
  asDiagram('takeUntil')('should take values until notifier emits', () => {
    const e1 =     hot('--a--b--c--d--e--f--g--|')
    const e1subs =     '^            !          '
    const e2 =     hot('-------------z--|       ')
    const e2subs =     '^            !          '
    const expected =   '--a--b--c--d-|          '

    expectObservable(e1.takeUntil(e2)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
    expectSubscriptions(e2.subscriptions).toBe(e2subs)
  })
})

describe('Observable.prototype.switchMapTo', () => {
  asDiagram('switchMapTo( 10\u2014\u201410\u2014\u201410\u2014| )')
  ('should map-and-flatten each item to an Observable', () => {
    const e1 =    hot('--1-----3--5-------|')
    const e1subs =    '^                  !'
    const e2 =   cold('x-x-x|              ', {x: 10})
    const expected =  '--x-x-x-x-xx-x-x---|'
    const values = {x: 10}

    const result = e1.switchMapTo(e2)

    expectObservable(result).toBe(expected, values)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
  })
})

describe('Observable.prototype.switch', () => {
  asDiagram('switch')('should switch a hot observable of cold observables', () => {
    const x = cold(    '--a---b--c---d--|      ')
    const y = cold(           '----e---f--g---|')
    const e1 = hot(  '--x------y-------|       ', { x: x, y: y })
    const expected = '----a---b----e---f--g---|'

    expectObservable(e1.switch()).toBe(expected)
  })
})

describe('Observable.prototype.skipUntil', () => {
  asDiagram('skipUntil')('should skip values until another observable notifies', () => {
    const e1 =     hot('--a--b--c--d--e----|')
    const e1subs =     '^                  !'
    const skip =   hot('---------x------|   ')
    const skipSubs =   '^               !   '
    const expected =  ('-----------d--e----|')

    expectObservable(e1.skipUntil(skip)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(e1subs)
    expectSubscriptions(skip.subscriptions).toBe(skipSubs)
  })
})

describe('Observable.prototype.repeat', () => {
  asDiagram('repeat(3)')('should resubscribe count number of times', () => {
    const e1 =   cold('--a--b--|                ')
    const subs =     ['^       !                ',
                    '        ^       !        ',
                    '                ^       !']
    const expected =  '--a--b----a--b----a--b--|'

    expectObservable(e1.repeat(3)).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.publishLast', () => {
  asDiagram('publishLast')('should emit last notification of a simple source Observable', () => {
    const source = cold('--1-2---3-4--5-|')
    const sourceSubs =  '^              !'
    const published = source.publishLast()
    const expected =    '---------------(5|)'

    expectObservable(published).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)

    published.connect()
  })
})

describe('Observable.prototype.min', () => {
  asDiagram('min')('should min the values of an observable', () => {
    const source = hot('--a--b--c--|', { a: 42, b: -1, c: 3 })
    const subs =       '^          !'
    const expected =   '-----------(x|)'

    expectObservable((<any> source).min()).toBe(expected, { x: -1 })
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.max', () => {
  asDiagram('max')('should find the max of values of an observable', () => {
    const e1 = hot('--a--b--c--|', { a: 42, b: -1, c: 3 })
    const subs =       '^          !'
    const expected =   '-----------(x|)'

    expectObservable((<any> e1).max()).toBe(expected, { x: 42 })
    expectSubscriptions(e1.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.map', () => {
  asDiagram('map(x => 10 * x)')('should map multiple values', () => {
    const a =   cold('--1--2--3--|')
    const asubs =    '^          !'
    const expected = '--x--y--z--|'

    const r = a.map(function (x: number) { return 10 * x })

    expectObservable(r).toBe(expected, {x: 10, y: 20, z: 30})
    expectSubscriptions(a.subscriptions).toBe(asubs)
  })
})

describe('Observable.prototype.map', () => {
  asDiagram('map(x => 10 * x)')('should map multiple values', () => {
    const a =   cold('--1--2--3--|')
    const asubs =    '^          !'
    const expected = '--x--y--z--|'

    const r = a.map(function (x: number) { return 10 * x })

    expectObservable(r).toBe(expected, {x: 10, y: 20, z: 30})
    expectSubscriptions(a.subscriptions).toBe(asubs)
  })
})

describe('Observable.prototype.first', () => {
  asDiagram('first')('should take the first value of an observable with many values', () => {
    const e1 =   hot('-----a--b--c---d---|')
    const expected = '-----(a|)           '
    const sub =      '^    !              '

    expectObservable(e1.first()).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(sub)
  })
})

describe('Observable.prototype.filter', () => {
  function oddFilter(x: number) {
    return (+x) % 2 === 1
  }

  asDiagram('filter(x => x % 2 === 1)')('should filter out even values', () => {
    const source = hot('--0--1--2--3--4--|')
    const subs =       '^                !'
    const expected =   '-----1-----3-----|'

    expectObservable(source.filter(oddFilter)).toBe(expected)
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.exhaust', () => {
  asDiagram('exhaust')('should handle a hot observable of hot observables', () => {
    const x =   cold(      '--a---b---c--|               ')
    const y =   cold(              '---d--e---f---|      ')
    const z =   cold(                    '---g--h---i---|')
    const e1 = hot(  '------x-------y-----z-------------|', { x: x, y: y, z: z })
    const expected = '--------a---b---c------g--h---i---|'

    expectObservable((<any> e1).exhaust()).toBe(expected)
  })
})

describe('Observable.prototype.every', () => {

  function predicate(x: number) {
    return x % 5 === 0
  }

  asDiagram('every(x => x % 5 === 0)')('should return false if only some of element matches with predicate', () => {
    const source = hot('--a--b--c--d--e--|', {a: 5, b: 10, c: 15, d: 18, e: 20})
    const sourceSubs = '^          !      '
    const expected =   '-----------(F|)   '

    expectObservable(source.every(predicate)).toBe(expected, {F: false})
    expectSubscriptions(source.subscriptions).toBe(sourceSubs)
  })
})

describe('Observable.prototype.distinctUntilKeyChanged', () => {
  asDiagram('distinctUntilKeyChanged(\'k\')')('should distinguish between values', () => {
    const values = {a: {k: 1}, b: {k: 2}, c: {k: 3}}
    const e1 =   hot('-a--b-b----a-c-|', values)
    const expected = '-a--b------a-c-|'

    const result = (<any> e1).distinctUntilKeyChanged('k')

    expectObservable(result).toBe(expected, values)
  })
})

describe('Observable.prototype.distinctUntilChanged', () => {
  asDiagram('distinctUntilChanged')('should distinguish between values', () => {
    const e1 =   hot('-1--2-2----1-3-|')
    const expected = '-1--2------1-3-|'

    expectObservable(e1.distinctUntilChanged()).toBe(expected)
  })
})

describe('Observable.prototype.delayWhen', () => {
  asDiagram('delayWhen(durationSelector)')('should delay by duration selector', () => {
    const e1 =        hot('---a---b---c--|')
    const expected =      '-----a------c----(b|)'
    const subs =          '^                !'
    const selector = [cold(  '--x--|'),
                      cold(      '----------(x|)'),
                      cold(          '-x--|')]
    const selectorSubs = ['   ^ !            ',
                          '       ^         !',
                          '           ^!     ']

    let idx = 0
    function durationSelector() {
      return selector[idx++]
    }

    const result = e1.delayWhen(durationSelector)

    expectObservable(result).toBe(expected)
    expectSubscriptions(e1.subscriptions).toBe(subs)
    expectSubscriptions(selector[0].subscriptions).toBe(selectorSubs[0])
    expectSubscriptions(selector[1].subscriptions).toBe(selectorSubs[1])
    expectSubscriptions(selector[2].subscriptions).toBe(selectorSubs[2])
  })
})

describe('Observable.prototype.count', () => {
  asDiagram('count')('should count the values of an observable', () => {
    const source = hot('--a--b--c--|')
    const subs =       '^          !'
    const expected =   '-----------(x|)'

    expectObservable(source.count()).toBe(expected, {x: 3})
    expectSubscriptions(source.subscriptions).toBe(subs)
  })
})

describe('Observable.prototype.catch', () => {
  asDiagram('catch')('should catch error and replace with a cold Observable', () => {
    const e1 =   hot('--a--b--#        ')
    const e2 =  cold('-1-2-3-|         ')
    const expected = '--a--b---1-2-3-|)'

    const result = e1.catch(() => e2)

    expectObservable(result).toBe(expected)
  })
})

describe('Observable.prototype.buffer', () => {
  asDiagram('buffer')('should emit buffers that close and reopen', () => {
    const a =    hot('-a-b-c-d-e-f-g-h-i-|')
    const b =    hot('-----B-----B-----B-|')
    const expected = '-----x-----y-----z-|'
    const expectedValues = {
      x: ['a', 'b', 'c'],
      y: ['d', 'e', 'f'],
      z: ['g', 'h', 'i'],
    }
    expectObservable(a.buffer(b)).toBe(expected, expectedValues)
  })
})

describe('Observable.fromEvent', () => {
  asDiagram('fromEvent(element, \'click\')')
  ('should create an observable of click on the element', () => {
    const target = {
      addEventListener: (_eventType: any, listener: any) => {
        Observable.timer(50, 20, rxTestScheduler)
          .mapTo('ev')
          .take(2)
          .concat(Observable.never())
          .subscribe(listener)
      },
      removeEventListener: () => void 0,
      dispatchEvent: () => void 0,
    }
    const e1 = Observable.fromEvent(target as any, 'click')
    const expected = '-----x-x---'
    expectObservable(e1).toBe(expected, {x: 'ev'})
  })
})
