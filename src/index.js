import React from 'react'
import PropTypes from 'prop-types'
import mergeDiff from './mergeDiff'
import {setStylesAndCreateResetter} from './utils'
import flipNode from './flipNode'

const defaultHandlerOpts = {
  positionMode: 'transform',
  scaleMode: 'transform',
  transitionProps: [],
  setWillChange: false,
  delayMs: 0,
}

export class FlipGroup extends React.Component {
  static propTypes = {
    durationMs: PropTypes.number,
    timingFunction: PropTypes.string,
    changeKey: PropTypes.any.isRequired,
    children: PropTypes.func.isRequired,
  }

  static defaultProps = {
    durationMs: 200,
    timingFunction: 'linear',
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
                '\nThis will be overwritten by react-flip-primitives. Use `registerNode(key, {transitionProps: ["opacity" , ...]})` instead!',
              )
            }
          }
          node.style.transition = 'none'
        }
      },
      opts,
      currentTransition: null,
    }
    this.nodeInfoPerKey[key] = newVal
    return opts._passInfo ? newVal : newVal.handler
  }

  registerNode = (key, opts = {}) => {
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
    const newPositions = []
    nodes.forEach(nodeInfo => {
      const {
        decorationStyle,
        positionStyle,
      } = nodeInfo.opts.isEnteringWithStyles
      if (decorationStyle) {
        resetDecoStyle[nodeInfo.key] = setStylesAndCreateResetter(
          nodeInfo.node,
          decorationStyle,
        )
      }
      if (positionStyle) {
        const rect = nodeInfo.node.getBoundingClientRect()
        const cStyle = getComputedStyle(nodeInfo.node, null)
        const marginTop = parseInt(cStyle.getPropertyValue('margin-top'), 10)
        const marginLeft = parseInt(cStyle.getPropertyValue('margin-left'), 10)
        newPositions.push({
          nodeInfo,
          style: {
            width: rect.width,
            height: rect.height,
            ...positionStyle,
            top: nodeInfo.node.offsetTop - marginTop,
            left: nodeInfo.node.offsetLeft - marginLeft,
            position: 'absolute',
          },
        })
      }
    })
    const resetPositions = newPositions.map(({nodeInfo, style}) => {
      return setStylesAndCreateResetter(nodeInfo.node, style)
    })
    nodes.forEach(({key, node}) => {
      measuredNodes[key] = node.getBoundingClientRect()
    })
    resetPositions.forEach(reset => reset())
    return resetDecoStyle
  }

  styleLeavingAndRemoveFromFlow(nodes, measuredNodes) {
    const {durationMs, timingFunction} = this.props
    if (!nodes.length) return
    const newPositions = []
    nodes.forEach(nodeInfo => {
      const rect = measuredNodes[nodeInfo.key]
      const cStyle = getComputedStyle(nodeInfo.node, null)
      const marginTop = parseInt(cStyle.getPropertyValue('margin-top'), 10)
      const marginLeft = parseInt(cStyle.getPropertyValue('margin-left'), 10)
      newPositions.push({
        nodeInfo,
        style: {
          width: rect.width,
          height: rect.height,
          ...nodeInfo.opts.isLeaving.finalStyle,
          top: nodeInfo.node.offsetTop - marginTop,
          left: nodeInfo.node.offsetLeft - marginLeft,
          position: 'absolute',
          transition: nodeInfo.opts.transitionProps
            .map(prop => `${prop} ${durationMs}ms ${timingFunction}`)
            .join(', '),
        },
      })
    })
    newPositions.forEach(({nodeInfo, style}) => {
      const originalStyle = setStylesAndCreateResetter(nodeInfo.node, style)

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
    const resetEnterDecorationByKey = this.styleEntering(
      measuredNodes,
      enteringNodes,
    )
    ;[...enteringNodes, ...stayingNodes, ...leavingNodes].forEach(nodeInfo => {
      if (nodeInfo.node && measuredNodes[nodeInfo.key]) {
        newPositions.push({
          nodeInfo,
          prevRect: measuredNodes[nodeInfo.key],
          currentRect: nodeInfo.node.getBoundingClientRect(),
        })
      }
    })

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
    return this.props.children(this.registerNode)
  }
}

export class EnterLeaveGroup extends React.Component {
  static propTypes = {
    keysAndData: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        data: PropTypes.any,
      }),
    ).isRequired,
    registerNode: PropTypes.func.isRequired,
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
    const {registerNode} = this.props
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
    const nodeInfo = registerNode(key, passedOpts)
    this.nodeInfoPerKey[key] = nodeInfo
    return nodeInfo.handler
  }
  render() {
    const {keysAndDataToRender} = this.state
    const {children} = this.props
    return children(keysAndDataToRender, this.registerNode)
  }
}
