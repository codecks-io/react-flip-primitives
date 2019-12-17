import React from "react";
import FlipGroup from "../src/FlipGroup";

export default {
  title: "Appearing",
};

export const AppearOneTop = () => {
  const [present, setPresent] = React.useState(false);

  return (
    <div>
      <FlipGroup changeKey={present} keysAndData={present ? [{key: "box", data: null}] : []}>
        {(registerNode, keysAndData) => (
          <div style={{background: "yellow", height: 20}}>
            {keysAndData.map(({key}) => (
              <div
                key={key}
                ref={registerNode(key, {enterPosition: {top: -5}, leavePosition: {top: 5}})}
                style={{
                  position: "relative",
                  background: "red",
                  width: 20,
                  height: 20,
                }}
              />
            ))}
          </div>
        )}
      </FlipGroup>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};

export const AppearOneTransform = () => {
  const [present, setPresent] = React.useState(false);

  return (
    <div>
      <FlipGroup changeKey={present} keysAndData={present ? [{key: "box", data: null}] : []}>
        {(registerNode, keysAndData) => (
          <div style={{background: "yellow", height: 20}}>
            {keysAndData.map(({key}) => (
              <div
                key={key}
                ref={registerNode(key, {
                  enterPosition: {transform: "translate(0, -20px)"},
                  leavePosition: {transform: "translate(0, 20px)"},
                })}
                style={{
                  position: "relative",
                  background: "red",
                  width: 20,
                  height: 20,
                }}
              />
            ))}
          </div>
        )}
      </FlipGroup>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};

export const AppearTwo = () => {
  const [present, setPresent] = React.useState(false);

  return (
    <div>
      <FlipGroup changeKey={present} keysAndData={present ? [{key: "box", data: null}] : []}>
        {(registerNode, keysAndData) => (
          <div style={{background: "yellow", height: 20, display: "flex"}}>
            {keysAndData.map(({key}) => (
              <div
                key={key}
                ref={registerNode(key, {
                  enterPosition: {top: -5},
                  leavePosition: {top: 5},
                  onPresence: val => ({opacity: val}),
                })}
                style={{
                  position: "relative",
                  background: "red",
                  width: 20,
                  height: 20,
                }}
              />
            ))}
            <div
              ref={registerNode("box2")}
              style={{
                position: "relative",
                background: "blue",
                width: 20,
                height: 20,
              }}
            />
          </div>
        )}
      </FlipGroup>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};

export const AppearOnlyPresence = () => {
  const [present, setPresent] = React.useState(false);

  return (
    <div>
      <FlipGroup changeKey={present} keysAndData={present ? [{key: "box", data: null}] : []}>
        {(registerNode, keysAndData) => (
          <div style={{background: "yellow", height: 20}}>
            {keysAndData.map(({key}) => (
              <div
                key={key}
                ref={registerNode(key, {onPresence: val => ({opacity: val})})}
                style={{
                  position: "relative",
                  background: "red",
                  width: 20,
                  height: 20,
                }}
              />
            ))}
          </div>
        )}
      </FlipGroup>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};

const case1 = [{key: 1, data: null}];
const case2 = [{key: 2, data: null}];

export const DisappearSampleOne = () => {
  const [present, setPresent] = React.useState(true);

  return (
    <div>
      <FlipGroup changeKey={present} keysAndData={present ? case1 : case2}>
        {(registerNode, keysAndData) => (
          <div style={{background: "yellow", height: 20, display: "flex"}}>
            {keysAndData.map(({key}) => (
              <div
                key={key}
                ref={registerNode(key, {
                  enterPosition: {top: -5},
                  leavePosition: {top: 5},
                  onPresence: val => ({opacity: val}),
                })}
                style={{
                  position: "relative",
                  background: "red",
                  width: 20,
                  height: 20,
                }}
              >
                {key}
              </div>
            ))}
          </div>
        )}
      </FlipGroup>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};
