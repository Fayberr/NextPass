var An = Object.defineProperty;
var Nn = (c, b, v) => b in c ? An(c, b, { enumerable: !0, configurable: !0, writable: !0, value: v }) : c[b] = v;
var oe = (c, b, v) => Nn(c, typeof b != "symbol" ? b + "" : b, v);
import { app as se, BrowserWindow as _r, globalShortcut as St, ipcMain as ae, shell as kr } from "electron";
import G from "node:fs";
import vr from "node:os";
import I from "node:path";
import Er from "node:crypto";
import { execFile as Sr } from "node:child_process";
import { fileURLToPath as Mn } from "node:url";
import Rn from "node:http";
function Pn(c) {
  return c && c.__esModule && Object.prototype.hasOwnProperty.call(c, "default") ? c.default : c;
}
var qr = { exports: {} };
(function(c, b) {
  var v = void 0, P = function(T) {
    return v || (v = new Promise(function(B, z) {
      var or, sr, ar, ur, lr;
      var O = typeof T < "u" ? T : {}, ue = O.onAbort;
      O.onAbort = function(e) {
        z(new Error(e)), ue && ue(e);
      }, O.postRun = O.postRun || [], O.postRun.push(function() {
        B(O);
      }), c = void 0;
      var a;
      a || (a = typeof O < "u" ? O : {});
      var N = !!globalThis.window, X = !!globalThis.WorkerGlobalScope, J = ((sr = (or = globalThis.process) == null ? void 0 : or.versions) == null ? void 0 : sr.node) && ((ar = globalThis.process) == null ? void 0 : ar.type) != "renderer";
      a.onRuntimeInitialized = function() {
        function e(o, l) {
          switch (typeof l) {
            case "boolean":
              Sn(o, l ? 1 : 0);
              break;
            case "number":
              _n(o, l);
              break;
            case "string":
              kn(o, l, -1, -1);
              break;
            case "object":
              if (l === null) dr(o);
              else if (l.length != null) {
                var h = He(l.length);
                R.set(l, h), En(o, h, l.length, -1), Oe(h);
              } else Je(o, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
              break;
            default:
              dr(o);
          }
        }
        function t(o, l) {
          for (var h = [], p = 0; p < o; p += 1) {
            var w = Z(l + 4 * p, "i32"), k = yn(w);
            if (k === 1 || k === 2) w = gn(w);
            else if (k === 3) w = wn(w);
            else if (k === 4) {
              k = w, w = bn(k), k = vn(k);
              for (var W = new Uint8Array(w), F = 0; F < w; F += 1) W[F] = R[k + F];
              w = W;
            } else w = null;
            h.push(w);
          }
          return h;
        }
        function r(o, l) {
          this.Qa = o, this.db = l, this.Oa = 1, this.mb = [];
        }
        function n(o, l) {
          if (this.db = l, this.fb = Ve(o), this.fb === null) throw Error("Unable to allocate memory for the SQL string");
          this.lb = this.fb, this.$a = this.sb = null;
        }
        function i(o) {
          if (this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0), o != null) {
            var l = this.filename, h = "/", p = l;
            if (h && (h = typeof h == "string" ? h : ft(h), p = l ? at(h + "/" + l) : h), l = It(!0, !0), p = Qr(
              p,
              l
            ), o) {
              if (typeof o == "string") {
                h = Array(o.length);
                for (var w = 0, k = o.length; w < k; ++w) h[w] = o.charCodeAt(w);
                o = h;
              }
              Fe(p, l | 146), h = Se(p, 577), Zt(h, o, 0, o.length, 0), yt(h), Fe(p, l);
            }
          }
          this.handleError(m(this.filename, s)), this.db = Z(s, "i32"), br(this.db), this.gb = {}, this.Sa = {};
        }
        var s = be(4), u = a.cwrap, m = u("sqlite3_open", "number", ["string", "number"]), _ = u("sqlite3_close_v2", "number", ["number"]), y = u("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), q = u("sqlite3_changes", "number", ["number"]), x = u(
          "sqlite3_prepare_v2",
          "number",
          ["number", "string", "number", "number", "number"]
        ), fr = u("sqlite3_sql", "string", ["number"]), Zr = u("sqlite3_normalized_sql", "string", ["number"]), hr = u("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), Kr = u("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), cr = u("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), en = u("sqlite3_bind_double", "number", ["number", "number", "number"]), tn = u("sqlite3_bind_int", "number", [
          "number",
          "number",
          "number"
        ]), rn = u("sqlite3_bind_parameter_index", "number", ["number", "string"]), nn = u("sqlite3_step", "number", ["number"]), on = u("sqlite3_errmsg", "string", ["number"]), sn = u("sqlite3_column_count", "number", ["number"]), an = u("sqlite3_data_count", "number", ["number"]), un = u("sqlite3_column_double", "number", ["number", "number"]), pr = u("sqlite3_column_text", "string", ["number", "number"]), ln = u("sqlite3_column_blob", "number", ["number", "number"]), fn = u("sqlite3_column_bytes", "number", ["number", "number"]), hn = u(
          "sqlite3_column_type",
          "number",
          ["number", "number"]
        ), cn = u("sqlite3_column_name", "string", ["number", "number"]), pn = u("sqlite3_reset", "number", ["number"]), mn = u("sqlite3_clear_bindings", "number", ["number"]), dn = u("sqlite3_finalize", "number", ["number"]), mr = u("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), yn = u("sqlite3_value_type", "number", ["number"]), bn = u("sqlite3_value_bytes", "number", ["number"]), wn = u("sqlite3_value_text", "string", ["number"]), vn = u(
          "sqlite3_value_blob",
          "number",
          ["number"]
        ), gn = u("sqlite3_value_double", "number", ["number"]), _n = u("sqlite3_result_double", "", ["number", "number"]), dr = u("sqlite3_result_null", "", ["number"]), kn = u("sqlite3_result_text", "", ["number", "string", "number", "number"]), En = u("sqlite3_result_blob", "", ["number", "number", "number", "number"]), Sn = u("sqlite3_result_int", "", ["number", "number"]), Je = u("sqlite3_result_error", "", ["number", "string", "number"]), yr = u("sqlite3_aggregate_context", "number", ["number", "number"]), br = u(
          "RegisterExtensionFunctions",
          "number",
          ["number"]
        ), wr = u("sqlite3_update_hook", "number", ["number", "number", "number"]);
        r.prototype.bind = function(o) {
          if (!this.Qa) throw "Statement closed";
          return this.reset(), Array.isArray(o) ? this.Gb(o) : o != null && typeof o == "object" ? this.Hb(o) : !0;
        }, r.prototype.step = function() {
          if (!this.Qa) throw "Statement closed";
          this.Oa = 1;
          var o = nn(this.Qa);
          switch (o) {
            case 100:
              return !0;
            case 101:
              return !1;
            default:
              throw this.db.handleError(o);
          }
        }, r.prototype.Ab = function(o) {
          return o == null && (o = this.Oa, this.Oa += 1), un(this.Qa, o);
        }, r.prototype.Ob = function(o) {
          if (o == null && (o = this.Oa, this.Oa += 1), o = pr(this.Qa, o), typeof BigInt != "function") throw Error("BigInt is not supported");
          return BigInt(o);
        }, r.prototype.Tb = function(o) {
          return o == null && (o = this.Oa, this.Oa += 1), pr(this.Qa, o);
        }, r.prototype.getBlob = function(o) {
          o == null && (o = this.Oa, this.Oa += 1);
          var l = fn(this.Qa, o);
          o = ln(this.Qa, o);
          for (var h = new Uint8Array(l), p = 0; p < l; p += 1) h[p] = R[o + p];
          return h;
        }, r.prototype.get = function(o, l) {
          l = l || {}, o != null && this.bind(o) && this.step(), o = [];
          for (var h = an(this.Qa), p = 0; p < h; p += 1) switch (hn(this.Qa, p)) {
            case 1:
              var w = l.useBigInt ? this.Ob(p) : this.Ab(p);
              o.push(w);
              break;
            case 2:
              o.push(this.Ab(p));
              break;
            case 3:
              o.push(this.Tb(p));
              break;
            case 4:
              o.push(this.getBlob(p));
              break;
            default:
              o.push(null);
          }
          return o;
        }, r.prototype.qb = function() {
          for (var o = [], l = sn(this.Qa), h = 0; h < l; h += 1) o.push(cn(this.Qa, h));
          return o;
        }, r.prototype.zb = function(o, l) {
          o = this.get(o, l), l = this.qb();
          for (var h = {}, p = 0; p < l.length; p += 1) h[l[p]] = o[p];
          return h;
        }, r.prototype.Sb = function() {
          return fr(this.Qa);
        }, r.prototype.Pb = function() {
          return Zr(this.Qa);
        }, r.prototype.run = function(o) {
          return o != null && this.bind(o), this.step(), this.reset();
        }, r.prototype.wb = function(o, l) {
          l == null && (l = this.Oa, this.Oa += 1), o = Ve(o), this.mb.push(o), this.db.handleError(Kr(this.Qa, l, o, -1, 0));
        }, r.prototype.Fb = function(o, l) {
          l == null && (l = this.Oa, this.Oa += 1);
          var h = He(o.length);
          R.set(o, h), this.mb.push(h), this.db.handleError(cr(this.Qa, l, h, o.length, 0));
        }, r.prototype.vb = function(o, l) {
          l == null && (l = this.Oa, this.Oa += 1), this.db.handleError((o === (o | 0) ? tn : en)(
            this.Qa,
            l,
            o
          ));
        }, r.prototype.Ib = function(o) {
          o == null && (o = this.Oa, this.Oa += 1), cr(this.Qa, o, 0, 0, 0);
        }, r.prototype.xb = function(o, l) {
          switch (l == null && (l = this.Oa, this.Oa += 1), typeof o) {
            case "string":
              this.wb(o, l);
              return;
            case "number":
              this.vb(o, l);
              return;
            case "bigint":
              this.wb(o.toString(), l);
              return;
            case "boolean":
              this.vb(o + 0, l);
              return;
            case "object":
              if (o === null) {
                this.Ib(l);
                return;
              }
              if (o.length != null) {
                this.Fb(o, l);
                return;
              }
          }
          throw "Wrong API use : tried to bind a value of an unknown type (" + o + ").";
        }, r.prototype.Hb = function(o) {
          var l = this;
          return Object.keys(o).forEach(function(h) {
            var p = rn(l.Qa, h);
            p !== 0 && l.xb(o[h], p);
          }), !0;
        }, r.prototype.Gb = function(o) {
          for (var l = 0; l < o.length; l += 1) this.xb(o[l], l + 1);
          return !0;
        }, r.prototype.reset = function() {
          return this.freemem(), mn(this.Qa) === 0 && pn(this.Qa) === 0;
        }, r.prototype.freemem = function() {
          for (var o; (o = this.mb.pop()) !== void 0; ) Oe(o);
        }, r.prototype.Ya = function() {
          this.freemem();
          var o = dn(this.Qa) === 0;
          return delete this.db.gb[this.Qa], this.Qa = 0, o;
        }, n.prototype.next = function() {
          if (this.fb === null) return { done: !0 };
          if (this.$a !== null && (this.$a.Ya(), this.$a = null), !this.db.db) throw this.ob(), Error("Database closed");
          var o = Ge(), l = be(4);
          Re(s), Re(l);
          try {
            this.db.handleError(hr(this.db.db, this.lb, -1, s, l)), this.lb = Z(l, "i32");
            var h = Z(s, "i32");
            return h === 0 ? (this.ob(), { done: !0 }) : (this.$a = new r(h, this.db), this.db.gb[h] = this.$a, { value: this.$a, done: !1 });
          } catch (p) {
            throw this.sb = M(this.lb), this.ob(), p;
          } finally {
            Ye(o);
          }
        }, n.prototype.ob = function() {
          Oe(this.fb), this.fb = null;
        }, n.prototype.Qb = function() {
          return this.sb !== null ? this.sb : M(this.lb);
        }, typeof Symbol == "function" && typeof Symbol.iterator == "symbol" && (n.prototype[Symbol.iterator] = function() {
          return this;
        }), i.prototype.run = function(o, l) {
          if (!this.db) throw "Database closed";
          if (l) {
            o = this.tb(o, l);
            try {
              o.step();
            } finally {
              o.Ya();
            }
          } else this.handleError(y(this.db, o, 0, 0, s));
          return this;
        }, i.prototype.exec = function(o, l, h) {
          if (!this.db) throw "Database closed";
          var p = null, w = null, k = null;
          try {
            k = w = Ve(o);
            var W = be(4);
            for (o = []; Z(k, "i8") !== 0; ) {
              Re(s), Re(W), this.handleError(hr(this.db, k, -1, s, W));
              var F = Z(
                s,
                "i32"
              );
              if (k = Z(W, "i32"), F !== 0) {
                var $ = null;
                for (p = new r(F, this), l != null && p.bind(l); p.step(); ) $ === null && ($ = { columns: p.qb(), values: [] }, o.push($)), $.values.push(p.get(null, h));
                p.Ya();
              }
            }
            return o;
          } catch (V) {
            throw p && p.Ya(), V;
          } finally {
            w && Oe(w);
          }
        }, i.prototype.Mb = function(o, l, h, p, w) {
          typeof l == "function" && (p = h, h = l, l = void 0), o = this.tb(o, l);
          try {
            for (; o.step(); ) h(o.zb(null, w));
          } finally {
            o.Ya();
          }
          if (typeof p == "function") return p();
        }, i.prototype.tb = function(o, l) {
          if (Re(s), this.handleError(x(this.db, o, -1, s, 0)), o = Z(s, "i32"), o === 0) throw "Nothing to prepare";
          var h = new r(o, this);
          return l != null && h.bind(l), this.gb[o] = h;
        }, i.prototype.Ub = function(o) {
          return new n(o, this);
        }, i.prototype.Nb = function() {
          Object.values(this.gb).forEach(function(l) {
            l.Ya();
          }), Object.values(this.Sa).forEach(ne), this.Sa = {}, this.handleError(_(this.db));
          var o = Wr(this.filename);
          return this.handleError(m(this.filename, s)), this.db = Z(s, "i32"), br(this.db), o;
        }, i.prototype.close = function() {
          this.db !== null && (Object.values(this.gb).forEach(function(o) {
            o.Ya();
          }), Object.values(this.Sa).forEach(ne), this.Sa = {}, this.Za && (ne(this.Za), this.Za = void 0), this.handleError(_(this.db)), Ht("/" + this.filename), this.db = null);
        }, i.prototype.handleError = function(o) {
          if (o === 0) return null;
          throw o = on(this.db), Error(o);
        }, i.prototype.Rb = function() {
          return q(this.db);
        }, i.prototype.Kb = function(o, l) {
          Object.prototype.hasOwnProperty.call(this.Sa, o) && (ne(this.Sa[o]), delete this.Sa[o]);
          var h = xe(function(p, w, k) {
            w = t(w, k);
            try {
              var W = l.apply(null, w);
            } catch (F) {
              Je(p, F, -1);
              return;
            }
            e(p, W);
          }, "viii");
          return this.Sa[o] = h, this.handleError(mr(
            this.db,
            o,
            l.length,
            1,
            0,
            h,
            0,
            0,
            0
          )), this;
        }, i.prototype.Jb = function(o, l) {
          var h = l.init || function() {
            return null;
          }, p = l.finalize || function($) {
            return $;
          }, w = l.step;
          if (!w) throw "An aggregate function must have a step function in " + o;
          var k = {};
          Object.hasOwnProperty.call(this.Sa, o) && (ne(this.Sa[o]), delete this.Sa[o]), l = o + "__finalize", Object.hasOwnProperty.call(this.Sa, l) && (ne(this.Sa[l]), delete this.Sa[l]);
          var W = xe(function($, V, Et) {
            var we = yr($, 1);
            Object.hasOwnProperty.call(k, we) || (k[we] = h()), V = t(V, Et), V = [k[we]].concat(V);
            try {
              k[we] = w.apply(null, V);
            } catch (qn) {
              delete k[we], Je($, qn, -1);
            }
          }, "viii"), F = xe(function($) {
            var V = yr($, 1);
            try {
              var Et = p(k[V]);
            } catch (we) {
              delete k[V], Je($, we, -1);
              return;
            }
            e($, Et), delete k[V];
          }, "vi");
          return this.Sa[o] = W, this.Sa[l] = F, this.handleError(mr(this.db, o, w.length - 1, 1, 0, 0, W, F, 0)), this;
        }, i.prototype.Zb = function(o) {
          return this.Za && (wr(this.db, 0, 0), ne(this.Za), this.Za = void 0), o ? (this.Za = xe(function(l, h, p, w, k) {
            switch (h) {
              case 18:
                l = "insert";
                break;
              case 23:
                l = "update";
                break;
              case 9:
                l = "delete";
                break;
              default:
                throw "unknown operationCode in updateHook callback: " + h;
            }
            if (p = M(p), w = M(w), k > Number.MAX_SAFE_INTEGER) throw "rowId too big to fit inside a Number";
            o(l, p, w, Number(k));
          }, "viiiij"), wr(this.db, this.Za, 0), this) : this;
        }, r.prototype.bind = r.prototype.bind, r.prototype.step = r.prototype.step, r.prototype.get = r.prototype.get, r.prototype.getColumnNames = r.prototype.qb, r.prototype.getAsObject = r.prototype.zb, r.prototype.getSQL = r.prototype.Sb, r.prototype.getNormalizedSQL = r.prototype.Pb, r.prototype.run = r.prototype.run, r.prototype.reset = r.prototype.reset, r.prototype.freemem = r.prototype.freemem, r.prototype.free = r.prototype.Ya, n.prototype.next = n.prototype.next, n.prototype.getRemainingSQL = n.prototype.Qb, i.prototype.run = i.prototype.run, i.prototype.exec = i.prototype.exec, i.prototype.each = i.prototype.Mb, i.prototype.prepare = i.prototype.tb, i.prototype.iterateStatements = i.prototype.Ub, i.prototype.export = i.prototype.Nb, i.prototype.close = i.prototype.close, i.prototype.handleError = i.prototype.handleError, i.prototype.getRowsModified = i.prototype.Rb, i.prototype.create_function = i.prototype.Kb, i.prototype.create_aggregate = i.prototype.Jb, i.prototype.updateHook = i.prototype.Zb, a.Database = i;
      };
      var K = "./this.program", le = (e, t) => {
        throw t;
      }, fe = (lr = (ur = globalThis.document) == null ? void 0 : ur.currentScript) == null ? void 0 : lr.src;
      typeof __filename < "u" ? fe = __filename : X && (fe = self.location.href);
      var he = "", ve, ee;
      if (J) {
        var ge = G;
        he = __dirname + "/", ee = (e) => (e = De(e) ? new URL(e) : e, ge.readFileSync(e)), ve = async (e) => (e = De(e) ? new URL(e) : e, ge.readFileSync(e, void 0)), 1 < process.argv.length && (K = process.argv[1].replace(/\\/g, "/")), process.argv.slice(2), c.exports = a, le = (e, t) => {
          throw process.exitCode = e, t;
        };
      } else if (N || X) {
        try {
          he = new URL(".", fe).href;
        } catch {
        }
        X && (ee = (e) => {
          var t = new XMLHttpRequest();
          return t.open("GET", e, !1), t.responseType = "arraybuffer", t.send(null), new Uint8Array(t.response);
        }), ve = async (e) => {
          if (De(e)) return new Promise((r, n) => {
            var i = new XMLHttpRequest();
            i.open("GET", e, !0), i.responseType = "arraybuffer", i.onload = () => {
              i.status == 200 || i.status == 0 && i.response ? r(i.response) : n(i.status);
            }, i.onerror = n, i.send(null);
          });
          var t = await fetch(e, { credentials: "same-origin" });
          if (t.ok) return t.arrayBuffer();
          throw Error(t.status + " : " + t.url);
        };
      }
      var tt = console.log.bind(console), ce = console.error.bind(console), qe, Le = !1, rt, De = (e) => e.startsWith("file://"), R, L, Ae, A, E, nt, it, Q;
      function At() {
        var e = Xe.buffer;
        R = new Int8Array(e), Ae = new Int16Array(e), L = new Uint8Array(e), A = new Int32Array(e), E = new Uint32Array(e), nt = new Float32Array(e), it = new Float64Array(e), Q = new BigInt64Array(e), new BigUint64Array(e);
      }
      function Ne(e) {
        var t;
        throw (t = a.onAbort) == null || t.call(a, e), e = "Aborted(" + e + ")", ce(e), Le = !0, new WebAssembly.RuntimeError(e + ". Build with -sASSERTIONS for more info.");
      }
      var ot;
      async function Pr(e) {
        if (!qe) try {
          var t = await ve(e);
          return new Uint8Array(t);
        } catch {
        }
        if (e == ot && qe) e = new Uint8Array(qe);
        else if (ee) e = ee(e);
        else throw "both async and sync fetching of the wasm failed";
        return e;
      }
      async function Tr(e, t) {
        try {
          var r = await Pr(e);
          return await WebAssembly.instantiate(r, t);
        } catch (n) {
          ce(`failed to asynchronously prepare wasm: ${n}`), Ne(n);
        }
      }
      async function xr(e) {
        var t = ot;
        if (!qe && !De(t) && !J) try {
          var r = fetch(t, { credentials: "same-origin" });
          return await WebAssembly.instantiateStreaming(r, e);
        } catch (n) {
          ce(`wasm streaming compile failed: ${n}`), ce("falling back to ArrayBuffer instantiation");
        }
        return Tr(t, e);
      }
      class st {
        constructor(t) {
          oe(this, "name", "ExitStatus");
          this.message = `Program terminated with exit(${t})`, this.status = t;
        }
      }
      var Nt = (e) => {
        for (; 0 < e.length; ) e.shift()(a);
      }, Mt = [], Rt = [], Or = () => {
        var e = a.preRun.shift();
        Rt.push(e);
      }, pe = 0, Me = null;
      function Z(e, t = "i8") {
        switch (t.endsWith("*") && (t = "*"), t) {
          case "i1":
            return R[e];
          case "i8":
            return R[e];
          case "i16":
            return Ae[e >> 1];
          case "i32":
            return A[e >> 2];
          case "i64":
            return Q[e >> 3];
          case "float":
            return nt[e >> 2];
          case "double":
            return it[e >> 3];
          case "*":
            return E[e >> 2];
          default:
            Ne(`invalid type for getValue: ${t}`);
        }
      }
      var Ue = !0;
      function Re(e) {
        var t = "i32";
        switch (t.endsWith("*") && (t = "*"), t) {
          case "i1":
            R[e] = 0;
            break;
          case "i8":
            R[e] = 0;
            break;
          case "i16":
            Ae[e >> 1] = 0;
            break;
          case "i32":
            A[e >> 2] = 0;
            break;
          case "i64":
            Q[e >> 3] = BigInt(0);
            break;
          case "float":
            nt[e >> 2] = 0;
            break;
          case "double":
            it[e >> 3] = 0;
            break;
          case "*":
            E[e >> 2] = 0;
            break;
          default:
            Ne(`invalid type for setValue: ${t}`);
        }
      }
      var Pt = new TextDecoder(), Tt = (e, t, r, n) => {
        if (r = t + r, n) return r;
        for (; e[t] && !(t >= r); ) ++t;
        return t;
      }, M = (e, t, r) => e ? Pt.decode(L.subarray(e, Tt(L, e, t, r))) : "", xt = (e, t) => {
        for (var r = 0, n = e.length - 1; 0 <= n; n--) {
          var i = e[n];
          i === "." ? e.splice(n, 1) : i === ".." ? (e.splice(n, 1), r++) : r && (e.splice(n, 1), r--);
        }
        if (t) for (; r; r--) e.unshift("..");
        return e;
      }, at = (e) => {
        var t = e.charAt(0) === "/", r = e.slice(-1) === "/";
        return (e = xt(e.split("/").filter((n) => !!n), !t).join("/")) || t || (e = "."), e && r && (e += "/"), (t ? "/" : "") + e;
      }, Ot = (e) => {
        var t = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(e).slice(1);
        return e = t[0], t = t[1], !e && !t ? "." : (t && (t = t.slice(0, -1)), e + t);
      }, Ie = (e) => e && e.match(/([^\/]+|\/)\/*$/)[1], Lr = () => {
        if (J) {
          var e = Er;
          return (t) => e.randomFillSync(t);
        }
        return (t) => crypto.getRandomValues(t);
      }, Lt = (e) => {
        (Lt = Lr())(e);
      }, Dr = (...e) => {
        for (var t = "", r = !1, n = e.length - 1; -1 <= n && !r; n--) {
          if (r = 0 <= n ? e[n] : "/", typeof r != "string") throw new TypeError("Arguments to path.resolve must be strings");
          if (!r) return "";
          t = r + "/" + t, r = r.charAt(0) === "/";
        }
        return t = xt(t.split("/").filter((i) => !!i), !r).join("/"), (r ? "/" : "") + t || ".";
      }, je = (e) => {
        var t = Tt(e, 0);
        return Pt.decode(e.buffer ? e.subarray(0, t) : new Uint8Array(e.slice(0, t)));
      }, ut = [], _e = (e) => {
        for (var t = 0, r = 0; r < e.length; ++r) {
          var n = e.charCodeAt(r);
          127 >= n ? t++ : 2047 >= n ? t += 2 : 55296 <= n && 57343 >= n ? (t += 4, ++r) : t += 3;
        }
        return t;
      }, H = (e, t, r, n) => {
        if (!(0 < n)) return 0;
        var i = r;
        n = r + n - 1;
        for (var s = 0; s < e.length; ++s) {
          var u = e.codePointAt(s);
          if (127 >= u) {
            if (r >= n) break;
            t[r++] = u;
          } else if (2047 >= u) {
            if (r + 1 >= n) break;
            t[r++] = 192 | u >> 6, t[r++] = 128 | u & 63;
          } else if (65535 >= u) {
            if (r + 2 >= n) break;
            t[r++] = 224 | u >> 12, t[r++] = 128 | u >> 6 & 63, t[r++] = 128 | u & 63;
          } else {
            if (r + 3 >= n) break;
            t[r++] = 240 | u >> 18, t[r++] = 128 | u >> 12 & 63, t[r++] = 128 | u >> 6 & 63, t[r++] = 128 | u & 63, s++;
          }
        }
        return t[r] = 0, r - i;
      }, Dt = [];
      function Ut(e, t) {
        Dt[e] = { input: [], output: [], eb: t }, mt(e, Ur);
      }
      var Ur = { open(e) {
        var t = Dt[e.node.rdev];
        if (!t) throw new f(43);
        e.tty = t, e.seekable = !1;
      }, close(e) {
        e.tty.eb.fsync(e.tty);
      }, fsync(e) {
        e.tty.eb.fsync(e.tty);
      }, read(e, t, r, n) {
        if (!e.tty || !e.tty.eb.Bb) throw new f(60);
        for (var i = 0, s = 0; s < n; s++) {
          try {
            var u = e.tty.eb.Bb(e.tty);
          } catch {
            throw new f(29);
          }
          if (u === void 0 && i === 0) throw new f(6);
          if (u == null) break;
          i++, t[r + s] = u;
        }
        return i && (e.node.atime = Date.now()), i;
      }, write(e, t, r, n) {
        if (!e.tty || !e.tty.eb.ub) throw new f(60);
        try {
          for (var i = 0; i < n; i++) e.tty.eb.ub(e.tty, t[r + i]);
        } catch {
          throw new f(29);
        }
        return n && (e.node.mtime = e.node.ctime = Date.now()), i;
      } }, Ir = { Bb() {
        var i;
        e: {
          if (!ut.length) {
            var e = null;
            if (J) {
              var t = Buffer.alloc(256), r = 0, n = process.stdin.fd;
              try {
                r = ge.readSync(n, t, 0, 256);
              } catch (s) {
                if (s.toString().includes("EOF")) r = 0;
                else throw s;
              }
              0 < r && (e = t.slice(0, r).toString("utf-8"));
            } else (i = globalThis.window) != null && i.prompt && (e = window.prompt("Input: "), e !== null && (e += `
`));
            if (!e) {
              e = null;
              break e;
            }
            t = Array(_e(e) + 1), e = H(e, t, 0, t.length), t.length = e, ut = t;
          }
          e = ut.shift();
        }
        return e;
      }, ub(e, t) {
        t === null || t === 10 ? (tt(je(e.output)), e.output = []) : t != 0 && e.output.push(t);
      }, fsync(e) {
        var t;
        0 < ((t = e.output) == null ? void 0 : t.length) && (tt(je(e.output)), e.output = []);
      }, hc() {
        return { bc: 25856, dc: 5, ac: 191, cc: 35387, $b: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
      }, ic() {
        return 0;
      }, jc() {
        return [24, 80];
      } }, jr = { ub(e, t) {
        t === null || t === 10 ? (ce(je(e.output)), e.output = []) : t != 0 && e.output.push(t);
      }, fsync(e) {
        var t;
        0 < ((t = e.output) == null ? void 0 : t.length) && (ce(je(e.output)), e.output = []);
      } }, d = { Wa: null, Xa() {
        return d.createNode(null, "/", 16895, 0);
      }, createNode(e, t, r, n) {
        if ((r & 61440) === 24576 || (r & 61440) === 4096) throw new f(63);
        return d.Wa || (d.Wa = { dir: { node: { Ta: d.La.Ta, Ua: d.La.Ua, lookup: d.La.lookup, ib: d.La.ib, rename: d.La.rename, unlink: d.La.unlink, rmdir: d.La.rmdir, readdir: d.La.readdir, symlink: d.La.symlink }, stream: { Va: d.Ma.Va } }, file: { node: { Ta: d.La.Ta, Ua: d.La.Ua }, stream: { Va: d.Ma.Va, read: d.Ma.read, write: d.Ma.write, jb: d.Ma.jb, kb: d.Ma.kb } }, link: { node: { Ta: d.La.Ta, Ua: d.La.Ua, readlink: d.La.readlink }, stream: {} }, yb: { node: { Ta: d.La.Ta, Ua: d.La.Ua }, stream: Br } }), r = Ct(e, t, r, n), U(r.mode) ? (r.La = d.Wa.dir.node, r.Ma = d.Wa.dir.stream, r.Na = {}) : (r.mode & 61440) === 32768 ? (r.La = d.Wa.file.node, r.Ma = d.Wa.file.stream, r.Ra = 0, r.Na = null) : (r.mode & 61440) === 40960 ? (r.La = d.Wa.link.node, r.Ma = d.Wa.link.stream) : (r.mode & 61440) === 8192 && (r.La = d.Wa.yb.node, r.Ma = d.Wa.yb.stream), r.atime = r.mtime = r.ctime = Date.now(), e && (e.Na[t] = r, e.atime = e.mtime = e.ctime = r.atime), r;
      }, fc(e) {
        return e.Na ? e.Na.subarray ? e.Na.subarray(0, e.Ra) : new Uint8Array(e.Na) : new Uint8Array(0);
      }, La: {
        Ta(e) {
          var t = {};
          return t.dev = (e.mode & 61440) === 8192 ? e.id : 1, t.ino = e.id, t.mode = e.mode, t.nlink = 1, t.uid = 0, t.gid = 0, t.rdev = e.rdev, U(e.mode) ? t.size = 4096 : (e.mode & 61440) === 32768 ? t.size = e.Ra : (e.mode & 61440) === 40960 ? t.size = e.link.length : t.size = 0, t.atime = new Date(e.atime), t.mtime = new Date(e.mtime), t.ctime = new Date(e.ctime), t.blksize = 4096, t.blocks = Math.ceil(t.size / t.blksize), t;
        },
        Ua(e, t) {
          for (var r of ["mode", "atime", "mtime", "ctime"]) t[r] != null && (e[r] = t[r]);
          t.size !== void 0 && (t = t.size, e.Ra != t && (t == 0 ? (e.Na = null, e.Ra = 0) : (r = e.Na, e.Na = new Uint8Array(t), r && e.Na.set(r.subarray(0, Math.min(t, e.Ra))), e.Ra = t)));
        },
        lookup() {
          throw d.nb || (d.nb = new f(44), d.nb.stack = "<generic error, no stack>"), d.nb;
        },
        ib(e, t, r, n) {
          return d.createNode(e, t, r, n);
        },
        rename(e, t, r) {
          try {
            var n = me(t, r);
          } catch {
          }
          if (n) {
            if (U(e.mode)) for (var i in n.Na) throw new f(55);
            ct(n);
          }
          delete e.parent.Na[e.name], t.Na[r] = e, e.name = r, t.ctime = t.mtime = e.parent.ctime = e.parent.mtime = Date.now();
        },
        unlink(e, t) {
          delete e.Na[t], e.ctime = e.mtime = Date.now();
        },
        rmdir(e, t) {
          var r = me(e, t), n;
          for (n in r.Na) throw new f(55);
          delete e.Na[t], e.ctime = e.mtime = Date.now();
        },
        readdir(e) {
          return [".", "..", ...Object.keys(e.Na)];
        },
        symlink(e, t, r) {
          return e = d.createNode(e, t, 41471, 0), e.link = r, e;
        },
        readlink(e) {
          if ((e.mode & 61440) !== 40960) throw new f(28);
          return e.link;
        }
      }, Ma: { read(e, t, r, n, i) {
        var s = e.node.Na;
        if (i >= e.node.Ra) return 0;
        if (e = Math.min(e.node.Ra - i, n), 8 < e && s.subarray) t.set(s.subarray(i, i + e), r);
        else for (n = 0; n < e; n++) t[r + n] = s[i + n];
        return e;
      }, write(e, t, r, n, i, s) {
        if (t.buffer === R.buffer && (s = !1), !n) return 0;
        if (e = e.node, e.mtime = e.ctime = Date.now(), t.subarray && (!e.Na || e.Na.subarray)) {
          if (s) return e.Na = t.subarray(r, r + n), e.Ra = n;
          if (e.Ra === 0 && i === 0) return e.Na = t.slice(r, r + n), e.Ra = n;
          if (i + n <= e.Ra) return e.Na.set(t.subarray(r, r + n), i), n;
        }
        s = i + n;
        var u = e.Na ? e.Na.length : 0;
        if (u >= s || (s = Math.max(s, u * (1048576 > u ? 2 : 1.125) >>> 0), u != 0 && (s = Math.max(s, 256)), u = e.Na, e.Na = new Uint8Array(s), 0 < e.Ra && e.Na.set(u.subarray(0, e.Ra), 0)), e.Na.subarray && t.subarray) e.Na.set(t.subarray(r, r + n), i);
        else for (s = 0; s < n; s++) e.Na[i + s] = t[r + s];
        return e.Ra = Math.max(e.Ra, i + n), n;
      }, Va(e, t, r) {
        if (r === 1 ? t += e.position : r === 2 && (e.node.mode & 61440) === 32768 && (t += e.node.Ra), 0 > t) throw new f(28);
        return t;
      }, jb(e, t, r, n, i) {
        if ((e.node.mode & 61440) !== 32768) throw new f(43);
        if (e = e.node.Na, i & 2 || !e || e.buffer !== R.buffer) {
          i = !0, n = 65536 * Math.ceil(t / 65536);
          var s = nr(65536, n);
          if (s && L.fill(0, s, s + n), n = s, !n) throw new f(48);
          e && ((0 < r || r + t < e.length) && (e.subarray ? e = e.subarray(r, r + t) : e = Array.prototype.slice.call(e, r, r + t)), R.set(e, n));
        } else i = !1, n = e.byteOffset;
        return { Xb: n, Eb: i };
      }, kb(e, t, r, n) {
        return d.Ma.write(e, t, 0, n, r, !1), 0;
      } } }, It = (e, t) => {
        var r = 0;
        return e && (r |= 365), t && (r |= 146), r;
      }, lt = null, jt = {}, ke = [], zr = 1, te = null, zt = !1, $t = !0, f = class {
        constructor(e) {
          oe(this, "name", "ErrnoError");
          this.Pa = e;
        }
      }, $r = class {
        constructor() {
          oe(this, "hb", {});
          oe(this, "node", null);
        }
        get flags() {
          return this.hb.flags;
        }
        set flags(e) {
          this.hb.flags = e;
        }
        get position() {
          return this.hb.position;
        }
        set position(e) {
          this.hb.position = e;
        }
      }, Cr = class {
        constructor(e, t, r, n) {
          oe(this, "La", {});
          oe(this, "Ma", {});
          oe(this, "bb", null);
          e || (e = this), this.parent = e, this.Xa = e.Xa, this.id = zr++, this.name = t, this.mode = r, this.rdev = n, this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & 365) === 365;
        }
        set read(e) {
          e ? this.mode |= 365 : this.mode &= -366;
        }
        get write() {
          return (this.mode & 146) === 146;
        }
        set write(e) {
          e ? this.mode |= 146 : this.mode &= -147;
        }
      };
      function C(e, t = {}) {
        if (!e) throw new f(44);
        t.pb ?? (t.pb = !0), e.charAt(0) === "/" || (e = "//" + e);
        var r = 0;
        e: for (; 40 > r; r++) {
          e = e.split("/").filter((m) => !!m);
          for (var n = lt, i = "/", s = 0; s < e.length; s++) {
            var u = s === e.length - 1;
            if (u && t.parent) break;
            if (e[s] !== ".") if (e[s] === "..") if (i = Ot(i), n === n.parent) {
              e = i + "/" + e.slice(s + 1).join("/"), r--;
              continue e;
            } else n = n.parent;
            else {
              i = at(i + "/" + e[s]);
              try {
                n = me(n, e[s]);
              } catch (m) {
                if ((m == null ? void 0 : m.Pa) === 44 && u && t.Wb) return { path: i };
                throw m;
              }
              if (!n.bb || u && !t.pb || (n = n.bb.root), (n.mode & 61440) === 40960 && (!u || t.ab)) {
                if (!n.La.readlink) throw new f(52);
                n = n.La.readlink(n), n.charAt(0) === "/" || (n = Ot(i) + "/" + n), e = n + "/" + e.slice(s + 1).join("/");
                continue e;
              }
            }
          }
          return { path: i, node: n };
        }
        throw new f(32);
      }
      function ft(e) {
        for (var t; ; ) {
          if (e === e.parent) return e = e.Xa.Db, t ? e[e.length - 1] !== "/" ? `${e}/${t}` : e + t : e;
          t = t ? `${e.name}/${t}` : e.name, e = e.parent;
        }
      }
      function ht(e, t) {
        for (var r = 0, n = 0; n < t.length; n++) r = (r << 5) - r + t.charCodeAt(n) | 0;
        return (e + r >>> 0) % te.length;
      }
      function ct(e) {
        var t = ht(e.parent.id, e.name);
        if (te[t] === e) te[t] = e.cb;
        else for (t = te[t]; t; ) {
          if (t.cb === e) {
            t.cb = e.cb;
            break;
          }
          t = t.cb;
        }
      }
      function me(e, t) {
        var r = U(e.mode) ? (r = Ee(e, "x")) ? r : e.La.lookup ? 0 : 2 : 54;
        if (r) throw new f(r);
        for (r = te[ht(e.id, t)]; r; r = r.cb) {
          var n = r.name;
          if (r.parent.id === e.id && n === t) return r;
        }
        return e.La.lookup(e, t);
      }
      function Ct(e, t, r, n) {
        return e = new Cr(e, t, r, n), t = ht(e.parent.id, e.name), e.cb = te[t], te[t] = e;
      }
      function U(e) {
        return (e & 61440) === 16384;
      }
      function Ee(e, t) {
        return $t ? 0 : t.includes("r") && !(e.mode & 292) || t.includes("w") && !(e.mode & 146) || t.includes("x") && !(e.mode & 73) ? 2 : 0;
      }
      function Ft(e, t) {
        if (!U(e.mode)) return 54;
        try {
          return me(e, t), 20;
        } catch {
        }
        return Ee(e, "wx");
      }
      function Bt(e, t, r) {
        try {
          var n = me(e, t);
        } catch (i) {
          return i.Pa;
        }
        if (e = Ee(e, "wx")) return e;
        if (r) {
          if (!U(n.mode)) return 54;
          if (n === n.parent || ft(n) === "/") return 10;
        } else if (U(n.mode)) return 31;
        return 0;
      }
      function ze(e) {
        if (!e) throw new f(63);
        return e;
      }
      function D(e) {
        if (e = ke[e], !e) throw new f(8);
        return e;
      }
      function Qt(e, t = -1) {
        if (e = Object.assign(new $r(), e), t == -1) e: {
          for (t = 0; 4096 >= t; t++) if (!ke[t]) break e;
          throw new f(33);
        }
        return e.fd = t, ke[t] = e;
      }
      function Fr(e, t = -1) {
        var r, n;
        return e = Qt(e, t), (n = (r = e.Ma) == null ? void 0 : r.ec) == null || n.call(r, e), e;
      }
      function pt(e, t, r) {
        var n = e == null ? void 0 : e.Ma.Ua;
        e = n ? e : t, n ?? (n = t.La.Ua), ze(n), n(e, r);
      }
      var Br = { open(e) {
        var t, r;
        e.Ma = jt[e.node.rdev].Ma, (r = (t = e.Ma).open) == null || r.call(t, e);
      }, Va() {
        throw new f(70);
      } };
      function mt(e, t) {
        jt[e] = { Ma: t };
      }
      function Wt(e, t) {
        var r = t === "/";
        if (r && lt) throw new f(10);
        if (!r && t) {
          var n = C(t, { pb: !1 });
          if (t = n.path, n = n.node, n.bb) throw new f(10);
          if (!U(n.mode)) throw new f(54);
        }
        t = { type: e, kc: {}, Db: t, Vb: [] }, e = e.Xa(t), e.Xa = t, t.root = e, r ? lt = e : n && (n.bb = t, n.Xa && n.Xa.Vb.push(t));
      }
      function $e(e, t, r) {
        var n = C(e, { parent: !0 }).node;
        if (e = Ie(e), !e) throw new f(28);
        if (e === "." || e === "..") throw new f(20);
        var i = Ft(n, e);
        if (i) throw new f(i);
        if (!n.La.ib) throw new f(63);
        return n.La.ib(n, e, t, r);
      }
      function Qr(e, t = 438) {
        return $e(e, t & 4095 | 32768, 0);
      }
      function Y(e, t = 511) {
        return $e(e, t & 1023 | 16384, 0);
      }
      function Ce(e, t, r) {
        typeof r > "u" && (r = t, t = 438), $e(e, t | 8192, r);
      }
      function dt(e, t) {
        if (!Dr(e)) throw new f(44);
        var r = C(t, { parent: !0 }).node;
        if (!r) throw new f(44);
        t = Ie(t);
        var n = Ft(r, t);
        if (n) throw new f(n);
        if (!r.La.symlink) throw new f(63);
        r.La.symlink(r, t, e);
      }
      function Vt(e) {
        var t = C(e, { parent: !0 }).node;
        e = Ie(e);
        var r = me(t, e), n = Bt(t, e, !0);
        if (n) throw new f(n);
        if (!t.La.rmdir) throw new f(63);
        if (r.bb) throw new f(10);
        t.La.rmdir(t, e), ct(r);
      }
      function Ht(e) {
        var t = C(e, { parent: !0 }).node;
        if (!t) throw new f(44);
        e = Ie(e);
        var r = me(t, e), n = Bt(t, e, !1);
        if (n) throw new f(n);
        if (!t.La.unlink) throw new f(63);
        if (r.bb) throw new f(10);
        t.La.unlink(t, e), ct(r);
      }
      function Pe(e, t) {
        return e = C(e, { ab: !t }).node, ze(e.La.Ta)(e);
      }
      function Yt(e, t, r, n) {
        pt(e, t, { mode: r & 4095 | t.mode & -4096, ctime: Date.now(), Lb: n });
      }
      function Fe(e, t) {
        e = typeof e == "string" ? C(e, { ab: !0 }).node : e, Yt(null, e, t);
      }
      function Gt(e, t, r) {
        if (U(t.mode)) throw new f(31);
        if ((t.mode & 61440) !== 32768) throw new f(28);
        var n = Ee(t, "w");
        if (n) throw new f(n);
        pt(e, t, { size: r, timestamp: Date.now() });
      }
      function Se(e, t, r = 438) {
        if (e === "") throw new f(44);
        if (typeof t == "string") {
          var n = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[t];
          if (typeof n > "u") throw Error(`Unknown file open mode: ${t}`);
          t = n;
        }
        if (r = t & 64 ? r & 4095 | 32768 : 0, typeof e == "object") n = e;
        else {
          var i = e.endsWith("/"), s = C(e, { ab: !(t & 131072), Wb: !0 });
          n = s.node, e = s.path;
        }
        if (s = !1, t & 64) if (n) {
          if (t & 128) throw new f(20);
        } else {
          if (i) throw new f(31);
          n = $e(e, r | 511, 0), s = !0;
        }
        if (!n) throw new f(44);
        if ((n.mode & 61440) === 8192 && (t &= -513), t & 65536 && !U(n.mode)) throw new f(54);
        if (!s && (n ? (n.mode & 61440) === 40960 ? i = 32 : (i = ["r", "w", "rw"][t & 3], t & 512 && (i += "w"), i = U(n.mode) && (i !== "r" || t & 576) ? 31 : Ee(n, i)) : i = 44, i)) throw new f(i);
        return t & 512 && !s && (i = n, i = typeof i == "string" ? C(i, { ab: !0 }).node : i, Gt(null, i, 0)), t = Qt({ node: n, path: ft(n), flags: t & -131713, seekable: !0, position: 0, Ma: n.Ma, Yb: [], error: !1 }), t.Ma.open && t.Ma.open(t), s && Fe(n, r & 511), t;
      }
      function yt(e) {
        if (e.fd === null) throw new f(8);
        e.rb && (e.rb = null);
        try {
          e.Ma.close && e.Ma.close(e);
        } catch (t) {
          throw t;
        } finally {
          ke[e.fd] = null;
        }
        e.fd = null;
      }
      function Xt(e, t, r) {
        if (e.fd === null) throw new f(8);
        if (!e.seekable || !e.Ma.Va) throw new f(70);
        if (r != 0 && r != 1 && r != 2) throw new f(28);
        e.position = e.Ma.Va(e, t, r), e.Yb = [];
      }
      function Jt(e, t, r, n, i) {
        if (0 > n || 0 > i) throw new f(28);
        if (e.fd === null) throw new f(8);
        if ((e.flags & 2097155) === 1) throw new f(8);
        if (U(e.node.mode)) throw new f(31);
        if (!e.Ma.read) throw new f(28);
        var s = typeof i < "u";
        if (!s) i = e.position;
        else if (!e.seekable) throw new f(70);
        return t = e.Ma.read(e, t, r, n, i), s || (e.position += t), t;
      }
      function Zt(e, t, r, n, i) {
        if (0 > n || 0 > i) throw new f(28);
        if (e.fd === null) throw new f(8);
        if (!(e.flags & 2097155)) throw new f(8);
        if (U(e.node.mode)) throw new f(31);
        if (!e.Ma.write) throw new f(28);
        e.seekable && e.flags & 1024 && Xt(e, 0, 2);
        var s = typeof i < "u";
        if (!s) i = e.position;
        else if (!e.seekable) throw new f(70);
        return t = e.Ma.write(e, t, r, n, i, void 0), s || (e.position += t), t;
      }
      function Wr(e) {
        var t = t || 0;
        t = Se(e, t), e = Pe(e).size;
        var r = new Uint8Array(e);
        return Jt(t, r, 0, e, 0), yt(t), r;
      }
      function re(e, t, r) {
        e = at("/dev/" + e);
        var n = It(!!t, !!r);
        re.Cb ?? (re.Cb = 64);
        var i = re.Cb++ << 8 | 0;
        mt(i, { open(s) {
          s.seekable = !1;
        }, close() {
          var s;
          (s = r == null ? void 0 : r.buffer) != null && s.length && r(10);
        }, read(s, u, m, _) {
          for (var y = 0, q = 0; q < _; q++) {
            try {
              var x = t();
            } catch {
              throw new f(29);
            }
            if (x === void 0 && y === 0) throw new f(6);
            if (x == null) break;
            y++, u[m + q] = x;
          }
          return y && (s.node.atime = Date.now()), y;
        }, write(s, u, m, _) {
          for (var y = 0; y < _; y++) try {
            r(u[m + y]);
          } catch {
            throw new f(29);
          }
          return _ && (s.node.mtime = s.node.ctime = Date.now()), y;
        } }), Ce(e, n, i);
      }
      var S = {};
      function de(e, t, r) {
        if (t.charAt(0) === "/") return t;
        if (e = e === -100 ? "/" : D(e).path, t.length == 0) {
          if (!r) throw new f(44);
          return e;
        }
        return e + "/" + t;
      }
      function Be(e, t) {
        E[e >> 2] = t.dev, E[e + 4 >> 2] = t.mode, E[e + 8 >> 2] = t.nlink, E[e + 12 >> 2] = t.uid, E[e + 16 >> 2] = t.gid, E[e + 20 >> 2] = t.rdev, Q[e + 24 >> 3] = BigInt(t.size), A[e + 32 >> 2] = 4096, A[e + 36 >> 2] = t.blocks;
        var r = t.atime.getTime(), n = t.mtime.getTime(), i = t.ctime.getTime();
        return Q[e + 40 >> 3] = BigInt(Math.floor(r / 1e3)), E[e + 48 >> 2] = r % 1e3 * 1e6, Q[e + 56 >> 3] = BigInt(Math.floor(n / 1e3)), E[e + 64 >> 2] = n % 1e3 * 1e6, Q[e + 72 >> 3] = BigInt(Math.floor(i / 1e3)), E[e + 80 >> 2] = i % 1e3 * 1e6, Q[e + 88 >> 3] = BigInt(t.ino), 0;
      }
      var Qe = void 0, We = () => {
        var e = A[+Qe >> 2];
        return Qe += 4, e;
      }, bt = 0, Vr = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Hr = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Te = {}, Kt = (e) => {
        var t;
        rt = e, Ue || 0 < bt || ((t = a.onExit) == null || t.call(a, e), Le = !0), le(e, new st(e));
      }, Yr = (e) => {
        if (!Le) try {
          e();
        } catch (t) {
          t instanceof st || t == "unwind" || le(1, t);
        } finally {
          if (!(Ue || 0 < bt)) try {
            rt = e = rt, Kt(e);
          } catch (t) {
            t instanceof st || t == "unwind" || le(1, t);
          }
        }
      }, wt = {}, er = () => {
        var n;
        if (!vt) {
          var e = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (((n = globalThis.navigator) == null ? void 0 : n.language) ?? "C").replace("-", "_") + ".UTF-8", _: K || "./this.program" }, t;
          for (t in wt) wt[t] === void 0 ? delete e[t] : e[t] = wt[t];
          var r = [];
          for (t in e) r.push(`${t}=${e[t]}`);
          vt = r;
        }
        return vt;
      }, vt, Gr = (e, t, r, n) => {
        var i = { string: (y) => {
          var q = 0;
          if (y != null && y !== 0) {
            q = _e(y) + 1;
            var x = be(q);
            H(y, L, x, q), q = x;
          }
          return q;
        }, array: (y) => {
          var q = be(y.length);
          return R.set(y, q), q;
        } };
        e = a["_" + e];
        var s = [], u = 0;
        if (n) for (var m = 0; m < n.length; m++) {
          var _ = i[r[m]];
          _ ? (u === 0 && (u = Ge()), s[m] = _(n[m])) : s[m] = n[m];
        }
        return r = e(...s), r = function(y) {
          return u !== 0 && Ye(u), t === "string" ? M(y) : t === "boolean" ? !!y : y;
        }(r);
      }, Ve = (e) => {
        var t = _e(e) + 1, r = He(t);
        return r && H(e, L, r, t), r;
      }, ye, gt = [], ne = (e) => {
        ye.delete(ie.get(e)), ie.set(e, null), gt.push(e);
      }, tr = (e) => {
        const t = e.length;
        return [t % 128 | 128, t >> 7, ...e];
      }, Xr = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 }, rr = (e) => tr(Array.from(e, (t) => Xr[t])), xe = (e, t) => {
        if (!ye) {
          ye = /* @__PURE__ */ new WeakMap();
          var r = ie.length;
          if (ye) for (var n = 0; n < 0 + r; n++) {
            var i = ie.get(n);
            i && ye.set(i, n);
          }
        }
        if (r = ye.get(e) || 0) return r;
        r = gt.length ? gt.pop() : ie.grow(1);
        try {
          ie.set(r, e);
        } catch (s) {
          if (!(s instanceof TypeError)) throw s;
          t = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...tr([1, 96, ...rr(t.slice(1)), ...rr(t[0] === "v" ? "" : t[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0), t = new WebAssembly.Module(t), t = new WebAssembly.Instance(t, { e: { f: e } }).exports.f, ie.set(r, t);
        }
        return ye.set(e, r), r;
      };
      if (te = Array(4096), Wt(d, "/"), Y("/tmp"), Y("/home"), Y("/home/web_user"), function() {
        Y("/dev"), mt(259, { read: () => 0, write: (n, i, s, u) => u, Va: () => 0 }), Ce("/dev/null", 259), Ut(1280, Ir), Ut(1536, jr), Ce("/dev/tty", 1280), Ce("/dev/tty1", 1536);
        var e = new Uint8Array(1024), t = 0, r = () => (t === 0 && (Lt(e), t = e.byteLength), e[--t]);
        re("random", r), re("urandom", r), Y("/dev/shm"), Y("/dev/shm/tmp");
      }(), function() {
        Y("/proc");
        var e = Y("/proc/self");
        Y("/proc/self/fd"), Wt({ Xa() {
          var t = Ct(e, "fd", 16895, 73);
          return t.Ma = { Va: d.Ma.Va }, t.La = { lookup(r, n) {
            r = +n;
            var i = D(r);
            return r = { parent: null, Xa: { Db: "fake" }, La: { readlink: () => i.path }, id: r + 1 }, r.parent = r;
          }, readdir() {
            return Array.from(ke.entries()).filter(([, r]) => r).map(([r]) => r.toString());
          } }, t;
        } }, "/proc/self/fd");
      }(), a.noExitRuntime && (Ue = a.noExitRuntime), a.print && (tt = a.print), a.printErr && (ce = a.printErr), a.wasmBinary && (qe = a.wasmBinary), a.thisProgram && (K = a.thisProgram), a.preInit) for (typeof a.preInit == "function" && (a.preInit = [a.preInit]); 0 < a.preInit.length; ) a.preInit.shift()();
      a.stackSave = () => Ge(), a.stackRestore = (e) => Ye(e), a.stackAlloc = (e) => be(e), a.cwrap = (e, t, r, n) => {
        var i = !r || r.every((s) => s === "number" || s === "boolean");
        return t !== "string" && i && !n ? a["_" + e] : (...s) => Gr(e, t, r, s);
      }, a.addFunction = xe, a.removeFunction = ne, a.UTF8ToString = M, a.stringToNewUTF8 = Ve, a.writeArrayToMemory = (e, t) => {
        R.set(e, t);
      };
      var He, Oe, nr, ir, Ye, be, Ge, Xe, ie, Jr = {
        a: (e, t, r, n) => Ne(`Assertion failed: ${M(e)}, at: ` + [t ? M(t) : "unknown filename", r, n ? M(n) : "unknown function"]),
        i: function(e, t) {
          try {
            return e = M(e), Fe(e, t), 0;
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        L: function(e, t, r) {
          try {
            if (t = M(t), t = de(e, t), r & -8) return -28;
            var n = C(t, { ab: !0 }).node;
            return n ? (e = "", r & 4 && (e += "r"), r & 2 && (e += "w"), r & 1 && (e += "x"), e && Ee(n, e) ? -2 : 0) : -44;
          } catch (i) {
            if (typeof S > "u" || i.name !== "ErrnoError") throw i;
            return -i.Pa;
          }
        },
        j: function(e, t) {
          try {
            var r = D(e);
            return Yt(r, r.node, t, !1), 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        h: function(e) {
          try {
            var t = D(e);
            return pt(t, t.node, { timestamp: Date.now(), Lb: !1 }), 0;
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        b: function(e, t, r) {
          Qe = r;
          try {
            var n = D(e);
            switch (t) {
              case 0:
                var i = We();
                if (0 > i) break;
                for (; ke[i]; ) i++;
                return Fr(n, i).fd;
              case 1:
              case 2:
                return 0;
              case 3:
                return n.flags;
              case 4:
                return i = We(), n.flags |= i, 0;
              case 12:
                return i = We(), Ae[i + 0 >> 1] = 2, 0;
              case 13:
              case 14:
                return 0;
            }
            return -28;
          } catch (s) {
            if (typeof S > "u" || s.name !== "ErrnoError") throw s;
            return -s.Pa;
          }
        },
        g: function(e, t) {
          try {
            var r = D(e), n = r.node, i = r.Ma.Ta;
            e = i ? r : n, i ?? (i = n.La.Ta), ze(i);
            var s = i(e);
            return Be(t, s);
          } catch (u) {
            if (typeof S > "u" || u.name !== "ErrnoError") throw u;
            return -u.Pa;
          }
        },
        H: function(e, t) {
          t = -9007199254740992 > t || 9007199254740992 < t ? NaN : Number(t);
          try {
            if (isNaN(t)) return -61;
            var r = D(e);
            if (0 > t || !(r.flags & 2097155)) throw new f(28);
            return Gt(r, r.node, t), 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        G: function(e, t) {
          try {
            if (t === 0) return -28;
            var r = _e("/") + 1;
            return t < r ? -68 : (H("/", L, e, t), r);
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        K: function(e, t) {
          try {
            return e = M(e), Be(t, Pe(e, !0));
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        C: function(e, t, r) {
          try {
            return t = M(t), t = de(e, t), Y(t, r), 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        J: function(e, t, r, n) {
          try {
            t = M(t);
            var i = n & 256;
            return t = de(e, t, n & 4096), Be(r, i ? Pe(t, !0) : Pe(t));
          } catch (s) {
            if (typeof S > "u" || s.name !== "ErrnoError") throw s;
            return -s.Pa;
          }
        },
        x: function(e, t, r, n) {
          Qe = n;
          try {
            t = M(t), t = de(e, t);
            var i = n ? We() : 0;
            return Se(t, r, i).fd;
          } catch (s) {
            if (typeof S > "u" || s.name !== "ErrnoError") throw s;
            return -s.Pa;
          }
        },
        v: function(e, t, r, n) {
          try {
            if (t = M(t), t = de(e, t), 0 >= n) return -28;
            var i = C(t).node;
            if (!i) throw new f(44);
            if (!i.La.readlink) throw new f(28);
            var s = i.La.readlink(i), u = Math.min(n, _e(s)), m = R[r + u];
            return H(
              s,
              L,
              r,
              n + 1
            ), R[r + u] = m, u;
          } catch (_) {
            if (typeof S > "u" || _.name !== "ErrnoError") throw _;
            return -_.Pa;
          }
        },
        u: function(e) {
          try {
            return e = M(e), Vt(e), 0;
          } catch (t) {
            if (typeof S > "u" || t.name !== "ErrnoError") throw t;
            return -t.Pa;
          }
        },
        f: function(e, t) {
          try {
            return e = M(e), Be(t, Pe(e));
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        r: function(e, t, r) {
          try {
            if (t = M(t), t = de(e, t), r) if (r === 512) Vt(t);
            else return -28;
            else Ht(t);
            return 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        q: function(e, t, r) {
          try {
            t = M(t), t = de(e, t, !0);
            var n = Date.now(), i, s;
            if (r) {
              var u = E[r >> 2] + 4294967296 * A[r + 4 >> 2], m = A[r + 8 >> 2];
              m == 1073741823 ? i = n : m == 1073741822 ? i = null : i = 1e3 * u + m / 1e6, r += 16, u = E[r >> 2] + 4294967296 * A[r + 4 >> 2], m = A[r + 8 >> 2], m == 1073741823 ? s = n : m == 1073741822 ? s = null : s = 1e3 * u + m / 1e6;
            } else s = i = n;
            if ((s ?? i) !== null) {
              e = i;
              var _ = C(t, { ab: !0 }).node;
              ze(_.La.Ua)(_, { atime: e, mtime: s });
            }
            return 0;
          } catch (y) {
            if (typeof S > "u" || y.name !== "ErrnoError") throw y;
            return -y.Pa;
          }
        },
        m: () => Ne(""),
        l: () => {
          Ue = !1, bt = 0;
        },
        A: function(e, t) {
          e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e), e = new Date(1e3 * e), A[t >> 2] = e.getSeconds(), A[t + 4 >> 2] = e.getMinutes(), A[t + 8 >> 2] = e.getHours(), A[t + 12 >> 2] = e.getDate(), A[t + 16 >> 2] = e.getMonth(), A[t + 20 >> 2] = e.getFullYear() - 1900, A[t + 24 >> 2] = e.getDay();
          var r = e.getFullYear();
          A[t + 28 >> 2] = (r % 4 !== 0 || r % 100 === 0 && r % 400 !== 0 ? Hr : Vr)[e.getMonth()] + e.getDate() - 1 | 0, A[t + 36 >> 2] = -(60 * e.getTimezoneOffset()), r = new Date(e.getFullYear(), 6, 1).getTimezoneOffset();
          var n = new Date(e.getFullYear(), 0, 1).getTimezoneOffset();
          A[t + 32 >> 2] = (r != n && e.getTimezoneOffset() == Math.min(n, r)) | 0;
        },
        y: function(e, t, r, n, i, s, u) {
          i = -9007199254740992 > i || 9007199254740992 < i ? NaN : Number(i);
          try {
            var m = D(n);
            if (t & 2 && !(r & 2) && (m.flags & 2097155) !== 2) throw new f(2);
            if ((m.flags & 2097155) === 1) throw new f(2);
            if (!m.Ma.jb) throw new f(43);
            if (!e) throw new f(28);
            var _ = m.Ma.jb(m, e, i, t, r), y = _.Xb;
            return A[s >> 2] = _.Eb, E[u >> 2] = y, 0;
          } catch (q) {
            if (typeof S > "u" || q.name !== "ErrnoError") throw q;
            return -q.Pa;
          }
        },
        z: function(e, t, r, n, i, s) {
          s = -9007199254740992 > s || 9007199254740992 < s ? NaN : Number(s);
          try {
            var u = D(i);
            if (r & 2) {
              if (r = s, (u.node.mode & 61440) !== 32768) throw new f(43);
              if (!(n & 2)) {
                var m = L.slice(e, e + t);
                u.Ma.kb && u.Ma.kb(u, m, r, t, n);
              }
            }
          } catch (_) {
            if (typeof S > "u" || _.name !== "ErrnoError") throw _;
            return -_.Pa;
          }
        },
        n: (e, t) => {
          if (Te[e] && (clearTimeout(Te[e].id), delete Te[e]), !t) return 0;
          var r = setTimeout(() => {
            delete Te[e], Yr(() => ir(e, performance.now()));
          }, t);
          return Te[e] = { id: r, lc: t }, 0;
        },
        B: (e, t, r, n) => {
          var i = (/* @__PURE__ */ new Date()).getFullYear(), s = new Date(i, 0, 1).getTimezoneOffset();
          i = new Date(i, 6, 1).getTimezoneOffset(), E[e >> 2] = 60 * Math.max(s, i), A[t >> 2] = +(s != i), t = (u) => {
            var m = Math.abs(u);
            return `UTC${0 <= u ? "-" : "+"}${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;
          }, e = t(s), t = t(i), i < s ? (H(e, L, r, 17), H(t, L, n, 17)) : (H(e, L, n, 17), H(t, L, r, 17));
        },
        d: () => Date.now(),
        s: () => 2147483648,
        c: () => performance.now(),
        o: (e) => {
          var t = L.length;
          if (e >>>= 0, 2147483648 < e) return !1;
          for (var r = 1; 4 >= r; r *= 2) {
            var n = t * (1 + 0.2 / r);
            n = Math.min(n, e + 100663296);
            e: {
              n = (Math.min(2147483648, 65536 * Math.ceil(Math.max(
                e,
                n
              ) / 65536)) - Xe.buffer.byteLength + 65535) / 65536 | 0;
              try {
                Xe.grow(n), At();
                var i = 1;
                break e;
              } catch {
              }
              i = void 0;
            }
            if (i) return !0;
          }
          return !1;
        },
        E: (e, t) => {
          var r = 0, n = 0, i;
          for (i of er()) {
            var s = t + r;
            E[e + n >> 2] = s, r += H(i, L, s, 1 / 0) + 1, n += 4;
          }
          return 0;
        },
        F: (e, t) => {
          var r = er();
          E[e >> 2] = r.length, e = 0;
          for (var n of r) e += _e(n) + 1;
          return E[t >> 2] = e, 0;
        },
        e: function(e) {
          try {
            var t = D(e);
            return yt(t), 0;
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return r.Pa;
          }
        },
        p: function(e, t) {
          try {
            var r = D(e);
            return R[t] = r.tty ? 2 : U(r.mode) ? 3 : (r.mode & 61440) === 40960 ? 7 : 4, Ae[t + 2 >> 1] = 0, Q[t + 8 >> 3] = BigInt(0), Q[t + 16 >> 3] = BigInt(0), 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return n.Pa;
          }
        },
        w: function(e, t, r, n) {
          try {
            e: {
              var i = D(e);
              e = t;
              for (var s, u = t = 0; u < r; u++) {
                var m = E[e >> 2], _ = E[e + 4 >> 2];
                e += 8;
                var y = Jt(i, R, m, _, s);
                if (0 > y) {
                  var q = -1;
                  break e;
                }
                if (t += y, y < _) break;
                typeof s < "u" && (s += y);
              }
              q = t;
            }
            return E[n >> 2] = q, 0;
          } catch (x) {
            if (typeof S > "u" || x.name !== "ErrnoError") throw x;
            return x.Pa;
          }
        },
        D: function(e, t, r, n) {
          t = -9007199254740992 > t || 9007199254740992 < t ? NaN : Number(t);
          try {
            if (isNaN(t)) return 61;
            var i = D(e);
            return Xt(i, t, r), Q[n >> 3] = BigInt(i.position), i.rb && t === 0 && r === 0 && (i.rb = null), 0;
          } catch (s) {
            if (typeof S > "u" || s.name !== "ErrnoError") throw s;
            return s.Pa;
          }
        },
        I: function(e) {
          var r, n;
          try {
            var t = D(e);
            return (n = (r = t.Ma) == null ? void 0 : r.fsync) == null ? void 0 : n.call(r, t);
          } catch (i) {
            if (typeof S > "u" || i.name !== "ErrnoError") throw i;
            return i.Pa;
          }
        },
        t: function(e, t, r, n) {
          try {
            e: {
              var i = D(e);
              e = t;
              for (var s, u = t = 0; u < r; u++) {
                var m = E[e >> 2], _ = E[e + 4 >> 2];
                e += 8;
                var y = Zt(i, R, m, _, s);
                if (0 > y) {
                  var q = -1;
                  break e;
                }
                if (t += y, y < _) break;
                typeof s < "u" && (s += y);
              }
              q = t;
            }
            return E[n >> 2] = q, 0;
          } catch (x) {
            if (typeof S > "u" || x.name !== "ErrnoError") throw x;
            return x.Pa;
          }
        },
        k: Kt
      };
      function _t() {
        function e() {
          var i;
          if (a.calledRun = !0, !Le) {
            if (!a.noFSInit && !zt) {
              var t, r;
              zt = !0, t ?? (t = a.stdin), r ?? (r = a.stdout), n ?? (n = a.stderr), t ? re("stdin", t) : dt("/dev/tty", "/dev/stdin"), r ? re("stdout", null, r) : dt("/dev/tty", "/dev/stdout"), n ? re("stderr", null, n) : dt("/dev/tty1", "/dev/stderr"), Se("/dev/stdin", 0), Se("/dev/stdout", 1), Se("/dev/stderr", 1);
            }
            if (kt.N(), $t = !1, (i = a.onRuntimeInitialized) == null || i.call(a), a.postRun) for (typeof a.postRun == "function" && (a.postRun = [a.postRun]); a.postRun.length; ) {
              var n = a.postRun.shift();
              Mt.push(n);
            }
            Nt(Mt);
          }
        }
        if (0 < pe) Me = _t;
        else {
          if (a.preRun) for (typeof a.preRun == "function" && (a.preRun = [a.preRun]); a.preRun.length; ) Or();
          Nt(Rt), 0 < pe ? Me = _t : a.setStatus ? (a.setStatus("Running..."), setTimeout(() => {
            setTimeout(() => a.setStatus(""), 1), e();
          }, 1)) : e();
        }
      }
      var kt;
      return async function() {
        var r;
        function e(n) {
          var i;
          return n = kt = n.exports, a._sqlite3_free = n.P, a._sqlite3_value_text = n.Q, a._sqlite3_prepare_v2 = n.R, a._sqlite3_step = n.S, a._sqlite3_reset = n.T, a._sqlite3_exec = n.U, a._sqlite3_finalize = n.V, a._sqlite3_column_name = n.W, a._sqlite3_column_text = n.X, a._sqlite3_column_type = n.Y, a._sqlite3_errmsg = n.Z, a._sqlite3_clear_bindings = n._, a._sqlite3_value_blob = n.$, a._sqlite3_value_bytes = n.aa, a._sqlite3_value_double = n.ba, a._sqlite3_value_int = n.ca, a._sqlite3_value_type = n.da, a._sqlite3_result_blob = n.ea, a._sqlite3_result_double = n.fa, a._sqlite3_result_error = n.ga, a._sqlite3_result_int = n.ha, a._sqlite3_result_int64 = n.ia, a._sqlite3_result_null = n.ja, a._sqlite3_result_text = n.ka, a._sqlite3_aggregate_context = n.la, a._sqlite3_column_count = n.ma, a._sqlite3_data_count = n.na, a._sqlite3_column_blob = n.oa, a._sqlite3_column_bytes = n.pa, a._sqlite3_column_double = n.qa, a._sqlite3_bind_blob = n.ra, a._sqlite3_bind_double = n.sa, a._sqlite3_bind_int = n.ta, a._sqlite3_bind_text = n.ua, a._sqlite3_bind_parameter_index = n.va, a._sqlite3_sql = n.wa, a._sqlite3_normalized_sql = n.xa, a._sqlite3_changes = n.ya, a._sqlite3_close_v2 = n.za, a._sqlite3_create_function_v2 = n.Aa, a._sqlite3_update_hook = n.Ba, a._sqlite3_open = n.Ca, He = a._malloc = n.Da, Oe = a._free = n.Ea, a._RegisterExtensionFunctions = n.Fa, nr = n.Ga, ir = n.Ha, Ye = n.Ia, be = n.Ja, Ge = n.Ka, Xe = n.M, ie = n.O, At(), pe--, (i = a.monitorRunDependencies) == null || i.call(a, pe), pe == 0 && Me && (n = Me, Me = null, n()), kt;
        }
        pe++, (r = a.monitorRunDependencies) == null || r.call(a, pe);
        var t = { a: Jr };
        return a.instantiateWasm ? new Promise((n) => {
          a.instantiateWasm(t, (i, s) => {
            n(e(i));
          });
        }) : (ot ?? (ot = a.locateFile ? a.locateFile("sql-wasm.wasm", he) : he + "sql-wasm.wasm"), e((await xr(t)).instance));
      }(), _t(), O;
    }), v);
  };
  c.exports = P, c.exports.default = P;
})(qr);
var Tn = qr.exports;
const xn = /* @__PURE__ */ Pn(Tn), qt = I.dirname(Mn(import.meta.url));
process.env.APP_ROOT = I.join(qt, "..");
const Ze = process.env.VITE_DEV_SERVER_URL, Gn = I.join(process.env.APP_ROOT, "dist-electron"), Ar = I.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Ze ? I.join(process.env.APP_ROOT, "public") : Ar;
let g = null;
const Ke = "CommandOrControl+Alt+A", Nr = {
  launchOnStartup: !1,
  startMinimized: !1,
  quickSearchHotkey: Ke
};
let j = { ...Nr };
function Mr() {
  return I.join(se.getPath("userData"), "desktop-settings.json");
}
function On() {
  try {
    const c = JSON.parse(G.readFileSync(Mr(), "utf-8"));
    j = { ...Nr, ...c };
  } catch {
  }
}
function Rr() {
  try {
    G.writeFileSync(Mr(), JSON.stringify(j, null, 2));
  } catch (c) {
    console.error("Failed to persist desktop settings:", c);
  }
}
const Ln = process.argv.includes("--start-minimized");
function et(c) {
  try {
    return St.register(c, () => {
      g && (g.isMinimized() && g.restore(), g.focus(), g.webContents.send("toggle-quick-search"));
    }) ? null : `Could not register "${c}" - it may already be in use by another app.`;
  } catch {
    return `"${c}" is not a valid hotkey.`;
  }
}
function Dn() {
  const c = [se.getAppPath()];
  j.startMinimized && c.push("--start-minimized"), se.setLoginItemSettings({
    openAtLogin: j.launchOnStartup,
    path: process.execPath,
    args: c
  });
}
function gr() {
  g = new _r({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: I.join(qt, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), g.webContents.on("console-message", (c, b, v, P, T) => {
    console.log(`[Renderer Console ${b}] ${v} (${T}:${P})`);
  }), g.webContents.on("did-fail-load", (c, b, v) => {
    console.error(`[Load Error ${b}] ${v}`);
  }), g.once("ready-to-show", () => {
    Ln ? g == null || g.minimize() : g == null || g.show(), Ze && (g == null || g.webContents.openDevTools({ mode: "detach" }));
  }), Ze ? g.loadURL(Ze) : g.loadFile(I.join(Ar, "index.html"));
}
se.whenReady().then(() => {
  On(), gr();
  const c = et(j.quickSearchHotkey);
  c && (console.error("Quick-search hotkey:", c), j.quickSearchHotkey !== Ke && (j.quickSearchHotkey = Ke, Rr(), et(Ke))), se.on("activate", () => {
    _r.getAllWindows().length === 0 && gr();
  });
});
se.on("will-quit", () => {
  St.unregisterAll();
});
se.on("window-all-closed", () => {
  process.platform !== "darwin" && se.quit();
});
ae.on("window-minimize", () => {
  g == null || g.minimize();
});
ae.on("window-maximize", () => {
  g != null && g.isMaximized() ? g.unmaximize() : g == null || g.maximize();
});
ae.on("window-close", () => {
  g == null || g.close();
});
ae.handle("desktop-settings-get", () => ({ ...j }));
ae.handle("desktop-settings-set", (c, b) => {
  const v = { ...j };
  j = { ...j, ...b };
  let P = null;
  if (b.quickSearchHotkey && b.quickSearchHotkey !== v.quickSearchHotkey) {
    try {
      St.unregister(v.quickSearchHotkey);
    } catch {
    }
    P = et(j.quickSearchHotkey), P && (j.quickSearchHotkey = v.quickSearchHotkey, et(v.quickSearchHotkey));
  }
  return ("launchOnStartup" in b || "startMinimized" in b) && Dn(), Rr(), { settings: { ...j }, error: P };
});
ae.on("open-external", (c, b) => {
  b && (b.startsWith("http://") || b.startsWith("https://")) && kr.openExternal(b);
});
function Un(c) {
  const v = c.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), P = Buffer.from(v, "base64").toString("utf-8");
  return JSON.parse(P);
}
ae.handle("google-oauth", async () => new Promise((c) => {
  const P = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://password-manager.fayber.dev/oauth/callback")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
  let T = !1;
  const B = Rn.createServer((z, O) => {
    if (O.setHeader("Access-Control-Allow-Origin", "*"), z.url && z.url.startsWith("/token")) {
      const a = new URL(z.url, "http://127.0.0.1:28999").searchParams.get("id_token");
      if (O.end("ok"), a && !T) {
        T = !0;
        try {
          const N = Un(a);
          c({
            googleId: N.sub,
            email: N.email,
            name: N.name,
            picture: N.picture,
            idToken: a
          });
        } catch (N) {
          console.error("[Google OAuth] Error parsing token:", N), c(null);
        }
        B.close();
      }
    } else
      O.end("");
  });
  B.listen(28999, "127.0.0.1", () => {
    kr.openExternal(P);
  }), setTimeout(() => {
    if (!T) {
      T = !0;
      try {
        B.close();
      } catch {
      }
      c(null);
    }
  }, 5 * 60 * 1e3);
}));
function In() {
  return new Promise((c) => {
    Sr("tasklist", ["/FI", "IMAGENAME eq chrome.exe", "/NH"], (b, v) => {
      if (b) return c(!1);
      c(/chrome\.exe/i.test(v));
    });
  });
}
function jn(c) {
  return new Promise((b, v) => {
    Sr(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", "Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String($env:NP_ENC_KEY); $k=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,'CurrentUser'); [Convert]::ToBase64String($k)"],
      { env: { ...process.env, NP_ENC_KEY: c }, maxBuffer: 1024 * 1024 },
      (T, B) => {
        if (T) return v(T);
        try {
          b(Buffer.from(B.trim(), "base64"));
        } catch (z) {
          v(z);
        }
      }
    );
  });
}
function zn(c, b) {
  if (c.length < 31) return null;
  const v = c.subarray(0, 3).toString("latin1");
  if (v !== "v10" && v !== "v11") return null;
  const P = c.subarray(3, 15), T = c.subarray(c.length - 16), B = c.subarray(15, c.length - 16);
  try {
    const z = Er.createDecipheriv("aes-256-gcm", b, P);
    return z.setAuthTag(T), Buffer.concat([z.update(B), z.final()]).toString("utf-8");
  } catch {
    return null;
  }
}
ae.handle("chrome-import", async () => {
  var c;
  try {
    if (process.platform !== "win32")
      return { ok: !1, error: "Direct browser import is only available on Windows." };
    if (await In())
      return { ok: !1, error: "Please fully close Google Chrome, then try again." };
    const b = process.env.LOCALAPPDATA || I.join(vr.homedir(), "AppData", "Local"), v = I.join(b, "Google", "Chrome", "User Data");
    if (!G.existsSync(v))
      return { ok: !1, error: "No Google Chrome installation was found for this user." };
    const P = I.join(v, "Local State");
    let T;
    try {
      const N = JSON.parse(G.readFileSync(P, "utf-8")), X = (c = N == null ? void 0 : N.os_crypt) == null ? void 0 : c.encrypted_key;
      if (!X) return { ok: !1, error: "Couldn't read Chrome's encryption key." };
      const K = Buffer.from(X, "base64").subarray(5);
      T = await jn(K.toString("base64"));
    } catch {
      return { ok: !1, error: "Couldn't decrypt Chrome's encryption key (Windows DPAPI)." };
    }
    const B = await xn({ locateFile: () => I.join(qt, "sql-wasm.wasm") }), z = G.readdirSync(v, { withFileTypes: !0 }).filter((N) => N.isDirectory() && (N.name === "Default" || /^Profile \d+$/.test(N.name))).map((N) => N.name), O = [];
    let ue = 0, a = 0;
    for (const N of z) {
      const X = I.join(v, N, "Login Data");
      if (!G.existsSync(X)) continue;
      const J = I.join(vr.tmpdir(), `nextpass-logindata-${Date.now()}-${N.replace(/\W/g, "")}`);
      try {
        G.copyFileSync(X, J);
        const K = new B.Database(G.readFileSync(J));
        try {
          const le = K.exec("SELECT origin_url, username_value, password_value FROM logins");
          if (le.length > 0) {
            a++;
            for (const fe of le[0].values) {
              const he = String(fe[0] ?? ""), ve = String(fe[1] ?? ""), ee = fe[2];
              if (!(ee instanceof Uint8Array) || ee.length === 0) {
                (he || ve) && ue++;
                continue;
              }
              const ge = zn(Buffer.from(ee), T);
              if (ge === null) {
                ue++;
                continue;
              }
              O.push({ url: he, username: ve, password: ge });
            }
          }
        } finally {
          K.close();
        }
      } catch {
      } finally {
        try {
          G.unlinkSync(J);
        } catch {
        }
      }
    }
    return { ok: !0, credentials: O, undecryptable: ue, profiles: a };
  } catch (b) {
    return { ok: !1, error: b instanceof Error ? b.message : "Chrome import failed." };
  }
});
export {
  Gn as MAIN_DIST,
  Ar as RENDERER_DIST,
  Ze as VITE_DEV_SERVER_URL
};
