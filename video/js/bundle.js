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
        callback( word.substr(0, 1) );
        setTimeout(function(){
            callback(word.substr(0, i+1));
        }, (dur*(i+1)/arr.length) + offSet);
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
    MovieCtrl.start();
    setTimeout(function(){
        $('#msg-module').removeClass('hidden');
    }, 2400);

    setTimeout(function(){
        $('.mask.curtain').removeClass('hidden');
        setTimeout(function(){
            $('.movie-title').removeClass('hidden');
        }, 2000);
    // before wardo: mark!!!
    },55350);

    // 隐藏掉控制条
    $(this).css('opacity', 0);
    var self = this;
    setTimeout(function(){
        $(self).removeAttr('controls');
    }, 1000);
    
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvY29weVByb3BlcnRpZXMuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvaW52YXJpYW50LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy9ub2RlX21vZHVsZXMvcmVhY3QvbGliL2tleU1pcnJvci5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL3JlYWN0L2xpYi9tZXJnZS5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvbm9kZV9tb2R1bGVzL3JlYWN0L2xpYi9tZXJnZUhlbHBlcnMuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL25vZGVfbW9kdWxlcy9yZWFjdC9saWIvbWVyZ2VJbnRvLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9hY3Rpb25zL01vdmllQWN0aW9uLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL0NoYXRMaXN0LnJlYWN0LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL0NoYXRXb3JkLnJlYWN0LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb21wb25lbnRzL01vdmllLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9jb25zdGFudHMvQ2hhdENvbnN0YW50cy5qcyIsIi9Vc2Vycy9jaGVubGxvcy9Eb2N1bWVudHMvZGV2L1JlYWN0Rmx1eC9rZmMvdmlkZW8vanMvZGF0YS9kaWFsb2dEYXRhLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kYXRhL3VzZXJEYXRhLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kaXNwYXRjaGVyL0NoYXREaXNwYXRjaGVyLmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9kaXNwYXRjaGVyL0Rpc3BhdGNoZXIuanMiLCIvVXNlcnMvY2hlbmxsb3MvRG9jdW1lbnRzL2Rldi9SZWFjdEZsdXgva2ZjL3ZpZGVvL2pzL2Rpc3BhdGNoZXIvaW52YXJpYW50LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9mYWtlX2I0YjFlYzA0LmpzIiwiL1VzZXJzL2NoZW5sbG9zL0RvY3VtZW50cy9kZXYvUmVhY3RGbHV4L2tmYy92aWRlby9qcy9zdG9yZXMvQ2hhdFN0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgY29weVByb3BlcnRpZXNcbiAqL1xuXG4vKipcbiAqIENvcHkgcHJvcGVydGllcyBmcm9tIG9uZSBvciBtb3JlIG9iamVjdHMgKHVwIHRvIDUpIGludG8gdGhlIGZpcnN0IG9iamVjdC5cbiAqIFRoaXMgaXMgYSBzaGFsbG93IGNvcHkuIEl0IG11dGF0ZXMgdGhlIGZpcnN0IG9iamVjdCBhbmQgYWxzbyByZXR1cm5zIGl0LlxuICpcbiAqIE5PVEU6IGBhcmd1bWVudHNgIGhhcyBhIHZlcnkgc2lnbmlmaWNhbnQgcGVyZm9ybWFuY2UgcGVuYWx0eSwgd2hpY2ggaXMgd2h5XG4gKiB3ZSBkb24ndCBzdXBwb3J0IHVubGltaXRlZCBhcmd1bWVudHMuXG4gKi9cbmZ1bmN0aW9uIGNvcHlQcm9wZXJ0aWVzKG9iaiwgYSwgYiwgYywgZCwgZSwgZikge1xuICBvYmogPSBvYmogfHwge307XG5cbiAgaWYgKFwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOVikge1xuICAgIGlmIChmKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RvbyBtYW55IGFyZ3VtZW50cyBwYXNzZWQgdG8gY29weVByb3BlcnRpZXMnKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlXTtcbiAgdmFyIGlpID0gMCwgdjtcbiAgd2hpbGUgKGFyZ3NbaWldKSB7XG4gICAgdiA9IGFyZ3NbaWkrK107XG4gICAgZm9yICh2YXIgayBpbiB2KSB7XG4gICAgICBvYmpba10gPSB2W2tdO1xuICAgIH1cblxuICAgIC8vIElFIGlnbm9yZXMgdG9TdHJpbmcgaW4gb2JqZWN0IGl0ZXJhdGlvbi4uIFNlZTpcbiAgICAvLyB3ZWJyZWZsZWN0aW9uLmJsb2dzcG90LmNvbS8yMDA3LzA3L3F1aWNrLWZpeC1pbnRlcm5ldC1leHBsb3Jlci1hbmQuaHRtbFxuICAgIGlmICh2Lmhhc093blByb3BlcnR5ICYmIHYuaGFzT3duUHJvcGVydHkoJ3RvU3RyaW5nJykgJiZcbiAgICAgICAgKHR5cGVvZiB2LnRvU3RyaW5nICE9ICd1bmRlZmluZWQnKSAmJiAob2JqLnRvU3RyaW5nICE9PSB2LnRvU3RyaW5nKSkge1xuICAgICAgb2JqLnRvU3RyaW5nID0gdi50b1N0cmluZztcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvcHlQcm9wZXJ0aWVzO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSkiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIGludmFyaWFudFxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgaW52YXJpYW50ID0gZnVuY3Rpb24oY29uZGl0aW9uLCBmb3JtYXQsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgaWYgKFwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOVikge1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnZhcmlhbnQgcmVxdWlyZXMgYW4gZXJyb3IgbWVzc2FnZSBhcmd1bWVudCcpO1xuICAgIH1cbiAgfVxuXG4gIGlmICghY29uZGl0aW9uKSB7XG4gICAgdmFyIGVycm9yO1xuICAgIGlmIChmb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICtcbiAgICAgICAgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJ1xuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGFyZ3MgPSBbYSwgYiwgYywgZCwgZSwgZl07XG4gICAgICB2YXIgYXJnSW5kZXggPSAwO1xuICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoXG4gICAgICAgICdJbnZhcmlhbnQgVmlvbGF0aW9uOiAnICtcbiAgICAgICAgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJnc1thcmdJbmRleCsrXTsgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJvTWZwQW5cIikpIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBrZXlNaXJyb3JcbiAqIEB0eXBlY2hlY2tzIHN0YXRpYy1vbmx5XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKFwiLi9pbnZhcmlhbnRcIik7XG5cbi8qKlxuICogQ29uc3RydWN0cyBhbiBlbnVtZXJhdGlvbiB3aXRoIGtleXMgZXF1YWwgdG8gdGhlaXIgdmFsdWUuXG4gKlxuICogRm9yIGV4YW1wbGU6XG4gKlxuICogICB2YXIgQ09MT1JTID0ga2V5TWlycm9yKHtibHVlOiBudWxsLCByZWQ6IG51bGx9KTtcbiAqICAgdmFyIG15Q29sb3IgPSBDT0xPUlMuYmx1ZTtcbiAqICAgdmFyIGlzQ29sb3JWYWxpZCA9ICEhQ09MT1JTW215Q29sb3JdO1xuICpcbiAqIFRoZSBsYXN0IGxpbmUgY291bGQgbm90IGJlIHBlcmZvcm1lZCBpZiB0aGUgdmFsdWVzIG9mIHRoZSBnZW5lcmF0ZWQgZW51bSB3ZXJlXG4gKiBub3QgZXF1YWwgdG8gdGhlaXIga2V5cy5cbiAqXG4gKiAgIElucHV0OiAge2tleTE6IHZhbDEsIGtleTI6IHZhbDJ9XG4gKiAgIE91dHB1dDoge2tleTE6IGtleTEsIGtleTI6IGtleTJ9XG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9ialxuICogQHJldHVybiB7b2JqZWN0fVxuICovXG52YXIga2V5TWlycm9yID0gZnVuY3Rpb24ob2JqKSB7XG4gIHZhciByZXQgPSB7fTtcbiAgdmFyIGtleTtcbiAgKFwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViA/IGludmFyaWFudChcbiAgICBvYmogaW5zdGFuY2VvZiBPYmplY3QgJiYgIUFycmF5LmlzQXJyYXkob2JqKSxcbiAgICAna2V5TWlycm9yKC4uLik6IEFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0LidcbiAgKSA6IGludmFyaWFudChvYmogaW5zdGFuY2VvZiBPYmplY3QgJiYgIUFycmF5LmlzQXJyYXkob2JqKSkpO1xuICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICBpZiAoIW9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcmV0W2tleV0gPSBrZXk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ga2V5TWlycm9yO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSkiLCIvKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgbWVyZ2VcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIG1lcmdlSW50byA9IHJlcXVpcmUoXCIuL21lcmdlSW50b1wiKTtcblxuLyoqXG4gKiBTaGFsbG93IG1lcmdlcyB0d28gc3RydWN0dXJlcyBpbnRvIGEgcmV0dXJuIHZhbHVlLCB3aXRob3V0IG11dGF0aW5nIGVpdGhlci5cbiAqXG4gKiBAcGFyYW0gez9vYmplY3R9IG9uZSBPcHRpb25hbCBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIHRvIG1lcmdlIGZyb20uXG4gKiBAcGFyYW0gez9vYmplY3R9IHR3byBPcHRpb25hbCBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIHRvIG1lcmdlIGZyb20uXG4gKiBAcmV0dXJuIHtvYmplY3R9IFRoZSBzaGFsbG93IGV4dGVuc2lvbiBvZiBvbmUgYnkgdHdvLlxuICovXG52YXIgbWVyZ2UgPSBmdW5jdGlvbihvbmUsIHR3bykge1xuICB2YXIgcmVzdWx0ID0ge307XG4gIG1lcmdlSW50byhyZXN1bHQsIG9uZSk7XG4gIG1lcmdlSW50byhyZXN1bHQsIHR3byk7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1lcmdlO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqIEBwcm92aWRlc01vZHVsZSBtZXJnZUhlbHBlcnNcbiAqXG4gKiByZXF1aXJlc1BvbHlmaWxsczogQXJyYXkuaXNBcnJheVxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgaW52YXJpYW50ID0gcmVxdWlyZShcIi4vaW52YXJpYW50XCIpO1xudmFyIGtleU1pcnJvciA9IHJlcXVpcmUoXCIuL2tleU1pcnJvclwiKTtcblxuLyoqXG4gKiBNYXhpbXVtIG51bWJlciBvZiBsZXZlbHMgdG8gdHJhdmVyc2UuIFdpbGwgY2F0Y2ggY2lyY3VsYXIgc3RydWN0dXJlcy5cbiAqIEBjb25zdFxuICovXG52YXIgTUFYX01FUkdFX0RFUFRIID0gMzY7XG5cbi8qKlxuICogV2Ugd29uJ3Qgd29ycnkgYWJvdXQgZWRnZSBjYXNlcyBsaWtlIG5ldyBTdHJpbmcoJ3gnKSBvciBuZXcgQm9vbGVhbih0cnVlKS5cbiAqIEZ1bmN0aW9ucyBhcmUgY29uc2lkZXJlZCB0ZXJtaW5hbHMsIGFuZCBhcnJheXMgYXJlIG5vdC5cbiAqIEBwYXJhbSB7Kn0gbyBUaGUgaXRlbS9vYmplY3QvdmFsdWUgdG8gdGVzdC5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWZmIHRoZSBhcmd1bWVudCBpcyBhIHRlcm1pbmFsLlxuICovXG52YXIgaXNUZXJtaW5hbCA9IGZ1bmN0aW9uKG8pIHtcbiAgcmV0dXJuIHR5cGVvZiBvICE9PSAnb2JqZWN0JyB8fCBvID09PSBudWxsO1xufTtcblxudmFyIG1lcmdlSGVscGVycyA9IHtcblxuICBNQVhfTUVSR0VfREVQVEg6IE1BWF9NRVJHRV9ERVBUSCxcblxuICBpc1Rlcm1pbmFsOiBpc1Rlcm1pbmFsLFxuXG4gIC8qKlxuICAgKiBDb252ZXJ0cyBudWxsL3VuZGVmaW5lZCB2YWx1ZXMgaW50byBlbXB0eSBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSB7P09iamVjdD19IGFyZyBBcmd1bWVudCB0byBiZSBub3JtYWxpemVkIChudWxsYWJsZSBvcHRpb25hbClcbiAgICogQHJldHVybiB7IU9iamVjdH1cbiAgICovXG4gIG5vcm1hbGl6ZU1lcmdlQXJnOiBmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gYXJnID09PSB1bmRlZmluZWQgfHwgYXJnID09PSBudWxsID8ge30gOiBhcmc7XG4gIH0sXG5cbiAgLyoqXG4gICAqIElmIG1lcmdpbmcgQXJyYXlzLCBhIG1lcmdlIHN0cmF0ZWd5ICptdXN0KiBiZSBzdXBwbGllZC4gSWYgbm90LCBpdCBpc1xuICAgKiBsaWtlbHkgdGhlIGNhbGxlcidzIGZhdWx0LiBJZiB0aGlzIGZ1bmN0aW9uIGlzIGV2ZXIgY2FsbGVkIHdpdGggYW55dGhpbmdcbiAgICogYnV0IGBvbmVgIGFuZCBgdHdvYCBiZWluZyBgQXJyYXlgcywgaXQgaXMgdGhlIGZhdWx0IG9mIHRoZSBtZXJnZSB1dGlsaXRpZXMuXG4gICAqXG4gICAqIEBwYXJhbSB7Kn0gb25lIEFycmF5IHRvIG1lcmdlIGludG8uXG4gICAqIEBwYXJhbSB7Kn0gdHdvIEFycmF5IHRvIG1lcmdlIGZyb20uXG4gICAqL1xuICBjaGVja01lcmdlQXJyYXlBcmdzOiBmdW5jdGlvbihvbmUsIHR3bykge1xuICAgIChcInByb2R1Y3Rpb25cIiAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPyBpbnZhcmlhbnQoXG4gICAgICBBcnJheS5pc0FycmF5KG9uZSkgJiYgQXJyYXkuaXNBcnJheSh0d28pLFxuICAgICAgJ1RyaWVkIHRvIG1lcmdlIGFycmF5cywgaW5zdGVhZCBnb3QgJXMgYW5kICVzLicsXG4gICAgICBvbmUsXG4gICAgICB0d29cbiAgICApIDogaW52YXJpYW50KEFycmF5LmlzQXJyYXkob25lKSAmJiBBcnJheS5pc0FycmF5KHR3bykpKTtcbiAgfSxcblxuICAvKipcbiAgICogQHBhcmFtIHsqfSBvbmUgT2JqZWN0IHRvIG1lcmdlIGludG8uXG4gICAqIEBwYXJhbSB7Kn0gdHdvIE9iamVjdCB0byBtZXJnZSBmcm9tLlxuICAgKi9cbiAgY2hlY2tNZXJnZU9iamVjdEFyZ3M6IGZ1bmN0aW9uKG9uZSwgdHdvKSB7XG4gICAgbWVyZ2VIZWxwZXJzLmNoZWNrTWVyZ2VPYmplY3RBcmcob25lKTtcbiAgICBtZXJnZUhlbHBlcnMuY2hlY2tNZXJnZU9iamVjdEFyZyh0d28pO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFyZ1xuICAgKi9cbiAgY2hlY2tNZXJnZU9iamVjdEFyZzogZnVuY3Rpb24oYXJnKSB7XG4gICAgKFwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViA/IGludmFyaWFudChcbiAgICAgICFpc1Rlcm1pbmFsKGFyZykgJiYgIUFycmF5LmlzQXJyYXkoYXJnKSxcbiAgICAgICdUcmllZCB0byBtZXJnZSBhbiBvYmplY3QsIGluc3RlYWQgZ290ICVzLicsXG4gICAgICBhcmdcbiAgICApIDogaW52YXJpYW50KCFpc1Rlcm1pbmFsKGFyZykgJiYgIUFycmF5LmlzQXJyYXkoYXJnKSkpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcGFyYW0geyp9IGFyZ1xuICAgKi9cbiAgY2hlY2tNZXJnZUludG9PYmplY3RBcmc6IGZ1bmN0aW9uKGFyZykge1xuICAgIChcInByb2R1Y3Rpb25cIiAhPT0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPyBpbnZhcmlhbnQoXG4gICAgICAoIWlzVGVybWluYWwoYXJnKSB8fCB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nKSAmJiAhQXJyYXkuaXNBcnJheShhcmcpLFxuICAgICAgJ1RyaWVkIHRvIG1lcmdlIGludG8gYW4gb2JqZWN0LCBpbnN0ZWFkIGdvdCAlcy4nLFxuICAgICAgYXJnXG4gICAgKSA6IGludmFyaWFudCgoIWlzVGVybWluYWwoYXJnKSB8fCB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nKSAmJiAhQXJyYXkuaXNBcnJheShhcmcpKSk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyB0aGF0IGEgbWVyZ2Ugd2FzIG5vdCBnaXZlbiBhIGNpcmN1bGFyIG9iamVjdCBvciBhbiBvYmplY3QgdGhhdCBoYWRcbiAgICogdG9vIGdyZWF0IG9mIGRlcHRoLlxuICAgKlxuICAgKiBAcGFyYW0ge251bWJlcn0gTGV2ZWwgb2YgcmVjdXJzaW9uIHRvIHZhbGlkYXRlIGFnYWluc3QgbWF4aW11bS5cbiAgICovXG4gIGNoZWNrTWVyZ2VMZXZlbDogZnVuY3Rpb24obGV2ZWwpIHtcbiAgICAoXCJwcm9kdWN0aW9uXCIgIT09IHByb2Nlc3MuZW52Lk5PREVfRU5WID8gaW52YXJpYW50KFxuICAgICAgbGV2ZWwgPCBNQVhfTUVSR0VfREVQVEgsXG4gICAgICAnTWF4aW11bSBkZWVwIG1lcmdlIGRlcHRoIGV4Y2VlZGVkLiBZb3UgbWF5IGJlIGF0dGVtcHRpbmcgdG8gbWVyZ2UgJyArXG4gICAgICAnY2lyY3VsYXIgc3RydWN0dXJlcyBpbiBhbiB1bnN1cHBvcnRlZCB3YXkuJ1xuICAgICkgOiBpbnZhcmlhbnQobGV2ZWwgPCBNQVhfTUVSR0VfREVQVEgpKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIHRoYXQgdGhlIHN1cHBsaWVkIG1lcmdlIHN0cmF0ZWd5IGlzIHZhbGlkLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gQXJyYXkgbWVyZ2Ugc3RyYXRlZ3kuXG4gICAqL1xuICBjaGVja0FycmF5U3RyYXRlZ3k6IGZ1bmN0aW9uKHN0cmF0ZWd5KSB7XG4gICAgKFwicHJvZHVjdGlvblwiICE9PSBwcm9jZXNzLmVudi5OT0RFX0VOViA/IGludmFyaWFudChcbiAgICAgIHN0cmF0ZWd5ID09PSB1bmRlZmluZWQgfHwgc3RyYXRlZ3kgaW4gbWVyZ2VIZWxwZXJzLkFycmF5U3RyYXRlZ2llcyxcbiAgICAgICdZb3UgbXVzdCBwcm92aWRlIGFuIGFycmF5IHN0cmF0ZWd5IHRvIGRlZXAgbWVyZ2UgZnVuY3Rpb25zIHRvICcgK1xuICAgICAgJ2luc3RydWN0IHRoZSBkZWVwIG1lcmdlIGhvdyB0byByZXNvbHZlIG1lcmdpbmcgdHdvIGFycmF5cy4nXG4gICAgKSA6IGludmFyaWFudChzdHJhdGVneSA9PT0gdW5kZWZpbmVkIHx8IHN0cmF0ZWd5IGluIG1lcmdlSGVscGVycy5BcnJheVN0cmF0ZWdpZXMpKTtcbiAgfSxcblxuICAvKipcbiAgICogU2V0IG9mIHBvc3NpYmxlIGJlaGF2aW9ycyBvZiBtZXJnZSBhbGdvcml0aG1zIHdoZW4gZW5jb3VudGVyaW5nIHR3byBBcnJheXNcbiAgICogdGhhdCBtdXN0IGJlIG1lcmdlZCB0b2dldGhlci5cbiAgICogLSBgY2xvYmJlcmA6IFRoZSBsZWZ0IGBBcnJheWAgaXMgaWdub3JlZC5cbiAgICogLSBgaW5kZXhCeUluZGV4YDogVGhlIHJlc3VsdCBpcyBhY2hpZXZlZCBieSByZWN1cnNpdmVseSBkZWVwIG1lcmdpbmcgYXRcbiAgICogICBlYWNoIGluZGV4LiAobm90IHlldCBzdXBwb3J0ZWQuKVxuICAgKi9cbiAgQXJyYXlTdHJhdGVnaWVzOiBrZXlNaXJyb3Ioe1xuICAgIENsb2JiZXI6IHRydWUsXG4gICAgSW5kZXhCeUluZGV4OiB0cnVlXG4gIH0pXG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbWVyZ2VIZWxwZXJzO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIm9NZnBBblwiKSkiLCIvKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTQgRmFjZWJvb2ssIEluYy5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgbWVyZ2VJbnRvXG4gKiBAdHlwZWNoZWNrcyBzdGF0aWMtb25seVxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG52YXIgbWVyZ2VIZWxwZXJzID0gcmVxdWlyZShcIi4vbWVyZ2VIZWxwZXJzXCIpO1xuXG52YXIgY2hlY2tNZXJnZU9iamVjdEFyZyA9IG1lcmdlSGVscGVycy5jaGVja01lcmdlT2JqZWN0QXJnO1xudmFyIGNoZWNrTWVyZ2VJbnRvT2JqZWN0QXJnID0gbWVyZ2VIZWxwZXJzLmNoZWNrTWVyZ2VJbnRvT2JqZWN0QXJnO1xuXG4vKipcbiAqIFNoYWxsb3cgbWVyZ2VzIHR3byBzdHJ1Y3R1cmVzIGJ5IG11dGF0aW5nIHRoZSBmaXJzdCBwYXJhbWV0ZXIuXG4gKlxuICogQHBhcmFtIHtvYmplY3R8ZnVuY3Rpb259IG9uZSBPYmplY3QgdG8gYmUgbWVyZ2VkIGludG8uXG4gKiBAcGFyYW0gez9vYmplY3R9IHR3byBPcHRpb25hbCBvYmplY3Qgd2l0aCBwcm9wZXJ0aWVzIHRvIG1lcmdlIGZyb20uXG4gKi9cbmZ1bmN0aW9uIG1lcmdlSW50byhvbmUsIHR3bykge1xuICBjaGVja01lcmdlSW50b09iamVjdEFyZyhvbmUpO1xuICBpZiAodHdvICE9IG51bGwpIHtcbiAgICBjaGVja01lcmdlT2JqZWN0QXJnKHR3byk7XG4gICAgZm9yICh2YXIga2V5IGluIHR3bykge1xuICAgICAgaWYgKCF0d28uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIG9uZVtrZXldID0gdHdvW2tleV07XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbWVyZ2VJbnRvO1xuIiwiXG4vLyDlo7DmmI7miYDmnInnmoRhY3Rpb25cbi8vIOeUseWTquS4qmRpc3BhdGNoZXLotJ/otKPliIblj5Fcbi8vIOWIhuWPkeeahHBheWxvYWTkuK3nmoRhY3Rpb25UeXBl5piv5LuA5LmIXG4vLyDov5nkuKphY3Rpb27miYDpnIDopoHnmoTlj4LmlbAsIOaOpeaUtuW5tuS8oOe7meWIhuWPkeWZqFxuXG52YXIgQ2hhdERpc3BhdGNoZXIgPSByZXF1aXJlKCcuLi9kaXNwYXRjaGVyL0NoYXREaXNwYXRjaGVyJyk7XG52YXIgQ2hhdENvbnN0YW50cyA9IHJlcXVpcmUoJy4uL2NvbnN0YW50cy9DaGF0Q29uc3RhbnRzJyk7XG5cbnZhciBNb3ZpZUFjdGlvbnMgPSB7XG4gICAgLy8gc3RhcnQgdGltZSBhcyBpZFxuICAgIGNyZWF0ZTogZnVuY3Rpb24od29yZCwgaWQpe1xuICAgICAgICBDaGF0RGlzcGF0Y2hlci5oYW5kbGVNb3ZpZUFjdGlvbih7XG4gICAgICAgICAgICBhY3Rpb25UeXBlOiBDaGF0Q29uc3RhbnRzLldPUkRfQ1JFQVRFLFxuICAgICAgICAgICAgd29yZDogd29yZCxcbiAgICAgICAgICAgIGlkOiBpZFxuICAgICAgICB9KVxuICAgIH0sXG4gICAgdXBkYXRlOiBmdW5jdGlvbihpZCwgdXBkYXRlcyl7XG4gICAgICAgIENoYXREaXNwYXRjaGVyLmhhbmRsZU1vdmllQWN0aW9uKHtcbiAgICAgICAgICAgIGFjdGlvblR5cGU6IENoYXRDb25zdGFudHMuV09SRF9VUERBVEUsXG4gICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICB1cGRhdGVzOiB1cGRhdGVzXG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNb3ZpZUFjdGlvbnM7XG5cbiIsIi8qKlxuICogQGpzeCBSZWFjdC5ET01cbiAqLyBcblxuXG5cbnZhciBDaGF0U3RvcmUgPSByZXF1aXJlKCcuLi9zdG9yZXMvQ2hhdFN0b3JlLmpzJylcblxudmFyIENoYXRXb3JkID0gcmVxdWlyZSgnLi9DaGF0V29yZC5yZWFjdC5qcycpO1xuXG5mdW5jdGlvbiBnZXRBbGxEYXRhKCl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbGlzdDogQ2hhdFN0b3JlLmdldEFsbCgpXG4gICAgfTtcbn07XG5cbnZhciBzY29sbEVsZSA9IG51bGwsIGxhc3RTY3JvbGxIZWlnaHQgPSAwO1xuZnVuY3Rpb24gY2hlY2tBbmRTY3JvbGwoKXtcbiAgICB2YXIgbmV3SCA9IHNjb2xsRWxlLnNjcm9sbEhlaWdodDtcbiAgICBpZiggbmV3SCA+IGxhc3RTY3JvbGxIZWlnaHQgKXtcbiAgICAgICAgc2NvbGxFbGUuc2Nyb2xsVG9wID0gbmV3SDtcbiAgICAgICAgbGFzdFNjcm9sbEhlaWdodCA9IG5ld0g7XG4gICAgfVxufVxuXG52YXIgQ2hhdExpc3QgPSBSZWFjdC5jcmVhdGVDbGFzcyh7ZGlzcGxheU5hbWU6ICdDaGF0TGlzdCcsXG4gICAgZ2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gZ2V0QWxsRGF0YSgpO1xuICAgIH0sXG4gICAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBzY29sbEVsZSA9ICQodGhpcy5wcm9wcy5zY3JvbGxFbGUpLmdldCgwKTtcbiAgICAgICAgY2hlY2tBbmRTY3JvbGwoKTtcbiAgICAgICAgLy8gbGFzdFNjcm9sbEhlaWdodCA9IHNjb2xsRWxlLnNjcm9sbEhlaWdodDtcbiAgICAgICAgQ2hhdFN0b3JlLmFkZENoYW5nZUxpc3RlbmVyKCB0aGlzLl9vbkNoYW5nZSApO1xuICAgIH0sXG4gICAgY29tcG9uZW50RGlkVXBkYXRlOiBmdW5jdGlvbigpe1xuICAgICAgICBjaGVja0FuZFNjcm9sbCgpO1xuICAgIH0sXG4gICAgY29tcG9uZW50V2lsbE1vdW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgQ2hhdFN0b3JlLnJlbW92ZUNoYW5nZUxpc3RlbmVyKCB0aGlzLl9vbkNoYW5nZSApO1xuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpe1xuICAgICAgICB2YXIgbm9kZXMgPSB0aGlzLnN0YXRlLmxpc3QubWFwKGZ1bmN0aW9uKGl0ZW0sIGkpe1xuICAgICAgICAgICAgcmV0dXJuIENoYXRXb3JkKHtpdGVtOiBpdGVtLCBrZXk6IGl9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIFJlYWN0LkRPTS51bCh7aWQ6IFwibXNnLWxpc3RcIn0sIG5vZGVzKTtcbiAgICB9LFxuICAgIF9vbkNoYW5nZTogZnVuY3Rpb24oKXtcbiAgICAgICAgdGhpcy5zZXRTdGF0ZSggZ2V0QWxsRGF0YSgpIClcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGF0TGlzdDsiLCIvKipcbiAqIEBqc3ggUmVhY3QuRE9NXG4gKi8gXG5cbiBmdW5jdGlvbiBidWlsZE1zZ0l0ZW0obXNnKXtcbiAgICByZXR1cm4gKFxuICAgICAgICBSZWFjdC5ET00ubGkoe2NsYXNzTmFtZTogXCJtc2ctaXRlbVwifSwgXG4gICAgICAgICAgICBSZWFjdC5ET00uaW1nKHtzcmM6IG1zZy5hdmF0YXIsIGNsYXNzTmFtZTogXCJhdmF0YXJcIn0pLCBcbiAgICAgICAgICAgIFJlYWN0LkRPTS5kaXYoe2NsYXNzTmFtZTogXCJtc2ctY29udGVudFwifSwgXG4gICAgICAgICAgICAgICAgUmVhY3QuRE9NLnNwYW4oe2NsYXNzTmFtZTogXCJtc2ctdXNlci1uYW1lXCJ9LCBtc2cuYWxpYXMpLCBcbiAgICAgICAgICAgICAgICBSZWFjdC5ET00uc3Bhbih7Y2xhc3NOYW1lOiBcIm1zZy10ZXh0XCJ9LCBtc2cud29yZClcbiAgICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgICApO1xuICAgIC8vIHJldHVybiAoXG4gICAgLy8gICAgIDxsaSBjbGFzc05hbWU9XCJtc2ctaXRlbVwiPlxuICAgIC8vICAgICAgICAgPGltZyBzcmM9eycuL2ltZy9hdmF0YXIvJyttc2cudXNlcisnLnBuZyd9IGNsYXNzTmFtZT1cImF2YXRhclwiIC8+XG4gICAgLy8gICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1zZy1jb250ZW50XCI+XG4gICAgLy8gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibXNnLXVzZXItbmFtZVwiPnttc2cudXNlcn08L3NwYW4+XG4gICAgLy8gICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibXNnLXRleHRcIj57bXNnLndvcmR9PC9zcGFuPlxuICAgIC8vICAgICAgICAgPC9kaXY+XG4gICAgLy8gICAgIDwvbGk+XG4gICAgLy8gICAgICk7XG4gfVxuXG5cbnZhciBDaGF0V29yZCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtkaXNwbGF5TmFtZTogJ0NoYXRXb3JkJyxcbiAgICBnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9LFxuICAgIGNvbXBvbmVudERpZFVwZGF0ZTogZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5wcm9wcy5pdGVtLndvcmQpO1xuICAgIH0sXG4gICAgcmVuZGVyOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gYnVpbGRNc2dJdGVtKHRoaXMucHJvcHMuaXRlbSk7XG4gICAgfVxufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDaGF0V29yZDsiLCJcblxudmFyIE1vdmllQWN0aW9uID0gcmVxdWlyZSgnLi4vYWN0aW9ucy9Nb3ZpZUFjdGlvbi5qcycpO1xudmFyIGRpYWxvZ0RhdGEgPSByZXF1aXJlKCcuLi9kYXRhL2RpYWxvZ0RhdGEuanMnKTtcbnZhciB1c2VyRGF0YSA9IHJlcXVpcmUoJy4uL2RhdGEvdXNlckRhdGEuanMnKTtcbi8vIHNvdXJjZSBkYXRhOiBkaWFsb2dcblxuZnVuY3Rpb24gZ2V0VXNlckluZm8oaWRlbnRpZmVyKXtcbiAgICByZXR1cm4gdXNlckRhdGFbaWRlbnRpZmVyXTtcbn1cblxuLy8gc3RyaW5nIHdvcmQsIGR1cmF0aW9uIG9mIG1zLCBvZmZzZXQgb2YgbXNcbmZ1bmN0aW9uIHR5cGVXb3Jkcyh3b3JkLCBkdXIsIG9mZlNldCwgY2FsbGJhY2spe1xuICAgIGlmKCFvZmZTZXQpe1xuICAgICAgICBvZmZTZXQgPSAwO1xuICAgIH1cbiAgICB2YXIgYXJyID0gd29yZC5zcGxpdCgnJyk7XG5cbiAgICBhcnIuZm9yRWFjaChmdW5jdGlvbihlbCwgaSl7XG4gICAgICAgIGNhbGxiYWNrKCB3b3JkLnN1YnN0cigwLCAxKSApO1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBjYWxsYmFjayh3b3JkLnN1YnN0cigwLCBpKzEpKTtcbiAgICAgICAgfSwgKGR1ciooaSsxKS9hcnIubGVuZ3RoKSArIG9mZlNldCk7XG4gICAgfSk7XG59XG5cblxudmFyIE1vdmllQ3RybCA9IHtcbiAgICBzdGFydDogZnVuY3Rpb24oKXtcbiAgICAgICAgLy8gc2V0VGltZW91dCBhbmQgc2VuZCBhY3Rpb24uLi5cbiAgICAgICAgZm9yKCB2YXIgaSBpbiBkaWFsb2dEYXRhICl7XG4gICAgICAgICAgICAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICB2YXIgdGltZW91dCA9IGtleTtcbiAgICAgICAgICAgICAgICB2YXIgaWQgPSBrZXk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IGRpYWxvZ0RhdGFba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHVzZXJJbmZvID0gZ2V0VXNlckluZm8oaXRlbS51c2VyKTtcbiAgICAgICAgICAgICAgICAgICAgTW92aWVBY3Rpb24uY3JlYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsaWFzOiB1c2VySW5mby5hbGlhcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2YXRhcjogJ2ltZy9hdmF0YXIvJyt1c2VySW5mby5hdmF0YXIsXG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JkOiAnJ1xuICAgICAgICAgICAgICAgICAgICB9LCBpZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgKGZ1bmN0aW9uKHN0ciwgZHVyLCBvZmZzZXQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRpYUlEID0gb2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZVdvcmRzKHN0ciwgZHVyLCAwLCBmdW5jdGlvbihwYXJ0aWFsKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNb3ZpZUFjdGlvbi51cGRhdGUoIGRpYUlELCB7d29yZDogcGFydGlhbH0gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KShpdGVtLndvcmQsIGl0ZW0uZHVyLCBOdW1iZXIodGltZW91dCkpO1xuXG4gICAgICAgICAgICAgICAgfSx0aW1lb3V0KTtcbiAgICAgICAgICAgIH0pKGkpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb3ZpZUN0cmw7IiwidmFyIGtleU1pcnJvciA9IHJlcXVpcmUoJ3JlYWN0L2xpYi9rZXlNaXJyb3InKTtcblxubW9kdWxlLmV4cG9ydHMgPSBrZXlNaXJyb3Ioe1xuICAgIFdPUkRfQ1JFQVRFOiBudWxsLFxuICAgIFdPUkRfVVBEQVRFOiBudWxsXG59KTsiLCJ2YXIgZGF0YSA9IHtcbiAgICAyMjQ3OiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ0kgdGhpbmsgSVxcJ3ZlIGNvbWUgdXAgd2l0aCBzb21ldGhpbmcuLi4nLFxuICAgICAgICBkdXI6IDM1NjEgLSAyMzQ3XG4gICAgfSxcbiAgICAzNjQwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICd0aGF0IGxvb2tzIGdvb2QuIFRoYXQgbG9va3MgcmVhbGx5IGdvb2QuJyxcbiAgICAgICAgZHVyOiA1Mjg1IC0gMzY0MFxuICAgIH0sXG4gICAgNTQyMDoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICdJdFxcJ3MgZ29ubmEgYmUgb25saW5lIGFueSBzZWNvbmQuJyxcbiAgICAgICAgZHVyOiAgNjU3MCAtIDU0MjBcbiAgICB9LFxuICAgIDY2NTA6IHtcbiAgICAgICAgdXNlcjogJ2R1c3RpbicsXG4gICAgICAgIHdvcmQ6ICdXaG8gc2hvdWxkIHdlIHNlbmQgaXQgdG8gZmlyc3Q/JyxcbiAgICAgICAgZHVyOiA3NDkxIC0gNjY1MFxuICAgIH0sXG4gICAgNzY5MDoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICdKdXN0IGEgY291cGxlIG9mIHBlb3BsZS4uLiBUaGUgcXVlc3Rpb24gaXMuLi4gd2hvIGFyZSB0aGV5IGdvbm5hIHNlbmQgaXQgdG8/JyxcbiAgICAgICAgZHVyOiAxMDIyMyAtIDc2OTBcbiAgICB9LFxuICAgIDEwMzI1OiB7XG4gICAgICAgIHVzZXI6ICdtYXJ5JyxcbiAgICAgICAgd29yZDogJ1RoZSBzaXRlIGdvdCAyLDIwMCBoaXRzIHdpdGhpbiB0d28gaG91cnM/Pz8nLFxuICAgICAgICBkdXI6IDEyOTUyIC0gMTAzMjVcbiAgICB9LFxuICAgIDEzMDUzOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ1RIT1VTQU5ELi4uIDIyLDAwMC4nLFxuICAgICAgICBkdXI6IDE0NTc2IC0gMTMwNTNcbiAgICB9LFxuICAgIDE0NjAwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJ5JyxcbiAgICAgICAgd29yZDogJ1dPVyEnLFxuICAgICAgICBkdXI6IDE0NzAwIC0gMTQ2MDBcbiAgICB9LFxuICAgIDE0OTAwOiB7XG4gICAgICAgIHVzZXI6ICdlcmljYScsXG4gICAgICAgIHdvcmQ6ICdZb3UgY2FsbGVkIG1lIGEgQklUQ0ggb24gdGhlIEludGVybmV0LicsXG4gICAgICAgIGR1cjogMTYyODAgLSAxNDkwMFxuICAgIH0sXG4gICAgMTYzOTA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAnRG9lc25cXCd0IGFueWJvZHkgaGF2ZSBhIHNlbnNlIG9mIGh1bW9yPycsXG4gICAgICAgIGR1cjogMTczMDYgLSAxNjM5MFxuICAgIH0sXG4gICAgMTczODA6IHtcbiAgICAgICAgdXNlcjogJ2VyaWNhJyxcbiAgICAgICAgd29yZDogJ1RoZSBJbnRlcm5ldFxcJ3Mgbm90IHdyaXR0ZW4gaW4gcGVuY2lsLCBNYXJrLCBpdFxcJ3Mgd3JpdHRlbiBpbiBpbmsuJyxcbiAgICAgICAgZHVyOiAgMTkzNzAgLSAxNzM4MFxuICAgIH0sXG4gICAgMTk1NjA6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ3UgdGhpbmsgbWF5YmUgd2Ugc2hvdWxkblxcJ3Qgc2h1dCBpdCBkb3duIGJlZm9yZSB3ZSBnZXQgaW50byB0cm91YmxlPycsXG4gICAgICAgIGR1cjogMjE2MDAgLSAxOTU2MFxuICAgIH0sXG4gICAgMjE2ODA6IHtcbiAgICAgICAgdXNlcjogJ2RpdnlhJyxcbiAgICAgICAgd29yZDogJ0hlIHN0b2xlIG91ciB3ZWJzaXRlISEhJyxcbiAgICAgICAgZHVyOiAyMjQ4MCAtIDIxNjgwXG4gICAgfSxcbiAgICAyMjYwMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnVGhleVxcJ3JlIHNheWluZyB0aGF0IHdlIHN0b2xlIFRoZSBGYWNlYm9vaycsXG4gICAgICAgIGR1cjogMjM5ODAgLSAyMjYwMFxuICAgIH0sXG4gICAgMjQyMDA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAnSSBLTk9XIHdoYXQgaXQgc2F5cy4nLFxuICAgICAgICBkdXI6IDI0OTAwIC0gMjQyMDBcbiAgICB9LFxuICAgIDI1MDAwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICdzbyBkaWQgd2U/Pz8nLFxuICAgICAgICBkdXI6IDI1MzIwIC0gMjUwMDBcbiAgICB9LFxuICAgIDI1NTUwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ1RoZXkgY2FtZSB0byBtZSB3aXRoIGFuIGlkZWEsIEkgaGFkIGEgYmV0dGVyIG9uZS4nLFxuICAgICAgICBkdXI6IDI2OTUwIC0gMjU1NTBcbiAgICB9LFxuICAgIDI3MDUwOiB7XG4gICAgICAgIHVzZXI6ICdjaHJpcycsXG4gICAgICAgIHdvcmQ6ICdIZSBtYWRlIFRoZSBGYWNlYm9vaz8nLFxuICAgICAgICBkdXI6IDI3ODIwIC0gMjcwNTBcbiAgICB9LFxuICAgIDI3ODgwOiB7XG4gICAgICAgIHVzZXI6ICdkdXN0aW4nLFxuICAgICAgICB3b3JkOiAnV2hvIGFyZSB0aGUgZ2lybHMnLFxuICAgICAgICBkdXI6IDI4MzM5IC0gMjc4ODBcbiAgICB9LFxuICAgIDI4NTIwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICdXZSBoYXZlIGdyb3VwaWVzLicsXG4gICAgICAgIGR1cjogMjg5NjAgLSAyODUyMFxuICAgIH0sXG4gICAgMjkxMDA6IHtcbiAgICAgICAgdXNlcjogJ3R5bGVyJyxcbiAgICAgICAgd29yZDogJ1RoaXMgaWRlYSBpcyBwb3RlbnRpYWxseSB3b3J0aCBtaWxsaW9ucyBvZiBkb2xsYXJzLicsXG4gICAgICAgIGR1cjogMzExMDAgLSAyOTEwMFxuICAgIH0sXG4gICAgMzEyNTA6IHtcbiAgICAgICAgdXNlcjogJ2xhcnJ5JyxcbiAgICAgICAgd29yZDogJ01pbGxpb25zPycsXG4gICAgICAgIGR1cjogMzE0NjQgLSAzMTI1MFxuICAgIH0sXG4gICAgMzE4Njg6IHtcbiAgICAgICAgdXNlcjogJ3NlYW4nLFxuICAgICAgICB3b3JkOiAnQSBtaWxsaW9uICQgaXNuXFwndCBjb29sLiBZb3Uga25vdyB3aGF0XFwncyBjb29sPycsXG4gICAgICAgIGR1cjogMzM0OTQgLSAzMTg2OFxuICAgIH0sXG4gICAgMzM2OTc6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ1U/JyxcbiAgICAgICAgZHVyOiAzMzkwMCAtIDMzNjk3XG4gICAgfSxcbiAgICAzNDIwMzoge1xuICAgICAgICB1c2VyOiAnc2VhbicsXG4gICAgICAgIHdvcmQ6ICdBIEJJTExJT04gJCQkXFwncy4nLFxuICAgICAgICBkdXI6IDM1MDEwIC0gMzQyMDNcbiAgICB9LFxuICAgIDM1MjMwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICdXZSBkb25cXCd0IG5lZWQgaGltLicsXG4gICAgICAgIGR1cjogMzYxMjcgLSAzNTIzMFxuICAgIH0sXG4gICAgMzYyNTA6IHtcbiAgICAgICAgdXNlcjogJ3R5bGVyJyxcbiAgICAgICAgd29yZDogJ0xldFxcJ3MgU1VFIGhpbSBpbiBmZWRlcmFsIGNvdXJ0LicsXG4gICAgICAgIGR1cjogMzc2NTQgLSAzNjI1MFxuICAgIH0sXG4gICAgMzc4MzA6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAneW91XFwncmUgZ29pbmcgdG8gZ2V0IGxlZnQgYmVoaW5kLiBJdFxcJ3MgbW92aW5nIGZhc3Rlci4uLicsXG4gICAgICAgIGR1cjogMzg3NzkgLSAzNzgzMFxuICAgIH0sXG4gICAgMzkyNjA6IHtcbiAgICAgICAgdXNlcjogJ3dhcmRvJyxcbiAgICAgICAgd29yZDogJ3doYXQgZG8gdSBtZWFuLi4uJyxcbiAgICAgICAgZHVyOiAzOTY4NSAtIDM5MjYwXG4gICAgfSxcbiAgICAzOTUwMDoge1xuICAgICAgICB1c2VyOiAnbWFyaycsXG4gICAgICAgIHdvcmQ6ICd0aGFuIGFueSBvZiB1cyBldmVyIGltYWdpbmVkIGl0IHdvdWxkIG1vdmUnLFxuICAgICAgICBkdXI6IDQwNTAwIC0gMzk1MDBcbiAgICB9LFxuICAgIDQwNTUwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICdnZXQgbGVmdCBiZWhpbmQ/Pz8/JyxcbiAgICAgICAgZHVyOiA0MDc4MCAtIDQwNTUwXG4gICAgfSxcbiAgICA0MTE3MDoge1xuICAgICAgICB1c2VyOiAnY2FtZXJvbicsXG4gICAgICAgIHdvcmQ6ICdXZVxcJ3JlIGdlbnRsZW1lbiBvZiBIYXJ2YXJkLiBZb3UgZG9uXFwndCBzdWUgcGVvcGxlLicsXG4gICAgICAgIGR1cjogNDM0MDAgLSA0MTE3MFxuICAgIH0sXG4gICAgNDM1MjA6IHtcbiAgICAgICAgdXNlcjogJ3NlYW4nLFxuICAgICAgICB3b3JkOiAnVGhpcyBpcyBPVVIgdGltZSEhJyxcbiAgICAgICAgZHVyOiA0NDMwMCAtIDQzNTIwXG4gICAgfSxcbiAgICA0NDQ4MDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnSXRcXCdzIGdvbm5hIGJlIGxpa2UgSVxcJ20gbm90IGEgcGFydCBvZiBGYWNlYm9vay4nLFxuICAgICAgICBkdXI6IDQ2MDAwIC0gNDQ0ODBcbiAgICB9LFxuICAgIDQ2MDUwOiB7XG4gICAgICAgIHVzZXI6ICdzZWFuJyxcbiAgICAgICAgd29yZDogJ1lvdVxcJ3JlIG5vdCBhIHBhcnQgb2YgRmFjZWJvb2suJyxcbiAgICAgICAgZHVyOiA0NjkzMCAtIDQ2MDUwXG4gICAgfSxcbiAgICA0NzA0MDoge1xuICAgICAgICB1c2VyOiAnZGl2eWEnLFxuICAgICAgICB3b3JkOiAnSSBjYW5cXCd0IHdhaXQgdG8gc3RhbmQgb3ZlciB5b3VyIHNob3VsZGVyIGFuZCB3YXRjaCB5b3Ugd3JpdGUgdXMgYSBjaGVjay4nLFxuICAgICAgICBkdXI6IDQ5MjgwIC0gNDcwNDBcbiAgICB9LFxuICAgIDQ5MzgwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICdJcyB0aGVyZSBhbnl0aGluZyB0aGF0IHlvdSBuZWVkIHRvIHRlbGwgbWU/Pz8nLFxuICAgICAgICBkdXI6IDUwODgwIC0gNDkzODBcbiAgICB9LFxuICAgIDUxMDIwOiB7XG4gICAgICAgIHVzZXI6ICdtYXJrJyxcbiAgICAgICAgd29yZDogJ3lvdXIgYWN0aW9ucyBjb3VsZCBoYXZlIHBlcm1hbmVudGx5IGRlc3Ryb3llZCBFVkVSWVRISU5HIElcXCd2ZSBiZWVuIHdvcmtpbmcgb24uJyxcbiAgICAgICAgZHVyOiA1MzA2NSAtIDUxMDIwXG4gICAgfSxcbiAgICA1MzIwMDoge1xuICAgICAgICB1c2VyOiAnd2FyZG8nLFxuICAgICAgICB3b3JkOiAnV0UgaGF2ZSBiZWVuIHdvcmtpbmcgb24hIScsXG4gICAgICAgIGR1cjogNTM5NDAgLSA1MzIwMFxuICAgIH0sXG4gICAgNTQwODc6IHtcbiAgICAgICAgdXNlcjogJ21hcmsnLFxuICAgICAgICB3b3JkOiAnRG8gdSBsaWtlIGJlaW5nIGEgam9rZT8/PyBEbyB1IHdhbm5hIGdvIGJhY2sgdG8gdGhhdD8nLFxuICAgICAgICBkdXI6IDU1NTUwIC0gNTQwODdcbiAgICB9LFxuICAgIDU1NjMwOiB7XG4gICAgICAgIHVzZXI6ICd3YXJkbycsXG4gICAgICAgIHdvcmQ6ICdNYXJrISEhJyxcbiAgICAgICAgZHVyOiA1NTg0MCAtIDU1NjMwXG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBkYXRhOyIsInZhciB1c2VyRGF0YSA9IHtcbiAgICBtYXJrOiB7XG4gICAgICAgIGFsaWFzOiAnTWFyayBadWNrZXJiZXJnJyxcbiAgICAgICAgYXZhdGFyOiAnbWFyay5wbmcnXG4gICAgfSxcbiAgICB3YXJkbzoge1xuICAgICAgICBhbGlhczogJ0VkdWFyZG8gU2F2ZXJpbicsXG4gICAgICAgIGF2YXRhcjogJ3dhcmRvLnBuZydcbiAgICB9LFxuICAgIGR1c3Rpbjoge1xuICAgICAgICBhbGlhczogJ0R1c3RpbiBNb3Nrb3ZpdHonLFxuICAgICAgICBhdmF0YXI6ICdkdXN0aW4ucG5nJ1xuICAgIH0sXG4gICAgbWFyeToge1xuICAgICAgICBhbGlhczogJ01hcnlsaW4gRGVscHknLFxuICAgICAgICBhdmF0YXI6ICdtYXJ5LnBuZydcbiAgICB9LFxuICAgIGVyaWNhOiB7XG4gICAgICAgIGFsaWFzOiAnRXJpY2EgQWxicmlnaHQnLFxuICAgICAgICBhdmF0YXI6ICdlcmljYS5wbmcnXG4gICAgfSxcbiAgICBkaXZ5YToge1xuICAgICAgICBhbGlhczogJ0RpdnlhIE5hcmVuZHJhJyxcbiAgICAgICAgYXZhdGFyOiAnZGl2eWEucG5nJ1xuICAgIH0sXG4gICAgY2hyaXM6IHtcbiAgICAgICAgYWxpYXM6ICdDaHJpc3R5IExlZScsXG4gICAgICAgIGF2YXRhcjogJ2NocmlzLnBuZydcbiAgICB9LFxuICAgIHR5bGVyOiB7XG4gICAgICAgIGFsaWFzOiAnVHlsZXIgV2lua2xldm9zcycsXG4gICAgICAgIGF2YXRhcjogJ3R5bGVyLnBuZydcbiAgICB9LFxuICAgIGxhcnJ5OiB7XG4gICAgICAgIGFsaWFzOiAnTGFycnkgU3VtbWVycycsXG4gICAgICAgIGF2YXRhcjogJ2xhcnJ5LnBuZydcbiAgICB9LFxuICAgIHNlYW46IHtcbiAgICAgICAgYWxpYXM6ICdTZWFuIFBhcmtlcicsXG4gICAgICAgIGF2YXRhcjogJ3NlYW4ucG5nJ1xuICAgIH0sXG4gICAgY2FtZXJvbjoge1xuICAgICAgICBhbGlhczogJ0NhbWVyb24gV2lua2xldm9zcycsXG4gICAgICAgIGF2YXRhcjogJ2NhbWVyb24ucG5nJ1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXNlckRhdGE7IiwidmFyIERpc3BhdGNoZXIgPSByZXF1aXJlKCcuL0Rpc3BhdGNoZXInKTtcblxuXG4vLyBkaXNwYXRjaGVyIOecn+eahOW+iOeugOWNlSwg5a+55LqO546w5Zyo55qEdG9kb2FwcOadpeivtFxuLy8g5re75Yqg5LiA5Liq5aSE55CGdmlld2FjdGlvbueahOaWueazlSwg6L+b6KGM5YiG5Y+RLi4uIOWIhuWPkeeahOWPguaVsOWPr+S7peensOS9nHBheWxvYWRcbi8vIOWcqOebuOW6lOeahHN0b3Jl5LitLCDlsIZhY3Rpb27nmoRoYW5kbGVy5rOo5YaM5ZyoZGlzcGF0Y2hlcuS4ilxuXG52YXIgY29weVByb3BlcnRpZXMgPSByZXF1aXJlKCdyZWFjdC9saWIvY29weVByb3BlcnRpZXMnKTtcblxudmFyIENoYXREaXNwYXRjaGVyID0gY29weVByb3BlcnRpZXMobmV3IERpc3BhdGNoZXIoKSwge1xuICAgIGhhbmRsZU1vdmllQWN0aW9uOiBmdW5jdGlvbihhY3Rpb24pe1xuICAgICAgICB0aGlzLmRpc3BhdGNoKHtcbiAgICAgICAgICAgIHNvdXJjZTogJ01PVklFX0FDVElPTicsXG4gICAgICAgICAgICBhY3Rpb246IGFjdGlvblxuICAgICAgICB9KTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGF0RGlzcGF0Y2hlcjsiLCIvKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIERpc3BhdGNoZXJcbiAqIEB0eXBlY2hlY2tzXG4gKi9cblxudmFyIGludmFyaWFudCA9IHJlcXVpcmUoJy4vaW52YXJpYW50Jyk7XG5cbnZhciBfbGFzdElEID0gMTtcbnZhciBfcHJlZml4ID0gJ0lEXyc7XG5cbi8qKlxuICogRGlzcGF0Y2hlciBpcyB1c2VkIHRvIGJyb2FkY2FzdCBwYXlsb2FkcyB0byByZWdpc3RlcmVkIGNhbGxiYWNrcy4gVGhpcyBpc1xuICogZGlmZmVyZW50IGZyb20gZ2VuZXJpYyBwdWItc3ViIHN5c3RlbXMgaW4gdHdvIHdheXM6XG4gKlxuICogICAxKSBDYWxsYmFja3MgYXJlIG5vdCBzdWJzY3JpYmVkIHRvIHBhcnRpY3VsYXIgZXZlbnRzLiBFdmVyeSBwYXlsb2FkIGlzXG4gKiAgICAgIGRpc3BhdGNoZWQgdG8gZXZlcnkgcmVnaXN0ZXJlZCBjYWxsYmFjay5cbiAqICAgMikgQ2FsbGJhY2tzIGNhbiBiZSBkZWZlcnJlZCBpbiB3aG9sZSBvciBwYXJ0IHVudGlsIG90aGVyIGNhbGxiYWNrcyBoYXZlXG4gKiAgICAgIGJlZW4gZXhlY3V0ZWQuXG4gKlxuICogRm9yIGV4YW1wbGUsIGNvbnNpZGVyIHRoaXMgaHlwb3RoZXRpY2FsIGZsaWdodCBkZXN0aW5hdGlvbiBmb3JtLCB3aGljaFxuICogc2VsZWN0cyBhIGRlZmF1bHQgY2l0eSB3aGVuIGEgY291bnRyeSBpcyBzZWxlY3RlZDpcbiAqXG4gKiAgIHZhciBmbGlnaHREaXNwYXRjaGVyID0gbmV3IERpc3BhdGNoZXIoKTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHdoaWNoIGNvdW50cnkgaXMgc2VsZWN0ZWRcbiAqICAgdmFyIENvdW50cnlTdG9yZSA9IHtjb3VudHJ5OiBudWxsfTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHdoaWNoIGNpdHkgaXMgc2VsZWN0ZWRcbiAqICAgdmFyIENpdHlTdG9yZSA9IHtjaXR5OiBudWxsfTtcbiAqXG4gKiAgIC8vIEtlZXBzIHRyYWNrIG9mIHRoZSBiYXNlIGZsaWdodCBwcmljZSBvZiB0aGUgc2VsZWN0ZWQgY2l0eVxuICogICB2YXIgRmxpZ2h0UHJpY2VTdG9yZSA9IHtwcmljZTogbnVsbH1cbiAqXG4gKiBXaGVuIGEgdXNlciBjaGFuZ2VzIHRoZSBzZWxlY3RlZCBjaXR5LCB3ZSBkaXNwYXRjaCB0aGUgcGF5bG9hZDpcbiAqXG4gKiAgIGZsaWdodERpc3BhdGNoZXIuZGlzcGF0Y2goe1xuICogICAgIGFjdGlvblR5cGU6ICdjaXR5LXVwZGF0ZScsXG4gKiAgICAgc2VsZWN0ZWRDaXR5OiAncGFyaXMnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBgQ2l0eVN0b3JlYDpcbiAqXG4gKiAgIGZsaWdodERpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24ocGF5bG9hZCkpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY2l0eS11cGRhdGUnKSB7XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IHBheWxvYWQuc2VsZWN0ZWRDaXR5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgdXNlciBzZWxlY3RzIGEgY291bnRyeSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY291bnRyeS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ291bnRyeTogJ2F1c3RyYWxpYSdcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGJvdGggc3RvcmVzOlxuICpcbiAqICAgIENvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgQ291bnRyeVN0b3JlLmNvdW50cnkgPSBwYXlsb2FkLnNlbGVjdGVkQ291bnRyeTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIGNhbGxiYWNrIHRvIHVwZGF0ZSBgQ291bnRyeVN0b3JlYCBpcyByZWdpc3RlcmVkLCB3ZSBzYXZlIGEgcmVmZXJlbmNlXG4gKiB0byB0aGUgcmV0dXJuZWQgdG9rZW4uIFVzaW5nIHRoaXMgdG9rZW4gd2l0aCBgd2FpdEZvcigpYCwgd2UgY2FuIGd1YXJhbnRlZVxuICogdGhhdCBgQ291bnRyeVN0b3JlYCBpcyB1cGRhdGVkIGJlZm9yZSB0aGUgY2FsbGJhY2sgdGhhdCB1cGRhdGVzIGBDaXR5U3RvcmVgXG4gKiBuZWVkcyB0byBxdWVyeSBpdHMgZGF0YS5cbiAqXG4gKiAgIENpdHlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBtYXkgbm90IGJlIHVwZGF0ZWQuXG4gKiAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIGlzIG5vdyBndWFyYW50ZWVkIHRvIGJlIHVwZGF0ZWQuXG4gKlxuICogICAgICAgLy8gU2VsZWN0IHRoZSBkZWZhdWx0IGNpdHkgZm9yIHRoZSBuZXcgY291bnRyeVxuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBnZXREZWZhdWx0Q2l0eUZvckNvdW50cnkoQ291bnRyeVN0b3JlLmNvdW50cnkpO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIHVzYWdlIG9mIGB3YWl0Rm9yKClgIGNhbiBiZSBjaGFpbmVkLCBmb3IgZXhhbXBsZTpcbiAqXG4gKiAgIEZsaWdodFByaWNlU3RvcmUuZGlzcGF0Y2hUb2tlbiA9XG4gKiAgICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSkge1xuICogICAgICAgc3dpdGNoIChwYXlsb2FkLmFjdGlvblR5cGUpIHtcbiAqICAgICAgICAgY2FzZSAnY291bnRyeS11cGRhdGUnOlxuICogICAgICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlLnByaWNlID1cbiAqICAgICAgICAgICAgIGdldEZsaWdodFByaWNlU3RvcmUoQ291bnRyeVN0b3JlLmNvdW50cnksIENpdHlTdG9yZS5jaXR5KTtcbiAqICAgICAgICAgICBicmVhaztcbiAqXG4gKiAgICAgICAgIGNhc2UgJ2NpdHktdXBkYXRlJzpcbiAqICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlLnByaWNlID1cbiAqICAgICAgICAgICAgIEZsaWdodFByaWNlU3RvcmUoQ291bnRyeVN0b3JlLmNvdW50cnksIENpdHlTdG9yZS5jaXR5KTtcbiAqICAgICAgICAgICBicmVhaztcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSBgY291bnRyeS11cGRhdGVgIHBheWxvYWQgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGludm9rZSB0aGUgc3RvcmVzJ1xuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MgaW4gb3JkZXI6IGBDb3VudHJ5U3RvcmVgLCBgQ2l0eVN0b3JlYCwgdGhlblxuICogYEZsaWdodFByaWNlU3RvcmVgLlxuICovXG5cbiAgZnVuY3Rpb24gRGlzcGF0Y2hlcigpIHtcInVzZSBzdHJpY3RcIjtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcyA9IHt9O1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nID0ge307XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0hhbmRsZWQgPSB7fTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3BlbmRpbmdQYXlsb2FkID0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggZXZlcnkgZGlzcGF0Y2hlZCBwYXlsb2FkLiBSZXR1cm5zXG4gICAqIGEgdG9rZW4gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGB3YWl0Rm9yKClgLlxuICAgKlxuICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFja1xuICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5yZWdpc3Rlcj1mdW5jdGlvbihjYWxsYmFjaykge1widXNlIHN0cmljdFwiO1xuICAgIHZhciBpZCA9IF9wcmVmaXggKyBfbGFzdElEKys7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdID0gY2FsbGJhY2s7XG4gICAgcmV0dXJuIGlkO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY2FsbGJhY2sgYmFzZWQgb24gaXRzIHRva2VuLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWRcbiAgICovXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnVucmVnaXN0ZXI9ZnVuY3Rpb24oaWQpIHtcInVzZSBzdHJpY3RcIjtcbiAgICBpbnZhcmlhbnQoXG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF0sXG4gICAgICAnRGlzcGF0Y2hlci51bnJlZ2lzdGVyKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLFxuICAgICAgaWRcbiAgICApO1xuICAgIGRlbGV0ZSB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrc1tpZF07XG4gIH07XG5cbiAgLyoqXG4gICAqIFdhaXRzIGZvciB0aGUgY2FsbGJhY2tzIHNwZWNpZmllZCB0byBiZSBpbnZva2VkIGJlZm9yZSBjb250aW51aW5nIGV4ZWN1dGlvblxuICAgKiBvZiB0aGUgY3VycmVudCBjYWxsYmFjay4gVGhpcyBtZXRob2Qgc2hvdWxkIG9ubHkgYmUgdXNlZCBieSBhIGNhbGxiYWNrIGluXG4gICAqIHJlc3BvbnNlIHRvIGEgZGlzcGF0Y2hlZCBwYXlsb2FkLlxuICAgKlxuICAgKiBAcGFyYW0ge2FycmF5PHN0cmluZz59IGlkc1xuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUud2FpdEZvcj1mdW5jdGlvbihpZHMpIHtcInVzZSBzdHJpY3RcIjtcbiAgICBpbnZhcmlhbnQoXG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcsXG4gICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IE11c3QgYmUgaW52b2tlZCB3aGlsZSBkaXNwYXRjaGluZy4nXG4gICAgKTtcbiAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgaWRzLmxlbmd0aDsgaWkrKykge1xuICAgICAgdmFyIGlkID0gaWRzW2lpXTtcbiAgICAgIGlmICh0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgaW52YXJpYW50KFxuICAgICAgICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSxcbiAgICAgICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IENpcmN1bGFyIGRlcGVuZGVuY3kgZGV0ZWN0ZWQgd2hpbGUgJyArXG4gICAgICAgICAgJ3dhaXRpbmcgZm9yIGAlc2AuJyxcbiAgICAgICAgICBpZFxuICAgICAgICApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGludmFyaWFudChcbiAgICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdLFxuICAgICAgICAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLFxuICAgICAgICBpZFxuICAgICAgKTtcbiAgICAgIHRoaXMuJERpc3BhdGNoZXJfaW52b2tlQ2FsbGJhY2soaWQpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGlzcGF0Y2hlcyBhIHBheWxvYWQgdG8gYWxsIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gcGF5bG9hZFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuZGlzcGF0Y2g9ZnVuY3Rpb24ocGF5bG9hZCkge1widXNlIHN0cmljdFwiO1xuICAgIGludmFyaWFudChcbiAgICAgICF0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmcsXG4gICAgICAnRGlzcGF0Y2guZGlzcGF0Y2goLi4uKTogQ2Fubm90IGRpc3BhdGNoIGluIHRoZSBtaWRkbGUgb2YgYSBkaXNwYXRjaC4nXG4gICAgKTtcbiAgICB0aGlzLiREaXNwYXRjaGVyX3N0YXJ0RGlzcGF0Y2hpbmcocGF5bG9hZCk7XG4gICAgdHJ5IHtcbiAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuJERpc3BhdGNoZXJfY2FsbGJhY2tzKSB7XG4gICAgICAgIGlmICh0aGlzLiREaXNwYXRjaGVyX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLiREaXNwYXRjaGVyX2ludm9rZUNhbGxiYWNrKGlkKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9zdG9wRGlzcGF0Y2hpbmcoKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIElzIHRoaXMgRGlzcGF0Y2hlciBjdXJyZW50bHkgZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5pc0Rpc3BhdGNoaW5nPWZ1bmN0aW9uKCkge1widXNlIHN0cmljdFwiO1xuICAgIHJldHVybiB0aGlzLiREaXNwYXRjaGVyX2lzRGlzcGF0Y2hpbmc7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGwgdGhlIGNhbGxiYWNrIHN0b3JlZCB3aXRoIHRoZSBnaXZlbiBpZC4gQWxzbyBkbyBzb21lIGludGVybmFsXG4gICAqIGJvb2trZWVwaW5nLlxuICAgKlxuICAgKiBAcGFyYW0ge3N0cmluZ30gaWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9pbnZva2VDYWxsYmFjaz1mdW5jdGlvbihpZCkge1widXNlIHN0cmljdFwiO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNQZW5kaW5nW2lkXSA9IHRydWU7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9jYWxsYmFja3NbaWRdKHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQpO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNIYW5kbGVkW2lkXSA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCB1cCBib29ra2VlcGluZyBuZWVkZWQgd2hlbiBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IHBheWxvYWRcbiAgICogQGludGVybmFsXG4gICAqL1xuICBEaXNwYXRjaGVyLnByb3RvdHlwZS4kRGlzcGF0Y2hlcl9zdGFydERpc3BhdGNoaW5nPWZ1bmN0aW9uKHBheWxvYWQpIHtcInVzZSBzdHJpY3RcIjtcbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLiREaXNwYXRjaGVyX2NhbGxiYWNrcykge1xuICAgICAgdGhpcy4kRGlzcGF0Y2hlcl9pc1BlbmRpbmdbaWRdID0gZmFsc2U7XG4gICAgICB0aGlzLiREaXNwYXRjaGVyX2lzSGFuZGxlZFtpZF0gPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9wZW5kaW5nUGF5bG9hZCA9IHBheWxvYWQ7XG4gICAgdGhpcy4kRGlzcGF0Y2hlcl9pc0Rpc3BhdGNoaW5nID0gdHJ1ZTtcbiAgfTtcblxuICAvKipcbiAgICogQ2xlYXIgYm9va2tlZXBpbmcgdXNlZCBmb3IgZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuJERpc3BhdGNoZXJfc3RvcERpc3BhdGNoaW5nPWZ1bmN0aW9uKCkge1widXNlIHN0cmljdFwiO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfcGVuZGluZ1BheWxvYWQgPSBudWxsO1xuICAgIHRoaXMuJERpc3BhdGNoZXJfaXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuICB9O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2hlcjtcbiIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIGludmFyaWFudFxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgaW52YXJpYW50ID0gZnVuY3Rpb24oY29uZGl0aW9uLCBmb3JtYXQsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgaWYgKGZhbHNlKSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFyaWFudCByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ01pbmlmaWVkIGV4Y2VwdGlvbiBvY2N1cnJlZDsgdXNlIHRoZSBub24tbWluaWZpZWQgZGV2IGVudmlyb25tZW50ICcgK1xuICAgICAgICAnZm9yIHRoZSBmdWxsIGVycm9yIG1lc3NhZ2UgYW5kIGFkZGl0aW9uYWwgaGVscGZ1bCB3YXJuaW5ncy4nXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgJ0ludmFyaWFudCBWaW9sYXRpb246ICcgK1xuICAgICAgICBmb3JtYXQucmVwbGFjZSgvJXMvZywgZnVuY3Rpb24oKSB7IHJldHVybiBhcmdzW2FyZ0luZGV4KytdOyB9KVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBlcnJvci5mcmFtZXNUb1BvcCA9IDE7IC8vIHdlIGRvbid0IGNhcmUgYWJvdXQgaW52YXJpYW50J3Mgb3duIGZyYW1lXG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gaW52YXJpYW50O1xuIiwiLyoqXG4gKiBAanN4IFJlYWN0LkRPTVxuICovIFxuXG52YXIgQ2hhdExpc3QgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvQ2hhdExpc3QucmVhY3QuanMnKTtcbnZhciBNb3ZpZUN0cmwgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvTW92aWUuanMnKTtcblxuXG5SZWFjdC5yZW5kZXJDb21wb25lbnQoQ2hhdExpc3Qoe3Njcm9sbEVsZTogXCIjbXNnLW1vZHVsZVwifSksICQoJyNtc2ctbW9kdWxlIC5saXN0LWN0bicpLmdldCgwKSk7XG5cblxuJCgnLnNpbXVsYXRlLXZpZGVvIGF1ZGlvJykub24oJ3BsYXknLCBmdW5jdGlvbigpe1xuICAgIE1vdmllQ3RybC5zdGFydCgpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgJCgnI21zZy1tb2R1bGUnKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgfSwgMjQwMCk7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICQoJy5tYXNrLmN1cnRhaW4nKS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICQoJy5tb3ZpZS10aXRsZScpLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgfSwgMjAwMCk7XG4gICAgLy8gYmVmb3JlIHdhcmRvOiBtYXJrISEhXG4gICAgfSw1NTM1MCk7XG5cbiAgICAvLyDpmpDol4/mjonmjqfliLbmnaFcbiAgICAkKHRoaXMpLmNzcygnb3BhY2l0eScsIDApO1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICQoc2VsZikucmVtb3ZlQXR0cignY29udHJvbHMnKTtcbiAgICB9LCAxMDAwKTtcbiAgICBcbn0pOyIsIlxuXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgbWVyZ2UgPSByZXF1aXJlKCdyZWFjdC9saWIvbWVyZ2UnKTtcblxudmFyIENoYXREaXNwYXRjaGVyID0gcmVxdWlyZSgnLi4vZGlzcGF0Y2hlci9DaGF0RGlzcGF0Y2hlcicpO1xudmFyIENoYXRDb25zdGFudHMgPSByZXF1aXJlKCcuLi9jb25zdGFudHMvQ2hhdENvbnN0YW50cycpO1xuXG52YXIgQ0hBTkdFX0VWRU5UID0gJ2NoYW5nZSc7XG5cbnZhciBkaWFsb2dEYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9kaWFsb2dEYXRhLmpzJyk7XG52YXIgdXNlckRhdGEgPSByZXF1aXJlKCcuLi9kYXRhL3VzZXJEYXRhLmpzJyk7XG5cblxudmFyIF9kYXRhID0ge307XG5cbi8vIF9kYXRhID0gZGlhbG9nRGF0YTtcblxuZnVuY3Rpb24gZ2V0QWxsKCl7XG4gICAgdmFyIGFyciA9IFtdO1xuICAgIGZvciggdmFyIGkgaW4gX2RhdGEgKXtcbiAgICAgICAgYXJyLnB1c2goIF9kYXRhW2ldIClcbiAgICB9XG4gICAgcmV0dXJuIGFycjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlT25lKGlkLCBvYmope1xuICAgIF9kYXRhW2lkXSA9IG9iajtcbn1cblxuZnVuY3Rpb24gdXBkYXRlT25lKGlkLCB1cGRhdGVzKXtcbiAgICBfZGF0YVtpZF0gPSBtZXJnZShfZGF0YVtpZF0sIHVwZGF0ZXMpO1xufVxuXG52YXIgQ2hhdFN0b3JlID0gbWVyZ2UoRXZlbnRFbWl0dGVyLnByb3RvdHlwZSwge1xuICAgIGdldEFsbDogZ2V0QWxsLFxuICAgIGVtaXRDaGFuZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHRoaXMuZW1pdChDSEFOR0VfRVZFTlQpO1xuICAgIH0sXG4gICAgYWRkQ2hhbmdlTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5vbihDSEFOR0VfRVZFTlQsIGNhbGxiYWNrKVxuICAgIH0sXG4gICAgcmVtb3ZlQ2hhbmdlTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcihDSEFOR0VfRVZFTlQsIGNhbGxiYWNrKVxuICAgIH1cbn0pO1xuXG5cbkNoYXREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpe1xuICAgIHZhciBhY3Rpb24gPSBwYXlsb2FkLmFjdGlvbjtcblxuICAgIHN3aXRjaChhY3Rpb24uYWN0aW9uVHlwZSl7XG4gICAgICAgIGNhc2UgQ2hhdENvbnN0YW50cy5XT1JEX0NSRUFURTpcbiAgICAgICAgICAgIGNyZWF0ZU9uZShhY3Rpb24uaWQsIGFjdGlvbi53b3JkKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIENoYXRDb25zdGFudHMuV09SRF9VUERBVEU6XG4gICAgICAgICAgICB1cGRhdGVPbmUoYWN0aW9uLmlkLCBhY3Rpb24udXBkYXRlcyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdjaGF0IHN0b3JlIGRvIG5vdCBoYW5kbGUgdGhpcyBhY3Rpb24nLCBhY3Rpb24pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgQ2hhdFN0b3JlLmVtaXRDaGFuZ2UoKTtcblxuICAgIHJldHVybiB0cnVlO1xufSk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDaGF0U3RvcmU7Il19
