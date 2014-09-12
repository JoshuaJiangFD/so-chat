/**
 * @jsx React.DOM
 */ 

var ChatList = require('./components/ChatList.react.js');
var MovieCtrl = require('./components/Movie.js');


React.renderComponent(<ChatList />, $('#list-ctn').get(0));

setTimeout(function(){
    // MovieCtrl.start();
}, 1000);
