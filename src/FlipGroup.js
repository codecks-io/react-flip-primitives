import React from "react";
import mergeDiff from "./mergeDiff";
import isUnitlessNumber from "./isUnitlessNumber";

let nextFrameFns = {};
let nextFrameRequested = false;
let currMs = null;
let nextFnKey = 0;

const onNextFrame = fn => {
  if (!currMs) currMs = new Date().getTime();
  if (nextFrameRequested) {
    requestAnimationFrame(() => {
      const dt = new Date().getTime() - currMs;
      const fns = Object.values(nextFrameFns);
      currMs = null;
      nextFrameRequested = false;
      nextFrameFns = {};
      fns.forEach(f => f(dt));
    });
  }
  nextFrameRequested = true;
  const key = (nextFnKey += 1);
  nextFrameFns[key] = fn;
  return () => {
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
    if (dt > 250) {
      // if steps take a long time, don't bother with doing spring animations
      finished = true;
    } else {
      const step = 1;
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
    }
    if (finished) {
      cancelFn = null;
      velocity = 0;
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
      if (Object.values(springs).every(s => !s.isActive())) removeNode(key);
    }
  };

  const createPresenceSpring = startVal => {
    springs.presence = createSpring({
      onUpdate: val => {
        if (nodeInfo) applyStyles(nodeInfo.node, handler.opts.onPresence(val));
      },
      onFinish: onRest,
      startVal,
      config: {...defaultSpringConfig, ...handler.opts.presenceSpringConfig},
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
          const diff = parentHandler._getDiff();
          if (diff.before) parentDiff = diff;
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
          const diff = parentHandler._getDiff();
          if (diff.before) parentDiff = diff;
        } else if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(
            `Couldn't find parentFlipKey: "${handler.opts.parentFlipKey}" required by "${key}"`
          );
        }
      }
      if (before) {
        // if a key was present from the start, but the ref was handed in later, no `before` is available
        nodeInfo.positionSpring.animate(before, target, parentDiff, nodeInfo.node.style.transform);
      }
      if (!nodeInfo.positionSpring.isActive()) onRest();
    },
    clean: () => {
      before = null;
      target = null;
      offset = null;
    },
    refFn: node => {
      if (node) {
        if (handlersPerKey[key]) throw new Error(`there's already a node with "${key}"!`);
        nodeInfo = {
          node,
          positionSpring: createPositionSpring({node, config: positionSpringConfig, onRest}),
        };
        resets.position = () => nodeInfo.positionSpring.reset();
        springs.position = nodeInfo.positionSpring;
        handlersPerKey[key] = handler;
      } else {
        nodeInfo = null;
        Object.values(springs).forEach(s => s.cancel());
        delete handlersPerKey[key];
      }
    },
    _getDiff: () => ({before, target}),
  };
  return handler;
};

let batchTimeoutId = null;
let batchFns = {};
let nextBatchKey = 0;

const onNextBatch = fn => {
  const key = (nextBatchKey += 1);
  if (!batchTimeoutId) {
    batchTimeoutId = setTimeout(() => {
      Object.values(batchFns).forEach(f => f());
      batchTimeoutId = null;
      batchFns = {};
    }, 50);
  }
  batchFns[key] = fn;
  return () => {
    delete batchFns[key];
  };
};

export default class FlipGroup extends React.Component {
  constructor(props) {
    super(props);
    this.handlersPerKey = {};
    this.enteringKeys = {};
    this.leavingKeys = {};
    this.renderedKeysAndData = props.keysAndData || [];
    this.toBeRemovedKeys = new Set();
  }

  removeLeavingNode = key => {
    if (!this.cancelLeavingFn) {
      // not using onNextFrame here as it's a very bad idea to combine unmount logic which has an effect on springs running in the same frame!
      this.cancelLeavingFn = onNextBatch(() => {
        this.cancelLeavingFn = null;
        this.renderedKeysAndData = this.renderedKeysAndData.filter(
          d => !this.toBeRemovedKeys.has(d.key)
        );
        this.toBeRemovedKeys.clear();
        this.forceUpdate();
      });
    }
    this.toBeRemovedKeys.add(key);
  };

  componentWillUnmount() {
    if (this.cancelLeavingFn) this.cancelLeavingFn();
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
      const handler = createHandler(key, opts, this.handlersPerKey, this.removeLeavingNode);
      return handler.refFn;
    }
  };

  componentDidUpdate(prevProps) {
    if (prevProps.changeKey === this.props.changeKey) return;
    const handlers = Object.values(this.handlersPerKey);
    const entering = handlers.filter(h => this.enteringKeys[h.key]);
    const leaving = handlers.filter(h => this.leavingKeys[h.key]);

    leaving.forEach(h => h.reset());
    leaving.forEach(h => h.applyLeavePosition());
    leaving.forEach(h => h.measureLeaving());
    leaving.forEach(h => h.removeFromFlow());
    leaving
      .map(h => h.opts.parentFlipKey && this.handlersPerKey[h.opts.parentFlipKey])
      .map(parent => parent && parent.measureAfter());
    leaving.forEach(h => h.relocateLeaving());

    handlers.forEach(h => {
      if (!this.enteringKeys[h.key] && !this.leavingKeys[h.key]) h.reset();
    });

    (this.props.keysAndData || []).forEach(({key}) => {
      const handler = this.handlersPerKey[key];
      if (handler && handler.isLeaving) {
        handler.reenter();
      }
    });

    entering.forEach(h => h.enter());
    entering.forEach(h => h.measureBefore());
    entering.forEach(h => h.reset());

    handlers.forEach(h => h.measureAfter());
    handlers.forEach(h => h.animate());
    handlers.forEach(h => h.clean());

    leaving.forEach(h => delete this.leavingKeys[h.key]);
    entering.forEach(h => delete this.enteringKeys[h.key]);
  }

  render() {
    const keydAndData = this.props.keysAndData || [];
    keydAndData.forEach(kd => {
      if (this.leavingKeys[kd.key]) delete this.leavingKeys[kd.key];
    });

    this.renderedKeysAndData = mergeDiff(
      this.renderedKeysAndData,
      keydAndData,
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
