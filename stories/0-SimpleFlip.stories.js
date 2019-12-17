import React from "react";
import FlipGroupV2 from "../src/FlipGroupV2";

export default {
  title: "SimpleFlip",
};

export const SimpleX = () => {
  const [pos, setPos] = React.useState(25);

  return (
    <div>
      <FlipGroupV2 changeKey={pos}>
        {registerNode => (
          <div style={{background: "yellow", position: "relative", height: 5}}>
            <div
              ref={registerNode("box")}
              style={{
                position: "absolute",
                background: "red",
                width: 5,
                height: "100%",
                top: 0,
                left: `${pos}%`,
              }}
            />
          </div>
        )}
      </FlipGroupV2>
      <button onClick={() => setPos(Math.round(Math.random() * 100))}>{pos}%</button>
    </div>
  );
};

export const SimpleY = () => {
  const [pos, setPos] = React.useState(25);

  return (
    <div>
      <FlipGroupV2 changeKey={pos}>
        {registerNode => (
          <div style={{background: "yellow", position: "relative", width: 5, height: 100}}>
            <div
              ref={registerNode("box")}
              style={{
                position: "absolute",
                background: "red",
                width: "100%",
                height: 5,
                top: `${pos}%`,
                left: 0,
              }}
            />
          </div>
        )}
      </FlipGroupV2>
      <button onClick={() => setPos(Math.round(Math.random() * 100))}>{pos}%</button>
    </div>
  );
};

export const SimpleXY = () => {
  const [pos, setPos] = React.useState([25, 25]);

  return (
    <div>
      <FlipGroupV2 changeKey={pos}>
        {registerNode => (
          <div style={{background: "yellow", position: "relative", width: 100, height: 100}}>
            <div
              ref={registerNode("box")}
              style={{
                position: "absolute",
                background: "red",
                width: 5,
                height: 5,
                left: `${pos[0]}%`,
                top: `${pos[1]}%`,
              }}
            />
          </div>
        )}
      </FlipGroupV2>
      <button
        onClick={() => setPos([Math.round(Math.random() * 100), Math.round(Math.random() * 100)])}
      >
        {pos[0]}% x {pos[1]}%
      </button>
    </div>
  );
};

export const UnmountTest = () => {
  const [pos, setPos] = React.useState(25);
  const [present, setPresent] = React.useState(true);

  return (
    <div>
      <FlipGroupV2 changeKey={pos}>
        {registerNode => (
          <div style={{background: "yellow", position: "relative", height: 5}}>
            {present && (
              <div
                ref={registerNode("box", {positionSpringConfig: {mass: 10, friction: 100}})}
                style={{
                  position: "absolute",
                  background: "red",
                  width: 5,
                  height: "100%",
                  top: 0,
                  left: `${pos}%`,
                }}
              />
            )}
          </div>
        )}
      </FlipGroupV2>
      <button onClick={() => setPos(Math.round(Math.random() * 100))}>{pos}%</button>
      <button onClick={() => setPresent(!present)}>toggle box</button>
    </div>
  );
};

const createNPos = n =>
  Array.from(new Array(n), () => [
    Math.round(Math.random() * 100),
    Math.round(Math.random() * 100),
  ]);
const N = 500;

export const PerfTest = () => {
  const [pos, setPos] = React.useState(() => createNPos(N));

  return (
    <div>
      <FlipGroupV2 changeKey={pos}>
        {registerNode => (
          <div style={{background: "yellow", position: "relative", width: 500, height: 500}}>
            {pos.map((p, i) => (
              <div
                key={i}
                ref={registerNode("box" + i, {positionSpringConfig: {mass: 1, friction: 20}})}
                style={{
                  position: "absolute",
                  background: "red",
                  width: 5,
                  height: 5,
                  left: `${p[0]}%`,
                  top: `${p[1]}%`,
                }}
              />
            ))}
          </div>
        )}
      </FlipGroupV2>
      <button onClick={() => setPos(createNPos(N))}>reset</button>
    </div>
  );
};
