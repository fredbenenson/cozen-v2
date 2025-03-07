const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/boardgame/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/boardgame'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/boardgame/index.html',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist/boardgame'),
    },
    port: 8000,
    historyApiFallback: true,
  },
};