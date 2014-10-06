// msgData.js
var msgs = [
    {
        id: '707de863-0008-46c8-8b91-8829769373ac',
        text: '有什么简易的方法实现双向数据绑定吗?',
        time: '1411955000000',

        user: '7b6e1f55-1455-474e-984e-9681d87b4e8b',
        thread: 'c3cbdc38-669a-48f4-88e7-481646202d74'
    },
    {
        id: 'cbe474dc-604e-48e2-9e2d-63aaea7b53f6',
        text: '... 有难度, 对数据做出响应并更新视图, 这就是最近比较火热的reacitve的概念, 但是js这门语言不是reactive的, 所以需要自己去实现. 比如AngularJS的脏检查, 比如Avalon自己用defineProperty和重写数组的常用方法...',
        time: '1411956100000',

        user: '4aaf6cb7-35a1-413b-a80e-b45d00f8397c',
        thread: 'c3cbdc38-669a-48f4-88e7-481646202d74'
    },
    {
        id: '5529e8e5-23a5-481d-95c0-65cfcf153640',
        text: '好吧... 那我如果只做单向呢~? 数据修改后刷新视图...',
        time: '1411956500000',

        user: '7b6e1f55-1455-474e-984e-9681d87b4e8b',
        thread: 'c3cbdc38-669a-48f4-88e7-481646202d74'
    },
    {
        id: '6196bdb2-7d7a-4b5a-9731-f79c5905c34d',
        text: '我准备 : 数据的key,对应多个childNode,然后更新key,就直接找到相应的childNode,更新',
        time: '1411956900000',

        user: '7b6e1f55-1455-474e-984e-9681d87b4e8b',
        thread: 'c3cbdc38-669a-48f4-88e7-481646202d74'
    },
    {
        id: '34339c04-e09e-4e8c-a7bd-650efc529d56',
        text: 'nodeType 只要考虑1和3就行得',
        time: '1411956920000',

        user: '7b6e1f55-1455-474e-984e-9681d87b4e8b',
        thread: 'c3cbdc38-669a-48f4-88e7-481646202d74'
    },


    {
        id: '4e393689-2f98-4df2-9ad2-65409719cb1b',
        text: '你们要好好工作, 不要太想我',
        time: '1411928025000',

        user: '805487b4-bda8-4540-9a5c-182047c039ae',
        thread: '7f81c833-4971-44d4-9526-82900369a1a1'
    },
    {
        id: '3fa14320-b0bd-4def-a07c-9cf24fb4e516',
        text: '安心的走吧 不带走一片云彩',
        time: '1411928040000',

        user: '9c4d1442-c9bd-4ddb-9313-355bacdf570a',
        thread: '7f81c833-4971-44d4-9526-82900369a1a1'
    },
    {
        id: '913767da-2c48-4d68-932a-4feafa5e0b1c',
        text: '螃蟹也别带走```',
        time: '1411928072000',

        user: '4aaf6cb7-35a1-413b-a80e-b45d00f8397c',
        thread: '7f81c833-4971-44d4-9526-82900369a1a1'
    },
    {
        id: '429c1bc8-22e8-4d2f-afff-c851dbb2cfb4',
        text: '螃蟹带回去了 明天就要死了',
        time: '1411928075000',

        user: '5746ac1c-0bfa-4ae0-a2b2-074525c4446b',
        thread: '7f81c833-4971-44d4-9526-82900369a1a1'
    },


    {
        id: 'd6832567-8fb3-49f4-beac-5446d40be621',
        text: '亮亮 现在list页面所有条件 都是后台生成不同的链接来实现的，这次准备变成 后端在a标签上写key和value，然后所有条件js里用数据集中管理，最后点击某个条件的时候js根据数据组装结果链接跳转',
        time: '1411930845000',

        user: '9c4d1442-c9bd-4ddb-9313-355bacdf570a',
        thread: '6d64340f-d638-4e5f-9e6e-431b3ae9c814'
    },
    {
        id: 'a245c702-6106-4feb-bf32-006174ab0f7f',
        text: '咱改完之后 后端就不用重新去计算a的href了  每次都是一样的',
        time: '1411930955000',

        user: '4aaf6cb7-35a1-413b-a80e-b45d00f8397c',
        thread: '6d64340f-d638-4e5f-9e6e-431b3ae9c814'
    },
    {
        id: '1c3aface-cae0-4540-9319-4643b336d5b9',
        text: '只是列表的内容不一帮而已  是吧...?',
        time: '1411930965000',

        user: '4aaf6cb7-35a1-413b-a80e-b45d00f8397c',
        thread: '6d64340f-d638-4e5f-9e6e-431b3ae9c814'
    },
    {
        id: '3a667fc5-fbe9-47cf-9334-f2fe96cd953f',
        text: '我当时 是让后端 直接 构成了一个js对象.. 后来 觉得 你上面说得,才是最正规..',
        time: '1411930995000',

        user: '7b6e1f55-1455-474e-984e-9681d87b4e8b',
        thread: '6d64340f-d638-4e5f-9e6e-431b3ae9c814'
    }
];


module.exports = msgs;