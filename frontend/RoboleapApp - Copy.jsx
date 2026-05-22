import { useState, useEffect, useCallback, useRef } from "react";

// ─── API Layer ────────────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:8000";

function useApi() {
  const token = typeof window !== "undefined" ? localStorage.getItem("rl_token") : null;

  const req = useCallback(async (method, path, body = null) => {
    const t = localStorage.getItem("rl_token");
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Token ${t}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    const res = await fetch(`${BASE_URL}${path}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(err.detail || "Request failed"), { status: res.status, data: err });
    }
    if (res.status === 204) return null;
    return res.json();
  }, []);

  return {
    get:    (path)         => req("GET",    path),
    post:   (path, body)   => req("POST",   path, body),
    patch:  (path, body)   => req("PATCH",  path, body),
    del:    (path)         => req("DELETE", path),
    login:  async (username, password) => {
      const data = await req("POST", "/api/auth/login/", { username, password });
      localStorage.setItem("rl_token", data.token);
      return data;
    },
    me:     () => req("GET", "/api/auth/me/"),
    logout: () => localStorage.removeItem("rl_token"),
  };
}

// ─── Theme & Tokens ───────────────────────────────────────────────────────────

const COLORS = {
  bg:       "#0D0F14",
  surface:  "#13161E",
  surface2: "#1A1E29",
  border:   "#252A38",
  border2:  "#2E3447",
  accent:   "#4F7FFF",
  accentDim:"#1E3A7A",
  gold:     "#F5C542",
  goldDim:  "#5C4A0A",
  green:    "#2DD4A0",
  greenDim: "#0A3D2E",
  red:      "#FF5E6C",
  redDim:   "#4A111A",
  amber:    "#FFAA3B",
  amberDim: "#4A2D00",
  text:     "#E8EAF0",
  textMid:  "#8B92A8",
  textDim:  "#4A5068",
};

const ROLE_META = {
  admin:      { label: "Administrator",        color: COLORS.gold,  icon: "⬡" },
  secretary:  { label: "Secretary",            color: COLORS.accent, icon: "◈" },
  instructor: { label: "Instructor",           color: COLORS.green, icon: "◇" },
  finance:    { label: "Financial Dept",       color: COLORS.amber, icon: "◆" },
  tools:      { label: "Tools & Resources",    color: COLORS.textMid,icon: "○" },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  app: {
    minHeight: "100vh",
    background: COLORS.bg,
    color: COLORS.text,
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    display: "flex",
  },

  // Sidebar
  sidebar: {
    width: 220,
    minHeight: "100vh",
    background: COLORS.surface,
    borderRight: `1px solid ${COLORS.border}`,
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    position: "sticky",
    top: 0,
    height: "100vh",
    overflowY: "auto",
  },
  sidebarLogo: {
    padding: "24px 20px 16px",
    borderBottom: `1px solid ${COLORS.border}`,
    marginBottom: 8,
  },
  logoMark: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.green})`,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: -1,
  },
  logoText: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: -0.3,
    color: COLORS.text,
  },
  logoSub: {
    fontSize: 10,
    color: COLORS.textDim,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 1,
  },

  navSection: { padding: "8px 12px", marginBottom: 4 },
  navLabel: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 2,
    color: COLORS.textDim,
    textTransform: "uppercase",
    padding: "8px 8px 4px",
  },
  navItem: (active) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: active ? 500 : 400,
    color: active ? COLORS.text : COLORS.textMid,
    background: active ? COLORS.surface2 : "transparent",
    borderLeft: active ? `2px solid ${COLORS.accent}` : "2px solid transparent",
    marginBottom: 1,
    transition: "all 0.12s",
  }),
  navIcon: { fontSize: 15, width: 18, textAlign: "center" },

  sidebarFooter: {
    marginTop: "auto",
    padding: "12px 16px",
    borderTop: `1px solid ${COLORS.border}`,
  },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: (color) => ({
    width: 30,
    height: 30,
    borderRadius: 8,
    background: color + "22",
    border: `1px solid ${color}44`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: color,
    flexShrink: 0,
  }),
  userInfo: { flex: 1, overflow: "hidden" },
  userName: { fontSize: 12.5, fontWeight: 500, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  userRole: { fontSize: 10, color: COLORS.textDim },

  // Main
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  topbar: {
    height: 56,
    background: COLORS.surface,
    borderBottom: `1px solid ${COLORS.border}`,
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    gap: 12,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  topbarTitle: { fontSize: 15, fontWeight: 600, color: COLORS.text, flex: 1 },
  content: { padding: "28px 28px", flex: 1 },

  // Cards
  card: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "20px 22px",
  },
  cardTitle: { fontSize: 13, fontWeight: 600, color: COLORS.textMid, letterSpacing: 0.3, marginBottom: 4 },

  // Metric cards
  metricGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 },
  metric: (accent) => ({
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "18px 20px",
    borderTop: `2px solid ${accent}`,
  }),
  metricLabel: { fontSize: 11, fontWeight: 500, color: COLORS.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  metricVal: { fontSize: 26, fontWeight: 700, letterSpacing: -1, color: COLORS.text, lineHeight: 1 },
  metricSub: { fontSize: 11.5, color: COLORS.textMid, marginTop: 5 },

  // Tables
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "8px 14px",
    fontSize: 10.5,
    fontWeight: 600,
    color: COLORS.textDim,
    letterSpacing: 1,
    textTransform: "uppercase",
    borderBottom: `1px solid ${COLORS.border}`,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "11px 14px",
    borderBottom: `1px solid ${COLORS.border}`,
    color: COLORS.text,
    verticalAlign: "middle",
  },

  // Badges
  badge: (color, bg) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 9px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    color: color,
    background: bg,
    border: `1px solid ${color}33`,
    whiteSpace: "nowrap",
  }),

  // Buttons
  btn: (variant = "primary") => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    border: "none",
    transition: "all 0.12s",
    ...(variant === "primary" ? {
      background: COLORS.accent,
      color: "#fff",
    } : variant === "ghost" ? {
      background: "transparent",
      color: COLORS.textMid,
      border: `1px solid ${COLORS.border}`,
    } : variant === "danger" ? {
      background: COLORS.redDim,
      color: COLORS.red,
      border: `1px solid ${COLORS.red}33`,
    } : {
      background: COLORS.surface2,
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
    }),
  }),

  // Inputs
  input: {
    background: COLORS.surface2,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13.5,
    color: COLORS.text,
    outline: "none",
    width: "100%",
  },
  select: {
    background: COLORS.surface2,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13.5,
    color: COLORS.text,
    outline: "none",
    cursor: "pointer",
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    color: COLORS.textMid,
    display: "block",
    marginBottom: 5,
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    backdropFilter: "blur(3px)",
  },
  modal: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: "28px 28px",
    width: "100%",
    maxWidth: 480,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: COLORS.text, marginBottom: 20 },

  // Status
  statusBadge: (s) => {
    const map = {
      paid:    [COLORS.green,  COLORS.greenDim],
      partial: [COLORS.amber,  COLORS.amberDim],
      unpaid:  [COLORS.red,    COLORS.redDim],
      active:  [COLORS.green,  COLORS.greenDim],
      upcoming:[COLORS.accent, COLORS.accentDim],
      ended:   [COLORS.textMid,"#1A1E29"],
      confirmed:[COLORS.green, COLORS.greenDim],
      pending: [COLORS.amber,  COLORS.amberDim],
      cancelled:[COLORS.red,   COLORS.redDim],
    };
    const [col, bg] = map[s] || [COLORS.textMid, COLORS.surface2];
    return { display:"inline-flex", alignItems:"center", gap:4, padding:"2px 9px", borderRadius:20, fontSize:11, fontWeight:600, color:col, background:bg };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = {
  egp:  (n) => `EGP ${Number(n || 0).toLocaleString("en-EG", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
  pct:  (n) => `${Number(n || 0).toFixed(1)}%`,
  date: (s) => s ? new Date(s).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : "—",
  initials: (name) => name ? name.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase() : "??",
};

function ProgressBar({ value, color = COLORS.accent }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ background: COLORS.surface2, borderRadius: 4, height: 5, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s" }} />
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"60px 0" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `2px solid ${COLORS.border}`,
        borderTopColor: COLORS.accent,
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function EmptyState({ icon = "◈", message = "No data found" }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 0", color: COLORS.textDim }}>
      <div style={{ fontSize:32, marginBottom:10 }}>{icon}</div>
      <div style={{ fontSize:13 }}>{message}</div>
    </div>
  );
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const col = type === "error" ? COLORS.red : COLORS.green;
  return (
    <div style={{
      position:"fixed", bottom:24, right:24, zIndex:999,
      background: COLORS.surface, border:`1px solid ${col}55`,
      borderRadius:10, padding:"12px 18px", fontSize:13,
      color: col, maxWidth:320, boxShadow:`0 4px 24px rgba(0,0,0,0.4)`,
    }}>{msg}</div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, type="success") => setToast({ msg, type, key: Date.now() });
  const comp = toast ? <Toast key={toast.key} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} /> : null;
  return [show, comp];
}

function Modal({ title, onClose, children }) {
  return (
    <div style={S.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <span style={S.modalTitle}>{title}</span>
          <button onClick={onClose} style={{ ...S.btn("ghost"), padding:"4px 8px", fontSize:16 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin }) {
  const api = useApi();
  const [creds, setCreds] = useState({ username:"", password:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const data = await api.login(creds.username, creds.password);
      onLogin(data.user);
    } catch (e) {
      if (e.status === 400 || e.status === 401) {
        setError("Invalid credentials. Try admin / admin123");
      } else {
        setError("Cannot connect to backend at http://localhost:8000. Start the Django server and retry.");
      }
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:"100vh", background:COLORS.bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 20, padding: "40px 44px", width: 380,
      }}>
        <div style={{ marginBottom:32 }}>
          <div style={{ ...S.logoIcon, width:44, height:44, fontSize:20, borderRadius:12, marginBottom:16 }}>R</div>
          <div style={{ fontSize:22, fontWeight:700, color:COLORS.text, letterSpacing:-0.5 }}>Roboleap Academy</div>
          <div style={{ fontSize:13, color:COLORS.textDim, marginTop:4 }}>Sign in to your account</div>
        </div>

        <Field label="Username">
          <input
            style={S.input}
            value={creds.username}
            onChange={e => setCreds(p => ({...p, username:e.target.value}))}
            onKeyDown={e => e.key==="Enter" && submit()}
            placeholder="e.g. admin"
          />
        </Field>
        <Field label="Password">
          <input
            style={S.input}
            type="password"
            value={creds.password}
            onChange={e => setCreds(p => ({...p, password:e.target.value}))}
            onKeyDown={e => e.key==="Enter" && submit()}
            placeholder="••••••••"
          />
        </Field>

        {error && <div style={{ fontSize:12.5, color:COLORS.red, marginBottom:12 }}>{error}</div>}

        <button style={{ ...S.btn("primary"), width:"100%", justifyContent:"center", padding:"10px", marginTop:4 }}
          onClick={submit} disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <div style={{ marginTop:20, padding:"14px 16px", background:COLORS.surface2, borderRadius:10, fontSize:11.5, color:COLORS.textMid }}>
          <div style={{ fontWeight:600, marginBottom:6, color:COLORS.textDim }}>Demo accounts</div>
          {[["admin","admin123"],["finance","finance123"],["secretary","secretary123"],["instructor1","instr123"]].map(([u,p])=>(
            <div key={u} style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
              <span style={{ color:COLORS.text }}>{u}</span><span style={{ color:COLORS.textDim }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardPage({ user }) {
  const api = useApi();
  const canViewFinance = user.is_superuser || user.is_staff || user.role === "admin" || user.role === "finance";
  const [overview, setOverview] = useState(null);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTxModal, setShowTxModal] = useState(false);
  const [toast, toastComp] = useToast();

  useEffect(() => {
    Promise.all([
      canViewFinance ? api.get("/api/financial/overview/").catch(()=>null) : Promise.resolve(null),
      api.get("/api/courses/?status=active").catch(() => ({ results: [] })),
      api.get("/api/instructors/").catch(() => ({ results: [] })),
    ]).then(([ov, co, ins]) => {
      setOverview(ov);
      setCourses(co?.results || co || []);
      setInstructors(ins?.results || ins || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const metrics = overview ? [
    { label:"Collected",        val: fmt.egp(overview.total_collected),  sub:`${fmt.pct(overview.collection_rate)} collection rate`, color: COLORS.green },
    { label:"Sessions",         val: overview.total_sessions ?? 0,       sub:"Active sessions",                     color: COLORS.accent },
    { label:"Net Profit",       val: fmt.egp(overview.net_profit),      sub:`Income ${fmt.egp(overview.total_income)} / Outcome ${fmt.egp(overview.total_outcome)}`, color: overview.net_profit >= 0 ? COLORS.green : COLORS.red },
    { label:"Outstanding",      val: fmt.egp(overview.total_outstanding), sub:`${overview.unpaid_students?.length || 0} students with balance`, color: COLORS.red },
  ] : [];

  return (
    <div>
      {toastComp}
      {showTxModal && (
        <AddTransactionModal
          api={api}
          onClose={() => setShowTxModal(false)}
          onSaved={() => {
            setShowTxModal(false);
            toast("Transaction saved successfully");
            api.get("/api/financial/overview/").then(setOverview).catch(()=>null);
          }}
        />
      )}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, gap:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:-0.5, margin:0, color:COLORS.text }}>
            Welcome back{user.first_name ? `, ${user.first_name}` : ""}
          </h1>
          <p style={{ fontSize:13, color:COLORS.textDim, marginTop:4 }}>
            {new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </p>
        </div>
        {canViewFinance && (
          <button style={S.btn("primary")} onClick={() => setShowTxModal(true)}>
            + Add Transaction
          </button>
        )}
      </div>

      {metrics.length > 0 && (
        <div style={S.metricGrid}>
          {metrics.map(m => (
            <div key={m.label} style={S.metric(m.color)}>
              <div style={S.metricLabel}>{m.label}</div>
              <div style={S.metricVal}>{m.val}</div>
              <div style={S.metricSub}>{m.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:16 }}>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:600, color:COLORS.text, marginBottom:14 }}>Active Courses</div>
          {courses.length === 0 ? <EmptyState icon="◈" message="No active courses" /> : (
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Course</th>
                <th style={S.th}>Fee</th>
                <th style={S.th}>Students</th>
              </tr></thead>
              <tbody>
                {courses.slice(0,6).map(c => (
                  <tr key={c.id}>
                    <td style={S.td}>
                      <div style={{ fontWeight:500 }}>{c.name}</div>
                      {c.batch && <div style={{ fontSize:11, color:COLORS.textDim }}>{c.batch}</div>}
                    </td>
                    <td style={S.td}>{fmt.egp(c.fee)}</td>
                    <td style={S.td}>{c.enrolled_count ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={S.card}>
          <div style={{ fontSize:14, fontWeight:600, color:COLORS.text, marginBottom:14 }}>Instructor workload</div>
          {instructors.length === 0 ? <EmptyState icon="◇" message="No instructors found" /> : (
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Instructor</th>
                <th style={S.th}>Courses</th>
                <th style={S.th}>Sessions taught</th>
              </tr></thead>
              <tbody>
                {instructors.slice(0,6).map(i => (
                  <tr key={i.id}>
                    <td style={S.td}>{i.user?.full_name || "—"}</td>
                    <td style={S.td}>{i.courses_count ?? 0}</td>
                    <td style={S.td}>{i.sessions_taught ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

        {overview?.unpaid_students?.length > 0 && (
          <div style={S.card}>
            <div style={{ fontSize:14, fontWeight:600, color:COLORS.text, marginBottom:14 }}>
              Top Outstanding Balances
            </div>
            <table style={S.table}>
              <thead><tr>
                <th style={S.th}>Student</th>
                <th style={S.th}>Course</th>
                <th style={S.th}>Balance</th>
              </tr></thead>
              <tbody>
                {overview.unpaid_students.slice(0,6).map(s => (
                  <tr key={s.enrollment_id}>
                    <td style={S.td}>{s.student_name}</td>
                    <td style={S.td} title={s.course}>
                      <div style={{ maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", fontSize:12, color:COLORS.textMid }}>
                        {s.course}
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={{ color:COLORS.red, fontWeight:600 }}>{fmt.egp(s.balance)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {overview?.recent_transactions?.length > 0 && (
        <div style={{ ...S.card, marginTop:16 }}>
          <div style={{ fontSize:14, fontWeight:600, color:COLORS.text, marginBottom:14 }}>Recent Transactions</div>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Date</th>
              <th style={S.th}>Type</th>
              <th style={S.th}>Title</th>
              <th style={S.th}>Amount</th>
              <th style={S.th}>Category</th>
            </tr></thead>
            <tbody>
              {overview.recent_transactions.map(tx => (
                <tr key={tx.id}>
                  <td style={S.td}>{fmt.date(tx.date)}</td>
                  <td style={S.td}>{tx.transaction_type_label}</td>
                  <td style={S.td}>{tx.title}</td>
                  <td style={{ ...S.td, color: tx.transaction_type === "income" ? COLORS.green : COLORS.red }}>
                    {tx.transaction_type === "income" ? "+" : "-"}{fmt.egp(tx.subtotal)}
                  </td>
                  <td style={S.td}>{tx.category_label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Financial Dashboard ──────────────────────────────────────────────────────

function FinancialPage() {
  const api = useApi();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showPayModal, setShowPayModal] = useState(null);
  const [toast, toastComp] = useToast();

  useEffect(() => {
    api.get("/api/courses/").then(d => {
      const list = d?.results || d || [];
      setCourses(list);
      if (list.length) setSelectedCourse(list[0].id);
    }).finally(() => setLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true); setSummary(null);
    api.get(`/api/financial/courses/${selectedCourse}/summary/`)
      .then(setSummary)
      .catch(() => toast("Failed to load course summary", "error"))
      .finally(() => setLoading(false));
  }, [selectedCourse]);

  const students = summary?.students?.filter(s => {
    const matchFilter = filter === "all" || s.payment_status === filter;
    const matchSearch = !search || s.student_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }) || [];

  const payColor = (s) => s === "paid" ? COLORS.green : s === "partial" ? COLORS.amber : COLORS.red;

  return (
    <div>
      {toastComp}
      {showPayModal && (
        <AddPaymentModal
          enrollment={showPayModal}
          api={api}
          onClose={() => setShowPayModal(null)}
          onSaved={() => {
            setShowPayModal(null);
            toast("Payment recorded successfully");
            api.get(`/api/financial/courses/${selectedCourse}/summary/`).then(setSummary);
          }}
        />
      )}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.5, margin:0 }}>Financial Dashboard</h1>
        {loadingCourses ? null : (
          <select style={{ ...S.select, minWidth:240 }} value={selectedCourse || ""} onChange={e => setSelectedCourse(Number(e.target.value))}>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}{c.batch ? ` — ${c.batch}` : ""}</option>)}
          </select>
        )}
      </div>

      {loading ? <Spinner /> : summary && (
        <>
          <div style={S.metricGrid}>
            {[
              { label:"Students",      val: summary.total_students,              sub:`${summary.paid_count} fully paid`, color: COLORS.accent },
              { label:"Total Due",     val: fmt.egp(summary.total_due),          sub:`${fmt.egp(summary.fee)} per student`, color: COLORS.textMid },
              { label:"Collected",     val: fmt.egp(summary.total_collected),    sub:fmt.pct(summary.collection_rate) + " rate", color: COLORS.green },
              { label:"Outstanding",   val: fmt.egp(summary.total_outstanding),  sub:`${summary.unpaid_count + summary.partial_count} students`, color: COLORS.red },
            ].map(m => (
              <div key={m.label} style={S.metric(m.color)}>
                <div style={S.metricLabel}>{m.label}</div>
                <div style={S.metricVal}>{m.val}</div>
                <div style={S.metricSub}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <input
                style={{ ...S.input, maxWidth:220 }}
                placeholder="Search student…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {["all","paid","partial","unpaid"].map(f => (
                <button key={f}
                  style={{ ...S.btn(filter===f ? "primary" : "ghost"), padding:"6px 14px", fontSize:12 }}
                  onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase()+f.slice(1)}
                  {f !== "all" && summary ? ` (${f==="paid"?summary.paid_count:f==="partial"?summary.partial_count:summary.unpaid_count})` : ""}
                </button>
              ))}
            </div>

            {students.length === 0 ? <EmptyState icon="◆" message="No students match this filter" /> : (
              <table style={S.table}>
                <thead><tr>
                  <th style={S.th}>Student</th>
                  <th style={S.th}>Sessions</th>
                  <th style={S.th}>Total Due</th>
                  <th style={S.th}>Paid</th>
                  <th style={S.th}>Balance</th>
                  <th style={S.th}>Progress</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}></th>
                </tr></thead>
                <tbody>
                  {students.map(s => {
                    const pct = s.total_due > 0 ? Math.round((s.total_paid / s.total_due) * 100) : 0;
                    const bal = Number(s.balance || 0);
                    return (
                      <tr key={s.id}>
                        <td style={S.td}>
                          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                            <div style={{ ...S.avatar(payColor(s.payment_status)), width:30, height:30, borderRadius:8, fontSize:11 }}>
                              {fmt.initials(s.student_name)}
                            </div>
                            <span style={{ fontWeight:500 }}>{s.student_name}</span>
                          </div>
                        </td>
                        <td style={S.td}>{s.sessions_attended ?? "—"}</td>
                        <td style={S.td}>{fmt.egp(s.total_due)}</td>
                        <td style={S.td}>{fmt.egp(s.total_paid)}</td>
                        <td style={S.td}>
                          <span style={{ color: bal > 0 ? COLORS.red : COLORS.green, fontWeight:600 }}>
                            {bal > 0 ? fmt.egp(bal) : "—"}
                          </span>
                        </td>
                        <td style={{ ...S.td, minWidth:110 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <div style={{ flex:1 }}>
                              <ProgressBar value={pct} color={payColor(s.payment_status)} />
                            </div>
                            <span style={{ fontSize:11, color:COLORS.textMid, minWidth:28 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={S.td}>
                          <span style={S.statusBadge(s.payment_status)}>{s.payment_status}</span>
                        </td>
                        <td style={S.td}>
                          {s.payment_status !== "paid" && (
                            <button style={{ ...S.btn("ghost"), padding:"4px 10px", fontSize:11.5 }}
                              onClick={() => setShowPayModal(s)}>
                              + Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AddPaymentModal({ enrollment, api, onClose, onSaved }) {
  const [form, setForm] = useState({
    enrollment: enrollment.id,
    amount: Number(enrollment.balance || 0),
    method: "cash",
    status: "confirmed",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!form.amount || form.amount <= 0) { setErr("Amount must be positive"); return; }
    setSaving(true);
    try {
      await api.post("/api/payments/", form);
      onSaved();
    } catch(e) {
      setErr(e.message || "Failed to save payment");
    } finally { setSaving(false); }
  };

  return (
    <Modal title={`Record Payment — ${enrollment.student_name}`} onClose={onClose}>
      <div style={{ fontSize:12, color:COLORS.textMid, marginBottom:16 }}>
        Outstanding: <strong style={{ color:COLORS.red }}>{fmt.egp(enrollment.balance)}</strong>
      </div>
      <Field label="Amount (EGP)">
        <input style={S.input} type="number" value={form.amount}
          onChange={e => setForm(p=>({...p, amount:Number(e.target.value)}))} />
      </Field>
      <Field label="Payment Method">
        <select style={{ ...S.select, width:"100%" }} value={form.method}
          onChange={e => setForm(p=>({...p, method:e.target.value}))}>
          <option value="cash">Cash</option>
          <option value="transfer">Bank Transfer</option>
          <option value="online">Online</option>
        </select>
      </Field>
      <Field label="Status">
        <select style={{ ...S.select, width:"100%" }} value={form.status}
          onChange={e => setForm(p=>({...p, status:e.target.value}))}>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
        </select>
      </Field>
      <Field label="Note (optional)">
        <input style={S.input} value={form.note}
          onChange={e => setForm(p=>({...p, note:e.target.value}))} placeholder="e.g. First installment" />
      </Field>
      {err && <div style={{ fontSize:12, color:COLORS.red, marginBottom:10 }}>{err}</div>}
      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button style={{ ...S.btn("primary"), flex:1, justifyContent:"center" }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Record Payment"}
        </button>
        <button style={{ ...S.btn("ghost"), flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function AddTransactionModal({ api, onClose, onSaved }) {
  const [form, setForm] = useState({
    transaction_type: "income",
    category: "sponsorship",
    custom_category: "",
    title: "",
    date: new Date().toISOString().slice(0,10),
    quantity: 1,
    unit_amount: "",
    related_student: "",
    event_name: "",
    event_location: "",
    event_date: "",
    note: "",
  });
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/api/students/").then(d => setStudents(d?.results || d || [])).catch(() => setStudents([]));
  }, []);

  const categories = [
    { value: "sponsorship", label: "Sponsorship" },
    { value: "competition_prize", label: "Competition Prize" },
    { value: "workshop_income", label: "Workshop Income" },
    { value: "student_payment_summary", label: "Student Payment Summary" },
    { value: "tools", label: "Tools" },
    { value: "travel", label: "Travel" },
    { value: "competition_fees", label: "Competition Fees" },
    { value: "rent", label: "Rent" },
    { value: "salary", label: "Salary" },
    { value: "maintenance", label: "Maintenance" },
    { value: "other", label: "Other" },
  ];

  const save = async () => {
    if (!form.title || !form.unit_amount || form.quantity < 1) {
      setErr("Please provide a title, amount and quantity.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/transactions/", {
        ...form,
        quantity: Number(form.quantity),
        unit_amount: Number(form.unit_amount),
        related_student: form.related_student || null,
      });
      onSaved();
    } catch (e) {
      setErr(e.data?.detail || e.message || "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Transaction" onClose={onClose}>
      <Field label="Type">
        <select style={{ ...S.select, width:"100%" }} value={form.transaction_type}
          onChange={e => setForm(p => ({ ...p, transaction_type: e.target.value }))}>
          <option value="income">Income</option>
          <option value="outcome">Outcome</option>
        </select>
      </Field>
      <Field label="Category">
        <select style={{ ...S.select, width:"100%" }} value={form.category}
          onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
          {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      {form.category === "other" && (
        <Field label="Custom category">
          <input style={S.input} value={form.custom_category}
            onChange={e => setForm(p => ({ ...p, custom_category: e.target.value }))} />
        </Field>
      )}
      <Field label="Title">
        <input style={S.input} value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      </Field>
      <Field label="Student (optional)">
        <select style={{ ...S.select, width:"100%" }} value={form.related_student}
          onChange={e => setForm(p => ({ ...p, related_student: e.target.value }))}>
          <option value="">— None —</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </Field>
      <Field label="Competition / Event name (optional)">
        <input style={S.input} value={form.event_name}
          onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} />
      </Field>
      <Field label="Location (optional)">
        <input style={S.input} value={form.event_location}
          onChange={e => setForm(p => ({ ...p, event_location: e.target.value }))} />
      </Field>
      <Field label="Event date (optional)">
        <input style={S.input} type="date" value={form.event_date}
          onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
      </Field>
      <Field label="Date">
        <input style={S.input} type="date" value={form.date}
          onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
      </Field>
      <Field label="Quantity">
        <input style={S.input} type="number" min="1" value={form.quantity}
          onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
      </Field>
      <Field label="Unit amount (EGP)">
        <input style={S.input} type="number" value={form.unit_amount}
          onChange={e => setForm(p => ({ ...p, unit_amount: e.target.value }))} />
      </Field>
      <Field label="Note (optional)">
        <input style={S.input} value={form.note}
          onChange={e => setForm(p => ({ ...p, note: e.target.value }))} placeholder="Optional description" />
      </Field>
      {err && <div style={{ fontSize:12, color:COLORS.red, marginBottom:10 }}>{err}</div>}
      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button style={{ ...S.btn("primary"), flex:1, justifyContent:"center" }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Transaction"}
        </button>
        <button style={{ ...S.btn("ghost"), flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Courses Page ─────────────────────────────────────────────────────────────

function CoursesPage() {
  const api = useApi();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [toast, toastComp] = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([api.get("/api/courses/"), api.get("/api/instructors/")])
      .then(([c, i]) => {
        setCourses(c?.results || c || []);
        setInstructors(i?.results || i || []);
      }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      {toastComp}
      {showModal && (
        <CourseModal
          instructors={instructors}
          api={api}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); toast("Course created"); load(); }}
        />
      )}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.5, margin:0 }}>Courses</h1>
        <button style={S.btn("primary")} onClick={() => setShowModal(true)}>+ New Course</button>
      </div>
      {loading ? <Spinner /> : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Batch</th>
              <th style={S.th}>Instructor</th>
              <th style={S.th}>Fee</th>
              <th style={S.th}>Students</th>
              <th style={S.th}>Sessions</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Start</th>
            </tr></thead>
            <tbody>
              {courses.length === 0 ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign:"center", padding:"40px", color:COLORS.textDim }}>No courses yet</td></tr>
              ) : courses.map(c => (
                <tr key={c.id}>
                  <td style={S.td}><span style={{ fontWeight:600 }}>{c.name}</span></td>
                  <td style={S.td}><span style={{ fontSize:12, color:COLORS.textMid }}>{c.batch || "—"}</span></td>
                  <td style={S.td}>{c.instructor_name || "—"}</td>
                  <td style={S.td}>{fmt.egp(c.fee)}</td>
                  <td style={S.td}>{c.enrolled_count ?? "—"}</td>
                  <td style={S.td}>{c.total_sessions ?? "—"}</td>
                  <td style={S.td}><span style={S.statusBadge(c.status)}>{c.status}</span></td>
                  <td style={S.td}>{fmt.date(c.start_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CourseModal({ instructors, api, onClose, onSaved }) {
  const [form, setForm] = useState({ name:"", batch:"", fee:"", start_date:"", status:"upcoming", instructor:"", description:"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const save = async () => {
    if (!form.name || !form.fee || !form.start_date) { setErr("Name, fee and start date are required"); return; }
    setSaving(true);
    try {
      await api.post("/api/courses/", { ...form, fee: Number(form.fee), instructor: form.instructor || null });
      onSaved();
    } catch(e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal title="New Course" onClose={onClose}>
      <Field label="Course Name"><input style={S.input} value={form.name} onChange={set("name")} /></Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Batch"><input style={S.input} value={form.batch} onChange={set("batch")} placeholder="e.g. Batch A" /></Field>
        <Field label="Fee (EGP)"><input style={S.input} type="number" value={form.fee} onChange={set("fee")} /></Field>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Start Date"><input style={S.input} type="date" value={form.start_date} onChange={set("start_date")} /></Field>
        <Field label="Status">
          <select style={{ ...S.select, width:"100%" }} value={form.status} onChange={set("status")}>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>
        </Field>
      </div>
      <Field label="Instructor">
        <select style={{ ...S.select, width:"100%" }} value={form.instructor} onChange={set("instructor")}>
          <option value="">— None —</option>
          {instructors.map(i => <option key={i.id} value={i.id}>{i.user?.full_name || i.id}</option>)}
        </select>
      </Field>
      {err && <div style={{ fontSize:12, color:COLORS.red, marginBottom:10 }}>{err}</div>}
      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button style={{ ...S.btn("primary"), flex:1, justifyContent:"center" }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Create Course"}
        </button>
        <button style={{ ...S.btn("ghost"), flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Students Page ────────────────────────────────────────────────────────────

function StudentsPage() {
  const api = useApi();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [toast, toastComp] = useToast();

  const load = (q="") => {
    setLoading(true);
    api.get(`/api/students/${q ? `?q=${q}` : ""}`).then(d => setStudents(d?.results || d || [])).finally(()=>setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const searchRef = useRef();
  const doSearch = () => load(search);

  return (
    <div>
      {toastComp}
      {showModal && (
        <StudentModal api={api} onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); toast("Student added"); load(); }} />
      )}
      {selected && (
        <StudentDetailModal student={selected} api={api} onClose={() => setSelected(null)} />
      )}

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.5, margin:0, marginRight:"auto" }}>Students</h1>
        <input ref={searchRef} style={{ ...S.input, maxWidth:220 }} placeholder="Search…"
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key==="Enter" && doSearch()} />
        <button style={S.btn("ghost")} onClick={doSearch}>Search</button>
        <button style={S.btn("primary")} onClick={() => setShowModal(true)}>+ Add Student</button>
      </div>

      {loading ? <Spinner /> : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Name</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Phone</th>
              <th style={S.th}>Parent</th>
              <th style={S.th}>Joined</th>
              <th style={S.th}></th>
            </tr></thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign:"center", padding:"40px", color:COLORS.textDim }}>No students</td></tr>
              ) : students.map(s => (
                <tr key={s.id}>
                  <td style={S.td}>
                    <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                      <div style={{ ...S.avatar(COLORS.accent), width:30, height:30, borderRadius:8, fontSize:11 }}>
                        {fmt.initials(s.full_name)}
                      </div>
                      <span style={{ fontWeight:500 }}>{s.full_name}</span>
                    </div>
                  </td>
                  <td style={S.td}><span style={{ fontSize:12, color:COLORS.textMid }}>{s.email}</span></td>
                  <td style={S.td}>{s.phone || "—"}</td>
                  <td style={S.td}>{s.parent_name || "—"}</td>
                  <td style={S.td}>{fmt.date(s.created_at)}</td>
                  <td style={S.td}>
                    <button style={{ ...S.btn("ghost"), padding:"4px 10px", fontSize:11.5 }} onClick={() => setSelected(s)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentModal({ api, onClose, onSaved }) {
  const [form, setForm] = useState({ first_name:"", last_name:"", email:"", phone:"", parent_name:"", parent_phone:"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const save = async () => {
    if (!form.first_name || !form.last_name || !form.email) { setErr("Name and email are required"); return; }
    setSaving(true);
    try { await api.post("/api/students/", form); onSaved(); }
    catch(e) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal title="Add Student" onClose={onClose}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="First Name"><input style={S.input} value={form.first_name} onChange={set("first_name")} /></Field>
        <Field label="Last Name"><input style={S.input} value={form.last_name} onChange={set("last_name")} /></Field>
      </div>
      <Field label="Email"><input style={S.input} type="email" value={form.email} onChange={set("email")} /></Field>
      <Field label="Phone"><input style={S.input} value={form.phone} onChange={set("phone")} /></Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Parent Name"><input style={S.input} value={form.parent_name} onChange={set("parent_name")} /></Field>
        <Field label="Parent Phone"><input style={S.input} value={form.parent_phone} onChange={set("parent_phone")} /></Field>
      </div>
      {err && <div style={{ fontSize:12, color:COLORS.red, marginBottom:10 }}>{err}</div>}
      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button style={{ ...S.btn("primary"), flex:1, justifyContent:"center" }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Add Student"}
        </button>
        <button style={{ ...S.btn("ghost"), flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function StudentDetailModal({ student, api, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/financial/students/${student.id}/`).then(setData).finally(()=>setLoading(false));
  }, []);

  return (
    <Modal title={student.full_name} onClose={onClose}>
      {loading ? <Spinner /> : data && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
            {[
              ["Total Due", fmt.egp(data.grand_total_due), COLORS.textMid],
              ["Total Paid", fmt.egp(data.grand_total_paid), COLORS.green],
              ["Balance", fmt.egp(data.grand_balance), data.grand_balance > 0 ? COLORS.red : COLORS.green],
            ].map(([l,v,c]) => (
              <div key={l} style={{ background:COLORS.surface2, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:COLORS.textDim, marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:15, fontWeight:700, color:c }}>{v}</div>
              </div>
            ))}
          </div>
          {data.courses.map(c => (
            <div key={c.enrollment_id} style={{ marginBottom:14, borderTop:`1px solid ${COLORS.border}`, paddingTop:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{c.course}</span>
                <span style={S.statusBadge(c.payment_status)}>{c.payment_status}</span>
              </div>
              <div style={{ fontSize:12, color:COLORS.textMid, marginBottom:8 }}>
                Due: {fmt.egp(c.total_due)} · Paid: {fmt.egp(c.total_paid)} · Balance: <span style={{ color: c.balance > 0 ? COLORS.red : COLORS.green }}>{fmt.egp(c.balance)}</span>
              </div>
              {c.payments.length > 0 && (
                <div style={{ fontSize:11.5 }}>
                  {c.payments.map(p => (
                    <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderTop:`1px solid ${COLORS.border}`, color:COLORS.textMid }}>
                      <span>{fmt.date(p.paid_at)} · {p.method}</span>
                      <span style={{ color:COLORS.green, fontWeight:500 }}>{fmt.egp(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Enrollments Page ─────────────────────────────────────────────────────────

function EnrollmentsPage() {
  const api = useApi();
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [courseFilter, setCourseFilter] = useState("");
  const [toast, toastComp] = useToast();

  const load = () => {
    setLoading(true);
    const q = courseFilter ? `?course=${courseFilter}` : "";
    Promise.all([
      api.get(`/api/enrollments/${q}`),
      api.get("/api/courses/"),
      api.get("/api/students/"),
    ]).then(([e,c,s]) => {
      setEnrollments(e?.results || e || []);
      setCourses(c?.results || c || []);
      setStudents(s?.results || s || []);
    }).finally(()=>setLoading(false));
  };

  useEffect(load, [courseFilter]);

  return (
    <div>
      {toastComp}
      {showModal && (
        <EnrollModal courses={courses} students={students} api={api}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); toast("Student enrolled"); load(); }} />
      )}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.5, margin:0, marginRight:"auto" }}>Enrollments</h1>
        <select style={S.select} value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name} {c.batch}</option>)}
        </select>
        <button style={S.btn("primary")} onClick={() => setShowModal(true)}>+ Enroll Student</button>
      </div>
      {loading ? <Spinner /> : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Student</th>
              <th style={S.th}>Course</th>
              <th style={S.th}>Enrolled</th>
              <th style={S.th}>Sessions</th>
              <th style={S.th}>Balance</th>
              <th style={S.th}>Status</th>
            </tr></thead>
            <tbody>
              {enrollments.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign:"center", padding:"40px", color:COLORS.textDim }}>No enrollments</td></tr>
              ) : enrollments.map(e => (
                <tr key={e.id}>
                  <td style={{ ...S.td, fontWeight:500 }}>{e.student_name || e.student?.full_name}</td>
                  <td style={{ ...S.td, fontSize:12, color:COLORS.textMid }}>{typeof e.course === "object" ? e.course.name : (courses.find(c=>c.id===e.course)?.name || e.course)}</td>
                  <td style={S.td}>{fmt.date(e.enrolled_at)}</td>
                  <td style={S.td}>{e.sessions_attended ?? "—"}</td>
                  <td style={S.td}>
                    <span style={{ color: Number(e.balance)>0?COLORS.red:COLORS.green, fontWeight:500 }}>
                      {Number(e.balance)>0 ? fmt.egp(e.balance) : "—"}
                    </span>
                  </td>
                  <td style={S.td}><span style={S.statusBadge(e.payment_status)}>{e.payment_status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EnrollModal({ courses, students, api, onClose, onSaved }) {
  const [form, setForm] = useState({ student_id:"", course:"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!form.student_id || !form.course) { setErr("Select both student and course"); return; }
    setSaving(true);
    try { await api.post("/api/enrollments/", form); onSaved(); }
    catch(e) { setErr(e.data?.non_field_errors?.[0] || e.message); } finally { setSaving(false); }
  };

  return (
    <Modal title="Enroll Student" onClose={onClose}>
      <Field label="Student">
        <select style={{ ...S.select, width:"100%" }} value={form.student_id} onChange={e => setForm(p=>({...p,student_id:e.target.value}))}>
          <option value="">— Select student —</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </Field>
      <Field label="Course">
        <select style={{ ...S.select, width:"100%" }} value={form.course} onChange={e => setForm(p=>({...p,course:e.target.value}))}>
          <option value="">— Select course —</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}{c.batch?` — ${c.batch}`:""}</option>)}
        </select>
      </Field>
      {err && <div style={{ fontSize:12, color:COLORS.red, marginBottom:10 }}>{err}</div>}
      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button style={{ ...S.btn("primary"), flex:1, justifyContent:"center" }} onClick={save} disabled={saving}>
          {saving ? "Enrolling…" : "Enroll"}
        </button>
        <button style={{ ...S.btn("ghost"), flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Attendance Page ──────────────────────────────────────────────────────────

function AttendancePage() {
  const api = useApi();
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [toast, toastComp] = useToast();

  useEffect(() => {
    api.get("/api/courses/?status=active").then(d => setCourses(d?.results || d || []));
  }, []);

  useEffect(() => {
    if (!selectedCourse) { setSessions([]); return; }
    api.get(`/api/sessions/?course=${selectedCourse}`).then(d => setSessions(d?.results || d || []));
    api.get(`/api/enrollments/?course=${selectedCourse}`).then(d => setEnrollments(d?.results || d || []));
  }, [selectedCourse]);

  useEffect(() => {
    if (!selectedSession) { setAttendance([]); return; }
    setLoading(true);
    api.get(`/api/attendance/?session=${selectedSession}`).then(d => setAttendance(d?.results || d || [])).finally(()=>setLoading(false));
  }, [selectedSession]);

  const getStatus = (enrollmentId) => {
    const rec = attendance.find(a => a.enrollment === enrollmentId);
    return rec?.status || "absent";
  };

  const [localStatus, setLocalStatus] = useState({});
  useEffect(() => {
    const map = {};
    enrollments.forEach(e => { map[e.id] = getStatus(e.id); });
    setLocalStatus(map);
  }, [attendance, enrollments]);

  const save = async () => {
    if (!selectedSession) return;
    setSaving(true);
    try {
      const records = Object.entries(localStatus).map(([enrollment_id, status]) => ({ enrollment_id: Number(enrollment_id), status }));
      await api.post("/api/attendance/bulk/", { session_id: Number(selectedSession), records });
      toast("Attendance saved");
    } catch { toast("Failed to save", "error"); } finally { setSaving(false); }
  };

  const statusOptions = ["present","absent","late","excused"];
  const statusColors = { present:COLORS.green, absent:COLORS.red, late:COLORS.amber, excused:COLORS.textMid };

  return (
    <div>
      {toastComp}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.5, margin:0, marginRight:"auto" }}>Attendance</h1>
        <select style={S.select} value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setSelectedSession(""); }}>
          <option value="">Select Course</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name} {c.batch}</option>)}
        </select>
        <select style={S.select} value={selectedSession} onChange={e => setSelectedSession(e.target.value)} disabled={!selectedCourse}>
          <option value="">Select Session</option>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.title} — {fmt.date(s.session_date)}</option>)}
        </select>
        <button style={S.btn("secondary")} onClick={() => setShowSessionModal(true)} disabled={!selectedCourse}>
          + Add Session
        </button>
        {selectedSession && (
          <button style={S.btn("primary")} onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Attendance"}
          </button>
        )}
      </div>

      {showSessionModal && (
        <CreateSessionModal
          courseId={selectedCourse}
          api={api}
          onClose={() => setShowSessionModal(false)}
          onSaved={() => {
            setShowSessionModal(false);
            if (selectedCourse) {
              api.get(`/api/sessions/?course=${selectedCourse}`).then(d => setSessions(d?.results || d || []));
            }
          }}
        />
      )}
      {!selectedSession ? (
        <div style={{ ...S.card, textAlign:"center", padding:"60px" }}>
          <div style={{ fontSize:28, marginBottom:10, color:COLORS.textDim }}>◇</div>
          <div style={{ color:COLORS.textDim }}>Select a course and session to record attendance</div>
        </div>
      ) : loading ? <Spinner /> : (
        <div style={S.card}>
          <div style={{ display:"flex", gap:16, marginBottom:16 }}>
            {statusOptions.map(s => {
              const count = Object.values(localStatus).filter(v=>v===s).length;
              return (
                <div key={s} style={{ fontSize:12, color:statusColors[s] }}>
                  <span style={{ fontWeight:700 }}>{count}</span> {s}
                </div>
              );
            })}
          </div>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Student</th>
              <th style={S.th}>Balance</th>
              <th style={S.th}>Status</th>
            </tr></thead>
            <tbody>
              {enrollments.map(e => (
                <tr key={e.id}>
                  <td style={S.td}>
                    <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                      <div style={{ ...S.avatar(statusColors[localStatus[e.id]] || COLORS.textMid), width:28, height:28, borderRadius:7, fontSize:10 }}>
                        {fmt.initials(e.student_name)}
                      </div>
                      <span style={{ fontWeight:500 }}>{e.student_name}</span>
                    </div>
                  </td>
                  <td style={S.td}>
                    <span style={{ fontSize:12, color: Number(e.balance)>0?COLORS.red:COLORS.textDim }}>
                      {Number(e.balance)>0?fmt.egp(e.balance):"—"}
                    </span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display:"flex", gap:6 }}>
                      {statusOptions.map(opt => (
                        <button key={opt}
                          style={{
                            padding:"4px 10px", borderRadius:6, fontSize:11.5, cursor:"pointer",
                            border:`1px solid ${localStatus[e.id]===opt ? statusColors[opt] : COLORS.border}`,
                            background: localStatus[e.id]===opt ? statusColors[opt]+"22" : "transparent",
                            color: localStatus[e.id]===opt ? statusColors[opt] : COLORS.textDim,
                            fontWeight: localStatus[e.id]===opt ? 600 : 400,
                            transition:"all 0.1s",
                          }}
                          onClick={() => setLocalStatus(p => ({ ...p, [e.id]: opt }))}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreateSessionModal({ courseId, api, onClose, onSaved }) {
  const [form, setForm] = useState({
    course: courseId || "",
    title: "",
    session_date: new Date().toISOString().slice(0,10),
    start_time: "09:00",
    end_time: "10:00",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setForm(f => ({ ...f, course: courseId || f.course }));
  }, [courseId]);

  const save = async () => {
    if (!form.title || !form.course || !form.session_date || !form.start_time) {
      setErr("Please provide a course, title, date and start time.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/sessions/", {
        ...form,
        course: Number(form.course),
      });
      onSaved();
    } catch (e) {
      setErr(e.data?.detail || e.message || "Failed to save session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="New Session" onClose={onClose}>
      <Field label="Course">
        <input style={S.input} value={form.course} readOnly />
      </Field>
      <Field label="Title">
        <input style={S.input} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
      </Field>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <Field label="Date">
          <input style={S.input} type="date" value={form.session_date}
            onChange={e => setForm(p => ({ ...p, session_date: e.target.value }))} />
        </Field>
        <Field label="Start time">
          <input style={S.input} type="time" value={form.start_time}
            onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
        </Field>
      </div>
      <Field label="End time">
        <input style={S.input} type="time" value={form.end_time}
          onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
      </Field>
      <Field label="Notes (optional)">
        <textarea style={{ ...S.input, minHeight:80 }} value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
      </Field>
      {err && <div style={{ fontSize:12, color:COLORS.red, marginBottom:10 }}>{err}</div>}
      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button style={{ ...S.btn("primary"), flex:1, justifyContent:"center" }} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Create Session"}
        </button>
        <button style={{ ...S.btn("ghost"), flex:1, justifyContent:"center" }} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

// ─── Payments Page ────────────────────────────────────────────────────────────

function PaymentsPage() {
  const api = useApi();
  const [payments, setPayments] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = () => {
    setLoading(true);
    const q = filter ? `?status=${filter}` : "";
    Promise.all([
      api.get("/api/financial/overview/").catch(() => null),
      api.get(`/api/payments/${q}`),
    ]).then(([ov, d]) => {
      setOverview(ov);
      setPayments(d?.results || d || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:-0.5, margin:0, marginRight:"auto" }}>Payments</h1>
        <select style={S.select} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {overview && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, minmax(0,1fr))", gap:12, marginBottom:18 }}>
          <div style={S.metric(COLORS.accent)}>
            <div style={S.metricLabel}>Students</div>
            <div style={S.metricVal}>{overview.total_students ?? 0}</div>
            <div style={S.metricSub}>Total active students</div>
          </div>
          <div style={S.metric(COLORS.green)}>
            <div style={S.metricLabel}>Net Profit</div>
            <div style={S.metricVal}>{fmt.egp(overview.net_profit)}</div>
            <div style={S.metricSub}>{`Income ${fmt.egp(overview.total_income)} / Outcome ${fmt.egp(overview.total_outcome)}`}</div>
          </div>
          <div style={S.metric(COLORS.red)}>
            <div style={S.metricLabel}>Outstanding</div>
            <div style={S.metricVal}>{fmt.egp(overview.total_outstanding)}</div>
            <div style={S.metricSub}>{`${overview.unpaid_students?.length || 0} students with balance`}</div>
          </div>
          <div style={S.metric(COLORS.greenDim)}>
            <div style={S.metricLabel}>Collected</div>
            <div style={S.metricVal}>{fmt.egp(overview.total_collected)}</div>
            <div style={S.metricSub}>{`Collection ${fmt.pct(overview.collection_rate)}`}</div>
          </div>
        </div>
      )}
      {loading ? <Spinner /> : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Receipt</th>
              <th style={S.th}>Student</th>
              <th style={S.th}>Course</th>
              <th style={S.th}>Amount</th>
              <th style={S.th}>Method</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Date</th>
              <th style={S.th}>Recorded by</th>
            </tr></thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign:"center", padding:"40px", color:COLORS.textDim }}>No payments</td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td style={{ ...S.td, fontFamily:"monospace", fontSize:11.5, color:COLORS.textMid }}>{p.receipt_number}</td>
                  <td style={S.td}>{p.student_name || "—"}</td>
                  <td style={S.td}>{p.course_name || "—"}</td>
                  <td style={{ ...S.td, fontWeight:600, color:COLORS.green }}>{fmt.egp(p.amount)}</td>
                  <td style={S.td}><span style={{ fontSize:12, color:COLORS.textMid }}>{p.method}</span></td>
                  <td style={S.td}><span style={S.statusBadge(p.status)}>{p.status}</span></td>
                  <td style={S.td}>{fmt.date(p.paid_at)}</td>
                  <td style={{ ...S.td, fontSize:12, color:COLORS.textDim }}>{p.recorded_by_name || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Income / Outcome Pages ─────────────────────────────────────────────────

function IncomePage() {
  const api = useApi();
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");
  const [source, setSource] = useState("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/api/payments/?status=confirmed').catch(() => ({ results: [] })),
      api.get('/api/transactions/').catch(() => ({ results: [] })),
    ]).then(([p, t]) => {
      const pays = p?.results || p || [];
      const txs = (t?.results || t || []).filter(x => x.transaction_type === 'income');
      setPayments(pays);
      setTransactions(txs);
    }).finally(() => setLoading(false));
  }, []);

  const combined = transactions.map(t => ({
    id: `t-${t.id}`,
    source: 'transaction',
    title: t.title,
    subtotal: Number(t.subtotal) || 0,
    date: t.date,
    category: t.category_label || t.category,
  })).concat(payments.map(p => ({
    id: `p-${p.id}`,
    source: 'payment',
    title: p.receipt_number || 'Payment',
    subtotal: Number(p.amount) || 0,
    date: p.paid_at,
    category: 'payment',
  })));

  const categories = Array.from(new Set(transactions.map(t => t.category_label || t.category).filter(Boolean))).sort();

  const inRange = (d) => {
    if (!d) return false;
    const dt = new Date(d).setHours(0,0,0,0);
    if (dateFrom) {
      const f = new Date(dateFrom).setHours(0,0,0,0);
      if (dt < f) return false;
    }
    if (dateTo) {
      const t = new Date(dateTo).setHours(23,59,59,999);
      if (dt > t) return false;
    }
    return true;
  };

  const filtered = combined.filter(r => {
    if (source !== 'all' && r.source !== source) return false;
    if (category && category !== 'all' && r.category !== category) return false;
    if (dateFrom || dateTo) {
      if (!r.date) return false;
      if (!inRange(r.date)) return false;
    }
    return true;
  });

  const totalPayments = filtered.filter(f => f.source === 'payment').reduce((s, p) => s + p.subtotal, 0);
  const totalTx = filtered.filter(f => f.source === 'transaction').reduce((s, t) => s + t.subtotal, 0);

  return (
    <div>
      <h1 style={{ fontSize:20, fontWeight:700, marginBottom:12 }}>Income</h1>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
        <select style={S.select} value={source} onChange={e => setSource(e.target.value)}>
          <option value="all">All sources</option>
          <option value="payment">Payments</option>
          <option value="transaction">Transactions</option>
        </select>
        <select style={S.select} value={category || ""} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          <option value="all">Payments</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" style={{ ...S.input, width:150 }} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input type="date" style={{ ...S.input, width:150 }} value={dateTo} onChange={e=>setDateTo(e.target.value)} />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:12, marginBottom:18 }}>
        <div style={S.metric(COLORS.accent)}>
          <div style={S.metricLabel}>Displayed Records</div>
          <div style={S.metricVal}>{filtered.length}</div>
          <div style={S.metricSub}>Matching filter</div>
        </div>
        <div style={S.metric(COLORS.green)}>
          <div style={S.metricLabel}>Payments Total</div>
          <div style={S.metricVal}>{fmt.egp(totalPayments)}</div>
          <div style={S.metricSub}>From shown payments</div>
        </div>
        <div style={S.metric(COLORS.greenDim)}>
          <div style={S.metricLabel}>Transactions Total</div>
          <div style={S.metricVal}>{fmt.egp(totalTx)}</div>
          <div style={S.metricSub}>From shown transactions</div>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Source</th>
              <th style={S.th}>Title</th>
              <th style={S.th}>Amount</th>
              <th style={S.th}>Date</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ ...S.td, textAlign:"center", padding:40, color:COLORS.textDim }}>No income records</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td style={S.td}>{r.source === 'payment' ? 'Payment' : 'Transaction'}</td>
                  <td style={S.td}>{r.title}</td>
                  <td style={{ ...S.td, fontWeight:600, color:COLORS.green }}>{fmt.egp(r.subtotal)}</td>
                  <td style={S.td}>{fmt.date(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OutcomePage() {
  const api = useApi();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get('/api/transactions/').then(d => {
      const txs = (d?.results || d || []).filter(x => x.transaction_type === 'outcome');
      setTransactions(txs);
    }).catch(() => setTransactions([])).finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(transactions.map(t => t.category_label || t.category).filter(Boolean))).sort();

  const inRange = (d) => {
    if (!d) return false;
    const dt = new Date(d).setHours(0,0,0,0);
    if (dateFrom) {
      const f = new Date(dateFrom).setHours(0,0,0,0);
      if (dt < f) return false;
    }
    if (dateTo) {
      const t = new Date(dateTo).setHours(23,59,59,999);
      if (dt > t) return false;
    }
    return true;
  };

  const filtered = transactions.filter(t => {
    if (category && category !== 'all' && (t.category_label || t.category) !== category) return false;
    if (dateFrom || dateTo) {
      if (!t.date) return false;
      if (!inRange(t.date)) return false;
    }
    return true;
  });

  const totalTx = filtered.reduce((s, t) => s + (Number(t.subtotal) || 0), 0);

  return (
    <div>
      <h1 style={{ fontSize:20, fontWeight:700, marginBottom:12 }}>Outcome</h1>
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
        <select style={S.select} value={category || ""} onChange={e=>setCategory(e.target.value)}>
          <option value="">All categories</option>
          <option value="all">All</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" style={{ ...S.input, width:150 }} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        <input type="date" style={{ ...S.input, width:150 }} value={dateTo} onChange={e=>setDateTo(e.target.value)} />
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <div style={S.metric(COLORS.red)}>
          <div style={S.metricLabel}>Outcome Total</div>
          <div style={S.metricVal}>{fmt.egp(totalTx)}</div>
          <div style={S.metricSub}>Filtered total</div>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div style={S.card}>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Title</th>
              <th style={S.th}>Category</th>
              <th style={S.th}>Amount</th>
              <th style={S.th}>Date</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} style={{ ...S.td, textAlign:"center", padding:40, color:COLORS.textDim }}>No outcome records</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td style={S.td}>{t.title}</td>
                  <td style={S.td}>{t.category_label || t.category}</td>
                  <td style={{ ...S.td, fontWeight:600, color:COLORS.red }}>{fmt.egp(t.subtotal)}</td>
                  <td style={S.td}>{fmt.date(t.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Nav Config ───────────────────────────────────────────────────────────────

const NAV = [
  {
    section: "Overview",
    items: [
      { id:"dashboard",   label:"Dashboard",    icon:"⬡", roles:["admin","secretary","instructor","finance","tools"] },
    ]
  },
  {
    section: "Academic",
    items: [
      { id:"courses",     label:"Courses",      icon:"◈", roles:["admin","secretary","instructor"] },
      { id:"students",    label:"Students",     icon:"◇", roles:["admin","secretary"] },
      { id:"enrollments", label:"Enrollments",  icon:"○", roles:["admin","secretary"] },
      { id:"attendance",  label:"Attendance",   icon:"◆", roles:["admin","secretary","instructor"] },
    ]
  },
  {
    section: "Finance",
    items: [
      { id:"financial",   label:"Financial Dashboard", icon:"▲", roles:["admin","finance"] },
      { id:"payments",    label:"Payments",     icon:"◉", roles:["admin","finance"] },
      { id:"income",      label:"Income",       icon:"⬆", roles:["admin","finance"] },
      { id:"outcome",     label:"Outcome",      icon:"⬇", roles:["admin","finance"] },
    ]
  },
];

const PAGE_TITLES = {
  dashboard:"Dashboard", courses:"Courses", students:"Students",
  enrollments:"Enrollments", attendance:"Attendance",
  financial:"Financial Dashboard", payments:"Payments",
  income:"Income", outcome:"Outcome",
};

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell({ user, onLogout }) {
  const effectiveRole = user.is_superuser || user.is_staff ? "admin" : user.role;
  const role = ROLE_META[effectiveRole] || ROLE_META.secretary;
  const allowedPages = NAV.flatMap(s=>s.items).filter(i=>i.roles.includes(effectiveRole)).map(i=>i.id);
  const [page, setPage] = useState(allowedPages[0] || "dashboard");

  const renderPage = () => {
    switch(page) {
      case "dashboard":   return <DashboardPage user={user} />;
      case "courses":     return <CoursesPage />;
      case "students":    return <StudentsPage />;
      case "enrollments": return <EnrollmentsPage />;
      case "attendance":  return <AttendancePage />;
      case "financial":   return <FinancialPage />;
      case "payments":    return <PaymentsPage />;
      case "income":      return <IncomePage />;
      case "outcome":     return <OutcomePage />;
      default:            return <DashboardPage user={user} />;
    }
  };

  return (
    <div style={S.app}>
      <nav style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={S.logoMark}>
            <div style={S.logoIcon}>R</div>
            <div>
              <div style={S.logoText}>Roboleap</div>
              <div style={S.logoSub}>Academy</div>
            </div>
          </div>
        </div>

        {NAV.map(section => {
          const visible = section.items.filter(i => i.roles.includes(effectiveRole));
          if (!visible.length) return null;
          return (
            <div key={section.section} style={S.navSection}>
              <div style={S.navLabel}>{section.section}</div>
              {visible.map(item => (
                <div key={item.id} style={S.navItem(page===item.id)} onClick={() => setPage(item.id)}>
                  <span style={S.navIcon}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          );
        })}

        <div style={S.sidebarFooter}>
          <div style={S.userChip}>
            <div style={S.avatar(role.color)}>{fmt.initials(user.username)}</div>
            <div style={S.userInfo}>
              <div style={S.userName}>{user.username}</div>
              <div style={{ ...S.userRole, color: role.color }}>{role.label}</div>
            </div>
            <button title="Sign out" onClick={onLogout}
              style={{ background:"none", border:"none", cursor:"pointer", color:COLORS.textDim, fontSize:14, padding:4 }}>
              ⏻
            </button>
          </div>
        </div>
      </nav>

      <main style={S.main}>
        <div style={S.topbar}>
          <span style={S.topbarTitle}>{PAGE_TITLES[page]}</span>
          <span style={{ fontSize:12, color:COLORS.textDim }}>
            {role.icon} {role.label}
          </span>
        </div>
        <div style={S.content}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const api = useApi();
  const [auth, setAuth] = useState(() => ({
    token: typeof window !== "undefined" ? localStorage.getItem("rl_token") : null,
    user: null,
  }));
  const [loading, setLoading] = useState(!!auth.token);

  useEffect(() => {
    if (!auth.token) return;
    api.me().then(user => {
      // get current user — try /api/users/me/ first, fallback to token decode
      setAuth(p => ({ ...p, user }));
    }).catch(() => {
      localStorage.removeItem("rl_token");
      setAuth({ token: null, user: null });
    }).finally(() => setLoading(false));
  }, []);

  const handleLogin = (user) => {
    setAuth({ token: localStorage.getItem("rl_token"), user });
  };

  const handleLogout = () => {
    api.logout();
    setAuth({ token: null, user: null });
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:COLORS.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Spinner />
    </div>
  );

  if (!auth.token) return <LoginPage onLogin={handleLogin} />;
  if (!auth.user)  return <LoginPage onLogin={handleLogin} />;

  return <Shell user={auth.user} onLogout={handleLogout} />;
}
