const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './popup/popup.js', 
  output: {
    filename: 'popup.bundle.js', 
    path: path.resolve(__dirname, 'dist'),
    clean: true, 
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './popup/popup.html', 
      filename: 'popup.html',
      inject: 'body', 
    }),
  ],
  mode: 'production', 
};
