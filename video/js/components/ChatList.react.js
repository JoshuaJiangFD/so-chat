/**
 * @jsx React.DOM
 */ 



var ChatStore = require('../stores/ChatStore.js')

var ChatWord = require('./ChatWord.react.js');

function getAllData(){
    return {
        list: ChatStore.getAll()
    };
};


var ChatList = React.createClass({
    getInitialState: function(){
        return getAllData();
    },
    componentDidMount: function() {
        ChatStore.addChangeListener( this._onChange );
    },
    componentWillMount: function() {
        ChatStore.removeChangeListener( this._onChange );
    },
    render: function(){
        var nodes = this.state.list.map(function(item, i){
            return <ChatWord item={item} key={i} />;
        });

        return <ul id="msg-list">{nodes}</ul>;
    },
    _onChange: function(){
        this.setState( getAllData() )
    }
});

module.exports = ChatList;