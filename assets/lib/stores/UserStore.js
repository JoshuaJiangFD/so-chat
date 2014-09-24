var EventEmitter = require('events').EventEmitter;
var merge = require('react/lib/merge');

var CHANGE_EVENT = 'change';

var UserData = {

};

// init
UserData.me = {
    alias: 'chenllos',
    id: 'me',
    avatar: '/img/avatar/chenllos.jpg'
}

var UserStore = merge(EventEmitter.prototypem, {
    getAll: function(){
        return UserData;
    },
    getById: function(id){
        return UserData[id];
    },
    emitChange: function(){
        this.emit(CHANGE_EVENT);
    },
    addChangeListener: function(cb){
        this.on(CHANGE_EVENT, cb);
    },
    removeChangeListener: function(cb){
        this.removeListener(CHANGE_EVENT, cb);
    }
});

module.exports = UserStore;