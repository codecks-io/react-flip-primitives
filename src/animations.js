import createKeyframeAnimation from './keyframes'

const cached = {}

const getAnimationName = (easeName, ratioX, ratioY) => {
  const key = `${ratioX}x${ratioY}_${easeName.replace(/\S+/g, '')}`
  const existing = cached[key]
  if (existing) return key
  createKeyframeAnimation(ratioX, ratioY, easeName, key)
  cached[key] = true
  return key
}

export default getAnimationName
