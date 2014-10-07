// 原生模块
var http = require('http');

// 服务器相关
var express = require('express');
var morgan = require('morgan');
// 程序主体用到的第三方模块
var nodeJSX = require('node-jsx').install();
var react = require('react');

// 我的模块
var reactApp = require('./assets/lib/components/ChatApp.react.js');

// server初始化, set配置, 中间件
var app = express();
var server = http.Server(app);

app.set('view engine', 'jade');

app.use(morgan('dev'));
app.use( express.static(__dirname + "/assets") );


// 路由
app.get('/', function(req, res){
    res.render('index', {
        // comHTML: react.renderComponentToString(reactApp())
        comHTML: ''
    });
});


var port = 3030;
// must be server !  can not be app.listen 
// or socket.io can't start...
server.listen(port, function(){
    console.log('server is listening at:', port );
});


var socketChat = require('./backend/socketChat');
socketChat(server);