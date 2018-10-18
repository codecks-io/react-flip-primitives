import React from 'react'
import PropTypes from 'prop-types'
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

const getTransitions = ({nodeInfo, prevRect, currentRect}) => {
  const {opts, node} = nodeInfo
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
  const dimensions = [
    {dim: 'height', scaleFn: scaleY},
    {dim: 'width', scaleFn: scaleX},
  ]
  dimensions.forEach(({dim, scaleFn}) => {
    if (opts.scaleMode === 'non-transform') {
      if (prevRect[dim] !== currentRect[dim]) {
        transitions.push({
          prop: dim,
          flipStartVal: `${prevRect[dim]}px`,
          flipEndVal: `${currentRect[dim]}px`,
          resetTo: node.style[dim],
        })
      }
    } else if (opts.scaleMode === 'immediate') {
      if (prevRect[dim] !== currentRect[dim]) {
        transitions.push({
          prop: dim,
          flipStartVal: `${currentRect[dim]}px`,
          flipEndVal: null,
          resetTo: node.style[dim],
        })
      }
    } else if (opts.scaleMode === 'transform') {
      if (prevRect[dim] !== currentRect[dim]) {
        transforms.push(
          scaleFn(Math.max(prevRect[dim], 1) / Math.max(currentRect[dim], 1)),
        )
      }
    }
  })
  if (transforms.length) {
    transitions.push({
      prop: 'transform',
      flipStartVal: toString(transforms.reduce(multiply)),
      flipEndVal: 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
    })
    node.style.transformOrigin = '0px 0px 0px'
  }
  return transitions
}

const flipNode = ({nodeInfo, prevRect, currentRect}, durationMs) => {
  const transitions = getTransitions({nodeInfo, prevRect, currentRect})

  if (!transitions.length) return null
  const trueTransitions = transitions.filter(({flipEndVal}) => flipEndVal)

  if (nodeInfo.currentTransition) {
    nodeInfo.currentTransition.clearTimeout()
  }
  if (nodeInfo.opts.setWillChange && trueTransitions.length) {
    nodeInfo.node.style.willChange = transitions.map(({prop}) => prop).join(',')
  }
  nodeInfo.node.style.transition = nodeInfo.opts.transitionProps
    .map(prop => `${prop} ${durationMs}ms ease-out`)
    .join(', ')
  transitions.forEach(({flipStartVal, prop}) => {
    nodeInfo.node.style[prop] = flipStartVal
  })

  return () => {
    if (trueTransitions.length || nodeInfo.opts.transitionProps.length) {
      nodeInfo.node.style.transition = [
        ...trueTransitions,
        ...nodeInfo.opts.transitionProps.map(prop => ({prop})),
      ]
        .map(({prop}) => `${prop} ${durationMs}ms ease-out`)
        .join(',')
      trueTransitions.forEach(({flipEndVal, prop}) => {
        nodeInfo.node.style[prop] = flipEndVal
      })
    }

    const timeoutId = setTimeout(() => {
      nodeInfo.currentTransition.resetStyles()
      if (nodeInfo.leaving) {
        nodeInfo.leaving.onDone()
      }
      nodeInfo.currentTransition = null
    }, durationMs)

    nodeInfo.currentTransition = {
      clearTimeout: () => clearTimeout(timeoutId),
      resetStyles: () => {
        nodeInfo.node.style.transition = nodeInfo.opts.transitionProps
          .map(prop => `${prop} ${durationMs}ms ease-out`)
          .join(', ')
        transitions.forEach(({resetTo, prop}) => {
          if (resetTo !== undefined) nodeInfo.node.style[prop] = resetTo
        })
      },
    }
  }
}

const defaultHandlerOpts = {
  positionMode: 'transform',
  scaleMode: 'transform',
  enterStyle: null,
  transitionProps: [],
  setWillChange: false,
}

export default class ReactFlip extends React.Component {
  static propTypes = {
    durationMs: PropTypes.number,
    changeKey: PropTypes.string.isRequired,
    children: PropTypes.func.isRequired,
    noAnimationOnMount: PropTypes.bool,
  }

  static defaultProps = {
    durationMs: 200,
  }

  /*
  Structure: {
    key: {
      key, node, handler,
      currentTransition?: {clearTimeout, resetStyles},
      leaving?: {finalStyle, onDone, beforeLeavingStyles}
    }
  }
  */
  nodeInfoPerKey = {}
  measuredNodes = {} // will be set to null on componentDidMount

  getOrCreateHandlerForKey = (key, userOpts) => {
    const opts = {...defaultHandlerOpts, ...userOpts}
    const existing = this.nodeInfoPerKey[key]
    if (existing) {
      existing.opts = opts
      return opts._passInfo ? existing : existing.handler
    }
    const newVal = {
      key,
      node: null,
      handler: node => {
        if (newVal.currentTransition) newVal.currentTransition.clearTimeout()
        newVal.node = node
        if (node) {
          if (process.env.NODE_ENV !== 'production') {
            const cStyle = getComputedStyle(node, null)
            const existingTransition =
              cStyle.getPropertyValue('transition') || 'none'
            if (!existingTransition.match(/^(none|\S+\s+0s\s+\S+\s+0s\b)/)) {
              // eslint-disable-next-line no-console
              console.warn(
                `Found user-defined transition "${existingTransition}" on\b`,
                node,
                '\nThis will be overwritten by react-flip-primitives. Use `registerFlip(key, {transitionProps: ["opacity" , ...]})` instead!',
              )
            }
          }

          if (opts.enterStyle && this.measuredNodes) {
            const orgStyle = {}
            Object.entries(opts.enterStyle).forEach(([prop, val]) => {
              orgStyle[prop] = node.style[prop]
              node.style[prop] = typeof val === 'number' ? `${val}px` : val
            })
            this.measuredNodes[key] = node.getBoundingClientRect()
            Object.entries(orgStyle).forEach(([prop, val]) => {
              node.style[prop] = val
            })
          }
        }
      },
      opts,
      currentTransition: null,
    }
    this.nodeInfoPerKey[key] = newVal
    return opts._passInfo ? newVal : newVal.handler
  }

  setStyle = (key, opts = {}) => {
    return this.getOrCreateHandlerForKey(key, opts)
  }

  // This method doesn't return a snapshot but populates `this.measuredNodes`
  // This is made so that new nodes that enter between `getSnapshotBeforeUpdate`
  // and `componentDidUpdate` can also add their measurements
  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return null
    this.measuredNodes = {}
    const nodeInfos = Object.values(this.nodeInfoPerKey)
    nodeInfos.forEach(({key, node}) => {
      if (node) this.measuredNodes[key] = node.getBoundingClientRect()
    })
    nodeInfos.forEach(nodeInfo => {
      const {node, currentTransition, leaving} = nodeInfo
      if (currentTransition) {
        currentTransition.resetStyles()
      }
      if (leaving) {
        // if we haven't processed the leaving flag yet, set the leaving style
        if (!leaving.beforeLeavingStyles) {
          leaving.beforeLeavingStyles = {}
          Object.entries(leaving.finalStyle).forEach(([prop, val]) => {
            leaving.beforeLeavingStyles[prop] = node.style[prop]
            node.style[prop] = typeof val === 'number' ? `${val}px` : val
          })
        }
        if (leaving.abort) {
          Object.entries(leaving.beforeLeavingStyles).forEach(([prop, val]) => {
            node.style[prop] = val
          })
          nodeInfo.leaving = null
        }
      }
    })
    return null
  }

  performUpdate() {
    if (this.measuredNodes) {
      const newPositions = []
      const {durationMs} = this.props
      Object.values(this.nodeInfoPerKey).forEach(nodeInfo => {
        if (nodeInfo.node && this.measuredNodes[nodeInfo.key]) {
          newPositions.push({
            nodeInfo,
            prevRect: this.measuredNodes[nodeInfo.key],
            currentRect: nodeInfo.node.getBoundingClientRect(),
          })
        }
      })
      const nextFrameActions = newPositions
        .map(p => ({cb: flipNode(p, durationMs), key: p.key}))
        .filter(({cb}) => cb)
      if (nextFrameActions.length) {
        // asking for two animation frames since one frame is sometimes not enough to trigger transitions
        requestAnimationFrame(() =>
          requestAnimationFrame(() => nextFrameActions.forEach(({cb}) => cb())),
        )
      }
    }
    this.measuredNodes = null
  }

  componentDidMount() {
    if (!this.props.noAnimationOnMount) this.performUpdate()
  }

  componentDidUpdate() {
    this.performUpdate()
  }

  render() {
    return this.props.children(this.setStyle)
  }
}

export class OnLeave extends React.Component {
  static propTypes = {
    leaveStyle: PropTypes.object.isRequired,
    registerFlip: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
  }

  lastNode = null

  registerNode = (key, opts) => {
    const {registerFlip} = this.props
    this.info = registerFlip(key, {...opts, _passInfo: true})
    return this.info.handler
  }

  render() {
    const {children, leaveStyle} = this.props
    const currentNode = children(this.registerNode)
    if (this.info && this.lastNode && !currentNode && !this.info.leaving) {
      this.info.leaving = {
        abort: false,
        beforeLeavingStyles: null,
        finalStyle: leaveStyle,
        onDone: () => {
          this.lastNode = null
          this.info.leaving = null
          this.forceUpdate()
        },
      }
    }
    if (this.info && this.info.leaving && currentNode) {
      this.info.leaving.abort = true
    }
    this.lastNode = currentNode || this.lastNode
    return this.lastNode
  }
}
