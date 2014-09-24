var EventEmitter = require('events').EventEmitter;
var merge = require('react/lib/merge');

var ChatDispatcher = require('../dispatcher/ChatDispatcher');
var ChatConstants = require('../constants/ChatConstants');

var UserStore = require('./UserStore');

var CHANGE_EVENT = 'change';


var MsgData = {
    0: {
        text: 'I\'m here~',
        user: UserStore.getById('me')
    },
    1: {
        text: '"Instagram-team是如何工作的" by Pete Hunt. pete总结"作为一个小团队"他们是如何构建大型web app的, 不止于react. 继续践行component可复用的开发模式. @小芋头君 @岱云欢 .@飞天小黑神猪 看看, 又引入了新的separate of concern工具... @Doraemon718 嗯 深度~',
        user: UserStore.getById('me')
    }
};

var _dataHandler = {
    // 当前用户创建新msg只需要传递内容
    create: function(text, msgId){
        var now = Date.now();
        MsgData[msgId] = {
            id: msgId,
            time: now,
            text: text,
            user: UserStore.getById('me')
        }
    },
    receive: function(msgObj){
        msgObj.user = UserStore.getById(msgObj.userId);
        MsgData[msgObj.id] = msgObj;
    }
};

var MsgStore = merge(EventEmitter.prototype, {
    getAll: function(){
        return MsgData;
    },
    emitChange: function(){
        this.emit(CHANGE_EVENT);
    },
    addChangeListener: function(callback){
        this.on(CHANGE_EVENT, callback)
    },
    removeChangeListener: function(callback){
        this.removeListener(CHANGE_EVENT, callback)
    }
});


// 在dispatcher 分发器上注册处理函数
// 针对不同的actionType调用不同的函数
// 最后统一做一次emitChange

// 注册更多的action handler: CRUD 
ChatDispatcher.register(function(payload){
    var action = payload.action;
    var text;

    switch(action.actionType){
        case ChatConstants.MSG_CREATE:
            text = action.text.trim();
            if( text !== '' ){
                _dataHandler.create(text, action.msgId);
            }
            break;
        case ChatConstants.MSG_RECEIVE:
            _dataHandler.receive( action.msgObj );
            break;
        default:
            console.log('no store handler registed on this action: ', action.actionType)
            break;
    }

    MsgStore.emitChange();
    return true;
});


module.exports = MsgStore;
