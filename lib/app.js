/**
 * jsx comments: start with slice and two stars
 * 
 * @jsx React.DOM
 * 
 * it can be everwhere
 */
var React = require('react');

console.log('js file change will trigger: bundle by browserify & then trigger live reload');
// console.log('fjalsjg');

var App = require('./components/TmplApp.react.js');

React.renderComponent(<App/>, document.getElementById('ctn'));