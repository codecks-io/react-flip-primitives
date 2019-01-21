# React Flip Primitives

## Installation

```bash
npm install react-flip-primitives
```

## Usage

Here's a very simple example

```jsx

import FlipGroup from "react-flip-primitives"

<FlipGroup changeKey={isActive} durationMs={500}>{registerNode => (
  <div>
    <div ref={registerNode('text')} style={{height: isActive ? 'auto' : 0}}>Text</div>
    <button ref={registerNode('text')} onClick={toggle}>Toggle</button>
  </div>
)}</FlipGroup>
```

## Features

* Follows the advice outlined in this [google developer post](https://developers.google.com/web/updates/2017/03/performant-expand-and-collapse)
* All transitions are pure CSS transitions
* Allow enter and leave animations inspired by `react-motion`'s [`TransitionMotion`](https://github.com/chenglou/react-motion#transitionmotion-)
* Fairly small. Including all its dependencies it weighs in at `~11KB minifed` or `~4KB` gzipped

## Api

### FlipGroup

The `FlipGroup` manages all nodes that are affected by a specific state change. The state change needs to be incorporated into a `changeKey` to notify the FlipGroup that it should check the registered node's position before the update is applied and after.
`FlipGroup` uses `getSnapshotBeforeUpdate` and `componentDidUpdate` under the hood.

#### Props

- **`changeKey={any}`**

  **Required.** Whenever this key changes, it'll check the position of all connected nodes before the dom update, and after and will perform the necessary transitions.

- **`keysAndData={{key, data}[]}`**

  This prop expects an array of `{key, data}` pairs that are currently available. Once a new key is entered, it will perform an enter transition. Once a key is not present anymore, this key will perform a leave transition.

- **`leaveStyle={styleObject}`**

  Pass in the target style of disappearing nodes. If left empty, nodes will disappear immediately

- **`enterStyle={styleObject}`**

  Pass in the style props for an entering node. It will automatically apply transitions for all referred props.

- **`children={(registerNode, keysAndData) => ReactNode}`**

  `FlipGroup`'s uses a render prop to register all nodes that are affected when the `changeKey` is changed.
  If need enter and leave transitions you need to use the keys and data provided by `keysAndData`. This array of `{key, data}` objects contains all the currently visible keys and will differ from the `keysAndData` you passed in as a prop if a node is in the process of leaving.

### FlipGroup's `registerNode(key, opts)`

- **`key`**

  A key for the node that is unique within it's `FlipGroup`

- **`opts.positionMode={string|default: 'transform'}`**

  Defines how the node behaves if the position needs to change. Possible values are:

  - `transform`: transition to the new position via setting the corresponding `translate` `transform`
  - `none`: don't transition to the new location. Set it there immediately. This can be necessary if a parent node is already transitioning to a new location

- **`opts.scaleMode={string|default: 'transform'}`**

  Defines how the node behaves if the dimensions of a node needs to change. Possible values are:

  - `transform`: transition to the new dimensions via setting the corresponding `scale` `transform`.
  - `none`: don't process to the new dimensions.

- **`durationMs={number|default: 200}`**

  Duration of the element's transitions in milliseconds

- **`timingFunction={string|default: 'ease-in-out'}`**

  css timing function used for this transition. Supports `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out` and `cubic-bezier(x1, y1, x2, y1)`.

- **`opts.delayMs={number|default: 0}`**

  Defines the delay of the transition in milliseconds. Useful for staggering effects.

- **`opts.parentFlipKey={string}`**

  Cancels out a parent's transforms. If the current node lies within another `registerNode` we need to notify the FlipGroup that the parent's transforms need to be considered as well. Currently only takes into consideration x and y transforms. I.e no scaling.
