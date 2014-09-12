/**
 * @jsx React.DOM
 */ 

 function buildMsgItem(msg){
            // <img src={msg.avatar} className="avatar" />
                // <span className="msg-user-name">{msg.alias}</span>
    return (
        <li className="msg-item">
            <img src={'./img/avatar/'+msg.user+'.png'} className="avatar" />
            <div className="msg-content">
                <span className="msg-user-name">{msg.user}</span>
                <span className="msg-text">{msg.word}</span>
            </div>
        </li>
        );
 }


var ChatWord = React.createClass({
    getInitialState: function(){
        return {};
    },
    componentDidUpdate: function(){
        // console.log(this.props.item.word);
    },
    render: function(){
        return buildMsgItem(this.props.item);
    }
});


module.exports = ChatWord;