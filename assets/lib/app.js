/**
 * jsx comments: start with slice and two stars
 * 
 * @jsx React.DOM
 * 
 * it can be everwhere
 */
var React = require('react');

console.log('js file change will trigger: bundle by browserify & then trigger live reload');
// console.log('webpack bundle speed... ');

var ChatApp = require('./components/ChatApp.react.js');

React.renderComponent(<ChatApp />, document.querySelector('#chat-ctn'));



require('./demoModule/login');