import React from "react";
import PropTypes from "prop-types";
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
      currentTransition?: {clearTimeout, resetStyles},
      leaving?: {onDone, abortLeaving}
    }
  }
  */
    this.nodeInfoPerKey = {};
    this.cancelPendingFlip = null;
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
    return newVal.handler;
  };

  registerNode = (key, opts = {}) => {
    return this.getOrCreateHandlerForKey(key.toString(), opts);
  };

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return null;
    const measuredNodes = {};
    const nodeInfos = Object.values(this.nodeInfoPerKey);
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
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(`'${key}' is set as 'isEntering' even though it's measured already!?`);
        }
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
    const {leaveStyle} = this.props;
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
          ...leaveStyle,
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
        },
        abortLeaving: () => {
          originalStyle();
          nodeInfo.leaving = null;
        },
      };
    });
  }

  performUpdate(measuredNodes) {
    if (this.cancelPendingFlip) this.cancelPendingFlip();
    const newPositions = [];
    const {durationMs, timingFunction} = this.props;
    const {leavingKeys} = this.state;
    const enteringNodes = [];
    const leavingNodes = [];
    const nodeInfos = Object.values(this.nodeInfoPerKey);
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
    const positionsWithParents = [];
    nodeInfos.forEach(nodeInfo => {
      if (nodeInfo.node && measuredNodes[nodeInfo.key]) {
        const currentRect = nodeInfo.node.getBoundingClientRect();
        currentRects[nodeInfo.key] = currentRect;
        const newPosition = {
          nodeInfo,
          prevRect: measuredNodes[nodeInfo.key],
          currentRect,
          parentRects: null,
        };
        newPositions.push(newPosition);
        if (nodeInfo.opts.parentFlipKey) positionsWithParents.push(newPosition);
      }
    });

    positionsWithParents.forEach(position => {
      const {
        nodeInfo: {opts, key},
      } = position;
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

    const nextFrameActions = newPositions.map(p => ({
      actions: flipNode(p, {durationMs, timingFunction}),
      key: p.nodeInfo.key,
    }));
    if (nextFrameActions.length) {
      // asking for two animation frames since one frame is sometimes not enough to trigger transitions
      let rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          nextFrameActions.forEach(({actions}) => {
            if (actions) actions.performTransition();
          });
          resetEnterStyles();
          this.cancelPendingFlip = null;
        });
      });
      this.cancelPendingFlip = () => {
        cancelAnimationFrame(rafId);
        nextFrameActions.forEach(({actions}) => {
          if (actions) actions.resetStyles();
        });
        resetEnterStyles();
      };
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
