import {css} from 'docz-plugin-css'

export default {
  src: 'docs',
  plugins: [
    css({
      preprocessor: 'postcss',
      cssmodules: true,
    }),
  ],
}
