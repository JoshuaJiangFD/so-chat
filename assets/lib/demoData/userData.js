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