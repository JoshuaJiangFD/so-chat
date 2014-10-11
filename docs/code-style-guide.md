## 编码风格
### 三剑客技术
* 使用less代替css
* 使用原生的js
* 使用jade代替html

### 缩进
less/js/jade均使用**4个空格**缩进, 使代码有更明显的层级. 尽量避免太深的层级和过长的一行代码.

### 代码模块划分
遵从unix的思想, 一个模块/方法专注于完成一件事. 具体可以参见已有的代码.

### 构建工具
暂定为gulp, webpack还用不好...

    // 启动开发环境
    gulp wd
    
    // 部署前编译构建
    gulp
前端js代码使用的是cmd规范

### 增加依赖模块
在保证程序独立性()的前提下, 可以自由添加node模块, 请使用:

    npm install moduleName --save
添加到`package.json`依赖列表.