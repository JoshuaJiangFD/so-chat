/**
 * @jsx React.DOM
 */
var React = require('react');
var TmplStore = require('../stores/TmplStore');
var TmplAction = require('../actions/TmplAction');


function getAllData(){
    return {};
    // return TmplStore.getAllData();
}

var startTime = null, timer = null;

var TmplApp = React.createClass({
    getInitialState: function(){
        // return getAllData();
        return {
            past: 0
        }
    },
    componentDidMount: function() {
        // add and remove listener
        // should pass the defined callback function
        // rather than an anonymous function
        // cause two anonymous functions for add and remove are not the same object
        TmplStore.addChangeListener(this._onChange);
        startTime = Date.now();
        this._timeCounter();
    },
    componentWillUnmount: function() {
        TmplStore.removeChangeListener(this._onChange);
    },
    render: function(){
        return (
            <div>
                <p>Here is the app rendered contents</p>
                <p>time had past <span>{this.state.past}</span> seconds after componentDidMount.</p>
            </div>
        );
    },
    _onChange: function(){
        this.setState(getAllData());
    },
    _timeCounter: function(){
        var self = this;
        timer = setInterval(function(){
            var curTime = Date.now();
            var past = (Math.floor((curTime - startTime)/100))/10;
            if(Math.floor(past) == past){
                past = past + '.0';
            }
            self.setState({
                past: past
                // past: curTime - startTime
            })
        }, 100);
    }
});


module.exports = TmplApp;