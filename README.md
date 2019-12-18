# React Flip Primitives

## Installation

```bash
npm install react-flip-primitives
```

## Usage

Here's a simple and a more complex example

```jsx
import FlipGroup from "react-flip-primitives";

<FlipGroup changeKey={isActive}>
  {registerNode => (
    <div>
      <div ref={registerNode("text")} style={{height: isActive ? "auto" : 0}}>
        Text
      </div>
      <button ref={registerNode("button")} onClick={toggle}>
        Toggle
      </button>
    </div>
  )}
</FlipGroup>;
```

```jsx
import FlipGroup from "react-flip-primitives";

<FlipGroup changeKey={isActive} keysAndData={users.map(u => ({key: u.id, data: u}))}>
  {(registerNode, keysAndData) => (
    <div>
      {keysAndData.map(kd => (
        <Avatar
          key={kd.key}
          user={kd.data}
          ref={registerNode(kd.key, {
            enterPosition: {transform: "translate(0, -20px)"},
            leavePosition: {transform: "translate(0, 20px)"},
            onPresence: presence => ({opacity: presence}),
          })}
        />
      ))}
      <button ref={registerNode("button")}>Add</button>
    </div>
  )}
</FlipGroup>;
```

## Features

- Follows the advice outlined in this [google developer post](https://developers.google.com/web/updates/2017/03/performant-expand-and-collapse).
- All transitions are based on spring-physics.
- Allow enter and leave animations inspired by `react-motion`'s [`TransitionMotion`](https://github.com/chenglou/react-motion#transitionmotion-).
- Fairly small. Including all its dependencies it weighs in at `~9KB minifed` or `~3KB` gzipped.
- Doesn't animate size changes (yet), only focusses on position changes.
- Minimizes layout thrashing by batching all layout read and write operations.

## Api

### FlipGroup

The `FlipGroup` manages all nodes that are affected by a specific state change. The state change needs to be incorporated into a `changeKey` to notify the FlipGroup that it should check the registered node's position before the update is applied and after. If the identity of the changeKey changes, `getSnapshotBeforeUpdate` is called measuring all present flip nodes, and applying smooth transitions to get to the positions determined by `componentDidUpdate`. (Trivia: since there's no React hook for `getSnapshotBeforeUpdate` yet, this library still relies on an old school class component).

#### Props

- **`changeKey={any}`**

  **Required.** Whenever this key changes, it'll check the position of all connected nodes before the DOM update, and after and will perform the necessary transitions.

- **`keysAndData={{key, data}[]}`**

  This prop expects an array of `{key, data}` pairs that are currently available. Once a new key is entered, it will perform an enter transition. Once a key is not present anymore, this key will perform a leave transition.

- **`children={(registerNode, presentKeysAndData) => ReactNode}`**

  `FlipGroup`'s uses a render prop to register all nodes that are affected when the `changeKey` is changed.
  If you're using enter and leave transitions, you need to use the keys and data provided by `presentKeysAndData`. This array of `{key, data}` objects contains all the currently visible keys and will differ from the `keysAndData` you passed in as a prop if a node is in the process of leaving.

### FlipGroup's `registerNode(key, opts)`

- **`key`**

  A key for the node that is unique within it's `FlipGroup`

- **`opts.enterPosition={style}`**

  typically something like `{enterPosition: {transform: 'translate(-10,0) scale(0.5)'}}`. Note that the passed style object should only contain styles affecting the position of the element. For styling e.g. position, use the `onPresence` callback

- **`opts.leavePosition={style}`**

  typically something like `{enterPosition: {transform: 'translate(-10,0) scale(0.5)'}}`. Note that the passed style object should only contain styles affecting the position of the element. For styling e.g. position, use the `onPresence` callback

- **`opts.positionSpringConfig={springConfig}`**
  defaults to `{mass: 1, tension: 170, friction: 26, precision: 0.1}`

* **`opts.onPresence={(presence) => style}`**

  typically something like `(val) => ({opacity: val})`. `val` will be `0` when entering and will target `1` via spring physics. When leaving, `val` will target `0`.

* **`opts.presenceSpringConfig={springConfig}`**
  defaults to `{mass: 1, tension: 170, friction: 26, precision: 0.1}`

* **`opts.parentFlipKey={string}`**

  Cancels out a parent's transforms. If the current node lies within another `registerNode` we need to notify the FlipGroup that the parent's transforms need to be considered as well.
