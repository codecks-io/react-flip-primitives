import React from 'react'
import {
  translateX,
  translateY,
  scaleX,
  scaleY,
  multiply,
  toString,
} from 'rematrix'

// 3d transforms were causing weird issues in chrome,
// especially when opacity was also being tweened,
// so convert to a 2d matrix
export const convertMatrix3dArrayTo2dArray = matrix =>
  [0, 1, 4, 5, 12, 13].map(index => matrix[index])

// eslint-disable-next-line complexity
const flipNode = ({node, prevRect, currentRect, opts}, durationMs) => {
  const transforms = []
  const transitions = []
  if (opts.positionMode !== 'none') {
    if (prevRect.left !== currentRect.left) {
      transforms.push(translateX(prevRect.left - currentRect.left))
    }
    if (prevRect.top !== currentRect.top) {
      transforms.push(translateY(prevRect.top - currentRect.top))
    }
  }
  if (opts.scaleMode === 'non-transform') {
    if (prevRect.width !== currentRect.width) {
      transitions.push({
        prop: 'width',
        flipStartVal: `${prevRect.width}px`,
        flipEndVal: `${currentRect.width}px`,
        resetTo: node.style.width,
      })
    }
    if (prevRect.height !== currentRect.height) {
      transitions.push({
        prop: 'height',
        flipStartVal: `${prevRect.height}px`,
        flipEndVal: `${currentRect.height}px`,
        resetTo: node.style.height,
      })
    }
  } else if (opts.scaleMode === 'immediate') {
    if (prevRect.height !== currentRect.height) {
      transitions.push({
        prop: 'height',
        flipStartVal: `${currentRect.height}px`,
        flipEndVal: null,
        resetTo: node.style.height,
      })
    }
    if (prevRect.width !== currentRect.width) {
      transitions.push({
        prop: 'width',
        flipStartVal: `${currentRect.width}px`,
        flipEndVal: null,
        resetTo: node.style.width,
      })
    }
  } else {
    if (prevRect.width !== currentRect.width) {
      transforms.push(
        scaleX(Math.max(prevRect.width, 1) / Math.max(currentRect.width, 1)),
      )
    }
    if (prevRect.height !== currentRect.height) {
      transforms.push(
        scaleY(Math.max(prevRect.height, 1) / Math.max(currentRect.height, 1)),
      )
    }
  }
  if (transforms.length) {
    transitions.push({
      prop: 'transform',
      flipStartVal: toString(transforms.reduce(multiply)),
      flipEndVal: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
    })
    node.style.transformOrigin = '0px 0px 0px'
  }

  if (!transitions.length) return null
  node.style.transition = 'none'
  transitions.forEach(({flipStartVal, prop}) => {
    node.style[prop] = flipStartVal
  })
  const trueTransitions = transitions.filter(({flipEndVal}) => flipEndVal)
  const resetAfterFinish = transitions.filter(
    ({resetTo}) => resetTo !== undefined,
  )
  if (trueTransitions.length) {
    node.style.willChange = transitions.map(({prop}) => prop).join(',')
  }

  return () => {
    if (trueTransitions) {
      node.style.transition = trueTransitions
        .map(({prop}) => `${prop} ${durationMs}ms ease-out`)
        .join(',')
      trueTransitions.forEach(({flipEndVal, prop}) => {
        node.style[prop] = flipEndVal
      })
    }

    if (resetAfterFinish.length) {
      return () => {
        resetAfterFinish.forEach(({resetTo, prop}) => {
          node.style[prop] = resetTo
        })
      }
    } else {
      return null
    }
  }
}

export default class ReactFlip extends React.Component {
  /*
  Structure: {
    key: {key, node, handler, pendingResetTimeoutId}
  }
  */

  static defaultProps = {
    durationMs: 200,
  }

  nodeInfoPerKey = {}

  getOrCreateHandlerForKey = (key, opts) => {
    const existing = this.nodeInfoPerKey[key]
    if (existing) {
      existing.opts = opts
      return existing
    }
    const newVal = {
      key,
      node: null,
      handler: node => {
        newVal.node = node
      },
      opts,
      pendingResetTimeoutId: null,
    }
    this.nodeInfoPerKey[key] = newVal
    return newVal
  }

  setStyle = (key, opts = {}) => {
    return this.getOrCreateHandlerForKey(key, opts).handler
  }

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return null
    const boundsPerKey = {}
    Object.values(this.nodeInfoPerKey).forEach(({key, node}) => {
      if (node) boundsPerKey[key] = node.getBoundingClientRect()
    })
    return boundsPerKey
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (!snapshot) return
    const newPositions = []
    const {durationMs} = this.props
    Object.values(this.nodeInfoPerKey).forEach(({key, node, opts}) => {
      if (node && snapshot[key]) {
        newPositions.push({
          key,
          node,
          prevRect: snapshot[key],
          currentRect: node.getBoundingClientRect(),
          opts,
        })
      }
    })
    const nextFrameActions = newPositions
      .map(p => ({cb: flipNode(p, durationMs), key: p.key}))
      .filter(({cb}) => cb)
    if (nextFrameActions.length) {
      // asking for two animation frames since one frame is sometimes not enough to trigger transitions
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          nextFrameActions.forEach(({key, cb}) => {
            const keyInfo = this.nodeInfoPerKey[key]
            if (keyInfo.pendingResetTimeoutId) {
              clearTimeout(keyInfo.pendingResetTimeoutId)
              keyInfo.pendingResetTimeoutId = null
            }
            const resetCb = cb()
            if (resetCb) {
              keyInfo.pendingResetTimeoutId = setTimeout(() => {
                resetCb()
                keyInfo.pendingResetTimeoutId = null
              }, durationMs)
            }
          }),
        ),
      )
    }
  }

  render() {
    return this.props.children(this.setStyle)
  }
}
