import React from 'react'
import PropTypes from 'prop-types'

export default class GenerateNumbers extends React.Component {
  static propTypes = {
    min: PropTypes.number,
    max: PropTypes.number,
    count: PropTypes.number,
    children: PropTypes.func.isRequired,
  }

  state = this.generate()

  generate() {
    const {min, max, count} = this.props
    const diff = max - min
    return {
      numbers: Array.from(
        new Array(Math.round(count / 2 + Math.random() * count)),
        () => Math.random() * diff + min,
      ),
    }
  }

  regenerate = () => {
    this.setState(this.generate())
  }

  render() {
    return this.props.children(this.state.numbers, this.regenerate)
  }
}
