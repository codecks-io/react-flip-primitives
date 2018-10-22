let _sheet = null
// {
//   tag,
//   ruleCount: 0
// }

const getSheet = () => {
  if (!_sheet) {
    const tag = document.createElement('style')
    tag.setAttribute('data-flip-primitives', true)
    tag.appendChild(document.createTextNode(''))
    document.head.appendChild(tag)
    _sheet = {
      tag,
      ruleCount: 0,
    }
  }
  return _sheet
}

const addRule = rule => {
  const sheet = getSheet()
  sheet.tag.insertRule(rule, sheet.ruleCount)
  sheet.ruleCount += 1
}

export default addRule
