import React from 'react'
import PropTypes from 'prop-types'
import {setStylesAndCreateResetter} from './utils'
import flipNode from './flipNode'

const defaultHandlerOpts = {
  positionMode: 'transform', // none | transform
  scaleMode: 'transform', // none | transform | transform-no-children
  transitionProps: [],
  setWillChange: false,
  delayMs: 0,
}

export default class FlipGroup extends React.Component {
  static propTypes = {
    durationMs: PropTypes.number,
    timingFunction: PropTypes.string,
    changeKey: PropTypes.any.isRequired,
    children: PropTypes.func.isRequired,
  }

  static defaultProps = {
    durationMs: 200,
    timingFunction: 'ease-in-out',
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
        const {durationMs, timingFunction} = this.props
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
          node.style.transition = opts.transitionProps
            .map(
              prop =>
                `${prop} ${durationMs}ms ${timingFunction} ${opts.delayMs}ms`,
            )
            .join(', ')
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
      if (nodeInfo.currentTransition) {
        nodeInfo.currentTransition.clearTimeout()
        nodeInfo.currentTransition = null
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
    if (!nodes.length) return () => {}
    const resetStyles = []
    const newPositions = []
    nodes.forEach(nodeInfo => {
      resetStyles.push(
        setStylesAndCreateResetter(nodeInfo.node, {
          transition: 'none',
        }),
      )
      const {
        decorationStyle,
        positionStyle,
      } = nodeInfo.opts.isEnteringWithStyles
      if (decorationStyle) {
        resetStyles.push(
          setStylesAndCreateResetter(nodeInfo.node, decorationStyle),
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
    return () => resetStyles.forEach(reset => reset())
  }

  styleLeavingAndRemoveFromFlow(nodes, measuredNodes) {
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
    const nodeInfos = Object.values(this.nodeInfoPerKey)
    nodeInfos.forEach(nodeInfo => {
      if (this.isEnteringNode(nodeInfo, measuredNodes)) {
        enteringNodes.push(nodeInfo)
      } else if (this.isLeavingNode(nodeInfo)) {
        leavingNodes.push(nodeInfo)
      }
    })

    this.styleLeavingAndRemoveFromFlow(leavingNodes, measuredNodes)
    const resetEnterStyles = this.styleEntering(measuredNodes, enteringNodes)
    nodeInfos.forEach(nodeInfo => {
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
        requestAnimationFrame(
          () =>
            nextFrameActions.forEach(({resetFlipStyles}) => {
              if (resetFlipStyles) resetFlipStyles()
            }),
          resetEnterStyles(),
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
