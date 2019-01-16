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
* Fairly small. Including all its dependencies it weighs in at `~12KB minifed` or `~4KB` gzipped

## Api

### FlipGroup

The `FlipGroup` manages all nodes that are affected by a specific state change. The state change needs to be incorporated into a `changeKey` to notify the FlipGroup that it should check the registered node's position before the update is applied and after.
`FlipGroup` uses `getSnapshotBeforeUpdate` and `componentDidUpdate` under the hood.

#### Props

- **`changeKey={any}`**

  **Required.** Whenever this key changes, it'll check the position of all connected nodes before the dom update, and after and will perform the necessary transitions.

- **`keysAndData={{key, data}[]}`**

  This prop expects an array of `{key, data}` pairs that are currently available. Once a new key is entered, it will perform an enter transition. Once a key is not present anymore, this key will perform a leave transition.

- **`durationMs={number|default: 200}`**

  Duration of the groups transitions in milliseconds

- **`timingFunction={string|default: 'ease-in-out'}`**

  css timing function used for this transition. Supports `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out` and `cubic-bezier(x1, y1, x2, y1)`.

- **`leaveStyle={styleObject}`**

  Pass in the target style of disappearing nodes. If left empty, nodes will disappear immediately

- **`enterPositionStyle={styleObject}`**

  Pass in the position style props for an entering node (i.e. `top`, `left`, `height`, `width`)

- **`enterDecorationStyle={styleObject}`**

  Pass in the decoration style props (e.g. `opacity`, `color`) for an entering node

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
  - `non-transform`: don't apply `transform: scale()`. Instead transition `width` and/or `height` directly. This may lead to a lot of re-layouting. So use with caution.
  - `immediate`: immediately apply the final new dimension. This can be useful if one of its children has a `scaleMode` of `non-transform` but you want sibblings to apply their new position via transforms.
  - `none`: don't process to the new dimensions.

- **`opts.transitionProps={string[]|default: []}`**

  A string array of css properties that should be transitioned. Useful if `opacity`, or `background-color` changes from one state to another.

- **`opts.setWillChange={boolean|default: false}`**

  If set to `true` it will set the `will-change` css property to all properties that are affected by a transition. This might lead to smoother transitions but comes at the cost of taking up more memory.

- **`opts.delayMs={number|default: 0}`**

  Defines the delay of the transition in milliseconds. Useful for staggering effects.

- **`opts.parentFlipKey={string}`**

  Cancels out a parent's transforms. If the current node lies within another `registerNode` we need to notify the FlipGroup that the parent's transforms need to be considered as well. Currently only takes into consideration x and y transforms. I.e no scaling.
