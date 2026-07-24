const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
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
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json',        to: 'manifest.json' },
        { from: 'src/extension/popup/popup.html', to: 'popup.html' },
        { from: 'icons',                to: 'icons' },
      ],
    }),
  ],
};
