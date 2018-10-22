import {
  translateX,
  translateY,
  scaleX,
  scaleY,
  multiply,
  toString,
} from 'rematrix'
import getAnimationNames from './animations'

// 3d transforms were causing weird issues in chrome,
// especially when opacity was also being tweened,
// so convert to a 2d matrix
export const convertMatrix3dArrayTo2dArray = matrix =>
  [0, 1, 4, 5, 12, 13].map(index => matrix[index])

const getTransitions = (
  {nodeInfo, prevRect, currentRect},
  {durationMs, timingFunction},
) => {
  const {opts} = nodeInfo
  const transformsNodes = new Map()
  const addTransform = (node, transform) => {
    let list = transformsNodes.get(node)
    if (!list) {
      list = []
      transformsNodes.set(node, list)
    }
    list.push(transform)
  }
  const animateNodes = new Map()
  const addAnimation = (node, dim, inverse, ratio) => {
    let val = animateNodes.get(node)
    if (!val) {
      val = {width: 1, height: 1, inverse}
      animateNodes.set(node, val)
    }
    val[dim] = ratio
  }
  const dimensions = [
    {dim: 'height', scaleFn: scaleY, translateFn: translateY, attr: 'top'},
    {dim: 'width', scaleFn: scaleX, translateFn: translateX, attr: 'left'},
  ]
  dimensions.forEach(({dim, scaleFn, translateFn, attr}) => {
    if (opts.positionMode !== 'none') {
      if (prevRect[attr] !== currentRect[attr]) {
        addTransform(
          nodeInfo.node,
          translateFn(prevRect[attr] - currentRect[attr]),
        )
      }
    }
    if (prevRect[dim] !== currentRect[dim]) {
      if (opts.scaleMode !== 'none') {
        const ratio = Math.max(prevRect[dim], 1) / Math.max(currentRect[dim], 1)
        if (
          opts.scaleMode === 'transform-no-children' ||
          !nodeInfo.node.children.length
        ) {
          addTransform(nodeInfo.node, scaleFn(ratio))
        } else {
          addAnimation(nodeInfo.node, dim, false, ratio)
          for (const childNode of nodeInfo.node.children) {
            addAnimation(childNode, dim, true, ratio)
          }
        }
      }
    }
  })
  const actions = {
    onReadyForTransition: [],
    onTransitionDone: [],
  }
  const transformTrans = `transform ${durationMs}ms ${timingFunction} ${
    nodeInfo.opts.delayMs
  }ms`
  transformsNodes.forEach((transforms, node) => {
    const orgTransform = node.style.transform
    node.style.transform = toString(transforms.reduce(multiply))
    node.style.transformOrigin = '0px 0px 0px'
    actions.onReadyForTransition.push(() => {
      const orgTransition = node.style.transition
      node.style.transform = orgTransform
      node.style.transition = [orgTransition, transformTrans]
        .filter(Boolean)
        .join(', ')
      actions.onTransitionDone.push(() => {
        node.style.transition = orgTransition
      })
    })
  })

  animateNodes.forEach(({width, height, inverse}, node) => {
    const orgAnimation = node.style.animation
    const {name, inverseName} = getAnimationNames(timingFunction, width, height)
    console.log('name, inverseName', name, inverseName)
    node.style.animation = `${
      inverse ? inverseName : name
    } ${durationMs}ms linear ${nodeInfo.opts.delayMs}ms`
    node.style.transformOrigin = '0px 0px 0px'
    actions.onTransitionDone.push(() => {
      node.style.animation = orgAnimation
    })
  })

  return actions
}

const flipNode = (
  {nodeInfo, prevRect, currentRect},
  {durationMs, timingFunction},
) => {
  const actions = getTransitions(
    {nodeInfo, prevRect, currentRect},
    {durationMs, timingFunction},
  )

  return () => {
    actions.onReadyForTransition.forEach(reset => reset())
    const timeoutId = setTimeout(() => {
      actions.onTransitionDone.forEach(reset => reset())
      if (nodeInfo.leaving) {
        nodeInfo.leaving.onDone()
      }
      nodeInfo.currentTransition = null
    }, durationMs + nodeInfo.opts.delayMs)

    nodeInfo.currentTransition = {
      clearTimeout: () => {
        actions.onTransitionDone.forEach(reset => reset())
        clearTimeout(timeoutId)
      },
    }
  }
}

export default flipNode