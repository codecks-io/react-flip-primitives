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
    if (prevRect[dim] !== currentRect[dim]) {
      transforms.push(
        scaleFn(Math.max(prevRect[dim], 1) / Math.max(currentRect[dim], 1)),
      )
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
    .map(
      prop =>
        `${prop} ${durationMs}ms ${timingFunction} ${nodeInfo.opts.delayMs}ms`,
    )
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
        .map(
          ({prop}) =>
            `${prop} ${durationMs}ms ${timingFunction} ${
              nodeInfo.opts.delayMs
            }ms`,
        )
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
          .map(
            prop =>
              `${prop} ${durationMs}ms ${timingFunction} ${
                nodeInfo.opts.delayMs
              }ms`,
          )
          .join(', ')
        transitions.forEach(({resetTo, prop}) => {
          if (resetTo !== undefined) nodeInfo.node.style[prop] = resetTo
        })
      },
    }
  }
}

export default flipNode
