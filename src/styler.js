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
  onNextFrame(nodeInfo) {
    const {node, _styler, opts} = nodeInfo;
    const {delayMs, durationMs, timingFunction} = opts;
    const {originalStyle, activeStyleNames, onDones, dontResetProps} = _styler;
    if (activeStyleNames.size === 0) return;
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
    onDones.push(() => styler.clearStyles(nodeInfo));
    _styler.transitionDoneTimeoutId = setTimeout(() => {
      onDones.forEach(cb => cb());
    }, durationMs + delayMs);
  },
};

// // ENTERING

// styler.add("simulate-final", {transition: null});
// // measure node
// styler.remove("simulate-final");
// styler.add(
//   "enter",
//   {transition: "opacity", opacity: 0, scale: 0.5, marginLeft: -10},
//   {killNextFrame: true}
// );
// styler.add("start-flip", {transform: "matrix()"});

// // wait req frame

// styler.remove("start-flip");
// styler.remove("enter");
// styler.add("flip-transition", {transition: "transform"});

// // wait till trans over

// styler.remove("flip-transition");

// // LEAVING

// // measure node
// styler.add("leaving", {position: "absolute", top: 100, left: 200, ...leaveStyle});
// styler.add("start-flip", {transform: "matrix()"});

// // wait req frame

// styler.remove("start-flip");
// styler.add("flip-transition", {transition: "transform"});

// // wait till trans over

// // delete keyInfo
