var Bn = Object.defineProperty;
var Wn = (f, h, p) => h in f ? Bn(f, h, { enumerable: !0, configurable: !0, writable: !0, value: p }) : f[h] = p;
var ue = (f, h, p) => Wn(f, typeof h != "symbol" ? h + "" : h, p);
import { app as te, BrowserWindow as Or, powerMonitor as Nr, globalShortcut as Dt, ipcMain as W, safeStorage as Ot, shell as Fn } from "electron";
import R from "node:fs";
import st from "node:os";
import _ from "node:path";
import Dr from "node:crypto";
import { spawn as zn, execFile as Tt } from "node:child_process";
import { fileURLToPath as Hn } from "node:url";
import Vn from "node:http";
function Qn(f) {
  return f && f.__esModule && Object.prototype.hasOwnProperty.call(f, "default") ? f.default : f;
}
var Tr = { exports: {} };
(function(f, h) {
  var p = void 0, S = function(O) {
    return p || (p = new Promise(function(U, C) {
      var dr, yr, wr, br, vr;
      var T = typeof O < "u" ? O : {}, le = T.onAbort;
      T.onAbort = function(e) {
        C(new Error(e)), le && le(e);
      }, T.postRun = T.postRun || [], T.postRun.push(function() {
        U(T);
      }), f = void 0;
      var a;
      a || (a = typeof T < "u" ? T : {});
      var N = !!globalThis.window, Z = !!globalThis.WorkerGlobalScope, K = ((yr = (dr = globalThis.process) == null ? void 0 : dr.versions) == null ? void 0 : yr.node) && ((wr = globalThis.process) == null ? void 0 : wr.type) != "renderer";
      a.onRuntimeInitialized = function() {
        function e(i, l) {
          switch (typeof l) {
            case "boolean":
              jn(i, l ? 1 : 0);
              break;
            case "number":
              Cn(i, l);
              break;
            case "string":
              Un(i, l, -1, -1);
              break;
            case "object":
              if (l === null) Ar(i);
              else if (l.length != null) {
                var m = Je(l.length);
                D.set(l, m), $n(i, m, l.length, -1), Le(m);
              } else tt(i, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
              break;
            default:
              Ar(i);
          }
        }
        function t(i, l) {
          for (var m = [], d = 0; d < i; d += 1) {
            var g = ee(l + 4 * d, "i32"), E = Rn(g);
            if (E === 1 || E === 2) g = Ln(g);
            else if (E === 3) g = Dn(g);
            else if (E === 4) {
              E = g, g = On(E), E = Tn(E);
              for (var Q = new Uint8Array(g), H = 0; H < g; H += 1) Q[H] = D[E + H];
              g = Q;
            } else g = null;
            m.push(g);
          }
          return m;
        }
        function r(i, l) {
          this.Qa = i, this.db = l, this.Oa = 1, this.mb = [];
        }
        function n(i, l) {
          if (this.db = l, this.fb = Ye(i), this.fb === null) throw Error("Unable to allocate memory for the SQL string");
          this.lb = this.fb, this.$a = this.sb = null;
        }
        function o(i) {
          if (this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0), i != null) {
            var l = this.filename, m = "/", d = l;
            if (m && (m = typeof m == "string" ? m : wt(m), d = l ? mt(m + "/" + l) : m), l = Qt(!0, !0), d = sn(
              d,
              l
            ), i) {
              if (typeof i == "string") {
                m = Array(i.length);
                for (var g = 0, E = i.length; g < E; ++g) m[g] = i.charCodeAt(g);
                i = m;
              }
              Ve(d, l | 146), m = Ae(d, 577), ur(m, i, 0, i.length, 0), Et(m), Ve(d, l);
            }
          }
          this.handleError(y(this.filename, s)), this.db = ee(s, "i32"), xr(this.db), this.gb = {}, this.Sa = {};
        }
        var s = be(4), u = a.cwrap, y = u("sqlite3_open", "number", ["string", "number"]), k = u("sqlite3_close_v2", "number", ["number"]), v = u("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), x = u("sqlite3_changes", "number", ["number"]), L = u(
          "sqlite3_prepare_v2",
          "number",
          ["number", "string", "number", "number", "number"]
        ), gr = u("sqlite3_sql", "string", ["number"]), mn = u("sqlite3_normalized_sql", "string", ["number"]), _r = u("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), dn = u("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), kr = u("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), yn = u("sqlite3_bind_double", "number", ["number", "number", "number"]), wn = u("sqlite3_bind_int", "number", [
          "number",
          "number",
          "number"
        ]), bn = u("sqlite3_bind_parameter_index", "number", ["number", "string"]), vn = u("sqlite3_step", "number", ["number"]), gn = u("sqlite3_errmsg", "string", ["number"]), _n = u("sqlite3_column_count", "number", ["number"]), kn = u("sqlite3_data_count", "number", ["number"]), En = u("sqlite3_column_double", "number", ["number", "number"]), Er = u("sqlite3_column_text", "string", ["number", "number"]), Sn = u("sqlite3_column_blob", "number", ["number", "number"]), An = u("sqlite3_column_bytes", "number", ["number", "number"]), Pn = u(
          "sqlite3_column_type",
          "number",
          ["number", "number"]
        ), xn = u("sqlite3_column_name", "string", ["number", "number"]), qn = u("sqlite3_reset", "number", ["number"]), Nn = u("sqlite3_clear_bindings", "number", ["number"]), Mn = u("sqlite3_finalize", "number", ["number"]), Sr = u("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), Rn = u("sqlite3_value_type", "number", ["number"]), On = u("sqlite3_value_bytes", "number", ["number"]), Dn = u("sqlite3_value_text", "string", ["number"]), Tn = u(
          "sqlite3_value_blob",
          "number",
          ["number"]
        ), Ln = u("sqlite3_value_double", "number", ["number"]), Cn = u("sqlite3_result_double", "", ["number", "number"]), Ar = u("sqlite3_result_null", "", ["number"]), Un = u("sqlite3_result_text", "", ["number", "string", "number", "number"]), $n = u("sqlite3_result_blob", "", ["number", "number", "number", "number"]), jn = u("sqlite3_result_int", "", ["number", "number"]), tt = u("sqlite3_result_error", "", ["number", "string", "number"]), Pr = u("sqlite3_aggregate_context", "number", ["number", "number"]), xr = u(
          "RegisterExtensionFunctions",
          "number",
          ["number"]
        ), qr = u("sqlite3_update_hook", "number", ["number", "number", "number"]);
        r.prototype.bind = function(i) {
          if (!this.Qa) throw "Statement closed";
          return this.reset(), Array.isArray(i) ? this.Gb(i) : i != null && typeof i == "object" ? this.Hb(i) : !0;
        }, r.prototype.step = function() {
          if (!this.Qa) throw "Statement closed";
          this.Oa = 1;
          var i = vn(this.Qa);
          switch (i) {
            case 100:
              return !0;
            case 101:
              return !1;
            default:
              throw this.db.handleError(i);
          }
        }, r.prototype.Ab = function(i) {
          return i == null && (i = this.Oa, this.Oa += 1), En(this.Qa, i);
        }, r.prototype.Ob = function(i) {
          if (i == null && (i = this.Oa, this.Oa += 1), i = Er(this.Qa, i), typeof BigInt != "function") throw Error("BigInt is not supported");
          return BigInt(i);
        }, r.prototype.Tb = function(i) {
          return i == null && (i = this.Oa, this.Oa += 1), Er(this.Qa, i);
        }, r.prototype.getBlob = function(i) {
          i == null && (i = this.Oa, this.Oa += 1);
          var l = An(this.Qa, i);
          i = Sn(this.Qa, i);
          for (var m = new Uint8Array(l), d = 0; d < l; d += 1) m[d] = D[i + d];
          return m;
        }, r.prototype.get = function(i, l) {
          l = l || {}, i != null && this.bind(i) && this.step(), i = [];
          for (var m = kn(this.Qa), d = 0; d < m; d += 1) switch (Pn(this.Qa, d)) {
            case 1:
              var g = l.useBigInt ? this.Ob(d) : this.Ab(d);
              i.push(g);
              break;
            case 2:
              i.push(this.Ab(d));
              break;
            case 3:
              i.push(this.Tb(d));
              break;
            case 4:
              i.push(this.getBlob(d));
              break;
            default:
              i.push(null);
          }
          return i;
        }, r.prototype.qb = function() {
          for (var i = [], l = _n(this.Qa), m = 0; m < l; m += 1) i.push(xn(this.Qa, m));
          return i;
        }, r.prototype.zb = function(i, l) {
          i = this.get(i, l), l = this.qb();
          for (var m = {}, d = 0; d < l.length; d += 1) m[l[d]] = i[d];
          return m;
        }, r.prototype.Sb = function() {
          return gr(this.Qa);
        }, r.prototype.Pb = function() {
          return mn(this.Qa);
        }, r.prototype.run = function(i) {
          return i != null && this.bind(i), this.step(), this.reset();
        }, r.prototype.wb = function(i, l) {
          l == null && (l = this.Oa, this.Oa += 1), i = Ye(i), this.mb.push(i), this.db.handleError(dn(this.Qa, l, i, -1, 0));
        }, r.prototype.Fb = function(i, l) {
          l == null && (l = this.Oa, this.Oa += 1);
          var m = Je(i.length);
          D.set(i, m), this.mb.push(m), this.db.handleError(kr(this.Qa, l, m, i.length, 0));
        }, r.prototype.vb = function(i, l) {
          l == null && (l = this.Oa, this.Oa += 1), this.db.handleError((i === (i | 0) ? wn : yn)(
            this.Qa,
            l,
            i
          ));
        }, r.prototype.Ib = function(i) {
          i == null && (i = this.Oa, this.Oa += 1), kr(this.Qa, i, 0, 0, 0);
        }, r.prototype.xb = function(i, l) {
          switch (l == null && (l = this.Oa, this.Oa += 1), typeof i) {
            case "string":
              this.wb(i, l);
              return;
            case "number":
              this.vb(i, l);
              return;
            case "bigint":
              this.wb(i.toString(), l);
              return;
            case "boolean":
              this.vb(i + 0, l);
              return;
            case "object":
              if (i === null) {
                this.Ib(l);
                return;
              }
              if (i.length != null) {
                this.Fb(i, l);
                return;
              }
          }
          throw "Wrong API use : tried to bind a value of an unknown type (" + i + ").";
        }, r.prototype.Hb = function(i) {
          var l = this;
          return Object.keys(i).forEach(function(m) {
            var d = bn(l.Qa, m);
            d !== 0 && l.xb(i[m], d);
          }), !0;
        }, r.prototype.Gb = function(i) {
          for (var l = 0; l < i.length; l += 1) this.xb(i[l], l + 1);
          return !0;
        }, r.prototype.reset = function() {
          return this.freemem(), Nn(this.Qa) === 0 && qn(this.Qa) === 0;
        }, r.prototype.freemem = function() {
          for (var i; (i = this.mb.pop()) !== void 0; ) Le(i);
        }, r.prototype.Ya = function() {
          this.freemem();
          var i = Mn(this.Qa) === 0;
          return delete this.db.gb[this.Qa], this.Qa = 0, i;
        }, n.prototype.next = function() {
          if (this.fb === null) return { done: !0 };
          if (this.$a !== null && (this.$a.Ya(), this.$a = null), !this.db.db) throw this.ob(), Error("Database closed");
          var i = Ke(), l = be(4);
          Re(s), Re(l);
          try {
            this.db.handleError(_r(this.db.db, this.lb, -1, s, l)), this.lb = ee(l, "i32");
            var m = ee(s, "i32");
            return m === 0 ? (this.ob(), { done: !0 }) : (this.$a = new r(m, this.db), this.db.gb[m] = this.$a, { value: this.$a, done: !1 });
          } catch (d) {
            throw this.sb = M(this.lb), this.ob(), d;
          } finally {
            Ze(i);
          }
        }, n.prototype.ob = function() {
          Le(this.fb), this.fb = null;
        }, n.prototype.Qb = function() {
          return this.sb !== null ? this.sb : M(this.lb);
        }, typeof Symbol == "function" && typeof Symbol.iterator == "symbol" && (n.prototype[Symbol.iterator] = function() {
          return this;
        }), o.prototype.run = function(i, l) {
          if (!this.db) throw "Database closed";
          if (l) {
            i = this.tb(i, l);
            try {
              i.step();
            } finally {
              i.Ya();
            }
          } else this.handleError(v(this.db, i, 0, 0, s));
          return this;
        }, o.prototype.exec = function(i, l, m) {
          if (!this.db) throw "Database closed";
          var d = null, g = null, E = null;
          try {
            E = g = Ye(i);
            var Q = be(4);
            for (i = []; ee(E, "i8") !== 0; ) {
              Re(s), Re(Q), this.handleError(_r(this.db, E, -1, s, Q));
              var H = ee(
                s,
                "i32"
              );
              if (E = ee(Q, "i32"), H !== 0) {
                var F = null;
                for (d = new r(H, this), l != null && d.bind(l); d.step(); ) F === null && (F = { columns: d.qb(), values: [] }, i.push(F)), F.values.push(d.get(null, m));
                d.Ya();
              }
            }
            return i;
          } catch (G) {
            throw d && d.Ya(), G;
          } finally {
            g && Le(g);
          }
        }, o.prototype.Mb = function(i, l, m, d, g) {
          typeof l == "function" && (d = m, m = l, l = void 0), i = this.tb(i, l);
          try {
            for (; i.step(); ) m(i.zb(null, g));
          } finally {
            i.Ya();
          }
          if (typeof d == "function") return d();
        }, o.prototype.tb = function(i, l) {
          if (Re(s), this.handleError(L(this.db, i, -1, s, 0)), i = ee(s, "i32"), i === 0) throw "Nothing to prepare";
          var m = new r(i, this);
          return l != null && m.bind(l), this.gb[i] = m;
        }, o.prototype.Ub = function(i) {
          return new n(i, this);
        }, o.prototype.Nb = function() {
          Object.values(this.gb).forEach(function(l) {
            l.Ya();
          }), Object.values(this.Sa).forEach(se), this.Sa = {}, this.handleError(k(this.db));
          var i = an(this.filename);
          return this.handleError(y(this.filename, s)), this.db = ee(s, "i32"), xr(this.db), i;
        }, o.prototype.close = function() {
          this.db !== null && (Object.values(this.gb).forEach(function(i) {
            i.Ya();
          }), Object.values(this.Sa).forEach(se), this.Sa = {}, this.Za && (se(this.Za), this.Za = void 0), this.handleError(k(this.db)), nr("/" + this.filename), this.db = null);
        }, o.prototype.handleError = function(i) {
          if (i === 0) return null;
          throw i = gn(this.db), Error(i);
        }, o.prototype.Rb = function() {
          return x(this.db);
        }, o.prototype.Kb = function(i, l) {
          Object.prototype.hasOwnProperty.call(this.Sa, i) && (se(this.Sa[i]), delete this.Sa[i]);
          var m = Te(function(d, g, E) {
            g = t(g, E);
            try {
              var Q = l.apply(null, g);
            } catch (H) {
              tt(d, H, -1);
              return;
            }
            e(d, Q);
          }, "viii");
          return this.Sa[i] = m, this.handleError(Sr(
            this.db,
            i,
            l.length,
            1,
            0,
            m,
            0,
            0,
            0
          )), this;
        }, o.prototype.Jb = function(i, l) {
          var m = l.init || function() {
            return null;
          }, d = l.finalize || function(F) {
            return F;
          }, g = l.step;
          if (!g) throw "An aggregate function must have a step function in " + i;
          var E = {};
          Object.hasOwnProperty.call(this.Sa, i) && (se(this.Sa[i]), delete this.Sa[i]), l = i + "__finalize", Object.hasOwnProperty.call(this.Sa, l) && (se(this.Sa[l]), delete this.Sa[l]);
          var Q = Te(function(F, G, Mt) {
            var ve = Pr(F, 1);
            Object.hasOwnProperty.call(E, ve) || (E[ve] = m()), G = t(G, Mt), G = [E[ve]].concat(G);
            try {
              E[ve] = g.apply(null, G);
            } catch (In) {
              delete E[ve], tt(F, In, -1);
            }
          }, "viii"), H = Te(function(F) {
            var G = Pr(F, 1);
            try {
              var Mt = d(E[G]);
            } catch (ve) {
              delete E[G], tt(F, ve, -1);
              return;
            }
            e(F, Mt), delete E[G];
          }, "vi");
          return this.Sa[i] = Q, this.Sa[l] = H, this.handleError(Sr(this.db, i, g.length - 1, 1, 0, 0, Q, H, 0)), this;
        }, o.prototype.Zb = function(i) {
          return this.Za && (qr(this.db, 0, 0), se(this.Za), this.Za = void 0), i ? (this.Za = Te(function(l, m, d, g, E) {
            switch (m) {
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
                throw "unknown operationCode in updateHook callback: " + m;
            }
            if (d = M(d), g = M(g), E > Number.MAX_SAFE_INTEGER) throw "rowId too big to fit inside a Number";
            i(l, d, g, Number(E));
          }, "viiiij"), qr(this.db, this.Za, 0), this) : this;
        }, r.prototype.bind = r.prototype.bind, r.prototype.step = r.prototype.step, r.prototype.get = r.prototype.get, r.prototype.getColumnNames = r.prototype.qb, r.prototype.getAsObject = r.prototype.zb, r.prototype.getSQL = r.prototype.Sb, r.prototype.getNormalizedSQL = r.prototype.Pb, r.prototype.run = r.prototype.run, r.prototype.reset = r.prototype.reset, r.prototype.freemem = r.prototype.freemem, r.prototype.free = r.prototype.Ya, n.prototype.next = n.prototype.next, n.prototype.getRemainingSQL = n.prototype.Qb, o.prototype.run = o.prototype.run, o.prototype.exec = o.prototype.exec, o.prototype.each = o.prototype.Mb, o.prototype.prepare = o.prototype.tb, o.prototype.iterateStatements = o.prototype.Ub, o.prototype.export = o.prototype.Nb, o.prototype.close = o.prototype.close, o.prototype.handleError = o.prototype.handleError, o.prototype.getRowsModified = o.prototype.Rb, o.prototype.create_function = o.prototype.Kb, o.prototype.create_aggregate = o.prototype.Jb, o.prototype.updateHook = o.prototype.Zb, a.Database = o;
      };
      var re = "./this.program", fe = (e, t) => {
        throw t;
      }, ce = (vr = (br = globalThis.document) == null ? void 0 : br.currentScript) == null ? void 0 : vr.src;
      typeof __filename < "u" ? ce = __filename : Z && (ce = self.location.href);
      var he = "", ge, ne;
      if (K) {
        var _e = R;
        he = __dirname + "/", ne = (e) => (e = je(e) ? new URL(e) : e, _e.readFileSync(e)), ge = async (e) => (e = je(e) ? new URL(e) : e, _e.readFileSync(e, void 0)), 1 < process.argv.length && (re = process.argv[1].replace(/\\/g, "/")), process.argv.slice(2), f.exports = a, fe = (e, t) => {
          throw process.exitCode = e, t;
        };
      } else if (N || Z) {
        try {
          he = new URL(".", ce).href;
        } catch {
        }
        Z && (ne = (e) => {
          var t = new XMLHttpRequest();
          return t.open("GET", e, !1), t.responseType = "arraybuffer", t.send(null), new Uint8Array(t.response);
        }), ge = async (e) => {
          if (je(e)) return new Promise((r, n) => {
            var o = new XMLHttpRequest();
            o.open("GET", e, !0), o.responseType = "arraybuffer", o.onload = () => {
              o.status == 200 || o.status == 0 && o.response ? r(o.response) : n(o.status);
            }, o.onerror = n, o.send(null);
          });
          var t = await fetch(e, { credentials: "same-origin" });
          if (t.ok) return t.arrayBuffer();
          throw Error(t.status + " : " + t.url);
        };
      }
      var ut = console.log.bind(console), pe = console.error.bind(console), xe, $e = !1, lt, je = (e) => e.startsWith("file://"), D, $, qe, q, A, ft, ct, V;
      function Ct() {
        var e = et.buffer;
        D = new Int8Array(e), qe = new Int16Array(e), $ = new Uint8Array(e), q = new Int32Array(e), A = new Uint32Array(e), ft = new Float32Array(e), ct = new Float64Array(e), V = new BigInt64Array(e), new BigUint64Array(e);
      }
      function Ne(e) {
        var t;
        throw (t = a.onAbort) == null || t.call(a, e), e = "Aborted(" + e + ")", pe(e), $e = !0, new WebAssembly.RuntimeError(e + ". Build with -sASSERTIONS for more info.");
      }
      var ht;
      async function Hr(e) {
        if (!xe) try {
          var t = await ge(e);
          return new Uint8Array(t);
        } catch {
        }
        if (e == ht && xe) e = new Uint8Array(xe);
        else if (ne) e = ne(e);
        else throw "both async and sync fetching of the wasm failed";
        return e;
      }
      async function Vr(e, t) {
        try {
          var r = await Hr(e);
          return await WebAssembly.instantiate(r, t);
        } catch (n) {
          pe(`failed to asynchronously prepare wasm: ${n}`), Ne(n);
        }
      }
      async function Qr(e) {
        var t = ht;
        if (!xe && !je(t) && !K) try {
          var r = fetch(t, { credentials: "same-origin" });
          return await WebAssembly.instantiateStreaming(r, e);
        } catch (n) {
          pe(`wasm streaming compile failed: ${n}`), pe("falling back to ArrayBuffer instantiation");
        }
        return Vr(t, e);
      }
      class pt {
        constructor(t) {
          ue(this, "name", "ExitStatus");
          this.message = `Program terminated with exit(${t})`, this.status = t;
        }
      }
      var Ut = (e) => {
        for (; 0 < e.length; ) e.shift()(a);
      }, $t = [], jt = [], Gr = () => {
        var e = a.preRun.shift();
        jt.push(e);
      }, me = 0, Me = null;
      function ee(e, t = "i8") {
        switch (t.endsWith("*") && (t = "*"), t) {
          case "i1":
            return D[e];
          case "i8":
            return D[e];
          case "i16":
            return qe[e >> 1];
          case "i32":
            return q[e >> 2];
          case "i64":
            return V[e >> 3];
          case "float":
            return ft[e >> 2];
          case "double":
            return ct[e >> 3];
          case "*":
            return A[e >> 2];
          default:
            Ne(`invalid type for getValue: ${t}`);
        }
      }
      var Ie = !0;
      function Re(e) {
        var t = "i32";
        switch (t.endsWith("*") && (t = "*"), t) {
          case "i1":
            D[e] = 0;
            break;
          case "i8":
            D[e] = 0;
            break;
          case "i16":
            qe[e >> 1] = 0;
            break;
          case "i32":
            q[e >> 2] = 0;
            break;
          case "i64":
            V[e >> 3] = BigInt(0);
            break;
          case "float":
            ft[e >> 2] = 0;
            break;
          case "double":
            ct[e >> 3] = 0;
            break;
          case "*":
            A[e >> 2] = 0;
            break;
          default:
            Ne(`invalid type for setValue: ${t}`);
        }
      }
      var It = new TextDecoder(), Bt = (e, t, r, n) => {
        if (r = t + r, n) return r;
        for (; e[t] && !(t >= r); ) ++t;
        return t;
      }, M = (e, t, r) => e ? It.decode($.subarray(e, Bt($, e, t, r))) : "", Wt = (e, t) => {
        for (var r = 0, n = e.length - 1; 0 <= n; n--) {
          var o = e[n];
          o === "." ? e.splice(n, 1) : o === ".." ? (e.splice(n, 1), r++) : r && (e.splice(n, 1), r--);
        }
        if (t) for (; r; r--) e.unshift("..");
        return e;
      }, mt = (e) => {
        var t = e.charAt(0) === "/", r = e.slice(-1) === "/";
        return (e = Wt(e.split("/").filter((n) => !!n), !t).join("/")) || t || (e = "."), e && r && (e += "/"), (t ? "/" : "") + e;
      }, Ft = (e) => {
        var t = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(e).slice(1);
        return e = t[0], t = t[1], !e && !t ? "." : (t && (t = t.slice(0, -1)), e + t);
      }, Be = (e) => e && e.match(/([^\/]+|\/)\/*$/)[1], Xr = () => {
        if (K) {
          var e = Dr;
          return (t) => e.randomFillSync(t);
        }
        return (t) => crypto.getRandomValues(t);
      }, zt = (e) => {
        (zt = Xr())(e);
      }, Yr = (...e) => {
        for (var t = "", r = !1, n = e.length - 1; -1 <= n && !r; n--) {
          if (r = 0 <= n ? e[n] : "/", typeof r != "string") throw new TypeError("Arguments to path.resolve must be strings");
          if (!r) return "";
          t = r + "/" + t, r = r.charAt(0) === "/";
        }
        return t = Wt(t.split("/").filter((o) => !!o), !r).join("/"), (r ? "/" : "") + t || ".";
      }, We = (e) => {
        var t = Bt(e, 0);
        return It.decode(e.buffer ? e.subarray(0, t) : new Uint8Array(e.slice(0, t)));
      }, dt = [], ke = (e) => {
        for (var t = 0, r = 0; r < e.length; ++r) {
          var n = e.charCodeAt(r);
          127 >= n ? t++ : 2047 >= n ? t += 2 : 55296 <= n && 57343 >= n ? (t += 4, ++r) : t += 3;
        }
        return t;
      }, Y = (e, t, r, n) => {
        if (!(0 < n)) return 0;
        var o = r;
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
        return t[r] = 0, r - o;
      }, Ht = [];
      function Vt(e, t) {
        Ht[e] = { input: [], output: [], eb: t }, _t(e, Jr);
      }
      var Jr = { open(e) {
        var t = Ht[e.node.rdev];
        if (!t) throw new c(43);
        e.tty = t, e.seekable = !1;
      }, close(e) {
        e.tty.eb.fsync(e.tty);
      }, fsync(e) {
        e.tty.eb.fsync(e.tty);
      }, read(e, t, r, n) {
        if (!e.tty || !e.tty.eb.Bb) throw new c(60);
        for (var o = 0, s = 0; s < n; s++) {
          try {
            var u = e.tty.eb.Bb(e.tty);
          } catch {
            throw new c(29);
          }
          if (u === void 0 && o === 0) throw new c(6);
          if (u == null) break;
          o++, t[r + s] = u;
        }
        return o && (e.node.atime = Date.now()), o;
      }, write(e, t, r, n) {
        if (!e.tty || !e.tty.eb.ub) throw new c(60);
        try {
          for (var o = 0; o < n; o++) e.tty.eb.ub(e.tty, t[r + o]);
        } catch {
          throw new c(29);
        }
        return n && (e.node.mtime = e.node.ctime = Date.now()), o;
      } }, Zr = { Bb() {
        var o;
        e: {
          if (!dt.length) {
            var e = null;
            if (K) {
              var t = Buffer.alloc(256), r = 0, n = process.stdin.fd;
              try {
                r = _e.readSync(n, t, 0, 256);
              } catch (s) {
                if (s.toString().includes("EOF")) r = 0;
                else throw s;
              }
              0 < r && (e = t.slice(0, r).toString("utf-8"));
            } else (o = globalThis.window) != null && o.prompt && (e = window.prompt("Input: "), e !== null && (e += `
`));
            if (!e) {
              e = null;
              break e;
            }
            t = Array(ke(e) + 1), e = Y(e, t, 0, t.length), t.length = e, dt = t;
          }
          e = dt.shift();
        }
        return e;
      }, ub(e, t) {
        t === null || t === 10 ? (ut(We(e.output)), e.output = []) : t != 0 && e.output.push(t);
      }, fsync(e) {
        var t;
        0 < ((t = e.output) == null ? void 0 : t.length) && (ut(We(e.output)), e.output = []);
      }, hc() {
        return { bc: 25856, dc: 5, ac: 191, cc: 35387, $b: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
      }, ic() {
        return 0;
      }, jc() {
        return [24, 80];
      } }, Kr = { ub(e, t) {
        t === null || t === 10 ? (pe(We(e.output)), e.output = []) : t != 0 && e.output.push(t);
      }, fsync(e) {
        var t;
        0 < ((t = e.output) == null ? void 0 : t.length) && (pe(We(e.output)), e.output = []);
      } }, w = { Wa: null, Xa() {
        return w.createNode(null, "/", 16895, 0);
      }, createNode(e, t, r, n) {
        if ((r & 61440) === 24576 || (r & 61440) === 4096) throw new c(63);
        return w.Wa || (w.Wa = { dir: { node: { Ta: w.La.Ta, Ua: w.La.Ua, lookup: w.La.lookup, ib: w.La.ib, rename: w.La.rename, unlink: w.La.unlink, rmdir: w.La.rmdir, readdir: w.La.readdir, symlink: w.La.symlink }, stream: { Va: w.Ma.Va } }, file: { node: { Ta: w.La.Ta, Ua: w.La.Ua }, stream: { Va: w.Ma.Va, read: w.Ma.read, write: w.Ma.write, jb: w.Ma.jb, kb: w.Ma.kb } }, link: { node: { Ta: w.La.Ta, Ua: w.La.Ua, readlink: w.La.readlink }, stream: {} }, yb: { node: { Ta: w.La.Ta, Ua: w.La.Ua }, stream: on } }), r = Jt(e, t, r, n), B(r.mode) ? (r.La = w.Wa.dir.node, r.Ma = w.Wa.dir.stream, r.Na = {}) : (r.mode & 61440) === 32768 ? (r.La = w.Wa.file.node, r.Ma = w.Wa.file.stream, r.Ra = 0, r.Na = null) : (r.mode & 61440) === 40960 ? (r.La = w.Wa.link.node, r.Ma = w.Wa.link.stream) : (r.mode & 61440) === 8192 && (r.La = w.Wa.yb.node, r.Ma = w.Wa.yb.stream), r.atime = r.mtime = r.ctime = Date.now(), e && (e.Na[t] = r, e.atime = e.mtime = e.ctime = r.atime), r;
      }, fc(e) {
        return e.Na ? e.Na.subarray ? e.Na.subarray(0, e.Ra) : new Uint8Array(e.Na) : new Uint8Array(0);
      }, La: {
        Ta(e) {
          var t = {};
          return t.dev = (e.mode & 61440) === 8192 ? e.id : 1, t.ino = e.id, t.mode = e.mode, t.nlink = 1, t.uid = 0, t.gid = 0, t.rdev = e.rdev, B(e.mode) ? t.size = 4096 : (e.mode & 61440) === 32768 ? t.size = e.Ra : (e.mode & 61440) === 40960 ? t.size = e.link.length : t.size = 0, t.atime = new Date(e.atime), t.mtime = new Date(e.mtime), t.ctime = new Date(e.ctime), t.blksize = 4096, t.blocks = Math.ceil(t.size / t.blksize), t;
        },
        Ua(e, t) {
          for (var r of ["mode", "atime", "mtime", "ctime"]) t[r] != null && (e[r] = t[r]);
          t.size !== void 0 && (t = t.size, e.Ra != t && (t == 0 ? (e.Na = null, e.Ra = 0) : (r = e.Na, e.Na = new Uint8Array(t), r && e.Na.set(r.subarray(0, Math.min(t, e.Ra))), e.Ra = t)));
        },
        lookup() {
          throw w.nb || (w.nb = new c(44), w.nb.stack = "<generic error, no stack>"), w.nb;
        },
        ib(e, t, r, n) {
          return w.createNode(e, t, r, n);
        },
        rename(e, t, r) {
          try {
            var n = de(t, r);
          } catch {
          }
          if (n) {
            if (B(e.mode)) for (var o in n.Na) throw new c(55);
            vt(n);
          }
          delete e.parent.Na[e.name], t.Na[r] = e, e.name = r, t.ctime = t.mtime = e.parent.ctime = e.parent.mtime = Date.now();
        },
        unlink(e, t) {
          delete e.Na[t], e.ctime = e.mtime = Date.now();
        },
        rmdir(e, t) {
          var r = de(e, t), n;
          for (n in r.Na) throw new c(55);
          delete e.Na[t], e.ctime = e.mtime = Date.now();
        },
        readdir(e) {
          return [".", "..", ...Object.keys(e.Na)];
        },
        symlink(e, t, r) {
          return e = w.createNode(e, t, 41471, 0), e.link = r, e;
        },
        readlink(e) {
          if ((e.mode & 61440) !== 40960) throw new c(28);
          return e.link;
        }
      }, Ma: { read(e, t, r, n, o) {
        var s = e.node.Na;
        if (o >= e.node.Ra) return 0;
        if (e = Math.min(e.node.Ra - o, n), 8 < e && s.subarray) t.set(s.subarray(o, o + e), r);
        else for (n = 0; n < e; n++) t[r + n] = s[o + n];
        return e;
      }, write(e, t, r, n, o, s) {
        if (t.buffer === D.buffer && (s = !1), !n) return 0;
        if (e = e.node, e.mtime = e.ctime = Date.now(), t.subarray && (!e.Na || e.Na.subarray)) {
          if (s) return e.Na = t.subarray(r, r + n), e.Ra = n;
          if (e.Ra === 0 && o === 0) return e.Na = t.slice(r, r + n), e.Ra = n;
          if (o + n <= e.Ra) return e.Na.set(t.subarray(r, r + n), o), n;
        }
        s = o + n;
        var u = e.Na ? e.Na.length : 0;
        if (u >= s || (s = Math.max(s, u * (1048576 > u ? 2 : 1.125) >>> 0), u != 0 && (s = Math.max(s, 256)), u = e.Na, e.Na = new Uint8Array(s), 0 < e.Ra && e.Na.set(u.subarray(0, e.Ra), 0)), e.Na.subarray && t.subarray) e.Na.set(t.subarray(r, r + n), o);
        else for (s = 0; s < n; s++) e.Na[o + s] = t[r + s];
        return e.Ra = Math.max(e.Ra, o + n), n;
      }, Va(e, t, r) {
        if (r === 1 ? t += e.position : r === 2 && (e.node.mode & 61440) === 32768 && (t += e.node.Ra), 0 > t) throw new c(28);
        return t;
      }, jb(e, t, r, n, o) {
        if ((e.node.mode & 61440) !== 32768) throw new c(43);
        if (e = e.node.Na, o & 2 || !e || e.buffer !== D.buffer) {
          o = !0, n = 65536 * Math.ceil(t / 65536);
          var s = pr(65536, n);
          if (s && $.fill(0, s, s + n), n = s, !n) throw new c(48);
          e && ((0 < r || r + t < e.length) && (e.subarray ? e = e.subarray(r, r + t) : e = Array.prototype.slice.call(e, r, r + t)), D.set(e, n));
        } else o = !1, n = e.byteOffset;
        return { Xb: n, Eb: o };
      }, kb(e, t, r, n) {
        return w.Ma.write(e, t, 0, n, r, !1), 0;
      } } }, Qt = (e, t) => {
        var r = 0;
        return e && (r |= 365), t && (r |= 146), r;
      }, yt = null, Gt = {}, Ee = [], en = 1, oe = null, Xt = !1, Yt = !0, c = class {
        constructor(e) {
          ue(this, "name", "ErrnoError");
          this.Pa = e;
        }
      }, tn = class {
        constructor() {
          ue(this, "hb", {});
          ue(this, "node", null);
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
      }, rn = class {
        constructor(e, t, r, n) {
          ue(this, "La", {});
          ue(this, "Ma", {});
          ue(this, "bb", null);
          e || (e = this), this.parent = e, this.Xa = e.Xa, this.id = en++, this.name = t, this.mode = r, this.rdev = n, this.atime = this.mtime = this.ctime = Date.now();
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
      function z(e, t = {}) {
        if (!e) throw new c(44);
        t.pb ?? (t.pb = !0), e.charAt(0) === "/" || (e = "//" + e);
        var r = 0;
        e: for (; 40 > r; r++) {
          e = e.split("/").filter((y) => !!y);
          for (var n = yt, o = "/", s = 0; s < e.length; s++) {
            var u = s === e.length - 1;
            if (u && t.parent) break;
            if (e[s] !== ".") if (e[s] === "..") if (o = Ft(o), n === n.parent) {
              e = o + "/" + e.slice(s + 1).join("/"), r--;
              continue e;
            } else n = n.parent;
            else {
              o = mt(o + "/" + e[s]);
              try {
                n = de(n, e[s]);
              } catch (y) {
                if ((y == null ? void 0 : y.Pa) === 44 && u && t.Wb) return { path: o };
                throw y;
              }
              if (!n.bb || u && !t.pb || (n = n.bb.root), (n.mode & 61440) === 40960 && (!u || t.ab)) {
                if (!n.La.readlink) throw new c(52);
                n = n.La.readlink(n), n.charAt(0) === "/" || (n = Ft(o) + "/" + n), e = n + "/" + e.slice(s + 1).join("/");
                continue e;
              }
            }
          }
          return { path: o, node: n };
        }
        throw new c(32);
      }
      function wt(e) {
        for (var t; ; ) {
          if (e === e.parent) return e = e.Xa.Db, t ? e[e.length - 1] !== "/" ? `${e}/${t}` : e + t : e;
          t = t ? `${e.name}/${t}` : e.name, e = e.parent;
        }
      }
      function bt(e, t) {
        for (var r = 0, n = 0; n < t.length; n++) r = (r << 5) - r + t.charCodeAt(n) | 0;
        return (e + r >>> 0) % oe.length;
      }
      function vt(e) {
        var t = bt(e.parent.id, e.name);
        if (oe[t] === e) oe[t] = e.cb;
        else for (t = oe[t]; t; ) {
          if (t.cb === e) {
            t.cb = e.cb;
            break;
          }
          t = t.cb;
        }
      }
      function de(e, t) {
        var r = B(e.mode) ? (r = Se(e, "x")) ? r : e.La.lookup ? 0 : 2 : 54;
        if (r) throw new c(r);
        for (r = oe[bt(e.id, t)]; r; r = r.cb) {
          var n = r.name;
          if (r.parent.id === e.id && n === t) return r;
        }
        return e.La.lookup(e, t);
      }
      function Jt(e, t, r, n) {
        return e = new rn(e, t, r, n), t = bt(e.parent.id, e.name), e.cb = oe[t], oe[t] = e;
      }
      function B(e) {
        return (e & 61440) === 16384;
      }
      function Se(e, t) {
        return Yt ? 0 : t.includes("r") && !(e.mode & 292) || t.includes("w") && !(e.mode & 146) || t.includes("x") && !(e.mode & 73) ? 2 : 0;
      }
      function Zt(e, t) {
        if (!B(e.mode)) return 54;
        try {
          return de(e, t), 20;
        } catch {
        }
        return Se(e, "wx");
      }
      function Kt(e, t, r) {
        try {
          var n = de(e, t);
        } catch (o) {
          return o.Pa;
        }
        if (e = Se(e, "wx")) return e;
        if (r) {
          if (!B(n.mode)) return 54;
          if (n === n.parent || wt(n) === "/") return 10;
        } else if (B(n.mode)) return 31;
        return 0;
      }
      function Fe(e) {
        if (!e) throw new c(63);
        return e;
      }
      function j(e) {
        if (e = Ee[e], !e) throw new c(8);
        return e;
      }
      function er(e, t = -1) {
        if (e = Object.assign(new tn(), e), t == -1) e: {
          for (t = 0; 4096 >= t; t++) if (!Ee[t]) break e;
          throw new c(33);
        }
        return e.fd = t, Ee[t] = e;
      }
      function nn(e, t = -1) {
        var r, n;
        return e = er(e, t), (n = (r = e.Ma) == null ? void 0 : r.ec) == null || n.call(r, e), e;
      }
      function gt(e, t, r) {
        var n = e == null ? void 0 : e.Ma.Ua;
        e = n ? e : t, n ?? (n = t.La.Ua), Fe(n), n(e, r);
      }
      var on = { open(e) {
        var t, r;
        e.Ma = Gt[e.node.rdev].Ma, (r = (t = e.Ma).open) == null || r.call(t, e);
      }, Va() {
        throw new c(70);
      } };
      function _t(e, t) {
        Gt[e] = { Ma: t };
      }
      function tr(e, t) {
        var r = t === "/";
        if (r && yt) throw new c(10);
        if (!r && t) {
          var n = z(t, { pb: !1 });
          if (t = n.path, n = n.node, n.bb) throw new c(10);
          if (!B(n.mode)) throw new c(54);
        }
        t = { type: e, kc: {}, Db: t, Vb: [] }, e = e.Xa(t), e.Xa = t, t.root = e, r ? yt = e : n && (n.bb = t, n.Xa && n.Xa.Vb.push(t));
      }
      function ze(e, t, r) {
        var n = z(e, { parent: !0 }).node;
        if (e = Be(e), !e) throw new c(28);
        if (e === "." || e === "..") throw new c(20);
        var o = Zt(n, e);
        if (o) throw new c(o);
        if (!n.La.ib) throw new c(63);
        return n.La.ib(n, e, t, r);
      }
      function sn(e, t = 438) {
        return ze(e, t & 4095 | 32768, 0);
      }
      function J(e, t = 511) {
        return ze(e, t & 1023 | 16384, 0);
      }
      function He(e, t, r) {
        typeof r > "u" && (r = t, t = 438), ze(e, t | 8192, r);
      }
      function kt(e, t) {
        if (!Yr(e)) throw new c(44);
        var r = z(t, { parent: !0 }).node;
        if (!r) throw new c(44);
        t = Be(t);
        var n = Zt(r, t);
        if (n) throw new c(n);
        if (!r.La.symlink) throw new c(63);
        r.La.symlink(r, t, e);
      }
      function rr(e) {
        var t = z(e, { parent: !0 }).node;
        e = Be(e);
        var r = de(t, e), n = Kt(t, e, !0);
        if (n) throw new c(n);
        if (!t.La.rmdir) throw new c(63);
        if (r.bb) throw new c(10);
        t.La.rmdir(t, e), vt(r);
      }
      function nr(e) {
        var t = z(e, { parent: !0 }).node;
        if (!t) throw new c(44);
        e = Be(e);
        var r = de(t, e), n = Kt(t, e, !1);
        if (n) throw new c(n);
        if (!t.La.unlink) throw new c(63);
        if (r.bb) throw new c(10);
        t.La.unlink(t, e), vt(r);
      }
      function Oe(e, t) {
        return e = z(e, { ab: !t }).node, Fe(e.La.Ta)(e);
      }
      function or(e, t, r, n) {
        gt(e, t, { mode: r & 4095 | t.mode & -4096, ctime: Date.now(), Lb: n });
      }
      function Ve(e, t) {
        e = typeof e == "string" ? z(e, { ab: !0 }).node : e, or(null, e, t);
      }
      function ir(e, t, r) {
        if (B(t.mode)) throw new c(31);
        if ((t.mode & 61440) !== 32768) throw new c(28);
        var n = Se(t, "w");
        if (n) throw new c(n);
        gt(e, t, { size: r, timestamp: Date.now() });
      }
      function Ae(e, t, r = 438) {
        if (e === "") throw new c(44);
        if (typeof t == "string") {
          var n = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[t];
          if (typeof n > "u") throw Error(`Unknown file open mode: ${t}`);
          t = n;
        }
        if (r = t & 64 ? r & 4095 | 32768 : 0, typeof e == "object") n = e;
        else {
          var o = e.endsWith("/"), s = z(e, { ab: !(t & 131072), Wb: !0 });
          n = s.node, e = s.path;
        }
        if (s = !1, t & 64) if (n) {
          if (t & 128) throw new c(20);
        } else {
          if (o) throw new c(31);
          n = ze(e, r | 511, 0), s = !0;
        }
        if (!n) throw new c(44);
        if ((n.mode & 61440) === 8192 && (t &= -513), t & 65536 && !B(n.mode)) throw new c(54);
        if (!s && (n ? (n.mode & 61440) === 40960 ? o = 32 : (o = ["r", "w", "rw"][t & 3], t & 512 && (o += "w"), o = B(n.mode) && (o !== "r" || t & 576) ? 31 : Se(n, o)) : o = 44, o)) throw new c(o);
        return t & 512 && !s && (o = n, o = typeof o == "string" ? z(o, { ab: !0 }).node : o, ir(null, o, 0)), t = er({ node: n, path: wt(n), flags: t & -131713, seekable: !0, position: 0, Ma: n.Ma, Yb: [], error: !1 }), t.Ma.open && t.Ma.open(t), s && Ve(n, r & 511), t;
      }
      function Et(e) {
        if (e.fd === null) throw new c(8);
        e.rb && (e.rb = null);
        try {
          e.Ma.close && e.Ma.close(e);
        } catch (t) {
          throw t;
        } finally {
          Ee[e.fd] = null;
        }
        e.fd = null;
      }
      function sr(e, t, r) {
        if (e.fd === null) throw new c(8);
        if (!e.seekable || !e.Ma.Va) throw new c(70);
        if (r != 0 && r != 1 && r != 2) throw new c(28);
        e.position = e.Ma.Va(e, t, r), e.Yb = [];
      }
      function ar(e, t, r, n, o) {
        if (0 > n || 0 > o) throw new c(28);
        if (e.fd === null) throw new c(8);
        if ((e.flags & 2097155) === 1) throw new c(8);
        if (B(e.node.mode)) throw new c(31);
        if (!e.Ma.read) throw new c(28);
        var s = typeof o < "u";
        if (!s) o = e.position;
        else if (!e.seekable) throw new c(70);
        return t = e.Ma.read(e, t, r, n, o), s || (e.position += t), t;
      }
      function ur(e, t, r, n, o) {
        if (0 > n || 0 > o) throw new c(28);
        if (e.fd === null) throw new c(8);
        if (!(e.flags & 2097155)) throw new c(8);
        if (B(e.node.mode)) throw new c(31);
        if (!e.Ma.write) throw new c(28);
        e.seekable && e.flags & 1024 && sr(e, 0, 2);
        var s = typeof o < "u";
        if (!s) o = e.position;
        else if (!e.seekable) throw new c(70);
        return t = e.Ma.write(e, t, r, n, o, void 0), s || (e.position += t), t;
      }
      function an(e) {
        var t = t || 0;
        t = Ae(e, t), e = Oe(e).size;
        var r = new Uint8Array(e);
        return ar(t, r, 0, e, 0), Et(t), r;
      }
      function ie(e, t, r) {
        e = mt("/dev/" + e);
        var n = Qt(!!t, !!r);
        ie.Cb ?? (ie.Cb = 64);
        var o = ie.Cb++ << 8 | 0;
        _t(o, { open(s) {
          s.seekable = !1;
        }, close() {
          var s;
          (s = r == null ? void 0 : r.buffer) != null && s.length && r(10);
        }, read(s, u, y, k) {
          for (var v = 0, x = 0; x < k; x++) {
            try {
              var L = t();
            } catch {
              throw new c(29);
            }
            if (L === void 0 && v === 0) throw new c(6);
            if (L == null) break;
            v++, u[y + x] = L;
          }
          return v && (s.node.atime = Date.now()), v;
        }, write(s, u, y, k) {
          for (var v = 0; v < k; v++) try {
            r(u[y + v]);
          } catch {
            throw new c(29);
          }
          return k && (s.node.mtime = s.node.ctime = Date.now()), v;
        } }), He(e, n, o);
      }
      var P = {};
      function ye(e, t, r) {
        if (t.charAt(0) === "/") return t;
        if (e = e === -100 ? "/" : j(e).path, t.length == 0) {
          if (!r) throw new c(44);
          return e;
        }
        return e + "/" + t;
      }
      function Qe(e, t) {
        A[e >> 2] = t.dev, A[e + 4 >> 2] = t.mode, A[e + 8 >> 2] = t.nlink, A[e + 12 >> 2] = t.uid, A[e + 16 >> 2] = t.gid, A[e + 20 >> 2] = t.rdev, V[e + 24 >> 3] = BigInt(t.size), q[e + 32 >> 2] = 4096, q[e + 36 >> 2] = t.blocks;
        var r = t.atime.getTime(), n = t.mtime.getTime(), o = t.ctime.getTime();
        return V[e + 40 >> 3] = BigInt(Math.floor(r / 1e3)), A[e + 48 >> 2] = r % 1e3 * 1e6, V[e + 56 >> 3] = BigInt(Math.floor(n / 1e3)), A[e + 64 >> 2] = n % 1e3 * 1e6, V[e + 72 >> 3] = BigInt(Math.floor(o / 1e3)), A[e + 80 >> 2] = o % 1e3 * 1e6, V[e + 88 >> 3] = BigInt(t.ino), 0;
      }
      var Ge = void 0, Xe = () => {
        var e = q[+Ge >> 2];
        return Ge += 4, e;
      }, St = 0, un = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], ln = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], De = {}, lr = (e) => {
        var t;
        lt = e, Ie || 0 < St || ((t = a.onExit) == null || t.call(a, e), $e = !0), fe(e, new pt(e));
      }, fn = (e) => {
        if (!$e) try {
          e();
        } catch (t) {
          t instanceof pt || t == "unwind" || fe(1, t);
        } finally {
          if (!(Ie || 0 < St)) try {
            lt = e = lt, lr(e);
          } catch (t) {
            t instanceof pt || t == "unwind" || fe(1, t);
          }
        }
      }, At = {}, fr = () => {
        var n;
        if (!Pt) {
          var e = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (((n = globalThis.navigator) == null ? void 0 : n.language) ?? "C").replace("-", "_") + ".UTF-8", _: re || "./this.program" }, t;
          for (t in At) At[t] === void 0 ? delete e[t] : e[t] = At[t];
          var r = [];
          for (t in e) r.push(`${t}=${e[t]}`);
          Pt = r;
        }
        return Pt;
      }, Pt, cn = (e, t, r, n) => {
        var o = { string: (v) => {
          var x = 0;
          if (v != null && v !== 0) {
            x = ke(v) + 1;
            var L = be(x);
            Y(v, $, L, x), x = L;
          }
          return x;
        }, array: (v) => {
          var x = be(v.length);
          return D.set(v, x), x;
        } };
        e = a["_" + e];
        var s = [], u = 0;
        if (n) for (var y = 0; y < n.length; y++) {
          var k = o[r[y]];
          k ? (u === 0 && (u = Ke()), s[y] = k(n[y])) : s[y] = n[y];
        }
        return r = e(...s), r = function(v) {
          return u !== 0 && Ze(u), t === "string" ? M(v) : t === "boolean" ? !!v : v;
        }(r);
      }, Ye = (e) => {
        var t = ke(e) + 1, r = Je(t);
        return r && Y(e, $, r, t), r;
      }, we, xt = [], se = (e) => {
        we.delete(ae.get(e)), ae.set(e, null), xt.push(e);
      }, cr = (e) => {
        const t = e.length;
        return [t % 128 | 128, t >> 7, ...e];
      }, hn = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 }, hr = (e) => cr(Array.from(e, (t) => hn[t])), Te = (e, t) => {
        if (!we) {
          we = /* @__PURE__ */ new WeakMap();
          var r = ae.length;
          if (we) for (var n = 0; n < 0 + r; n++) {
            var o = ae.get(n);
            o && we.set(o, n);
          }
        }
        if (r = we.get(e) || 0) return r;
        r = xt.length ? xt.pop() : ae.grow(1);
        try {
          ae.set(r, e);
        } catch (s) {
          if (!(s instanceof TypeError)) throw s;
          t = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...cr([1, 96, ...hr(t.slice(1)), ...hr(t[0] === "v" ? "" : t[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0), t = new WebAssembly.Module(t), t = new WebAssembly.Instance(t, { e: { f: e } }).exports.f, ae.set(r, t);
        }
        return we.set(e, r), r;
      };
      if (oe = Array(4096), tr(w, "/"), J("/tmp"), J("/home"), J("/home/web_user"), function() {
        J("/dev"), _t(259, { read: () => 0, write: (n, o, s, u) => u, Va: () => 0 }), He("/dev/null", 259), Vt(1280, Zr), Vt(1536, Kr), He("/dev/tty", 1280), He("/dev/tty1", 1536);
        var e = new Uint8Array(1024), t = 0, r = () => (t === 0 && (zt(e), t = e.byteLength), e[--t]);
        ie("random", r), ie("urandom", r), J("/dev/shm"), J("/dev/shm/tmp");
      }(), function() {
        J("/proc");
        var e = J("/proc/self");
        J("/proc/self/fd"), tr({ Xa() {
          var t = Jt(e, "fd", 16895, 73);
          return t.Ma = { Va: w.Ma.Va }, t.La = { lookup(r, n) {
            r = +n;
            var o = j(r);
            return r = { parent: null, Xa: { Db: "fake" }, La: { readlink: () => o.path }, id: r + 1 }, r.parent = r;
          }, readdir() {
            return Array.from(Ee.entries()).filter(([, r]) => r).map(([r]) => r.toString());
          } }, t;
        } }, "/proc/self/fd");
      }(), a.noExitRuntime && (Ie = a.noExitRuntime), a.print && (ut = a.print), a.printErr && (pe = a.printErr), a.wasmBinary && (xe = a.wasmBinary), a.thisProgram && (re = a.thisProgram), a.preInit) for (typeof a.preInit == "function" && (a.preInit = [a.preInit]); 0 < a.preInit.length; ) a.preInit.shift()();
      a.stackSave = () => Ke(), a.stackRestore = (e) => Ze(e), a.stackAlloc = (e) => be(e), a.cwrap = (e, t, r, n) => {
        var o = !r || r.every((s) => s === "number" || s === "boolean");
        return t !== "string" && o && !n ? a["_" + e] : (...s) => cn(e, t, r, s);
      }, a.addFunction = Te, a.removeFunction = se, a.UTF8ToString = M, a.stringToNewUTF8 = Ye, a.writeArrayToMemory = (e, t) => {
        D.set(e, t);
      };
      var Je, Le, pr, mr, Ze, be, Ke, et, ae, pn = {
        a: (e, t, r, n) => Ne(`Assertion failed: ${M(e)}, at: ` + [t ? M(t) : "unknown filename", r, n ? M(n) : "unknown function"]),
        i: function(e, t) {
          try {
            return e = M(e), Ve(e, t), 0;
          } catch (r) {
            if (typeof P > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        L: function(e, t, r) {
          try {
            if (t = M(t), t = ye(e, t), r & -8) return -28;
            var n = z(t, { ab: !0 }).node;
            return n ? (e = "", r & 4 && (e += "r"), r & 2 && (e += "w"), r & 1 && (e += "x"), e && Se(n, e) ? -2 : 0) : -44;
          } catch (o) {
            if (typeof P > "u" || o.name !== "ErrnoError") throw o;
            return -o.Pa;
          }
        },
        j: function(e, t) {
          try {
            var r = j(e);
            return or(r, r.node, t, !1), 0;
          } catch (n) {
            if (typeof P > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        h: function(e) {
          try {
            var t = j(e);
            return gt(t, t.node, { timestamp: Date.now(), Lb: !1 }), 0;
          } catch (r) {
            if (typeof P > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        b: function(e, t, r) {
          Ge = r;
          try {
            var n = j(e);
            switch (t) {
              case 0:
                var o = Xe();
                if (0 > o) break;
                for (; Ee[o]; ) o++;
                return nn(n, o).fd;
              case 1:
              case 2:
                return 0;
              case 3:
                return n.flags;
              case 4:
                return o = Xe(), n.flags |= o, 0;
              case 12:
                return o = Xe(), qe[o + 0 >> 1] = 2, 0;
              case 13:
              case 14:
                return 0;
            }
            return -28;
          } catch (s) {
            if (typeof P > "u" || s.name !== "ErrnoError") throw s;
            return -s.Pa;
          }
        },
        g: function(e, t) {
          try {
            var r = j(e), n = r.node, o = r.Ma.Ta;
            e = o ? r : n, o ?? (o = n.La.Ta), Fe(o);
            var s = o(e);
            return Qe(t, s);
          } catch (u) {
            if (typeof P > "u" || u.name !== "ErrnoError") throw u;
            return -u.Pa;
          }
        },
        H: function(e, t) {
          t = -9007199254740992 > t || 9007199254740992 < t ? NaN : Number(t);
          try {
            if (isNaN(t)) return -61;
            var r = j(e);
            if (0 > t || !(r.flags & 2097155)) throw new c(28);
            return ir(r, r.node, t), 0;
          } catch (n) {
            if (typeof P > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        G: function(e, t) {
          try {
            if (t === 0) return -28;
            var r = ke("/") + 1;
            return t < r ? -68 : (Y("/", $, e, t), r);
          } catch (n) {
            if (typeof P > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        K: function(e, t) {
          try {
            return e = M(e), Qe(t, Oe(e, !0));
          } catch (r) {
            if (typeof P > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        C: function(e, t, r) {
          try {
            return t = M(t), t = ye(e, t), J(t, r), 0;
          } catch (n) {
            if (typeof P > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        J: function(e, t, r, n) {
          try {
            t = M(t);
            var o = n & 256;
            return t = ye(e, t, n & 4096), Qe(r, o ? Oe(t, !0) : Oe(t));
          } catch (s) {
            if (typeof P > "u" || s.name !== "ErrnoError") throw s;
            return -s.Pa;
          }
        },
        x: function(e, t, r, n) {
          Ge = n;
          try {
            t = M(t), t = ye(e, t);
            var o = n ? Xe() : 0;
            return Ae(t, r, o).fd;
          } catch (s) {
            if (typeof P > "u" || s.name !== "ErrnoError") throw s;
            return -s.Pa;
          }
        },
        v: function(e, t, r, n) {
          try {
            if (t = M(t), t = ye(e, t), 0 >= n) return -28;
            var o = z(t).node;
            if (!o) throw new c(44);
            if (!o.La.readlink) throw new c(28);
            var s = o.La.readlink(o), u = Math.min(n, ke(s)), y = D[r + u];
            return Y(
              s,
              $,
              r,
              n + 1
            ), D[r + u] = y, u;
          } catch (k) {
            if (typeof P > "u" || k.name !== "ErrnoError") throw k;
            return -k.Pa;
          }
        },
        u: function(e) {
          try {
            return e = M(e), rr(e), 0;
          } catch (t) {
            if (typeof P > "u" || t.name !== "ErrnoError") throw t;
            return -t.Pa;
          }
        },
        f: function(e, t) {
          try {
            return e = M(e), Qe(t, Oe(e));
          } catch (r) {
            if (typeof P > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        r: function(e, t, r) {
          try {
            if (t = M(t), t = ye(e, t), r) if (r === 512) rr(t);
            else return -28;
            else nr(t);
            return 0;
          } catch (n) {
            if (typeof P > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        q: function(e, t, r) {
          try {
            t = M(t), t = ye(e, t, !0);
            var n = Date.now(), o, s;
            if (r) {
              var u = A[r >> 2] + 4294967296 * q[r + 4 >> 2], y = q[r + 8 >> 2];
              y == 1073741823 ? o = n : y == 1073741822 ? o = null : o = 1e3 * u + y / 1e6, r += 16, u = A[r >> 2] + 4294967296 * q[r + 4 >> 2], y = q[r + 8 >> 2], y == 1073741823 ? s = n : y == 1073741822 ? s = null : s = 1e3 * u + y / 1e6;
            } else s = o = n;
            if ((s ?? o) !== null) {
              e = o;
              var k = z(t, { ab: !0 }).node;
              Fe(k.La.Ua)(k, { atime: e, mtime: s });
            }
            return 0;
          } catch (v) {
            if (typeof P > "u" || v.name !== "ErrnoError") throw v;
            return -v.Pa;
          }
        },
        m: () => Ne(""),
        l: () => {
          Ie = !1, St = 0;
        },
        A: function(e, t) {
          e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e), e = new Date(1e3 * e), q[t >> 2] = e.getSeconds(), q[t + 4 >> 2] = e.getMinutes(), q[t + 8 >> 2] = e.getHours(), q[t + 12 >> 2] = e.getDate(), q[t + 16 >> 2] = e.getMonth(), q[t + 20 >> 2] = e.getFullYear() - 1900, q[t + 24 >> 2] = e.getDay();
          var r = e.getFullYear();
          q[t + 28 >> 2] = (r % 4 !== 0 || r % 100 === 0 && r % 400 !== 0 ? ln : un)[e.getMonth()] + e.getDate() - 1 | 0, q[t + 36 >> 2] = -(60 * e.getTimezoneOffset()), r = new Date(e.getFullYear(), 6, 1).getTimezoneOffset();
          var n = new Date(e.getFullYear(), 0, 1).getTimezoneOffset();
          q[t + 32 >> 2] = (r != n && e.getTimezoneOffset() == Math.min(n, r)) | 0;
        },
        y: function(e, t, r, n, o, s, u) {
          o = -9007199254740992 > o || 9007199254740992 < o ? NaN : Number(o);
          try {
            var y = j(n);
            if (t & 2 && !(r & 2) && (y.flags & 2097155) !== 2) throw new c(2);
            if ((y.flags & 2097155) === 1) throw new c(2);
            if (!y.Ma.jb) throw new c(43);
            if (!e) throw new c(28);
            var k = y.Ma.jb(y, e, o, t, r), v = k.Xb;
            return q[s >> 2] = k.Eb, A[u >> 2] = v, 0;
          } catch (x) {
            if (typeof P > "u" || x.name !== "ErrnoError") throw x;
            return -x.Pa;
          }
        },
        z: function(e, t, r, n, o, s) {
          s = -9007199254740992 > s || 9007199254740992 < s ? NaN : Number(s);
          try {
            var u = j(o);
            if (r & 2) {
              if (r = s, (u.node.mode & 61440) !== 32768) throw new c(43);
              if (!(n & 2)) {
                var y = $.slice(e, e + t);
                u.Ma.kb && u.Ma.kb(u, y, r, t, n);
              }
            }
          } catch (k) {
            if (typeof P > "u" || k.name !== "ErrnoError") throw k;
            return -k.Pa;
          }
        },
        n: (e, t) => {
          if (De[e] && (clearTimeout(De[e].id), delete De[e]), !t) return 0;
          var r = setTimeout(() => {
            delete De[e], fn(() => mr(e, performance.now()));
          }, t);
          return De[e] = { id: r, lc: t }, 0;
        },
        B: (e, t, r, n) => {
          var o = (/* @__PURE__ */ new Date()).getFullYear(), s = new Date(o, 0, 1).getTimezoneOffset();
          o = new Date(o, 6, 1).getTimezoneOffset(), A[e >> 2] = 60 * Math.max(s, o), q[t >> 2] = +(s != o), t = (u) => {
            var y = Math.abs(u);
            return `UTC${0 <= u ? "-" : "+"}${String(Math.floor(y / 60)).padStart(2, "0")}${String(y % 60).padStart(2, "0")}`;
          }, e = t(s), t = t(o), o < s ? (Y(e, $, r, 17), Y(t, $, n, 17)) : (Y(e, $, n, 17), Y(t, $, r, 17));
        },
        d: () => Date.now(),
        s: () => 2147483648,
        c: () => performance.now(),
        o: (e) => {
          var t = $.length;
          if (e >>>= 0, 2147483648 < e) return !1;
          for (var r = 1; 4 >= r; r *= 2) {
            var n = t * (1 + 0.2 / r);
            n = Math.min(n, e + 100663296);
            e: {
              n = (Math.min(2147483648, 65536 * Math.ceil(Math.max(
                e,
                n
              ) / 65536)) - et.buffer.byteLength + 65535) / 65536 | 0;
              try {
                et.grow(n), Ct();
                var o = 1;
                break e;
              } catch {
              }
              o = void 0;
            }
            if (o) return !0;
          }
          return !1;
        },
        E: (e, t) => {
          var r = 0, n = 0, o;
          for (o of fr()) {
            var s = t + r;
            A[e + n >> 2] = s, r += Y(o, $, s, 1 / 0) + 1, n += 4;
          }
          return 0;
        },
        F: (e, t) => {
          var r = fr();
          A[e >> 2] = r.length, e = 0;
          for (var n of r) e += ke(n) + 1;
          return A[t >> 2] = e, 0;
        },
        e: function(e) {
          try {
            var t = j(e);
            return Et(t), 0;
          } catch (r) {
            if (typeof P > "u" || r.name !== "ErrnoError") throw r;
            return r.Pa;
          }
        },
        p: function(e, t) {
          try {
            var r = j(e);
            return D[t] = r.tty ? 2 : B(r.mode) ? 3 : (r.mode & 61440) === 40960 ? 7 : 4, qe[t + 2 >> 1] = 0, V[t + 8 >> 3] = BigInt(0), V[t + 16 >> 3] = BigInt(0), 0;
          } catch (n) {
            if (typeof P > "u" || n.name !== "ErrnoError") throw n;
            return n.Pa;
          }
        },
        w: function(e, t, r, n) {
          try {
            e: {
              var o = j(e);
              e = t;
              for (var s, u = t = 0; u < r; u++) {
                var y = A[e >> 2], k = A[e + 4 >> 2];
                e += 8;
                var v = ar(o, D, y, k, s);
                if (0 > v) {
                  var x = -1;
                  break e;
                }
                if (t += v, v < k) break;
                typeof s < "u" && (s += v);
              }
              x = t;
            }
            return A[n >> 2] = x, 0;
          } catch (L) {
            if (typeof P > "u" || L.name !== "ErrnoError") throw L;
            return L.Pa;
          }
        },
        D: function(e, t, r, n) {
          t = -9007199254740992 > t || 9007199254740992 < t ? NaN : Number(t);
          try {
            if (isNaN(t)) return 61;
            var o = j(e);
            return sr(o, t, r), V[n >> 3] = BigInt(o.position), o.rb && t === 0 && r === 0 && (o.rb = null), 0;
          } catch (s) {
            if (typeof P > "u" || s.name !== "ErrnoError") throw s;
            return s.Pa;
          }
        },
        I: function(e) {
          var r, n;
          try {
            var t = j(e);
            return (n = (r = t.Ma) == null ? void 0 : r.fsync) == null ? void 0 : n.call(r, t);
          } catch (o) {
            if (typeof P > "u" || o.name !== "ErrnoError") throw o;
            return o.Pa;
          }
        },
        t: function(e, t, r, n) {
          try {
            e: {
              var o = j(e);
              e = t;
              for (var s, u = t = 0; u < r; u++) {
                var y = A[e >> 2], k = A[e + 4 >> 2];
                e += 8;
                var v = ur(o, D, y, k, s);
                if (0 > v) {
                  var x = -1;
                  break e;
                }
                if (t += v, v < k) break;
                typeof s < "u" && (s += v);
              }
              x = t;
            }
            return A[n >> 2] = x, 0;
          } catch (L) {
            if (typeof P > "u" || L.name !== "ErrnoError") throw L;
            return L.Pa;
          }
        },
        k: lr
      };
      function qt() {
        function e() {
          var o;
          if (a.calledRun = !0, !$e) {
            if (!a.noFSInit && !Xt) {
              var t, r;
              Xt = !0, t ?? (t = a.stdin), r ?? (r = a.stdout), n ?? (n = a.stderr), t ? ie("stdin", t) : kt("/dev/tty", "/dev/stdin"), r ? ie("stdout", null, r) : kt("/dev/tty", "/dev/stdout"), n ? ie("stderr", null, n) : kt("/dev/tty1", "/dev/stderr"), Ae("/dev/stdin", 0), Ae("/dev/stdout", 1), Ae("/dev/stderr", 1);
            }
            if (Nt.N(), Yt = !1, (o = a.onRuntimeInitialized) == null || o.call(a), a.postRun) for (typeof a.postRun == "function" && (a.postRun = [a.postRun]); a.postRun.length; ) {
              var n = a.postRun.shift();
              $t.push(n);
            }
            Ut($t);
          }
        }
        if (0 < me) Me = qt;
        else {
          if (a.preRun) for (typeof a.preRun == "function" && (a.preRun = [a.preRun]); a.preRun.length; ) Gr();
          Ut(jt), 0 < me ? Me = qt : a.setStatus ? (a.setStatus("Running..."), setTimeout(() => {
            setTimeout(() => a.setStatus(""), 1), e();
          }, 1)) : e();
        }
      }
      var Nt;
      return async function() {
        var r;
        function e(n) {
          var o;
          return n = Nt = n.exports, a._sqlite3_free = n.P, a._sqlite3_value_text = n.Q, a._sqlite3_prepare_v2 = n.R, a._sqlite3_step = n.S, a._sqlite3_reset = n.T, a._sqlite3_exec = n.U, a._sqlite3_finalize = n.V, a._sqlite3_column_name = n.W, a._sqlite3_column_text = n.X, a._sqlite3_column_type = n.Y, a._sqlite3_errmsg = n.Z, a._sqlite3_clear_bindings = n._, a._sqlite3_value_blob = n.$, a._sqlite3_value_bytes = n.aa, a._sqlite3_value_double = n.ba, a._sqlite3_value_int = n.ca, a._sqlite3_value_type = n.da, a._sqlite3_result_blob = n.ea, a._sqlite3_result_double = n.fa, a._sqlite3_result_error = n.ga, a._sqlite3_result_int = n.ha, a._sqlite3_result_int64 = n.ia, a._sqlite3_result_null = n.ja, a._sqlite3_result_text = n.ka, a._sqlite3_aggregate_context = n.la, a._sqlite3_column_count = n.ma, a._sqlite3_data_count = n.na, a._sqlite3_column_blob = n.oa, a._sqlite3_column_bytes = n.pa, a._sqlite3_column_double = n.qa, a._sqlite3_bind_blob = n.ra, a._sqlite3_bind_double = n.sa, a._sqlite3_bind_int = n.ta, a._sqlite3_bind_text = n.ua, a._sqlite3_bind_parameter_index = n.va, a._sqlite3_sql = n.wa, a._sqlite3_normalized_sql = n.xa, a._sqlite3_changes = n.ya, a._sqlite3_close_v2 = n.za, a._sqlite3_create_function_v2 = n.Aa, a._sqlite3_update_hook = n.Ba, a._sqlite3_open = n.Ca, Je = a._malloc = n.Da, Le = a._free = n.Ea, a._RegisterExtensionFunctions = n.Fa, pr = n.Ga, mr = n.Ha, Ze = n.Ia, be = n.Ja, Ke = n.Ka, et = n.M, ae = n.O, Ct(), me--, (o = a.monitorRunDependencies) == null || o.call(a, me), me == 0 && Me && (n = Me, Me = null, n()), Nt;
        }
        me++, (r = a.monitorRunDependencies) == null || r.call(a, me);
        var t = { a: pn };
        return a.instantiateWasm ? new Promise((n) => {
          a.instantiateWasm(t, (o, s) => {
            n(e(o));
          });
        }) : (ht ?? (ht = a.locateFile ? a.locateFile("sql-wasm.wasm", he) : he + "sql-wasm.wasm"), e((await Qr(t)).instance));
      }(), qt(), T;
    }), p);
  };
  f.exports = S, f.exports.default = S;
})(Tr);
var Gn = Tr.exports;
const Xn = /* @__PURE__ */ Qn(Gn), Lt = _.dirname(Hn(import.meta.url));
process.env.APP_ROOT = _.join(Lt, "..");
const Pe = process.env.VITE_DEV_SERVER_URL, po = _.join(process.env.APP_ROOT, "dist-electron"), Lr = _.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Pe ? _.join(process.env.APP_ROOT, "public") : Lr;
let b = null;
const nt = "CommandOrControl+Alt+A", Cr = {
  launchOnStartup: !1,
  startMinimized: !1,
  quickSearchHotkey: nt,
  defaultBrowser: "system"
};
let I = { ...Cr };
function Ur() {
  return _.join(te.getPath("userData"), "desktop-settings.json");
}
function Yn() {
  try {
    const f = JSON.parse(R.readFileSync(Ur(), "utf-8"));
    I = { ...Cr, ...f };
  } catch {
  }
}
function $r() {
  try {
    R.writeFileSync(Ur(), JSON.stringify(I, null, 2));
  } catch (f) {
    console.error("Failed to persist desktop settings:", f);
  }
}
const Jn = process.argv.includes("--start-minimized");
function ot(f) {
  try {
    return Dt.register(f, () => {
      if (b) {
        const p = b.isMinimized() || !b.isFocused();
        b.isMinimized() && b.restore(), b.isVisible() || b.show(), b.focus(), b.webContents.send("toggle-quick-search", { wasMinimized: p });
      }
    }) ? null : `Could not register "${f}" - it may already be in use by another app.`;
  } catch {
    return `"${f}" is not a valid hotkey.`;
  }
}
function Zn() {
  const f = [te.getAppPath()];
  I.startMinimized && f.push("--start-minimized"), te.setLoginItemSettings({
    openAtLogin: I.launchOnStartup,
    path: process.execPath,
    args: f
  });
}
const X = () => process.env.LOCALAPPDATA || _.join(st.homedir(), "AppData", "Local"), Mr = () => process.env.APPDATA || _.join(st.homedir(), "AppData", "Roaming"), rt = () => process.env.ProgramFiles || "C:\\Program Files", Rt = () => process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", at = [
  {
    id: "chrome",
    name: "Google Chrome",
    processName: "chrome.exe",
    exeCandidates: () => [
      _.join(rt(), "Google", "Chrome", "Application", "chrome.exe"),
      _.join(Rt(), "Google", "Chrome", "Application", "chrome.exe"),
      _.join(X(), "Google", "Chrome", "Application", "chrome.exe")
    ],
    userData: () => _.join(X(), "Google", "Chrome", "User Data")
  },
  {
    id: "edge",
    name: "Microsoft Edge",
    processName: "msedge.exe",
    exeCandidates: () => [
      _.join(Rt(), "Microsoft", "Edge", "Application", "msedge.exe"),
      _.join(rt(), "Microsoft", "Edge", "Application", "msedge.exe")
    ],
    userData: () => _.join(X(), "Microsoft", "Edge", "User Data")
  },
  {
    id: "brave",
    name: "Brave",
    processName: "brave.exe",
    exeCandidates: () => [
      _.join(rt(), "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      _.join(Rt(), "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      _.join(X(), "BraveSoftware", "Brave-Browser", "Application", "brave.exe")
    ],
    userData: () => _.join(X(), "BraveSoftware", "Brave-Browser", "User Data")
  },
  {
    id: "opera",
    name: "Opera",
    processName: "opera.exe",
    exeCandidates: () => [
      _.join(X(), "Programs", "Opera", "opera.exe"),
      _.join(X(), "Programs", "Opera", "launcher.exe"),
      _.join(rt(), "Opera", "opera.exe")
    ],
    userData: () => _.join(Mr(), "Opera Software", "Opera Stable"),
    flatProfile: !0
  },
  {
    id: "operagx",
    name: "Opera GX",
    processName: "opera.exe",
    exeCandidates: () => [
      _.join(X(), "Programs", "Opera GX", "opera.exe"),
      _.join(X(), "Programs", "Opera GX", "launcher.exe")
    ],
    userData: () => _.join(Mr(), "Opera Software", "Opera GX Stable"),
    flatProfile: !0
  },
  {
    id: "chromium",
    name: "Chromium",
    processName: "chrome.exe",
    exeCandidates: () => [_.join(X(), "Chromium", "Application", "chrome.exe")],
    userData: () => _.join(X(), "Chromium", "User Data")
  }
];
function jr(f) {
  if (process.platform !== "win32") return null;
  for (const h of f.exeCandidates())
    try {
      if (R.existsSync(h)) return h;
    } catch {
    }
  return null;
}
function it(f) {
  if (!f.startsWith("http://") && !f.startsWith("https://")) return;
  const h = at.find((S) => S.id === I.defaultBrowser), p = h ? jr(h) : null;
  if (p)
    try {
      zn(p, [f], { detached: !0, stdio: "ignore" }).unref();
      return;
    } catch (S) {
      console.error(`Failed to launch ${h.name}, falling back to system browser:`, S);
    }
  Fn.openExternal(f);
}
function Rr() {
  b = new Or({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: _.join(Lt, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), b.webContents.setWindowOpenHandler(({ url: f }) => (it(f), { action: "deny" })), b.webContents.on("will-navigate", (f, h) => {
    (Pe ? h.startsWith(Pe) : h.startsWith("file://")) || (f.preventDefault(), it(h));
  }), b.webContents.on("console-message", (f, h, p, S, O) => {
    console.log(`[Renderer Console ${h}] ${p} (${O}:${S})`);
  }), b.webContents.on("did-fail-load", (f, h, p) => {
    console.error(`[Load Error ${h}] ${p}`);
  }), b.once("ready-to-show", () => {
    Jn ? b == null || b.minimize() : b == null || b.show(), Pe && (b == null || b.webContents.openDevTools({ mode: "detach" }));
  }), Pe ? b.loadURL(Pe) : b.loadFile(_.join(Lr, "index.html"));
}
te.whenReady().then(() => {
  Yn(), Rr();
  const f = ot(I.quickSearchHotkey);
  f && (console.error("Quick-search hotkey:", f), I.quickSearchHotkey !== nt && (I.quickSearchHotkey = nt, $r(), ot(nt))), te.on("activate", () => {
    Or.getAllWindows().length === 0 && Rr();
  });
  const h = () => b == null ? void 0 : b.webContents.send("system-lock");
  Nr.on("lock-screen", h), Nr.on("suspend", h);
});
te.on("will-quit", () => {
  Dt.unregisterAll();
});
te.on("window-all-closed", () => {
  process.platform !== "darwin" && te.quit();
});
W.on("window-minimize", () => {
  b == null || b.minimize();
});
W.on("window-maximize", () => {
  b != null && b.isMaximized() ? b.unmaximize() : b == null || b.maximize();
});
W.on("window-close", () => {
  b == null || b.close();
});
W.handle("desktop-settings-get", () => ({ ...I }));
W.handle("desktop-settings-set", (f, h) => {
  const p = { ...I };
  I = { ...I, ...h };
  let S = null;
  if (h.quickSearchHotkey && h.quickSearchHotkey !== p.quickSearchHotkey) {
    try {
      Dt.unregister(p.quickSearchHotkey);
    } catch {
    }
    S = ot(I.quickSearchHotkey), S && (I.quickSearchHotkey = p.quickSearchHotkey, ot(p.quickSearchHotkey));
  }
  return ("launchOnStartup" in h || "startMinimized" in h) && Zn(), $r(), { settings: { ...I }, error: S };
});
W.on("open-external", (f, h) => {
  typeof h == "string" && it(h);
});
function Kn(f) {
  const p = f.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), S = Buffer.from(p, "base64").toString("utf-8");
  return JSON.parse(S);
}
W.handle("google-oauth", async () => new Promise((f) => {
  const S = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://password-manager.fayber.dev/oauth/callback")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
  let O = !1;
  const U = Vn.createServer((C, T) => {
    if (T.setHeader("Access-Control-Allow-Origin", "*"), C.url && C.url.startsWith("/token")) {
      const a = new URL(C.url, "http://127.0.0.1:28999").searchParams.get("id_token");
      if (T.end("ok"), a && !O) {
        O = !0;
        try {
          const N = Kn(a);
          f({
            googleId: N.sub,
            email: N.email,
            name: N.name,
            picture: N.picture,
            idToken: a
          });
        } catch (N) {
          console.error("[Google OAuth] Error parsing token:", N), f(null);
        }
        U.close();
      }
    } else
      T.end("");
  });
  U.listen(28999, "127.0.0.1", () => {
    it(S);
  }), setTimeout(() => {
    if (!O) {
      O = !0;
      try {
        U.close();
      } catch {
      }
      f(null);
    }
  }, 5 * 60 * 1e3);
}));
function eo(f) {
  return new Promise((h) => {
    Tt("tasklist", ["/FI", `IMAGENAME eq ${f}`, "/NH"], (p, S) => {
      if (p) return h(!1);
      h(S.toLowerCase().includes(f.toLowerCase()));
    });
  });
}
function to(f) {
  return new Promise((h, p) => {
    Tt(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", "Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String($env:NP_ENC_KEY); $k=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,'CurrentUser'); [Convert]::ToBase64String($k)"],
      { env: { ...process.env, NP_ENC_KEY: f }, maxBuffer: 1024 * 1024 },
      (O, U) => {
        if (O) return p(O);
        try {
          h(Buffer.from(U.trim(), "base64"));
        } catch (C) {
          p(C);
        }
      }
    );
  });
}
function ro(f, h) {
  if (f.length < 31) return null;
  const p = f.subarray(0, 3).toString("latin1");
  if (p !== "v10" && p !== "v11") return null;
  const S = f.subarray(3, 15), O = f.subarray(f.length - 16), U = f.subarray(15, f.length - 16);
  try {
    const C = Dr.createDecipheriv("aes-256-gcm", h, S);
    return C.setAuthTag(O), Buffer.concat([C.update(U), C.final()]).toString("utf-8");
  } catch {
    return null;
  }
}
async function Ir(f) {
  var h;
  try {
    if (process.platform !== "win32")
      return { ok: !1, error: "Direct browser import is only available on Windows." };
    if (await eo(f.processName))
      return { ok: !1, error: `Please fully close ${f.name}, then try again.` };
    const p = f.userData();
    if (!R.existsSync(p))
      return { ok: !1, error: `No ${f.name} installation was found for this user.` };
    const S = _.join(p, "Local State");
    let O;
    try {
      const N = JSON.parse(R.readFileSync(S, "utf-8")), Z = (h = N == null ? void 0 : N.os_crypt) == null ? void 0 : h.encrypted_key;
      if (!Z) return { ok: !1, error: `Couldn't read ${f.name}'s encryption key.` };
      const re = Buffer.from(Z, "base64").subarray(5);
      O = await to(re.toString("base64"));
    } catch {
      return { ok: !1, error: `Couldn't decrypt ${f.name}'s encryption key (Windows DPAPI).` };
    }
    const U = await Xn({ locateFile: () => _.join(Lt, "sql-wasm.wasm") }), C = f.flatProfile ? ["."] : R.readdirSync(p, { withFileTypes: !0 }).filter((N) => N.isDirectory() && (N.name === "Default" || /^Profile \d+$/.test(N.name))).map((N) => N.name), T = [];
    let le = 0, a = 0;
    for (const N of C) {
      const Z = _.join(p, N, "Login Data");
      if (!R.existsSync(Z)) continue;
      const K = _.join(st.tmpdir(), `nextpass-logindata-${Date.now()}-${N.replace(/\W/g, "")}`);
      try {
        R.copyFileSync(Z, K);
        const re = new U.Database(R.readFileSync(K));
        try {
          const fe = re.exec("SELECT origin_url, username_value, password_value FROM logins");
          if (fe.length > 0) {
            a++;
            for (const ce of fe[0].values) {
              const he = String(ce[0] ?? ""), ge = String(ce[1] ?? ""), ne = ce[2];
              if (!(ne instanceof Uint8Array) || ne.length === 0) {
                (he || ge) && le++;
                continue;
              }
              const _e = ro(Buffer.from(ne), O);
              if (_e === null) {
                le++;
                continue;
              }
              T.push({ url: he, username: ge, password: _e });
            }
          }
        } finally {
          re.close();
        }
      } catch {
      } finally {
        try {
          R.unlinkSync(K);
        } catch {
        }
      }
    }
    return { ok: !0, credentials: T, undecryptable: le, profiles: a };
  } catch (p) {
    return { ok: !1, error: p instanceof Error ? p.message : `${f.name} import failed.` };
  }
}
W.handle("chrome-import", () => Ir(at[0]));
W.handle("browser-import", (f, h) => {
  const p = at.find((S) => S.id === h);
  return p ? Ir(p) : Promise.resolve({ ok: !1, error: "Unknown browser." });
});
W.handle(
  "browsers-detect",
  () => at.map((f) => {
    const h = jr(f);
    let p = !1;
    try {
      p = process.platform === "win32" && R.existsSync(f.userData());
    } catch {
    }
    return {
      id: f.id,
      name: f.name,
      /** Browser is present on this machine (exe found, or at least a profile dir). */
      installed: !!h || p,
      /** We can launch it as the default "Open site" browser (needs the exe). */
      launchable: !!h,
      /** A password store exists to import from. */
      importable: p
    };
  })
);
function Ue() {
  return _.join(te.getPath("userData"), "hello-unlock.bin");
}
const no = `
[void][Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
function Await-WinRT($op, [Type]$resultType) {
  $m = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'GetAwaiter' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
  $awaiter = $m.MakeGenericMethod($resultType).Invoke($null, @($op))
  while (-not $awaiter.IsCompleted) { Start-Sleep -Milliseconds 50 }
  $awaiter.GetResult()
}
`;
function Br(f, h, p) {
  return new Promise((S, O) => {
    const U = _.join(st.tmpdir(), `nextpass-hello-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
    R.writeFileSync(U, no + f, "utf-8"), Tt(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", U],
      { env: { ...process.env, ...h }, timeout: p, maxBuffer: 1024 * 1024 },
      (C, T) => {
        try {
          R.unlinkSync(U);
        } catch {
        }
        if (C) return O(C);
        S(T.trim());
      }
    );
  });
}
let Ce = null;
async function Wr() {
  if (process.platform !== "win32") return !1;
  if (Ce !== null) return Ce;
  try {
    const f = await Br(
      `$r = Await-WinRT ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])
Write-Output ("result=" + $r)`,
      {},
      2e4
    );
    Ce = /result=Available/.test(f);
  } catch {
    Ce = !1;
  }
  return Ce;
}
async function Fr(f) {
  const h = await Br(
    `$r = Await-WinRT ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync($env:NP_HELLO_MSG)) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])
Write-Output ("result=" + $r)`,
    { NP_HELLO_MSG: f },
    12e4
    // generous - the user is interacting with the Hello dialog
  ), p = /result=(\w+)/.exec(h);
  return (p == null ? void 0 : p[1]) ?? "Unknown";
}
function zr(f) {
  switch (f) {
    case "Canceled":
      return "Windows Hello was cancelled.";
    case "RetriesExhausted":
      return "Too many failed Windows Hello attempts. Please use your master password.";
    case "DeviceNotPresent":
    case "NotConfiguredForUser":
      return "Windows Hello is not set up on this PC (Settings > Accounts > Sign-in options).";
    case "DisabledByPolicy":
      return "Windows Hello is disabled by system policy.";
    case "DeviceBusy":
      return "Windows Hello is busy - try again in a moment.";
    default:
      return "Windows Hello verification failed.";
  }
}
W.handle("hello-status", async () => process.platform !== "win32" ? { available: !1, enabled: !1 } : { available: await Wr(), enabled: R.existsSync(Ue()) });
W.handle("hello-enable", async (f, h) => {
  try {
    if (process.platform !== "win32") return { ok: !1, error: "Windows Hello requires Windows." };
    if (typeof h != "string" || !h) return { ok: !1, error: "No vault key provided." };
    if (!await Wr())
      return { ok: !1, error: "Windows Hello is not set up on this PC (Settings > Accounts > Sign-in options)." };
    if (!Ot.isEncryptionAvailable())
      return { ok: !1, error: "Windows credential encryption (DPAPI) is unavailable." };
    const p = await Fr("Confirm your identity to enable Windows Hello unlock for NextPass");
    return p !== "Verified" ? { ok: !1, error: zr(p) } : (R.writeFileSync(Ue(), Ot.encryptString(h), { mode: 384 }), { ok: !0 });
  } catch (p) {
    return { ok: !1, error: p instanceof Error ? p.message : "Could not enable Windows Hello unlock." };
  }
});
W.handle("hello-unlock", async () => {
  try {
    const f = Ue();
    if (!R.existsSync(f))
      return { ok: !1, error: "Windows Hello unlock is not set up on this device." };
    const h = await Fr("Unlock your NextPass vault");
    return h !== "Verified" ? { ok: !1, error: zr(h) } : { ok: !0, vaultKey: Ot.decryptString(R.readFileSync(f)) };
  } catch {
    try {
      R.unlinkSync(Ue());
    } catch {
    }
    return { ok: !1, error: "Could not read the stored key. Unlock with your master password and re-enable Windows Hello." };
  }
});
W.handle("hello-disable", async () => {
  try {
    R.unlinkSync(Ue());
  } catch {
  }
  return { ok: !0 };
});
export {
  po as MAIN_DIST,
  Lr as RENDERER_DIST,
  Pe as VITE_DEV_SERVER_URL
};
