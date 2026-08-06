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
        { from: 'src/shared/generated/operator-details', to: 'operator-details' },
      ],
    }),
  ],
};
