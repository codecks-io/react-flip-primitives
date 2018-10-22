import createKeyframeAnimation from './keyframes'

const cached = {}

const getAnimationNames = (easeName, ratioX, ratioY) => {
  const key = `${easeName.replace(/\s+/g, '')}_${ratioX
    .toFixed(5)
    .replace('.', '_')}x${ratioY.toFixed(5).replace('.', '_')}`
  if (!cached[key]) {
    createKeyframeAnimation(ratioX, ratioY, easeName, key)
    cached[key] = true
  }
  return {name: key, inverseName: `${key}_inv`}
}

export default getAnimationNames
