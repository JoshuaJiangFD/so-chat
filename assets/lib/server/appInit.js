// appInit.js
// get all data: users, threads, msgs

// use demo data as fetched from server
var users = require('../demoData/userData');
var threads = require('../demoData/threadData');
var msgs = require('../demoData/msgData');

var AppAction = require('../actions/AppAction');

function appInit(){
    AppAction.appInit( users, threads, msgs );
}

function getInitialData(cb){
    setTimeout(cb, 10);
}

exports.init = appInit;
exports.getInitialData = getInitialData;
// exports = appInit;