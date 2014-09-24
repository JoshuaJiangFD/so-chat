/**
 * @jsx React.DOM
 */

/*
 * 编写内容的区域
 *      最初只是一个content-editable的容器
 *      慢慢可以增加 拖拽支持
 *              表情支持
 *              粘贴支持
 *              页面内截图
 *      都是基于"selection插入"
 */

var React = require('react');

var Compose = React.createClass({
    propTypes: {
        textsHandler: React.PropTypes.func.isRequired
    },

    render: function() {
        return (
            <div className="compose-ctn">
                <input type="text" className="compose-input" onKeyDown={this._keyDownHandler}/>
            </div>
        );
    },
    _keyDownHandler: function(e){
        if(e.keyCode === 13){
            var text = e.target.value;
            // console.log(text);
            this.props.textsHandler(text);
            e.target.value = '';
        }
    }
});

module.exports = Compose;