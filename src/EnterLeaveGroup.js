import React from "react";
import PropTypes from "prop-types";
import mergeDiff from "./mergeDiff";

export default class EnterLeaveGroup extends React.Component {
  static propTypes = {
    keysAndData: PropTypes.arrayOf(
      PropTypes.shape({
        key: PropTypes.string.isRequired,
        data: PropTypes.any,
      })
    ).isRequired,
    registerNode: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
    leaveStyle: PropTypes.object,
    enterPositionStyle: PropTypes.object,
    enterDecorationStyle: PropTypes.object,
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
    this.nodeInfoPerKey = {};
  }

  registerNode = (key, opts) => {
    const {registerNode} = this.props;
    const {enteringKeys, leavingKeys} = this.state;
    const passedOpts = {
      ...opts,
      _passInfo: true,
      isEnteringWithStyles: enteringKeys[key],
      isLeaving: leavingKeys[key] && {
        finalStyle: leavingKeys[key],
        onDone: () =>
          this.setState(({keysAndDataToRender}) => ({
            keysAndDataToRender: keysAndDataToRender.filter(knd => knd.key !== key),
          })),
      },
    };
    const nodeInfo = registerNode(key, passedOpts);
    this.nodeInfoPerKey[key] = nodeInfo;
    return nodeInfo.handler;
  };
  render() {
    const {keysAndDataToRender} = this.state;
    const {children} = this.props;
    return children(keysAndDataToRender, this.registerNode);
  }
}
