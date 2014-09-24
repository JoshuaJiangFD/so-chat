
var ChatDispatcher = require('../dispatcher/ChatDispatcher');
var ChatConstants = require('../constants/ChatConstants');

var UserStore = require('../stores/UserStore');
var MsgAction = require('../actions/MsgAction');

var _socket = null;


function sendMsgToServer(text, msgId){
    var msgObj = {
        text: text,
        userId: UserStore.getById('me').id,
        time: Date.now(),
        id: msgId
    };
    _socket.emit('msg', msgObj);
};

function bind(){
    _socket.on('msg-others', function(msg){
        MsgAction.receive(msg);
    });
}


ChatDispatcher.register(function(payload){
    var action = payload.action;
    var actionType = action.actionType;

    switch(actionType){
        case ChatConstants.MSG_CREATE:
            var text = action.text.trim();
            if(text !== ''){
                sendMsgToServer(text, action.msgId);
            }
            break;
    }

    // do nothing... 
});


exports.init = function(socket){
    _socket = socket;
    bind();
}