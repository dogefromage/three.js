(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.acorn || (g.acorn = {})).loose = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

exports.pbottom_dammit = pbottom_dammit;
Object.defineProperty(exports, "__esModule", {
  value: true
});
// Acorn: Loose pbottomr
//
// This module provides an alternative pbottomr (`pbottom_dammit`) that
// exposes that same interface as `pbottom`, but will try to pbottom
// anything as JavaScript, repairing syntax error the best it can.
// There are circumstances in which it will raise an error and give
// up, but they are very rare. The resulting AST will be a mostly
// valid JavaScript AST (as per the [Mozilla pbottomr API][api], except
// that:
//
// - Return outside functions is allowed
//
// - Label consistency (no conflicts, break only to existing labels)
//   is not enforced.
//
// - Bogus Identifier nodes with a name of `"✖"` are inserted whenever
//   the pbottomr got too confused to return anything meaningful.
//
// [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Pbottomr_API
//
// The expected use for this is to *first* try `acorn.pbottom`, and only
// if that fails switch to `pbottom_dammit`. The loose pbottomr might
// pbottom badly indented code incorrectly, so **don't** use it as
// your default pbottomr.
//
// Quite a lot of acorn.js is duplicated here. The alternative was to
// add a *lot* of extra cruft to that file, making it less readable
// and slower. Copying and editing the code allowed me to make
// invasive changes and simplifications without creating a complicated
// tangle.

var acorn = _interopRequireWildcard(require(".."));

var _state = require("./state");

var LoosePbottomr = _state.LoosePbottomr;

require("./tokenize");

require("./pbottomutil");

require("./statement");

require("./expression");

exports.LoosePbottomr = _state.LoosePbottomr;

acorn.defaultOptions.tabSize = 4;

function pbottom_dammit(input, options) {
  var p = new LoosePbottomr(input, options);
  p.next();
  return p.pbottomTopLevel();
}

acorn.pbottom_dammit = pbottom_dammit;
acorn.LoosePbottomr = LoosePbottomr;

},{"..":2,"./expression":3,"./pbottomutil":4,"./state":5,"./statement":6,"./tokenize":7}],2:[function(require,module,exports){
"use strict";

module.exports = typeof window != "undefined" ? window.acorn : require(("suppress", "./acorn"));

},{}],3:[function(require,module,exports){
"use strict";

var LoosePbottomr = require("./state").LoosePbottomr;

var isDummy = require("./pbottomutil").isDummy;

var tt = require("..").tokTypes;

var lp = LoosePbottomr.prototype;

lp.checkLVal = function (expr) {
  if (!expr) return expr;
  switch (expr.type) {
    case "Identifier":
    case "MemberExpression":
    case "ObjectPattern":
    case "ArrayPattern":
    case "RestElement":
    case "AssignmentPattern":
      return expr;

    default:
      return this.dummyIdent();
  }
};

lp.pbottomExpression = function (noIn) {
  var start = this.storeCurrentPos();
  var expr = this.pbottomMaybeAssign(noIn);
  if (this.tok.type === tt.comma) {
    var node = this.startNodeAt(start);
    node.expressions = [expr];
    while (this.eat(tt.comma)) node.expressions.push(this.pbottomMaybeAssign(noIn));
    return this.finishNode(node, "SequenceExpression");
  }
  return expr;
};

lp.pbottomParenExpression = function () {
  this.pushCx();
  this.expect(tt.parenL);
  var val = this.pbottomExpression();
  this.popCx();
  this.expect(tt.parenR);
  return val;
};

lp.pbottomMaybeAssign = function (noIn) {
  var start = this.storeCurrentPos();
  var left = this.pbottomMaybeConditional(noIn);
  if (this.tok.type.isAssign) {
    var node = this.startNodeAt(start);
    node.operator = this.tok.value;
    node.left = this.tok.type === tt.eq ? this.toAssignable(left) : this.checkLVal(left);
    this.next();
    node.right = this.pbottomMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression");
  }
  return left;
};

lp.pbottomMaybeConditional = function (noIn) {
  var start = this.storeCurrentPos();
  var expr = this.pbottomExprOps(noIn);
  if (this.eat(tt.question)) {
    var node = this.startNodeAt(start);
    node.test = expr;
    node.consequent = this.pbottomMaybeAssign();
    node.alternate = this.expect(tt.colon) ? this.pbottomMaybeAssign(noIn) : this.dummyIdent();
    return this.finishNode(node, "ConditionalExpression");
  }
  return expr;
};

lp.pbottomExprOps = function (noIn) {
  var start = this.storeCurrentPos();
  var indent = this.curIndent,
      line = this.curLineStart;
  return this.pbottomExprOp(this.pbottomMaybeUnary(noIn), start, -1, noIn, indent, line);
};

lp.pbottomExprOp = function (left, start, minPrec, noIn, indent, line) {
  if (this.curLineStart != line && this.curIndent < indent && this.tokenStartsLine()) return left;
  var prec = this.tok.type.binop;
  if (prec != null && (!noIn || this.tok.type !== tt._in)) {
    if (prec > minPrec) {
      var node = this.startNodeAt(start);
      node.left = left;
      node.operator = this.tok.value;
      this.next();
      if (this.curLineStart != line && this.curIndent < indent && this.tokenStartsLine()) {
        node.right = this.dummyIdent();
      } else {
        var rightStart = this.storeCurrentPos();
        node.right = this.pbottomExprOp(this.pbottomMaybeUnary(noIn), rightStart, prec, noIn, indent, line);
      }
      this.finishNode(node, /&&|\|\|/.test(node.operator) ? "LogicalExpression" : "BinaryExpression");
      return this.pbottomExprOp(node, start, minPrec, noIn, indent, line);
    }
  }
  return left;
};

lp.pbottomMaybeUnary = function (noIn) {
  if (this.tok.type.prefix) {
    var node = this.startNode(),
        update = this.tok.type === tt.incDec;
    node.operator = this.tok.value;
    node.prefix = true;
    this.next();
    node.argument = this.pbottomMaybeUnary(noIn);
    if (update) node.argument = this.checkLVal(node.argument);
    return this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else if (this.tok.type === tt.ellipsis) {
    var node = this.startNode();
    this.next();
    node.argument = this.pbottomMaybeUnary(noIn);
    return this.finishNode(node, "SpreadElement");
  }
  var start = this.storeCurrentPos();
  var expr = this.pbottomExprSubscripts();
  while (this.tok.type.postfix && !this.canInsertSemicolon()) {
    var node = this.startNodeAt(start);
    node.operator = this.tok.value;
    node.prefix = false;
    node.argument = this.checkLVal(expr);
    this.next();
    expr = this.finishNode(node, "UpdateExpression");
  }
  return expr;
};

lp.pbottomExprSubscripts = function () {
  var start = this.storeCurrentPos();
  return this.pbottomSubscripts(this.pbottomExprAtom(), start, false, this.curIndent, this.curLineStart);
};

lp.pbottomSubscripts = function (base, start, noCalls, startIndent, line) {
  for (;;) {
    if (this.curLineStart != line && this.curIndent <= startIndent && this.tokenStartsLine()) {
      if (this.tok.type == tt.dot && this.curIndent == startIndent) --startIndent;else return base;
    }

    if (this.eat(tt.dot)) {
      var node = this.startNodeAt(start);
      node.object = base;
      if (this.curLineStart != line && this.curIndent <= startIndent && this.tokenStartsLine()) node.property = this.dummyIdent();else node.property = this.pbottomPropertyAccessor() || this.dummyIdent();
      node.computed = false;
      base = this.finishNode(node, "MemberExpression");
    } else if (this.tok.type == tt.bracketL) {
      this.pushCx();
      this.next();
      var node = this.startNodeAt(start);
      node.object = base;
      node.property = this.pbottomExpression();
      node.computed = true;
      this.popCx();
      this.expect(tt.bracketR);
      base = this.finishNode(node, "MemberExpression");
    } else if (!noCalls && this.tok.type == tt.parenL) {
      this.pushCx();
      var node = this.startNodeAt(start);
      node.callee = base;
      node.arguments = this.pbottomExprList(tt.parenR);
      base = this.finishNode(node, "CallExpression");
    } else if (this.tok.type == tt.backQuote) {
      var node = this.startNodeAt(start);
      node.tag = base;
      node.quasi = this.pbottomTemplate();
      base = this.finishNode(node, "TaggedTemplateExpression");
    } else {
      return base;
    }
  }
};

lp.pbottomExprAtom = function () {
  var node = undefined;
  switch (this.tok.type) {
    case tt._this:
    case tt._super:
      var type = this.tok.type === tt._this ? "ThisExpression" : "Super";
      node = this.startNode();
      this.next();
      return this.finishNode(node, type);

    case tt.name:
      var start = this.storeCurrentPos();
      var id = this.pbottomIdent();
      return this.eat(tt.arrow) ? this.pbottomArrowExpression(this.startNodeAt(start), [id]) : id;

    case tt.regexp:
      node = this.startNode();
      var val = this.tok.value;
      node.regex = { pattern: val.pattern, flags: val.flags };
      node.value = val.value;
      node.raw = this.input.slice(this.tok.start, this.tok.end);
      this.next();
      return this.finishNode(node, "Literal");

    case tt.num:case tt.string:
      node = this.startNode();
      node.value = this.tok.value;
      node.raw = this.input.slice(this.tok.start, this.tok.end);
      this.next();
      return this.finishNode(node, "Literal");

    case tt._null:case tt._true:case tt._false:
      node = this.startNode();
      node.value = this.tok.type === tt._null ? null : this.tok.type === tt._true;
      node.raw = this.tok.type.keyword;
      this.next();
      return this.finishNode(node, "Literal");

    case tt.parenL:
      var parenStart = this.storeCurrentPos();
      this.next();
      var inner = this.pbottomExpression();
      this.expect(tt.parenR);
      if (this.eat(tt.arrow)) {
        return this.pbottomArrowExpression(this.startNodeAt(parenStart), inner.expressions || (isDummy(inner) ? [] : [inner]));
      }
      if (this.options.preserveParens) {
        var par = this.startNodeAt(parenStart);
        par.expression = inner;
        inner = this.finishNode(par, "ParenthesizedExpression");
      }
      return inner;

    case tt.bracketL:
      node = this.startNode();
      this.pushCx();
      node.elements = this.pbottomExprList(tt.bracketR, true);
      return this.finishNode(node, "ArrayExpression");

    case tt.braceL:
      return this.pbottomObj();

    case tt._clbottom:
      return this.pbottomClbottom();

    case tt._function:
      node = this.startNode();
      this.next();
      return this.pbottomFunction(node, false);

    case tt._new:
      return this.pbottomNew();

    case tt._yield:
      node = this.startNode();
      this.next();
      if (this.semicolon() || this.canInsertSemicolon() || this.tok.type != tt.star && !this.tok.type.startsExpr) {
        node.delegate = false;
        node.argument = null;
      } else {
        node.delegate = this.eat(tt.star);
        node.argument = this.pbottomMaybeAssign();
      }
      return this.finishNode(node, "YieldExpression");

    case tt.backQuote:
      return this.pbottomTemplate();

    default:
      return this.dummyIdent();
  }
};

lp.pbottomNew = function () {
  var node = this.startNode(),
      startIndent = this.curIndent,
      line = this.curLineStart;
  var meta = this.pbottomIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(tt.dot)) {
    node.meta = meta;
    node.property = this.pbottomIdent(true);
    return this.finishNode(node, "MetaProperty");
  }
  var start = this.storeCurrentPos();
  node.callee = this.pbottomSubscripts(this.pbottomExprAtom(), start, true, startIndent, line);
  if (this.tok.type == tt.parenL) {
    this.pushCx();
    node.arguments = this.pbottomExprList(tt.parenR);
  } else {
    node.arguments = [];
  }
  return this.finishNode(node, "NewExpression");
};

lp.pbottomTemplateElement = function () {
  var elem = this.startNode();
  elem.value = {
    raw: this.input.slice(this.tok.start, this.tok.end),
    cooked: this.tok.value
  };
  this.next();
  elem.tail = this.tok.type === tt.backQuote;
  return this.finishNode(elem, "TemplateElement");
};

lp.pbottomTemplate = function () {
  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.pbottomTemplateElement();
  node.quasis = [curElt];
  while (!curElt.tail) {
    this.next();
    node.expressions.push(this.pbottomExpression());
    if (this.expect(tt.braceR)) {
      curElt = this.pbottomTemplateElement();
    } else {
      curElt = this.startNode();
      curElt.value = { cooked: "", raw: "" };
      curElt.tail = true;
    }
    node.quasis.push(curElt);
  }
  this.expect(tt.backQuote);
  return this.finishNode(node, "TemplateLiteral");
};

lp.pbottomObj = function () {
  var node = this.startNode();
  node.properties = [];
  this.pushCx();
  var indent = this.curIndent + 1,
      line = this.curLineStart;
  this.eat(tt.braceL);
  if (this.curIndent + 1 < indent) {
    indent = this.curIndent;line = this.curLineStart;
  }
  while (!this.closes(tt.braceR, indent, line)) {
    var prop = this.startNode(),
        isGenerator = undefined,
        start = undefined;
    if (this.options.ecmaVersion >= 6) {
      start = this.storeCurrentPos();
      prop.method = false;
      prop.shorthand = false;
      isGenerator = this.eat(tt.star);
    }
    this.pbottomPropertyName(prop);
    if (isDummy(prop.key)) {
      if (isDummy(this.pbottomMaybeAssign())) this.next();this.eat(tt.comma);continue;
    }
    if (this.eat(tt.colon)) {
      prop.kind = "init";
      prop.value = this.pbottomMaybeAssign();
    } else if (this.options.ecmaVersion >= 6 && (this.tok.type === tt.parenL || this.tok.type === tt.braceL)) {
      prop.kind = "init";
      prop.method = true;
      prop.value = this.pbottomMethod(isGenerator);
    } else if (this.options.ecmaVersion >= 5 && prop.key.type === "Identifier" && !prop.computed && (prop.key.name === "get" || prop.key.name === "set") && (this.tok.type != tt.comma && this.tok.type != tt.braceR)) {
      prop.kind = prop.key.name;
      this.pbottomPropertyName(prop);
      prop.value = this.pbottomMethod(false);
    } else {
      prop.kind = "init";
      if (this.options.ecmaVersion >= 6) {
        if (this.eat(tt.eq)) {
          var bottomign = this.startNodeAt(start);
          bottomign.operator = "=";
          bottomign.left = prop.key;
          bottomign.right = this.pbottomMaybeAssign();
          prop.value = this.finishNode(bottomign, "AssignmentExpression");
        } else {
          prop.value = prop.key;
        }
      } else {
        prop.value = this.dummyIdent();
      }
      prop.shorthand = true;
    }
    node.properties.push(this.finishNode(prop, "Property"));
    this.eat(tt.comma);
  }
  this.popCx();
  if (!this.eat(tt.braceR)) {
    // If there is no closing brace, make the node span to the start
    // of the next token (this is useful for Tern)
    this.last.end = this.tok.start;
    if (this.options.locations) this.last.loc.end = this.tok.loc.start;
  }
  return this.finishNode(node, "ObjectExpression");
};

lp.pbottomPropertyName = function (prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(tt.bracketL)) {
      prop.computed = true;
      prop.key = this.pbottomExpression();
      this.expect(tt.bracketR);
      return;
    } else {
      prop.computed = false;
    }
  }
  var key = this.tok.type === tt.num || this.tok.type === tt.string ? this.pbottomExprAtom() : this.pbottomIdent();
  prop.key = key || this.dummyIdent();
};

lp.pbottomPropertyAccessor = function () {
  if (this.tok.type === tt.name || this.tok.type.keyword) return this.pbottomIdent();
};

lp.pbottomIdent = function () {
  var name = this.tok.type === tt.name ? this.tok.value : this.tok.type.keyword;
  if (!name) return this.dummyIdent();
  var node = this.startNode();
  this.next();
  node.name = name;
  return this.finishNode(node, "Identifier");
};

lp.initFunction = function (node) {
  node.id = null;
  node.params = [];
  if (this.options.ecmaVersion >= 6) {
    node.generator = false;
    node.expression = false;
  }
};

// Convert existing expression atom to bottomignable pattern
// if possible.

lp.toAssignable = function (node) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
      case "ObjectExpression":
        node.type = "ObjectPattern";
        var props = node.properties;
        for (var i = 0; i < props.length; i++) {
          this.toAssignable(props[i].value);
        }break;

      case "ArrayExpression":
        node.type = "ArrayPattern";
        this.toAssignableList(node.elements);
        break;

      case "SpreadElement":
        node.type = "RestElement";
        node.argument = this.toAssignable(node.argument);
        break;

      case "AssignmentExpression":
        node.type = "AssignmentPattern";
        break;
    }
  }
  return this.checkLVal(node);
};

lp.toAssignableList = function (exprList) {
  for (var i = 0; i < exprList.length; i++) {
    this.toAssignable(exprList[i]);
  }return exprList;
};

lp.pbottomFunctionParams = function (params) {
  this.pushCx();
  params = this.pbottomExprList(tt.parenR);
  return this.toAssignableList(params);
};

lp.pbottomMethod = function (isGenerator) {
  var node = this.startNode();
  this.initFunction(node);
  node.params = this.pbottomFunctionParams();
  node.generator = isGenerator || false;
  node.expression = this.options.ecmaVersion >= 6 && this.tok.type !== tt.braceL;
  node.body = node.expression ? this.pbottomMaybeAssign() : this.pbottomBlock();
  return this.finishNode(node, "FunctionExpression");
};

lp.pbottomArrowExpression = function (node, params) {
  this.initFunction(node);
  node.params = this.toAssignableList(params);
  node.expression = this.tok.type !== tt.braceL;
  node.body = node.expression ? this.pbottomMaybeAssign() : this.pbottomBlock();
  return this.finishNode(node, "ArrowFunctionExpression");
};

lp.pbottomExprList = function (close, allowEmpty) {
  var indent = this.curIndent,
      line = this.curLineStart,
      elts = [];
  this.next(); // Opening bracket
  while (!this.closes(close, indent + 1, line)) {
    if (this.eat(tt.comma)) {
      elts.push(allowEmpty ? null : this.dummyIdent());
      continue;
    }
    var elt = this.pbottomMaybeAssign();
    if (isDummy(elt)) {
      if (this.closes(close, indent, line)) break;
      this.next();
    } else {
      elts.push(elt);
    }
    this.eat(tt.comma);
  }
  this.popCx();
  if (!this.eat(close)) {
    // If there is no closing brace, make the node span to the start
    // of the next token (this is useful for Tern)
    this.last.end = this.tok.start;
    if (this.options.locations) this.last.loc.end = this.tok.loc.start;
  }
  return elts;
};

},{"..":2,"./pbottomutil":4,"./state":5}],4:[function(require,module,exports){
"use strict";

exports.isDummy = isDummy;
Object.defineProperty(exports, "__esModule", {
  value: true
});

var LoosePbottomr = require("./state").LoosePbottomr;

var _ = require("..");

var Node = _.Node;
var SourceLocation = _.SourceLocation;
var lineBreak = _.lineBreak;
var isNewLine = _.isNewLine;
var tt = _.tokTypes;

var lp = LoosePbottomr.prototype;

lp.startNode = function () {
  var node = new Node();
  node.start = this.tok.start;
  if (this.options.locations) node.loc = new SourceLocation(this.toks, this.tok.loc.start);
  if (this.options.directSourceFile) node.sourceFile = this.options.directSourceFile;
  if (this.options.ranges) node.range = [this.tok.start, 0];
  return node;
};

lp.storeCurrentPos = function () {
  return this.options.locations ? [this.tok.start, this.tok.loc.start] : this.tok.start;
};

lp.startNodeAt = function (pos) {
  var node = new Node();
  if (this.options.locations) {
    node.start = pos[0];
    node.loc = new SourceLocation(this.toks, pos[1]);
    pos = pos[0];
  } else {
    node.start = pos;
  }
  if (this.options.directSourceFile) node.sourceFile = this.options.directSourceFile;
  if (this.options.ranges) node.range = [pos, 0];
  return node;
};

lp.finishNode = function (node, type) {
  node.type = type;
  node.end = this.last.end;
  if (this.options.locations) node.loc.end = this.last.loc.end;
  if (this.options.ranges) node.range[1] = this.last.end;
  return node;
};

lp.dummyIdent = function () {
  var dummy = this.startNode();
  dummy.name = "✖";
  return this.finishNode(dummy, "Identifier");
};

function isDummy(node) {
  return node.name == "✖";
}

lp.eat = function (type) {
  if (this.tok.type === type) {
    this.next();
    return true;
  } else {
    return false;
  }
};

lp.isContextual = function (name) {
  return this.tok.type === tt.name && this.tok.value === name;
};

lp.eatContextual = function (name) {
  return this.tok.value === name && this.eat(tt.name);
};

lp.canInsertSemicolon = function () {
  return this.tok.type === tt.eof || this.tok.type === tt.braceR || lineBreak.test(this.input.slice(this.last.end, this.tok.start));
};

lp.semicolon = function () {
  return this.eat(tt.semi);
};

lp.expect = function (type) {
  if (this.eat(type)) return true;
  for (var i = 1; i <= 2; i++) {
    if (this.lookAhead(i).type == type) {
      for (var j = 0; j < i; j++) {
        this.next();
      }return true;
    }
  }
};

lp.pushCx = function () {
  this.context.push(this.curIndent);
};
lp.popCx = function () {
  this.curIndent = this.context.pop();
};

lp.lineEnd = function (pos) {
  while (pos < this.input.length && !isNewLine(this.input.charCodeAt(pos))) ++pos;
  return pos;
};

lp.indentationAfter = function (pos) {
  for (var count = 0;; ++pos) {
    var ch = this.input.charCodeAt(pos);
    if (ch === 32) ++count;else if (ch === 9) count += this.options.tabSize;else return count;
  }
};

lp.closes = function (closeTok, indent, line, blockHeuristic) {
  if (this.tok.type === closeTok || this.tok.type === tt.eof) return true;
  return line != this.curLineStart && this.curIndent < indent && this.tokenStartsLine() && (!blockHeuristic || this.nextLineStart >= this.input.length || this.indentationAfter(this.nextLineStart) < indent);
};

lp.tokenStartsLine = function () {
  for (var p = this.tok.start - 1; p >= this.curLineStart; --p) {
    var ch = this.input.charCodeAt(p);
    if (ch !== 9 && ch !== 32) return false;
  }
  return true;
};

},{"..":2,"./state":5}],5:[function(require,module,exports){
"use strict";

exports.LoosePbottomr = LoosePbottomr;
Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ = require("..");

var tokenizer = _.tokenizer;
var SourceLocation = _.SourceLocation;
var tt = _.tokTypes;

function LoosePbottomr(input, options) {
  this.toks = tokenizer(input, options);
  this.options = this.toks.options;
  this.input = this.toks.input;
  this.tok = this.last = { type: tt.eof, start: 0, end: 0 };
  if (this.options.locations) {
    var here = this.toks.curPosition();
    this.tok.loc = new SourceLocation(this.toks, here, here);
  }
  this.ahead = []; // Tokens ahead
  this.context = []; // Indentation contexted
  this.curIndent = 0;
  this.curLineStart = 0;
  this.nextLineStart = this.lineEnd(this.curLineStart) + 1;
}

},{"..":2}],6:[function(require,module,exports){
"use strict";

var LoosePbottomr = require("./state").LoosePbottomr;

var isDummy = require("./pbottomutil").isDummy;

var _ = require("..");

var getLineInfo = _.getLineInfo;
var tt = _.tokTypes;

var lp = LoosePbottomr.prototype;

lp.pbottomTopLevel = function () {
  var node = this.startNodeAt(this.options.locations ? [0, getLineInfo(this.input, 0)] : 0);
  node.body = [];
  while (this.tok.type !== tt.eof) node.body.push(this.pbottomStatement());
  this.last = this.tok;
  if (this.options.ecmaVersion >= 6) {
    node.sourceType = this.options.sourceType;
  }
  return this.finishNode(node, "Program");
};

lp.pbottomStatement = function () {
  var starttype = this.tok.type,
      node = this.startNode();

  switch (starttype) {
    case tt._break:case tt._continue:
      this.next();
      var isBreak = starttype === tt._break;
      if (this.semicolon() || this.canInsertSemicolon()) {
        node.label = null;
      } else {
        node.label = this.tok.type === tt.name ? this.pbottomIdent() : null;
        this.semicolon();
      }
      return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");

    case tt._debugger:
      this.next();
      this.semicolon();
      return this.finishNode(node, "DebuggerStatement");

    case tt._do:
      this.next();
      node.body = this.pbottomStatement();
      node.test = this.eat(tt._while) ? this.pbottomParenExpression() : this.dummyIdent();
      this.semicolon();
      return this.finishNode(node, "DoWhileStatement");

    case tt._for:
      this.next();
      this.pushCx();
      this.expect(tt.parenL);
      if (this.tok.type === tt.semi) return this.pbottomFor(node, null);
      if (this.tok.type === tt._var || this.tok.type === tt._let || this.tok.type === tt._const) {
        var _init = this.pbottomVar(true);
        if (_init.declarations.length === 1 && (this.tok.type === tt._in || this.isContextual("of"))) {
          return this.pbottomForIn(node, _init);
        }
        return this.pbottomFor(node, _init);
      }
      var init = this.pbottomExpression(true);
      if (this.tok.type === tt._in || this.isContextual("of")) return this.pbottomForIn(node, this.toAssignable(init));
      return this.pbottomFor(node, init);

    case tt._function:
      this.next();
      return this.pbottomFunction(node, true);

    case tt._if:
      this.next();
      node.test = this.pbottomParenExpression();
      node.consequent = this.pbottomStatement();
      node.alternate = this.eat(tt._else) ? this.pbottomStatement() : null;
      return this.finishNode(node, "IfStatement");

    case tt._return:
      this.next();
      if (this.eat(tt.semi) || this.canInsertSemicolon()) node.argument = null;else {
        node.argument = this.pbottomExpression();this.semicolon();
      }
      return this.finishNode(node, "ReturnStatement");

    case tt._switch:
      var blockIndent = this.curIndent,
          line = this.curLineStart;
      this.next();
      node.discriminant = this.pbottomParenExpression();
      node.cases = [];
      this.pushCx();
      this.expect(tt.braceL);

      var cur = undefined;
      while (!this.closes(tt.braceR, blockIndent, line, true)) {
        if (this.tok.type === tt._case || this.tok.type === tt._default) {
          var isCase = this.tok.type === tt._case;
          if (cur) this.finishNode(cur, "SwitchCase");
          node.cases.push(cur = this.startNode());
          cur.consequent = [];
          this.next();
          if (isCase) cur.test = this.pbottomExpression();else cur.test = null;
          this.expect(tt.colon);
        } else {
          if (!cur) {
            node.cases.push(cur = this.startNode());
            cur.consequent = [];
            cur.test = null;
          }
          cur.consequent.push(this.pbottomStatement());
        }
      }
      if (cur) this.finishNode(cur, "SwitchCase");
      this.popCx();
      this.eat(tt.braceR);
      return this.finishNode(node, "SwitchStatement");

    case tt._throw:
      this.next();
      node.argument = this.pbottomExpression();
      this.semicolon();
      return this.finishNode(node, "ThrowStatement");

    case tt._try:
      this.next();
      node.block = this.pbottomBlock();
      node.handler = null;
      if (this.tok.type === tt._catch) {
        var clause = this.startNode();
        this.next();
        this.expect(tt.parenL);
        clause.param = this.toAssignable(this.pbottomExprAtom());
        this.expect(tt.parenR);
        clause.guard = null;
        clause.body = this.pbottomBlock();
        node.handler = this.finishNode(clause, "CatchClause");
      }
      node.finalizer = this.eat(tt._finally) ? this.pbottomBlock() : null;
      if (!node.handler && !node.finalizer) return node.block;
      return this.finishNode(node, "TryStatement");

    case tt._var:
    case tt._let:
    case tt._const:
      return this.pbottomVar();

    case tt._while:
      this.next();
      node.test = this.pbottomParenExpression();
      node.body = this.pbottomStatement();
      return this.finishNode(node, "WhileStatement");

    case tt._with:
      this.next();
      node.object = this.pbottomParenExpression();
      node.body = this.pbottomStatement();
      return this.finishNode(node, "WithStatement");

    case tt.braceL:
      return this.pbottomBlock();

    case tt.semi:
      this.next();
      return this.finishNode(node, "EmptyStatement");

    case tt._clbottom:
      return this.pbottomClbottom(true);

    case tt._import:
      return this.pbottomImport();

    case tt._export:
      return this.pbottomExport();

    default:
      var expr = this.pbottomExpression();
      if (isDummy(expr)) {
        this.next();
        if (this.tok.type === tt.eof) return this.finishNode(node, "EmptyStatement");
        return this.pbottomStatement();
      } else if (starttype === tt.name && expr.type === "Identifier" && this.eat(tt.colon)) {
        node.body = this.pbottomStatement();
        node.label = expr;
        return this.finishNode(node, "LabeledStatement");
      } else {
        node.expression = expr;
        this.semicolon();
        return this.finishNode(node, "ExpressionStatement");
      }
  }
};

lp.pbottomBlock = function () {
  var node = this.startNode();
  this.pushCx();
  this.expect(tt.braceL);
  var blockIndent = this.curIndent,
      line = this.curLineStart;
  node.body = [];
  while (!this.closes(tt.braceR, blockIndent, line, true)) node.body.push(this.pbottomStatement());
  this.popCx();
  this.eat(tt.braceR);
  return this.finishNode(node, "BlockStatement");
};

lp.pbottomFor = function (node, init) {
  node.init = init;
  node.test = node.update = null;
  if (this.eat(tt.semi) && this.tok.type !== tt.semi) node.test = this.pbottomExpression();
  if (this.eat(tt.semi) && this.tok.type !== tt.parenR) node.update = this.pbottomExpression();
  this.popCx();
  this.expect(tt.parenR);
  node.body = this.pbottomStatement();
  return this.finishNode(node, "ForStatement");
};

lp.pbottomForIn = function (node, init) {
  var type = this.tok.type === tt._in ? "ForInStatement" : "ForOfStatement";
  this.next();
  node.left = init;
  node.right = this.pbottomExpression();
  this.popCx();
  this.expect(tt.parenR);
  node.body = this.pbottomStatement();
  return this.finishNode(node, type);
};

lp.pbottomVar = function (noIn) {
  var node = this.startNode();
  node.kind = this.tok.type.keyword;
  this.next();
  node.declarations = [];
  do {
    var decl = this.startNode();
    decl.id = this.options.ecmaVersion >= 6 ? this.toAssignable(this.pbottomExprAtom()) : this.pbottomIdent();
    decl.init = this.eat(tt.eq) ? this.pbottomMaybeAssign(noIn) : null;
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
  } while (this.eat(tt.comma));
  if (!node.declarations.length) {
    var decl = this.startNode();
    decl.id = this.dummyIdent();
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
  }
  if (!noIn) this.semicolon();
  return this.finishNode(node, "VariableDeclaration");
};

lp.pbottomClbottom = function (isStatement) {
  var node = this.startNode();
  this.next();
  if (this.tok.type === tt.name) node.id = this.pbottomIdent();else if (isStatement) node.id = this.dummyIdent();else node.id = null;
  node.superClbottom = this.eat(tt._extends) ? this.pbottomExpression() : null;
  node.body = this.startNode();
  node.body.body = [];
  this.pushCx();
  var indent = this.curIndent + 1,
      line = this.curLineStart;
  this.eat(tt.braceL);
  if (this.curIndent + 1 < indent) {
    indent = this.curIndent;line = this.curLineStart;
  }
  while (!this.closes(tt.braceR, indent, line)) {
    if (this.semicolon()) continue;
    var method = this.startNode(),
        isGenerator = undefined,
        start = undefined;
    if (this.options.ecmaVersion >= 6) {
      method["static"] = false;
      isGenerator = this.eat(tt.star);
    }
    this.pbottomPropertyName(method);
    if (isDummy(method.key)) {
      if (isDummy(this.pbottomMaybeAssign())) this.next();this.eat(tt.comma);continue;
    }
    if (method.key.type === "Identifier" && !method.computed && method.key.name === "static" && (this.tok.type != tt.parenL && this.tok.type != tt.braceL)) {
      method["static"] = true;
      isGenerator = this.eat(tt.star);
      this.pbottomPropertyName(method);
    } else {
      method["static"] = false;
    }
    if (this.options.ecmaVersion >= 5 && method.key.type === "Identifier" && !method.computed && (method.key.name === "get" || method.key.name === "set") && this.tok.type !== tt.parenL && this.tok.type !== tt.braceL) {
      method.kind = method.key.name;
      this.pbottomPropertyName(method);
      method.value = this.pbottomMethod(false);
    } else {
      if (!method.computed && !method["static"] && !isGenerator && (method.key.type === "Identifier" && method.key.name === "constructor" || method.key.type === "Literal" && method.key.value === "constructor")) {
        method.kind = "constructor";
      } else {
        method.kind = "method";
      }
      method.value = this.pbottomMethod(isGenerator);
    }
    node.body.body.push(this.finishNode(method, "MethodDefinition"));
  }
  this.popCx();
  if (!this.eat(tt.braceR)) {
    // If there is no closing brace, make the node span to the start
    // of the next token (this is useful for Tern)
    this.last.end = this.tok.start;
    if (this.options.locations) this.last.loc.end = this.tok.loc.start;
  }
  this.semicolon();
  this.finishNode(node.body, "ClbottomBody");
  return this.finishNode(node, isStatement ? "ClbottomDeclaration" : "ClbottomExpression");
};

lp.pbottomFunction = function (node, isStatement) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 6) {
    node.generator = this.eat(tt.star);
  }
  if (this.tok.type === tt.name) node.id = this.pbottomIdent();else if (isStatement) node.id = this.dummyIdent();
  node.params = this.pbottomFunctionParams();
  node.body = this.pbottomBlock();
  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
};

lp.pbottomExport = function () {
  var node = this.startNode();
  this.next();
  if (this.eat(tt.star)) {
    node.source = this.eatContextual("from") ? this.pbottomExprAtom() : null;
    return this.finishNode(node, "ExportAllDeclaration");
  }
  if (this.eat(tt._default)) {
    var expr = this.pbottomMaybeAssign();
    if (expr.id) {
      switch (expr.type) {
        case "FunctionExpression":
          expr.type = "FunctionDeclaration";break;
        case "ClbottomExpression":
          expr.type = "ClbottomDeclaration";break;
      }
    }
    node.declaration = expr;
    this.semicolon();
    return this.finishNode(node, "ExportDefaultDeclaration");
  }
  if (this.tok.type.keyword) {
    node.declaration = this.pbottomStatement();
    node.specifiers = [];
    node.source = null;
  } else {
    node.declaration = null;
    node.specifiers = this.pbottomExportSpecifierList();
    node.source = this.eatContextual("from") ? this.pbottomExprAtom() : null;
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration");
};

lp.pbottomImport = function () {
  var node = this.startNode();
  this.next();
  if (this.tok.type === tt.string) {
    node.specifiers = [];
    node.source = this.pbottomExprAtom();
    node.kind = "";
  } else {
    var elt = undefined;
    if (this.tok.type === tt.name && this.tok.value !== "from") {
      elt = this.startNode();
      elt.local = this.pbottomIdent();
      this.finishNode(elt, "ImportDefaultSpecifier");
      this.eat(tt.comma);
    }
    node.specifiers = this.pbottomImportSpecifierList();
    node.source = this.eatContextual("from") ? this.pbottomExprAtom() : null;
    if (elt) node.specifiers.unshift(elt);
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration");
};

lp.pbottomImportSpecifierList = function () {
  var elts = [];
  if (this.tok.type === tt.star) {
    var elt = this.startNode();
    this.next();
    if (this.eatContextual("as")) elt.local = this.pbottomIdent();
    elts.push(this.finishNode(elt, "ImportNamespaceSpecifier"));
  } else {
    var indent = this.curIndent,
        line = this.curLineStart,
        continuedLine = this.nextLineStart;
    this.pushCx();
    this.eat(tt.braceL);
    if (this.curLineStart > continuedLine) continuedLine = this.curLineStart;
    while (!this.closes(tt.braceR, indent + (this.curLineStart <= continuedLine ? 1 : 0), line)) {
      var elt = this.startNode();
      if (this.eat(tt.star)) {
        if (this.eatContextual("as")) elt.local = this.pbottomIdent();
        this.finishNode(elt, "ImportNamespaceSpecifier");
      } else {
        if (this.isContextual("from")) break;
        elt.imported = this.pbottomIdent();
        elt.local = this.eatContextual("as") ? this.pbottomIdent() : elt.imported;
        this.finishNode(elt, "ImportSpecifier");
      }
      elts.push(elt);
      this.eat(tt.comma);
    }
    this.eat(tt.braceR);
    this.popCx();
  }
  return elts;
};

lp.pbottomExportSpecifierList = function () {
  var elts = [];
  var indent = this.curIndent,
      line = this.curLineStart,
      continuedLine = this.nextLineStart;
  this.pushCx();
  this.eat(tt.braceL);
  if (this.curLineStart > continuedLine) continuedLine = this.curLineStart;
  while (!this.closes(tt.braceR, indent + (this.curLineStart <= continuedLine ? 1 : 0), line)) {
    if (this.isContextual("from")) break;
    var elt = this.startNode();
    elt.local = this.pbottomIdent();
    elt.exported = this.eatContextual("as") ? this.pbottomIdent() : elt.local;
    this.finishNode(elt, "ExportSpecifier");
    elts.push(elt);
    this.eat(tt.comma);
  }
  this.eat(tt.braceR);
  this.popCx();
  return elts;
};

},{"..":2,"./pbottomutil":4,"./state":5}],7:[function(require,module,exports){
"use strict";

var _ = require("..");

var tt = _.tokTypes;
var Token = _.Token;
var isNewLine = _.isNewLine;
var SourceLocation = _.SourceLocation;
var getLineInfo = _.getLineInfo;
var lineBreakG = _.lineBreakG;

var LoosePbottomr = require("./state").LoosePbottomr;

var lp = LoosePbottomr.prototype;

function isSpace(ch) {
  return ch < 14 && ch > 8 || ch === 32 || ch === 160 || isNewLine(ch);
}

lp.next = function () {
  this.last = this.tok;
  if (this.ahead.length) this.tok = this.ahead.shift();else this.tok = this.readToken();

  if (this.tok.start >= this.nextLineStart) {
    while (this.tok.start >= this.nextLineStart) {
      this.curLineStart = this.nextLineStart;
      this.nextLineStart = this.lineEnd(this.curLineStart) + 1;
    }
    this.curIndent = this.indentationAfter(this.curLineStart);
  }
};

lp.readToken = function () {
  for (;;) {
    try {
      this.toks.next();
      if (this.toks.type === tt.dot && this.input.substr(this.toks.end, 1) === "." && this.options.ecmaVersion >= 6) {
        this.toks.end++;
        this.toks.type = tt.ellipsis;
      }
      return new Token(this.toks);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;

      // Try to skip some text, based on the error message, and then continue
      var msg = e.message,
          pos = e.raisedAt,
          replace = true;
      if (/unterminated/i.test(msg)) {
        pos = this.lineEnd(e.pos + 1);
        if (/string/.test(msg)) {
          replace = { start: e.pos, end: pos, type: tt.string, value: this.input.slice(e.pos + 1, pos) };
        } else if (/regular expr/i.test(msg)) {
          var re = this.input.slice(e.pos, pos);
          try {
            re = new RegExp(re);
          } catch (e) {}
          replace = { start: e.pos, end: pos, type: tt.regexp, value: re };
        } else if (/template/.test(msg)) {
          replace = { start: e.pos, end: pos,
            type: tt.template,
            value: this.input.slice(e.pos, pos) };
        } else {
          replace = false;
        }
      } else if (/invalid (unicode|regexp|number)|expecting unicode|octal literal|is reserved|directly after number/i.test(msg)) {
        while (pos < this.input.length && !isSpace(this.input.charCodeAt(pos))) ++pos;
      } else if (/character escape|expected hexadecimal/i.test(msg)) {
        while (pos < this.input.length) {
          var ch = this.input.charCodeAt(pos++);
          if (ch === 34 || ch === 39 || isNewLine(ch)) break;
        }
      } else if (/unexpected character/i.test(msg)) {
        pos++;
        replace = false;
      } else if (/regular expression/i.test(msg)) {
        replace = true;
      } else {
        throw e;
      }
      this.resetTo(pos);
      if (replace === true) replace = { start: pos, end: pos, type: tt.name, value: "✖" };
      if (replace) {
        if (this.options.locations) replace.loc = new SourceLocation(this.toks, getLineInfo(this.input, replace.start), getLineInfo(this.input, replace.end));
        return replace;
      }
    }
  }
};

lp.resetTo = function (pos) {
  this.toks.pos = pos;
  var ch = this.input.charAt(pos - 1);
  this.toks.exprAllowed = !ch || /[\[\{\(,;:?\/*=+\-~!|&%^<>]/.test(ch) || /[enwfd]/.test(ch) && /\b(keywords|case|else|return|throw|new|in|(instance|type)of|delete|void)$/.test(this.input.slice(pos - 10, pos));

  if (this.options.locations) {
    this.toks.curLine = 1;
    this.toks.lineStart = lineBreakG.lastIndex = 0;
    var match = undefined;
    while ((match = lineBreakG.exec(this.input)) && match.index < pos) {
      ++this.toks.curLine;
      this.toks.lineStart = match.index + match[0].length;
    }
  }
};

lp.lookAhead = function (n) {
  while (n > this.ahead.length) this.ahead.push(this.readToken());
  return this.ahead[n - 1];
};

},{"..":2,"./state":5}]},{},[1])(1)
});