// AppAction.js

var ChatDispatcher = require('../dispatcher/ChatDispatcher');
var ChatlConstants = require('../constants/ChatConstants');

var AppAction = {
    // app
    appInit: function(users, threads, msgs){
        ChatDispatcher.handleViewAction({
            actionType: ChatlConstants.APP_INIT,
            users: users,
            threads: threads,
            msgs: msgs
        });
    },

    // thread
    changeThread: function(newId){
        ChatDispatcher.handleViewAction({
            actionType: ChatlConstants.CHANGE_THREAD,
            newId: newId
        });
    },


    // msg
    createMsg: function(text, msgId){
        ChatDispatcher.handleViewAction({
            actionType: ChatlConstants.MSG_CREATE,
            text: text,
            msgId: msgId
        })
    },
    receiveMsg: function(msgObj){
        ChatDispatcher.handlerServerAction({
            actionType: ChatlConstants.MSG_RECEIVE,
            msgObj: msgObj
        });
    }
};

module.exports = AppAction;