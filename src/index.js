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
import mergeDiff from './mergeDiff'
import {setStylesAndCreateResetter} from './utils'

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

const flipNode = (
  {nodeInfo, prevRect, currentRect},
  {durationMs, timingFunction},
) => {
  const transitions = getTransitions({nodeInfo, prevRect, currentRect})
  const trueTransitions = transitions.filter(({flipEndVal}) => flipEndVal)

  if (nodeInfo.currentTransition) {
    nodeInfo.currentTransition.clearTimeout()
  }
  if (nodeInfo.opts.setWillChange && trueTransitions.length) {
    nodeInfo.node.style.willChange = transitions.map(({prop}) => prop).join(',')
  }
  nodeInfo.node.style.transition = nodeInfo.opts.transitionProps
    .map(prop => `${prop} ${durationMs}ms ${timingFunction}`)
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
        .map(({prop}) => `${prop} ${durationMs}ms ${timingFunction}`)
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
          .map(prop => `${prop} ${durationMs}ms ${timingFunction}`)
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
  transitionProps: [],
  setWillChange: false,
}

export default class ReactFlip extends React.Component {
  static propTypes = {
    durationMs: PropTypes.number,
    timingFunction: PropTypes.string,
    changeKey: PropTypes.any.isRequired,
    children: PropTypes.func.isRequired,
  }

  static defaultProps = {
    durationMs: 200,
    timingFunction: 'ease',
  }

  /*
  Structure: {
    key: {
      key, node, handler,
      currentTransition?: {clearTimeout, resetStyles},
      leaving?: {onDone, abortLeaving}
    }
  }
  */
  nodeInfoPerKey = {}

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
            node.style.transition = 'none'
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

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return null
    const measuredNodes = {}
    const nodeInfos = Object.values(this.nodeInfoPerKey)
    nodeInfos.forEach(({key, node}) => {
      if (node) measuredNodes[key] = node.getBoundingClientRect()
    })
    nodeInfos.forEach(nodeInfo => {
      if (nodeInfo.currentTransition && nodeInfo.node) {
        nodeInfo.currentTransition.resetStyles()
      }
    })
    return measuredNodes
  }

  isEnteringNode(nodeInfo, measuredNodes) {
    if (nodeInfo.opts.isEnteringWithStyles) {
      if (measuredNodes[nodeInfo.key]) {
        // eslint-disable-next-line no-console
        console.warn(
          `'${
            nodeInfo.key
          }' is set as 'isEntering' even though it's measured already!?`,
        )
        return false
      }
      return true
    }
    return false
  }

  isLeavingNode(nodeInfo) {
    if (nodeInfo.opts.isLeaving) {
      return true
    } else {
      if (nodeInfo.leaving) {
        nodeInfo.leaving.abortLeaving()
      }
      return false
    }
  }

  styleEntering(measuredNodes, nodes) {
    if (!nodes.length) return {}
    const resetDecoStyle = {}
    const resetPosStyles = {}
    nodes.forEach(({node, opts, key}) => {
      const {positionStyle, decorationStyle} = opts.isEnteringWithStyles
      if (positionStyle) {
        resetPosStyles[key] = setStylesAndCreateResetter(node, positionStyle)
      }
      if (decorationStyle) {
        resetDecoStyle[key] = setStylesAndCreateResetter(node, decorationStyle)
      }
    })
    nodes.forEach(({node, key}) => {
      measuredNodes[key] = node.getBoundingClientRect()
    })
    Object.values(resetPosStyles).forEach(resetFn => resetFn())
    return resetDecoStyle
  }

  styleLeavingAndRemoveFromFlow(nodes, measuredNodes) {
    if (!nodes.length) return
    nodes.forEach(nodeInfo => {
      const rect = measuredNodes[nodeInfo.key]
      const cStyle = getComputedStyle(nodeInfo.node, null)
      const marginTop = parseInt(cStyle.getPropertyValue('margin-top'), 10)
      const marginLeft = parseInt(cStyle.getPropertyValue('margin-left'), 10)
      const originalStyle = setStylesAndCreateResetter(nodeInfo.node, {
        width: rect.width,
        height: rect.height,
        ...nodeInfo.opts.isLeaving.finalStyle,
        top: rect.top - marginTop,
        left: rect.left - marginLeft,
        position: 'absolute',
      })

      nodeInfo.leaving = {
        onDone: () => {
          nodeInfo.opts.isLeaving.onDone()
          nodeInfo.leaving = null
          delete this.nodeInfoPerKey[nodeInfo.key]
        },
        abortLeaving: () => {
          originalStyle()
          nodeInfo.leaving = null
        },
      }
    })
  }

  performUpdate(measuredNodes) {
    const newPositions = []
    const {durationMs, timingFunction} = this.props
    const enteringNodes = []
    const leavingNodes = []
    const stayingNodes = []
    Object.values(this.nodeInfoPerKey).forEach(nodeInfo => {
      if (this.isEnteringNode(nodeInfo, measuredNodes)) {
        enteringNodes.push(nodeInfo)
      } else if (this.isLeavingNode(nodeInfo)) {
        leavingNodes.push(nodeInfo)
      } else {
        stayingNodes.push(nodeInfo)
      }
    })
    this.styleLeavingAndRemoveFromFlow(leavingNodes, measuredNodes)
    const measureNode = nodeInfo => {
      if (nodeInfo.node && measuredNodes[nodeInfo.key]) {
        newPositions.push({
          nodeInfo,
          prevRect: measuredNodes[nodeInfo.key],
          currentRect: nodeInfo.node.getBoundingClientRect(),
        })
      }
    }
    const resetEnterDecorationByKey = this.styleEntering(
      measuredNodes,
      enteringNodes,
    )
    ;[...enteringNodes, ...stayingNodes, ...leavingNodes].forEach(measureNode)

    const nextFrameActions = newPositions.map(p => ({
      resetFlipStyles: flipNode(p, {durationMs, timingFunction}),
      key: p.nodeInfo.key,
    }))
    if (nextFrameActions.length) {
      // asking for two animation frames since one frame is sometimes not enough to trigger transitions
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          nextFrameActions.forEach(({resetFlipStyles, key}) => {
            if (resetFlipStyles) resetFlipStyles()
            if (resetEnterDecorationByKey[key]) {
              resetEnterDecorationByKey[key]()
            }
          }),
        ),
      )
    }
  }

  componentDidMount() {
    // this.performUpdate({})
  }

  componentDidUpdate(prevProps, prevState, measuredNodes) {
    if (prevProps.changeKey === this.props.changeKey) return
    this.performUpdate(measuredNodes)
  }

  render() {
    return this.props.children(this.setStyle)
  }
}

export class LeaveEnter extends React.Component {
  static propTypes = {
    keysAndData: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        data: PropTypes.any,
      }),
    ).isRequired,
    registerFlip: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
    leaveStyle: PropTypes.object,
    enterPositionStyle: PropTypes.object,
    enterDecorationStyle: PropTypes.object,
  }

  static getDerivedStateFromProps(props, state) {
    const {
      keysAndData,
      leaveStyle,
      enterPositionStyle,
      enterDecorationStyle,
    } = props
    const oldKeysAndData = state.keysAndDataToRender
    const enteringKeys = {}
    const leavingKeys = {}
    const keysAndDataToRender = mergeDiff(
      oldKeysAndData,
      keysAndData,
      (oldKeyIndex, content) => {
        if (!props.leaveStyle) return null
        leavingKeys[content.key] = leaveStyle
        return content
      },
      (newKeyIndex, content) => {
        enteringKeys[content.key] = {
          positionStyle: enterPositionStyle,
          decorationStyle: enterDecorationStyle,
        }
      },
    )
    return {keysAndDataToRender, leavingKeys, enteringKeys}
  }

  constructor(props) {
    super(props)
    this.state = {
      keysAndDataToRender: [],
      enteringKeys: {},
      leavingKeys: {},
    }
    this.nodeInfoPerKey = {}
  }

  registerNode = (key, opts) => {
    const {registerFlip} = this.props
    const {enteringKeys, leavingKeys} = this.state
    const passedOpts = {
      ...opts,
      _passInfo: true,
      isEnteringWithStyles: enteringKeys[key],
      isLeaving: leavingKeys[key] && {
        finalStyle: leavingKeys[key],
        onDone: () =>
          this.setState(({keysAndDataToRender}) => ({
            keysAndDataToRender: keysAndDataToRender.filter(
              knd => knd.key !== key,
            ),
          })),
      },
    }
    const nodeInfo = registerFlip(key, passedOpts)
    this.nodeInfoPerKey[key] = nodeInfo
    return nodeInfo.handler
  }
  render() {
    const {keysAndDataToRender} = this.state
    const {children} = this.props
    return children(keysAndDataToRender, this.registerNode)
  }
}
