import React from 'react'
import {Set} from 'react-powerplug'
import PropTypes from 'prop-types'
import ReactFlip, {LeaveEnter} from '../../src/index'
import Text from './Text'

const ExpandText = ({
  flipKey,
  registerFlip,
  preview,
  children,
  isActive,
  onClick,
}) => (
  <div ref={registerFlip(`container-${flipKey}`, {scaleMode: 'immediate'})}>
    <div>{preview}</div>
    <LeaveEnter
      registerFlip={registerFlip}
      keysAndData={isActive ? [{key: flipKey, data: children}] : []}
      enterPositionStyle={{height: 1}}
      enterDecorationStyle={{opacity: 0}}
      leaveStyle={{height: 1, opacity: 0}}
    >
      {(keysAndData, registerLeaveEnter) =>
        keysAndData.map(({key, data}) => (
          <div
            key={key}
            ref={registerLeaveEnter(key, {
              scaleMode: 'non-transform',
              positionMode: 'none',
              transitionProps: ['opacity'],
            })}
            style={{overflow: 'hidden'}}
          >
            {data}
          </div>
        ))
      }
    </LeaveEnter>
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

const EnterLeave = () => (
  <Set>
    {({values, add, remove, has}) => (
      <ReactFlip
        changeKey={values.join('-')}
        durationMs={1000}
        noAnimationOnMount
      >
        {registerFlip => (
          <React.Fragment>
            <ExpandText
              isActive={has('text1')}
              onClick={() => (has('text1') ? remove('text1') : add('text1'))}
              flipKey="text1"
              registerFlip={registerFlip}
              preview={<h2>Enter Leave</h2>}
            >
              <Text />
            </ExpandText>
            <ExpandText
              isActive={has('text2')}
              onClick={() => (has('text2') ? remove('text2') : add('text2'))}
              flipKey="text2"
              registerFlip={registerFlip}
              preview={<h2>Enter Leave 2</h2>}
            >
              <Text />
            </ExpandText>
          </React.Fragment>
        )}
      </ReactFlip>
    )}
  </Set>
)

export default EnterLeave
