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

var AppAction = require('../actions/AppAction');

var ThreadStore = require('../stores/ThreadStore');

var Resizeable = require('./Resizeable.react');
var ThreadList = require('./ThreadList.react');
var Dialog = require('./MsgList.react');
var Compose = require('./Compose.react');

var socketMsg = require('../server/Msg');
var AppServer = require('../server/appInit');

// AppServer.getInitialData(function(){
//     AppServer.init();
// });


var ChatApp = React.createClass({
    getInitialState: function(){
        return {
            threadW: 150,
            dialogH: 350,
            composeH: 150
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
        var threadStyle = {
            float: 'left',
            width: this.state.threadW + 'px'
        };
        var dialogStyle = {
            marginLeft: this.state.threadW + 'px',
            height: this.state.dialogH + 'px'
        };
        var compostStyle = {
            marginLeft: this.state.threadW + 'px',
            height: this.state.composeH + 'px'
        };

        return (
            <Resizeable id="chat-window"
                verLeftNode={<ThreadList style={threadStyle}/>}
                horTopNode={<Dialog style={dialogStyle} />}
                horBottomNode={<Compose style={compostStyle} textsHandler={this._sendMsg}/>}

                verMoveValidator={this._resizeVerValidate}
                verMoveCallback={this._resizeVerCB}

                horMoveValidator={this._resizeHorValidate}
                horMoveCallback={this._resizeHorCB}
            >

            </Resizeable>
        );
    },
    _resizeVerValidate: function(lw, rw){
        if( lw < 100 || rw< 200 ){
            return false;
        }
        return true;
    },
    _resizeVerCB: function(lw, rw){
        this.setState({threadW: lw});
    },
    _resizeHorValidate: function(th, bh){
        if( bh > 250 ){
            return false;
        }
        return true;
    },
    _resizeHorCB: function(th, bh){
        this.setState({
            dialogH: th,
            composeH: bh
        });
    },
    _sendMsg: function(text){
        var newMsgId = uuid.v4();
        var curThread = ThreadStore.getCurThread();
        var curUser = '4aaf6cb7-35a1-413b-a80e-b45d00f8397c';
        AppAction.createMsg(text, newMsgId, curThread, curUser);
    }
});

module.exports = ChatApp;