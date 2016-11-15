import * as Rx from 'rxjs'

export interface TestMessage {
  frame: number
  notification: Rx.Notification<any>
  isGhost?: boolean
}

export interface SubscriptionLog {
  subscribedFrame: number
  unsubscribedFrame: number
}

export interface HotObservable extends Rx.Subject<any> {
  messages: TestMessage[]
}

export interface ColdObservable extends Rx.Observable<any> {
  messages: TestMessage[]
  subscriptions: SubscriptionLog[]
}

export interface RxTestScheduler {
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
