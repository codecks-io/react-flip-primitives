import React from "react";
import PropTypes from "prop-types";
import toposort from "toposort";
import {setStylesAndCreateResetter} from "./utils";
import flipNode from "./flipNode";
import mergeDiff from "./mergeDiff";

const defaultHandlerOpts = {
  positionMode: "transform", // none | transform
  scaleMode: "transform", // none | transform | transform-no-children
  transitionProps: [],
  setWillChange: false,
  delayMs: 0,
};

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

  static defaultProps = {
    durationMs: 200,
    timingFunction: "ease-in-out",
  };

  static getDerivedStateFromProps(props, state) {
    const {keysAndData, leaveStyle, enterPositionStyle, enterDecorationStyle} = props;
    const oldKeysAndData = state.keysAndDataToRender;
    const enteringKeys = {};
    const leavingKeys = {};
    const keysAndDataToRender = mergeDiff(
      oldKeysAndData,
      keysAndData,
      (oldKeyIndex, content) => {
        if (!props.leaveStyle) return null;
        leavingKeys[content.key] = leaveStyle;
        return content;
      },
      (newKeyIndex, content) => {
        enteringKeys[content.key] = {
          positionStyle: enterPositionStyle,
          decorationStyle: enterDecorationStyle,
        };
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
      currentTransition?: {clearTimeout, resetStyles},
      leaving?: {onDone, abortLeaving}
    }
  }
  */
    this.nodeInfoPerKey = {};
    this.orderedNodes = [];
    this.needTopoSort = false;
  }

  getOrCreateHandlerForKey = (key, userOpts) => {
    const opts = {...defaultHandlerOpts, ...userOpts};
    const existing = this.nodeInfoPerKey[key];
    if (existing) {
      existing.opts = opts;
      return existing.handler;
    }
    const newVal = {
      key,
      node: null,
      handler: node => {
        const {durationMs, timingFunction} = this.props;
        if (newVal.currentTransition) newVal.currentTransition.clearTimeout();
        newVal.node = node;
        if (node) {
          if (opts.parentFlipKey) this.needTopoSort = true;
          if (process.env.NODE_ENV !== "production") {
            const cStyle = getComputedStyle(node, null);
            const existingTransition = cStyle.getPropertyValue("transition") || "none";
            if (!existingTransition.match(/^(none|\S+\s+0s\s+\S+\s+0s\b)/)) {
              // eslint-disable-next-line no-console
              console.warn(
                `Found user-defined transition "${existingTransition}" on\b`,
                node,
                '\nThis will be overwritten by react-flip-primitives. Use `registerNode(key, {transitionProps: ["opacity" , ...]})` instead!'
              );
            }
          }
          node.style.transition = opts.transitionProps
            .map(prop => `${prop} ${durationMs}ms ${timingFunction} ${opts.delayMs}ms`)
            .join(", ");
        }
      },
      opts,
      currentTransition: null,
    };
    this.nodeInfoPerKey[key] = newVal;
    this.orderedNodes.push(newVal);
    return newVal.handler;
  };

  registerNode = (key, opts = {}) => {
    return this.getOrCreateHandlerForKey(key, opts);
  };

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return null;
    const measuredNodes = {};
    if (this.needTopoSort) {
      const edges = [];
      this.orderedNodes.forEach(nodeInfo => {
        const {key, opts} = nodeInfo;
        if (opts.parentFlipKey) {
          const parent = this.nodeInfoPerKey[opts.parentFlipKey];
          if (parent) {
            edges.push([parent, nodeInfo]);
          } else if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.warn(
              `Couldn't find parentFlipKey: "${opts.parentFlipKey}" required by "${key}"`
            );
          }
        }
      });
      this.orderedNodes = toposort.array(this.orderedNodes, edges);
      this.needTopoSort = false;
    }
    const nodeInfos = this.orderedNodes;
    nodeInfos.forEach(({key, node}) => {
      if (node) measuredNodes[key] = node.getBoundingClientRect();
    });
    nodeInfos.forEach(nodeInfo => {
      if (nodeInfo.currentTransition) {
        nodeInfo.currentTransition.clearTimeout();
        nodeInfo.currentTransition = null;
      }
    });
    return measuredNodes;
  }

  isEnteringNode(key, measuredNodes) {
    const {enteringKeys} = this.state;
    if (enteringKeys[key]) {
      if (measuredNodes[key]) {
        // eslint-disable-next-line no-console
        console.warn(`'${key}' is set as 'isEntering' even though it's measured already!?`);
        return false;
      }
      return true;
    }
    return false;
  }

  styleEntering(measuredNodes, nodes) {
    if (!nodes.length) return () => {};
    const resetStyles = [];
    const newPositions = [];
    nodes.forEach(nodeInfo => {
      resetStyles.push(
        setStylesAndCreateResetter(nodeInfo.node, {
          transition: "none",
        })
      );
      const {enterDecorationStyle, enterPositionStyle} = this.props;
      if (enterDecorationStyle) {
        resetStyles.push(setStylesAndCreateResetter(nodeInfo.node, enterDecorationStyle));
      }
      if (enterPositionStyle) {
        const rect = nodeInfo.node.getBoundingClientRect();
        const cStyle = getComputedStyle(nodeInfo.node, null);
        const marginTop = parseInt(cStyle.getPropertyValue("margin-top"), 10);
        const marginLeft = parseInt(cStyle.getPropertyValue("margin-left"), 10);
        newPositions.push({
          nodeInfo,
          style: {
            width: rect.width,
            height: rect.height,
            ...enterPositionStyle,
            top: nodeInfo.node.offsetTop - marginTop,
            left: nodeInfo.node.offsetLeft - marginLeft,
            position: "absolute",
          },
        });
      }
    });
    const resetPositions = newPositions.map(({nodeInfo, style}) => {
      return setStylesAndCreateResetter(nodeInfo.node, style);
    });
    nodes.forEach(({key, node}) => {
      measuredNodes[key] = node.getBoundingClientRect();
    });
    resetPositions.forEach(reset => reset());
    return () => resetStyles.forEach(reset => reset());
  }

  styleLeavingAndRemoveFromFlow(nodes, measuredNodes) {
    if (!nodes.length) return;
    const newPositions = [];
    nodes.forEach(nodeInfo => {
      const rect = measuredNodes[nodeInfo.key];
      const cStyle = getComputedStyle(nodeInfo.node, null);
      const marginTop = parseInt(cStyle.getPropertyValue("margin-top"), 10);
      const marginLeft = parseInt(cStyle.getPropertyValue("margin-left"), 10);
      newPositions.push({
        nodeInfo,
        style: {
          width: rect.width,
          height: rect.height,
          ...this.props.leaveStyle,
          top: nodeInfo.node.offsetTop - marginTop,
          left: nodeInfo.node.offsetLeft - marginLeft,
          position: "absolute",
        },
      });
    });
    newPositions.forEach(({nodeInfo, style}) => {
      const originalStyle = setStylesAndCreateResetter(nodeInfo.node, style);

      nodeInfo.leaving = {
        onDone: () => {
          this.setState(({keysAndDataToRender}) => ({
            keysAndDataToRender: keysAndDataToRender.filter(knd => knd.key !== nodeInfo.key),
          }));
          nodeInfo.leaving = null;
          delete this.nodeInfoPerKey[nodeInfo.key];
          this.orderedNodes.splice(this.orderedNodes.indexOf(nodeInfo), 1);
        },
        abortLeaving: () => {
          originalStyle();
          nodeInfo.leaving = null;
        },
      };
    });
  }

  performUpdate(measuredNodes) {
    const newPositions = [];
    const {durationMs, timingFunction} = this.props;
    const {leavingKeys} = this.state;
    const enteringNodes = [];
    const leavingNodes = [];
    const nodeInfos = this.orderedNodes;
    nodeInfos.forEach(nodeInfo => {
      if (this.isEnteringNode(nodeInfo.key, measuredNodes)) {
        enteringNodes.push(nodeInfo);
      } else if (leavingKeys[nodeInfo.key]) {
        leavingNodes.push(nodeInfo);
      } else if (nodeInfo.leaving) {
        nodeInfo.leaving.abortLeaving();
      }
    });

    this.styleLeavingAndRemoveFromFlow(leavingNodes, measuredNodes);
    const resetEnterStyles = this.styleEntering(measuredNodes, enteringNodes);
    const currentRects = {};
    nodeInfos.forEach(nodeInfo => {
      if (nodeInfo.node && measuredNodes[nodeInfo.key]) {
        const parent =
          nodeInfo.opts.parentFlipKey && this.nodeInfoPerKey[nodeInfo.opts.parentFlipKey];
        const currentRect = nodeInfo.node.getBoundingClientRect();
        currentRects[nodeInfo.key] = currentRect;
        newPositions.push({
          nodeInfo,
          prevRect: measuredNodes[nodeInfo.key],
          currentRect,
          parentRects: parent && {
            prevRect: measuredNodes[parent.key],
            currentRect: currentRects[parent.key],
          },
        });
      }
    });

    const nextFrameActions = newPositions.map(p => ({
      resetFlipStyles: flipNode(p, {durationMs, timingFunction}),
      key: p.nodeInfo.key,
    }));
    if (nextFrameActions.length) {
      // asking for two animation frames since one frame is sometimes not enough to trigger transitions
      requestAnimationFrame(() =>
        requestAnimationFrame(
          () =>
            nextFrameActions.forEach(({resetFlipStyles}) => {
              if (resetFlipStyles) resetFlipStyles();
            }),
          resetEnterStyles()
        )
      );
    }
  }

  componentDidMount() {
    // this.performUpdate({})
  }

  componentDidUpdate(prevProps, prevState, measuredNodes) {
    if (prevProps.changeKey === this.props.changeKey) return;
    this.performUpdate(measuredNodes);
  }

  render() {
    return this.props.children(this.registerNode, this.state.keysAndDataToRender);
  }
}
