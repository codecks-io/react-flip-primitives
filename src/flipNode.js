import {translateX, translateY, scaleX, scaleY, multiply, toString} from "rematrix";
import {styler} from "./styler";

// 3d transforms were causing weird issues in chrome,
// especially when opacity was also being tweened,
// so convert to a 2d matrix
export const convertMatrix3dArrayTo2dArray = matrix =>
  [0, 1, 4, 5, 12, 13].map(index => matrix[index]);

const flipNode = ({nodeInfo, prevRect, currentRect, parentRects}) => {
  const {positionMode, scaleMode} = nodeInfo.opts;
  const transforms = [];
  const dimensions = [
    {dim: "height", scaleFn: scaleY, translateFn: translateY, attr: "top"},
    {dim: "width", scaleFn: scaleX, translateFn: translateX, attr: "left"},
  ];
  dimensions.forEach(({dim, scaleFn, translateFn, attr}) => {
    if (positionMode !== "none") {
      const parentDiff = parentRects
        ? parentRects.currentRect[attr] - parentRects.prevRect[attr]
        : 0;
      const diff = parentDiff + prevRect[attr] - currentRect[attr];
      if (diff !== 0) {
        transforms.push(translateFn(diff));
      }
    }
    if (prevRect[dim] !== currentRect[dim]) {
      if (scaleMode !== "none") {
        const ratio = Math.max(prevRect[dim], 1) / Math.max(currentRect[dim], 1);
        transforms.push(scaleFn(ratio));
      }
    }
  });
  if (transforms.length) {
    const flipStartStyle = {
      transform: toString(transforms.reduce(multiply)),
      transformOrigin: "0px 0px 0px",
    };
    styler.addStyle(nodeInfo, "flipStart", flipStartStyle, {removeOnNextFrame: true});
  }
};

export default flipNode;
