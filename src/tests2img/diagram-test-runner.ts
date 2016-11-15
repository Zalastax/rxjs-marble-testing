// var root = require('../../../dist/cjs/util/root').root;
import * as Rx from 'rxjs'
import painter from './painter'
import * as path from 'path'
import { Stream, ColdStream, RxTestScheduler, HotStream, isCold } from '../missinginterfaces'

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

function buildDiagramOutputStream(streams: HotStream[], source: any) {
  if (Array.isArray(source) && source.length > 0 && typeof source[0].frame === 'number') {
    streams.push({
      messages: source.map(postProcessOutputMessage),
      subscription: {start: 0, end: '100%'},
    })
  } else if (Array.isArray(source) && source.length === 0) { // is the never Observable
    streams.push({
      messages: [],
      subscription: {start: 0, end: '100%'},
    })
  }
}

global.buildDiagramOutputStream = buildDiagramOutputStream
global.updateInputStreamsPostFlush = updateInputStreamsPostFlush
global.getInputStreams = getInputStreams
global.painter = painter

global.asDiagram = function asDiagram(operatorLabel: string, glit: (title: any, fn: any) => any) {
  return function specFnWithPainter(description: string, specFn: any) {
    if (specFn.length === 0) {
      glit(description, function (cb: any) {
        const outputStreams: HotStream[] = []
        global.rxTestScheduler = new Rx.TestScheduler(function (actual) {
          buildDiagramOutputStream(outputStreams, actual)
          return true
        })
        specFn()
        let inputStreams = getInputStreams(global.rxTestScheduler)
        global.rxTestScheduler.flush()
        inputStreams = updateInputStreamsPostFlush(inputStreams, global.rxTestScheduler)

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
