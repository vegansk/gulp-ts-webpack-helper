const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {

  entry: {
    main: ["./build/tmp/debug/index.js"]
  },

  output: {
    filename: "[name].js"
  },

  module:{
    rules: [
      {
        test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre"
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.map$/,
        use: ["ignore-loader"]
      }
    ]
  },

  devtool: "source-map",

  plugins: [
    new HtmlWebpackPlugin()
  ]

};
