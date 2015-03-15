'use strict';

module.exports = createTemplate;

var extend = require('extend');

var _defaultOptions = {
    templateLoader: function(template) {
        return template;
    },
    currencyFormatter: function(value) {
        return value;
    },
    numberFormatter: function(value) {
        return value;
    }
};

function createTemplate(options) {
    var _options = extend(true, {}, _defaultOptions, options);
    var formatNumber = _options.numberFormatter;
    var formatCurrency = _options.currencyFormatter;

    /*
     * JavaScript Templates 2.4.1
     * https://github.com/blueimp/JavaScript-Templates
     *
     * Copyright 2011, Sebastian Tschan
     * https://blueimp.net
     */
    var tmpl = function(str, data) {
        var f = !/[^\w\-\.:#]/.test(str) ? tmpl.cache[str] = tmpl.cache[str] ||
            tmpl(tmpl.load(str)) :
                new Function(
                    tmpl.arg + ',tmpl,formatNumber,formatCurrency',
                    "var _e=tmpl.encode" + tmpl.helper + ",_s='" +
                        str.replace(tmpl.regexp, tmpl.func) +
                        "';return _s;"
                );
        return data ? f(data, tmpl, formatNumber, formatCurrency) : function(data) {
            return f(data, tmpl, formatNumber, formatCurrency);
        };
    };
    tmpl.cache = {};
    tmpl.load = _options.templateLoader;
    tmpl.regexp = /([\s'\\])(?!(?:[^{]|\{(?!%))*%\})|(?:\{%(=|#)([\s\S]+?)%\})|(\{%)|(%\})/g;
    tmpl.func = function(s, p1, p2, p3, p4, p5) {
        if (p1) { // whitespace, quote and backspace in HTML context
            return {
                    "\n": "\\n",
                    "\r": "\\r",
                    "\t": "\\t",
                    " ": " "
                }[p1] || "\\" + p1;
        }
        if (p2) { // interpolation: {%=prop%}, or unescaped: {%#prop%}
            if (p2 === "=") {
                return "'+_e(" + p3 + ")+'";
            }
            return "'+(" + p3 + "==null?'':" + p3 + ")+'";
        }
        if (p4) { // evaluation start tag: {%
            return "';";
        }
        if (p5) { // evaluation end tag: %}
            return "_s+='";
        }
    };
    tmpl.encReg = /[<>&"'\x00]/g;
    tmpl.encMap = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "\"": "&quot;",
        "'": "&#39;"
    };
    tmpl.encode = function(s) {
        /*jshint eqnull:true */
        return (s == null ? "" : "" + s).replace(
            tmpl.encReg,
            function(c) {
                return tmpl.encMap[c] || "";
            }
        );
    };
    tmpl.arg = "cart";
    tmpl.helper = ",print=function(s,e){_s+=e?(s==null?'':s):_e(s);}" +
        ",include=function(s,d){_s+=tmpl(s,d);}";

    return tmpl;
}
