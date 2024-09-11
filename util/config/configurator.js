// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// node_modules/sisteransi/src/index.js
var require_src = __commonJS((exports, module) => {
  var ESC = "\x1B";
  var CSI = `${ESC}[`;
  var beep = "\x07";
  var cursor = {
    to(x, y) {
      if (!y)
        return `${CSI}${x + 1}G`;
      return `${CSI}${y + 1};${x + 1}H`;
    },
    move(x, y) {
      let ret = "";
      if (x < 0)
        ret += `${CSI}${-x}D`;
      else if (x > 0)
        ret += `${CSI}${x}C`;
      if (y < 0)
        ret += `${CSI}${-y}A`;
      else if (y > 0)
        ret += `${CSI}${y}B`;
      return ret;
    },
    up: (count = 1) => `${CSI}${count}A`,
    down: (count = 1) => `${CSI}${count}B`,
    forward: (count = 1) => `${CSI}${count}C`,
    backward: (count = 1) => `${CSI}${count}D`,
    nextLine: (count = 1) => `${CSI}E`.repeat(count),
    prevLine: (count = 1) => `${CSI}F`.repeat(count),
    left: `${CSI}G`,
    hide: `${CSI}?25l`,
    show: `${CSI}?25h`,
    save: `${ESC}7`,
    restore: `${ESC}8`
  };
  var scroll = {
    up: (count = 1) => `${CSI}S`.repeat(count),
    down: (count = 1) => `${CSI}T`.repeat(count)
  };
  var erase = {
    screen: `${CSI}2J`,
    up: (count = 1) => `${CSI}1J`.repeat(count),
    down: (count = 1) => `${CSI}J`.repeat(count),
    line: `${CSI}2K`,
    lineEnd: `${CSI}K`,
    lineStart: `${CSI}1K`,
    lines(count) {
      let clear = "";
      for (let i = 0;i < count; i++)
        clear += this.line + (i < count - 1 ? cursor.up() : "");
      if (count)
        clear += cursor.left;
      return clear;
    }
  };
  module.exports = { cursor, scroll, erase, beep };
});

// node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS((exports, module) => {
  var argv = process.argv || [];
  var env = process.env;
  var isColorSupported = !(("NO_COLOR" in env) || argv.includes("--no-color")) && (("FORCE_COLOR" in env) || argv.includes("--color") || process.platform === "win32" || import.meta.require != null && import.meta.require("tty").isatty(1) && env.TERM !== "dumb" || ("CI" in env));
  var formatter = (open, close, replace = open) => (input) => {
    let string = "" + input;
    let index = string.indexOf(close, open.length);
    return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
  };
  var replaceClose = (string, close, replace, index) => {
    let result = "";
    let cursor = 0;
    do {
      result += string.substring(cursor, index) + replace;
      cursor = index + close.length;
      index = string.indexOf(close, cursor);
    } while (~index);
    return result + string.substring(cursor);
  };
  var createColors = (enabled = isColorSupported) => {
    let init = enabled ? formatter : () => String;
    return {
      isColorSupported: enabled,
      reset: init("\x1B[0m", "\x1B[0m"),
      bold: init("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
      dim: init("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
      italic: init("\x1B[3m", "\x1B[23m"),
      underline: init("\x1B[4m", "\x1B[24m"),
      inverse: init("\x1B[7m", "\x1B[27m"),
      hidden: init("\x1B[8m", "\x1B[28m"),
      strikethrough: init("\x1B[9m", "\x1B[29m"),
      black: init("\x1B[30m", "\x1B[39m"),
      red: init("\x1B[31m", "\x1B[39m"),
      green: init("\x1B[32m", "\x1B[39m"),
      yellow: init("\x1B[33m", "\x1B[39m"),
      blue: init("\x1B[34m", "\x1B[39m"),
      magenta: init("\x1B[35m", "\x1B[39m"),
      cyan: init("\x1B[36m", "\x1B[39m"),
      white: init("\x1B[37m", "\x1B[39m"),
      gray: init("\x1B[90m", "\x1B[39m"),
      bgBlack: init("\x1B[40m", "\x1B[49m"),
      bgRed: init("\x1B[41m", "\x1B[49m"),
      bgGreen: init("\x1B[42m", "\x1B[49m"),
      bgYellow: init("\x1B[43m", "\x1B[49m"),
      bgBlue: init("\x1B[44m", "\x1B[49m"),
      bgMagenta: init("\x1B[45m", "\x1B[49m"),
      bgCyan: init("\x1B[46m", "\x1B[49m"),
      bgWhite: init("\x1B[47m", "\x1B[49m")
    };
  };
  module.exports = createColors();
  module.exports.createColors = createColors;
});

// configurator.ts
var {$: $2 } = globalThis.Bun;

// node_modules/@clack/core/dist/index.mjs
var import_sisteransi = __toESM(require_src(), 1);
import {stdin as $, stdout as k} from "process";
var import_picocolors = __toESM(require_picocolors(), 1);
import _ from "readline";
import {WriteStream as U} from "tty";
function q({ onlyFirst: t = false } = {}) {
  const u = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)", "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"].join("|");
  return new RegExp(u, t ? undefined : "g");
}
function S(t) {
  if (typeof t != "string")
    throw new TypeError(`Expected a \`string\`, got \`${typeof t}\``);
  return t.replace(q(), "");
}
function j(t) {
  return t && t.__esModule && Object.prototype.hasOwnProperty.call(t, "default") ? t.default : t;
}
function A(t, u = {}) {
  if (typeof t != "string" || t.length === 0 || (u = { ambiguousIsNarrow: true, ...u }, t = S(t), t.length === 0))
    return 0;
  t = t.replace(DD(), "  ");
  const F = u.ambiguousIsNarrow ? 1 : 2;
  let e = 0;
  for (const s of t) {
    const C = s.codePointAt(0);
    if (C <= 31 || C >= 127 && C <= 159 || C >= 768 && C <= 879)
      continue;
    switch (Q.eastAsianWidth(s)) {
      case "F":
      case "W":
        e += 2;
        break;
      case "A":
        e += F;
        break;
      default:
        e += 1;
    }
  }
  return e;
}
function tD() {
  const t = new Map;
  for (const [u, F] of Object.entries(r)) {
    for (const [e, s] of Object.entries(F))
      r[e] = { open: `\x1B[${s[0]}m`, close: `\x1B[${s[1]}m` }, F[e] = r[e], t.set(s[0], s[1]);
    Object.defineProperty(r, u, { value: F, enumerable: false });
  }
  return Object.defineProperty(r, "codes", { value: t, enumerable: false }), r.color.close = "\x1B[39m", r.bgColor.close = "\x1B[49m", r.color.ansi = T(), r.color.ansi256 = P(), r.color.ansi16m = W(), r.bgColor.ansi = T(m), r.bgColor.ansi256 = P(m), r.bgColor.ansi16m = W(m), Object.defineProperties(r, { rgbToAnsi256: { value: (u, F, e) => u === F && F === e ? u < 8 ? 16 : u > 248 ? 231 : Math.round((u - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(u / 255 * 5) + 6 * Math.round(F / 255 * 5) + Math.round(e / 255 * 5), enumerable: false }, hexToRgb: { value: (u) => {
    const F = /[a-f\d]{6}|[a-f\d]{3}/i.exec(u.toString(16));
    if (!F)
      return [0, 0, 0];
    let [e] = F;
    e.length === 3 && (e = [...e].map((C) => C + C).join(""));
    const s = Number.parseInt(e, 16);
    return [s >> 16 & 255, s >> 8 & 255, s & 255];
  }, enumerable: false }, hexToAnsi256: { value: (u) => r.rgbToAnsi256(...r.hexToRgb(u)), enumerable: false }, ansi256ToAnsi: { value: (u) => {
    if (u < 8)
      return 30 + u;
    if (u < 16)
      return 90 + (u - 8);
    let F, e, s;
    if (u >= 232)
      F = ((u - 232) * 10 + 8) / 255, e = F, s = F;
    else {
      u -= 16;
      const i = u % 36;
      F = Math.floor(u / 36) / 5, e = Math.floor(i / 6) / 5, s = i % 6 / 5;
    }
    const C = Math.max(F, e, s) * 2;
    if (C === 0)
      return 30;
    let D = 30 + (Math.round(s) << 2 | Math.round(e) << 1 | Math.round(F));
    return C === 2 && (D += 60), D;
  }, enumerable: false }, rgbToAnsi: { value: (u, F, e) => r.ansi256ToAnsi(r.rgbToAnsi256(u, F, e)), enumerable: false }, hexToAnsi: { value: (u) => r.ansi256ToAnsi(r.hexToAnsi256(u)), enumerable: false } }), r;
}
function R(t, u, F) {
  return String(t).normalize().replace(/\r\n/g, `
`).split(`
`).map((e) => ED(e, u, F)).join(`
`);
}
function aD(t, u) {
  if (t === u)
    return;
  const F = t.split(`
`), e = u.split(`
`), s = [];
  for (let C = 0;C < Math.max(F.length, e.length); C++)
    F[C] !== e[C] && s.push(C);
  return s;
}
function hD(t) {
  return t === V;
}
function v(t, u) {
  t.isTTY && t.setRawMode(u);
}
var M = { exports: {} };
(function(t) {
  var u = {};
  t.exports = u, u.eastAsianWidth = function(e) {
    var s = e.charCodeAt(0), C = e.length == 2 ? e.charCodeAt(1) : 0, D = s;
    return 55296 <= s && s <= 56319 && 56320 <= C && C <= 57343 && (s &= 1023, C &= 1023, D = s << 10 | C, D += 65536), D == 12288 || 65281 <= D && D <= 65376 || 65504 <= D && D <= 65510 ? "F" : D == 8361 || 65377 <= D && D <= 65470 || 65474 <= D && D <= 65479 || 65482 <= D && D <= 65487 || 65490 <= D && D <= 65495 || 65498 <= D && D <= 65500 || 65512 <= D && D <= 65518 ? "H" : 4352 <= D && D <= 4447 || 4515 <= D && D <= 4519 || 4602 <= D && D <= 4607 || 9001 <= D && D <= 9002 || 11904 <= D && D <= 11929 || 11931 <= D && D <= 12019 || 12032 <= D && D <= 12245 || 12272 <= D && D <= 12283 || 12289 <= D && D <= 12350 || 12353 <= D && D <= 12438 || 12441 <= D && D <= 12543 || 12549 <= D && D <= 12589 || 12593 <= D && D <= 12686 || 12688 <= D && D <= 12730 || 12736 <= D && D <= 12771 || 12784 <= D && D <= 12830 || 12832 <= D && D <= 12871 || 12880 <= D && D <= 13054 || 13056 <= D && D <= 19903 || 19968 <= D && D <= 42124 || 42128 <= D && D <= 42182 || 43360 <= D && D <= 43388 || 44032 <= D && D <= 55203 || 55216 <= D && D <= 55238 || 55243 <= D && D <= 55291 || 63744 <= D && D <= 64255 || 65040 <= D && D <= 65049 || 65072 <= D && D <= 65106 || 65108 <= D && D <= 65126 || 65128 <= D && D <= 65131 || 110592 <= D && D <= 110593 || 127488 <= D && D <= 127490 || 127504 <= D && D <= 127546 || 127552 <= D && D <= 127560 || 127568 <= D && D <= 127569 || 131072 <= D && D <= 194367 || 177984 <= D && D <= 196605 || 196608 <= D && D <= 262141 ? "W" : 32 <= D && D <= 126 || 162 <= D && D <= 163 || 165 <= D && D <= 166 || D == 172 || D == 175 || 10214 <= D && D <= 10221 || 10629 <= D && D <= 10630 ? "Na" : D == 161 || D == 164 || 167 <= D && D <= 168 || D == 170 || 173 <= D && D <= 174 || 176 <= D && D <= 180 || 182 <= D && D <= 186 || 188 <= D && D <= 191 || D == 198 || D == 208 || 215 <= D && D <= 216 || 222 <= D && D <= 225 || D == 230 || 232 <= D && D <= 234 || 236 <= D && D <= 237 || D == 240 || 242 <= D && D <= 243 || 247 <= D && D <= 250 || D == 252 || D == 254 || D == 257 || D == 273 || D == 275 || D == 283 || 294 <= D && D <= 295 || D == 299 || 305 <= D && D <= 307 || D == 312 || 319 <= D && D <= 322 || D == 324 || 328 <= D && D <= 331 || D == 333 || 338 <= D && D <= 339 || 358 <= D && D <= 359 || D == 363 || D == 462 || D == 464 || D == 466 || D == 468 || D == 470 || D == 472 || D == 474 || D == 476 || D == 593 || D == 609 || D == 708 || D == 711 || 713 <= D && D <= 715 || D == 717 || D == 720 || 728 <= D && D <= 731 || D == 733 || D == 735 || 768 <= D && D <= 879 || 913 <= D && D <= 929 || 931 <= D && D <= 937 || 945 <= D && D <= 961 || 963 <= D && D <= 969 || D == 1025 || 1040 <= D && D <= 1103 || D == 1105 || D == 8208 || 8211 <= D && D <= 8214 || 8216 <= D && D <= 8217 || 8220 <= D && D <= 8221 || 8224 <= D && D <= 8226 || 8228 <= D && D <= 8231 || D == 8240 || 8242 <= D && D <= 8243 || D == 8245 || D == 8251 || D == 8254 || D == 8308 || D == 8319 || 8321 <= D && D <= 8324 || D == 8364 || D == 8451 || D == 8453 || D == 8457 || D == 8467 || D == 8470 || 8481 <= D && D <= 8482 || D == 8486 || D == 8491 || 8531 <= D && D <= 8532 || 8539 <= D && D <= 8542 || 8544 <= D && D <= 8555 || 8560 <= D && D <= 8569 || D == 8585 || 8592 <= D && D <= 8601 || 8632 <= D && D <= 8633 || D == 8658 || D == 8660 || D == 8679 || D == 8704 || 8706 <= D && D <= 8707 || 8711 <= D && D <= 8712 || D == 8715 || D == 8719 || D == 8721 || D == 8725 || D == 8730 || 8733 <= D && D <= 8736 || D == 8739 || D == 8741 || 8743 <= D && D <= 8748 || D == 8750 || 8756 <= D && D <= 8759 || 8764 <= D && D <= 8765 || D == 8776 || D == 8780 || D == 8786 || 8800 <= D && D <= 8801 || 8804 <= D && D <= 8807 || 8810 <= D && D <= 8811 || 8814 <= D && D <= 8815 || 8834 <= D && D <= 8835 || 8838 <= D && D <= 8839 || D == 8853 || D == 8857 || D == 8869 || D == 8895 || D == 8978 || 9312 <= D && D <= 9449 || 9451 <= D && D <= 9547 || 9552 <= D && D <= 9587 || 9600 <= D && D <= 9615 || 9618 <= D && D <= 9621 || 9632 <= D && D <= 9633 || 9635 <= D && D <= 9641 || 9650 <= D && D <= 9651 || 9654 <= D && D <= 9655 || 9660 <= D && D <= 9661 || 9664 <= D && D <= 9665 || 9670 <= D && D <= 9672 || D == 9675 || 9678 <= D && D <= 9681 || 9698 <= D && D <= 9701 || D == 9711 || 9733 <= D && D <= 9734 || D == 9737 || 9742 <= D && D <= 9743 || 9748 <= D && D <= 9749 || D == 9756 || D == 9758 || D == 9792 || D == 9794 || 9824 <= D && D <= 9825 || 9827 <= D && D <= 9829 || 9831 <= D && D <= 9834 || 9836 <= D && D <= 9837 || D == 9839 || 9886 <= D && D <= 9887 || 9918 <= D && D <= 9919 || 9924 <= D && D <= 9933 || 9935 <= D && D <= 9953 || D == 9955 || 9960 <= D && D <= 9983 || D == 10045 || D == 10071 || 10102 <= D && D <= 10111 || 11093 <= D && D <= 11097 || 12872 <= D && D <= 12879 || 57344 <= D && D <= 63743 || 65024 <= D && D <= 65039 || D == 65533 || 127232 <= D && D <= 127242 || 127248 <= D && D <= 127277 || 127280 <= D && D <= 127337 || 127344 <= D && D <= 127386 || 917760 <= D && D <= 917999 || 983040 <= D && D <= 1048573 || 1048576 <= D && D <= 1114109 ? "A" : "N";
  }, u.characterLength = function(e) {
    var s = this.eastAsianWidth(e);
    return s == "F" || s == "W" || s == "A" ? 2 : 1;
  };
  function F(e) {
    return e.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]/g) || [];
  }
  u.length = function(e) {
    for (var s = F(e), C = 0, D = 0;D < s.length; D++)
      C = C + this.characterLength(s[D]);
    return C;
  }, u.slice = function(e, s, C) {
    textLen = u.length(e), s = s || 0, C = C || 1, s < 0 && (s = textLen + s), C < 0 && (C = textLen + C);
    for (var D = "", i = 0, n = F(e), E = 0;E < n.length; E++) {
      var h = n[E], o = u.length(h);
      if (i >= s - (o == 2 ? 1 : 0))
        if (i + o <= C)
          D += h;
        else
          break;
      i += o;
    }
    return D;
  };
})(M);
var J = M.exports;
var Q = j(J);
var X = function() {
  return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
};
var DD = j(X);
var m = 10;
var T = (t = 0) => (u) => `\x1B[${u + t}m`;
var P = (t = 0) => (u) => `\x1B[${38 + t};5;${u}m`;
var W = (t = 0) => (u, F, e) => `\x1B[${38 + t};2;${u};${F};${e}m`;
var r = { modifier: { reset: [0, 0], bold: [1, 22], dim: [2, 22], italic: [3, 23], underline: [4, 24], overline: [53, 55], inverse: [7, 27], hidden: [8, 28], strikethrough: [9, 29] }, color: { black: [30, 39], red: [31, 39], green: [32, 39], yellow: [33, 39], blue: [34, 39], magenta: [35, 39], cyan: [36, 39], white: [37, 39], blackBright: [90, 39], gray: [90, 39], grey: [90, 39], redBright: [91, 39], greenBright: [92, 39], yellowBright: [93, 39], blueBright: [94, 39], magentaBright: [95, 39], cyanBright: [96, 39], whiteBright: [97, 39] }, bgColor: { bgBlack: [40, 49], bgRed: [41, 49], bgGreen: [42, 49], bgYellow: [43, 49], bgBlue: [44, 49], bgMagenta: [45, 49], bgCyan: [46, 49], bgWhite: [47, 49], bgBlackBright: [100, 49], bgGray: [100, 49], bgGrey: [100, 49], bgRedBright: [101, 49], bgGreenBright: [102, 49], bgYellowBright: [103, 49], bgBlueBright: [104, 49], bgMagentaBright: [105, 49], bgCyanBright: [106, 49], bgWhiteBright: [107, 49] } };
Object.keys(r.modifier);
var uD = Object.keys(r.color);
var FD = Object.keys(r.bgColor);
[...uD];
var eD = tD();
var g = new Set(["\x1B", "\x9B"]);
var sD = 39;
var b = "\x07";
var O = "[";
var CD = "]";
var I = "m";
var w = `${CD}8;;`;
var N = (t) => `${g.values().next().value}${O}${t}${I}`;
var L = (t) => `${g.values().next().value}${w}${t}${b}`;
var iD = (t) => t.split(" ").map((u) => A(u));
var y = (t, u, F) => {
  const e = [...u];
  let s = false, C = false, D = A(S(t[t.length - 1]));
  for (const [i, n] of e.entries()) {
    const E = A(n);
    if (D + E <= F ? t[t.length - 1] += n : (t.push(n), D = 0), g.has(n) && (s = true, C = e.slice(i + 1).join("").startsWith(w)), s) {
      C ? n === b && (s = false, C = false) : n === I && (s = false);
      continue;
    }
    D += E, D === F && i < e.length - 1 && (t.push(""), D = 0);
  }
  !D && t[t.length - 1].length > 0 && t.length > 1 && (t[t.length - 2] += t.pop());
};
var rD = (t) => {
  const u = t.split(" ");
  let F = u.length;
  for (;F > 0 && !(A(u[F - 1]) > 0); )
    F--;
  return F === u.length ? t : u.slice(0, F).join(" ") + u.slice(F).join("");
};
var ED = (t, u, F = {}) => {
  if (F.trim !== false && t.trim() === "")
    return "";
  let e = "", s, C;
  const D = iD(t);
  let i = [""];
  for (const [E, h] of t.split(" ").entries()) {
    F.trim !== false && (i[i.length - 1] = i[i.length - 1].trimStart());
    let o = A(i[i.length - 1]);
    if (E !== 0 && (o >= u && (F.wordWrap === false || F.trim === false) && (i.push(""), o = 0), (o > 0 || F.trim === false) && (i[i.length - 1] += " ", o++)), F.hard && D[E] > u) {
      const B = u - o, p = 1 + Math.floor((D[E] - B - 1) / u);
      Math.floor((D[E] - 1) / u) < p && i.push(""), y(i, h, u);
      continue;
    }
    if (o + D[E] > u && o > 0 && D[E] > 0) {
      if (F.wordWrap === false && o < u) {
        y(i, h, u);
        continue;
      }
      i.push("");
    }
    if (o + D[E] > u && F.wordWrap === false) {
      y(i, h, u);
      continue;
    }
    i[i.length - 1] += h;
  }
  F.trim !== false && (i = i.map((E) => rD(E)));
  const n = [...i.join(`
`)];
  for (const [E, h] of n.entries()) {
    if (e += h, g.has(h)) {
      const { groups: B } = new RegExp(`(?:\\${O}(?<code>\\d+)m|\\${w}(?<uri>.*)${b})`).exec(n.slice(E).join("")) || { groups: {} };
      if (B.code !== undefined) {
        const p = Number.parseFloat(B.code);
        s = p === sD ? undefined : p;
      } else
        B.uri !== undefined && (C = B.uri.length === 0 ? undefined : B.uri);
    }
    const o = eD.codes.get(Number(s));
    n[E + 1] === `
` ? (C && (e += L("")), s && o && (e += N(o))) : h === `
` && (s && o && (e += N(s)), C && (e += L(C)));
  }
  return e;
};
var oD = Object.defineProperty;
var nD = (t, u, F) => (u in t) ? oD(t, u, { enumerable: true, configurable: true, writable: true, value: F }) : t[u] = F;
var a = (t, u, F) => (nD(t, typeof u != "symbol" ? u + "" : u, F), F);
var V = Symbol("clack:cancel");
var z = new Map([["k", "up"], ["j", "down"], ["h", "left"], ["l", "right"]]);
var lD = new Set(["up", "down", "left", "right", "space", "enter"]);

class x {
  constructor({ render: u, input: F = $, output: e = k, ...s }, C = true) {
    a(this, "input"), a(this, "output"), a(this, "rl"), a(this, "opts"), a(this, "_track", false), a(this, "_render"), a(this, "_cursor", 0), a(this, "state", "initial"), a(this, "value"), a(this, "error", ""), a(this, "subscribers", new Map), a(this, "_prevFrame", ""), this.opts = s, this.onKeypress = this.onKeypress.bind(this), this.close = this.close.bind(this), this.render = this.render.bind(this), this._render = u.bind(this), this._track = C, this.input = F, this.output = e;
  }
  prompt() {
    const u = new U(0);
    return u._write = (F, e, s) => {
      this._track && (this.value = this.rl.line.replace(/\t/g, ""), this._cursor = this.rl.cursor, this.emit("value", this.value)), s();
    }, this.input.pipe(u), this.rl = _.createInterface({ input: this.input, output: u, tabSize: 2, prompt: "", escapeCodeTimeout: 50 }), _.emitKeypressEvents(this.input, this.rl), this.rl.prompt(), this.opts.initialValue !== undefined && this._track && this.rl.write(this.opts.initialValue), this.input.on("keypress", this.onKeypress), v(this.input, true), this.output.on("resize", this.render), this.render(), new Promise((F, e) => {
      this.once("submit", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), v(this.input, false), F(this.value);
      }), this.once("cancel", () => {
        this.output.write(import_sisteransi.cursor.show), this.output.off("resize", this.render), v(this.input, false), F(V);
      });
    });
  }
  on(u, F) {
    const e = this.subscribers.get(u) ?? [];
    e.push({ cb: F }), this.subscribers.set(u, e);
  }
  once(u, F) {
    const e = this.subscribers.get(u) ?? [];
    e.push({ cb: F, once: true }), this.subscribers.set(u, e);
  }
  emit(u, ...F) {
    const e = this.subscribers.get(u) ?? [], s = [];
    for (const C of e)
      C.cb(...F), C.once && s.push(() => e.splice(e.indexOf(C), 1));
    for (const C of s)
      C();
  }
  unsubscribe() {
    this.subscribers.clear();
  }
  onKeypress(u, F) {
    if (this.state === "error" && (this.state = "active"), F?.name && !this._track && z.has(F.name) && this.emit("cursor", z.get(F.name)), F?.name && lD.has(F.name) && this.emit("cursor", F.name), u && (u.toLowerCase() === "y" || u.toLowerCase() === "n") && this.emit("confirm", u.toLowerCase() === "y"), u === "	" && this.opts.placeholder && (this.value || (this.rl.write(this.opts.placeholder), this.emit("value", this.opts.placeholder))), u && this.emit("key", u.toLowerCase()), F?.name === "return") {
      if (this.opts.validate) {
        const e = this.opts.validate(this.value);
        e && (this.error = e, this.state = "error", this.rl.write(this.value));
      }
      this.state !== "error" && (this.state = "submit");
    }
    u === "" && (this.state = "cancel"), (this.state === "submit" || this.state === "cancel") && this.emit("finalize"), this.render(), (this.state === "submit" || this.state === "cancel") && this.close();
  }
  close() {
    this.input.unpipe(), this.input.removeListener("keypress", this.onKeypress), this.output.write(`
`), v(this.input, false), this.rl.close(), this.emit(`${this.state}`, this.value), this.unsubscribe();
  }
  restoreCursor() {
    const u = R(this._prevFrame, process.stdout.columns, { hard: true }).split(`
`).length - 1;
    this.output.write(import_sisteransi.cursor.move(-999, u * -1));
  }
  render() {
    const u = R(this._render(this) ?? "", process.stdout.columns, { hard: true });
    if (u !== this._prevFrame) {
      if (this.state === "initial")
        this.output.write(import_sisteransi.cursor.hide);
      else {
        const F = aD(this._prevFrame, u);
        if (this.restoreCursor(), F && F?.length === 1) {
          const e = F[0];
          this.output.write(import_sisteransi.cursor.move(0, e)), this.output.write(import_sisteransi.erase.lines(1));
          const s = u.split(`
`);
          this.output.write(s[e]), this._prevFrame = u, this.output.write(import_sisteransi.cursor.move(0, s.length - e - 1));
          return;
        } else if (F && F?.length > 1) {
          const e = F[0];
          this.output.write(import_sisteransi.cursor.move(0, e)), this.output.write(import_sisteransi.erase.down());
          const s = u.split(`
`).slice(e);
          this.output.write(s.join(`
`)), this._prevFrame = u;
          return;
        }
        this.output.write(import_sisteransi.erase.down());
      }
      this.output.write(u), this.state === "initial" && (this.state = "active"), this._prevFrame = u;
    }
  }
}
var vD = Object.defineProperty;
var dD = (t, u, F) => (u in t) ? vD(t, u, { enumerable: true, configurable: true, writable: true, value: F }) : t[u] = F;
var Y = (t, u, F) => (dD(t, typeof u != "symbol" ? u + "" : u, F), F);

class mD extends x {
  constructor({ mask: u, ...F }) {
    super(F), Y(this, "valueWithCursor", ""), Y(this, "_mask", "\u2022"), this._mask = u ?? "\u2022", this.on("finalize", () => {
      this.valueWithCursor = this.masked;
    }), this.on("value", () => {
      if (this.cursor >= this.value.length)
        this.valueWithCursor = `${this.masked}${import_picocolors.default.inverse(import_picocolors.default.hidden("_"))}`;
      else {
        const e = this.masked.slice(0, this.cursor), s = this.masked.slice(this.cursor);
        this.valueWithCursor = `${e}${import_picocolors.default.inverse(s[0])}${s.slice(1)}`;
      }
    });
  }
  get cursor() {
    return this._cursor;
  }
  get masked() {
    return this.value.replaceAll(/./g, this._mask);
  }
}
var bD = Object.defineProperty;
var wD = (t, u, F) => (u in t) ? bD(t, u, { enumerable: true, configurable: true, writable: true, value: F }) : t[u] = F;
var Z = (t, u, F) => (wD(t, typeof u != "symbol" ? u + "" : u, F), F);
var yD = class extends x {
  constructor(u) {
    super(u, false), Z(this, "options"), Z(this, "cursor", 0), this.options = u.options, this.cursor = this.options.findIndex(({ value: F }) => F === u.initialValue), this.cursor === -1 && (this.cursor = 0), this.changeValue(), this.on("cursor", (F) => {
      switch (F) {
        case "left":
        case "up":
          this.cursor = this.cursor === 0 ? this.options.length - 1 : this.cursor - 1;
          break;
        case "down":
        case "right":
          this.cursor = this.cursor === this.options.length - 1 ? 0 : this.cursor + 1;
          break;
      }
      this.changeValue();
    });
  }
  get _value() {
    return this.options[this.cursor];
  }
  changeValue() {
    this.value = this._value.value;
  }
};
var SD = Object.defineProperty;
var jD = (t, u, F) => (u in t) ? SD(t, u, { enumerable: true, configurable: true, writable: true, value: F }) : t[u] = F;
var MD = (t, u, F) => (jD(t, typeof u != "symbol" ? u + "" : u, F), F);

class TD extends x {
  constructor(u) {
    super(u), MD(this, "valueWithCursor", ""), this.on("finalize", () => {
      this.value || (this.value = u.defaultValue), this.valueWithCursor = this.value;
    }), this.on("value", () => {
      if (this.cursor >= this.value.length)
        this.valueWithCursor = `${this.value}${import_picocolors.default.inverse(import_picocolors.default.hidden("_"))}`;
      else {
        const F = this.value.slice(0, this.cursor), e = this.value.slice(this.cursor);
        this.valueWithCursor = `${F}${import_picocolors.default.inverse(e[0])}${e.slice(1)}`;
      }
    });
  }
  get cursor() {
    return this._cursor;
  }
}
var PD = globalThis.process.platform.startsWith("win");

// node_modules/@clack/prompts/dist/index.mjs
var import_picocolors2 = __toESM(require_picocolors(), 1);
var import_sisteransi2 = __toESM(require_src(), 1);
import h from "process";
function q2() {
  return h.platform !== "win32" ? h.env.TERM !== "linux" : Boolean(h.env.CI) || Boolean(h.env.WT_SESSION) || Boolean(h.env.TERMINUS_SUBLIME) || h.env.ConEmuTask === "{cmd::Cmder}" || h.env.TERM_PROGRAM === "Terminus-Sublime" || h.env.TERM_PROGRAM === "vscode" || h.env.TERM === "xterm-256color" || h.env.TERM === "alacritty" || h.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
var _2 = q2();
var o = (r2, n) => _2 ? r2 : n;
var H = o("\u25C6", "*");
var I2 = o("\u25A0", "x");
var x2 = o("\u25B2", "x");
var S2 = o("\u25C7", "o");
var K = o("\u250C", "T");
var a2 = o("\u2502", "|");
var d2 = o("\u2514", "\u2014");
var b2 = o("\u25CF", ">");
var E = o("\u25CB", " ");
var C = o("\u25FB", "[\u2022]");
var w2 = o("\u25FC", "[+]");
var M2 = o("\u25FB", "[ ]");
var U2 = o("\u25AA", "\u2022");
var B = o("\u2500", "-");
var Z2 = o("\u256E", "+");
var z2 = o("\u251C", "+");
var X2 = o("\u256F", "+");
var J2 = o("\u25CF", "\u2022");
var Y2 = o("\u25C6", "*");
var Q2 = o("\u25B2", "!");
var ee = o("\u25A0", "x");
var y2 = (r2) => {
  switch (r2) {
    case "initial":
    case "active":
      return import_picocolors2.default.cyan(H);
    case "cancel":
      return import_picocolors2.default.red(I2);
    case "error":
      return import_picocolors2.default.yellow(x2);
    case "submit":
      return import_picocolors2.default.green(S2);
  }
};
var te = (r2) => new TD({ validate: r2.validate, placeholder: r2.placeholder, defaultValue: r2.defaultValue, initialValue: r2.initialValue, render() {
  const n = `${import_picocolors2.default.gray(a2)}
${y2(this.state)}  ${r2.message}
`, i = r2.placeholder ? import_picocolors2.default.inverse(r2.placeholder[0]) + import_picocolors2.default.dim(r2.placeholder.slice(1)) : import_picocolors2.default.inverse(import_picocolors2.default.hidden("_")), t = this.value ? this.valueWithCursor : i;
  switch (this.state) {
    case "error":
      return `${n.trim()}
${import_picocolors2.default.yellow(a2)}  ${t}
${import_picocolors2.default.yellow(d2)}  ${import_picocolors2.default.yellow(this.error)}
`;
    case "submit":
      return `${n}${import_picocolors2.default.gray(a2)}  ${import_picocolors2.default.dim(this.value || r2.placeholder)}`;
    case "cancel":
      return `${n}${import_picocolors2.default.gray(a2)}  ${import_picocolors2.default.strikethrough(import_picocolors2.default.dim(this.value ?? ""))}${this.value?.trim() ? `
` + import_picocolors2.default.gray(a2) : ""}`;
    default:
      return `${n}${import_picocolors2.default.cyan(a2)}  ${t}
${import_picocolors2.default.cyan(d2)}
`;
  }
} }).prompt();
var re = (r2) => new mD({ validate: r2.validate, mask: r2.mask ?? U2, render() {
  const n = `${import_picocolors2.default.gray(a2)}
${y2(this.state)}  ${r2.message}
`, i = this.valueWithCursor, t = this.masked;
  switch (this.state) {
    case "error":
      return `${n.trim()}
${import_picocolors2.default.yellow(a2)}  ${t}
${import_picocolors2.default.yellow(d2)}  ${import_picocolors2.default.yellow(this.error)}
`;
    case "submit":
      return `${n}${import_picocolors2.default.gray(a2)}  ${import_picocolors2.default.dim(t)}`;
    case "cancel":
      return `${n}${import_picocolors2.default.gray(a2)}  ${import_picocolors2.default.strikethrough(import_picocolors2.default.dim(t ?? ""))}${t ? `
` + import_picocolors2.default.gray(a2) : ""}`;
    default:
      return `${n}${import_picocolors2.default.cyan(a2)}  ${i}
${import_picocolors2.default.cyan(d2)}
`;
  }
} }).prompt();
var ie = (r2) => {
  const n = (t, s) => {
    const c2 = t.label ?? String(t.value);
    return s === "active" ? `${import_picocolors2.default.green(b2)} ${c2} ${t.hint ? import_picocolors2.default.dim(`(${t.hint})`) : ""}` : s === "selected" ? `${import_picocolors2.default.dim(c2)}` : s === "cancelled" ? `${import_picocolors2.default.strikethrough(import_picocolors2.default.dim(c2))}` : `${import_picocolors2.default.dim(E)} ${import_picocolors2.default.dim(c2)}`;
  };
  let i = 0;
  return new yD({ options: r2.options, initialValue: r2.initialValue, render() {
    const t = `${import_picocolors2.default.gray(a2)}
${y2(this.state)}  ${r2.message}
`;
    switch (this.state) {
      case "submit":
        return `${t}${import_picocolors2.default.gray(a2)}  ${n(this.options[this.cursor], "selected")}`;
      case "cancel":
        return `${t}${import_picocolors2.default.gray(a2)}  ${n(this.options[this.cursor], "cancelled")}
${import_picocolors2.default.gray(a2)}`;
      default: {
        const s = r2.maxItems === undefined ? 1 / 0 : Math.max(r2.maxItems, 5);
        this.cursor >= i + s - 3 ? i = Math.max(Math.min(this.cursor - s + 3, this.options.length - s), 0) : this.cursor < i + 2 && (i = Math.max(this.cursor - 2, 0));
        const c2 = s < this.options.length && i > 0, l2 = s < this.options.length && i + s < this.options.length;
        return `${t}${import_picocolors2.default.cyan(a2)}  ${this.options.slice(i, i + s).map((u, m2, $2) => m2 === 0 && c2 ? import_picocolors2.default.dim("...") : m2 === $2.length - 1 && l2 ? import_picocolors2.default.dim("...") : n(u, m2 + i === this.cursor ? "active" : "inactive")).join(`
${import_picocolors2.default.cyan(a2)}  `)}
${import_picocolors2.default.cyan(d2)}
`;
      }
    }
  } }).prompt();
};
var ue = (r2 = "") => {
  process.stdout.write(`${import_picocolors2.default.gray(d2)}  ${import_picocolors2.default.red(r2)}

`);
};
var oe = (r2 = "") => {
  process.stdout.write(`${import_picocolors2.default.gray(K)}  ${r2}
`);
};
var $e = (r2 = "") => {
  process.stdout.write(`${import_picocolors2.default.gray(a2)}
${import_picocolors2.default.gray(d2)}  ${r2}

`);
};

// configurator.ts
var import_picocolors3 = __toESM(require_picocolors(), 1);
import {parseArgs} from "util";
async function askMissingData(missingData) {
  if (Object.keys(missingData).length === 0) {
    $e("Configuration set from ops");
    process.exit(0);
  }
  console.log();
  console.log("Configuration partially set from ops. Need a few more:");
  const inputConfigs = {};
  for (const key in missingData) {
    const prompt = missingData[key];
    if (Array.isArray(prompt.type)) {
      const selected = await ie({
        message: `Pick a value for '${key}'`,
        options: prompt.type.map((v2) => ({ label: v2, value: v2 }))
      });
      if (!selected) {
        ue("Operation cancelled");
        process.exit(0);
      }
      inputConfigs[key] = { ...prompt, value: selected.toString() };
    } else if (prompt.type === "bool") {
      const selected = await ie({
        message: `Pick a true/false for '${key}'`,
        options: [
          { label: "true", value: "true" },
          { label: "false", value: "false" }
        ]
      });
      if (!selected) {
        ue("Operation cancelled");
        process.exit(0);
      }
      inputConfigs[key] = { ...prompt, value: selected.toString() };
    } else if (prompt.type === "password") {
      const input = await re({
        message: `Enter password value for ${key}`
      });
      if (hD(input)) {
        ue("Operation cancelled");
        process.exit(0);
      }
      inputConfigs[key] = { ...prompt, value: input };
    } else {
      const input = await te({
        message: `Enter value for ${key} (${prompt.type})`
      });
      if (hD(input)) {
        ue("Operation cancelled");
        process.exit(0);
      }
      switch (prompt.type) {
        case "int":
          if (!Number.isInteger(Number(input))) {
            ue(`Value for ${key} must be an integer`);
            process.exit(1);
          }
          break;
        case "float":
          if (!Number(input)) {
            ue(`Value for ${key} must be a float`);
            process.exit(1);
          }
          break;
      }
      inputConfigs[key] = { ...prompt, value: input };
    }
  }
  return inputConfigs;
}
function findMissingConfig(config, opsConfig) {
  let newConfig = {};
  let opsConfigKeys = opsConfig.split("\n").map((line) => line.split("=")[0]);
  for (const key in config) {
    if (opsConfigKeys.includes(key)) {
      continue;
    }
    newConfig[key] = config[key];
  }
  return newConfig;
}
function readPositionalFile(positionals) {
  if (positionals.length < 2) {
    console.error("This should not happen");
    return { success: false, message: "This should not happen" };
  }
  if (positionals.length === 2) {
    return { success: true, help: HelpMsg };
  }
  if (positionals.length > 3) {
    return {
      success: true,
      message: AdditionalArgsMsg,
      jsonFilePath: positionals[2]
    };
  }
  return { success: true, jsonFilePath: positionals[2] };
}
async function parsePositionalFile(path) {
  const file = Bun.file(Bun.pathToFileURL(path));
  try {
    const contents = await file.json();
    return { success: true, body: contents };
  } catch (error) {
    return { success: false, message: NotValidJsonMsg };
  }
}
function validateConfigJson(body) {
  if (Object.keys(body).length === 0) {
    return { success: false, message: BadConfigMsg };
  }
  for (const key in body) {
    const value = body[key];
    if (typeof value !== "object") {
      return { success: false, message: BadConfigMsg };
    }
    if (!value.type) {
      return { success: false, message: BadConfigMsg };
    }
    if (!["string", "int", "float", "bool", "password"].includes(value.type) && !Array.isArray(value.type)) {
      return { success: false, message: BadConfigMsg };
    }
  }
  for (const key in body) {
    if (!/^[A-Z][A-Z_]*[A-Z]$/.test(key)) {
      return { success: false, message: BadConfigMsg };
    }
  }
  return { success: true };
}
var OPS_CMD = process.env.OPS_CMD || "ops";
var AdditionalArgsMsg = "Additional arguments will be ignored.";
var NotValidJsonMsg = "Not a valid JSON file";
var BadConfigMsg = `Bad configuration file. 

The configuration file must be an non-empty JSON with the following structure:
    
{
  "KEY": {
    type: "string"
  },
  "OTHER_KEY": {
    type: "int"
  },
  ...
} 

The keys must be uppercase words (separated by underscores).
The value for the "type" key must be either string with the following values:
- string
- int
- float
- bool
- password

or an array of strings with specific values (an enum).
`;
var HelpMsg = `
Usage: config <configjson>

Description:
Prompt the user for configuration data defined in the config.json file. 
From the input config, the script will remove the keys that are already set in ops,
and only prompt the user for the missing data. Then they will be saved in the ops config.

The config.json file must be a JSON file with the following structure:
      
  {
    "KEY": {
      type: "string"
    },
    "OTHER_KEY": {
      type: "int"
    },
    ...
  }

The keys must be uppercase words (separated by underscores).
The value for the "type" key must be either string with the following values:
- string
- int
- float
- bool
- password

or an array of strings with specific values (an enum).`;
async function main() {
  const { positionals } = parseArgs({
    args: Bun.argv,
    strict: true,
    allowPositionals: true
  });
  const readPosRes = readPositionalFile(positionals);
  if (!readPosRes.success) {
    ue(readPosRes.message);
    return process.exit(1);
  }
  if (readPosRes.help) {
    console.log(readPosRes.help);
    return process.exit(0);
  }
  if (readPosRes.message) {
    console.warn(readPosRes.message);
  }
  const jsonRes = await parsePositionalFile(readPosRes.jsonFilePath);
  if (!jsonRes.success) {
    ue(jsonRes.message);
    return process.exit(1);
  }
  const config = jsonRes.body;
  const validationRes = validateConfigJson(config);
  if (!validationRes.success) {
    ue(validationRes.message);
    return process.exit(1);
  }
  const { exitCode, stderr, stdout } = await $2`${OPS_CMD} -config -d`.nothrow();
  if (exitCode !== 0) {
    ue(stderr.toString());
    return process.exit(1);
  }
  const opsConfig = stdout.toString();
  const missingData = findMissingConfig(config, opsConfig);
  console.log();
  oe(import_picocolors3.default.inverse(" ops configurator "));
  const inputConfigs = await askMissingData(missingData);
  console.log();
  const configStr = Object.entries(inputConfigs).map(([key, value]) => `${key}="${value.value}"`).join(" ");
  await $2`${OPS_CMD} -config ${configStr}`;
  $e("You're all set!");
}

// index.ts
main().catch(console.error);
