import React from "react";
import FlipGroupV2 from "../src/FlipGroupV2";

export default {
  title: "Appearing",
};

export const AppearOneTop = () => {
  const [present, setPresent] = React.useState(false);

  return (
    <div>
      <FlipGroupV2 changeKey={present} keysAndData={present ? [{key: "box", data: null}] : []}>
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
      </FlipGroupV2>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};

export const AppearOneTransform = () => {
  const [present, setPresent] = React.useState(false);

  return (
    <div>
      <FlipGroupV2 changeKey={present} keysAndData={present ? [{key: "box", data: null}] : []}>
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
      </FlipGroupV2>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};

export const AppearTwo = () => {
  const [present, setPresent] = React.useState(false);

  return (
    <div>
      <FlipGroupV2 changeKey={present} keysAndData={present ? [{key: "box", data: null}] : []}>
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
      </FlipGroupV2>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};

export const AppearOnlyPresence = () => {
  const [present, setPresent] = React.useState(false);

  return (
    <div>
      <FlipGroupV2 changeKey={present} keysAndData={present ? [{key: "box", data: null}] : []}>
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
      </FlipGroupV2>
      <button onClick={() => setPresent(!present)}>toggle</button>
    </div>
  );
};
