import createBezierEasing from 'bezier-easing'
import addRule from './sheet'

// values taken from https://www.w3.org/TR/css-easing-1/#cubic-bezier-timing-functions
const fnsToBezier = {
  linear: createBezierEasing(0, 0, 1, 1),
  ease: createBezierEasing(0.25, 0.1, 0.25, 1),
  'ease-in': createBezierEasing(0.42, 0, 1, 1),
  'ease-out': createBezierEasing(0, 0, 0.58, 1),
  'ease-in-out': createBezierEasing(0.42, 0, 0.58, 1),
}

const customBezRegexp = /^cubic-bezier\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)$/

const createKeyframeAnimation = (x, y, easeName, name) => {
  let fn = fnsToBezier[easeName]
  if (!fn) {
    const m = easeName.match(customBezRegexp)
    if (m) {
      fn = createBezierEasing(...m.slice(1).map(num => parseFloat(num)))
      fnsToBezier[easeName] = fn
    } else {
      // eslint-disable-next-line no-console
      console.warn(
        `Don't understand ease fn: '${easeName}'. Falling back to linear.`,
      )
      fn = fnsToBezier.linear
    }
  }
  const animationSteps = []

  for (let step = 0; step <= 100; step++) {
    // Remap the step value to an eased one.
    const easedStep = fn(step / 100)
    const xScale = x + (1 - x) * easedStep
    const yScale = y + (1 - y) * easedStep

    animationSteps.push(`${step}% {
      transform: scale(${xScale}, ${yScale});
    }`)
  }

  addRule(`
  @keyframes ${name} {
    ${animationSteps.join('\n')}
  }`)
}

export default createKeyframeAnimation
