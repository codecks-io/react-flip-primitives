# React Flip Primitives

## Installation

```bash
npm install react-flip-primitives
```

## Usage

Here's a very simple example

```jsx

import {FlipGroup} from "react-flip-primitives"

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
  - Automatically creates (and re-uses) animations for inverting scale transforms
* Helper Method to allow enter and leave animations inspired by `react-motion`'s [`TransitionMotion`](https://github.com/chenglou/react-motion#transitionmotion-)
* Fairly small. Including all its dependencies it weighs in at `~14KB minifed` or `~5KB` gzipped

## Api

### FlipGroup

The `FlipGroup` manages all nodes that are affected by a specific state change. The state change should be incorporated into a `changeKey` to notify the FlipGroup that it should check the registered node's position before the update is applied and after.
`FlipGroup` uses `getSnapshotBeforeUpdate` and `componentDidUpdate` under the hood.

#### Props

- **`changeKey={any}`**

  **Required.** Whenever this key changes, it'll check the position of all connected nodes before the dom update, and after and will perform the necessary transitions.

- **`durationMs={number|default: 200}`**

  Duration of the groups transitions in milliseconds

- **`timingFunction={string|default: 'ease-in-out'}`**

  css timing function used for this transition. Supports `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out` and `cubic-bezier(x1, y1, x2, y1)`.

- **`children={(registerNode) => ReactNode}`**

  `FlipGroup`'s uses a render prop to register all nodes that are affected when the `changeKey` is changed.

### FlipGroup's `registerNode(key, opts)`

- **`key`**

  A key for the node that is unique within it's `FlipGroup`

- **`opts.positionMode={string|default: 'transform'}`**

  Defines how the node behaves if the position needs to change. Possible values are:

  - `transform`: transition to the new position via setting the corresponding `translate` `transform`
  - `none`: don't transition to the new location. Set it there immediately. This can be necessary if a parent node is already transitioning to a new location

- **`opts.scaleMode={string|default: 'transform'}`**

  Defines how the node behaves if the dimensions of a node needs to change. Possible values are:

  - `transform`: transition to the new dimensions via setting the corresponding `scale` `transform`. If the node has no children, it will use a somple transition. If the node has children, all children nodes will get an inverse `scale` `transform` to counter the scaling of their parent.
  - `transform-no-children`: Don't inverse-scale the children nodes.
  - `non-transform`: don't apply `transform: scale()`. Instead transition `width` and/or `height` directly. This may lead to a lot of re-layouting. So use with caution.
  - `immediate`: immediately apply the final new dimension. This can be useful if one of its children as a `scaleMode` of `non-transform` but you want sibblings to apply their new position via transforms.
  - `none`: don't process to the new dimensions.

- **`opts.transitionProps={string[]|default: []}`**

  A string array of css properties that should be transitioned. Useful if `opacity`, or `background-color` changes from one state to another.

- **`opts.setWillChange={boolean|default: false}`**

  If set to `true` it will set the `will-change` css property to all properties that are affected by a transition. This might lead to smoother transitions but comes at the cost of taking up more memory.

- **`opts.delayMs={number|default: 0}`**

  Defines the delay of the transition in milliseconds. Useful for staggering effects.


### EnterLeaveGroup

`EnterLeaveGroup` is heavily inspired by react-motion's [`TransitionMotion`](https://github.com/chenglou/react-motion#transitionmotion-).

The main problem it solves is to perform leave animations. When the user decides to stop rendering something she usually passes `null` but expects the old value to be visible for some time so it may fade out.

This is solved by proxying the children to be rendered through the `EnterLeaveGroup`. You pass in the current keys and their data to be rendered and this component will return all keys and their data that need are currently still visible.

#### Props

- **`keysAndData={{key, data}[]}`**

  **Required.** This prop expects an array of `{key, data}` pairs that are currently available. Once a new key is entered, it will perform an enter transition. Once a key is not present anymore, this key will perform a leave transition.

- **`registerNode={FlipGroup' registerNode function}`**

  **Required.** Pass the parameter passed by `FlipGroup`'s render prop in here.

- **`leaveStyle={styleObject}`**

  Pass in the target style of disappearing nodes. If left empty, nodes will disappear immediately

- **`enterPositionStyle={styleObject}`**

  Pass in the position style props for an entering node (i.e. `top`, `left`, `height`, `width`)

- **`enterDecorationStyle={styleObject}`**

  Pass in the decoration style props (e.g. `opacity`, `color`) for an entering node

- **`children={(keysAndData, registerNode) => ReactNode}`**

  `EnterLeaveGroup`'s uses a render prop to allow you to access a list of all keys and their data that are currently visible. Use `EnterLeaveGroup`'s `registerNode` method to register all nodes that should be managed by it. This `registerNode` supports the same options as the one described above.

### OnOff

Convenience Component for having a single child that needs to leave or enter. It's a wrapper around `EnterLeaveGroup`.

#### Props

- **`keyAndData={{key, data}?}`**

  **Required.** Pass in a `{key, data}` pair or `null`.

- **`registerNode={FlipGroup' registerNode function}`**

  See `EnterLeaveGroup`

- **`leaveStyle={styleObject}`**

  See `EnterLeaveGroup`

- **`enterPositionStyle={styleObject}`**

  See `EnterLeaveGroup`

- **`enterDecorationStyle={styleObject}`**

  See `EnterLeaveGroup`

- **`children={(key, data, registerNode) => ReactNode}`**

  See `EnterLeaveGroup`. Only difference: `key` and `data` are `null` if nothing is present or correspond to the currently rendered object.
