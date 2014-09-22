module.exports = {
    // path must start with ./ relative 
    entry: './lib/app.js',
    output: {
        filename: './lib/bundle.js'
    },
    module: {
        loaders: [
            {test: /.js$/, loader: 'jsx-loader'}
        ]
    }
}