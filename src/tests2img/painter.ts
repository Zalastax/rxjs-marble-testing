/*eslint-disable no-param-reassign, no-use-before-define*/
import * as gm from 'gm'
import { writeFile } from 'fs'
import * as _ from 'lodash'
import * as Color from 'color'

import { TestMessage, ColdStream, Stream, isCold } from '../missinginterfaces'

const CANVAS_WIDTH = 1280
let canvasHeight: number
const CANVAS_PADDING = 20
const OBSERVABLE_HEIGHT = 200
const OPERATOR_HEIGHT = 140
const ARROW_HEAD_SIZE = 18
const DEFAULT_MAX_FRAME = 10
const OBSERVABLE_END_PADDING = 5 * ARROW_HEAD_SIZE
const MARBLE_RADIUS = 32
const COMPLETE_HEIGHT = MARBLE_RADIUS
const TALLER_COMPLETE_HEIGHT = 1.8 * MARBLE_RADIUS
const SIN_45 = 0.707106
const NESTED_STREAM_ANGLE = 18 // degrees
const TO_RAD = (Math.PI / 180)
const MESSAGES_WIDTH = (CANVAS_WIDTH - 2 * CANVAS_PADDING - OBSERVABLE_END_PADDING)
const BLACK_COLOR = '#101010'
const COLORS = ['#3EA1CB', '#FFCB46', '#FF6946', '#82D736']
const SPECIAL_COLOR = '#1010F0'
const MESSAGE_OVERLAP_HEIGHT = TALLER_COMPLETE_HEIGHT

// =============================================================================
// Interfaces
// =============================================================================

enum MessageType {
  Nested,
  Marble,
  Error,
  Complete,
}

interface ObservableMessage {
  index: number
  x: number
  y: number
  inclination: number
  type: MessageType
  value: any
}

interface ObservableMessages {
  startX: number
  maxFrame: number
  messages: ObservableMessage[]
  isSpecial: boolean
  streamData: Stream
  isGhost: boolean
  angle: number
}

enum DrawableType {
  Nested,
  Marble,
  Error,
  Complete,
  Arrow,
  Operator,
}

interface ObservableArrow {
  angle: number
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
  type: DrawableType.Arrow
}

interface Marble {
  label: string
  fillColor: string
  outlineColor: string
  x: number
  y: number
  type: DrawableType.Marble
}

interface ErrorShape {
  angle: number
  color: string
  distance: number
  x: number
  y: number
  type: DrawableType.Error
}

interface Complete {
  radius: number
  x: number
  y: number
  outlineColor: string
  angle: number
  type: DrawableType.Complete
}

interface Operator {
  recX1: number
  recY1: number
  recX2: number
  recY2: number
  rotateY: number
  label: string
  type: DrawableType.Operator
}

type Drawable = ObservableArrow | Marble | ErrorShape | Complete | Operator

// =============================================================================
// Utility functions
// =============================================================================


function colorToGhostColor(hex: string) {
  return Color(hex).mix(Color('white')).hexString()
}

function getMaxFrame(allStreams: Stream[]): number {
  const allStreamsLen = allStreams.length
  let max = 0
  for (let i = 0; i < allStreamsLen; i++) {
    const messagesLen = allStreams[i].messages.length
    for (let j = 0; j < messagesLen; j++) {
      if (allStreams[i].messages[j].frame > max) {
        max = allStreams[i].messages[j].frame
      }
    }
  }
  return max
}

function stringToColor(str: string): string {
  const smallPrime1 = 59
  const smallPrime2 = 97
  const hash = str.split('')
    .map(function (x) { return x.charCodeAt(0) })
    .reduce(function (x, y) { return (x * smallPrime1) + (y * smallPrime2) }, 1)
  return COLORS[hash % COLORS.length]
}

function isNestedStreamData(message: TestMessage): boolean {
  return !!(message.notification.kind === 'N' &&
    message.notification.value &&
    message.notification.value.messages)
}

function areEqualStreamData(leftStreamData: Stream, rightStreamData: Stream) {
  if (leftStreamData.messages.length !== rightStreamData.messages.length) {
    return false
  }
  for (let i = 0; i < leftStreamData.messages.length; i++) {
    const left = leftStreamData.messages[i]
    const right = rightStreamData.messages[i]
    if (left.frame !== right.frame) {
      return false
    }
    if (left.notification.kind !== right.notification.kind) {
      return false
    }
    if (left.notification.value !== right.notification.value) {
      return false
    }
  }
  return true
}

function measureObservableArrow(maxFrame: number, streamData: Stream) {
  const startX = CANVAS_PADDING +
    MESSAGES_WIDTH * (+streamData.subscription.start / maxFrame)
  const MAX_MESSAGES_WIDTH = CANVAS_WIDTH - CANVAS_PADDING
  const lastMessageFrame = streamData.messages
    .reduce(function (acc: number, msg: TestMessage) {
      const frame = msg.frame
      return frame > acc ? frame : acc
    }, 0)
  const subscriptionEndX = CANVAS_PADDING +
    MESSAGES_WIDTH * (+streamData.subscription.end / maxFrame) +
    OBSERVABLE_END_PADDING
  const streamEndX = startX +
    MESSAGES_WIDTH * (lastMessageFrame / maxFrame) +
    OBSERVABLE_END_PADDING
  const endX = (streamData.subscription.end === '100%') ?
    MAX_MESSAGES_WIDTH :
    Math.max(streamEndX, subscriptionEndX)

  return {startX: startX, endX: endX}
}

// difference in y for vector from startX to endX with angle
function vectorHeight(startX: number, endX: number, angle: number) {
  const length = endX - startX
  const cotAngle = Math.cos(angle * TO_RAD) / Math.sin(angle * TO_RAD)
  return (length / cotAngle)
}

function measureNestedStreamHeight(maxFrame: number, streamData: Stream) {
  const measurements = measureObservableArrow(maxFrame, streamData)
  const startX = measurements.startX
  const endX = measurements.endX
  return vectorHeight(startX, endX, NESTED_STREAM_ANGLE)
}

function amountPriorOverlaps(message: TestMessage, messageIndex: number, otherMessages: TestMessage[]): number {
  return otherMessages.reduce(function (acc: number, otherMessage: TestMessage, otherIndex: number) {
    if (otherIndex < messageIndex
    && otherMessage.frame === message.frame
    && message.notification.kind === 'N'
    && otherMessage.notification.kind === 'N') {
      return acc + 1
    }
    return acc
  }, 0)
}

function measureStreamHeight(maxFrame: number) {
  return function measureStreamHeightWithMaxFrame(streamData: Stream) {
    const messages = streamData.messages
    let maxMessageHeight = messages
      .map(function (msg: TestMessage, index: number) {
        const height = isNestedStreamData(msg) ?
          measureNestedStreamHeight(maxFrame, msg.notification.value) + OBSERVABLE_HEIGHT * 0.25 :
          OBSERVABLE_HEIGHT * 0.5
        const overlapHeightBonus = amountPriorOverlaps(msg, index, messages) * MESSAGE_OVERLAP_HEIGHT
        return height + overlapHeightBonus
      })
      .reduce(function (acc: number, curr: number) {
        return curr > acc ? curr : acc
      }, 0)
    maxMessageHeight = Math.max(maxMessageHeight, OBSERVABLE_HEIGHT * 0.5) // to avoid zero
    return OBSERVABLE_HEIGHT * 0.5 + maxMessageHeight
  }
}

function stringifyContent(content: any): string {
  let string = content
  if (Array.isArray(content)) {
    string = `[${content.join(',')}]`
  } else if (typeof content === 'boolean') {
    return content ? 'true' : 'false'
  } else if (typeof content === 'object') {
    string = JSON.stringify(content).replace(/"/g, '')
  }
  return '' + string
}

// =============================================================================
// Drawable creators
// =============================================================================

function outlineColor(isSpecial: boolean, isGhost: boolean) {
  let color = BLACK_COLOR
  if (isSpecial) {
    color = SPECIAL_COLOR
  }
  if (isGhost) {
    color = colorToGhostColor(color)
  }
  return color
}

function fillColor(content: any, isGhost: boolean) {
  let fillColor = stringToColor(stringifyContent(content))
  if (isGhost) {
    fillColor = colorToGhostColor(fillColor)
  }
  return fillColor
}

function observableArrow(maxFrame: number, startY: number, angle: number, streamData: Stream, isSpecial: boolean): ObservableArrow {
  const {startX, endX} = measureObservableArrow(maxFrame, streamData)
  const endY = startY + vectorHeight(startX, endX, angle)

  return {
    angle,
    startX,
    startY,
    endX,
    endY,
    color: outlineColor(isSpecial, !!streamData.isGhost),
    type: DrawableType.Arrow,
  }
}

function marble(x: number, y: number, inclination: any, content: any, isSpecial: boolean, isGhost: any): Marble {


  return {
    label: stringifyContent(content),
    fillColor: fillColor(content, isGhost),
    outlineColor: outlineColor(isSpecial, isGhost),
    x,
    y: y + inclination,
    type: DrawableType.Marble,
  }
}

function errorShape(x: number, baseY: number, startX: number, angle: number, isSpecial: boolean, isGhost: boolean): ErrorShape {
  const inclination = vectorHeight(startX, x, angle)

  const y = baseY + inclination
  const distance = MARBLE_RADIUS * SIN_45

  return {
    angle,
    color: outlineColor(isSpecial, isGhost),
    distance,
    x,
    y,
    type: DrawableType.Error,
  }
}

function complete(x: number, y: number, maxFrame: number, angle: number, streamData: any, isSpecial: boolean, isGhost: boolean): Complete {
  const startX = CANVAS_PADDING +
    MESSAGES_WIDTH * (streamData.subscription.start / maxFrame)

  const isOverlapping = streamData.messages.some(function (msg: any) {
    if (msg.notification.kind !== 'N') { return false }
    const msgX = startX + MESSAGES_WIDTH * (msg.frame / maxFrame)
    return Math.abs(msgX - x) < MARBLE_RADIUS
  })
  const inclination = vectorHeight(startX, x, angle)
  const radius = isOverlapping ? TALLER_COMPLETE_HEIGHT : COMPLETE_HEIGHT

  return {
    radius,
    x,
    y: y + inclination,
    outlineColor: outlineColor(isSpecial, isGhost),
    angle,
    type: DrawableType.Complete,
  }
}

function nestedObservable(maxFrame: number, y: number, streamData: Stream): Drawable[] {
  const angle = NESTED_STREAM_ANGLE
  return [observableArrow(maxFrame, y, angle, streamData, false),
    ...observableMessages(maxFrame, y, angle, streamData, false)]
}

function unwrap(observableMessages: ObservableMessages) {
  const { startX, maxFrame, messages, isSpecial, isGhost, streamData, angle } = observableMessages

  const drawables: Drawable[] = []

  messages.forEach((message: ObservableMessage) => {
    const { type, x, inclination, y, value } = message
    switch (type) {
      case MessageType.Nested:
        const shape = nestedObservable(maxFrame, y, value)
        drawables.push(...shape)
        break
      case MessageType.Marble:
        drawables.push(marble(x, y, inclination, value, isSpecial, isGhost))
        break
      case MessageType.Error:
        drawables.push(errorShape(x, y, startX, angle, isSpecial, isGhost))
        break
      case MessageType.Complete:
        drawables.push(complete(x, y, maxFrame, angle, streamData, isSpecial, isGhost))
        break
    }
  })

  return drawables
}

function observableMessages(maxFrame: number, baseY: number, angle: number, streamData: Stream, isSpecial: boolean): Drawable[] {
  const startX = CANVAS_PADDING +
    MESSAGES_WIDTH * (+streamData.subscription.start / maxFrame)

  const sm = streamData.messages

  const messages = sm.map((message: TestMessage, index: number) => {
    if (message.frame < 0) {
      return undefined
    }

    let x = startX + MESSAGES_WIDTH * (message.frame / maxFrame)
    if (x - MARBLE_RADIUS < 0) { // out of screen, on the left
      x += MARBLE_RADIUS
    }

    const y: number = baseY + amountPriorOverlaps(message, index, sm) * MESSAGE_OVERLAP_HEIGHT
    const inclination = vectorHeight(startX, x, angle)

    let type: MessageType
    switch (message.notification.kind) {
      case 'N':
        if (isNestedStreamData(message)) {
          type = MessageType.Nested
        } else {
          type = MessageType.Marble
        }
        break;
        case 'E': type = MessageType.Error; break
        case 'C': type = MessageType.Complete; break
        default: return undefined
    }

    const value = message.notification.value

    return {
      index,
      x,
      y,
      inclination,
      type,
      value,
    }
  })
  .reverse()
  .filter((x: undefined | ObservableMessage) => x !== undefined) as ObservableMessage[]

  return unwrap({
    startX,
    maxFrame,
    messages,
    isSpecial,
    streamData,
    isGhost: !!streamData.isGhost,
    angle,
  })
}

function observable(maxFrame: number, y: number, streamData: Stream, isSpecial: boolean): Drawable[] {
  const offsetY = OBSERVABLE_HEIGHT * 0.5
  const angle = 0
  return [observableArrow(maxFrame, y + offsetY, angle, streamData, isSpecial),
    ...observableMessages(maxFrame, y + offsetY, angle, streamData, isSpecial)]
}

function operator(label: string, y: number): Operator {
  return {
    recX1: CANVAS_PADDING,
    recY1: y,
    recX2: CANVAS_WIDTH - CANVAS_PADDING,
    recY2: y + OPERATOR_HEIGHT,
    rotateY: y + OPERATOR_HEIGHT * 0.5 - canvasHeight * 0.5,
    label: stringifyContent(label),
    type: DrawableType.Operator,
  }
}

// =============================================================================
// GM
// =============================================================================

function drawMarbleGM(out: gm.State, m: Marble) {
  out = out.stroke(m.outlineColor, 3)
  out = out.fill(m.fillColor)
  out = out.drawEllipse(m.x, m.y, MARBLE_RADIUS, MARBLE_RADIUS, 0, 360)

  out = out.strokeWidth(-1)
  out = out.fill(m.outlineColor)
  out = out.font('helvetica', 28)
  out = out.draw(
    'translate ' + (m.x - CANVAS_WIDTH * 0.5) + ',' + (m.y - canvasHeight * 0.5),
    'gravity Center',
    'text 0,0',
    `"${m.label}"`)
  return out
}

function drawErrorGM(out: gm.State, e: ErrorShape) {
  out = out.stroke(e.color, 3)

  const line = (firstSign: number, secondSign: number) => `${firstSign * e.distance},${secondSign * e.distance}`

  out = out.draw(
    'translate', e.x + ',' + e.y,
    `rotate ${e.angle}`,
    'line',
        line(-1, -1),
        line(1, 1),
    'line',
      line(1, -1),
      line(-1, 1))
  return out
}

function drawCompleteGM(out: gm.State, c: Complete) {
  out = out.stroke(c.outlineColor, 3)
  out = out.draw(
    'translate', `${c.x},${c.y}`,
    `rotate ${c.angle}`,
    'line',
      `0,${-c.radius}`,
      `0,${c.radius}`)
  return out
}

function drawArrowGM(out: gm.State, a: ObservableArrow) {
  out = out.stroke(a.color, 3)
  out = out.drawLine(a.startX, a.startY, a.endX, a.endY)
  out = out.draw(
    'translate', `${a.endX},${a.endY}`,
    `rotate ${a.angle}`,
    'line',
      '0,0',
      `${(-ARROW_HEAD_SIZE * 2)},${(-ARROW_HEAD_SIZE)}`,
    'line',
      '0,0',
      `${(-ARROW_HEAD_SIZE * 2)},${(+ARROW_HEAD_SIZE)}`)
  return out
}

function drawOperatorGM(out: gm.State, o: Operator) {
  out = out.stroke(BLACK_COLOR, 3)
  out = out.fill('#FFFFFF00')
  out = out.drawRectangle(o.recX1, o.recY1, o.recX2, o.recY2)
  out = out.strokeWidth(-1)
  out = out.fill(BLACK_COLOR)
  out = out.font('helvetica', 54)
  out = out.draw(
    `translate 0,${o.rotateY}`,
    'gravity Center',
    'text 0,0',
    `"${o.label}"`)
  return out
}

function drawGM(toDraw: Drawable[], filename: string, cb: (err?: Error) => void) {
  let out = gm(CANVAS_WIDTH, canvasHeight, '#ffffff')

  toDraw.forEach((drawable) => {
    switch (drawable.type) {
      case DrawableType.Marble:
        out = drawMarbleGM(out, drawable)
        break
      case DrawableType.Error:
        out = drawErrorGM(out, drawable)
        break
      case DrawableType.Complete:
        out = drawCompleteGM(out, drawable)
        break
      case DrawableType.Arrow:
        out = drawArrowGM(out, drawable)
        break
      case DrawableType.Operator:
        out = drawOperatorGM(out, drawable)
        break
    }
  })

  out.write(filename + '.png', cb)
}

// =============================================================================
// SVG
// =============================================================================

interface SvgState {
  width: number
  height: number
  body: string[]
}

function drawMarbleSVG(state: SvgState, m: Marble) {
  /*
  out = out.stroke(m.outlineColor, 3)
  out = out.fill(m.fillColor)
  out = out.drawEllipse(m.x, m.y, MARBLE_RADIUS, MARBLE_RADIUS, 0, 360)

  out = out.strokeWidth(-1)
  out = out.fill(m.outlineColor)
  out = out.font('helvetica', 28)
  out = out.draw(
    'translate ' + (m.x - CANVAS_WIDTH * 0.5) + ',' + (m.y - canvasHeight * 0.5),
    'gravity Center',
    'text 0,0',
    `"${m.label}"`)
  return out*/

  const circleStyle = `fill="${m.fillColor}" stroke="${m.outlineColor}" stroke-width="3"`
  const circle = `<circle cx="${m.x}" cy="${m.y}" r="${MARBLE_RADIUS}" ${circleStyle}/>`

  const textPosition = `x="${m.x}" y="${m.y}" dy=".3em" text-anchor="middle"`
  const textFont = 'font-size="28" font-family="Helvetica, Arial, sans-serif"'
  const text = `<text fill="${BLACK_COLOR}" ${textFont} ${textPosition}>${m.label}</text>`

  state.width = Math.max(state.width, m.x + 10)
  state.height = Math.max(state.height, m.y + 10)

  state.body.push(circle, text)
}

function drawErrorSVG(state: SvgState, e: ErrorShape) {
  const coord = (pair: number, firstSign: number, secondSign: number) =>
    `x${pair}="${e.x + firstSign * e.distance}" y${pair}="${e.y + secondSign * e.distance}"`

  const lineStyle = `stroke="${e.color}" stroke-width="3"`

  const line1 = `<line ${coord(1, -1, -1)} ${coord(2, 1, 1)} ${lineStyle} />`
  const line2 = `<line ${coord(1, 1, -1)} ${coord(2, -1, 1)} ${lineStyle} />`

  state.width = Math.max(state.width, e.x + e.distance + 10)
  state.height = Math.max(state.height, e.y + e.distance + 10)

  state.body.push(line1, line2)
}

function drawCompleteSVG(state: SvgState, c: Complete) {
  const transform = `transform="translate(${c.x}, ${c.y}) rotate(${c.angle})"`
  const stroke = `stroke="${c.outlineColor}" stroke-width="3"`
  const body = `<line x1="0" y1="${-c.radius}" x2="0" y2="${c.radius}" ${stroke} ${transform}/>`

  state.width = Math.max(state.width, c.x + c.radius + 10)
  state.height = Math.max(state.height, c.y + c.radius + 10)

  state.body.push(body)
}

function drawArrowSVG(state: SvgState, a: ObservableArrow) {
  const stroke = `stroke="${a.color}" stroke-width="3"`
  const arrowBody = `<line x1="${a.startX}" y1="${a.startY}" x2="${a.endX}" y2="${a.endY}" ${stroke}/>`

  const arrowHeadStart = `<g transform="translate(${a.endX}, ${a.endY}) rotate(${a.angle})">`
  const arrowHeadLine1 = `<line x1="0" y1="0" x2="${(-ARROW_HEAD_SIZE * 2)}" y2="${(-ARROW_HEAD_SIZE)}" ${stroke}/>`
  const arrowHeadLine2 = `<line x1="0" y1="0" x2="${(-ARROW_HEAD_SIZE * 2)}" y2="${(+ARROW_HEAD_SIZE)}" ${stroke}/>`
  const arrowHeadEnd = '</g>'

  state.body.push(arrowBody, arrowHeadStart, arrowHeadLine1, arrowHeadLine2, arrowHeadEnd)

  state.width = Math.max(state.width, a.endX + 10)
  state.height = Math.max(state.height, a.endY + 10)
}

function drawOperatorSVG(state: SvgState, o: Operator) {
  const position = `x="${o.recX1}" y="${o.recY1}"`
  const size = `width="${o.recX2 - o.recX1}" height="${o.recY2 - o.recY1}"`

  const rectColor = `fill="none" stroke="${BLACK_COLOR}"`
  const rect = `<rect ${rectColor} x="0" y="0" ${size} stroke-width="6" />`

  const textPosition = 'x="50%" y="50%" dy=".3em" text-anchor="middle"'
  const textFont = 'font-size="54" font-family="Helvetica, Arial, sans-serif"'
  const text = `<text fill="${BLACK_COLOR}" ${textFont} ${textPosition}>${o.label}</text>`

  const groupStart = `<svg ${position} ${size}>`
  const groupEnd = `</svg>`

  state.width = Math.max(state.width, o.recX2 + 10)
  state.height = Math.max(state.height, o.recY2 + 10)

  state.body.push(groupStart, rect, text, groupEnd)
}

function drawSVG(toDraw: Drawable[], filename: string, cb: (err?: Error) => void) {
  const state: SvgState = {
    width: 0,
    height: 0,
    body: [],
  }

  toDraw.forEach((drawable) => {
    switch (drawable.type) {
      case DrawableType.Marble:
      drawMarbleSVG(state, drawable)
        break
      case DrawableType.Error:
        drawErrorSVG(state, drawable)
        break
      case DrawableType.Complete:
        drawCompleteSVG(state, drawable)
        break
      case DrawableType.Arrow:
        drawArrowSVG(state, drawable)
        break
      case DrawableType.Operator:
      drawOperatorSVG(state, drawable)
        break
    }
  })

  const svg = `<svg
version="1.1"
baseProfile="full"
xmlns="http://www.w3.org/2000/svg"
width="${state.width}" height="${state.height}">
${state.body.join('\n')}
</svg>`

  writeFile(filename + '.svg', svg, cb)
}

// =============================================================================
// Prepare streams
// =============================================================================

// Remove cold inputStreams which are already nested in some higher order stream
function removeDuplicateInputs(inputStreams: Stream[], outputStreams: Stream[]) {
  return inputStreams.filter(function (inputStream: Stream) {
    return !inputStreams.concat(outputStreams).some(function (otherStream: Stream) {
      return otherStream.messages.some(function (msg: TestMessage) {
        if (isCold(inputStream) || true) {
          const is = inputStream as ColdStream
          const cold = is.cold
          const passes = isNestedStreamData(msg) &&
            cold &&
            _.isEqual(msg.notification.value.messages, cold.messages)
          if (passes) {
            if (cold.subscriptions.length) {
              msg.notification.value.subscription = {
                start: cold.subscriptions[0].subscribedFrame,
                end: cold.subscriptions[0].unsubscribedFrame,
              }
            }
          }
          return passes
        }

        // return false
      })
    })
  })
}

// For every inner stream in a higher order stream, create its ghost version
// A ghost stream is a reference to an Observable that has not yet executed,
// and is painted as a semi-transparent stream.
function addGhostInnerInputs(inputStreams: Stream[]) {
  for (let i = 0; i < inputStreams.length; i++) {
    const inputStream = inputStreams[i]
    for (let j = 0; j < inputStream.messages.length; j++) {
      const message = inputStream.messages[j]
      if (isNestedStreamData(message) && typeof message.isGhost !== 'boolean') {
        const referenceTime = message.frame
        if (!message.notification.value.subscription) {
          // There was no subscription at all, so this nested Observable is ghost
          message.isGhost = true
          message.notification.value.isGhost = true
          message.frame = referenceTime
          message.notification.value.subscription = { start: referenceTime, end: 0 }
          continue
        }
        const subscriptionTime = message.notification.value.subscription.start
        if (referenceTime !== subscriptionTime) {
          message.isGhost = false
          message.notification.value.isGhost = false
          message.frame = subscriptionTime

          const ghost = _.cloneDeep(message)
          ghost.isGhost = true
          ghost.notification.value.isGhost = true
          ghost.frame = referenceTime
          ghost.notification.value.subscription.start = referenceTime
          ghost.notification.value.subscription.end -= subscriptionTime - referenceTime
          inputStream.messages.push(ghost)
        }
      }
    }
  }
  return inputStreams
}

function sanitizeHigherOrderInputStreams(inputStreams: Stream[], outputStreams: Stream[]) {
  let newInputStreams = removeDuplicateInputs(inputStreams, outputStreams)
  newInputStreams = addGhostInnerInputs(newInputStreams)
  return newInputStreams
}

// =============================================================================
// Export
// =============================================================================


export default function painter(
  inputStreams: Stream[],
  operatorLabel: string,
  outputStreams: Stream[],
  filename: string,
  cb: (err?: Error) => void) {
  inputStreams = sanitizeHigherOrderInputStreams(inputStreams, outputStreams)
  const maxFrame = getMaxFrame(inputStreams.concat(outputStreams)) || DEFAULT_MAX_FRAME
  const allStreamsHeight = inputStreams.concat(outputStreams)
    .map(measureStreamHeight(maxFrame))
    .reduce(function (x: number, y: number) { return x + y }, 0)
  canvasHeight = allStreamsHeight + OPERATOR_HEIGHT

  let heightSoFar = 0

  const toDraw: Drawable[] = []

  inputStreams.forEach((streamData: Stream) => {
    const ob = observable(maxFrame, heightSoFar, streamData, false)
    heightSoFar += measureStreamHeight(maxFrame)(streamData)
    toDraw.push(...ob)
  })

  toDraw.push(operator(operatorLabel, heightSoFar))

  heightSoFar += OPERATOR_HEIGHT
  outputStreams.forEach((streamData: Stream) => {
    const isSpecial = inputStreams.length > 0 && areEqualStreamData(inputStreams[0], streamData)
    const ob = observable(maxFrame, heightSoFar, streamData, isSpecial)
    heightSoFar += measureStreamHeight(maxFrame)(streamData)
    toDraw.push(...ob)
  })

  let i = 0
  let done = false

  function cbHandler(err?: Error) {
    if (done) {
      return
    }
    if (err) {
      done = true
      return cb(err)
    }
    if (++i >= 2) {
      done = true
      cb()
    }
  }

  drawGM(toDraw, filename, cbHandler)
  drawSVG(toDraw, filename, cbHandler)
}
