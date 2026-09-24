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
        { from: 'src/shared/generated/operator-details', to: 'operator-details' },
        { from: 'src/shared/generated/branch-icons', to: 'branch-icons' },
        { from: 'src/shared/generated/class-icons', to: 'class-icons', noErrorOnMissing: true },
        // Self-hosted WebP card art. Same deal as branch-icons: the build downloads and
        // re-encodes it, the page reads it from its own origin. noErrorOnMissing so a
        // build on a machine that has never baked them still succeeds — the cards fall
        // back to the CDN.
        { from: 'src/shared/generated/portraits', to: 'portraits', noErrorOnMissing: true },
        { from: 'src/shared/generated/faction-logos', to: 'faction-logos', noErrorOnMissing: true },
      ],
    }),
  ],
};
