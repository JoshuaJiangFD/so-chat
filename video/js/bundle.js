(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule copyProperties
 */

/**
 * Copy properties from one or more objects (up to 5) into the first object.
 * This is a shallow copy. It mutates the first object and also returns it.
 *
 * NOTE: `arguments` has a very significant performance penalty, which is why
 * we don't support unlimited arguments.
 */
function copyProperties(obj, a, b, c, d, e, f) {
  obj = obj || {};

  if ("production" !== process.env.NODE_ENV) {
    if (f) {
      throw new Error('Too many arguments passed to copyProperties');
    }
  }

  var args = [a, b, c, d, e];
  var ii = 0, v;
  while (args[ii]) {
    v = args[ii++];
    for (var k in v) {
      obj[k] = v[k];
    }

    // IE ignores toString in object iteration.. See:
    // webreflection.blogspot.com/2007/07/quick-fix-internet-explorer-and.html
    if (v.hasOwnProperty && v.hasOwnProperty('toString') &&
        (typeof v.toString != 'undefined') && (obj.toString !== v.toString)) {
      obj.toString = v.toString;
    }
  }

  return obj;
}

module.exports = copyProperties;

}).call(this,require("oMfpAn"))
},{"oMfpAn":2}],4:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if ("production" !== process.env.NODE_ENV) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

}).call(this,require("oMfpAn"))
},{"oMfpAn":2}],5:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule keyMirror
 * @typechecks static-only
 */

"use strict";

var invariant = require("./invariant");

/**
 * Constructs an enumeration with keys equal to their value.
 *
 * For example:
 *
 *   var COLORS = keyMirror({blue: null, red: null});
 *   var myColor = COLORS.blue;
 *   var isColorValid = !!COLORS[myColor];
 *
 * The last line could not be performed if the values of the generated enum were
 * not equal to their keys.
 *
 *   Input:  {key1: val1, key2: val2}
 *   Output: {key1: key1, key2: key2}
 *
 * @param {object} obj
 * @return {object}
 */
var keyMirror = function(obj) {
  var ret = {};
  var key;
  ("production" !== process.env.NODE_ENV ? invariant(
    obj instanceof Object && !Array.isArray(obj),
    'keyMirror(...): Argument must be an object.'
  ) : invariant(obj instanceof Object && !Array.isArray(obj)));
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    ret[key] = key;
  }
  return ret;
};

module.exports = keyMirror;

}).call(this,require("oMfpAn"))
},{"./invariant":4,"oMfpAn":2}],6:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule merge
 */

"use strict";

var mergeInto = require("./mergeInto");

/**
 * Shallow merges two structures into a return value, without mutating either.
 *
 * @param {?object} one Optional object with properties to merge from.
 * @param {?object} two Optional object with properties to merge from.
 * @return {object} The shallow extension of one by two.
 */
var merge = function(one, two) {
  var result = {};
  mergeInto(result, one);
  mergeInto(result, two);
  return result;
};

module.exports = merge;

},{"./mergeInto":8}],7:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule mergeHelpers
 *
 * requiresPolyfills: Array.isArray
 */

"use strict";

var invariant = require("./invariant");
var keyMirror = require("./keyMirror");

/**
 * Maximum number of levels to traverse. Will catch circular structures.
 * @const
 */
var MAX_MERGE_DEPTH = 36;

/**
 * We won't worry about edge cases like new String('x') or new Boolean(true).
 * Functions are considered terminals, and arrays are not.
 * @param {*} o The item/object/value to test.
 * @return {boolean} true iff the argument is a terminal.
 */
var isTerminal = function(o) {
  return typeof o !== 'object' || o === null;
};

var mergeHelpers = {

  MAX_MERGE_DEPTH: MAX_MERGE_DEPTH,

  isTerminal: isTerminal,

  /**
   * Converts null/undefined values into empty object.
   *
   * @param {?Object=} arg Argument to be normalized (nullable optional)
   * @return {!Object}
   */
  normalizeMergeArg: function(arg) {
    return arg === undefined || arg === null ? {} : arg;
  },

  /**
   * If merging Arrays, a merge strategy *must* be supplied. If not, it is
   * likely the caller's fault. If this function is ever called with anything
   * but `one` and `two` being `Array`s, it is the fault of the merge utilities.
   *
   * @param {*} one Array to merge into.
   * @param {*} two Array to merge from.
   */
  checkMergeArrayArgs: function(one, two) {
    ("production" !== process.env.NODE_ENV ? invariant(
      Array.isArray(one) && Array.isArray(two),
      'Tried to merge arrays, instead got %s and %s.',
      one,
      two
    ) : invariant(Array.isArray(one) && Array.isArray(two)));
  },

  /**
   * @param {*} one Object to merge into.
   * @param {*} two Object to merge from.
   */
  checkMergeObjectArgs: function(one, two) {
    mergeHelpers.checkMergeObjectArg(one);
    mergeHelpers.checkMergeObjectArg(two);
  },

  /**
   * @param {*} arg
   */
  checkMergeObjectArg: function(arg) {
    ("production" !== process.env.NODE_ENV ? invariant(
      !isTerminal(arg) && !Array.isArray(arg),
      'Tried to merge an object, instead got %s.',
      arg
    ) : invariant(!isTerminal(arg) && !Array.isArray(arg)));
  },

  /**
   * @param {*} arg
   */
  checkMergeIntoObjectArg: function(arg) {
    ("production" !== process.env.NODE_ENV ? invariant(
      (!isTerminal(arg) || typeof arg === 'function') && !Array.isArray(arg),
      'Tried to merge into an object, instead got %s.',
      arg
    ) : invariant((!isTerminal(arg) || typeof arg === 'function') && !Array.isArray(arg)));
  },

  /**
   * Checks that a merge was not given a circular object or an object that had
   * too great of depth.
   *
   * @param {number} Level of recursion to validate against maximum.
   */
  checkMergeLevel: function(level) {
    ("production" !== process.env.NODE_ENV ? invariant(
      level < MAX_MERGE_DEPTH,
      'Maximum deep merge depth exceeded. You may be attempting to merge ' +
      'circular structures in an unsupported way.'
    ) : invariant(level < MAX_MERGE_DEPTH));
  },

  /**
   * Checks that the supplied merge strategy is valid.
   *
   * @param {string} Array merge strategy.
   */
  checkArrayStrategy: function(strategy) {
    ("production" !== process.env.NODE_ENV ? invariant(
      strategy === undefined || strategy in mergeHelpers.ArrayStrategies,
      'You must provide an array strategy to deep merge functions to ' +
      'instruct the deep merge how to resolve merging two arrays.'
    ) : invariant(strategy === undefined || strategy in mergeHelpers.ArrayStrategies));
  },

  /**
   * Set of possible behaviors of merge algorithms when encountering two Arrays
   * that must be merged together.
   * - `clobber`: The left `Array` is ignored.
   * - `indexByIndex`: The result is achieved by recursively deep merging at
   *   each index. (not yet supported.)
   */
  ArrayStrategies: keyMirror({
    Clobber: true,
    IndexByIndex: true
  })

};

module.exports = mergeHelpers;

}).call(this,require("oMfpAn"))
},{"./invariant":4,"./keyMirror":5,"oMfpAn":2}],8:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @providesModule mergeInto
 * @typechecks static-only
 */

"use strict";

var mergeHelpers = require("./mergeHelpers");

var checkMergeObjectArg = mergeHelpers.checkMergeObjectArg;
var checkMergeIntoObjectArg = mergeHelpers.checkMergeIntoObjectArg;

/**
 * Shallow merges two structures by mutating the first parameter.
 *
 * @param {object|function} one Object to be merged into.
 * @param {?object} two Optional object with properties to merge from.
 */
function mergeInto(one, two) {
  checkMergeIntoObjectArg(one);
  if (two != null) {
    checkMergeObjectArg(two);
    for (var key in two) {
      if (!two.hasOwnProperty(key)) {
        continue;
      }
      one[key] = two[key];
    }
  }
}

module.exports = mergeInto;

},{"./mergeHelpers":7}],9:[function(require,module,exports){

// 声明所有的action
// 由哪个dispatcher负责分发
// 分发的payload中的actionType是什么
// 这个action所需要的参数, 接收并传给分发器

var ChatDispatcher = require('../dispatcher/ChatDispatcher');
var ChatConstants = require('../constants/ChatConstants');

var MovieActions = {
    // start time as id
    create: function(word, id){
        ChatDispatcher.handleMovieAction({
            actionType: ChatConstants.WORD_CREATE,
            word: word,
            id: id
        })
    },
    update: function(id, updates){
        ChatDispatcher.handleMovieAction({
            actionType: ChatConstants.WORD_UPDATE,
            id: id,
            updates: updates
        });
    }
};


module.exports = MovieActions;


},{"../constants/ChatConstants":13,"../dispatcher/ChatDispatcher":16}],10:[function(require,module,exports){
/**
 * @jsx React.DOM
 */ 



var ChatStore = require('../stores/ChatStore.js')

var ChatWord = require('./ChatWord.react.js');

function getAllData(){
    return {
        list: ChatStore.getAll()
    };
};

var scollEle = null, lastScrollHeight = 0;
function checkAndScroll(){
    var newH = scollEle.scrollHeight;
    if( newH > lastScrollHeight ){
        scollEle.scrollTop = newH;
        lastScrollHeight = newH;
    }
}

var ChatList = React.createClass({displayName: 'ChatList',
    getInitialState: function(){
        return getAllData();
    },
    componentDidMount: function() {
        scollEle = $(this.props.scrollEle).get(0);
        checkAndScroll();
        // lastScrollHeight = scollEle.scrollHeight;
        ChatStore.addChangeListener( this._onChange );
    },
    componentDidUpdate: function(){
        checkAndScroll();
    },
    componentWillMount: function() {
        ChatStore.removeChangeListener( this._onChange );
    },
    render: function(){
        var nodes = this.state.list.map(function(item, i){
            return ChatWord({item: item, key: i});
        });

        return React.DOM.ul({id: "msg-list"}, nodes);
    },
    _onChange: function(){
        this.setState( getAllData() )
    }
});

module.exports = ChatList;
},{"../stores/ChatStore.js":20,"./ChatWord.react.js":11}],11:[function(require,module,exports){
/**
 * @jsx React.DOM
 */ 

 function buildMsgItem(msg){
    return (
        React.DOM.li({className: "msg-item"}, 
            React.DOM.img({src: msg.avatar, className: "avatar"}), 
            React.DOM.div({className: "msg-content"}, 
                React.DOM.span({className: "msg-user-name"}, msg.alias), 
                React.DOM.span({className: "msg-text"}, msg.word)
            )
        )
        );
    // return (
    //     <li className="msg-item">
    //         <img src={'./img/avatar/'+msg.user+'.png'} className="avatar" />
    //         <div className="msg-content">
    //             <span className="msg-user-name">{msg.user}</span>
    //             <span className="msg-text">{msg.word}</span>
    //         </div>
    //     </li>
    //     );
 }


var ChatWord = React.createClass({displayName: 'ChatWord',
    getInitialState: function(){
        return {};
    },
    componentDidUpdate: function(){
        // console.log(this.props.item.word);
    },
    render: function(){
        return buildMsgItem(this.props.item);
    }
});


module.exports = ChatWord;
},{}],12:[function(require,module,exports){


var MovieAction = require('../actions/MovieAction.js');
var dialogData = require('../data/dialogData.js');
var userData = require('../data/userData.js');
// source data: dialog

function getUserInfo(identifer){
    return userData[identifer];
}

// string word, duration of ms, offset of ms
function typeWords(word, dur, offSet, callback){
    if(!offSet){
        offSet = 0;
    }
    var arr = word.split('');

    arr.forEach(function(el, i){
        (function(index){
            callback( word.substr(0, 1) );
            setTimeout(function(){
                callback(word.substr(0, index+1));
            }, (dur*(index+1)/arr.length) + offSet);
            
        })(i);
    });
}


var MovieCtrl = {
    start: function(){
        // setTimeout and send action...
        for( var i in dialogData ){
            (function(key){
                var timeout = key;
                var id = key;
                setTimeout(function(){
                    var item = dialogData[key];
                    var userInfo = getUserInfo(item.user);
                    MovieAction.create({
                        alias: userInfo.alias,
                        avatar: 'img/avatar/'+userInfo.avatar,
                        word: ''
                    }, id);

                    (function(str, dur, offset){
                        var diaID = offset;
                        typeWords(str, dur, 0, function(partial){
                            MovieAction.update( diaID, {word: partial} );
                        });
                    })(item.word, item.dur, Number(timeout));

                },timeout);
            })(i);
        }
    }
};

module.exports = MovieCtrl;
},{"../actions/MovieAction.js":9,"../data/dialogData.js":14,"../data/userData.js":15}],13:[function(require,module,exports){
var keyMirror = require('react/lib/keyMirror');

module.exports = keyMirror({
    WORD_CREATE: null,
    WORD_UPDATE: null
});
},{"react/lib/keyMirror":5}],14:[function(require,module,exports){
var data = {
    2247: {
        user: 'mark',
        word: 'I think I\'ve come up with something...',
        dur: 3561 - 2347
    },
    3640: {
        user: 'wardo',
        word: 'that looks good. That looks really good.',
        dur: 5285 - 3640
    },
    5420: {
        user: 'mark',
        word: 'It\'s gonna be online any second.',
        dur:  6570 - 5420
    },
    6650: {
        user: 'dustin',
        word: 'Who should we send it to first?',
        dur: 7491 - 6650
    },
    7690: {
        user: 'mark',
        word: 'Just a couple of people... The question is... who are they gonna send it to?',
        dur: 10223 - 7690
    },
    10325: {
        user: 'mary',
        word: 'The site got 2,200 hits within two hours???',
        dur: 12952 - 10325
    },
    13053: {
        user: 'mark',
        word: 'THOUSAND... 22,000.',
        dur: 14576 - 13053
    },
    14600: {
        user: 'mary',
        word: 'WOW!',
        dur: 14700 - 14600
    },
    14900: {
        user: 'erica',
        word: 'You called me a BITCH on the Internet.',
        dur: 16280 - 14900
    },
    16390: {
        user: 'mark',
        word: 'Doesn\'t anybody have a sense of humor?',
        dur: 17306 - 16390
    },
    17380: {
        user: 'erica',
        word: 'The Internet\'s not written in pencil, Mark, it\'s written in ink.',
        dur:  19370 - 17380
    },
    19560: {
        user: 'wardo',
        word: 'u think maybe we shouldn\'t shut it down before we get into trouble?',
        dur: 21600 - 19560
    },
    21680: {
        user: 'divya',
        word: 'He stole our website!!!',
        dur: 22480 - 21680
    },
    22600: {
        user: 'wardo',
        word: 'They\'re saying that we stole The Facebook',
        dur: 23980 - 22600
    },
    24200: {
        user: 'mark',
        word: 'I KNOW what it says.',
        dur: 24900 - 24200
    },
    25000: {
        user: 'wardo',
        word: 'so did we???',
        dur: 25320 - 25000
    },
    25550: {
        user: 'mark',
        word: 'They came to me with an idea, I had a better one.',
        dur: 26950 - 25550
    },
    27050: {
        user: 'chris',
        word: 'He made The Facebook?',
        dur: 27820 - 27050
    },
    27880: {
        user: 'dustin',
        word: 'Who are the girls',
        dur: 28339 - 27880
    },
    28520: {
        user: 'wardo',
        word: 'We have groupies.',
        dur: 28960 - 28520
    },
    29100: {
        user: 'tyler',
        word: 'This idea is potentially worth millions of dollars.',
        dur: 31100 - 29100
    },
    31250: {
        user: 'larry',
        word: 'Millions?',
        dur: 31464 - 31250
    },
    31868: {
        user: 'sean',
        word: 'A million $ isn\'t cool. You know what\'s cool?',
        dur: 33494 - 31868
    },
    33697: {
        user: 'wardo',
        word: 'U?',
        dur: 33900 - 33697
    },
    34203: {
        user: 'sean',
        word: 'A BILLION $$$\'s.',
        dur: 35010 - 34203
    },
    35230: {
        user: 'wardo',
        word: 'We don\'t need him.',
        dur: 36127 - 35230
    },
    36250: {
        user: 'tyler',
        word: 'Let\'s SUE him in federal court.',
        dur: 37654 - 36250
    },
    37830: {
        user: 'mark',
        word: 'you\'re going to get left behind. It\'s moving faster...',
        dur: 38779 - 37830
    },
    39260: {
        user: 'wardo',
        word: 'what do u mean...',
        dur: 39685 - 39260
    },
    39500: {
        user: 'mark',
        word: 'than any of us ever imagined it would move',
        dur: 40500 - 39500
    },
    40550: {
        user: 'wardo',
        word: 'get left behind????',
        dur: 40780 - 40550
    },
    41170: {
        user: 'cameron',
        word: 'We\'re gentlemen of Harvard. You don\'t sue people.',
        dur: 43400 - 41170
    },
    43520: {
        user: 'sean',
        word: 'This is OUR time!!',
        dur: 44300 - 43520
    },
    44480: {
        user: 'wardo',
        word: 'It\'s gonna be like I\'m not a part of Facebook.',
        dur: 46000 - 44480
    },
    46050: {
        user: 'sean',
        word: 'You\'re not a part of Facebook.',
        dur: 46930 - 46050
    },
    47040: {
        user: 'divya',
        word: 'I can\'t wait to stand over your shoulder and watch you write us a check.',
        dur: 49280 - 47040
    },
    49380: {
        user: 'wardo',
        word: 'Is there anything that you need to tell me???',
        dur: 50880 - 49380
    },
    51020: {
        user: 'mark',
        word: 'your actions could have permanently destroyed EVERYTHING I\'ve been working on.',
        dur: 53065 - 51020
    },
    53200: {
        user: 'wardo',
        word: 'WE have been working on!!',
        dur: 53940 - 53200
    },
    54087: {
        user: 'mark',
        word: 'Do u like being a joke??? Do u wanna go back to that?',
        dur: 55550 - 54087
    },
    55630: {
        user: 'wardo',
        word: 'Mark!!!',
        dur: 55840 - 55630
    }
};

module.exports = data;
},{}],15:[function(require,module,exports){
var userData = {
    mark: {
        alias: 'Mark Zuckerberg',
        avatar: 'mark.png'
    },
    wardo: {
        alias: 'Eduardo Saverin',
        avatar: 'wardo.png'
    },
    dustin: {
        alias: 'Dustin Moskovitz',
        avatar: 'dustin.png'
    },
    mary: {
        alias: 'Marylin Delpy',
        avatar: 'mary.png'
    },
    erica: {
        alias: 'Erica Albright',
        avatar: 'erica.png'
    },
    divya: {
        alias: 'Divya Narendra',
        avatar: 'divya.png'
    },
    chris: {
        alias: 'Christy Lee',
        avatar: 'chris.png'
    },
    tyler: {
        alias: 'Tyler Winklevoss',
        avatar: 'tyler.png'
    },
    larry: {
        alias: 'Larry Summers',
        avatar: 'larry.png'
    },
    sean: {
        alias: 'Sean Parker',
        avatar: 'sean.png'
    },
    cameron: {
        alias: 'Cameron Winklevoss',
        avatar: 'cameron.png'
    }
};

module.exports = userData;
},{}],16:[function(require,module,exports){
var Dispatcher = require('./Dispatcher');


// dispatcher 真的很简单, 对于现在的todoapp来说
// 添加一个处理viewaction的方法, 进行分发... 分发的参数可以称作payload
// 在相应的store中, 将action的handler注册在dispatcher上

var copyProperties = require('react/lib/copyProperties');

var ChatDispatcher = copyProperties(new Dispatcher(), {
    handleMovieAction: function(action){
        this.dispatch({
            source: 'MOVIE_ACTION',
            action: action
        });
    }
});

module.exports = ChatDispatcher;
},{"./Dispatcher":17,"react/lib/copyProperties":3}],17:[function(require,module,exports){
/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * @typechecks
 */

var invariant = require('./invariant');

var _lastID = 1;
var _prefix = 'ID_';

/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload)) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *    CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload)) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *
 *         case 'city-update':
 *           FlightPriceStore.price =
 *             FlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

  function Dispatcher() {"use strict";
    this.$Dispatcher_callbacks = {};
    this.$Dispatcher_isPending = {};
    this.$Dispatcher_isHandled = {};
    this.$Dispatcher_isDispatching = false;
    this.$Dispatcher_pendingPayload = null;
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   *
   * @param {function} callback
   * @return {string}
   */
  Dispatcher.prototype.register=function(callback) {"use strict";
    var id = _prefix + _lastID++;
    this.$Dispatcher_callbacks[id] = callback;
    return id;
  };

  /**
   * Removes a callback based on its token.
   *
   * @param {string} id
   */
  Dispatcher.prototype.unregister=function(id) {"use strict";
    invariant(
      this.$Dispatcher_callbacks[id],
      'Dispatcher.unregister(...): `%s` does not map to a registered callback.',
      id
    );
    delete this.$Dispatcher_callbacks[id];
  };

  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   *
   * @param {array<string>} ids
   */
  Dispatcher.prototype.waitFor=function(ids) {"use strict";
    invariant(
      this.$Dispatcher_isDispatching,
      'Dispatcher.waitFor(...): Must be invoked while dispatching.'
    );
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this.$Dispatcher_isPending[id]) {
        invariant(
          this.$Dispatcher_isHandled[id],
          'Dispatcher.waitFor(...): Circular dependency detected while ' +
          'waiting for `%s`.',
          id
        );
        continue;
      }
      invariant(
        this.$Dispatcher_callbacks[id],
        'Dispatcher.waitFor(...): `%s` does not map to a registered callback.',
        id
      );
      this.$Dispatcher_invokeCallback(id);
    }
  };

  /**
   * Dispatches a payload to all registered callbacks.
   *
   * @param {object} payload
   */
  Dispatcher.prototype.dispatch=function(payload) {"use strict";
    invariant(
      !this.$Dispatcher_isDispatching,
      'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.'
    );
    this.$Dispatcher_startDispatching(payload);
    try {
      for (var id in this.$Dispatcher_callbacks) {
        if (this.$Dispatcher_isPending[id]) {
          continue;
        }
        this.$Dispatcher_invokeCallback(id);
      }
    } finally {
      this.$Dispatcher_stopDispatching();
    }
  };

  /**
   * Is this Dispatcher currently dispatching.
   *
   * @return {boolean}
   */
  Dispatcher.prototype.isDispatching=function() {"use strict";
    return this.$Dispatcher_isDispatching;
  };

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @param {string} id
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_invokeCallback=function(id) {"use strict";
    this.$Dispatcher_isPending[id] = true;
    this.$Dispatcher_callbacks[id](this.$Dispatcher_pendingPayload);
    this.$Dispatcher_isHandled[id] = true;
  };

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @param {object} payload
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_startDispatching=function(payload) {"use strict";
    for (var id in this.$Dispatcher_callbacks) {
      this.$Dispatcher_isPending[id] = false;
      this.$Dispatcher_isHandled[id] = false;
    }
    this.$Dispatcher_pendingPayload = payload;
    this.$Dispatcher_isDispatching = true;
  };

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */
  Dispatcher.prototype.$Dispatcher_stopDispatching=function() {"use strict";
    this.$Dispatcher_pendingPayload = null;
    this.$Dispatcher_isDispatching = false;
  };


module.exports = Dispatcher;

},{"./invariant":18}],18:[function(require,module,exports){
/**
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if (false) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],19:[function(require,module,exports){
/**
 * @jsx React.DOM
 */ 

var ChatList = require('./components/ChatList.react.js');
var MovieCtrl = require('./components/Movie.js');


React.renderComponent(ChatList({scrollEle: "#msg-module"}), $('#msg-module .list-ctn').get(0));


$('.simulate-video audio').on('play', function(){
    // setTimeout(function(){
        MovieCtrl.start();
    // }, 1500);
});
},{"./components/ChatList.react.js":10,"./components/Movie.js":12}],20:[function(require,module,exports){



var EventEmitter = require('events').EventEmitter;
var merge = require('react/lib/merge');

var ChatDispatcher = require('../dispatcher/ChatDispatcher');
var ChatConstants = require('../constants/ChatConstants');

var CHANGE_EVENT = 'change';

var dialogData = require('../data/dialogData.js');
var userData = require('../data/userData.js');


var _data = {};

// _data = dialogData;

function getAll(){
    var arr = [];
    for( var i in _data ){
        arr.push( _data[i] )
    }
    return arr;
}

function createOne(id, obj){
    _data[id] = obj;
}

function updateOne(id, updates){
    _data[id] = merge(_data[id], updates);
}

var ChatStore = merge(EventEmitter.prototype, {
    getAll: getAll,
    emitChange: function(){
        this.emit(CHANGE_EVENT);
    },
    addChangeListener: function(callback){
        this.on(CHANGE_EVENT, callback)
    },
    removeChangeListener: function(callback){
        this.removeListener(CHANGE_EVENT, callback)
    }
});


ChatDispatcher.register(function(payload){
    var action = payload.action;

    switch(action.actionType){
        case ChatConstants.WORD_CREATE:
            createOne(action.id, action.word);
            break;
        case ChatConstants.WORD_UPDATE:
            updateOne(action.id, action.updates);
            break;
        default:
            // console.log('chat store do not handle this action', action);
            break;
    }

    ChatStore.emitChange();

    return true;
});


module.exports = ChatStore;
},{"../constants/ChatConstants":13,"../data/dialogData.js":14,"../data/userData.js":15,"../dispatcher/ChatDispatcher":16,"events":1,"react/lib/merge":6}]},{},[19])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvY29weVByb3BlcnRpZXMuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvaW52YXJpYW50LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvcmVhY3QvbGliL2tleU1pcnJvci5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL3JlYWN0L2xpYi9tZXJnZS5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL3JlYWN0L2xpYi9tZXJnZUhlbHBlcnMuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvbWVyZ2VJbnRvLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9hY3Rpb25zL01vdmllQWN0aW9uLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL0NoYXRMaXN0LnJlYWN0LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL0NoYXRXb3JkLnJlYWN0LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL01vdmllLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb25zdGFudHMvQ2hhdENvbnN0YW50cy5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvdmlkZW8vanMvZGF0YS9kaWFsb2dEYXRhLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kYXRhL3VzZXJEYXRhLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kaXNwYXRjaGVyL0NoYXREaXNwYXRjaGVyLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kaXNwYXRjaGVyL0Rpc3BhdGNoZXIuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL3ZpZGVvL2pzL2Rpc3BhdGNoZXIvaW52YXJpYW50LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9mYWtlX2I0MTJkMzc5LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9zdG9yZXMvQ2hhdFN0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIGNvcHlQcm9wZXJ0aWVzXG4gKi9cblxuLyoqXG4gKiBDb3B5IHByb3BlcnRpZXMgZnJvbSBvbmUgb3IgbW9yZSBvYmplY3RzICh1cCB0byA1KSBpbnRvIHRoZSBmaXJzdCBvYmplY3QuXG4gKiBUaGlzIGlzIGEgc2hhbGxvdyBjb3B5LiBJdCBtdXRhdGVzIHRoZSBmaXJzdCBvYmplY3QgYW5kIGFsc28gcmV0dXJucyBpdC5cbiAqXG4gKiBOT1RFOiBgYXJndW1lbnRzYCBoYXMgYSB2ZXJ5IHNpZ25pZmljYW50IHBlcmZvcm1hbmNlIHBlbmFsdHksIHdoaWNoIGlzIHdoeVxuICogd2UgZG9uJ3Qgc3VwcG9ydCB1bmxpbWl0ZWQgYXJndW1lbnRzLlxuICovXG5mdW5jdGlvbiBjb3B5UHJvcGVydGllcyhvYmosIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgb2JqID0gb2JqIHx8IHt9O1xuXG4gIGlmIChcInByb2R1Y3Rpb25cIiAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYpIHtcbiAgICBpZiAoZikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUb28gbWFueSBhcmd1bWVudHMgcGFzc2VkIHRvIGNvcHlQcm9wZXJ0aWVzJyk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZV07XG4gIHZhciBpaSA9IDAsIHY7XG4gIHdoaWxlIChhcmdzW2lpXSkge1xuICAgIHYgPSBhcmdzW2lpKytdO1xuICAgIGZvciAodmFyIGsgaW4gdikge1xuICAgICAgb2JqW2tdID0gdltrXTtcbiAgICB9XG5cbiAgICAvLyBJRSBpZ25vcmVzIHRvU3RyaW5nIGluIG9iamVjdCBpdGVyYXRpb24uLiBTZWU6XG4gICAgLy8gd2VicmVmbGVjdGlvbi5ibG9nc3BvdC5jb20vMjAwNy8wNy9xdWljay1maXgtaW50ZXJuZXQtZXhwbG9yZXItYW5kLmh0bWxcbiAgICBpZiAodi5oYXNPd25Qcm9wZXJ0eSAmJiB2Lmhhc093blByb3BlcnR5KCd0b1N0cmluZycpICYmXG4gICAgICAgICh0eXBlb2Ygdi50b1N0cmluZyAhPSAndW5kZWZpbmVkJykgJiYgKG9iai50b1N0cmluZyAhPT0gdi50b1N0cmluZykpIHtcbiAgICAgIG9iai50b1N0cmluZyA9IHYudG9TdHJpbmc7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb3B5UHJvcGVydGllcztcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIikpIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBpbnZhcmlhbnRcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIGludmFyaWFudCA9IGZ1bmN0aW9uKGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIGlmIChcInByb2R1Y3Rpb25cIiAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArXG4gICAgICAgICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLidcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGUsIGZdO1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKFxuICAgICAgICAnSW52YXJpYW50IFZpb2xhdGlvbjogJyArXG4gICAgICAgIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbigpIHsgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107IH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbnZhcmlhbnQ7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwib01mcEFuXCIpKSIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUga2V5TWlycm9yXG4gKiBAdHlwZWNoZWNrcyBzdGF0aWMtb25seVxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgaW52YXJpYW50ID0gcmVxdWlyZShcIi4vaW52YXJpYW50XCIpO1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYW4gZW51bWVyYXRpb24gd2l0aCBrZXlzIGVxdWFsIHRvIHRoZWlyIHZhbHVlLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICpcbiAqICAgdmFyIENPTE9SUyA9IGtleU1pcnJvcih7Ymx1ZTogbnVsbCwgcmVkOiBudWxsfSk7XG4gKiAgIHZhciBteUNvbG9yID0gQ09MT1JTLmJsdWU7XG4gKiAgIHZhciBpc0NvbG9yVmFsaWQgPSAhIUNPTE9SU1tteUNvbG9yXTtcbiAqXG4gKiBUaGUgbGFzdCBsaW5lIGNvdWxkIG5vdCBiZSBwZXJmb3JtZWQgaWYgdGhlIHZhbHVlcyBvZiB0aGUgZ2VuZXJhdGVkIGVudW0gd2VyZVxuICogbm90IGVxdWFsIHRvIHRoZWlyIGtleXMuXG4gKlxuICogICBJbnB1dDogIHtrZXkxOiB2YWwxLCBrZXkyOiB2YWwyfVxuICogICBPdXRwdXQ6IHtrZXkxOiBrZXkxLCBrZXkyOiBrZXkyfVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge29iamVjdH1cbiAqL1xudmFyIGtleU1pcnJvciA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgcmV0ID0ge307XG4gIHZhciBrZXk7XG4gIChcInByb2R1Y3Rpb25cIiAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPyBpbnZhcmlhbnQoXG4gICAgb2JqIGluc3RhbmNlb2YgT2JqZWN0ICYmICFBcnJheS5pc0FycmF5KG9iaiksXG4gICAgJ2tleU1pcnJvciguLi4pOiBBcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdC4nXG4gICkgOiBpbnZhcmlhbnQob2JqIGluc3RhbmNlb2YgT2JqZWN0ICYmICFBcnJheS5pc0FycmF5KG9iaikpKTtcbiAgZm9yIChrZXkgaW4gb2JqKSB7XG4gICAgaWYgKCFvYmouaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHJldFtrZXldID0ga2V5O1xuICB9XG4gIHJldHVybiByZXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGtleU1pcnJvcjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIikpIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIG1lcmdlXG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBtZXJnZUludG8gPSByZXF1aXJlKFwiLi9tZXJnZUludG9cIik7XG5cbi8qKlxuICogU2hhbGxvdyBtZXJnZXMgdHdvIHN0cnVjdHVyZXMgaW50byBhIHJldHVybiB2YWx1ZSwgd2l0aG91dCBtdXRhdGluZyBlaXRoZXIuXG4gKlxuICogQHBhcmFtIHs/b2JqZWN0fSBvbmUgT3B0aW9uYWwgb2JqZWN0IHdpdGggcHJvcGVydGllcyB0byBtZXJnZSBmcm9tLlxuICogQHBhcmFtIHs/b2JqZWN0fSB0d28gT3B0aW9uYWwgb2JqZWN0IHdpdGggcHJvcGVydGllcyB0byBtZXJnZSBmcm9tLlxuICogQHJldHVybiB7b2JqZWN0fSBUaGUgc2hhbGxvdyBleHRlbnNpb24gb2Ygb25lIGJ5IHR3by5cbiAqL1xudmFyIG1lcmdlID0gZnVuY3Rpb24ob25lLCB0d28pIHtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICBtZXJnZUludG8ocmVzdWx0LCBvbmUpO1xuICBtZXJnZUludG8ocmVzdWx0LCB0d28pO1xuICByZXR1cm4gcmVzdWx0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtZXJnZTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgbWVyZ2VIZWxwZXJzXG4gKlxuICogcmVxdWlyZXNQb2x5ZmlsbHM6IEFycmF5LmlzQXJyYXlcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIGludmFyaWFudCA9IHJlcXVpcmUoXCIuL2ludmFyaWFudFwiKTtcbnZhciBrZXlNaXJyb3IgPSByZXF1aXJlKFwiLi9rZXlNaXJyb3JcIik7XG5cbi8qKlxuICogTWF4aW11bSBudW1iZXIgb2YgbGV2ZWxzIHRvIHRyYXZlcnNlLiBXaWxsIGNhdGNoIGNpcmN1bGFyIHN0cnVjdHVyZXMuXG4gKiBAY29uc3RcbiAqL1xudmFyIE1BWF9NRVJHRV9ERVBUSCA9IDM2O1xuXG4vKipcbiAqIFdlIHdvbid0IHdvcnJ5IGFib3V0IGVkZ2UgY2FzZXMgbGlrZSBuZXcgU3RyaW5nKCd4Jykgb3IgbmV3IEJvb2xlYW4odHJ1ZSkuXG4gKiBGdW5jdGlvbnMgYXJlIGNvbnNpZGVyZWQgdGVybWluYWxzLCBhbmQgYXJyYXlzIGFyZSBub3QuXG4gKiBAcGFyYW0geyp9IG8gVGhlIGl0ZW0vb2JqZWN0L3ZhbHVlIHRvIHRlc3QuXG4gKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmZiB0aGUgYXJndW1lbnQgaXMgYSB0ZXJtaW5hbC5cbiAqL1xudmFyIGlzVGVybWluYWwgPSBmdW5jdGlvbihvKSB7XG4gIHJldHVybiB0eXBlb2YgbyAhPT0gJ29iamVjdCcgfHwgbyA9PT0gbnVsbDtcbn07XG5cbnZhciBtZXJnZUhlbHBlcnMgPSB7XG5cbiAgTUFYX01FUkdFX0RFUFRIOiBNQVhfTUVSR0VfREVQVEgsXG5cbiAgaXNUZXJtaW5hbDogaXNUZXJtaW5hbCxcblxuICAvKipcbiAgICogQ29udmVydHMgbnVsbC91bmRlZmluZWQgdmFsdWVzIGludG8gZW1wdHkgb2JqZWN0LlxuICAgKlxuICAgKiBAcGFyYW0gez9PYmplY3Q9fSBhcmcgQXJndW1lbnQgdG8gYmUgbm9ybWFsaXplZCAobnVsbGFibGUgb3B0aW9uYWwpXG4gICAqIEByZXR1cm4geyFPYmplY3R9XG4gICAqL1xuICBub3JtYWxpemVNZXJnZUFyZzogZnVuY3Rpb24oYXJnKSB7XG4gICAgcmV0dXJuIGFyZyA9PT0gdW5kZWZpbmVkIHx8IGFyZyA9PT0gbnVsbCA/IHt9IDogYXJnO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJZiBtZXJnaW5nIEFycmF5cywgYSBtZXJnZSBzdHJhdGVneSAqbXVzdCogYmUgc3VwcGxpZWQuIElmIG5vdCwgaXQgaXNcbiAgICogbGlrZWx5IHRoZSBjYWxsZXIncyBmYXVsdC4gSWYgdGhpcyBmdW5jdGlvbiBpcyBldmVyIGNhbGxlZCB3aXRoIGFueXRoaW5nXG4gICAqIGJ1dCBgb25lYCBhbmQgYHR3b2AgYmVpbmcgYEFycmF5YHMsIGl0IGlzIHRoZSBmYXVsdCBvZiB0aGUgbWVyZ2UgdXRpbGl0aWVzLlxuICAgKlxuICAgKiBAcGFyYW0geyp9IG9uZSBBcnJheSB0byBtZXJnZSBpbnRvLlxuICAgKiBAcGFyYW0geyp9IHR3byBBcnJheSB0byBtZXJnZSBmcm9tLlxuICAgKi9cbiAgY2hlY2tNZXJnZUFycmF5QXJnczogZnVuY3Rpb24ob25lLCB0d28pIHtcbiAgICAoXCJwcm9kdWN0aW9uXCIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WID8gaW52YXJpYW50KFxuICAgICAgQXJyYXkuaXNBcnJheShvbmUpICYmIEFycmF5LmlzQXJyYXkodHdvKSxcbiAgICAgICdUcmllZCB0byBtZXJnZSBhcnJheXMsIGluc3RlYWQgZ290ICVzIGFuZCAlcy4nLFxuICAgICAgb25lLFxuICAgICAgdHdvXG4gICAgKSA6IGludmFyaWFudChBcnJheS5pc0FycmF5KG9uZSkgJiYgQXJyYXkuaXNBcnJheSh0d28pKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7Kn0gb25lIE9iamVjdCB0byBtZXJnZSBpbnRvLlxuICAgKiBAcGFyYW0geyp9IHR3byBPYmplY3QgdG8gbWVyZ2UgZnJvbS5cbiAgICovXG4gIGNoZWNrTWVyZ2VPYmplY3RBcmdzOiBmdW5jdGlvbihvbmUsIHR3bykge1xuICAgIG1lcmdlSGVscGVycy5jaGVja01lcmdlT2JqZWN0QXJnKG9uZSk7XG4gICAgbWVyZ2VIZWxwZXJzLmNoZWNrTWVyZ2VPYmplY3RBcmcodHdvKTtcbiAgfSxcblxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhcmdcbiAgICovXG4gIGNoZWNrTWVyZ2VPYmplY3RBcmc6IGZ1bmN0aW9uKGFyZykge1xuICAgIChcInByb2R1Y3Rpb25cIiAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPyBpbnZhcmlhbnQoXG4gICAgICAhaXNUZXJtaW5hbChhcmcpICYmICFBcnJheS5pc0FycmF5KGFyZyksXG4gICAgICAnVHJpZWQgdG8gbWVyZ2UgYW4gb2JqZWN0LCBpbnN0ZWFkIGdvdCAlcy4nLFxuICAgICAgYXJnXG4gICAgKSA6IGludmFyaWFudCghaXNUZXJtaW5hbChhcmcpICYmICFBcnJheS5pc0FycmF5KGFyZykpKTtcbiAgfSxcblxuICAvKipcbiAgICogQHBhcmFtIHsqfSBhcmdcbiAgICovXG4gIGNoZWNrTWVyZ2VJbnRvT2JqZWN0QXJnOiBmdW5jdGlvbihhcmcpIHtcbiAgICAoXCJwcm9kdWN0aW9uXCIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WID8gaW52YXJpYW50KFxuICAgICAgKCFpc1Rlcm1pbmFsKGFyZykgfHwgdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJykgJiYgIUFycmF5LmlzQXJyYXkoYXJnKSxcbiAgICAgICdUcmllZCB0byBtZXJnZSBpbnRvIGFuIG9iamVjdCwgaW5zdGVhZCBnb3QgJXMuJyxcbiAgICAgIGFyZ1xuICAgICkgOiBpbnZhcmlhbnQoKCFpc1Rlcm1pbmFsKGFyZykgfHwgdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJykgJiYgIUFycmF5LmlzQXJyYXkoYXJnKSkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3MgdGhhdCBhIG1lcmdlIHdhcyBub3QgZ2l2ZW4gYSBjaXJjdWxhciBvYmplY3Qgb3IgYW4gb2JqZWN0IHRoYXQgaGFkXG4gICAqIHRvbyBncmVhdCBvZiBkZXB0aC5cbiAgICpcbiAgICogQHBhcmFtIHtudW1iZXJ9IExldmVsIG9mIHJlY3Vyc2lvbiB0byB2YWxpZGF0ZSBhZ2FpbnN0IG1heGltdW0uXG4gICAqL1xuICBjaGVja01lcmdlTGV2ZWw6IGZ1bmN0aW9uKGxldmVsKSB7XG4gICAgKFwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViA/IGludmFyaWFudChcbiAgICAgIGxldmVsIDwgTUFYX01FUkdFX0RFUFRILFxuICAgICAgJ01heGltdW0gZGVlcCBtZXJnZSBkZXB0aCBleGNlZWRlZC4gWW91IG1heSBiZSBhdHRlbXB0aW5nIHRvIG1lcmdlICcgK1xuICAgICAgJ2NpcmN1bGFyIHN0cnVjdHVyZXMgaW4gYW4gdW5zdXBwb3J0ZWQgd2F5LidcbiAgICApIDogaW52YXJpYW50KGxldmVsIDwgTUFYX01FUkdFX0RFUFRIKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGF0IHRoZSBzdXBwbGllZCBtZXJnZSBzdHJhdGVneSBpcyB2YWxpZC5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IEFycmF5IG1lcmdlIHN0cmF0ZWd5LlxuICAgKi9cbiAgY2hlY2tBcnJheVN0cmF0ZWd5OiBmdW5jdGlvbihzdHJhdGVneSkge1xuICAgIChcInByb2R1Y3Rpb25cIiAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPyBpbnZhcmlhbnQoXG4gICAgICBzdHJhdGVneSA9PT0gdW5kZWZpbmVkIHx8IHN0cmF0ZWd5IGluIG1lcmdlSGVscGVycy5BcnJheVN0cmF0ZWdpZXMsXG4gICAgICAnWW91IG11c3QgcHJvdmlkZSBhbiBhcnJheSBzdHJhdGVneSB0byBkZWVwIG1lcmdlIGZ1bmN0aW9ucyB0byAnICtcbiAgICAgICdpbnN0cnVjdCB0aGUgZGVlcCBtZXJnZSBob3cgdG8gcmVzb2x2ZSBtZXJnaW5nIHR3byBhcnJheXMuJ1xuICAgICkgOiBpbnZhcmlhbnQoc3RyYXRlZ3kgPT09IHVuZGVmaW5lZCB8fCBzdHJhdGVneSBpbiBtZXJnZUhlbHBlcnMuQXJyYXlTdHJhdGVnaWVzKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFNldCBvZiBwb3NzaWJsZSBiZWhhdmlvcnMgb2YgbWVyZ2UgYWxnb3JpdGhtcyB3aGVuIGVuY291bnRlcmluZyB0d28gQXJyYXlzXG4gICAqIHRoYXQgbXVzdCBiZSBtZXJnZWQgdG9nZXRoZXIuXG4gICAqIC0gYGNsb2JiZXJgOiBUaGUgbGVmdCBgQXJyYXlgIGlzIGlnbm9yZWQuXG4gICAqIC0gYGluZGV4QnlJbmRleGA6IFRoZSByZXN1bHQgaXMgYWNoaWV2ZWQgYnkgcmVjdXJzaXZlbHkgZGVlcCBtZXJnaW5nIGF0XG4gICAqICAgZWFjaCBpbmRleC4gKG5vdCB5ZXQgc3VwcG9ydGVkLilcbiAgICovXG4gIEFycmF5U3RyYXRlZ2llczoga2V5TWlycm9yKHtcbiAgICBDbG9iYmVyOiB0cnVlLFxuICAgIEluZGV4QnlJbmRleDogdHJ1ZVxuICB9KVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1lcmdlSGVscGVycztcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIikpIiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIG1lcmdlSW50b1xuICogQHR5cGVjaGVja3Mgc3RhdGljLW9ubHlcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIG1lcmdlSGVscGVycyA9IHJlcXVpcmUoXCIuL21lcmdlSGVscGVyc1wiKTtcblxudmFyIGNoZWNrTWVyZ2VPYmplY3RBcmcgPSBtZXJnZUhlbHBlcnMuY2hlY2tNZXJnZU9iamVjdEFyZztcbnZhciBjaGVja01lcmdlSW50b09iamVjdEFyZyA9IG1lcmdlSGVscGVycy5jaGVja01lcmdlSW50b09iamVjdEFyZztcblxuLyoqXG4gKiBTaGFsbG93IG1lcmdlcyB0d28gc3RydWN0dXJlcyBieSBtdXRhdGluZyB0aGUgZmlyc3QgcGFyYW1ldGVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fGZ1bmN0aW9ufSBvbmUgT2JqZWN0IHRvIGJlIG1lcmdlZCBpbnRvLlxuICogQHBhcmFtIHs/b2JqZWN0fSB0d28gT3B0aW9uYWwgb2JqZWN0IHdpdGggcHJvcGVydGllcyB0byBtZXJnZSBmcm9tLlxuICovXG5mdW5jdGlvbiBtZXJnZUludG8ob25lLCB0d28pIHtcbiAgY2hlY2tNZXJnZUludG9PYmplY3RBcmcob25lKTtcbiAgaWYgKHR3byAhPSBudWxsKSB7XG4gICAgY2hlY2tNZXJnZU9iamVjdEFyZyh0d28pO1xuICAgIGZvciAodmFyIGtleSBpbiB0d28pIHtcbiAgICAgIGlmICghdHdvLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBvbmVba2V5XSA9IHR3b1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1lcmdlSW50bztcbiIsIlxuLy8g5aOw5piO5omA5pyJ55qEYWN0aW9uXG4vLyDnlLHlk6rkuKpkaXNwYXRjaGVy6LSf6LSj5YiG5Y+RXG4vLyDliIblj5HnmoRwYXlsb2Fk5Lit55qEYWN0aW9uVHlwZeaYr+S7gOS5iFxuLy8g6L+Z5LiqYWN0aW9u5omA6ZyA6KaB55qE5Y+C5pWwLCDmjqXmlLblubbkvKDnu5nliIblj5HlmahcblxudmFyIENoYXREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vZGlzcGF0Y2hlci9DaGF0RGlzcGF0Y2hlcicpO1xudmFyIENoYXRDb25zdGFudHMgPSByZXF1aXJlKCcuLi9jb25zdGFudHMvQ2hhdENvbnN0YW50cycpO1xuXG52YXIgTW92aWVBY3Rpb25zID0ge1xuICAgIC8vIHN0YXJ0IHRpbWUgYXMgaWRcbiAgICBjcmVhdGU6IGZ1bmN0aW9uKHdvcmQsIGlkKXtcbiAgICAgICAgQ2hhdERpc3BhdGNoZXIuaGFuZGxlTW92aWVBY3Rpb24oe1xuICAgICAgICAgICAgYWN0aW9uVHlwZTogQ2hhdENvbnN0YW50cy5XT1JEX0NSRUFURSxcbiAgICAgICAgICAgIHdvcmQ6IHdvcmQsXG4gICAgICAgICAgICBpZDogaWRcbiAgICAgICAgfSlcbiAgICB9LFxuICAgIHVwZGF0ZTogZnVuY3Rpb24oaWQsIHVwZGF0ZXMpe1xuICAgICAgICBDaGF0RGlzcGF0Y2hlci5oYW5kbGVNb3ZpZUFjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBDaGF0Q29uc3RhbnRzLldPUkRfVVBEQVRFLFxuICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgdXBkYXRlczogdXBkYXRlc1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gTW92aWVBY3Rpb25zO1xuXG4iLCIvKipcbiAqIEBqc3ggUmVhY3QuRE9NXG4gKi8gXG5cblxuXG52YXIgQ2hhdFN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmVzL0NoYXRTdG9yZS5qcycpXG5cbnZhciBDaGF0V29yZCA9IHJlcXVpcmUoJy4vQ2hhdFdvcmQucmVhY3QuanMnKTtcblxuZnVuY3Rpb24gZ2V0QWxsRGF0YSgpe1xuICAgIHJldHVybiB7XG4gICAgICAgIGxpc3Q6IENoYXRTdG9yZS5nZXRBbGwoKVxuICAgIH07XG59O1xuXG52YXIgc2NvbGxFbGUgPSBudWxsLCBsYXN0U2Nyb2xsSGVpZ2h0ID0gMDtcbmZ1bmN0aW9uIGNoZWNrQW5kU2Nyb2xsKCl7XG4gICAgdmFyIG5ld0ggPSBzY29sbEVsZS5zY3JvbGxIZWlnaHQ7XG4gICAgaWYoIG5ld0ggPiBsYXN0U2Nyb2xsSGVpZ2h0ICl7XG4gICAgICAgIHNjb2xsRWxlLnNjcm9sbFRvcCA9IG5ld0g7XG4gICAgICAgIGxhc3RTY3JvbGxIZWlnaHQgPSBuZXdIO1xuICAgIH1cbn1cblxudmFyIENoYXRMaXN0ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiAnQ2hhdExpc3QnLFxuICAgIGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGdldEFsbERhdGEoKTtcbiAgICB9LFxuICAgIGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgc2NvbGxFbGUgPSAkKHRoaXMucHJvcHMuc2Nyb2xsRWxlKS5nZXQoMCk7XG4gICAgICAgIGNoZWNrQW5kU2Nyb2xsKCk7XG4gICAgICAgIC8vIGxhc3RTY3JvbGxIZWlnaHQgPSBzY29sbEVsZS5zY3JvbGxIZWlnaHQ7XG4gICAgICAgIENoYXRTdG9yZS5hZGRDaGFuZ2VMaXN0ZW5lciggdGhpcy5fb25DaGFuZ2UgKTtcbiAgICB9LFxuICAgIGNvbXBvbmVudERpZFVwZGF0ZTogZnVuY3Rpb24oKXtcbiAgICAgICAgY2hlY2tBbmRTY3JvbGwoKTtcbiAgICB9LFxuICAgIGNvbXBvbmVudFdpbGxNb3VudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIENoYXRTdG9yZS5yZW1vdmVDaGFuZ2VMaXN0ZW5lciggdGhpcy5fb25DaGFuZ2UgKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIG5vZGVzID0gdGhpcy5zdGF0ZS5saXN0Lm1hcChmdW5jdGlvbihpdGVtLCBpKXtcbiAgICAgICAgICAgIHJldHVybiBDaGF0V29yZCh7aXRlbTogaXRlbSwga2V5OiBpfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBSZWFjdC5ET00udWwoe2lkOiBcIm1zZy1saXN0XCJ9LCBub2Rlcyk7XG4gICAgfSxcbiAgICBfb25DaGFuZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoIGdldEFsbERhdGEoKSApXG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdExpc3Q7IiwiLyoqXG4gKiBAanN4IFJlYWN0LkRPTVxuICovIFxuXG4gZnVuY3Rpb24gYnVpbGRNc2dJdGVtKG1zZyl7XG4gICAgcmV0dXJuIChcbiAgICAgICAgUmVhY3QuRE9NLmxpKHtjbGFzc05hbWU6IFwibXNnLWl0ZW1cIn0sIFxuICAgICAgICAgICAgUmVhY3QuRE9NLmltZyh7c3JjOiBtc2cuYXZhdGFyLCBjbGFzc05hbWU6IFwiYXZhdGFyXCJ9KSwgXG4gICAgICAgICAgICBSZWFjdC5ET00uZGl2KHtjbGFzc05hbWU6IFwibXNnLWNvbnRlbnRcIn0sIFxuICAgICAgICAgICAgICAgIFJlYWN0LkRPTS5zcGFuKHtjbGFzc05hbWU6IFwibXNnLXVzZXItbmFtZVwifSwgbXNnLmFsaWFzKSwgXG4gICAgICAgICAgICAgICAgUmVhY3QuRE9NLnNwYW4oe2NsYXNzTmFtZTogXCJtc2ctdGV4dFwifSwgbXNnLndvcmQpXG4gICAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgICAgKTtcbiAgICAvLyByZXR1cm4gKFxuICAgIC8vICAgICA8bGkgY2xhc3NOYW1lPVwibXNnLWl0ZW1cIj5cbiAgICAvLyAgICAgICAgIDxpbWcgc3JjPXsnLi9pbWcvYXZhdGFyLycrbXNnLnVzZXIrJy5wbmcnfSBjbGFzc05hbWU9XCJhdmF0YXJcIiAvPlxuICAgIC8vICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtc2ctY29udGVudFwiPlxuICAgIC8vICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cIm1zZy11c2VyLW5hbWVcIj57bXNnLnVzZXJ9PC9zcGFuPlxuICAgIC8vICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cIm1zZy10ZXh0XCI+e21zZy53b3JkfTwvc3Bhbj5cbiAgICAvLyAgICAgICAgIDwvZGl2PlxuICAgIC8vICAgICA8L2xpPlxuICAgIC8vICAgICApO1xuIH1cblxuXG52YXIgQ2hhdFdvcmQgPSBSZWFjdC5jcmVhdGVDbGFzcyh7ZGlzcGxheU5hbWU6ICdDaGF0V29yZCcsXG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4ge307XG4gICAgfSxcbiAgICBjb21wb25lbnREaWRVcGRhdGU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMucHJvcHMuaXRlbS53b3JkKTtcbiAgICB9LFxuICAgIHJlbmRlcjogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGJ1aWxkTXNnSXRlbSh0aGlzLnByb3BzLml0ZW0pO1xuICAgIH1cbn0pO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdFdvcmQ7IiwiXG5cbnZhciBNb3ZpZUFjdGlvbiA9IHJlcXVpcmUoJy4uL2FjdGlvbnMvTW92aWVBY3Rpb24uanMnKTtcbnZhciBkaWFsb2dEYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9kaWFsb2dEYXRhLmpzJyk7XG52YXIgdXNlckRhdGEgPSByZXF1aXJlKCcuLi9kYXRhL3VzZXJEYXRhLmpzJyk7XG4vLyBzb3VyY2UgZGF0YTogZGlhbG9nXG5cbmZ1bmN0aW9uIGdldFVzZXJJbmZvKGlkZW50aWZlcil7XG4gICAgcmV0dXJuIHVzZXJEYXRhW2lkZW50aWZlcl07XG59XG5cbi8vIHN0cmluZyB3b3JkLCBkdXJhdGlvbiBvZiBtcywgb2Zmc2V0IG9mIG1zXG5mdW5jdGlvbiB0eXBlV29yZHMod29yZCwgZHVyLCBvZmZTZXQsIGNhbGxiYWNrKXtcbiAgICBpZighb2ZmU2V0KXtcbiAgICAgICAgb2ZmU2V0ID0gMDtcbiAgICB9XG4gICAgdmFyIGFyciA9IHdvcmQuc3BsaXQoJycpO1xuXG4gICAgYXJyLmZvckVhY2goZnVuY3Rpb24oZWwsIGkpe1xuICAgICAgICAoZnVuY3Rpb24oaW5kZXgpe1xuICAgICAgICAgICAgY2FsbGJhY2soIHdvcmQuc3Vic3RyKDAsIDEpICk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sod29yZC5zdWJzdHIoMCwgaW5kZXgrMSkpO1xuICAgICAgICAgICAgfSwgKGR1ciooaW5kZXgrMSkvYXJyLmxlbmd0aCkgKyBvZmZTZXQpO1xuICAgICAgICAgICAgXG4gICAgICAgIH0pKGkpO1xuICAgIH0pO1xufVxuXG5cbnZhciBNb3ZpZUN0cmwgPSB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIC8vIHNldFRpbWVvdXQgYW5kIHNlbmQgYWN0aW9uLi4uXG4gICAgICAgIGZvciggdmFyIGkgaW4gZGlhbG9nRGF0YSApe1xuICAgICAgICAgICAgKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVvdXQgPSBrZXk7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0ga2V5O1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSBkaWFsb2dEYXRhW2tleV07XG4gICAgICAgICAgICAgICAgICAgIHZhciB1c2VySW5mbyA9IGdldFVzZXJJbmZvKGl0ZW0udXNlcik7XG4gICAgICAgICAgICAgICAgICAgIE1vdmllQWN0aW9uLmNyZWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBhbGlhczogdXNlckluZm8uYWxpYXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmF0YXI6ICdpbWcvYXZhdGFyLycrdXNlckluZm8uYXZhdGFyLFxuICAgICAgICAgICAgICAgICAgICAgICAgd29yZDogJydcbiAgICAgICAgICAgICAgICAgICAgfSwgaWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbihzdHIsIGR1ciwgb2Zmc2V0KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkaWFJRCA9IG9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVXb3JkcyhzdHIsIGR1ciwgMCwgZnVuY3Rpb24ocGFydGlhbCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTW92aWVBY3Rpb24udXBkYXRlKCBkaWFJRCwge3dvcmQ6IHBhcnRpYWx9ICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSkoaXRlbS53b3JkLCBpdGVtLmR1ciwgTnVtYmVyKHRpbWVvdXQpKTtcblxuICAgICAgICAgICAgICAgIH0sdGltZW91dCk7XG4gICAgICAgICAgICB9KShpKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW92aWVDdHJsOyIsInZhciBrZXlNaXJyb3IgPSByZXF1aXJlKCdyZWFjdC9saWIva2V5TWlycm9yJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ga2V5TWlycm9yKHtcbiAgICBXT1JEX0NSRUFURTogbnVsbCxcbiAgICBXT1JEX1VQREFURTogbnVsbFxufSk7IiwidmFyIGRhdGEgPSB7XG4gICAgMjI0Nzoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICdJIHRoaW5rIElcXCd2ZSBjb21lIHVwIHdpdGggc29tZXRoaW5nLi4uJyxcbiAgICAgICAgZHVyOiAzNTYxIC0gMjM0N1xuICAgIH0sXG4gICAgMzY0MDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAndGhhdCBsb29rcyBnb29kLiBUaGF0IGxvb2tzIHJlYWxseSBnb29kLicsXG4gICAgICAgIGR1cjogNTI4NSAtIDM2NDBcbiAgICB9LFxuICAgIDU0MjA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAnSXRcXCdzIGdvbm5hIGJlIG9ubGluZSBhbnkgc2Vjb25kLicsXG4gICAgICAgIGR1cjogIDY1NzAgLSA1NDIwXG4gICAgfSxcbiAgICA2NjUwOiB7XG4gICAgICAgIHVzZXI6ICdkdXN0aW4nLFxuICAgICAgICB3b3JkOiAnV2hvIHNob3VsZCB3ZSBzZW5kIGl0IHRvIGZpcnN0PycsXG4gICAgICAgIGR1cjogNzQ5MSAtIDY2NTBcbiAgICB9LFxuICAgIDc2OTA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAnSnVzdCBhIGNvdXBsZSBvZiBwZW9wbGUuLi4gVGhlIHF1ZXN0aW9uIGlzLi4uIHdobyBhcmUgdGhleSBnb25uYSBzZW5kIGl0IHRvPycsXG4gICAgICAgIGR1cjogMTAyMjMgLSA3NjkwXG4gICAgfSxcbiAgICAxMDMyNToge1xuICAgICAgICB1c2VyOiAnbWFyeScsXG4gICAgICAgIHdvcmQ6ICdUaGUgc2l0ZSBnb3QgMiwyMDAgaGl0cyB3aXRoaW4gdHdvIGhvdXJzPz8/JyxcbiAgICAgICAgZHVyOiAxMjk1MiAtIDEwMzI1XG4gICAgfSxcbiAgICAxMzA1Mzoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICdUSE9VU0FORC4uLiAyMiwwMDAuJyxcbiAgICAgICAgZHVyOiAxNDU3NiAtIDEzMDUzXG4gICAgfSxcbiAgICAxNDYwMDoge1xuICAgICAgICB1c2VyOiAnbWFyeScsXG4gICAgICAgIHdvcmQ6ICdXT1chJyxcbiAgICAgICAgZHVyOiAxNDcwMCAtIDE0NjAwXG4gICAgfSxcbiAgICAxNDkwMDoge1xuICAgICAgICB1c2VyOiAnZXJpY2EnLFxuICAgICAgICB3b3JkOiAnWW91IGNhbGxlZCBtZSBhIEJJVENIIG9uIHRoZSBJbnRlcm5ldC4nLFxuICAgICAgICBkdXI6IDE2MjgwIC0gMTQ5MDBcbiAgICB9LFxuICAgIDE2MzkwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ0RvZXNuXFwndCBhbnlib2R5IGhhdmUgYSBzZW5zZSBvZiBodW1vcj8nLFxuICAgICAgICBkdXI6IDE3MzA2IC0gMTYzOTBcbiAgICB9LFxuICAgIDE3MzgwOiB7XG4gICAgICAgIHVzZXI6ICdlcmljYScsXG4gICAgICAgIHdvcmQ6ICdUaGUgSW50ZXJuZXRcXCdzIG5vdCB3cml0dGVuIGluIHBlbmNpbCwgTWFyaywgaXRcXCdzIHdyaXR0ZW4gaW4gaW5rLicsXG4gICAgICAgIGR1cjogIDE5MzcwIC0gMTczODBcbiAgICB9LFxuICAgIDE5NTYwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICd1IHRoaW5rIG1heWJlIHdlIHNob3VsZG5cXCd0IHNodXQgaXQgZG93biBiZWZvcmUgd2UgZ2V0IGludG8gdHJvdWJsZT8nLFxuICAgICAgICBkdXI6IDIxNjAwIC0gMTk1NjBcbiAgICB9LFxuICAgIDIxNjgwOiB7XG4gICAgICAgIHVzZXI6ICdkaXZ5YScsXG4gICAgICAgIHdvcmQ6ICdIZSBzdG9sZSBvdXIgd2Vic2l0ZSEhIScsXG4gICAgICAgIGR1cjogMjI0ODAgLSAyMTY4MFxuICAgIH0sXG4gICAgMjI2MDA6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ1RoZXlcXCdyZSBzYXlpbmcgdGhhdCB3ZSBzdG9sZSBUaGUgRmFjZWJvb2snLFxuICAgICAgICBkdXI6IDIzOTgwIC0gMjI2MDBcbiAgICB9LFxuICAgIDI0MjAwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ0kgS05PVyB3aGF0IGl0IHNheXMuJyxcbiAgICAgICAgZHVyOiAyNDkwMCAtIDI0MjAwXG4gICAgfSxcbiAgICAyNTAwMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnc28gZGlkIHdlPz8/JyxcbiAgICAgICAgZHVyOiAyNTMyMCAtIDI1MDAwXG4gICAgfSxcbiAgICAyNTU1MDoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICdUaGV5IGNhbWUgdG8gbWUgd2l0aCBhbiBpZGVhLCBJIGhhZCBhIGJldHRlciBvbmUuJyxcbiAgICAgICAgZHVyOiAyNjk1MCAtIDI1NTUwXG4gICAgfSxcbiAgICAyNzA1MDoge1xuICAgICAgICB1c2VyOiAnY2hyaXMnLFxuICAgICAgICB3b3JkOiAnSGUgbWFkZSBUaGUgRmFjZWJvb2s/JyxcbiAgICAgICAgZHVyOiAyNzgyMCAtIDI3MDUwXG4gICAgfSxcbiAgICAyNzg4MDoge1xuICAgICAgICB1c2VyOiAnZHVzdGluJyxcbiAgICAgICAgd29yZDogJ1dobyBhcmUgdGhlIGdpcmxzJyxcbiAgICAgICAgZHVyOiAyODMzOSAtIDI3ODgwXG4gICAgfSxcbiAgICAyODUyMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnV2UgaGF2ZSBncm91cGllcy4nLFxuICAgICAgICBkdXI6IDI4OTYwIC0gMjg1MjBcbiAgICB9LFxuICAgIDI5MTAwOiB7XG4gICAgICAgIHVzZXI6ICd0eWxlcicsXG4gICAgICAgIHdvcmQ6ICdUaGlzIGlkZWEgaXMgcG90ZW50aWFsbHkgd29ydGggbWlsbGlvbnMgb2YgZG9sbGFycy4nLFxuICAgICAgICBkdXI6IDMxMTAwIC0gMjkxMDBcbiAgICB9LFxuICAgIDMxMjUwOiB7XG4gICAgICAgIHVzZXI6ICdsYXJyeScsXG4gICAgICAgIHdvcmQ6ICdNaWxsaW9ucz8nLFxuICAgICAgICBkdXI6IDMxNDY0IC0gMzEyNTBcbiAgICB9LFxuICAgIDMxODY4OiB7XG4gICAgICAgIHVzZXI6ICdzZWFuJyxcbiAgICAgICAgd29yZDogJ0EgbWlsbGlvbiAkIGlzblxcJ3QgY29vbC4gWW91IGtub3cgd2hhdFxcJ3MgY29vbD8nLFxuICAgICAgICBkdXI6IDMzNDk0IC0gMzE4NjhcbiAgICB9LFxuICAgIDMzNjk3OiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICdVPycsXG4gICAgICAgIGR1cjogMzM5MDAgLSAzMzY5N1xuICAgIH0sXG4gICAgMzQyMDM6IHtcbiAgICAgICAgdXNlcjogJ3NlYW4nLFxuICAgICAgICB3b3JkOiAnQSBCSUxMSU9OICQkJFxcJ3MuJyxcbiAgICAgICAgZHVyOiAzNTAxMCAtIDM0MjAzXG4gICAgfSxcbiAgICAzNTIzMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnV2UgZG9uXFwndCBuZWVkIGhpbS4nLFxuICAgICAgICBkdXI6IDM2MTI3IC0gMzUyMzBcbiAgICB9LFxuICAgIDM2MjUwOiB7XG4gICAgICAgIHVzZXI6ICd0eWxlcicsXG4gICAgICAgIHdvcmQ6ICdMZXRcXCdzIFNVRSBoaW0gaW4gZmVkZXJhbCBjb3VydC4nLFxuICAgICAgICBkdXI6IDM3NjU0IC0gMzYyNTBcbiAgICB9LFxuICAgIDM3ODMwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ3lvdVxcJ3JlIGdvaW5nIHRvIGdldCBsZWZ0IGJlaGluZC4gSXRcXCdzIG1vdmluZyBmYXN0ZXIuLi4nLFxuICAgICAgICBkdXI6IDM4Nzc5IC0gMzc4MzBcbiAgICB9LFxuICAgIDM5MjYwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICd3aGF0IGRvIHUgbWVhbi4uLicsXG4gICAgICAgIGR1cjogMzk2ODUgLSAzOTI2MFxuICAgIH0sXG4gICAgMzk1MDA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAndGhhbiBhbnkgb2YgdXMgZXZlciBpbWFnaW5lZCBpdCB3b3VsZCBtb3ZlJyxcbiAgICAgICAgZHVyOiA0MDUwMCAtIDM5NTAwXG4gICAgfSxcbiAgICA0MDU1MDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnZ2V0IGxlZnQgYmVoaW5kPz8/PycsXG4gICAgICAgIGR1cjogNDA3ODAgLSA0MDU1MFxuICAgIH0sXG4gICAgNDExNzA6IHtcbiAgICAgICAgdXNlcjogJ2NhbWVyb24nLFxuICAgICAgICB3b3JkOiAnV2VcXCdyZSBnZW50bGVtZW4gb2YgSGFydmFyZC4gWW91IGRvblxcJ3Qgc3VlIHBlb3BsZS4nLFxuICAgICAgICBkdXI6IDQzNDAwIC0gNDExNzBcbiAgICB9LFxuICAgIDQzNTIwOiB7XG4gICAgICAgIHVzZXI6ICdzZWFuJyxcbiAgICAgICAgd29yZDogJ1RoaXMgaXMgT1VSIHRpbWUhIScsXG4gICAgICAgIGR1cjogNDQzMDAgLSA0MzUyMFxuICAgIH0sXG4gICAgNDQ0ODA6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ0l0XFwncyBnb25uYSBiZSBsaWtlIElcXCdtIG5vdCBhIHBhcnQgb2YgRmFjZWJvb2suJyxcbiAgICAgICAgZHVyOiA0NjAwMCAtIDQ0NDgwXG4gICAgfSxcbiAgICA0NjA1MDoge1xuICAgICAgICB1c2VyOiAnc2VhbicsXG4gICAgICAgIHdvcmQ6ICdZb3VcXCdyZSBub3QgYSBwYXJ0IG9mIEZhY2Vib29rLicsXG4gICAgICAgIGR1cjogNDY5MzAgLSA0NjA1MFxuICAgIH0sXG4gICAgNDcwNDA6IHtcbiAgICAgICAgdXNlcjogJ2RpdnlhJyxcbiAgICAgICAgd29yZDogJ0kgY2FuXFwndCB3YWl0IHRvIHN0YW5kIG92ZXIgeW91ciBzaG91bGRlciBhbmQgd2F0Y2ggeW91IHdyaXRlIHVzIGEgY2hlY2suJyxcbiAgICAgICAgZHVyOiA0OTI4MCAtIDQ3MDQwXG4gICAgfSxcbiAgICA0OTM4MDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnSXMgdGhlcmUgYW55dGhpbmcgdGhhdCB5b3UgbmVlZCB0byB0ZWxsIG1lPz8/JyxcbiAgICAgICAgZHVyOiA1MDg4MCAtIDQ5MzgwXG4gICAgfSxcbiAgICA1MTAyMDoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICd5b3VyIGFjdGlvbnMgY291bGQgaGF2ZSBwZXJtYW5lbnRseSBkZXN0cm95ZWQgRVZFUllUSElORyBJXFwndmUgYmVlbiB3b3JraW5nIG9uLicsXG4gICAgICAgIGR1cjogNTMwNjUgLSA1MTAyMFxuICAgIH0sXG4gICAgNTMyMDA6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ1dFIGhhdmUgYmVlbiB3b3JraW5nIG9uISEnLFxuICAgICAgICBkdXI6IDUzOTQwIC0gNTMyMDBcbiAgICB9LFxuICAgIDU0MDg3OiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ0RvIHUgbGlrZSBiZWluZyBhIGpva2U/Pz8gRG8gdSB3YW5uYSBnbyBiYWNrIHRvIHRoYXQ/JyxcbiAgICAgICAgZHVyOiA1NTU1MCAtIDU0MDg3XG4gICAgfSxcbiAgICA1NTYzMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnTWFyayEhIScsXG4gICAgICAgIGR1cjogNTU4NDAgLSA1NTYzMFxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZGF0YTsiLCJ2YXIgdXNlckRhdGEgPSB7XG4gICAgbWFyazoge1xuICAgICAgICBhbGlhczogJ01hcmsgWnVja2VyYmVyZycsXG4gICAgICAgIGF2YXRhcjogJ21hcmsucG5nJ1xuICAgIH0sXG4gICAgd2FyZG86IHtcbiAgICAgICAgYWxpYXM6ICdFZHVhcmRvIFNhdmVyaW4nLFxuICAgICAgICBhdmF0YXI6ICd3YXJkby5wbmcnXG4gICAgfSxcbiAgICBkdXN0aW46IHtcbiAgICAgICAgYWxpYXM6ICdEdXN0aW4gTW9za292aXR6JyxcbiAgICAgICAgYXZhdGFyOiAnZHVzdGluLnBuZydcbiAgICB9LFxuICAgIG1hcnk6IHtcbiAgICAgICAgYWxpYXM6ICdNYXJ5bGluIERlbHB5JyxcbiAgICAgICAgYXZhdGFyOiAnbWFyeS5wbmcnXG4gICAgfSxcbiAgICBlcmljYToge1xuICAgICAgICBhbGlhczogJ0VyaWNhIEFsYnJpZ2h0JyxcbiAgICAgICAgYXZhdGFyOiAnZXJpY2EucG5nJ1xuICAgIH0sXG4gICAgZGl2eWE6IHtcbiAgICAgICAgYWxpYXM6ICdEaXZ5YSBOYXJlbmRyYScsXG4gICAgICAgIGF2YXRhcjogJ2RpdnlhLnBuZydcbiAgICB9LFxuICAgIGNocmlzOiB7XG4gICAgICAgIGFsaWFzOiAnQ2hyaXN0eSBMZWUnLFxuICAgICAgICBhdmF0YXI6ICdjaHJpcy5wbmcnXG4gICAgfSxcbiAgICB0eWxlcjoge1xuICAgICAgICBhbGlhczogJ1R5bGVyIFdpbmtsZXZvc3MnLFxuICAgICAgICBhdmF0YXI6ICd0eWxlci5wbmcnXG4gICAgfSxcbiAgICBsYXJyeToge1xuICAgICAgICBhbGlhczogJ0xhcnJ5IFN1bW1lcnMnLFxuICAgICAgICBhdmF0YXI6ICdsYXJyeS5wbmcnXG4gICAgfSxcbiAgICBzZWFuOiB7XG4gICAgICAgIGFsaWFzOiAnU2VhbiBQYXJrZXInLFxuICAgICAgICBhdmF0YXI6ICdzZWFuLnBuZydcbiAgICB9LFxuICAgIGNhbWVyb246IHtcbiAgICAgICAgYWxpYXM6ICdDYW1lcm9uIFdpbmtsZXZvc3MnLFxuICAgICAgICBhdmF0YXI6ICdjYW1lcm9uLnBuZydcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHVzZXJEYXRhOyIsInZhciBEaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9EaXNwYXRjaGVyJyk7XG5cblxuLy8gZGlzcGF0Y2hlciDnnJ/nmoTlvojnroDljZUsIOWvueS6jueOsOWcqOeahHRvZG9hcHDmnaXor7Rcbi8vIOa3u+WKoOS4gOS4quWkhOeQhnZpZXdhY3Rpb27nmoTmlrnms5UsIOi/m+ihjOWIhuWPkS4uLiDliIblj5HnmoTlj4LmlbDlj6/ku6Xnp7DkvZxwYXlsb2FkXG4vLyDlnKjnm7jlupTnmoRzdG9yZeS4rSwg5bCGYWN0aW9u55qEaGFuZGxlcuazqOWGjOWcqGRpc3BhdGNoZXLkuIpcblxudmFyIGNvcHlQcm9wZXJ0aWVzID0gcmVxdWlyZSgncmVhY3QvbGliL2NvcHlQcm9wZXJ0aWVzJyk7XG5cbnZhciBDaGF0RGlzcGF0Y2hlciA9IGNvcHlQcm9wZXJ0aWVzKG5ldyBEaXNwYXRjaGVyKCksIHtcbiAgICBoYW5kbGVNb3ZpZUFjdGlvbjogZnVuY3Rpb24oYWN0aW9uKXtcbiAgICAgICAgdGhpcy5kaXNwYXRjaCh7XG4gICAgICAgICAgICBzb3VyY2U6ICdNT1ZJRV9BQ1RJT04nLFxuICAgICAgICAgICAgYWN0aW9uOiBhY3Rpb25cbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhdERpc3BhdGNoZXI7IiwiLypcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBEaXNwYXRjaGVyXG4gKiBAdHlwZWNoZWNrc1xuICovXG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCcuL2ludmFyaWFudCcpO1xuXG52YXIgX2xhc3RJRCA9IDE7XG52YXIgX3ByZWZpeCA9ICdJRF8nO1xuXG4vKipcbiAqIERpc3BhdGNoZXIgaXMgdXNlZCB0byBicm9hZGNhc3QgcGF5bG9hZHMgdG8gcmVnaXN0ZXJlZCBjYWxsYmFja3MuIFRoaXMgaXNcbiAqIGRpZmZlcmVudCBmcm9tIGdlbmVyaWMgcHViLXN1YiBzeXN0ZW1zIGluIHR3byB3YXlzOlxuICpcbiAqICAgMSkgQ2FsbGJhY2tzIGFyZSBub3Qgc3Vic2NyaWJlZCB0byBwYXJ0aWN1bGFyIGV2ZW50cy4gRXZlcnkgcGF5bG9hZCBpc1xuICogICAgICBkaXNwYXRjaGVkIHRvIGV2ZXJ5IHJlZ2lzdGVyZWQgY2FsbGJhY2suXG4gKiAgIDIpIENhbGxiYWNrcyBjYW4gYmUgZGVmZXJyZWQgaW4gd2hvbGUgb3IgcGFydCB1bnRpbCBvdGhlciBjYWxsYmFja3MgaGF2ZVxuICogICAgICBiZWVuIGV4ZWN1dGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGlzIGh5cG90aGV0aWNhbCBmbGlnaHQgZGVzdGluYXRpb24gZm9ybSwgd2hpY2hcbiAqIHNlbGVjdHMgYSBkZWZhdWx0IGNpdHkgd2hlbiBhIGNvdW50cnkgaXMgc2VsZWN0ZWQ6XG4gKlxuICogICB2YXIgZmxpZ2h0RGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjb3VudHJ5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDb3VudHJ5U3RvcmUgPSB7Y291bnRyeTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjaXR5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDaXR5U3RvcmUgPSB7Y2l0eTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgYmFzZSBmbGlnaHQgcHJpY2Ugb2YgdGhlIHNlbGVjdGVkIGNpdHlcbiAqICAgdmFyIEZsaWdodFByaWNlU3RvcmUgPSB7cHJpY2U6IG51bGx9XG4gKlxuICogV2hlbiBhIHVzZXIgY2hhbmdlcyB0aGUgc2VsZWN0ZWQgY2l0eSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY2l0eS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ2l0eTogJ3BhcmlzJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYENpdHlTdG9yZWA6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NpdHktdXBkYXRlJykge1xuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBwYXlsb2FkLnNlbGVjdGVkQ2l0eTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIHVzZXIgc2VsZWN0cyBhIGNvdW50cnksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NvdW50cnktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENvdW50cnk6ICdhdXN0cmFsaWEnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBib3RoIHN0b3JlczpcbiAqXG4gKiAgICBDb3VudHJ5U3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjb3VudHJ5LXVwZGF0ZScpIHtcbiAqICAgICAgIENvdW50cnlTdG9yZS5jb3VudHJ5ID0gcGF5bG9hZC5zZWxlY3RlZENvdW50cnk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBXaGVuIHRoZSBjYWxsYmFjayB0byB1cGRhdGUgYENvdW50cnlTdG9yZWAgaXMgcmVnaXN0ZXJlZCwgd2Ugc2F2ZSBhIHJlZmVyZW5jZVxuICogdG8gdGhlIHJldHVybmVkIHRva2VuLiBVc2luZyB0aGlzIHRva2VuIHdpdGggYHdhaXRGb3IoKWAsIHdlIGNhbiBndWFyYW50ZWVcbiAqIHRoYXQgYENvdW50cnlTdG9yZWAgaXMgdXBkYXRlZCBiZWZvcmUgdGhlIGNhbGxiYWNrIHRoYXQgdXBkYXRlcyBgQ2l0eVN0b3JlYFxuICogbmVlZHMgdG8gcXVlcnkgaXRzIGRhdGEuXG4gKlxuICogICBDaXR5U3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkge1xuICogICAgIGlmIChwYXlsb2FkLmFjdGlvblR5cGUgPT09ICdjb3VudHJ5LXVwZGF0ZScpIHtcbiAqICAgICAgIC8vIGBDb3VudHJ5U3RvcmUuY291bnRyeWAgbWF5IG5vdCBiZSB1cGRhdGVkLlxuICogICAgICAgZmxpZ2h0RGlzcGF0Y2hlci53YWl0Rm9yKFtDb3VudHJ5U3RvcmUuZGlzcGF0Y2hUb2tlbl0pO1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBpcyBub3cgZ3VhcmFudGVlZCB0byBiZSB1cGRhdGVkLlxuICpcbiAqICAgICAgIC8vIFNlbGVjdCB0aGUgZGVmYXVsdCBjaXR5IGZvciB0aGUgbmV3IGNvdW50cnlcbiAqICAgICAgIENpdHlTdG9yZS5jaXR5ID0gZ2V0RGVmYXVsdENpdHlGb3JDb3VudHJ5KENvdW50cnlTdG9yZS5jb3VudHJ5KTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSB1c2FnZSBvZiBgd2FpdEZvcigpYCBjYW4gYmUgY2hhaW5lZCwgZm9yIGV4YW1wbGU6XG4gKlxuICogICBGbGlnaHRQcmljZVN0b3JlLmRpc3BhdGNoVG9rZW4gPVxuICogICAgIGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkpIHtcbiAqICAgICAgIHN3aXRjaCAocGF5bG9hZC5hY3Rpb25UeXBlKSB7XG4gKiAgICAgICAgIGNhc2UgJ2NvdW50cnktdXBkYXRlJzpcbiAqICAgICAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NpdHlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBnZXRGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKlxuICogICAgICAgICBjYXNlICdjaXR5LXVwZGF0ZSc6XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgYGNvdW50cnktdXBkYXRlYCBwYXlsb2FkIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBpbnZva2UgdGhlIHN0b3JlcydcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzIGluIG9yZGVyOiBgQ291bnRyeVN0b3JlYCwgYENpdHlTdG9yZWAsIHRoZW5cbiAqIGBGbGlnaHRQcmljZVN0b3JlYC5cbiAqL1xuXG4gIGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XCJ1c2Ugc3RyaWN0XCI7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZyA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGV2ZXJ5IGRpc3BhdGNoZWQgcGF5bG9hZC4gUmV0dXJuc1xuICAgKiBhIHRva2VuIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBgd2FpdEZvcigpYC5cbiAgICpcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHJldHVybiB7c3RyaW5nfVxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUucmVnaXN0ZXI9ZnVuY3Rpb24oY2FsbGJhY2spIHtcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgaWQgPSBfcHJlZml4ICsgX2xhc3RJRCsrO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSA9IGNhbGxiYWNrO1xuICAgIHJldHVybiBpZDtcbiAgfTtcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGNhbGxiYWNrIGJhc2VkIG9uIGl0cyB0b2tlbi5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS51bnJlZ2lzdGVyPWZ1bmN0aW9uKGlkKSB7XCJ1c2Ugc3RyaWN0XCI7XG4gICAgaW52YXJpYW50KFxuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdLFxuICAgICAgJ0Rpc3BhdGNoZXIudW5yZWdpc3RlciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJyxcbiAgICAgIGlkXG4gICAgKTtcbiAgICBkZWxldGUgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXYWl0cyBmb3IgdGhlIGNhbGxiYWNrcyBzcGVjaWZpZWQgdG8gYmUgaW52b2tlZCBiZWZvcmUgY29udGludWluZyBleGVjdXRpb25cbiAgICogb2YgdGhlIGN1cnJlbnQgY2FsbGJhY2suIFRoaXMgbWV0aG9kIHNob3VsZCBvbmx5IGJlIHVzZWQgYnkgYSBjYWxsYmFjayBpblxuICAgKiByZXNwb25zZSB0byBhIGRpc3BhdGNoZWQgcGF5bG9hZC5cbiAgICpcbiAgICogQHBhcmFtIHthcnJheTxzdHJpbmc+fSBpZHNcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLndhaXRGb3I9ZnVuY3Rpb24oaWRzKSB7XCJ1c2Ugc3RyaWN0XCI7XG4gICAgaW52YXJpYW50KFxuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nLFxuICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBNdXN0IGJlIGludm9rZWQgd2hpbGUgZGlzcGF0Y2hpbmcuJ1xuICAgICk7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGlkcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIHZhciBpZCA9IGlkc1tpaV07XG4gICAgICBpZiAodGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgIGludmFyaWFudChcbiAgICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0sXG4gICAgICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBDaXJjdWxhciBkZXBlbmRlbmN5IGRldGVjdGVkIHdoaWxlICcgK1xuICAgICAgICAgICd3YWl0aW5nIGZvciBgJXNgLicsXG4gICAgICAgICAgaWRcbiAgICAgICAgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpbnZhcmlhbnQoXG4gICAgICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSxcbiAgICAgICAgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJyxcbiAgICAgICAgaWRcbiAgICAgICk7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrKGlkKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIERpc3BhdGNoZXMgYSBwYXlsb2FkIHRvIGFsbCByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBheWxvYWRcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoPWZ1bmN0aW9uKHBheWxvYWQpIHtcInVzZSBzdHJpY3RcIjtcbiAgICBpbnZhcmlhbnQoXG4gICAgICAhdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nLFxuICAgICAgJ0Rpc3BhdGNoLmRpc3BhdGNoKC4uLik6IENhbm5vdCBkaXNwYXRjaCBpbiB0aGUgbWlkZGxlIG9mIGEgZGlzcGF0Y2guJ1xuICAgICk7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9zdGFydERpc3BhdGNoaW5nKHBheWxvYWQpO1xuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcykge1xuICAgICAgICBpZiAodGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfc3RvcERpc3BhdGNoaW5nKCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBJcyB0aGlzIERpc3BhdGNoZXIgY3VycmVudGx5IGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuaXNEaXNwYXRjaGluZz1mdW5jdGlvbigpIHtcInVzZSBzdHJpY3RcIjtcbiAgICByZXR1cm4gdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSBjYWxsYmFjayBzdG9yZWQgd2l0aCB0aGUgZ2l2ZW4gaWQuIEFsc28gZG8gc29tZSBpbnRlcm5hbFxuICAgKiBib29ra2VlcGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IGlkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2s9ZnVuY3Rpb24oaWQpIHtcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0gPSB0cnVlO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzW2lkXSh0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkKTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0gPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgYm9va2tlZXBpbmcgbmVlZGVkIHdoZW4gZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBwYXlsb2FkXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfc3RhcnREaXNwYXRjaGluZz1mdW5jdGlvbihwYXlsb2FkKSB7XCJ1c2Ugc3RyaWN0XCI7XG4gICAgZm9yICh2YXIgaWQgaW4gdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3MpIHtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSA9IGZhbHNlO1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWRbaWRdID0gZmFsc2U7XG4gICAgfVxuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBwYXlsb2FkO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENsZWFyIGJvb2trZWVwaW5nIHVzZWQgZm9yIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLiREaXNwYXRjaGVyX3N0b3BEaXNwYXRjaGluZz1mdW5jdGlvbigpIHtcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gbnVsbDtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgfTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXI7XG4iLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNCwgRmFjZWJvb2ssIEluYy5cbiAqIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKlxuICogVGhpcyBzb3VyY2UgY29kZSBpcyBsaWNlbnNlZCB1bmRlciB0aGUgQlNELXN0eWxlIGxpY2Vuc2UgZm91bmQgaW4gdGhlXG4gKiBMSUNFTlNFIGZpbGUgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoaXMgc291cmNlIHRyZWUuIEFuIGFkZGl0aW9uYWwgZ3JhbnRcbiAqIG9mIHBhdGVudCByaWdodHMgY2FuIGJlIGZvdW5kIGluIHRoZSBQQVRFTlRTIGZpbGUgaW4gdGhlIHNhbWUgZGlyZWN0b3J5LlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBpbnZhcmlhbnRcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBVc2UgaW52YXJpYW50KCkgdG8gYXNzZXJ0IHN0YXRlIHdoaWNoIHlvdXIgcHJvZ3JhbSBhc3N1bWVzIHRvIGJlIHRydWUuXG4gKlxuICogUHJvdmlkZSBzcHJpbnRmLXN0eWxlIGZvcm1hdCAob25seSAlcyBpcyBzdXBwb3J0ZWQpIGFuZCBhcmd1bWVudHNcbiAqIHRvIHByb3ZpZGUgaW5mb3JtYXRpb24gYWJvdXQgd2hhdCBicm9rZSBhbmQgd2hhdCB5b3Ugd2VyZVxuICogZXhwZWN0aW5nLlxuICpcbiAqIFRoZSBpbnZhcmlhbnQgbWVzc2FnZSB3aWxsIGJlIHN0cmlwcGVkIGluIHByb2R1Y3Rpb24sIGJ1dCB0aGUgaW52YXJpYW50XG4gKiB3aWxsIHJlbWFpbiB0byBlbnN1cmUgbG9naWMgZG9lcyBub3QgZGlmZmVyIGluIHByb2R1Y3Rpb24uXG4gKi9cblxudmFyIGludmFyaWFudCA9IGZ1bmN0aW9uKGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIGlmIChmYWxzZSkge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICtcbiAgICAgICAgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJ1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdJbnZhcmlhbnQgVmlvbGF0aW9uOiAnICtcbiAgICAgICAgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJnc1thcmdJbmRleCsrXTsgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcbiIsIi8qKlxuICogQGpzeCBSZWFjdC5ET01cbiAqLyBcblxudmFyIENoYXRMaXN0ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL0NoYXRMaXN0LnJlYWN0LmpzJyk7XG52YXIgTW92aWVDdHJsID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL01vdmllLmpzJyk7XG5cblxuUmVhY3QucmVuZGVyQ29tcG9uZW50KENoYXRMaXN0KHtzY3JvbGxFbGU6IFwiI21zZy1tb2R1bGVcIn0pLCAkKCcjbXNnLW1vZHVsZSAubGlzdC1jdG4nKS5nZXQoMCkpO1xuXG5cbiQoJy5zaW11bGF0ZS12aWRlbyBhdWRpbycpLm9uKCdwbGF5JywgZnVuY3Rpb24oKXtcbiAgICAvLyBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgIE1vdmllQ3RybC5zdGFydCgpO1xuICAgIC8vIH0sIDE1MDApO1xufSk7IiwiXG5cblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBtZXJnZSA9IHJlcXVpcmUoJ3JlYWN0L2xpYi9tZXJnZScpO1xuXG52YXIgQ2hhdERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9kaXNwYXRjaGVyL0NoYXREaXNwYXRjaGVyJyk7XG52YXIgQ2hhdENvbnN0YW50cyA9IHJlcXVpcmUoJy4uL2NvbnN0YW50cy9DaGF0Q29uc3RhbnRzJyk7XG5cbnZhciBDSEFOR0VfRVZFTlQgPSAnY2hhbmdlJztcblxudmFyIGRpYWxvZ0RhdGEgPSByZXF1aXJlKCcuLi9kYXRhL2RpYWxvZ0RhdGEuanMnKTtcbnZhciB1c2VyRGF0YSA9IHJlcXVpcmUoJy4uL2RhdGEvdXNlckRhdGEuanMnKTtcblxuXG52YXIgX2RhdGEgPSB7fTtcblxuLy8gX2RhdGEgPSBkaWFsb2dEYXRhO1xuXG5mdW5jdGlvbiBnZXRBbGwoKXtcbiAgICB2YXIgYXJyID0gW107XG4gICAgZm9yKCB2YXIgaSBpbiBfZGF0YSApe1xuICAgICAgICBhcnIucHVzaCggX2RhdGFbaV0gKVxuICAgIH1cbiAgICByZXR1cm4gYXJyO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVPbmUoaWQsIG9iail7XG4gICAgX2RhdGFbaWRdID0gb2JqO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVPbmUoaWQsIHVwZGF0ZXMpe1xuICAgIF9kYXRhW2lkXSA9IG1lcmdlKF9kYXRhW2lkXSwgdXBkYXRlcyk7XG59XG5cbnZhciBDaGF0U3RvcmUgPSBtZXJnZShFdmVudEVtaXR0ZXIucHJvdG90eXBlLCB7XG4gICAgZ2V0QWxsOiBnZXRBbGwsXG4gICAgZW1pdENoYW5nZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5lbWl0KENIQU5HRV9FVkVOVCk7XG4gICAgfSxcbiAgICBhZGRDaGFuZ2VMaXN0ZW5lcjogZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICB0aGlzLm9uKENIQU5HRV9FVkVOVCwgY2FsbGJhY2spXG4gICAgfSxcbiAgICByZW1vdmVDaGFuZ2VMaXN0ZW5lcjogZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKENIQU5HRV9FVkVOVCwgY2FsbGJhY2spXG4gICAgfVxufSk7XG5cblxuQ2hhdERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCl7XG4gICAgdmFyIGFjdGlvbiA9IHBheWxvYWQuYWN0aW9uO1xuXG4gICAgc3dpdGNoKGFjdGlvbi5hY3Rpb25UeXBlKXtcbiAgICAgICAgY2FzZSBDaGF0Q29uc3RhbnRzLldPUkRfQ1JFQVRFOlxuICAgICAgICAgICAgY3JlYXRlT25lKGFjdGlvbi5pZCwgYWN0aW9uLndvcmQpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQ2hhdENvbnN0YW50cy5XT1JEX1VQREFURTpcbiAgICAgICAgICAgIHVwZGF0ZU9uZShhY3Rpb24uaWQsIGFjdGlvbi51cGRhdGVzKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ2NoYXQgc3RvcmUgZG8gbm90IGhhbmRsZSB0aGlzIGFjdGlvbicsIGFjdGlvbik7XG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG5cbiAgICBDaGF0U3RvcmUuZW1pdENoYW5nZSgpO1xuXG4gICAgcmV0dXJuIHRydWU7XG59KTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXRTdG9yZTsiXX0=
