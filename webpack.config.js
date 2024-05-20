const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;
// const WebpackPwaManifest = require('webpack-pwa-manifest');
const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/App.tsx',
    output: {
        filename: 'main.js',
        path: __dirname + '/dist',
        publicPath: 'auto',
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
        alias: {
          "@app": path.resolve("./src"),
          "@pages": path.resolve(__dirname, "./src/pages"),
          "@components": path.resolve(__dirname, "./src/components"),
          "@core": path.resolve(__dirname, "./src/core"),
          "@layouts": path.resolve(__dirname, "./src/layouts"),
        },
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx|js|jsx)$/,
                use: ["babel-loader", "ts-loader"],
                exclude: /node_modules/,
                // options: {
                //     presets: ["@babel/preset-react"],
                // },
            },
            // {
            //     test: /\.(ts|tsx|js|jsx)$/,
            //     use: 'ts-loader',
            //     exclude: /node_modules/,
            // },
            // css and scss loader
            {
                // test: /\.css$/,
                test: /\.(css|scss)$/,
                use: ["style-loader", "css-loader"],
            },

            // image loader
            {
                test: /\.(png|svg|jpg|jpeg|gif)$/i,
                type: "asset/resource",
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './index.html',
        }),
        // new WebpackPwaManifest({
        //     filename: "manifest.json",
        //     name: 'positive-intentions',
        //     short_name: 'PI',
        //     description: 'positive-intentions',
        //     "icons": [
        //         {
        //             src: path.resolve('./public/favicon.ico'),
        //             sizes: [96] // multiple sizes
        //         },
        //         {
        //             src: path.resolve('./public/logo512.png'),
        //             sizes: [96, 128, 192, 256, 384, 512], // multiple sizes
        //             maskable: true,
        //         }


        //     ],
        //     "start_url": ".",
        //     "display": "standalone",
        //     "theme_color": "#44b700",
        //     "background_color": "#ffffff",
        //     // crossorigin: 'use-credentials', // can be null, use-credentials or anonymous
        //     inject: true,
        // }),
        new ModuleFederationPlugin({
            name: 'meshtastic',
            filename: 'remoteEntry.js',
            exposes: {
                './meshtastic': './src/App.tsx',
            },
            shared: { react: { singleton: true }, "react-dom": { singleton: true } }
        }),
    ],
};
