
// 声明所有的action
// 由哪个dispatcher负责分发
// 分发的payload中的actionType是什么
// 这个action所需要的参数, 接收并传给分发器

var TmplDispatcher = require('../dispatcher/TmplDispatcher');
var TmplConstants = require('../constants/TmplConstants');

var TmplActions = {
    create: function(text){
        TmplDispatcher.handleViewAction({
            actionType: TmplConstants.XX_CREATE,
            text: text
        })
    },
    update: function(id, updates){
        TmplDispatcher.handleViewAction({
            actionType: TmplConstants.XX_CREATE,
            id: id,
            updates: updates
        });
    }
};


module.exports = TmplActions;

