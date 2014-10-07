var webpack = require('webpack');

module.exports = {
    // path must start with ./ relative 
    entry: [
        './assets/lib/app.js'
    ],
    output: {
        // filename: './assets/lib/bundle.js',
        path: __dirname,
        filename: './assets/lib/bundle.js',
        publicPath: '/lib/'
    },
    compress: true,
    module: {
        loaders: [
            {test: /.js$/, loader: 'jsx'},
            {test: /.less$/, loader: 'style-loader!css-loader!less-loader'}
        ]
    }
}