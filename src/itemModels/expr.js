/**
 * The expression language item models are written in: the strings in
 * `answer.expr`, a distractor's `expr`, a constraint, a derived slot, and
 * the fields of a picture or display payload.
 *
 *   paid - price            nextTen(price) != paid - price
 *   coinValue(coinsA) > coinValue(coinsB) ? name1 : name2
 *
 * Numbers, quoted strings, slot names (with `.field` access), arithmetic,
 * comparison, `&&` / `||` / `!`, `?:` and calls to the helpers below. It is
 * a parser and a walker, deliberately not `new Function`: models will be
 * read back from the item_models table, and a template that could run
 * code in the admin would be a hole. Pure and dependency-free.
 */

const COIN_VALUE = { quarter: 25, dime: 10, nickel: 5, penny: 1 };
const COINS_BY_VALUE = ["quarter", "dime", "nickel", "penny"];

const list = (x, fn) => {
  if (!Array.isArray(x)) throw new Error(`${fn} needs a list`);
  return x;
};
const num = (x, fn) => {
  if (typeof x !== "number" || !Number.isFinite(x)) throw new Error(`${fn} needs a number`);
  return x;
};

/** The functions an expression may call. Each is pure and total over its
 * documented inputs; a wrong input type throws, which the fill reports. */

function formatCents(cents, style) {
  const c = Math.round(Number(cents));
  if (!Number.isFinite(c)) throw new Error("money() needs a number of cents");
  if (style === "dollars" || c >= 100) return `$${(c / 100).toFixed(2)}`;
  return `${c}¢`;
}

export const HELPERS = Object.freeze({
  min: (...xs) => Math.min(...xs.map((x) => num(x, "min"))),
  max: (...xs) => Math.max(...xs.map((x) => num(x, "max"))),
  abs: (x) => Math.abs(num(x, "abs")),
  floor: (x) => Math.floor(num(x, "floor")),
  ceil: (x) => Math.ceil(num(x, "ceil")),
  round: (x) => Math.round(num(x, "round")),
  /** x rounded up to a multiple of 10 (x itself when it already is one). */
  nextTen: (x) => Math.ceil(num(x, "nextTen") / 10) * 10,
  floorTen: (x) => Math.floor(num(x, "floorTen") / 10) * 10,
  nextDollar: (x) => Math.ceil(num(x, "nextDollar") / 100) * 100,
  /** The ones digit of a cent amount, and the amount with its ones removed. */
  ones: (x) => num(x, "ones") % 10,
  tens: (x) => num(x, "tens") - (num(x, "tens") % 10),
  len: (xs) => list(xs, "len").length,
  sum: (xs) => list(xs, "sum").reduce((s, x) => s + num(x, "sum"), 0),
  take: (xs, n) => list(xs, "take").slice(0, num(n, "take")),
  drop: (xs, n) => list(xs, "drop").slice(num(n, "drop")),
  concat: (a, b) => [...list(a, "concat"), ...list(b, "concat")],
  /** Coin lists are arrays of "quarter" | "dime" | "nickel" | "penny". */
  coinValue: (coins) => list(coins, "coinValue").reduce((s, c) => s + coinCents(c), 0),
  coinValues: (coins) => list(coins, "coinValues").map(coinCents),
  sortByValue: (coins) => [...list(coins, "sortByValue")].sort((a, b) => coinCents(b) - coinCents(a)),
  /** The fewest US coins for an amount (greedy is optimal for these four). */
  fewestCoins: (cents) => {
    let left = Math.round(num(cents, "fewestCoins"));
    const out = [];
    for (const name of COINS_BY_VALUE) {
      while (left >= COIN_VALUE[name]) {
        out.push(name);
        left -= COIN_VALUE[name];
      }
    }
    return out;
  },
  // Money as text, for text choices that carry an amount ("Yes, $1.45 left
  // over"): money() writes 45¢ under a dollar and $1.45 from one, dollars()
  // always writes $0.45.
  money: (c) => formatCents(c, "auto"),
  dollars: (c) => formatCents(c, "dollars"),
});

function coinCents(name) {
  const v = COIN_VALUE[name];
  if (v == null) throw new Error(`unknown coin "${name}"`);
  return v;
}

export const HELPER_NAMES = Object.freeze(Object.keys(HELPERS));

// ---------------------------------------------------------------------------
// Tokenizer and parser
// ---------------------------------------------------------------------------

const TOKEN_RE = /\s*(?:(\d+(?:\.\d+)?)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_][A-Za-z0-9_]*)|(<=|>=|==|!=|&&|\|\||[-+*/%<>!?:(),.]))/y;

function tokenize(text) {
  const tokens = [];
  TOKEN_RE.lastIndex = 0;
  let pos = 0;
  while (pos < text.length) {
    if (/^\s+$/.test(text.slice(pos))) break;
    TOKEN_RE.lastIndex = pos;
    const m = TOKEN_RE.exec(text);
    if (!m || m.index !== pos) throw new Error(`unexpected character at ${pos} in "${text}"`);
    if (m[1] != null) tokens.push({ t: "num", v: Number(m[1]) });
    else if (m[2] != null) tokens.push({ t: "str", v: m[2].slice(1, -1).replace(/\\(.)/g, "$1") });
    else if (m[3] != null) tokens.push({ t: "id", v: m[3] });
    else tokens.push({ t: "op", v: m[4] });
    pos = TOKEN_RE.lastIndex;
  }
  return tokens;
}

const BINARY = [
  ["||"],
  ["&&"],
  ["==", "!="],
  ["<", "<=", ">", ">="],
  ["+", "-"],
  ["*", "/", "%"],
];

class Parser {
  constructor(text) {
    this.text = text;
    this.tokens = tokenize(text);
    this.i = 0;
  }
  peek(t, v) {
    const tok = this.tokens[this.i];
    return tok && tok.t === t && (v === undefined || tok.v === v) ? tok : null;
  }
  eat(t, v) {
    const tok = this.peek(t, v);
    if (!tok) throw new Error(`expected ${v ?? t} in "${this.text}"`);
    this.i += 1;
    return tok;
  }
  parse() {
    const node = this.ternary();
    if (this.i < this.tokens.length) throw new Error(`unexpected "${this.tokens[this.i].v}" in "${this.text}"`);
    return node;
  }
  ternary() {
    const test = this.binary(0);
    if (!this.peek("op", "?")) return test;
    this.eat("op", "?");
    const a = this.ternary();
    this.eat("op", ":");
    const b = this.ternary();
    return { t: "cond", test, a, b };
  }
  binary(level) {
    if (level >= BINARY.length) return this.unary();
    let left = this.binary(level + 1);
    for (;;) {
      const tok = this.peek("op");
      if (!tok || !BINARY[level].includes(tok.v)) return left;
      this.i += 1;
      left = { t: "bin", op: tok.v, l: left, r: this.binary(level + 1) };
    }
  }
  unary() {
    if (this.peek("op", "-") || this.peek("op", "!")) {
      const op = this.eat("op").v;
      return { t: "un", op, arg: this.unary() };
    }
    return this.postfix();
  }
  postfix() {
    let node = this.primary();
    while (this.peek("op", ".")) {
      this.eat("op", ".");
      node = { t: "member", obj: node, name: this.eat("id").v };
    }
    return node;
  }
  primary() {
    if (this.peek("num")) return { t: "num", v: this.eat("num").v };
    if (this.peek("str")) return { t: "str", v: this.eat("str").v };
    if (this.peek("op", "(")) {
      this.eat("op", "(");
      const node = this.ternary();
      this.eat("op", ")");
      return node;
    }
    const name = this.eat("id").v;
    if (name === "true" || name === "false") return { t: "num", v: name === "true" };
    if (name === "null") return { t: "num", v: null };
    if (!this.peek("op", "(")) return { t: "id", name };
    this.eat("op", "(");
    const args = [];
    if (!this.peek("op", ")")) {
      args.push(this.ternary());
      while (this.peek("op", ",")) {
        this.eat("op", ",");
        args.push(this.ternary());
      }
    }
    this.eat("op", ")");
    return { t: "call", name, args };
  }
}

const cache = new Map();

/** Parse once; throws a plain Error naming the expression on a syntax error. */
export function parseExpr(text) {
  if (typeof text !== "string" || !text.trim()) throw new Error("empty expression");
  let ast = cache.get(text);
  if (!ast) {
    ast = new Parser(text).parse();
    cache.set(text, ast);
  }
  return ast;
}

/** The slot names an expression reads (helpers are not included). */
export function identifiersIn(text) {
  const out = new Set();
  const walk = (n) => {
    if (!n) return;
    switch (n.t) {
      case "id":
        out.add(n.name);
        break;
      case "member":
        walk(n.obj);
        break;
      case "call":
        if (!HELPERS[n.name]) out.add(n.name);
        n.args.forEach(walk);
        break;
      case "un":
        walk(n.arg);
        break;
      case "bin":
        walk(n.l);
        walk(n.r);
        break;
      case "cond":
        walk(n.test);
        walk(n.a);
        walk(n.b);
        break;
      default:
    }
  };
  walk(parseExpr(text));
  return [...out];
}

function run(n, scope) {
  switch (n.t) {
    case "num":
    case "str":
      return n.v;
    case "id":
      if (!(n.name in scope)) throw new Error(`unknown identifier "${n.name}"`);
      return scope[n.name];
    case "member": {
      const obj = run(n.obj, scope);
      if (obj === null || typeof obj !== "object") throw new Error(`no field "${n.name}" on a non-object`);
      return obj[n.name];
    }
    case "call": {
      const fn = HELPERS[n.name];
      if (!fn) throw new Error(`unknown function "${n.name}"`);
      return fn(...n.args.map((a) => run(a, scope)));
    }
    case "un": {
      const v = run(n.arg, scope);
      return n.op === "-" ? -num(v, "-") : !v;
    }
    case "cond":
      return run(n.test, scope) ? run(n.a, scope) : run(n.b, scope);
    case "bin": {
      if (n.op === "&&") return run(n.l, scope) && run(n.r, scope);
      if (n.op === "||") return run(n.l, scope) || run(n.r, scope);
      const l = run(n.l, scope);
      const r = run(n.r, scope);
      switch (n.op) {
        case "==":
          return l === r;
        case "!=":
          return l !== r;
        case "<":
          return l < r;
        case "<=":
          return l <= r;
        case ">":
          return l > r;
        case ">=":
          return l >= r;
        case "+":
          return typeof l === "string" || typeof r === "string" ? `${l}${r}` : num(l, "+") + num(r, "+");
        case "-":
          return num(l, "-") - num(r, "-");
        case "*":
          return num(l, "*") * num(r, "*");
        case "/":
          return num(l, "/") / num(r, "/");
        case "%":
          return num(l, "%") % num(r, "%");
        default:
          throw new Error(`unknown operator ${n.op}`);
      }
    }
    default:
      throw new Error(`bad node ${n.t}`);
  }
}

/** Evaluate `text` over `scope` (slot name -> value). Throws on an unknown
 * identifier, a bad call or a syntax error, so a broken model never yields
 * a silently wrong key. */
export function evalExpr(text, scope) {
  return run(parseExpr(text), scope);
}
