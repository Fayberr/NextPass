var On = Object.defineProperty;
var Ln = (c, m, d) => m in c ? On(c, m, { enumerable: !0, configurable: !0, writable: !0, value: d }) : c[m] = d;
var ae = (c, m, d) => Ln(c, typeof m != "symbol" ? m + "" : m, d);
import { app as ee, BrowserWindow as Ar, globalShortcut as Pt, ipcMain as H, shell as qr, safeStorage as qt } from "electron";
import O from "node:fs";
import Nt from "node:os";
import D from "node:path";
import Nr from "node:crypto";
import { execFile as Mt } from "node:child_process";
import { fileURLToPath as Un } from "node:url";
import Dn from "node:http";
function Cn(c) {
  return c && c.__esModule && Object.prototype.hasOwnProperty.call(c, "default") ? c.default : c;
}
var Pr = { exports: {} };
(function(c, m) {
  var d = void 0, M = function(R) {
    return d || (d = new Promise(function(C, U) {
      var fr, cr, hr, pr, mr;
      var x = typeof R < "u" ? R : {}, ue = x.onAbort;
      x.onAbort = function(e) {
        U(new Error(e)), ue && ue(e);
      }, x.postRun = x.postRun || [], x.postRun.push(function() {
        C(x);
      }), c = void 0;
      var a;
      a || (a = typeof x < "u" ? x : {});
      var N = !!globalThis.window, J = !!globalThis.WorkerGlobalScope, Z = ((cr = (fr = globalThis.process) == null ? void 0 : fr.versions) == null ? void 0 : cr.node) && ((hr = globalThis.process) == null ? void 0 : hr.type) != "renderer";
      a.onRuntimeInitialized = function() {
        function e(o, l) {
          switch (typeof l) {
            case "boolean":
              Tn(o, l ? 1 : 0);
              break;
            case "number":
              Pn(o, l);
              break;
            case "string":
              Mn(o, l, -1, -1);
              break;
            case "object":
              if (l === null) gr(o);
              else if (l.length != null) {
                var h = Ye(l.length);
                T.set(l, h), Rn(o, h, l.length, -1), Oe(h);
              } else Ke(o, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
              break;
            default:
              gr(o);
          }
        }
        function t(o, l) {
          for (var h = [], p = 0; p < o; p += 1) {
            var v = K(l + 4 * p, "i32"), k = En(v);
            if (k === 1 || k === 2) v = Nn(v);
            else if (k === 3) v = An(v);
            else if (k === 4) {
              k = v, v = Sn(k), k = qn(k);
              for (var Q = new Uint8Array(v), B = 0; B < v; B += 1) Q[B] = T[k + B];
              v = Q;
            } else v = null;
            h.push(v);
          }
          return h;
        }
        function r(o, l) {
          this.Qa = o, this.db = l, this.Oa = 1, this.mb = [];
        }
        function n(o, l) {
          if (this.db = l, this.fb = Ge(o), this.fb === null) throw Error("Unable to allocate memory for the SQL string");
          this.lb = this.fb, this.$a = this.sb = null;
        }
        function i(o) {
          if (this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0), o != null) {
            var l = this.filename, h = "/", p = l;
            if (h && (h = typeof h == "string" ? h : ht(h), p = l ? lt(h + "/" + l) : h), l = Ft(!0, !0), p = Jr(
              p,
              l
            ), o) {
              if (typeof o == "string") {
                h = Array(o.length);
                for (var v = 0, k = o.length; v < k; ++v) h[v] = o.charCodeAt(v);
                o = h;
              }
              Be(p, l | 146), h = Se(p, 577), nr(h, o, 0, o.length, 0), bt(h), Be(p, l);
            }
          }
          this.handleError(y(this.filename, s)), this.db = K(s, "i32"), kr(this.db), this.gb = {}, this.Sa = {};
        }
        var s = we(4), u = a.cwrap, y = u("sqlite3_open", "number", ["string", "number"]), _ = u("sqlite3_close_v2", "number", ["number"]), b = u("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), A = u("sqlite3_changes", "number", ["number"]), L = u(
          "sqlite3_prepare_v2",
          "number",
          ["number", "string", "number", "number", "number"]
        ), dr = u("sqlite3_sql", "string", ["number"]), sn = u("sqlite3_normalized_sql", "string", ["number"]), yr = u("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), an = u("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), wr = u("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), un = u("sqlite3_bind_double", "number", ["number", "number", "number"]), ln = u("sqlite3_bind_int", "number", [
          "number",
          "number",
          "number"
        ]), fn = u("sqlite3_bind_parameter_index", "number", ["number", "string"]), cn = u("sqlite3_step", "number", ["number"]), hn = u("sqlite3_errmsg", "string", ["number"]), pn = u("sqlite3_column_count", "number", ["number"]), mn = u("sqlite3_data_count", "number", ["number"]), dn = u("sqlite3_column_double", "number", ["number", "number"]), br = u("sqlite3_column_text", "string", ["number", "number"]), yn = u("sqlite3_column_blob", "number", ["number", "number"]), wn = u("sqlite3_column_bytes", "number", ["number", "number"]), bn = u(
          "sqlite3_column_type",
          "number",
          ["number", "number"]
        ), vn = u("sqlite3_column_name", "string", ["number", "number"]), gn = u("sqlite3_reset", "number", ["number"]), _n = u("sqlite3_clear_bindings", "number", ["number"]), kn = u("sqlite3_finalize", "number", ["number"]), vr = u("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), En = u("sqlite3_value_type", "number", ["number"]), Sn = u("sqlite3_value_bytes", "number", ["number"]), An = u("sqlite3_value_text", "string", ["number"]), qn = u(
          "sqlite3_value_blob",
          "number",
          ["number"]
        ), Nn = u("sqlite3_value_double", "number", ["number"]), Pn = u("sqlite3_result_double", "", ["number", "number"]), gr = u("sqlite3_result_null", "", ["number"]), Mn = u("sqlite3_result_text", "", ["number", "string", "number", "number"]), Rn = u("sqlite3_result_blob", "", ["number", "number", "number", "number"]), Tn = u("sqlite3_result_int", "", ["number", "number"]), Ke = u("sqlite3_result_error", "", ["number", "string", "number"]), _r = u("sqlite3_aggregate_context", "number", ["number", "number"]), kr = u(
          "RegisterExtensionFunctions",
          "number",
          ["number"]
        ), Er = u("sqlite3_update_hook", "number", ["number", "number", "number"]);
        r.prototype.bind = function(o) {
          if (!this.Qa) throw "Statement closed";
          return this.reset(), Array.isArray(o) ? this.Gb(o) : o != null && typeof o == "object" ? this.Hb(o) : !0;
        }, r.prototype.step = function() {
          if (!this.Qa) throw "Statement closed";
          this.Oa = 1;
          var o = cn(this.Qa);
          switch (o) {
            case 100:
              return !0;
            case 101:
              return !1;
            default:
              throw this.db.handleError(o);
          }
        }, r.prototype.Ab = function(o) {
          return o == null && (o = this.Oa, this.Oa += 1), dn(this.Qa, o);
        }, r.prototype.Ob = function(o) {
          if (o == null && (o = this.Oa, this.Oa += 1), o = br(this.Qa, o), typeof BigInt != "function") throw Error("BigInt is not supported");
          return BigInt(o);
        }, r.prototype.Tb = function(o) {
          return o == null && (o = this.Oa, this.Oa += 1), br(this.Qa, o);
        }, r.prototype.getBlob = function(o) {
          o == null && (o = this.Oa, this.Oa += 1);
          var l = wn(this.Qa, o);
          o = yn(this.Qa, o);
          for (var h = new Uint8Array(l), p = 0; p < l; p += 1) h[p] = T[o + p];
          return h;
        }, r.prototype.get = function(o, l) {
          l = l || {}, o != null && this.bind(o) && this.step(), o = [];
          for (var h = mn(this.Qa), p = 0; p < h; p += 1) switch (bn(this.Qa, p)) {
            case 1:
              var v = l.useBigInt ? this.Ob(p) : this.Ab(p);
              o.push(v);
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
          for (var o = [], l = pn(this.Qa), h = 0; h < l; h += 1) o.push(vn(this.Qa, h));
          return o;
        }, r.prototype.zb = function(o, l) {
          o = this.get(o, l), l = this.qb();
          for (var h = {}, p = 0; p < l.length; p += 1) h[l[p]] = o[p];
          return h;
        }, r.prototype.Sb = function() {
          return dr(this.Qa);
        }, r.prototype.Pb = function() {
          return sn(this.Qa);
        }, r.prototype.run = function(o) {
          return o != null && this.bind(o), this.step(), this.reset();
        }, r.prototype.wb = function(o, l) {
          l == null && (l = this.Oa, this.Oa += 1), o = Ge(o), this.mb.push(o), this.db.handleError(an(this.Qa, l, o, -1, 0));
        }, r.prototype.Fb = function(o, l) {
          l == null && (l = this.Oa, this.Oa += 1);
          var h = Ye(o.length);
          T.set(o, h), this.mb.push(h), this.db.handleError(wr(this.Qa, l, h, o.length, 0));
        }, r.prototype.vb = function(o, l) {
          l == null && (l = this.Oa, this.Oa += 1), this.db.handleError((o === (o | 0) ? ln : un)(
            this.Qa,
            l,
            o
          ));
        }, r.prototype.Ib = function(o) {
          o == null && (o = this.Oa, this.Oa += 1), wr(this.Qa, o, 0, 0, 0);
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
            var p = fn(l.Qa, h);
            p !== 0 && l.xb(o[h], p);
          }), !0;
        }, r.prototype.Gb = function(o) {
          for (var l = 0; l < o.length; l += 1) this.xb(o[l], l + 1);
          return !0;
        }, r.prototype.reset = function() {
          return this.freemem(), _n(this.Qa) === 0 && gn(this.Qa) === 0;
        }, r.prototype.freemem = function() {
          for (var o; (o = this.mb.pop()) !== void 0; ) Oe(o);
        }, r.prototype.Ya = function() {
          this.freemem();
          var o = kn(this.Qa) === 0;
          return delete this.db.gb[this.Qa], this.Qa = 0, o;
        }, n.prototype.next = function() {
          if (this.fb === null) return { done: !0 };
          if (this.$a !== null && (this.$a.Ya(), this.$a = null), !this.db.db) throw this.ob(), Error("Database closed");
          var o = Je(), l = we(4);
          Me(s), Me(l);
          try {
            this.db.handleError(yr(this.db.db, this.lb, -1, s, l)), this.lb = K(l, "i32");
            var h = K(s, "i32");
            return h === 0 ? (this.ob(), { done: !0 }) : (this.$a = new r(h, this.db), this.db.gb[h] = this.$a, { value: this.$a, done: !1 });
          } catch (p) {
            throw this.sb = P(this.lb), this.ob(), p;
          } finally {
            Xe(o);
          }
        }, n.prototype.ob = function() {
          Oe(this.fb), this.fb = null;
        }, n.prototype.Qb = function() {
          return this.sb !== null ? this.sb : P(this.lb);
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
          } else this.handleError(b(this.db, o, 0, 0, s));
          return this;
        }, i.prototype.exec = function(o, l, h) {
          if (!this.db) throw "Database closed";
          var p = null, v = null, k = null;
          try {
            k = v = Ge(o);
            var Q = we(4);
            for (o = []; K(k, "i8") !== 0; ) {
              Me(s), Me(Q), this.handleError(yr(this.db, k, -1, s, Q));
              var B = K(
                s,
                "i32"
              );
              if (k = K(Q, "i32"), B !== 0) {
                var F = null;
                for (p = new r(B, this), l != null && p.bind(l); p.step(); ) F === null && (F = { columns: p.qb(), values: [] }, o.push(F)), F.values.push(p.get(null, h));
                p.Ya();
              }
            }
            return o;
          } catch (G) {
            throw p && p.Ya(), G;
          } finally {
            v && Oe(v);
          }
        }, i.prototype.Mb = function(o, l, h, p, v) {
          typeof l == "function" && (p = h, h = l, l = void 0), o = this.tb(o, l);
          try {
            for (; o.step(); ) h(o.zb(null, v));
          } finally {
            o.Ya();
          }
          if (typeof p == "function") return p();
        }, i.prototype.tb = function(o, l) {
          if (Me(s), this.handleError(L(this.db, o, -1, s, 0)), o = K(s, "i32"), o === 0) throw "Nothing to prepare";
          var h = new r(o, this);
          return l != null && h.bind(l), this.gb[o] = h;
        }, i.prototype.Ub = function(o) {
          return new n(o, this);
        }, i.prototype.Nb = function() {
          Object.values(this.gb).forEach(function(l) {
            l.Ya();
          }), Object.values(this.Sa).forEach(oe), this.Sa = {}, this.handleError(_(this.db));
          var o = Zr(this.filename);
          return this.handleError(y(this.filename, s)), this.db = K(s, "i32"), kr(this.db), o;
        }, i.prototype.close = function() {
          this.db !== null && (Object.values(this.gb).forEach(function(o) {
            o.Ya();
          }), Object.values(this.Sa).forEach(oe), this.Sa = {}, this.Za && (oe(this.Za), this.Za = void 0), this.handleError(_(this.db)), Zt("/" + this.filename), this.db = null);
        }, i.prototype.handleError = function(o) {
          if (o === 0) return null;
          throw o = hn(this.db), Error(o);
        }, i.prototype.Rb = function() {
          return A(this.db);
        }, i.prototype.Kb = function(o, l) {
          Object.prototype.hasOwnProperty.call(this.Sa, o) && (oe(this.Sa[o]), delete this.Sa[o]);
          var h = xe(function(p, v, k) {
            v = t(v, k);
            try {
              var Q = l.apply(null, v);
            } catch (B) {
              Ke(p, B, -1);
              return;
            }
            e(p, Q);
          }, "viii");
          return this.Sa[o] = h, this.handleError(vr(
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
          }, p = l.finalize || function(F) {
            return F;
          }, v = l.step;
          if (!v) throw "An aggregate function must have a step function in " + o;
          var k = {};
          Object.hasOwnProperty.call(this.Sa, o) && (oe(this.Sa[o]), delete this.Sa[o]), l = o + "__finalize", Object.hasOwnProperty.call(this.Sa, l) && (oe(this.Sa[l]), delete this.Sa[l]);
          var Q = xe(function(F, G, At) {
            var be = _r(F, 1);
            Object.hasOwnProperty.call(k, be) || (k[be] = h()), G = t(G, At), G = [k[be]].concat(G);
            try {
              k[be] = v.apply(null, G);
            } catch (xn) {
              delete k[be], Ke(F, xn, -1);
            }
          }, "viii"), B = xe(function(F) {
            var G = _r(F, 1);
            try {
              var At = p(k[G]);
            } catch (be) {
              delete k[G], Ke(F, be, -1);
              return;
            }
            e(F, At), delete k[G];
          }, "vi");
          return this.Sa[o] = Q, this.Sa[l] = B, this.handleError(vr(this.db, o, v.length - 1, 1, 0, 0, Q, B, 0)), this;
        }, i.prototype.Zb = function(o) {
          return this.Za && (Er(this.db, 0, 0), oe(this.Za), this.Za = void 0), o ? (this.Za = xe(function(l, h, p, v, k) {
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
            if (p = P(p), v = P(v), k > Number.MAX_SAFE_INTEGER) throw "rowId too big to fit inside a Number";
            o(l, p, v, Number(k));
          }, "viiiij"), Er(this.db, this.Za, 0), this) : this;
        }, r.prototype.bind = r.prototype.bind, r.prototype.step = r.prototype.step, r.prototype.get = r.prototype.get, r.prototype.getColumnNames = r.prototype.qb, r.prototype.getAsObject = r.prototype.zb, r.prototype.getSQL = r.prototype.Sb, r.prototype.getNormalizedSQL = r.prototype.Pb, r.prototype.run = r.prototype.run, r.prototype.reset = r.prototype.reset, r.prototype.freemem = r.prototype.freemem, r.prototype.free = r.prototype.Ya, n.prototype.next = n.prototype.next, n.prototype.getRemainingSQL = n.prototype.Qb, i.prototype.run = i.prototype.run, i.prototype.exec = i.prototype.exec, i.prototype.each = i.prototype.Mb, i.prototype.prepare = i.prototype.tb, i.prototype.iterateStatements = i.prototype.Ub, i.prototype.export = i.prototype.Nb, i.prototype.close = i.prototype.close, i.prototype.handleError = i.prototype.handleError, i.prototype.getRowsModified = i.prototype.Rb, i.prototype.create_function = i.prototype.Kb, i.prototype.create_aggregate = i.prototype.Jb, i.prototype.updateHook = i.prototype.Zb, a.Database = i;
      };
      var te = "./this.program", le = (e, t) => {
        throw t;
      }, fe = (mr = (pr = globalThis.document) == null ? void 0 : pr.currentScript) == null ? void 0 : mr.src;
      typeof __filename < "u" ? fe = __filename : J && (fe = self.location.href);
      var ce = "", ve, re;
      if (Z) {
        var ge = O;
        ce = __dirname + "/", re = (e) => (e = Ce(e) ? new URL(e) : e, ge.readFileSync(e)), ve = async (e) => (e = Ce(e) ? new URL(e) : e, ge.readFileSync(e, void 0)), 1 < process.argv.length && (te = process.argv[1].replace(/\\/g, "/")), process.argv.slice(2), c.exports = a, le = (e, t) => {
          throw process.exitCode = e, t;
        };
      } else if (N || J) {
        try {
          ce = new URL(".", fe).href;
        } catch {
        }
        J && (re = (e) => {
          var t = new XMLHttpRequest();
          return t.open("GET", e, !1), t.responseType = "arraybuffer", t.send(null), new Uint8Array(t.response);
        }), ve = async (e) => {
          if (Ce(e)) return new Promise((r, n) => {
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
      var nt = console.log.bind(console), he = console.error.bind(console), Ae, De = !1, it, Ce = (e) => e.startsWith("file://"), T, I, qe, q, E, ot, st, V;
      function Tt() {
        var e = Ze.buffer;
        T = new Int8Array(e), qe = new Int16Array(e), I = new Uint8Array(e), q = new Int32Array(e), E = new Uint32Array(e), ot = new Float32Array(e), st = new Float64Array(e), V = new BigInt64Array(e), new BigUint64Array(e);
      }
      function Ne(e) {
        var t;
        throw (t = a.onAbort) == null || t.call(a, e), e = "Aborted(" + e + ")", he(e), De = !0, new WebAssembly.RuntimeError(e + ". Build with -sASSERTIONS for more info.");
      }
      var at;
      async function Cr(e) {
        if (!Ae) try {
          var t = await ve(e);
          return new Uint8Array(t);
        } catch {
        }
        if (e == at && Ae) e = new Uint8Array(Ae);
        else if (re) e = re(e);
        else throw "both async and sync fetching of the wasm failed";
        return e;
      }
      async function Ir(e, t) {
        try {
          var r = await Cr(e);
          return await WebAssembly.instantiate(r, t);
        } catch (n) {
          he(`failed to asynchronously prepare wasm: ${n}`), Ne(n);
        }
      }
      async function $r(e) {
        var t = at;
        if (!Ae && !Ce(t) && !Z) try {
          var r = fetch(t, { credentials: "same-origin" });
          return await WebAssembly.instantiateStreaming(r, e);
        } catch (n) {
          he(`wasm streaming compile failed: ${n}`), he("falling back to ArrayBuffer instantiation");
        }
        return Ir(t, e);
      }
      class ut {
        constructor(t) {
          ae(this, "name", "ExitStatus");
          this.message = `Program terminated with exit(${t})`, this.status = t;
        }
      }
      var xt = (e) => {
        for (; 0 < e.length; ) e.shift()(a);
      }, Ot = [], Lt = [], Wr = () => {
        var e = a.preRun.shift();
        Lt.push(e);
      }, pe = 0, Pe = null;
      function K(e, t = "i8") {
        switch (t.endsWith("*") && (t = "*"), t) {
          case "i1":
            return T[e];
          case "i8":
            return T[e];
          case "i16":
            return qe[e >> 1];
          case "i32":
            return q[e >> 2];
          case "i64":
            return V[e >> 3];
          case "float":
            return ot[e >> 2];
          case "double":
            return st[e >> 3];
          case "*":
            return E[e >> 2];
          default:
            Ne(`invalid type for getValue: ${t}`);
        }
      }
      var Ie = !0;
      function Me(e) {
        var t = "i32";
        switch (t.endsWith("*") && (t = "*"), t) {
          case "i1":
            T[e] = 0;
            break;
          case "i8":
            T[e] = 0;
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
            ot[e >> 2] = 0;
            break;
          case "double":
            st[e >> 3] = 0;
            break;
          case "*":
            E[e >> 2] = 0;
            break;
          default:
            Ne(`invalid type for setValue: ${t}`);
        }
      }
      var Ut = new TextDecoder(), Dt = (e, t, r, n) => {
        if (r = t + r, n) return r;
        for (; e[t] && !(t >= r); ) ++t;
        return t;
      }, P = (e, t, r) => e ? Ut.decode(I.subarray(e, Dt(I, e, t, r))) : "", Ct = (e, t) => {
        for (var r = 0, n = e.length - 1; 0 <= n; n--) {
          var i = e[n];
          i === "." ? e.splice(n, 1) : i === ".." ? (e.splice(n, 1), r++) : r && (e.splice(n, 1), r--);
        }
        if (t) for (; r; r--) e.unshift("..");
        return e;
      }, lt = (e) => {
        var t = e.charAt(0) === "/", r = e.slice(-1) === "/";
        return (e = Ct(e.split("/").filter((n) => !!n), !t).join("/")) || t || (e = "."), e && r && (e += "/"), (t ? "/" : "") + e;
      }, It = (e) => {
        var t = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(e).slice(1);
        return e = t[0], t = t[1], !e && !t ? "." : (t && (t = t.slice(0, -1)), e + t);
      }, $e = (e) => e && e.match(/([^\/]+|\/)\/*$/)[1], jr = () => {
        if (Z) {
          var e = Nr;
          return (t) => e.randomFillSync(t);
        }
        return (t) => crypto.getRandomValues(t);
      }, $t = (e) => {
        ($t = jr())(e);
      }, Fr = (...e) => {
        for (var t = "", r = !1, n = e.length - 1; -1 <= n && !r; n--) {
          if (r = 0 <= n ? e[n] : "/", typeof r != "string") throw new TypeError("Arguments to path.resolve must be strings");
          if (!r) return "";
          t = r + "/" + t, r = r.charAt(0) === "/";
        }
        return t = Ct(t.split("/").filter((i) => !!i), !r).join("/"), (r ? "/" : "") + t || ".";
      }, We = (e) => {
        var t = Dt(e, 0);
        return Ut.decode(e.buffer ? e.subarray(0, t) : new Uint8Array(e.slice(0, t)));
      }, ft = [], _e = (e) => {
        for (var t = 0, r = 0; r < e.length; ++r) {
          var n = e.charCodeAt(r);
          127 >= n ? t++ : 2047 >= n ? t += 2 : 55296 <= n && 57343 >= n ? (t += 4, ++r) : t += 3;
        }
        return t;
      }, Y = (e, t, r, n) => {
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
      }, Wt = [];
      function jt(e, t) {
        Wt[e] = { input: [], output: [], eb: t }, yt(e, zr);
      }
      var zr = { open(e) {
        var t = Wt[e.node.rdev];
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
      } }, Br = { Bb() {
        var i;
        e: {
          if (!ft.length) {
            var e = null;
            if (Z) {
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
            t = Array(_e(e) + 1), e = Y(e, t, 0, t.length), t.length = e, ft = t;
          }
          e = ft.shift();
        }
        return e;
      }, ub(e, t) {
        t === null || t === 10 ? (nt(We(e.output)), e.output = []) : t != 0 && e.output.push(t);
      }, fsync(e) {
        var t;
        0 < ((t = e.output) == null ? void 0 : t.length) && (nt(We(e.output)), e.output = []);
      }, hc() {
        return { bc: 25856, dc: 5, ac: 191, cc: 35387, $b: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
      }, ic() {
        return 0;
      }, jc() {
        return [24, 80];
      } }, Hr = { ub(e, t) {
        t === null || t === 10 ? (he(We(e.output)), e.output = []) : t != 0 && e.output.push(t);
      }, fsync(e) {
        var t;
        0 < ((t = e.output) == null ? void 0 : t.length) && (he(We(e.output)), e.output = []);
      } }, w = { Wa: null, Xa() {
        return w.createNode(null, "/", 16895, 0);
      }, createNode(e, t, r, n) {
        if ((r & 61440) === 24576 || (r & 61440) === 4096) throw new f(63);
        return w.Wa || (w.Wa = { dir: { node: { Ta: w.La.Ta, Ua: w.La.Ua, lookup: w.La.lookup, ib: w.La.ib, rename: w.La.rename, unlink: w.La.unlink, rmdir: w.La.rmdir, readdir: w.La.readdir, symlink: w.La.symlink }, stream: { Va: w.Ma.Va } }, file: { node: { Ta: w.La.Ta, Ua: w.La.Ua }, stream: { Va: w.Ma.Va, read: w.Ma.read, write: w.Ma.write, jb: w.Ma.jb, kb: w.Ma.kb } }, link: { node: { Ta: w.La.Ta, Ua: w.La.Ua, readlink: w.La.readlink }, stream: {} }, yb: { node: { Ta: w.La.Ta, Ua: w.La.Ua }, stream: Xr } }), r = Vt(e, t, r, n), W(r.mode) ? (r.La = w.Wa.dir.node, r.Ma = w.Wa.dir.stream, r.Na = {}) : (r.mode & 61440) === 32768 ? (r.La = w.Wa.file.node, r.Ma = w.Wa.file.stream, r.Ra = 0, r.Na = null) : (r.mode & 61440) === 40960 ? (r.La = w.Wa.link.node, r.Ma = w.Wa.link.stream) : (r.mode & 61440) === 8192 && (r.La = w.Wa.yb.node, r.Ma = w.Wa.yb.stream), r.atime = r.mtime = r.ctime = Date.now(), e && (e.Na[t] = r, e.atime = e.mtime = e.ctime = r.atime), r;
      }, fc(e) {
        return e.Na ? e.Na.subarray ? e.Na.subarray(0, e.Ra) : new Uint8Array(e.Na) : new Uint8Array(0);
      }, La: {
        Ta(e) {
          var t = {};
          return t.dev = (e.mode & 61440) === 8192 ? e.id : 1, t.ino = e.id, t.mode = e.mode, t.nlink = 1, t.uid = 0, t.gid = 0, t.rdev = e.rdev, W(e.mode) ? t.size = 4096 : (e.mode & 61440) === 32768 ? t.size = e.Ra : (e.mode & 61440) === 40960 ? t.size = e.link.length : t.size = 0, t.atime = new Date(e.atime), t.mtime = new Date(e.mtime), t.ctime = new Date(e.ctime), t.blksize = 4096, t.blocks = Math.ceil(t.size / t.blksize), t;
        },
        Ua(e, t) {
          for (var r of ["mode", "atime", "mtime", "ctime"]) t[r] != null && (e[r] = t[r]);
          t.size !== void 0 && (t = t.size, e.Ra != t && (t == 0 ? (e.Na = null, e.Ra = 0) : (r = e.Na, e.Na = new Uint8Array(t), r && e.Na.set(r.subarray(0, Math.min(t, e.Ra))), e.Ra = t)));
        },
        lookup() {
          throw w.nb || (w.nb = new f(44), w.nb.stack = "<generic error, no stack>"), w.nb;
        },
        ib(e, t, r, n) {
          return w.createNode(e, t, r, n);
        },
        rename(e, t, r) {
          try {
            var n = me(t, r);
          } catch {
          }
          if (n) {
            if (W(e.mode)) for (var i in n.Na) throw new f(55);
            mt(n);
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
          return e = w.createNode(e, t, 41471, 0), e.link = r, e;
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
        if (t.buffer === T.buffer && (s = !1), !n) return 0;
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
        if (e = e.node.Na, i & 2 || !e || e.buffer !== T.buffer) {
          i = !0, n = 65536 * Math.ceil(t / 65536);
          var s = ur(65536, n);
          if (s && I.fill(0, s, s + n), n = s, !n) throw new f(48);
          e && ((0 < r || r + t < e.length) && (e.subarray ? e = e.subarray(r, r + t) : e = Array.prototype.slice.call(e, r, r + t)), T.set(e, n));
        } else i = !1, n = e.byteOffset;
        return { Xb: n, Eb: i };
      }, kb(e, t, r, n) {
        return w.Ma.write(e, t, 0, n, r, !1), 0;
      } } }, Ft = (e, t) => {
        var r = 0;
        return e && (r |= 365), t && (r |= 146), r;
      }, ct = null, zt = {}, ke = [], Vr = 1, ne = null, Bt = !1, Ht = !0, f = class {
        constructor(e) {
          ae(this, "name", "ErrnoError");
          this.Pa = e;
        }
      }, Qr = class {
        constructor() {
          ae(this, "hb", {});
          ae(this, "node", null);
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
      }, Gr = class {
        constructor(e, t, r, n) {
          ae(this, "La", {});
          ae(this, "Ma", {});
          ae(this, "bb", null);
          e || (e = this), this.parent = e, this.Xa = e.Xa, this.id = Vr++, this.name = t, this.mode = r, this.rdev = n, this.atime = this.mtime = this.ctime = Date.now();
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
        if (!e) throw new f(44);
        t.pb ?? (t.pb = !0), e.charAt(0) === "/" || (e = "//" + e);
        var r = 0;
        e: for (; 40 > r; r++) {
          e = e.split("/").filter((y) => !!y);
          for (var n = ct, i = "/", s = 0; s < e.length; s++) {
            var u = s === e.length - 1;
            if (u && t.parent) break;
            if (e[s] !== ".") if (e[s] === "..") if (i = It(i), n === n.parent) {
              e = i + "/" + e.slice(s + 1).join("/"), r--;
              continue e;
            } else n = n.parent;
            else {
              i = lt(i + "/" + e[s]);
              try {
                n = me(n, e[s]);
              } catch (y) {
                if ((y == null ? void 0 : y.Pa) === 44 && u && t.Wb) return { path: i };
                throw y;
              }
              if (!n.bb || u && !t.pb || (n = n.bb.root), (n.mode & 61440) === 40960 && (!u || t.ab)) {
                if (!n.La.readlink) throw new f(52);
                n = n.La.readlink(n), n.charAt(0) === "/" || (n = It(i) + "/" + n), e = n + "/" + e.slice(s + 1).join("/");
                continue e;
              }
            }
          }
          return { path: i, node: n };
        }
        throw new f(32);
      }
      function ht(e) {
        for (var t; ; ) {
          if (e === e.parent) return e = e.Xa.Db, t ? e[e.length - 1] !== "/" ? `${e}/${t}` : e + t : e;
          t = t ? `${e.name}/${t}` : e.name, e = e.parent;
        }
      }
      function pt(e, t) {
        for (var r = 0, n = 0; n < t.length; n++) r = (r << 5) - r + t.charCodeAt(n) | 0;
        return (e + r >>> 0) % ne.length;
      }
      function mt(e) {
        var t = pt(e.parent.id, e.name);
        if (ne[t] === e) ne[t] = e.cb;
        else for (t = ne[t]; t; ) {
          if (t.cb === e) {
            t.cb = e.cb;
            break;
          }
          t = t.cb;
        }
      }
      function me(e, t) {
        var r = W(e.mode) ? (r = Ee(e, "x")) ? r : e.La.lookup ? 0 : 2 : 54;
        if (r) throw new f(r);
        for (r = ne[pt(e.id, t)]; r; r = r.cb) {
          var n = r.name;
          if (r.parent.id === e.id && n === t) return r;
        }
        return e.La.lookup(e, t);
      }
      function Vt(e, t, r, n) {
        return e = new Gr(e, t, r, n), t = pt(e.parent.id, e.name), e.cb = ne[t], ne[t] = e;
      }
      function W(e) {
        return (e & 61440) === 16384;
      }
      function Ee(e, t) {
        return Ht ? 0 : t.includes("r") && !(e.mode & 292) || t.includes("w") && !(e.mode & 146) || t.includes("x") && !(e.mode & 73) ? 2 : 0;
      }
      function Qt(e, t) {
        if (!W(e.mode)) return 54;
        try {
          return me(e, t), 20;
        } catch {
        }
        return Ee(e, "wx");
      }
      function Gt(e, t, r) {
        try {
          var n = me(e, t);
        } catch (i) {
          return i.Pa;
        }
        if (e = Ee(e, "wx")) return e;
        if (r) {
          if (!W(n.mode)) return 54;
          if (n === n.parent || ht(n) === "/") return 10;
        } else if (W(n.mode)) return 31;
        return 0;
      }
      function je(e) {
        if (!e) throw new f(63);
        return e;
      }
      function $(e) {
        if (e = ke[e], !e) throw new f(8);
        return e;
      }
      function Yt(e, t = -1) {
        if (e = Object.assign(new Qr(), e), t == -1) e: {
          for (t = 0; 4096 >= t; t++) if (!ke[t]) break e;
          throw new f(33);
        }
        return e.fd = t, ke[t] = e;
      }
      function Yr(e, t = -1) {
        var r, n;
        return e = Yt(e, t), (n = (r = e.Ma) == null ? void 0 : r.ec) == null || n.call(r, e), e;
      }
      function dt(e, t, r) {
        var n = e == null ? void 0 : e.Ma.Ua;
        e = n ? e : t, n ?? (n = t.La.Ua), je(n), n(e, r);
      }
      var Xr = { open(e) {
        var t, r;
        e.Ma = zt[e.node.rdev].Ma, (r = (t = e.Ma).open) == null || r.call(t, e);
      }, Va() {
        throw new f(70);
      } };
      function yt(e, t) {
        zt[e] = { Ma: t };
      }
      function Xt(e, t) {
        var r = t === "/";
        if (r && ct) throw new f(10);
        if (!r && t) {
          var n = z(t, { pb: !1 });
          if (t = n.path, n = n.node, n.bb) throw new f(10);
          if (!W(n.mode)) throw new f(54);
        }
        t = { type: e, kc: {}, Db: t, Vb: [] }, e = e.Xa(t), e.Xa = t, t.root = e, r ? ct = e : n && (n.bb = t, n.Xa && n.Xa.Vb.push(t));
      }
      function Fe(e, t, r) {
        var n = z(e, { parent: !0 }).node;
        if (e = $e(e), !e) throw new f(28);
        if (e === "." || e === "..") throw new f(20);
        var i = Qt(n, e);
        if (i) throw new f(i);
        if (!n.La.ib) throw new f(63);
        return n.La.ib(n, e, t, r);
      }
      function Jr(e, t = 438) {
        return Fe(e, t & 4095 | 32768, 0);
      }
      function X(e, t = 511) {
        return Fe(e, t & 1023 | 16384, 0);
      }
      function ze(e, t, r) {
        typeof r > "u" && (r = t, t = 438), Fe(e, t | 8192, r);
      }
      function wt(e, t) {
        if (!Fr(e)) throw new f(44);
        var r = z(t, { parent: !0 }).node;
        if (!r) throw new f(44);
        t = $e(t);
        var n = Qt(r, t);
        if (n) throw new f(n);
        if (!r.La.symlink) throw new f(63);
        r.La.symlink(r, t, e);
      }
      function Jt(e) {
        var t = z(e, { parent: !0 }).node;
        e = $e(e);
        var r = me(t, e), n = Gt(t, e, !0);
        if (n) throw new f(n);
        if (!t.La.rmdir) throw new f(63);
        if (r.bb) throw new f(10);
        t.La.rmdir(t, e), mt(r);
      }
      function Zt(e) {
        var t = z(e, { parent: !0 }).node;
        if (!t) throw new f(44);
        e = $e(e);
        var r = me(t, e), n = Gt(t, e, !1);
        if (n) throw new f(n);
        if (!t.La.unlink) throw new f(63);
        if (r.bb) throw new f(10);
        t.La.unlink(t, e), mt(r);
      }
      function Re(e, t) {
        return e = z(e, { ab: !t }).node, je(e.La.Ta)(e);
      }
      function Kt(e, t, r, n) {
        dt(e, t, { mode: r & 4095 | t.mode & -4096, ctime: Date.now(), Lb: n });
      }
      function Be(e, t) {
        e = typeof e == "string" ? z(e, { ab: !0 }).node : e, Kt(null, e, t);
      }
      function er(e, t, r) {
        if (W(t.mode)) throw new f(31);
        if ((t.mode & 61440) !== 32768) throw new f(28);
        var n = Ee(t, "w");
        if (n) throw new f(n);
        dt(e, t, { size: r, timestamp: Date.now() });
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
          var i = e.endsWith("/"), s = z(e, { ab: !(t & 131072), Wb: !0 });
          n = s.node, e = s.path;
        }
        if (s = !1, t & 64) if (n) {
          if (t & 128) throw new f(20);
        } else {
          if (i) throw new f(31);
          n = Fe(e, r | 511, 0), s = !0;
        }
        if (!n) throw new f(44);
        if ((n.mode & 61440) === 8192 && (t &= -513), t & 65536 && !W(n.mode)) throw new f(54);
        if (!s && (n ? (n.mode & 61440) === 40960 ? i = 32 : (i = ["r", "w", "rw"][t & 3], t & 512 && (i += "w"), i = W(n.mode) && (i !== "r" || t & 576) ? 31 : Ee(n, i)) : i = 44, i)) throw new f(i);
        return t & 512 && !s && (i = n, i = typeof i == "string" ? z(i, { ab: !0 }).node : i, er(null, i, 0)), t = Yt({ node: n, path: ht(n), flags: t & -131713, seekable: !0, position: 0, Ma: n.Ma, Yb: [], error: !1 }), t.Ma.open && t.Ma.open(t), s && Be(n, r & 511), t;
      }
      function bt(e) {
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
      function tr(e, t, r) {
        if (e.fd === null) throw new f(8);
        if (!e.seekable || !e.Ma.Va) throw new f(70);
        if (r != 0 && r != 1 && r != 2) throw new f(28);
        e.position = e.Ma.Va(e, t, r), e.Yb = [];
      }
      function rr(e, t, r, n, i) {
        if (0 > n || 0 > i) throw new f(28);
        if (e.fd === null) throw new f(8);
        if ((e.flags & 2097155) === 1) throw new f(8);
        if (W(e.node.mode)) throw new f(31);
        if (!e.Ma.read) throw new f(28);
        var s = typeof i < "u";
        if (!s) i = e.position;
        else if (!e.seekable) throw new f(70);
        return t = e.Ma.read(e, t, r, n, i), s || (e.position += t), t;
      }
      function nr(e, t, r, n, i) {
        if (0 > n || 0 > i) throw new f(28);
        if (e.fd === null) throw new f(8);
        if (!(e.flags & 2097155)) throw new f(8);
        if (W(e.node.mode)) throw new f(31);
        if (!e.Ma.write) throw new f(28);
        e.seekable && e.flags & 1024 && tr(e, 0, 2);
        var s = typeof i < "u";
        if (!s) i = e.position;
        else if (!e.seekable) throw new f(70);
        return t = e.Ma.write(e, t, r, n, i, void 0), s || (e.position += t), t;
      }
      function Zr(e) {
        var t = t || 0;
        t = Se(e, t), e = Re(e).size;
        var r = new Uint8Array(e);
        return rr(t, r, 0, e, 0), bt(t), r;
      }
      function ie(e, t, r) {
        e = lt("/dev/" + e);
        var n = Ft(!!t, !!r);
        ie.Cb ?? (ie.Cb = 64);
        var i = ie.Cb++ << 8 | 0;
        yt(i, { open(s) {
          s.seekable = !1;
        }, close() {
          var s;
          (s = r == null ? void 0 : r.buffer) != null && s.length && r(10);
        }, read(s, u, y, _) {
          for (var b = 0, A = 0; A < _; A++) {
            try {
              var L = t();
            } catch {
              throw new f(29);
            }
            if (L === void 0 && b === 0) throw new f(6);
            if (L == null) break;
            b++, u[y + A] = L;
          }
          return b && (s.node.atime = Date.now()), b;
        }, write(s, u, y, _) {
          for (var b = 0; b < _; b++) try {
            r(u[y + b]);
          } catch {
            throw new f(29);
          }
          return _ && (s.node.mtime = s.node.ctime = Date.now()), b;
        } }), ze(e, n, i);
      }
      var S = {};
      function de(e, t, r) {
        if (t.charAt(0) === "/") return t;
        if (e = e === -100 ? "/" : $(e).path, t.length == 0) {
          if (!r) throw new f(44);
          return e;
        }
        return e + "/" + t;
      }
      function He(e, t) {
        E[e >> 2] = t.dev, E[e + 4 >> 2] = t.mode, E[e + 8 >> 2] = t.nlink, E[e + 12 >> 2] = t.uid, E[e + 16 >> 2] = t.gid, E[e + 20 >> 2] = t.rdev, V[e + 24 >> 3] = BigInt(t.size), q[e + 32 >> 2] = 4096, q[e + 36 >> 2] = t.blocks;
        var r = t.atime.getTime(), n = t.mtime.getTime(), i = t.ctime.getTime();
        return V[e + 40 >> 3] = BigInt(Math.floor(r / 1e3)), E[e + 48 >> 2] = r % 1e3 * 1e6, V[e + 56 >> 3] = BigInt(Math.floor(n / 1e3)), E[e + 64 >> 2] = n % 1e3 * 1e6, V[e + 72 >> 3] = BigInt(Math.floor(i / 1e3)), E[e + 80 >> 2] = i % 1e3 * 1e6, V[e + 88 >> 3] = BigInt(t.ino), 0;
      }
      var Ve = void 0, Qe = () => {
        var e = q[+Ve >> 2];
        return Ve += 4, e;
      }, vt = 0, Kr = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], en = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Te = {}, ir = (e) => {
        var t;
        it = e, Ie || 0 < vt || ((t = a.onExit) == null || t.call(a, e), De = !0), le(e, new ut(e));
      }, tn = (e) => {
        if (!De) try {
          e();
        } catch (t) {
          t instanceof ut || t == "unwind" || le(1, t);
        } finally {
          if (!(Ie || 0 < vt)) try {
            it = e = it, ir(e);
          } catch (t) {
            t instanceof ut || t == "unwind" || le(1, t);
          }
        }
      }, gt = {}, or = () => {
        var n;
        if (!_t) {
          var e = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (((n = globalThis.navigator) == null ? void 0 : n.language) ?? "C").replace("-", "_") + ".UTF-8", _: te || "./this.program" }, t;
          for (t in gt) gt[t] === void 0 ? delete e[t] : e[t] = gt[t];
          var r = [];
          for (t in e) r.push(`${t}=${e[t]}`);
          _t = r;
        }
        return _t;
      }, _t, rn = (e, t, r, n) => {
        var i = { string: (b) => {
          var A = 0;
          if (b != null && b !== 0) {
            A = _e(b) + 1;
            var L = we(A);
            Y(b, I, L, A), A = L;
          }
          return A;
        }, array: (b) => {
          var A = we(b.length);
          return T.set(b, A), A;
        } };
        e = a["_" + e];
        var s = [], u = 0;
        if (n) for (var y = 0; y < n.length; y++) {
          var _ = i[r[y]];
          _ ? (u === 0 && (u = Je()), s[y] = _(n[y])) : s[y] = n[y];
        }
        return r = e(...s), r = function(b) {
          return u !== 0 && Xe(u), t === "string" ? P(b) : t === "boolean" ? !!b : b;
        }(r);
      }, Ge = (e) => {
        var t = _e(e) + 1, r = Ye(t);
        return r && Y(e, I, r, t), r;
      }, ye, kt = [], oe = (e) => {
        ye.delete(se.get(e)), se.set(e, null), kt.push(e);
      }, sr = (e) => {
        const t = e.length;
        return [t % 128 | 128, t >> 7, ...e];
      }, nn = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 }, ar = (e) => sr(Array.from(e, (t) => nn[t])), xe = (e, t) => {
        if (!ye) {
          ye = /* @__PURE__ */ new WeakMap();
          var r = se.length;
          if (ye) for (var n = 0; n < 0 + r; n++) {
            var i = se.get(n);
            i && ye.set(i, n);
          }
        }
        if (r = ye.get(e) || 0) return r;
        r = kt.length ? kt.pop() : se.grow(1);
        try {
          se.set(r, e);
        } catch (s) {
          if (!(s instanceof TypeError)) throw s;
          t = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...sr([1, 96, ...ar(t.slice(1)), ...ar(t[0] === "v" ? "" : t[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0), t = new WebAssembly.Module(t), t = new WebAssembly.Instance(t, { e: { f: e } }).exports.f, se.set(r, t);
        }
        return ye.set(e, r), r;
      };
      if (ne = Array(4096), Xt(w, "/"), X("/tmp"), X("/home"), X("/home/web_user"), function() {
        X("/dev"), yt(259, { read: () => 0, write: (n, i, s, u) => u, Va: () => 0 }), ze("/dev/null", 259), jt(1280, Br), jt(1536, Hr), ze("/dev/tty", 1280), ze("/dev/tty1", 1536);
        var e = new Uint8Array(1024), t = 0, r = () => (t === 0 && ($t(e), t = e.byteLength), e[--t]);
        ie("random", r), ie("urandom", r), X("/dev/shm"), X("/dev/shm/tmp");
      }(), function() {
        X("/proc");
        var e = X("/proc/self");
        X("/proc/self/fd"), Xt({ Xa() {
          var t = Vt(e, "fd", 16895, 73);
          return t.Ma = { Va: w.Ma.Va }, t.La = { lookup(r, n) {
            r = +n;
            var i = $(r);
            return r = { parent: null, Xa: { Db: "fake" }, La: { readlink: () => i.path }, id: r + 1 }, r.parent = r;
          }, readdir() {
            return Array.from(ke.entries()).filter(([, r]) => r).map(([r]) => r.toString());
          } }, t;
        } }, "/proc/self/fd");
      }(), a.noExitRuntime && (Ie = a.noExitRuntime), a.print && (nt = a.print), a.printErr && (he = a.printErr), a.wasmBinary && (Ae = a.wasmBinary), a.thisProgram && (te = a.thisProgram), a.preInit) for (typeof a.preInit == "function" && (a.preInit = [a.preInit]); 0 < a.preInit.length; ) a.preInit.shift()();
      a.stackSave = () => Je(), a.stackRestore = (e) => Xe(e), a.stackAlloc = (e) => we(e), a.cwrap = (e, t, r, n) => {
        var i = !r || r.every((s) => s === "number" || s === "boolean");
        return t !== "string" && i && !n ? a["_" + e] : (...s) => rn(e, t, r, s);
      }, a.addFunction = xe, a.removeFunction = oe, a.UTF8ToString = P, a.stringToNewUTF8 = Ge, a.writeArrayToMemory = (e, t) => {
        T.set(e, t);
      };
      var Ye, Oe, ur, lr, Xe, we, Je, Ze, se, on = {
        a: (e, t, r, n) => Ne(`Assertion failed: ${P(e)}, at: ` + [t ? P(t) : "unknown filename", r, n ? P(n) : "unknown function"]),
        i: function(e, t) {
          try {
            return e = P(e), Be(e, t), 0;
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        L: function(e, t, r) {
          try {
            if (t = P(t), t = de(e, t), r & -8) return -28;
            var n = z(t, { ab: !0 }).node;
            return n ? (e = "", r & 4 && (e += "r"), r & 2 && (e += "w"), r & 1 && (e += "x"), e && Ee(n, e) ? -2 : 0) : -44;
          } catch (i) {
            if (typeof S > "u" || i.name !== "ErrnoError") throw i;
            return -i.Pa;
          }
        },
        j: function(e, t) {
          try {
            var r = $(e);
            return Kt(r, r.node, t, !1), 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        h: function(e) {
          try {
            var t = $(e);
            return dt(t, t.node, { timestamp: Date.now(), Lb: !1 }), 0;
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        b: function(e, t, r) {
          Ve = r;
          try {
            var n = $(e);
            switch (t) {
              case 0:
                var i = Qe();
                if (0 > i) break;
                for (; ke[i]; ) i++;
                return Yr(n, i).fd;
              case 1:
              case 2:
                return 0;
              case 3:
                return n.flags;
              case 4:
                return i = Qe(), n.flags |= i, 0;
              case 12:
                return i = Qe(), qe[i + 0 >> 1] = 2, 0;
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
            var r = $(e), n = r.node, i = r.Ma.Ta;
            e = i ? r : n, i ?? (i = n.La.Ta), je(i);
            var s = i(e);
            return He(t, s);
          } catch (u) {
            if (typeof S > "u" || u.name !== "ErrnoError") throw u;
            return -u.Pa;
          }
        },
        H: function(e, t) {
          t = -9007199254740992 > t || 9007199254740992 < t ? NaN : Number(t);
          try {
            if (isNaN(t)) return -61;
            var r = $(e);
            if (0 > t || !(r.flags & 2097155)) throw new f(28);
            return er(r, r.node, t), 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        G: function(e, t) {
          try {
            if (t === 0) return -28;
            var r = _e("/") + 1;
            return t < r ? -68 : (Y("/", I, e, t), r);
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        K: function(e, t) {
          try {
            return e = P(e), He(t, Re(e, !0));
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        C: function(e, t, r) {
          try {
            return t = P(t), t = de(e, t), X(t, r), 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        J: function(e, t, r, n) {
          try {
            t = P(t);
            var i = n & 256;
            return t = de(e, t, n & 4096), He(r, i ? Re(t, !0) : Re(t));
          } catch (s) {
            if (typeof S > "u" || s.name !== "ErrnoError") throw s;
            return -s.Pa;
          }
        },
        x: function(e, t, r, n) {
          Ve = n;
          try {
            t = P(t), t = de(e, t);
            var i = n ? Qe() : 0;
            return Se(t, r, i).fd;
          } catch (s) {
            if (typeof S > "u" || s.name !== "ErrnoError") throw s;
            return -s.Pa;
          }
        },
        v: function(e, t, r, n) {
          try {
            if (t = P(t), t = de(e, t), 0 >= n) return -28;
            var i = z(t).node;
            if (!i) throw new f(44);
            if (!i.La.readlink) throw new f(28);
            var s = i.La.readlink(i), u = Math.min(n, _e(s)), y = T[r + u];
            return Y(
              s,
              I,
              r,
              n + 1
            ), T[r + u] = y, u;
          } catch (_) {
            if (typeof S > "u" || _.name !== "ErrnoError") throw _;
            return -_.Pa;
          }
        },
        u: function(e) {
          try {
            return e = P(e), Jt(e), 0;
          } catch (t) {
            if (typeof S > "u" || t.name !== "ErrnoError") throw t;
            return -t.Pa;
          }
        },
        f: function(e, t) {
          try {
            return e = P(e), He(t, Re(e));
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return -r.Pa;
          }
        },
        r: function(e, t, r) {
          try {
            if (t = P(t), t = de(e, t), r) if (r === 512) Jt(t);
            else return -28;
            else Zt(t);
            return 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return -n.Pa;
          }
        },
        q: function(e, t, r) {
          try {
            t = P(t), t = de(e, t, !0);
            var n = Date.now(), i, s;
            if (r) {
              var u = E[r >> 2] + 4294967296 * q[r + 4 >> 2], y = q[r + 8 >> 2];
              y == 1073741823 ? i = n : y == 1073741822 ? i = null : i = 1e3 * u + y / 1e6, r += 16, u = E[r >> 2] + 4294967296 * q[r + 4 >> 2], y = q[r + 8 >> 2], y == 1073741823 ? s = n : y == 1073741822 ? s = null : s = 1e3 * u + y / 1e6;
            } else s = i = n;
            if ((s ?? i) !== null) {
              e = i;
              var _ = z(t, { ab: !0 }).node;
              je(_.La.Ua)(_, { atime: e, mtime: s });
            }
            return 0;
          } catch (b) {
            if (typeof S > "u" || b.name !== "ErrnoError") throw b;
            return -b.Pa;
          }
        },
        m: () => Ne(""),
        l: () => {
          Ie = !1, vt = 0;
        },
        A: function(e, t) {
          e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e), e = new Date(1e3 * e), q[t >> 2] = e.getSeconds(), q[t + 4 >> 2] = e.getMinutes(), q[t + 8 >> 2] = e.getHours(), q[t + 12 >> 2] = e.getDate(), q[t + 16 >> 2] = e.getMonth(), q[t + 20 >> 2] = e.getFullYear() - 1900, q[t + 24 >> 2] = e.getDay();
          var r = e.getFullYear();
          q[t + 28 >> 2] = (r % 4 !== 0 || r % 100 === 0 && r % 400 !== 0 ? en : Kr)[e.getMonth()] + e.getDate() - 1 | 0, q[t + 36 >> 2] = -(60 * e.getTimezoneOffset()), r = new Date(e.getFullYear(), 6, 1).getTimezoneOffset();
          var n = new Date(e.getFullYear(), 0, 1).getTimezoneOffset();
          q[t + 32 >> 2] = (r != n && e.getTimezoneOffset() == Math.min(n, r)) | 0;
        },
        y: function(e, t, r, n, i, s, u) {
          i = -9007199254740992 > i || 9007199254740992 < i ? NaN : Number(i);
          try {
            var y = $(n);
            if (t & 2 && !(r & 2) && (y.flags & 2097155) !== 2) throw new f(2);
            if ((y.flags & 2097155) === 1) throw new f(2);
            if (!y.Ma.jb) throw new f(43);
            if (!e) throw new f(28);
            var _ = y.Ma.jb(y, e, i, t, r), b = _.Xb;
            return q[s >> 2] = _.Eb, E[u >> 2] = b, 0;
          } catch (A) {
            if (typeof S > "u" || A.name !== "ErrnoError") throw A;
            return -A.Pa;
          }
        },
        z: function(e, t, r, n, i, s) {
          s = -9007199254740992 > s || 9007199254740992 < s ? NaN : Number(s);
          try {
            var u = $(i);
            if (r & 2) {
              if (r = s, (u.node.mode & 61440) !== 32768) throw new f(43);
              if (!(n & 2)) {
                var y = I.slice(e, e + t);
                u.Ma.kb && u.Ma.kb(u, y, r, t, n);
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
            delete Te[e], tn(() => lr(e, performance.now()));
          }, t);
          return Te[e] = { id: r, lc: t }, 0;
        },
        B: (e, t, r, n) => {
          var i = (/* @__PURE__ */ new Date()).getFullYear(), s = new Date(i, 0, 1).getTimezoneOffset();
          i = new Date(i, 6, 1).getTimezoneOffset(), E[e >> 2] = 60 * Math.max(s, i), q[t >> 2] = +(s != i), t = (u) => {
            var y = Math.abs(u);
            return `UTC${0 <= u ? "-" : "+"}${String(Math.floor(y / 60)).padStart(2, "0")}${String(y % 60).padStart(2, "0")}`;
          }, e = t(s), t = t(i), i < s ? (Y(e, I, r, 17), Y(t, I, n, 17)) : (Y(e, I, n, 17), Y(t, I, r, 17));
        },
        d: () => Date.now(),
        s: () => 2147483648,
        c: () => performance.now(),
        o: (e) => {
          var t = I.length;
          if (e >>>= 0, 2147483648 < e) return !1;
          for (var r = 1; 4 >= r; r *= 2) {
            var n = t * (1 + 0.2 / r);
            n = Math.min(n, e + 100663296);
            e: {
              n = (Math.min(2147483648, 65536 * Math.ceil(Math.max(
                e,
                n
              ) / 65536)) - Ze.buffer.byteLength + 65535) / 65536 | 0;
              try {
                Ze.grow(n), Tt();
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
          for (i of or()) {
            var s = t + r;
            E[e + n >> 2] = s, r += Y(i, I, s, 1 / 0) + 1, n += 4;
          }
          return 0;
        },
        F: (e, t) => {
          var r = or();
          E[e >> 2] = r.length, e = 0;
          for (var n of r) e += _e(n) + 1;
          return E[t >> 2] = e, 0;
        },
        e: function(e) {
          try {
            var t = $(e);
            return bt(t), 0;
          } catch (r) {
            if (typeof S > "u" || r.name !== "ErrnoError") throw r;
            return r.Pa;
          }
        },
        p: function(e, t) {
          try {
            var r = $(e);
            return T[t] = r.tty ? 2 : W(r.mode) ? 3 : (r.mode & 61440) === 40960 ? 7 : 4, qe[t + 2 >> 1] = 0, V[t + 8 >> 3] = BigInt(0), V[t + 16 >> 3] = BigInt(0), 0;
          } catch (n) {
            if (typeof S > "u" || n.name !== "ErrnoError") throw n;
            return n.Pa;
          }
        },
        w: function(e, t, r, n) {
          try {
            e: {
              var i = $(e);
              e = t;
              for (var s, u = t = 0; u < r; u++) {
                var y = E[e >> 2], _ = E[e + 4 >> 2];
                e += 8;
                var b = rr(i, T, y, _, s);
                if (0 > b) {
                  var A = -1;
                  break e;
                }
                if (t += b, b < _) break;
                typeof s < "u" && (s += b);
              }
              A = t;
            }
            return E[n >> 2] = A, 0;
          } catch (L) {
            if (typeof S > "u" || L.name !== "ErrnoError") throw L;
            return L.Pa;
          }
        },
        D: function(e, t, r, n) {
          t = -9007199254740992 > t || 9007199254740992 < t ? NaN : Number(t);
          try {
            if (isNaN(t)) return 61;
            var i = $(e);
            return tr(i, t, r), V[n >> 3] = BigInt(i.position), i.rb && t === 0 && r === 0 && (i.rb = null), 0;
          } catch (s) {
            if (typeof S > "u" || s.name !== "ErrnoError") throw s;
            return s.Pa;
          }
        },
        I: function(e) {
          var r, n;
          try {
            var t = $(e);
            return (n = (r = t.Ma) == null ? void 0 : r.fsync) == null ? void 0 : n.call(r, t);
          } catch (i) {
            if (typeof S > "u" || i.name !== "ErrnoError") throw i;
            return i.Pa;
          }
        },
        t: function(e, t, r, n) {
          try {
            e: {
              var i = $(e);
              e = t;
              for (var s, u = t = 0; u < r; u++) {
                var y = E[e >> 2], _ = E[e + 4 >> 2];
                e += 8;
                var b = nr(i, T, y, _, s);
                if (0 > b) {
                  var A = -1;
                  break e;
                }
                if (t += b, b < _) break;
                typeof s < "u" && (s += b);
              }
              A = t;
            }
            return E[n >> 2] = A, 0;
          } catch (L) {
            if (typeof S > "u" || L.name !== "ErrnoError") throw L;
            return L.Pa;
          }
        },
        k: ir
      };
      function Et() {
        function e() {
          var i;
          if (a.calledRun = !0, !De) {
            if (!a.noFSInit && !Bt) {
              var t, r;
              Bt = !0, t ?? (t = a.stdin), r ?? (r = a.stdout), n ?? (n = a.stderr), t ? ie("stdin", t) : wt("/dev/tty", "/dev/stdin"), r ? ie("stdout", null, r) : wt("/dev/tty", "/dev/stdout"), n ? ie("stderr", null, n) : wt("/dev/tty1", "/dev/stderr"), Se("/dev/stdin", 0), Se("/dev/stdout", 1), Se("/dev/stderr", 1);
            }
            if (St.N(), Ht = !1, (i = a.onRuntimeInitialized) == null || i.call(a), a.postRun) for (typeof a.postRun == "function" && (a.postRun = [a.postRun]); a.postRun.length; ) {
              var n = a.postRun.shift();
              Ot.push(n);
            }
            xt(Ot);
          }
        }
        if (0 < pe) Pe = Et;
        else {
          if (a.preRun) for (typeof a.preRun == "function" && (a.preRun = [a.preRun]); a.preRun.length; ) Wr();
          xt(Lt), 0 < pe ? Pe = Et : a.setStatus ? (a.setStatus("Running..."), setTimeout(() => {
            setTimeout(() => a.setStatus(""), 1), e();
          }, 1)) : e();
        }
      }
      var St;
      return async function() {
        var r;
        function e(n) {
          var i;
          return n = St = n.exports, a._sqlite3_free = n.P, a._sqlite3_value_text = n.Q, a._sqlite3_prepare_v2 = n.R, a._sqlite3_step = n.S, a._sqlite3_reset = n.T, a._sqlite3_exec = n.U, a._sqlite3_finalize = n.V, a._sqlite3_column_name = n.W, a._sqlite3_column_text = n.X, a._sqlite3_column_type = n.Y, a._sqlite3_errmsg = n.Z, a._sqlite3_clear_bindings = n._, a._sqlite3_value_blob = n.$, a._sqlite3_value_bytes = n.aa, a._sqlite3_value_double = n.ba, a._sqlite3_value_int = n.ca, a._sqlite3_value_type = n.da, a._sqlite3_result_blob = n.ea, a._sqlite3_result_double = n.fa, a._sqlite3_result_error = n.ga, a._sqlite3_result_int = n.ha, a._sqlite3_result_int64 = n.ia, a._sqlite3_result_null = n.ja, a._sqlite3_result_text = n.ka, a._sqlite3_aggregate_context = n.la, a._sqlite3_column_count = n.ma, a._sqlite3_data_count = n.na, a._sqlite3_column_blob = n.oa, a._sqlite3_column_bytes = n.pa, a._sqlite3_column_double = n.qa, a._sqlite3_bind_blob = n.ra, a._sqlite3_bind_double = n.sa, a._sqlite3_bind_int = n.ta, a._sqlite3_bind_text = n.ua, a._sqlite3_bind_parameter_index = n.va, a._sqlite3_sql = n.wa, a._sqlite3_normalized_sql = n.xa, a._sqlite3_changes = n.ya, a._sqlite3_close_v2 = n.za, a._sqlite3_create_function_v2 = n.Aa, a._sqlite3_update_hook = n.Ba, a._sqlite3_open = n.Ca, Ye = a._malloc = n.Da, Oe = a._free = n.Ea, a._RegisterExtensionFunctions = n.Fa, ur = n.Ga, lr = n.Ha, Xe = n.Ia, we = n.Ja, Je = n.Ka, Ze = n.M, se = n.O, Tt(), pe--, (i = a.monitorRunDependencies) == null || i.call(a, pe), pe == 0 && Pe && (n = Pe, Pe = null, n()), St;
        }
        pe++, (r = a.monitorRunDependencies) == null || r.call(a, pe);
        var t = { a: on };
        return a.instantiateWasm ? new Promise((n) => {
          a.instantiateWasm(t, (i, s) => {
            n(e(i));
          });
        }) : (at ?? (at = a.locateFile ? a.locateFile("sql-wasm.wasm", ce) : ce + "sql-wasm.wasm"), e((await $r(t)).instance));
      }(), Et(), x;
    }), d);
  };
  c.exports = M, c.exports.default = M;
})(Pr);
var In = Pr.exports;
const $n = /* @__PURE__ */ Cn(In), Rt = D.dirname(Un(import.meta.url));
process.env.APP_ROOT = D.join(Rt, "..");
const et = process.env.VITE_DEV_SERVER_URL, ni = D.join(process.env.APP_ROOT, "dist-electron"), Mr = D.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = et ? D.join(process.env.APP_ROOT, "public") : Mr;
let g = null;
const tt = "CommandOrControl+Alt+A", Rr = {
  launchOnStartup: !1,
  startMinimized: !1,
  quickSearchHotkey: tt
};
let j = { ...Rr };
function Tr() {
  return D.join(ee.getPath("userData"), "desktop-settings.json");
}
function Wn() {
  try {
    const c = JSON.parse(O.readFileSync(Tr(), "utf-8"));
    j = { ...Rr, ...c };
  } catch {
  }
}
function xr() {
  try {
    O.writeFileSync(Tr(), JSON.stringify(j, null, 2));
  } catch (c) {
    console.error("Failed to persist desktop settings:", c);
  }
}
const jn = process.argv.includes("--start-minimized");
function rt(c) {
  try {
    return Pt.register(c, () => {
      g && (g.isMinimized() && g.restore(), g.focus(), g.webContents.send("toggle-quick-search"));
    }) ? null : `Could not register "${c}" - it may already be in use by another app.`;
  } catch {
    return `"${c}" is not a valid hotkey.`;
  }
}
function Fn() {
  const c = [ee.getAppPath()];
  j.startMinimized && c.push("--start-minimized"), ee.setLoginItemSettings({
    openAtLogin: j.launchOnStartup,
    path: process.execPath,
    args: c
  });
}
function Sr() {
  g = new Ar({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: !1,
    titleBarStyle: "hidden",
    backgroundColor: "#09090b",
    show: !1,
    webPreferences: {
      preload: D.join(Rt, "preload.cjs"),
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), g.webContents.on("console-message", (c, m, d, M, R) => {
    console.log(`[Renderer Console ${m}] ${d} (${R}:${M})`);
  }), g.webContents.on("did-fail-load", (c, m, d) => {
    console.error(`[Load Error ${m}] ${d}`);
  }), g.once("ready-to-show", () => {
    jn ? g == null || g.minimize() : g == null || g.show(), et && (g == null || g.webContents.openDevTools({ mode: "detach" }));
  }), et ? g.loadURL(et) : g.loadFile(D.join(Mr, "index.html"));
}
ee.whenReady().then(() => {
  Wn(), Sr();
  const c = rt(j.quickSearchHotkey);
  c && (console.error("Quick-search hotkey:", c), j.quickSearchHotkey !== tt && (j.quickSearchHotkey = tt, xr(), rt(tt))), ee.on("activate", () => {
    Ar.getAllWindows().length === 0 && Sr();
  });
});
ee.on("will-quit", () => {
  Pt.unregisterAll();
});
ee.on("window-all-closed", () => {
  process.platform !== "darwin" && ee.quit();
});
H.on("window-minimize", () => {
  g == null || g.minimize();
});
H.on("window-maximize", () => {
  g != null && g.isMaximized() ? g.unmaximize() : g == null || g.maximize();
});
H.on("window-close", () => {
  g == null || g.close();
});
H.handle("desktop-settings-get", () => ({ ...j }));
H.handle("desktop-settings-set", (c, m) => {
  const d = { ...j };
  j = { ...j, ...m };
  let M = null;
  if (m.quickSearchHotkey && m.quickSearchHotkey !== d.quickSearchHotkey) {
    try {
      Pt.unregister(d.quickSearchHotkey);
    } catch {
    }
    M = rt(j.quickSearchHotkey), M && (j.quickSearchHotkey = d.quickSearchHotkey, rt(d.quickSearchHotkey));
  }
  return ("launchOnStartup" in m || "startMinimized" in m) && Fn(), xr(), { settings: { ...j }, error: M };
});
H.on("open-external", (c, m) => {
  m && (m.startsWith("http://") || m.startsWith("https://")) && qr.openExternal(m);
});
function zn(c) {
  const d = c.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), M = Buffer.from(d, "base64").toString("utf-8");
  return JSON.parse(M);
}
H.handle("google-oauth", async () => new Promise((c) => {
  const M = `https://accounts.google.com/o/oauth2/v2/auth?client_id=103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com&response_type=id_token%20token&redirect_uri=${encodeURIComponent("https://password-manager.fayber.dev/oauth/callback")}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;
  let R = !1;
  const C = Dn.createServer((U, x) => {
    if (x.setHeader("Access-Control-Allow-Origin", "*"), U.url && U.url.startsWith("/token")) {
      const a = new URL(U.url, "http://127.0.0.1:28999").searchParams.get("id_token");
      if (x.end("ok"), a && !R) {
        R = !0;
        try {
          const N = zn(a);
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
        C.close();
      }
    } else
      x.end("");
  });
  C.listen(28999, "127.0.0.1", () => {
    qr.openExternal(M);
  }), setTimeout(() => {
    if (!R) {
      R = !0;
      try {
        C.close();
      } catch {
      }
      c(null);
    }
  }, 5 * 60 * 1e3);
}));
function Bn() {
  return new Promise((c) => {
    Mt("tasklist", ["/FI", "IMAGENAME eq chrome.exe", "/NH"], (m, d) => {
      if (m) return c(!1);
      c(/chrome\.exe/i.test(d));
    });
  });
}
function Hn(c) {
  return new Promise((m, d) => {
    Mt(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", "Add-Type -AssemblyName System.Security; $b=[Convert]::FromBase64String($env:NP_ENC_KEY); $k=[System.Security.Cryptography.ProtectedData]::Unprotect($b,$null,'CurrentUser'); [Convert]::ToBase64String($k)"],
      { env: { ...process.env, NP_ENC_KEY: c }, maxBuffer: 1024 * 1024 },
      (R, C) => {
        if (R) return d(R);
        try {
          m(Buffer.from(C.trim(), "base64"));
        } catch (U) {
          d(U);
        }
      }
    );
  });
}
function Vn(c, m) {
  if (c.length < 31) return null;
  const d = c.subarray(0, 3).toString("latin1");
  if (d !== "v10" && d !== "v11") return null;
  const M = c.subarray(3, 15), R = c.subarray(c.length - 16), C = c.subarray(15, c.length - 16);
  try {
    const U = Nr.createDecipheriv("aes-256-gcm", m, M);
    return U.setAuthTag(R), Buffer.concat([U.update(C), U.final()]).toString("utf-8");
  } catch {
    return null;
  }
}
H.handle("chrome-import", async () => {
  var c;
  try {
    if (process.platform !== "win32")
      return { ok: !1, error: "Direct browser import is only available on Windows." };
    if (await Bn())
      return { ok: !1, error: "Please fully close Google Chrome, then try again." };
    const m = process.env.LOCALAPPDATA || D.join(Nt.homedir(), "AppData", "Local"), d = D.join(m, "Google", "Chrome", "User Data");
    if (!O.existsSync(d))
      return { ok: !1, error: "No Google Chrome installation was found for this user." };
    const M = D.join(d, "Local State");
    let R;
    try {
      const N = JSON.parse(O.readFileSync(M, "utf-8")), J = (c = N == null ? void 0 : N.os_crypt) == null ? void 0 : c.encrypted_key;
      if (!J) return { ok: !1, error: "Couldn't read Chrome's encryption key." };
      const te = Buffer.from(J, "base64").subarray(5);
      R = await Hn(te.toString("base64"));
    } catch {
      return { ok: !1, error: "Couldn't decrypt Chrome's encryption key (Windows DPAPI)." };
    }
    const C = await $n({ locateFile: () => D.join(Rt, "sql-wasm.wasm") }), U = O.readdirSync(d, { withFileTypes: !0 }).filter((N) => N.isDirectory() && (N.name === "Default" || /^Profile \d+$/.test(N.name))).map((N) => N.name), x = [];
    let ue = 0, a = 0;
    for (const N of U) {
      const J = D.join(d, N, "Login Data");
      if (!O.existsSync(J)) continue;
      const Z = D.join(Nt.tmpdir(), `nextpass-logindata-${Date.now()}-${N.replace(/\W/g, "")}`);
      try {
        O.copyFileSync(J, Z);
        const te = new C.Database(O.readFileSync(Z));
        try {
          const le = te.exec("SELECT origin_url, username_value, password_value FROM logins");
          if (le.length > 0) {
            a++;
            for (const fe of le[0].values) {
              const ce = String(fe[0] ?? ""), ve = String(fe[1] ?? ""), re = fe[2];
              if (!(re instanceof Uint8Array) || re.length === 0) {
                (ce || ve) && ue++;
                continue;
              }
              const ge = Vn(Buffer.from(re), R);
              if (ge === null) {
                ue++;
                continue;
              }
              x.push({ url: ce, username: ve, password: ge });
            }
          }
        } finally {
          te.close();
        }
      } catch {
      } finally {
        try {
          O.unlinkSync(Z);
        } catch {
        }
      }
    }
    return { ok: !0, credentials: x, undecryptable: ue, profiles: a };
  } catch (m) {
    return { ok: !1, error: m instanceof Error ? m.message : "Chrome import failed." };
  }
});
function Ue() {
  return D.join(ee.getPath("userData"), "hello-unlock.bin");
}
const Qn = `
[void][Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
function Await-WinRT($op, [Type]$resultType) {
  $m = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'GetAwaiter' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
  $awaiter = $m.MakeGenericMethod($resultType).Invoke($null, @($op))
  while (-not $awaiter.IsCompleted) { Start-Sleep -Milliseconds 50 }
  $awaiter.GetResult()
}
`;
function Or(c, m, d) {
  return new Promise((M, R) => {
    const C = D.join(Nt.tmpdir(), `nextpass-hello-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`);
    O.writeFileSync(C, Qn + c, "utf-8"), Mt(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", C],
      { env: { ...process.env, ...m }, timeout: d, maxBuffer: 1024 * 1024 },
      (U, x) => {
        try {
          O.unlinkSync(C);
        } catch {
        }
        if (U) return R(U);
        M(x.trim());
      }
    );
  });
}
let Le = null;
async function Lr() {
  if (process.platform !== "win32") return !1;
  if (Le !== null) return Le;
  try {
    const c = await Or(
      `$r = Await-WinRT ([Windows.Security.Credentials.UI.UserConsentVerifier]::CheckAvailabilityAsync()) ([Windows.Security.Credentials.UI.UserConsentVerifierAvailability])
Write-Output ("result=" + $r)`,
      {},
      2e4
    );
    Le = /result=Available/.test(c);
  } catch {
    Le = !1;
  }
  return Le;
}
async function Ur(c) {
  const m = await Or(
    `$r = Await-WinRT ([Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync($env:NP_HELLO_MSG)) ([Windows.Security.Credentials.UI.UserConsentVerificationResult])
Write-Output ("result=" + $r)`,
    { NP_HELLO_MSG: c },
    12e4
    // generous - the user is interacting with the Hello dialog
  ), d = /result=(\w+)/.exec(m);
  return (d == null ? void 0 : d[1]) ?? "Unknown";
}
function Dr(c) {
  switch (c) {
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
H.handle("hello-status", async () => process.platform !== "win32" ? { available: !1, enabled: !1 } : { available: await Lr(), enabled: O.existsSync(Ue()) });
H.handle("hello-enable", async (c, m) => {
  try {
    if (process.platform !== "win32") return { ok: !1, error: "Windows Hello requires Windows." };
    if (typeof m != "string" || !m) return { ok: !1, error: "No vault key provided." };
    if (!await Lr())
      return { ok: !1, error: "Windows Hello is not set up on this PC (Settings > Accounts > Sign-in options)." };
    if (!qt.isEncryptionAvailable())
      return { ok: !1, error: "Windows credential encryption (DPAPI) is unavailable." };
    const d = await Ur("Confirm your identity to enable Windows Hello unlock for NextPass");
    return d !== "Verified" ? { ok: !1, error: Dr(d) } : (O.writeFileSync(Ue(), qt.encryptString(m), { mode: 384 }), { ok: !0 });
  } catch (d) {
    return { ok: !1, error: d instanceof Error ? d.message : "Could not enable Windows Hello unlock." };
  }
});
H.handle("hello-unlock", async () => {
  try {
    const c = Ue();
    if (!O.existsSync(c))
      return { ok: !1, error: "Windows Hello unlock is not set up on this device." };
    const m = await Ur("Unlock your NextPass vault");
    return m !== "Verified" ? { ok: !1, error: Dr(m) } : { ok: !0, vaultKey: qt.decryptString(O.readFileSync(c)) };
  } catch {
    try {
      O.unlinkSync(Ue());
    } catch {
    }
    return { ok: !1, error: "Could not read the stored key. Unlock with your master password and re-enable Windows Hello." };
  }
});
H.handle("hello-disable", async () => {
  try {
    O.unlinkSync(Ue());
  } catch {
  }
  return { ok: !0 };
});
export {
  ni as MAIN_DIST,
  Mr as RENDERER_DIST,
  et as VITE_DEV_SERVER_URL
};
