import React from "react";
import PropTypes from "prop-types";
import EnterLeaveGroup from "./EnterLeaveGroup";

export default class OnOff extends React.Component {
  static propTypes = {
    keyAndData: PropTypes.shape({
      key: PropTypes.string.isRequired,
      data: PropTypes.any,
    }),
    registerNode: PropTypes.func.isRequired,
    children: PropTypes.func.isRequired,
    leaveStyle: PropTypes.object,
    enterPositionStyle: PropTypes.object,
    enterDecorationStyle: PropTypes.object,
  };

  render() {
    const {
      children,
      keyAndData,
      registerNode,
      enterPositionStyle,
      enterDecorationStyle,
      leaveStyle,
    } = this.props;
    return (
      <EnterLeaveGroup
        registerNode={registerNode}
        keysAndData={keyAndData ? [keyAndData] : []}
        enterPositionStyle={enterPositionStyle}
        enterDecorationStyle={enterDecorationStyle}
        leaveStyle={leaveStyle}
      >
        {(keysAndData, registerEnterLeave) =>
          keysAndData.length
            ? children(keysAndData[0].key, keysAndData[0].data, registerEnterLeave)
            : children(null, null, registerEnterLeave)
        }
      </EnterLeaveGroup>
    );
  }
}
