import React from 'react'
import {Set} from 'react-powerplug'
import ReactFlip from '../src/index'

const Text = () => (
  <div>
    <p>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
      tempor incididunt ut labore et dolore magna aliqua. Semper risus in
      hendrerit gravida. Et molestie ac feugiat sed lectus vestibulum mattis
      ullamcorper. Lectus mauris ultrices eros in cursus turpis massa tincidunt.
      Nunc sed velit dignissim sodales ut eu sem integer vitae. Imperdiet sed
      euismod nisi porta lorem mollis aliquam ut. Semper eget duis at tellus at
      urna. Aliquet risus feugiat in ante metus dictum at tempor commodo. In
      aliquam sem fringilla ut morbi. Sagittis id consectetur purus ut faucibus
      pulvinar elementum integer enim. Eget duis at tellus at urna condimentum
      mattis. Gravida dictum fusce ut placerat orci nulla pellentesque dignissim
      enim. Integer malesuada nunc vel risus commodo viverra maecenas accumsan.
      Sit amet luctus venenatis lectus magna fringilla urna porttitor rhoncus.
      Metus vulputate eu scelerisque felis imperdiet proin fermentum leo. Quis
      blandit turpis cursus in hac habitasse. Egestas congue quisque egestas
      diam in arcu cursus euismod quis. Pretium quam vulputate dignissim
      suspendisse in est ante in. Tellus id interdum velit laoreet id.
    </p>
    <p>
      Tortor dignissim convallis aenean et tortor at risus viverra. Natoque
      penatibus et magnis dis parturient montes. Congue nisi vitae suscipit
      tellus mauris. Mi ipsum faucibus vitae aliquet nec ullamcorper. Donec
      massa sapien faucibus et molestie ac feugiat. Tortor id aliquet lectus
      proin nibh nisl condimentum. Cras semper auctor neque vitae tempus quam
      pellentesque nec. Id aliquet lectus proin nibh nisl condimentum. Mauris in
      aliquam sem fringilla ut. Quam adipiscing vitae proin sagittis nisl
      rhoncus. Lectus mauris ultrices eros in cursus. Nibh ipsum consequat nisl
      vel pretium lectus quam id leo. Suspendisse sed nisi lacus sed viverra.
      Amet massa vitae tortor condimentum lacinia. Nunc aliquet bibendum enim
      facilisis gravida neque convallis a. Dignissim diam quis enim lobortis
      scelerisque fermentum. Tristique et egestas quis ipsum suspendisse
      ultrices gravida dictum fusce. Nullam vehicula ipsum a arcu cursus.
      Vulputate ut pharetra sit amet. Suspendisse in est ante in nibh mauris
      cursus mattis molestie.
    </p>
  </div>
)

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
    <div
      style={{
        height: isActive ? 'auto' : 1,
        overflow: 'hidden',
      }}
      ref={registerFlip(`preview-${flipKey}`, {
        scaleMode: 'non-transform',
        positionMode: 'none',
      })}
    >
      {children}
    </div>
    <button onClick={onClick}>{isActive ? 'collapse' : 'expand'}</button>
  </div>
)

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
