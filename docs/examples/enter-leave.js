import React from 'react'
import {Set} from 'react-powerplug'
import PropTypes from 'prop-types'
import {FlipGroup, EnterLeaveGroup} from '../../src/index'
import Text from './Text'

const ExpandText = ({
  flipKey,
  registerNode,
  preview,
  children,
  isActive,
  onClick,
}) => (
  <div ref={registerNode(`container-${flipKey}`)}>
    <div>{preview}</div>
    <EnterLeaveGroup
      registerNode={registerNode}
      keysAndData={isActive ? [{key: flipKey, data: children}] : []}
      enterPositionStyle={{height: 1}}
      enterDecorationStyle={{opacity: 0}}
      leaveStyle={{height: 1, opacity: 0}}
    >
      {(keysAndData, registerEnterLeave) =>
        keysAndData.map(({key, data}) => (
          <div
            key={key}
            ref={registerEnterLeave(key, {
              positionMode: 'none',
              transitionProps: ['opacity'],
            })}
            style={{overflow: 'hidden'}}
          >
            {data}
          </div>
        ))
      }
    </EnterLeaveGroup>
    <button
      ref={registerNode(`button-${flipKey}`, {positionMode: 'none'})}
      onClick={onClick}
    >
      {isActive ? 'collapse' : 'expand'}
    </button>
  </div>
)

ExpandText.propTypes = {
  flipKey: PropTypes.any,
  registerNode: PropTypes.any,
  preview: PropTypes.any,
  children: PropTypes.any,
  isActive: PropTypes.any,
  onClick: PropTypes.any,
}

const EnterLeave = () => (
  <Set>
    {({values, add, remove, has}) => (
      <FlipGroup
        changeKey={values.join('-')}
        durationMs={1000}
        noAnimationOnMount
      >
        {registerNode => (
          <React.Fragment>
            <ExpandText
              isActive={has('text1')}
              onClick={() => (has('text1') ? remove('text1') : add('text1'))}
              flipKey="text1"
              registerNode={registerNode}
              preview={<h2>Enter Leave</h2>}
            >
              <Text />
            </ExpandText>
            <ExpandText
              isActive={has('text2')}
              onClick={() => (has('text2') ? remove('text2') : add('text2'))}
              flipKey="text2"
              registerNode={registerNode}
              preview={<h2>Enter Leave 2</h2>}
            >
              <Text />
            </ExpandText>
          </React.Fragment>
        )}
      </FlipGroup>
    )}
  </Set>
)

export default EnterLeave
