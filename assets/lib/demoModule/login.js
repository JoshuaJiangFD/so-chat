// var input = $('#alias-input');
// var btn = $('#login-btn');
// input.on('keyup', function(e){
//     var val = input.val().trim();
//     if(val.length > 2){
//         btn.removeClass('disabled');
//     }
//     else{
//         btn.addClass('disabled');
//     }

//     if(e.keyCode === 13 && !btn.hasClass('disabled') ){
//         //- go login
//     }
// });





var users = require('../demoData/userData');
var AppAction = require('../actions/AppAction');
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

$('#login-btn').on('click', function(){
    if($(this).hasClass('disabled')){
        return false;
    }
    else{
        loginCallback(userSelect.val());
    }
});


function loginCallback(userId){
    AppAction.userLogin( userId );
    $('#login-module').removeClass('active');
}

loginCallback('4aaf6cb7-35a1-413b-a80e-b45d00f8397c');