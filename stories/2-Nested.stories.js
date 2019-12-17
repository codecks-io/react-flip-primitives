import React from "react";
import FlipGroup from "../src/FlipGroup";

export default {
  title: "Nesting",
};

export const NestedOne = () => {
  const [boxes, setBoxes] = React.useState({1: {parent: 0, id: 1}, 2: {parent: 1, id: 2}});

  return (
    <div>
      <FlipGroup
        changeKey={boxes}
        keysAndData={Object.values(boxes).map(b => ({key: b.id, data: b}))}
      >
        {(registerNode, keysAndData) =>
          [0, 1].map(parentId => (
            <div
              key={parentId}
              style={{background: "yellow", padding: 10, margin: 20}}
              ref={registerNode(`parent-${parentId}`)}
            >
              {keysAndData
                .filter(kd => kd.data.parent === parentId)
                .map(kd => (
                  <button
                    key={kd.key}
                    style={{
                      background: "red",
                      position: "relative",
                      zIndex: 1,
                      width: 20,
                      height: 20,
                      margin: 5,
                    }}
                    ref={registerNode(kd.key, {parentFlipKey: `parent-${kd.data.parent}`})}
                    onClick={() =>
                      setBoxes(b => ({
                        ...b,
                        [kd.data.id]: {...kd.data, parent: 1 - kd.data.parent},
                      }))
                    }
                  />
                ))}
            </div>
          ))
        }
      </FlipGroup>
    </div>
  );
};

const range = n => Array.from(new Array(n), (a, i) => i);

const shuffleBoxes = (nBox, maxBoxCount) => {
  return range(nBox)
    .filter(() => Math.random() > 0.2)
    .map(i => ({
      id: i,
      parent: Math.floor(Math.random() * maxBoxCount),
    }));
};

const PARENT_COUNT = 3;
const BOX_COUNT = 10;

export const CrazyBoxes = () => {
  const [boxes, setBoxes] = React.useState(shuffleBoxes(BOX_COUNT, PARENT_COUNT));

  return (
    <FlipGroup changeKey={boxes} keysAndData={boxes.map(b => ({key: b.id, data: b}))}>
      {(registerNode, keysAndData) => (
        <div>
          {range(PARENT_COUNT).map(parentId => (
            <div
              key={parentId}
              style={{background: "yellow", padding: 10, margin: 20, position: "relative"}}
              ref={registerNode(`parent-${parentId}`)}
            >
              {keysAndData
                .filter(kd => kd.data.parent === parentId)
                .map(kd => (
                  <button
                    key={kd.key}
                    style={{
                      background: "red",
                      position: "relative",
                      width: "45%",
                      zIndex: 1,
                      height: 20,
                      margin: 5,
                      fontWeight: "bold",
                      color: "#fff",
                    }}
                    ref={registerNode(kd.key, {
                      enterPosition: {transform: "translate(0, -20px)"},
                      leavePosition: {transform: "translate(0, 20px)"},
                      parentFlipKey: `parent-${kd.data.parent}`,
                      onPresence: val => ({opacity: val}),
                    })}
                    onClick={() => setBoxes(boxes => boxes.filter(b => b.id !== kd.data.id))}
                  >
                    {kd.key}
                  </button>
                ))}
            </div>
          ))}
          <button
            ref={registerNode("but1")}
            onClick={() => setBoxes(shuffleBoxes(BOX_COUNT, PARENT_COUNT))}
          >
            shuffle
          </button>
          <button ref={registerNode("but2")} onClick={() => setBoxes([])}>
            remove all
          </button>
        </div>
      )}
    </FlipGroup>
  );
};
