import React from "react";
import FlipGroup from "../src/FlipGroup";

export default {
  title: "SimpleFlip",
};

export const SimpleX = () => {
  const [pos, setPos] = React.useState(25);

  return (
    <div>
      <FlipGroup changeKey={pos}>
        {(registerNode) => (
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
      </FlipGroup>
      <button onClick={() => setPos(Math.round(Math.random() * 100))}>{pos}%</button>
    </div>
  );
};

export const SimpleY = () => {
  const [pos, setPos] = React.useState(25);

  return (
    <div>
      <FlipGroup changeKey={pos}>
        {(registerNode) => (
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
      </FlipGroup>
      <button onClick={() => setPos(Math.round(Math.random() * 100))}>{pos}%</button>
    </div>
  );
};

export const SimpleXY = () => {
  const [pos, setPos] = React.useState([25, 25]);

  return (
    <div>
      <FlipGroup changeKey={pos}>
        {(registerNode) => (
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
      </FlipGroup>
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
      <FlipGroup changeKey={pos}>
        {(registerNode) => (
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
      </FlipGroup>
      <button onClick={() => setPos(Math.round(Math.random() * 100))}>{pos}%</button>
      <button onClick={() => setPresent(!present)}>toggle box</button>
    </div>
  );
};

const createNPos = (n) =>
  Array.from(new Array(n), () => [
    Math.round(Math.random() * 100),
    Math.round(Math.random() * 100),
  ]);
const N = 500;

export const PerfTest = () => {
  const [pos, setPos] = React.useState(() => createNPos(N));

  return (
    <div>
      <FlipGroup changeKey={pos}>
        {(registerNode) => (
          <div style={{background: "yellow", position: "relative", width: 500, height: 500}}>
            {pos.map((p, i) => (
              <div
                key={i}
                ref={registerNode("box" + i, {positionSpringConfig: {mass: 100, friction: 200}})}
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
      </FlipGroup>
      <button onClick={() => setPos(createNPos(N))}>reset</button>
    </div>
  );
};

const UpdateRef = React.forwardRef(({as: Comp = "div", counter, ...props}, ref) => {
  const lastCounterRef = React.useRef(counter);
  const [handleRef, setHandleRef] = React.useState(() => (node) => ref(node));
  React.useEffect(() => {
    if (lastCounterRef.current !== counter) {
      lastCounterRef.current = counter;
      setHandleRef(() => (node) => ref(node));
    }
  }, [counter, ref]);
  return <Comp {...props} ref={handleRef} />;
});

export const UpdateRefWithinAnimation = () => {
  const [pos, setPos] = React.useState(25);
  const [key, setKey] = React.useState("blue");
  const handleClick = () => {
    setPos(Math.round(Math.random() * 100));
  };
  const lastPosRef = React.useRef(pos);

  React.useEffect(() => {
    if (lastPosRef.current === pos) return;
    lastPosRef.current = pos;
    let timeoutId = setTimeout(() => {
      timeoutId = null;
      setKey((k) => (k === "blue" ? "pink" : "blue"));
    }, 250);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pos]);

  return (
    <div>
      <FlipGroup changeKey={pos}>
        {(registerNode) => (
          <div style={{background: "yellow", position: "relative", height: 15}}>
            <UpdateRef
              counter={key}
              ref={registerNode("box", {
                positionSpringConfig: {mass: 100, friction: 200, noPointerEvents: true},
              })}
              style={{
                position: "absolute",
                background: key,
                width: 15,
                height: "100%",
                top: 0,
                left: `${pos}%`,
              }}
            />
          </div>
        )}
      </FlipGroup>
      <button onClick={handleClick}>{pos}%</button>
    </div>
  );
};
