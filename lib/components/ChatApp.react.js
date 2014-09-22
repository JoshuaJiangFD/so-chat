/**
 * @jsx React.DOM
 */

var React = require('react');

var Resizeable = require('./Resizeable.react.js');


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

    render: function() {
        // these coms style should be set by ChatApp Component
        // and should response to Resizeable's resize
        var threadList = <div className="chat-thread-list" />;
        var dialog = <div className="chat-dialog" />;
        var compose = <div className="chat-compose" />;
        return (
            <Resizeable id="chat-window" verLeftNode={threadList} horTopNode={dialog} horBottomNode={compose}>
            </Resizeable>
        );
    }

});

module.exports = ChatApp;