import React from "react";

let nextFrameFns = {};
let nextFnCount = 0;
let currMs = null;
let nextFnKey = 0;

const onNextFrame = fn => {
  if (!currMs) currMs = new Date().getTime();
  if (nextFnCount === 0) {
    requestAnimationFrame(() => {
      const dt = new Date().getTime() - currMs;
      const fns = Object.values(nextFrameFns);

      currMs = null;
      nextFnCount = 0;
      nextFrameFns = {};
      fns.forEach(f => f(dt));
    });
  }
  nextFnCount += 1;
  const key = (nextFnKey += 1);
  nextFrameFns[key] = fn;
  return () => {
    nextFnCount -= 1;
    delete nextFrameFns[key];
  };
};

const defaultSpringConfig = {
  mass: 1,
  tension: 170,
  friction: 26,
  precision: 0.1,
};

const createSpring = ({onUpdate, onFinish, startVal, config}) => {
  let velocity = 0;
  let targetVal = null;
  let cancelFn = null;

  const restVelocity = config.restVelocity || config.precision / 10;

  const doStep = dt => {
    let finished = false;
    const step = Math.max(1, Math.round(dt / 250)); // at least 1ms, at most such that there's 250 steps to calculate
    const numSteps = Math.ceil(dt / step);
    for (let n = 0; n < numSteps; n++) {
      const isMoving = Math.abs(velocity) > restVelocity;

      if (!isMoving) {
        finished = Math.abs(targetVal - spring.val) <= config.precision;
        if (finished) {
          break;
        }
      }

      const springForce = -config.tension * 0.000001 * (spring.val - targetVal);
      const dampingForce = -config.friction * 0.001 * velocity;
      const acceleration = (springForce + dampingForce) / config.mass; // pt/ms^2

      velocity = velocity + acceleration * step; // pt/ms
      spring.val = spring.val + velocity * step;
    }
    if (finished) {
      cancelFn = null;
      spring.val = targetVal;
      onUpdate(targetVal);
      onFinish();
    } else {
      cancelFn = onNextFrame(doStep);
      onUpdate(spring.val);
    }
  };

  const spring = {
    val: startVal,
    animateTo: target => {
      targetVal = target;
      if (!cancelFn) {
        cancelFn = onNextFrame(doStep);
      }
    },
    cancel: () => {
      if (cancelFn) {
        cancelFn();
        cancelFn = null;
      }
    },
  };
  return spring;
};

const createPositionSpring = ({node, config}) => {
  let xSpring = null;
  let ySpring = null;
  let xVal = null;
  let yVal = null;
  const styleIfDone = () => {
    if ((!xSpring || xVal !== null) && (!ySpring || yVal !== null)) {
      node.style.transform = `translate(${xVal || 0}px, ${yVal || 0}px)`;
      xVal = null;
      yVal = null;
    }
  };
  const resetIfDone = () => {
    if (!xSpring && !ySpring) {
      node.style.transform = "";
    }
  };
  return {
    reset: () => {
      node.style.transform = "";
    },
    animate: (beforeRect, targetRect) => {
      const xDiff = targetRect.left - beforeRect.left;
      const yDiff = targetRect.top - beforeRect.top;
      if (!xSpring && !ySpring && !xDiff && !yDiff) return;
      node.style.transform = `translate(${-xDiff || 0}px, ${-yDiff || 0}px)`;

      if (!xSpring) {
        if (xDiff !== 0) {
          xSpring = createSpring({
            onUpdate: val => {
              xVal = val;
              styleIfDone();
            },
            onFinish: () => {
              xSpring = null;
              resetIfDone();
            },
            startVal: -xDiff,
            config,
          });
          xSpring.animateTo(0);
        }
      } else {
        xSpring.val = -xDiff;
      }

      if (!ySpring) {
        if (yDiff !== 0) {
          ySpring = createSpring({
            onUpdate: val => {
              yVal = val;
              styleIfDone();
            },
            onFinish: () => {
              ySpring = null;
              resetIfDone();
            },
            startVal: -yDiff,
            config,
          });
          ySpring.animateTo(0);
        }
      } else {
        ySpring.val = -yDiff;
      }
    },
    cancel: () => {
      if (xSpring) xSpring.cancel();
      if (ySpring) ySpring.cancel();
    },
  };
};

const createHandler = (key, opts, onRemove) => {
  let nodeInfo = null; // {node, positionSpring}
  let before = null;
  const positionSpringConfig = {...defaultSpringConfig, ...opts.positionSpringConfig};
  const handler = {
    key,
    opts,
    measureBefore: () => {
      before = nodeInfo.node.getBoundingClientRect();
    },
    reset: () => {
      nodeInfo.positionSpring.reset();
    },
    postReset: () => {
      const target = nodeInfo.node.getBoundingClientRect();
      nodeInfo.positionSpring.animate(before, target);
    },
    refFn: node => {
      if (node) {
        nodeInfo = {
          node,
          positionSpring: createPositionSpring({node, config: positionSpringConfig}),
        };
      } else {
        nodeInfo.positionSpring.cancel();
        onRemove();
      }
    },
  };
  return handler;
};

export default class FlipGroupV2 extends React.Component {
  constructor(props) {
    super(props);
    this.handlersPerKey = {};
  }

  registerNode = (key, opts = {}) => {
    const existing = this.handlersPerKey[key];
    if (existing) {
      existing.opts = opts;
      return existing.refFn;
    } else {
      const handler = createHandler(key, opts, () => {
        delete this.handlersPerKey[key];
      });
      this.handlersPerKey[key] = handler;
      return handler.refFn;
    }
  };

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return null;
    Object.values(this.handlersPerKey).forEach(h => h.measureBefore());
    return null;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return;
    const handlers = Object.values(this.handlersPerKey);
    handlers.forEach(h => h.reset());
    handlers.forEach(h => h.postReset());
  }

  render() {
    return this.props.children(this.registerNode);
  }
}
