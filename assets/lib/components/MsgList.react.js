/**
 * @jsx React.DOM
 */


/*
 * 渲染消息/对话列表
 * 
 * 
 */
var React = require('react');

var UserStore = require('../stores/UserStore.js');
var MsgStore = require('../stores/MsgStore.js');

function getAllMsg(){
    return {
        msgData: MsgStore.getAll() 
    };
};

var MsgList = React.createClass({
    getInitialState: function() {
        return getAllMsg();
    },
    componentDidMount: function() {
        MsgStore.addChangeListener( this.updateAllMsg );
    },
    componentWillUnmount: function() {
        MsgStore.removeChangeListener( this.updateAllMsg );
    },
    render: function() {
        var msgItems = [];
        for(var i in this.state.msgData){
            var msg = this.state.msgData[i];
            var node = (
                <li className="msg-item" key={i}>
                    <img className="msg-user-avatar" src={msg.user.avatar} />
                    <p className="msg-user-name">{msg.user.alias}</p>
                    <p className="msg-text">{msg.text}</p>
                </li>
            );
            msgItems.push( node );
        }

        return (
            <ol className="msg-list">
                {msgItems}
            </ol>
        );
    },
    updateAllMsg: function(){
        this.setState( getAllMsg() );
    }
});

module.exports = MsgList;