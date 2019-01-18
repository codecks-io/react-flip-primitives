import {translateX, translateY, scaleX, scaleY, multiply, toString} from "rematrix";
import {setStylesAndCreateResetter} from "./utils";

// 3d transforms were causing weird issues in chrome,
// especially when opacity was also being tweened,
// so convert to a 2d matrix
export const convertMatrix3dArrayTo2dArray = matrix =>
  [0, 1, 4, 5, 12, 13].map(index => matrix[index]);

const getTransitions = (
  {nodeInfo, prevRect, currentRect, parentRects},
  {durationMs, timingFunction}
) => {
  const {opts} = nodeInfo;
  const nodeData = new Map();
  const getNodeData = node => {
    const ex = nodeData.get(node);
    if (ex) return ex;
    const newNodeData = {
      transforms: [],
      props: [], // {kind: 'width', start: 12, end: 20}
    };
    nodeData.set(node, newNodeData);
    return newNodeData;
  };
  const dimensions = [
    {dim: "height", scaleFn: scaleY, translateFn: translateY, attr: "top"},
    {dim: "width", scaleFn: scaleX, translateFn: translateX, attr: "left"},
  ];
  dimensions.forEach(({dim, scaleFn, translateFn, attr}) => {
    if (opts.positionMode !== "none") {
      const parentDiff = parentRects
        ? parentRects.currentRect[attr] - parentRects.prevRect[attr]
        : 0;
      const diff = parentDiff + prevRect[attr] - currentRect[attr];
      if (diff !== 0) {
        getNodeData(nodeInfo.node).transforms.push(translateFn(diff));
      }
    }
    if (prevRect[dim] !== currentRect[dim]) {
      if (opts.scaleMode === "non-transform") {
        getNodeData(nodeInfo.node).props.push({
          kind: dim,
          start: prevRect[dim],
          end: currentRect[dim],
        });
      } else if (opts.scaleMode === "immediate") {
        getNodeData(nodeInfo.node).props.push({
          kind: dim,
          start: currentRect[dim],
          end: currentRect[dim],
        });
      } else if (opts.scaleMode !== "none") {
        const ratio = Math.max(prevRect[dim], 1) / Math.max(currentRect[dim], 1);
        getNodeData(nodeInfo.node).transforms.push(scaleFn(ratio));
      }
    }
  });
  const actions = {
    onReadyForTransition: [],
    onTransitionDone: [],
    onReset: [],
  };
  nodeData.forEach((data, node) => {
    if (data.transforms.length) {
      const orgTransform = node.style.transform;
      data.props.push({
        kind: "transform",
        start: toString(data.transforms.reduce(multiply)),
        end: orgTransform,
      });
      data.props.push({kind: "transformOrigin", start: "0px 0px 0px", end: "0px 0px 0px"});
    }
  });
  nodeData.forEach((data, node) => {
    if (data.props.length) {
      const startStyles = data.props.reduce((m, {kind, start}) => {
        m[kind] = start;
        return m;
      }, {});
      const endStyles = data.props.reduce((m, {kind, end}) => {
        m[kind] = end;
        return m;
      }, {});
      const reset = setStylesAndCreateResetter(node, startStyles);
      actions.onReset.push(reset);
      actions.onReadyForTransition.push(() => {
        const orgTransition = node.style.transition;
        const transitions = data.props.map(
          ({kind}) => `${kind} ${durationMs}ms ${timingFunction} ${nodeInfo.opts.delayMs}ms`
        );
        node.style.transition = [orgTransition, transitions].filter(Boolean).join(", ");
        setStylesAndCreateResetter(node, endStyles);
        actions.onTransitionDone.push(() => {
          reset();
          node.style.transition = orgTransition;
        });
      });
    }
  });

  return actions;
};

const flipNode = ({nodeInfo, prevRect, currentRect, parentRects}, {durationMs, timingFunction}) => {
  const actions = getTransitions(
    {nodeInfo, prevRect, currentRect, parentRects},
    {durationMs, timingFunction}
  );

  return {
    performTransition: () => {
      actions.onReadyForTransition.forEach(reset => reset());
      const timeoutId = setTimeout(() => {
        actions.onTransitionDone.forEach(reset => reset());
        if (nodeInfo.leaving) {
          nodeInfo.leaving.onDone();
        }
        nodeInfo.currentTransition = null;
      }, durationMs + nodeInfo.opts.delayMs);

      nodeInfo.currentTransition = {
        clearTimeout: () => {
          actions.onTransitionDone.forEach(reset => reset());
          clearTimeout(timeoutId);
        },
      };
    },
    resetStyles: () => {
      actions.onReset.forEach(reset => reset());
    },
  };
};

export default flipNode;
