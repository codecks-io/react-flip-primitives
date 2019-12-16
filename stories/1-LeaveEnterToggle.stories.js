import React from "react";
import FlipGroup from "../src/useFlipGroup";

export const Component = () => {
  const [on, setOn] = React.useState();
  return (
    <FlipGroup
      changeKey={on ? "on" : "off"}
      keysAndData={on ? [{key: "1", data: 1}] : []}
      enterStyle={{width: 5, opacity: 0.5}}
      leaveStyle={{opacity: 0.3, width: 1}}
    >
      {(registerNode, keysAndData) => (
        <React.Fragment>
          <div>
            <button onClick={() => setOn(!on)}>toggle</button>
          </div>
          {keysAndData.map(({key, data: number}) => (
            <div
              key={key}
              style={{width: 100, height: 50, backgroundColor: `tomato`}}
              ref={registerNode(key, {durationMs: 2500})}
            />
          ))}
        </React.Fragment>
      )}
    </FlipGroup>
  );
};

export default {
  title: "LeaveEnter Toggle",
  component: FlipGroup,
};
