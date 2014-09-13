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

var scollEle = null, lastScrollHeight = 0;
function checkAndScroll(){
    var newH = scollEle.scrollHeight;
    if( newH > lastScrollHeight ){
        scollEle.scrollTop = newH;
        lastScrollHeight = newH;
    }
}

var ChatList = React.createClass({
    getInitialState: function(){
        return getAllData();
    },
    componentDidMount: function() {
        scollEle = $(this.props.scrollEle).get(0);
        checkAndScroll();
        // lastScrollHeight = scollEle.scrollHeight;
        ChatStore.addChangeListener( this._onChange );
    },
    componentDidUpdate: function(){
        checkAndScroll();
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