import React from "react";
import {Set} from "react-powerplug";
import PropTypes from "prop-types";
import {FlipGroup} from "../../src/index";
import styles from "../styles.module.css";
import Text from "./Text";

const ExpandText = ({
  flipKey,
  registerNode: registerOuterNode,
  preview,
  children,
  isActive,
  onClick,
}) => (
  <FlipGroup changeKey={isActive} durationMs={500}>
    {registerInnerNode => (
      <div className={styles.container} ref={registerOuterNode(flipKey, {scaleMode: "none"})}>
        <div>{preview}</div>
        <div
          className={styles.more}
          style={{
            height: isActive ? "auto" : 50,
            opacity: isActive ? 1 : 0.5,
            overflow: "hidden",
          }}
          ref={registerInnerNode(`preview-${flipKey}`, {
            transitionProps: ["opacity"],
          })}
        >
          {children}
        </div>
        <button onClick={onClick} ref={registerInnerNode(`button-${flipKey}`)}>
          {isActive ? "collapse" : "expand"}
        </button>
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

const Simple = () => (
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
              preview={<h2>Some heading</h2>}
            >
              <Text />
            </ExpandText>
            <ExpandText
              isActive={has("text2")}
              onClick={() => (has("text2") ? remove("text2") : add("text2"))}
              flipKey="text2"
              registerNode={registerNode}
              preview={<h2>Some other Heading</h2>}
            >
              <Text />
            </ExpandText>
          </React.Fragment>
        )}
      </FlipGroup>
    )}
  </Set>
);

export default Simple;
