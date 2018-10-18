import React from 'react'
import {Set} from 'react-powerplug'
import ReactFlip, {OnLeave} from '../../src/index'
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
    <OnLeave leaveStyle={{height: 1}} registerFlip={registerFlip}>
      {onLeaveRef =>
        !isActive && (
          <div
            ref={onLeaveRef(`preview-${flipKey}`, {
              scaleMode: 'non-transform',
              positionMode: 'none',
              enterStyle: {height: 1},
            })}
            style={{overflow: 'hidden'}}
          >
            {children}
          </div>
        )
      }
    </OnLeave>
    <button onClick={onClick}>{isActive ? 'collapse' : 'expand'}</button>
  </div>
)

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
