import React from "react";
import mergeDiff from "./mergeDiff";
import isUnitlessNumber from "./isUnitlessNumber";

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

// inspired by react-spring
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
    isActive: () => !!cancelFn,
  };
  return spring;
};

const createTransform = (x, y, existing) => {
  return `translate(${x || 0}px, ${y || 0}px)${existing ? ` ${existing}` : ""}`;
};

const createPositionSpring = ({node, config, onRest}) => {
  let xSpring = null;
  let ySpring = null;
  let xVal = null;
  let yVal = null;
  let existingTransform = null;
  const styleIfDone = () => {
    if ((!xSpring || xVal !== null) && (!ySpring || yVal !== null)) {
      node.style.transform = createTransform(xVal, yVal, existingTransform);
      xVal = null;
      yVal = null;
    }
  };
  const resetIfDone = () => {
    if (!xSpring && !ySpring) {
      node.style.transform = existingTransform;
      onRest();
    }
  };
  return {
    reset: () => {
      if (xSpring || ySpring) node.style.transform = existingTransform;
    },
    animate: (beforeRect, targetRect, parentDiff, _existingTransform) => {
      const xParent = parentDiff ? parentDiff.target.left - parentDiff.before.left : 0;
      const yParent = parentDiff ? parentDiff.target.top - parentDiff.before.top : 0;

      const xDiff = targetRect.left - beforeRect.left - xParent;
      const yDiff = targetRect.top - beforeRect.top - yParent;

      existingTransform = _existingTransform;

      if (!xSpring && !ySpring && !xDiff && !yDiff) return;
      node.style.transform = createTransform(-xDiff, -yDiff, _existingTransform);

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
    isActive: () => xSpring || ySpring,
  };
};

const applyStyles = (node, styles) => {
  Object.entries(styles).forEach(
    ([key, val]) =>
      (node.style[key] =
        typeof val === "number" && val !== 0 && !isUnitlessNumber[key] ? `${val}px` : val)
  );
};

const setAndResetStyles = (node, styles) => {
  const prev = Object.entries(styles).map(([key]) => [key, node.style[key]]);
  applyStyles(node, styles);
  return () => prev.forEach(([key, val]) => (node.style[key] = val));
};

// eslint-disable-next-line max-lines-per-function
const createHandler = (key, _opts, handlersPerKey, removeNode) => {
  let nodeInfo = null; // {node, positionSpring}
  let before = null;
  let target = null;
  let offset = null;
  const positionSpringConfig = {...defaultSpringConfig, ..._opts.positionSpringConfig};

  const resets = {};
  const springs = {};
  const onRest = () => {
    if (handler.isLeaving) {
      if (Object.values(springs).every(s => !s.isActive())) removeNode();
    }
  };

  const createPresenceSpring = startVal => {
    springs.presence = createSpring({
      onUpdate: val => {
        if (nodeInfo) applyStyles(nodeInfo.node, handler.opts.onPresence(val));
      },
      onFinish: onRest,
      startVal,
      config: defaultSpringConfig,
    });
  };

  const handler = {
    key,
    opts: _opts,
    isLeaving: false,
    enter: () => {
      if (handler.opts.enterPosition) {
        const resetFn = setAndResetStyles(nodeInfo.node, handler.opts.enterPosition);
        resets.enter = () => {
          resetFn();
          delete resets.enter;
        };
      }
      if (handler.opts.onPresence) {
        if (!springs.presence) createPresenceSpring(0);
        springs.presence.animateTo(1);
      }
    },
    reenter: () => {
      handler.isLeaving = false;
      if (springs.presence) springs.presence.animateTo(1);
    },
    measureBefore: () => {
      before = nodeInfo && nodeInfo.node.getBoundingClientRect();
    },
    reset: () => {
      Object.values(resets).forEach(fn => fn());
    },
    applyLeavePosition: () => {
      handler.isLeaving = true;
      if (handler.opts.leavePosition) {
        const resetFn = setAndResetStyles(nodeInfo.node, handler.opts.leavePosition);
        resets.applyLeavePosition = () => {
          resetFn();
          delete resets.applyLeavePosition;
        };
      }
      if (handler.opts.onPresence) {
        if (!springs.presence) createPresenceSpring(1);
        springs.presence.animateTo(0);
      }
    },
    measureLeaving: () => {
      offset = {left: nodeInfo.node.offsetLeft, top: nodeInfo.node.offsetTop};
      target = nodeInfo.node.getBoundingClientRect();
    },
    removeFromFlow: () => {
      const resetFn = setAndResetStyles(nodeInfo.node, {position: "absolute"});
      resets.removeFromFlow = () => {
        resetFn();
        delete resets.removeFromFlow;
      };
    },
    relocateLeaving: () => {
      let parentDiff = null;
      if (handler.opts.parentFlipKey) {
        const parentHandler = handlersPerKey[handler.opts.parentFlipKey];
        if (parentHandler) {
          parentDiff = parentHandler._getDiff();
        }
      }
      const xParent = parentDiff ? parentDiff.target.left - parentDiff.before.left : 0;
      const yParent = parentDiff ? parentDiff.target.top - parentDiff.before.top : 0;

      if (resets.applyLeavePosition) resets.applyLeavePosition();

      const resetFn = setAndResetStyles(nodeInfo.node, {
        transform:
          (handler.opts.leavePosition && handler.opts.leavePosition.transform) || undefined,
        left: `${offset.left - xParent}px`,
        top: `${offset.top - yParent}px`,
        marginLeft: 0,
        marginTop: 0,
        width: `${target.width}px`,
        height: `${target.height}px`,
      });

      resets.relocateLeaving = () => {
        resetFn();
        delete resets.relocateLeaving;
        if (resets.removeFromFlow) {
          resets.removeFromFlow();
        }
      };
      target = null;
    },
    measureAfter: () => {
      if (!target) target = nodeInfo.node.getBoundingClientRect();
    },
    animate: () => {
      let parentDiff = null;
      if (handler.opts.parentFlipKey) {
        const parentHandler = handlersPerKey[handler.opts.parentFlipKey];
        if (parentHandler) {
          parentDiff = parentHandler._getDiff();
        } else if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(
            `Couldn't find parentFlipKey: "${handler.opts.parentFlipKey}" required by "${key}"`
          );
        }
      }
      nodeInfo.positionSpring.animate(before, target, parentDiff, nodeInfo.node.style.transform);
      if (!nodeInfo.positionSpring.isActive()) onRest();
      before = null;
      target = null;
    },
    refFn: node => {
      if (node) {
        nodeInfo = {
          node,
          positionSpring: createPositionSpring({node, config: positionSpringConfig, onRest}),
        };
        resets.position = () => nodeInfo.positionSpring.reset();
        springs.position = nodeInfo.positionSpring;
        handlersPerKey[key] = handler;
      } else {
        Object.values(springs).forEach(s => s.cancel());
        delete handlersPerKey[key];
      }
    },
    _getDiff: () => ({before, target}),
  };
  return handler;
};

export default class FlipGroupV2 extends React.Component {
  constructor(props) {
    super(props);
    this.handlersPerKey = {};
    this.enteringKeys = {};
    this.leavingKeys = {};
    this.renderedKeysAndData = props.keysAndData || [];
  }

  getSnapshotBeforeUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return null;
    const handlers = Object.values(this.handlersPerKey);
    handlers.forEach(h => h.measureBefore());
    return null;
  }

  registerNode = (key, opts = {}) => {
    const existing = this.handlersPerKey[key];
    if (existing) {
      existing.opts = opts;
      return existing.refFn;
    } else {
      const handler = createHandler(key, opts, this.handlersPerKey, () => {
        this.renderedKeysAndData = this.renderedKeysAndData.filter(d => d.key !== key);
        this.forceUpdate();
      });
      return handler.refFn;
    }
  };

  componentDidUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return;
    const handlers = Object.values(this.handlersPerKey);

    const entering = handlers.filter(h => this.enteringKeys[h.key]);
    entering.forEach(h => h.enter());
    entering.forEach(h => {
      h.measureBefore();
      delete this.enteringKeys[h.key];
    });

    handlers.forEach(h => h.reset());

    const leaving = handlers.filter(h => this.leavingKeys[h.key]);
    leaving.forEach(h => {
      h.applyLeavePosition();
      delete this.leavingKeys[h.key];
    });
    leaving.forEach(h => h.measureLeaving());
    leaving.forEach(h => h.removeFromFlow());
    leaving
      .map(h => h.opts.parentFlipKey && this.handlersPerKey[h.opts.parentFlipKey])
      .map(parent => parent && parent.measureAfter());
    leaving.forEach(h => h.relocateLeaving());

    (this.props.keysAndData || []).forEach(({key}) => {
      const handler = this.handlersPerKey[key];
      if (handler && handler.isLeaving) {
        handler.reenter();
      }
    });

    handlers.forEach(h => h.measureAfter());
    handlers.forEach(h => h.animate());
  }

  render() {
    this.props.keysAndData.forEach(kd => {
      if (this.leavingKeys[kd.key]) delete this.leavingKeys[kd.key];
    });

    this.renderedKeysAndData = mergeDiff(
      this.renderedKeysAndData,
      this.props.keysAndData || [],
      (oldKeyIndex, content) => {
        this.leavingKeys[content.key] = true;
        return content;
      },
      (newKeyIndex, content) => {
        this.enteringKeys[content.key] = true;
      }
    );

    return this.props.children(this.registerNode, this.renderedKeysAndData);
  }
}