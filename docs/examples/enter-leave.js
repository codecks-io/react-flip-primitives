import React from "react";
import {Set} from "react-powerplug";
import PropTypes from "prop-types";
import {OnOff, FlipGroup} from "../../src/index";
import Text from "./Text";

const ExpandText = ({flipKey, registerNode, preview, children, isActive, onClick}) => (
  <FlipGroup changeKey={isActive} durationMs={500}>
    {registerInnerNode => (
      <div ref={registerNode(`outer-container-${flipKey}`, {scaleMode: "immediate"})}>
        <div
          ref={registerNode(`container-${flipKey}`, {
            scaleMode: "non-transform",
            positionMode: "none",
          })}
          style={{
            backgroundColor: "#fafafa",
            boxShadow: "0 0 15px rgba(0,0,0,0.2)",
            marginBottom: 20,
            overflow: "hidden",
          }}
        >
          <div style={{padding: 20}}>
            <div>{preview}</div>
            <div style={{position: "relative"}}>
              <OnOff
                registerNode={registerInnerNode}
                keyAndData={isActive ? {key: flipKey, data: children} : null}
                enterPositionStyle={{height: 1}}
                enterDecorationStyle={{opacity: 0}}
                leaveStyle={{height: 1, opacity: 0}}
              >
                {(key, data, registerEnterLeave) =>
                  key && (
                    <div
                      key={key}
                      ref={registerEnterLeave(key, {
                        positionMode: "none",
                        transitionProps: ["opacity"],
                      })}
                      style={{overflow: "hidden"}}
                    >
                      {data}
                    </div>
                  )
                }
              </OnOff>
            </div>
            <button ref={registerInnerNode(`button`)} onClick={onClick}>
              {isActive ? "collapse" : "expand"}
            </button>
          </div>
        </div>
      </div>
    )}
  </FlipGroup>
);

ExpandText.propTypes = {
  flipKey: PropTypes.any,
  registerNode: PropTypes.any,
  preview: PropTypes.any,
  children: PropTypes.any,
  isActive: PropTypes.any,
  onClick: PropTypes.any,
};

const EnterLeave = () => (
  <Set>
    {({values, add, remove, has}) => (
      <FlipGroup changeKey={values.join("-")} durationMs={500}>
        {registerNode => (
          <React.Fragment>
            <ExpandText
              isActive={has("text1")}
              onClick={() => (has("text1") ? remove("text1") : add("text1"))}
              flipKey="text1"
              registerNode={registerNode}
              preview={<h2>Enter Leave</h2>}
            >
              <Text />
            </ExpandText>
            <ExpandText
              isActive={has("text2")}
              onClick={() => (has("text2") ? remove("text2") : add("text2"))}
              flipKey="text2"
              registerNode={registerNode}
              preview={<h2>Enter Leave 2</h2>}
            >
              <Text />
            </ExpandText>
          </React.Fragment>
        )}
      </FlipGroup>
    )}
  </Set>
);

export default EnterLeave;
