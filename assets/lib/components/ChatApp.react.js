/**
 * @jsx React.DOM
 */

/*
 * 整合多个组件 构建chat应用
 * 
 * 
 */


// var socket = null

var React = require('react');
var uuid = require('node-uuid');

var MsgAction = require('../actions/MsgAction');

var Resizeable = require('./Resizeable.react');
var ThreadList = require('./ThreadList.react');
var Dialog = require('./MsgList.react');
var Compose = require('./Compose.react');

var socketMsg = require('../socket/Msg'); 


var ChatApp = React.createClass({
    getInitialState: function(){
        return {
            // leftW: 150,
            // topH: 
        }
    },
    responseToResize: function(){
        // response to resize
        // change state's style
        // rerender
    },
    componentDidMount: function() {
        if(window && window.io){
            // io.connect();
            var socket = io();
            socketMsg.init( socket );
            // io.connect('http://localhost:3030');
        }
        else{
            console.log('env has no client socket.io');
        }
    },
    render: function() {
        // these coms style should be set by ChatApp Component
        // and should response to Resizeable's resize
        return (
            <Resizeable id="chat-window"
                verLeftNode={<ThreadList />}
                horTopNode={<Dialog />}
                horBottomNode={<Compose textsHandler={this._sendMsg}/>}

                verMoveCallback={this._resizeVerCB}
                horMoveCallback={this._resizeHorCB}
            >

            </Resizeable>
        );
    },
    _resizeVerCB: function(){

    },
    _resizeHorCB: function(){

    },
    _sendMsg: function(text){
        var newMsgId = uuid.v4();
        MsgAction.create(text, newMsgId);
    }


});

module.exports = ChatApp;