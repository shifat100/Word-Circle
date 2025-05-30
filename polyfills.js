// Polyfill for Array.prototype.includes()
if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
        'use strict';
        var O = Object(this);
        var len = parseInt(O.length, 10) || 0;
        if (len === 0) {
            return false;
        }
        var n = parseInt(arguments[1], 10) || 0;
        var k;
        if (n >= 0) {
            k = n;
        } else {
            k = len + n;
            if (k < 0) { k = 0; }
        }
        var currentElement;
        while (k < len) {
            currentElement = O[k];
            if (searchElement === currentElement || (searchElement !== searchElement && currentElement !== currentElement)) {
                return true;
            }
            k++;
        }
        return false;
    };
}

// Polyfill for Array.prototype.flatMap()
if (!Array.prototype.flatMap) {
    Array.prototype.flatMap = function(callback, thisArg) {
        var mapped = this.map(callback, thisArg);
        return Array.prototype.concat.apply([], mapped);
    };
}

// Polyfill for Array.prototype.flat()
if (!Array.prototype.flat) {
    Array.prototype.flat = function(depth) {
        var flattend = [];
        (function flat(array, depth) {
            for (var i = 0; i < array.length; i++) {
                if (Array.isArray(array[i]) && depth > 0) {
                    flat(array[i], depth - 1);
                } else {
                    flattend.push(array[i]);
                }
            }
        })(this, Math.floor(depth) || 1);
        return flattend;
    };
}

// Polyfill for Object.entries()
if (!Object.entries) {
    Object.entries = function(obj) {
        var ownProps = Object.keys(obj),
            i = ownProps.length,
            resArray = new Array(i); // preallocate the Array
        while (i--)
            resArray[i] = [ownProps[i], obj[ownProps[i]]];

        return resArray;
    };
}

// Polyfill for Object.values()
if (!Object.values) {
    Object.values = function(obj) {
        return Object.keys(obj).map(function(key) {
            return obj[key];
        });
    };
}

// Polyfill for Promise.prototype.finally()
if (!Promise.prototype.finally) {
    Promise.prototype.finally = function(onFinally) {
        if (typeof onFinally !== 'function') {
            return this.then(onFinally, onFinally);
        }
        return this.then(function(value) {
            return Promise.resolve(onFinally()).then(function() {
                return value;
            });
        }, function(reason) {
            return Promise.resolve(onFinally()).then(function() {
                throw reason;
            });
        });
    };
}
