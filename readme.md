## kfc means Kai Fang Chat

## feature
* server side & client side react-stack rendering
* free server integration: based on basic http server

## start demo or developing
you should have `nodejs` and `gulp` installed, then go to repo folder run

    npm install
    gulp
    // if dev, run gulp wd
    node server.js

these will start a express server at :3030, and build bundle.js for front end app.

then visit [http://localhost:3030](http://localhost:3003) in your browser

## flaw
gulp 与 browserify 微慢, 600k+的文件构建居然需要~2s, 然后才会触发live-reload, 想办法解决一下...