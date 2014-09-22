// 原生模块

// 服务器相关
var express = require('express');
var morgan = require('morgan');
// 程序主题用到的第三方模块
var nodeJSX = require('node-jsx').install();
var react = require('react');

// 我的模块
var reactApp = require('./lib/components/ChatApp.react.js');
// var reactApp = require('./lib/app');
// var jsxRequire = require('./backend/util/jsxRequire');

// set配置, 中间件
var app = express();
app.set('view engine', 'jade');

app.use(morgan('dev'));
app.use( express.static(__dirname + "/") );
// app.use(jsxRequire);

// 路由
app.get('/', function(req, res){
    res.render('index', {
        comHTML: react.renderComponentToString(reactApp())
    });
});


var port = 3030;
app.listen(port);
console.log('server is listening at:', port);