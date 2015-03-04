'use strict';

var extend = require('extend');
var emitter = require('./util/emitter');
var toFloat = require('./util/toFloat');
var getOption = require('./util/getOption');
var getValue = require('./util/getValue');
var createItem = require('./item');

var _defaultOptions = {
    store: null,
    currency: 'USD',
    shipping: null,
    tax: null
};

function createCart(options) {
    var _options = extend({}, _defaultOptions, options);
    var _store = _options.store;
    var _items = [];
    var _ready = load();

    function cart() {
        return _items.slice(0);
    }

    var emit = emitter(cart);

    cart.ready = function(success) {
        ready(success);
        return cart;
    };

    cart.error = function(error) {
        ready(null, error);
        return cart;
    };

    cart.option = getOption.bind(cart, _options);

    cart.size = function() {
        return _items.length;
    };

    cart.has = function(item) {
        return !!has(item);
    };

    cart.get = function(item) {
        var found = has(item);
        return !found ? null : found.item;
    };

    cart.add = function(item) {
        ready(add.bind(cart, item));

        return cart;
    };

    cart.remove = function(item) {
        ready(remove.bind(cart, item));

        return cart;
    };

    cart.clear = function() {
        ready(clear);

        return cart;
    };

    cart.each = function(callback, context) {
        _items.every(function(item, index) {
            return false !== callback.call(context, item, index, cart);
        });

        return cart;
    };

    cart.quantity = function() {
        return cart().reduce(function(previous, item) {
            return previous + item.quantity();
        }, 0);
    };

    cart.total = function() {
        return cart().reduce(function(previous, item) {
            return previous + (item.price() * item.quantity());
        }, 0);
    };

    cart.shipping = function() {
        if (!cart.size()) {
            return 0;
        }

        return cart().reduce(function(previous, item) {
            return previous + item.shipping();
        }, toFloat(getValue(_options.shipping, cart)));
    };

    cart.tax = function() {
        if (!cart.size()) {
            return 0;
        }

        return cart().reduce(function(previous, item) {
            return previous + item.tax();
        }, toFloat(getValue(_options.tax, cart)));
    };

    cart.grandTotal = function() {
        return cart.total() + cart.tax() + cart.shipping();
    };

    function ready(success, error) {
        if (!success && !error) {
            return;
        }

        _ready = _ready.then(success ? function() {
            return success(cart);
        } : null, error ? function(e) {
            return error(e, cart);
        } : null);
    }

    function load() {
        var ret = [];

        if (_store && _store.enabled()) {
            ret = _store.load();
        }

        return Promise.resolve(ret).then(function(items) {
            _items = items.map(function(attr) {
                return createItem(attr);
            });
        });
    }

    function has(attr) {
        var checkItem, found = false;

        try {
            checkItem = createItem(attr);
        } catch (e) {
            return false;
        }

        _items.every(function(item, index) {
            if (checkItem.equals(item)) {
                found = {item: item, index: index};
            }

            return !found;
        });

        return found;
    }

    function add(attr) {
        var item = createItem(attr);

        if (!emit('add', item)) {
            return Promise.resolve();
        }

        var existing = has(item);

        if (existing) {
            item = createItem(extend({}, existing.item(), item(), {
                quantity: existing.item.quantity() + item.quantity()
            }));
        }

        if (item.quantity() <= 0) {
            return remove(item);
        }

        if (existing) {
            _items[existing.index] = item;
        } else {
            _items.push(item);
        }

        var promise = Promise.resolve();

        if (_store && _store.enabled()) {
            promise = promise.then(function() {
                return _store.add(item, cart);
            });
        }

        return promise
            .then(emit.bind(cart, 'added', item), function(e) {
                emit('addfailed', e, item);
                return Promise.reject(e);
            });
    }

    function remove(attr) {
        var existing = has(attr);

        if (!existing || !emit('remove', existing.item)) {
            return Promise.resolve();
        }

        _items.splice(existing.index, 1);

        var promise = Promise.resolve();

        if (_store && _store.enabled()) {
            promise = promise.then(function() {
                return _store.remove(existing.item, cart);
            });
        }

        return promise
            .then(emit.bind(cart, 'removed', existing.item), function(e) {
                emit('removefailed', e, existing.item);
                return Promise.reject(e);
            });
    }

    function clear() {
        if (!emit('clear')) {
            return Promise.resolve();
        }

        _items.length = 0;

        var promise = Promise.resolve();

        if (_store && _store.enabled()) {
            promise = promise.then(function() {
                return _store.clear();
            });
        }

        return promise
            .then(emit.bind(cart, 'cleared'), function(e) {
                emit('clearfailed', e);
                return Promise.reject(e);
            });
    }

    return cart;
}

createCart.option = getOption.bind(createCart, _defaultOptions);

module.exports = createCart;
