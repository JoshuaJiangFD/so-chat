/**
 * @jsx React.DOM
 */ 

var ChatList = require('./components/ChatList.react.js');
var MovieCtrl = require('./components/Movie.js');


React.renderComponent(<ChatList scrollEle="#msg-module"/>, $('#msg-module .list-ctn').get(0));


$('.simulate-video audio').on('play', function(){
    // setTimeout(function(){
        MovieCtrl.start();
    // }, 1500);
});