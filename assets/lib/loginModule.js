(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// userData.js

var users = [
    {
        id: '9c4d1442-c9bd-4ddb-9313-355bacdf570a',
        alias: '芋头',
        avatar: 'yutou.jpg',
        mail: ''
    },
    {
        id: '7b6e1f55-1455-474e-984e-9681d87b4e8b',
        alias: '神猪',
        avatar: 'godPig.jpg',
        mail: ''
    },
    {
        id: '805487b4-bda8-4540-9a5c-182047c039ae',
        alias: '妹子',
        avatar: 'mm.jpg',
        mail: ''
    },
    {
        id: '5746ac1c-0bfa-4ae0-a2b2-074525c4446b',
        alias: '兵兵',
        avatar: 'bingbing.png',
        mail: ''
    },
    {
        id: '4aaf6cb7-35a1-413b-a80e-b45d00f8397c',
        alias: 'chenllos',
        avatar: 'chenllos.jpg',
        mail: ''
    }
];

function normalizeAvatar(picName){
    return '/img/avatar/' + picName;
}

users.forEach(function(u){
    u.avatar = normalizeAvatar(u.avatar);
});

module.exports = users;
},{}],2:[function(require,module,exports){
var users = require('../demoData/userData');
// console.log(users);

var optArr = users.map(function(u, i, arr){
    // console.log(u.alias);
    return '<option value="'+ u.id +'">' + u.alias + '</option>';
});

var userSelect = $('#choose-user');
userSelect.html( '<option></option>' + optArr.join('') );

userSelect.on('change', function(){
    if(userSelect.val() != '' && userSelect.val() != 'undefined'){
        $('#login-btn').removeClass('disabled');
    }
    else{
        $('#login-btn').addClass('disabled');
    }
});
},{"../demoData/userData":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9hc3NldHMvbGliL2RlbW9EYXRhL3VzZXJEYXRhLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9hc3NldHMvbGliL2RlbW9Nb2R1bGUvZmFrZV84NWZkNzcxLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gdXNlckRhdGEuanNcblxudmFyIHVzZXJzID0gW1xuICAgIHtcbiAgICAgICAgaWQ6ICc5YzRkMTQ0Mi1jOWJkLTRkZGItOTMxMy0zNTViYWNkZjU3MGEnLFxuICAgICAgICBhbGlhczogJ+iKi+WktCcsXG4gICAgICAgIGF2YXRhcjogJ3l1dG91LmpwZycsXG4gICAgICAgIG1haWw6ICcnXG4gICAgfSxcbiAgICB7XG4gICAgICAgIGlkOiAnN2I2ZTFmNTUtMTQ1NS00NzRlLTk4NGUtOTY4MWQ4N2I0ZThiJyxcbiAgICAgICAgYWxpYXM6ICfnpZ7njKonLFxuICAgICAgICBhdmF0YXI6ICdnb2RQaWcuanBnJyxcbiAgICAgICAgbWFpbDogJydcbiAgICB9LFxuICAgIHtcbiAgICAgICAgaWQ6ICc4MDU0ODdiNC1iZGE4LTQ1NDAtOWE1Yy0xODIwNDdjMDM5YWUnLFxuICAgICAgICBhbGlhczogJ+WmueWtkCcsXG4gICAgICAgIGF2YXRhcjogJ21tLmpwZycsXG4gICAgICAgIG1haWw6ICcnXG4gICAgfSxcbiAgICB7XG4gICAgICAgIGlkOiAnNTc0NmFjMWMtMGJmYS00YWUwLWEyYjItMDc0NTI1YzQ0NDZiJyxcbiAgICAgICAgYWxpYXM6ICflhbXlhbUnLFxuICAgICAgICBhdmF0YXI6ICdiaW5nYmluZy5wbmcnLFxuICAgICAgICBtYWlsOiAnJ1xuICAgIH0sXG4gICAge1xuICAgICAgICBpZDogJzRhYWY2Y2I3LTM1YTEtNDEzYi1hODBlLWI0NWQwMGY4Mzk3YycsXG4gICAgICAgIGFsaWFzOiAnY2hlbmxsb3MnLFxuICAgICAgICBhdmF0YXI6ICdjaGVubGxvcy5qcGcnLFxuICAgICAgICBtYWlsOiAnJ1xuICAgIH1cbl07XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUF2YXRhcihwaWNOYW1lKXtcbiAgICByZXR1cm4gJy9pbWcvYXZhdGFyLycgKyBwaWNOYW1lO1xufVxuXG51c2Vycy5mb3JFYWNoKGZ1bmN0aW9uKHUpe1xuICAgIHUuYXZhdGFyID0gbm9ybWFsaXplQXZhdGFyKHUuYXZhdGFyKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHVzZXJzOyIsInZhciB1c2VycyA9IHJlcXVpcmUoJy4uL2RlbW9EYXRhL3VzZXJEYXRhJyk7XG4vLyBjb25zb2xlLmxvZyh1c2Vycyk7XG5cbnZhciBvcHRBcnIgPSB1c2Vycy5tYXAoZnVuY3Rpb24odSwgaSwgYXJyKXtcbiAgICAvLyBjb25zb2xlLmxvZyh1LmFsaWFzKTtcbiAgICByZXR1cm4gJzxvcHRpb24gdmFsdWU9XCInKyB1LmlkICsnXCI+JyArIHUuYWxpYXMgKyAnPC9vcHRpb24+Jztcbn0pO1xuXG52YXIgdXNlclNlbGVjdCA9ICQoJyNjaG9vc2UtdXNlcicpO1xudXNlclNlbGVjdC5odG1sKCAnPG9wdGlvbj48L29wdGlvbj4nICsgb3B0QXJyLmpvaW4oJycpICk7XG5cbnVzZXJTZWxlY3Qub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCl7XG4gICAgaWYodXNlclNlbGVjdC52YWwoKSAhPSAnJyAmJiB1c2VyU2VsZWN0LnZhbCgpICE9ICd1bmRlZmluZWQnKXtcbiAgICAgICAgJCgnI2xvZ2luLWJ0bicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH1cbiAgICBlbHNle1xuICAgICAgICAkKCcjbG9naW4tYnRuJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfVxufSk7Il19
