import isUnitlessNumber from "./isUnitlessNumber";

export const kebapCase = string => string.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

export const styler = {
  setup(nodeInfo) {
    nodeInfo._styler = {
      originalStyle: {},
      dontResetProps: {},
      activeStyleNames: new Set(),
      onDones: [],
      transitionDoneTimeoutId: null,
    };
  },
  addStyle(nodeInfo, styleName, style, {onDone, dontReset} = {}) {
    const {node, _styler} = nodeInfo;
    const {originalStyle, activeStyleNames, onDones, dontResetProps} = _styler;
    Object.entries(style).forEach(([prop, val]) => {
      originalStyle[prop] = originalStyle[prop] || node.style[prop];
      if (dontReset) dontResetProps[prop] = true;
      node.style[prop] = typeof val === "number" && !isUnitlessNumber[prop] ? `${val}px` : val;
    });
    activeStyleNames.add(styleName);
    if (onDone) onDones.push(onDone);
  },
  clearStyles(nodeInfo) {
    const {node, _styler} = nodeInfo;
    const {originalStyle, activeStyleNames, transitionDoneTimeoutId} = _styler;
    Object.entries(originalStyle).forEach(([prop, val]) => {
      node.style[prop] = val;
    });
    activeStyleNames.clear();
    _styler.originalStyle = {};
    _styler.onDones = [];
    _styler.dontResetProps = {};
    if (transitionDoneTimeoutId) {
      clearTimeout(transitionDoneTimeoutId);
      _styler.transitionDoneTimeoutId = null;
    }
  },
  hasStyle(nodeInfo, styleName) {
    return nodeInfo._styler.activeStyleNames.has(styleName);
  },
  onNextFrame({node, _styler, opts}) {
    const {delayMs, durationMs, timingFunction} = opts;
    const {originalStyle, activeStyleNames, onDones, dontResetProps} = _styler;
    if (activeStyleNames.size === 0) return;
    if (activeStyleNames.has("transition")) return;
    const props = [];
    Object.entries(originalStyle).forEach(([prop, val]) => {
      if (prop !== "transformOrigin" && !dontResetProps[prop]) {
        node.style[prop] = val;
        props.push(prop);
        delete originalStyle[prop];
      }
    });
    activeStyleNames.clear();

    activeStyleNames.add("transition");
    const transitions = props.map(
      prop => `${kebapCase(prop)} ${durationMs}ms ${timingFunction} ${delayMs}ms`
    );
    originalStyle.transition = node.style.transition;
    node.style.transition = [originalStyle.transition, ...transitions].filter(Boolean).join(", ");
    if (Object.keys(dontResetProps).length === 0) {
      onDones.push(() => {
        styler.clearStyles({node, _styler});
      });
    }
    _styler.transitionDoneTimeoutId = setTimeout(() => {
      onDones.forEach(cb => cb());
    }, durationMs + delayMs);
  },
};
