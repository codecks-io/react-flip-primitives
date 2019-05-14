import React from "react";
import PropTypes from "prop-types";
import flipNode from "./flipNode";
import mergeDiff from "./mergeDiff";
import {styler, kebapCase} from "./styler";
import isPositionProp from "./isPositionProp";
import isUnitlessNumber from "./isUnitlessNumber";

export default class FlipGroup extends React.Component {
  static propTypes = {
    durationMs: PropTypes.number,
    timingFunction: PropTypes.string,
    changeKey: PropTypes.any.isRequired,
    children: PropTypes.func.isRequired,
    leaveStyle: PropTypes.object,
    enterPositionStyle: PropTypes.object,
    enterDecorationStyle: PropTypes.object,
    keysAndData: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        data: PropTypes.any,
      })
    ),
  };

  static getDerivedStateFromProps(props, state) {
    const {keysAndData, leaveStyle} = props;
    const oldKeysAndData = state.keysAndDataToRender;
    const enteringKeys = {};
    const leavingKeys = {};
    const keysAndDataToRender = mergeDiff(
      oldKeysAndData,
      keysAndData,
      (oldKeyIndex, content) => {
        if (!leaveStyle) return null;
        leavingKeys[content.key] = true;
        return content;
      },
      (newKeyIndex, content) => {
        enteringKeys[content.key] = true;
      }
    );
    return {keysAndDataToRender, leavingKeys, enteringKeys};
  }

  constructor(props) {
    super(props);
    this.state = {
      keysAndDataToRender: [],
      enteringKeys: {},
      leavingKeys: {},
    };

    /*
    Structure: {
      key: {
        key, node, handler,
      }
    }
    */
    this.nodeInfoPerKey = {};
    this.cancelPendingFlip = null;
    this.readyForRemovalKeys = new Set();
    this.removalBatchTimeoutId = null;
  }

  defaultHandlerOpts() {
    const {durationMs, timingFunction} = this.props;
    return {
      positionMode: "transform", // none | transform
      scaleMode: "transform", // none | transform | transform-no-children
      setWillChange: false,
      delayMs: 0,
      durationMs: durationMs || 200,
      timingFunction: timingFunction || "ease-in-out",
    };
  }

  getOrCreateHandlerForKey = (key, userOpts) => {
    const opts = {...this.defaultHandlerOpts(), ...userOpts};
    let existing = this.nodeInfoPerKey[key];
    if (existing) {
      existing.opts = opts;
      return existing.handler;
    }
    const newVal = {
      key,
      node: null,
      handler: node => {
        if (node) {
          newVal.node = node;
          styler.setup(newVal);
          this.nodeInfoPerKey[key] = newVal;
        } else {
          delete this.nodeInfoPerKey[key];
        }
      },
      opts,
    };
    return newVal.handler;
  };

  registerNode = (key, opts = {}) => {
    return this.getOrCreateHandlerForKey(key.toString(), opts);
  };

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return null;
    const measuredNodes = {};
    const {leavingKeys} = this.state;
    const nodeInfos = Object.values(this.nodeInfoPerKey);
    nodeInfos.forEach(({key, node}) => {
      if (node) measuredNodes[key] = node.getBoundingClientRect();
    });
    nodeInfos.forEach(nodeInfo => {
      if (!leavingKeys[nodeInfo.key] || !styler.hasStyle(nodeInfo, "leaving")) {
        styler.clearStyles(nodeInfo);
      }
    });
    return measuredNodes;
  }

  styleEntering(measuredNodes, nodes) {
    const {enterStyle} = this.props;
    if (!nodes.length || !enterStyle) return;

    const positionProps = {};
    const otherProps = {};
    const resets = [];

    Object.entries(enterStyle).forEach(([prop, val]) => {
      (isPositionProp[prop] ? positionProps : otherProps)[prop] = val;
    });
    const ppPairs = Object.entries(positionProps);
    if (ppPairs.length > 0) {
      const nodesWithPos = nodes.map(nodeInfo => {
        const {node} = nodeInfo;
        const rect = node.getBoundingClientRect();
        const cStyle = getComputedStyle(node, null);
        const marginTop = parseInt(cStyle.getPropertyValue("margin-top"), 10);
        const marginLeft = parseInt(cStyle.getPropertyValue("margin-left"), 10);
        if (node.offsetLeft < 20) debugger;
        return {
          nodeInfo,
          rect,
          top: node.offsetTop - marginTop,
          left: node.offsetLeft - marginLeft,
        };
      });
      nodesWithPos.forEach(({nodeInfo, rect, top, left}) => {
        // We need to position it absolutely since changing an elements width might put it somewhere else in the flow
        const {node} = nodeInfo;
        const resetStyle = {};
        const posStyles = {
          width: rect.width,
          height: rect.height,
          top,
          left,
          position: "absolute",
          ...positionProps,
        };
        const pairs = Object.entries(posStyles);
        pairs.forEach(([prop, val]) => {
          resetStyle[prop] = node.style[prop];
          node.style[prop] = typeof val === "number" && !isUnitlessNumber[prop] ? `${val}px` : val;
        });
        resets.push(() => {
          pairs.forEach(([prop]) => {
            node.style[prop] = resetStyle[prop];
          });
        });
      });
      nodes.forEach(({key, node}) => (measuredNodes[key] = node.getBoundingClientRect()));
      resets.forEach(reset => reset());
    }

    if (Object.keys(otherProps).length > 0) {
      nodes.forEach(nodeInfo => {
        styler.addStyle(nodeInfo, "enter", otherProps, {removeOnNextFrame: true});
      });
    }
  }

  readyToBeRemoved(key) {
    this.readyForRemovalKeys.add(key);
    if (!this.removalBatchTimeoutId) {
      this.removalBatchTimeoutId = setTimeout(() => {
        this.setState(({keysAndDataToRender}) => ({
          keysAndDataToRender: keysAndDataToRender.filter(
            knd => !this.readyForRemovalKeys.has(knd.key)
          ),
        }));
        this.removalBatchTimeoutId = null;
        this.readyForRemovalKeys.clear();
      }, 50);
    }
  }

  styleLeaving(nodes) {
    const {leaveStyle} = this.props;
    if (!nodes.length) return;
    const newPositions = [];
    const transitionProps = [];
    Object.keys(leaveStyle).forEach(prop => {
      if (!isPositionProp[prop]) transitionProps.push(prop);
    });
    nodes.forEach(nodeInfo => {
      const {delayMs, durationMs, timingFunction} = nodeInfo.opts;
      newPositions.push({
        nodeInfo,
        style: {
          position: "absolute",
          ...leaveStyle,
          transition: transitionProps
            .map(prop => `${kebapCase(prop)} ${durationMs}ms ${timingFunction} ${delayMs}ms`)
            .join(", "),
        },
      });
    });
    newPositions.forEach(({nodeInfo, style}) => {
      styler.addStyle(nodeInfo, "leaving", style, {
        dontReset: true,
        onDone: () => this.readyToBeRemoved(nodeInfo.key),
      });
    });
  }

  performUpdate(measuredNodes) {
    const newPositions = [];
    const {leavingKeys, enteringKeys} = this.state;

    const enteringNodes = [];
    Object.keys(enteringKeys).forEach(key => {
      if (measuredNodes[key]) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(`'${key}' is set as 'isEntering' even though it's measured already!?`);
        }
        return;
      }
      enteringNodes.push(this.nodeInfoPerKey[key]);
    });
    this.styleEntering(measuredNodes, enteringNodes);

    const leavingNodes = [];
    Object.keys(leavingKeys).forEach(key => {
      const nodeInfo = this.nodeInfoPerKey[key];
      if (!styler.hasStyle(nodeInfo, "leaving")) leavingNodes.push(nodeInfo);
    });
    this.styleLeaving(leavingNodes, measuredNodes);

    const nodeInfos = Object.values(this.nodeInfoPerKey);
    const currentRects = {};
    const positionsWithParents = [];
    nodeInfos.forEach(nodeInfo => {
      if (nodeInfo.node && measuredNodes[nodeInfo.key]) {
        const currentRect = nodeInfo.node.getBoundingClientRect();
        currentRects[nodeInfo.key] = currentRect;
        const newPosition = {
          nodeInfo,
          prevRect: measuredNodes[nodeInfo.key],
          currentRect: currentRects[nodeInfo.key],
          parentRects: null,
        };
        newPositions.push(newPosition);
        if (nodeInfo.opts.parentFlipKey) positionsWithParents.push(newPosition);
      }
    });

    positionsWithParents.forEach(position => {
      const {opts, key} = position.nodeInfo;
      const parent = this.nodeInfoPerKey[opts.parentFlipKey];
      if (parent) {
        const prevRect = measuredNodes[parent.key];
        const currentRect = currentRects[parent.key];
        if (prevRect && currentRect) position.parentRects = {prevRect, currentRect};
      } else if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`Couldn't find parentFlipKey: "${opts.parentFlipKey}" required by "${key}"`);
      }
    });

    newPositions.forEach(flipNode);

    const currentValues = Object.values(this.nodeInfoPerKey).map(({node, _styler, opts}) => ({
      node,
      _styler,
      opts,
    }));

    // asking for two animation frames since one frame is sometimes not enough to trigger transitions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        currentValues.forEach(nodeInfo => {
          styler.onNextFrame(nodeInfo);
        });
      });
    });
  }

  componentDidUpdate(prevProps, prevState, measuredNodes) {
    if (prevProps.changeKey === this.props.changeKey) return;
    this.performUpdate(measuredNodes);
  }

  render() {
    return this.props.children(this.registerNode, this.state.keysAndDataToRender);
  }
}
