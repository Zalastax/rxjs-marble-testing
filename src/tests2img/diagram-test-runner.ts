// var root = require('../../../dist/cjs/util/root').root;
import * as Rx from 'rxjs'
import painter from './painter'
import * as path from 'path'

export interface TestMessage {
  frame: number
  notification: Rx.Notification<any>
  isGhost?: boolean
}

export interface SubscriptionLog {
  subscribedFrame: number
  unsubscribedFrame: number
}

interface HotObservable extends Rx.Subject<any> {
  messages: TestMessage[]
}

export interface ColdObservable extends Rx.Observable<any> {
  messages: TestMessage[]
  subscriptions: SubscriptionLog[]
}

interface RxTestScheduler {
  hotObservables: HotObservable[]
  coldObservables: ColdObservable[]
}

export interface Stream {
  messages: TestMessage[]
  subscription: {start: number | string, end: number | string}
  isGhost?: boolean
}

export interface HotStream extends Stream {}

export interface ColdStream extends Stream {
  cold: ColdObservable
}

export function isCold(x: Stream): x is ColdStream {
  return !!(x as ColdStream).cold
}

declare const global: any

function getInputStreams(rxTestScheduler: RxTestScheduler): Stream[] {
  return Array.prototype.concat(
    rxTestScheduler.hotObservables
      .map((hot): Stream => {
        return {
          messages: hot.messages,
          subscription: {start: 0, end: '100%'},
        }
      }),
    rxTestScheduler.coldObservables
      .map((cold): ColdStream => {
        return {
          messages: cold.messages,
          cold: cold,
          subscription: {start: 'placeholder', end: 'placeholder'}
        }
      }),
  )
}

function updateInputStreamsPostFlush(inputStreams: Stream[], _rxTestScheduler: any) {
  return inputStreams.map(function (singleInputStream: HotStream | ColdStream) {
    if (isCold(singleInputStream) && singleInputStream.cold.subscriptions.length) {
      singleInputStream.subscription = {
        start: singleInputStream.cold.subscriptions[0].subscribedFrame,
        end: singleInputStream.cold.subscriptions[0].unsubscribedFrame,
      }
    }
    return singleInputStream
  })
}

function postProcessOutputMessage(msg: any) {
  if (Array.isArray(msg.notification.value)
  && msg.notification.value.length
  && typeof msg.notification.value[0] === 'object') {
    msg.notification.value = {
      messages: msg.notification.value,
      subscription: {start: msg.frame, end: '100%'},
    }
    const completionFrame = msg.notification.value.messages
      .reduce(function (prev: any, x: any) {
        if (x.notification && x.notification.kind === 'C' && x.frame > prev) {
          return x.frame
        } else {
          return prev
        }
      }, -1)
    if (completionFrame > -1) {
      msg.notification.value.subscription.end = msg.frame + completionFrame
    }
  }
  return msg
}

function makeFilename(operatorLabel: string) {
  return (/^(\w+)/.exec(operatorLabel) as RegExpExecArray)[1]
}

global.asDiagram = function asDiagram(operatorLabel: string, glit: any) {
  // console.log("asDiagram for something")
  return function specFnWithPainter(description: string, specFn: any) {
    // console.log("asDiagram returned function")
    if (specFn.length === 0) {
      glit(description, function (cb: any) {
        const outputStreams: HotStream[] = []
        global.rxTestScheduler = new Rx.TestScheduler(function (actual) {
          if (Array.isArray(actual) && actual.length > 0 && typeof actual[0].frame === 'number') {
            outputStreams.push({
              messages: actual.map(postProcessOutputMessage),
              subscription: {start: 0, end: '100%'}
            })
          } else if (Array.isArray(actual) && actual.length === 0) { // is the never Observable
            outputStreams.push({
              messages: [],
              subscription: {start: 0, end: '100%'}
            })
          }
          return true
        })
        specFn()
        let inputStreams = getInputStreams(global.rxTestScheduler)
        global.rxTestScheduler.flush()
        inputStreams = updateInputStreamsPostFlush(inputStreams, global.rxTestScheduler)
        // var filename = './tmp/docs/img/' + makeFilename(operatorLabel)
        const filename = path.resolve('./tmp/docs/img/', makeFilename(operatorLabel))
        painter(inputStreams, operatorLabel, outputStreams, filename, (err?: Error) => {
          if (!err) {
            console.log('Painted ' + filename)
          } else {
            console.error('Failed to paint ' + filename, err)
          }
          cb(err)
        })
      })
    } else {
      throw new Error('cannot generate PNG marble diagram for async test ' + description)
    }
  }
}
