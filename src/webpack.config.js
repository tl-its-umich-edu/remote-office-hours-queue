const path = require('path')
const BundleTracker = require('webpack-bundle-tracker')

module.exports = {
    entry: path.join(__dirname, 'assets/src/index'),
    output: {
        path: path.join(__dirname, 'assets/dist'),
        filename: '[name]-[fullhash].js'
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx"]
    },
    stats: {
        errorDetails: true
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
                options: {
                    configFile: path.join(__dirname, 'tsconfig.json')
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    devtool: 'inline-source-map',
    plugins: [
        new BundleTracker({
            path: __dirname,
            filename: 'webpack-stats.json'
        })
    ]
}
