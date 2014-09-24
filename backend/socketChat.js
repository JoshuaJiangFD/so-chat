var socketIO = require('socket.io');

var io = null;
function log(l){
    console.log('SOCKET.IO: ', l);
}
function bind(){
    io.on('connection', function(socket){
        log('a new user connected');

        socket.on('msg', function(data){
            handler.receiveAndBroadCast(socket, data);
        });

        socket.on('disconnect', function(){
            log('a user logged out...')
        });
    });
}


var handler = {
    receiveAndBroadCast: function(socket, msgObj){
        // log(msgObj);
        // 时间修正... 有必要吗
        var serverTime = Date.now();
        var timeDis = serverTime - msgObj.time;
        if( timeDis < 0 || timeDis > 60*1000 ){
            msgObj.time = serverTime;
        }
        // save to db...
        socket.broadcast.emit('msg-others', msgObj);
        // socket.emit('msg-others', msgObj);
    }
}

module.exports = function(server){
    io = socketIO(server);
    bind();
}