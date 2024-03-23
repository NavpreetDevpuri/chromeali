const path = require('path');

module.exports = {
  mode: 'development', // Use 'production' for minification
  entry: {
    background: './background/background.js', // Path to your background script
    // Define other entries if you have multiple bundles, e.g., for content scripts or popups
  },
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'), // Output directory
    filename: '[name].bundle.js', // Output bundled file name
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    fallback: {
      // Polyfills for Node.js modules if needed, or set to false to exclude them
      "fs": false,
      "tls": false,
      "net": false,
      "path": false,
      "zlib": false,
      "http": false,
      "https": false,
      "stream": false,
      "crypto": false,
    }
  }
};
