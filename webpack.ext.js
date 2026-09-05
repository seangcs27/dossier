const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const base = require('./webpack.base');

module.exports = {
  ...base,
  entry: {
    popup: './src/extension/popup/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/ext'),
    filename: '[name].js',
    clean: true,
  },
  // webpack's 244KB budget is a hint about network cost on a page load. popup.js carries
  // the operator index and the detail projection (~274KB of the 280KB) and is read off
  // local disk by an installed extension, so there is no download to budget for — the
  // alternative it suggests, code-splitting, would mean fetching, which is the thing this
  // bundle exists to avoid.
  performance: { hints: false },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'popup.css' }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json',        to: 'manifest.json' },
        { from: 'src/extension/popup/popup.html', to: 'popup.html' },
        // Only the plain (unsuffixed) sizes manifest.json declares — the shuffle
        // variants under icons/ are a web-SPA-only feature (see src/web/logo.ts),
        // the popup has no header/favicon to shuffle.
        { from: 'icons/icon-16.png',    to: 'icons/icon-16.png' },
        { from: 'icons/icon-32.png',    to: 'icons/icon-32.png' },
        { from: 'icons/icon-48.png',    to: 'icons/icon-48.png' },
        { from: 'icons/icon-96.png',    to: 'icons/icon-96.png' },
        // No operator-details/ here. The popup reads a ~200KB projection bundled straight
        // into popup.js (see PopupOperator), so the 30.5MB of full payloads the extension
        // used to carry — to read nine fields out of — never ships.
        //
        // archetypeIconUrl() returns a bundle-relative `branch-icons/<sub>.png`, so the
        // popup does need its own copy of those — without it every branch glyph 404s and
        // removes itself, silently rather than visibly. ~250KB for all 71.
        { from: 'src/shared/generated/branch-icons', to: 'branch-icons' },
      ],
    }),
  ],
};
