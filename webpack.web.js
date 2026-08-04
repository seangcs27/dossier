const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const base = require('./webpack.base');

module.exports = {
  ...base,
  entry: {
    app: './src/web/index.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist/web'),
    filename: '[name].js',
    clean: true,
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: 'styles.css' }),
    new CopyPlugin({
      patterns: [
        { from: 'src/web/index.html', to: 'index.html' },
        { from: 'icons', to: 'icons' },
      ],
    }),
  ],
};
