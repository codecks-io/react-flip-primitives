import React from 'react'
import {Set} from 'react-powerplug'
import PropTypes from 'prop-types'
import ReactFlip from '../../src/index'
import styles from '../styles.module.css'
import Text from './Text'

const ExpandText = ({
  flipKey,
  registerFlip,
  preview,
  children,
  isActive,
  onClick,
}) => (
  <div
    className={styles.container}
    ref={registerFlip(`container-${flipKey}`, {scaleMode: 'immediate'})}
  >
    <div>{preview}</div>
    <div
      className={styles.more}
      style={{
        height: isActive ? 'auto' : 1,
        opacity: isActive ? 1 : 0,
        overflow: 'hidden',
      }}
      ref={registerFlip(`preview-${flipKey}`, {
        scaleMode: 'non-transform',
        positionMode: 'none',
        transitionProps: ['opacity'],
      })}
    >
      {children}
    </div>
    <button onClick={onClick}>{isActive ? 'collapse' : 'expand'}</button>
  </div>
)

ExpandText.propTypes = {
  flipKey: PropTypes.any,
  registerFlip: PropTypes.any,
  preview: PropTypes.any,
  children: PropTypes.any,
  isActive: PropTypes.any,
  onClick: PropTypes.any,
}

const Simple = () => (
  <Set>
    {({values, add, remove, has}) => (
      <ReactFlip changeKey={values.join('-')}>
        {registerFlip => (
          <React.Fragment>
            <ExpandText
              isActive={has('text1')}
              onClick={() => (has('text1') ? remove('text1') : add('text1'))}
              flipKey="text1"
              registerFlip={registerFlip}
              preview={<h2>Some heading</h2>}
            >
              <Text />
            </ExpandText>
            <ExpandText
              isActive={has('text2')}
              onClick={() => (has('text2') ? remove('text2') : add('text2'))}
              flipKey="text2"
              registerFlip={registerFlip}
              preview={<h2>Some other Heading</h2>}
            >
              <Text />
            </ExpandText>
          </React.Fragment>
        )}
      </ReactFlip>
    )}
  </Set>
)

export default Simple
