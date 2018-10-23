let _sheetInfo = null;
// {
//   tag,
//   ruleCount: 0
// }

const getSheetInfo = () => {
  if (!_sheetInfo) {
    const tag = document.createElement("style");
    tag.setAttribute("data-flip-primitives", true);
    tag.appendChild(document.createTextNode(""));
    document.head.appendChild(tag);
    _sheetInfo = {
      tag,
      sheet: tag.sheet,
      ruleCount: 0,
    };
  }
  return _sheetInfo;
};

const addRule = rule => {
  const info = getSheetInfo();
  info.sheet.insertRule(rule, info.ruleCount);
  info.ruleCount += 1;
};

export default addRule;
