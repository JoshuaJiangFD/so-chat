
var ChatDispatcher = require('../dispatcher/ChatDispatcher');
var ChatConstants = require('../constants/ChatConstants');

var UserStore = require('../stores/UserStore');
var AppAction = require('../actions/AppAction');

var _socket = null;


function sendMsgToServer(msgObj){
    _socket.emit('msg', msgObj);
};

function bind(){
    _socket.on('msg-others', function(msg){
        AppAction.receiveMsg(msg);
    });
}


ChatDispatcher.register(function(payload){
    var action = payload.action;
    var actionType = action.actionType;

    switch(actionType){
        case ChatConstants.MSG_CREATE:
            var msgObj = action.msgObj;
            if(msgObj.text.trim() !== ''){
                sendMsgToServer(msgObj);
            }
            break;
    }

    // do nothing... 
});


exports.init = function(socket){
    _socket = socket;
    bind();
}