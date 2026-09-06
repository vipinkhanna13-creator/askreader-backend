import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutDashboard, Library, Users, BarChart3, ScrollText, Search, Plus,
  Pencil, CheckCircle2, XCircle, Clock, ChevronRight, X, Save, RefreshCcw,
  ShieldAlert, ShieldCheck, Filter, Trash2, ArrowUpRight, AlertTriangle,
} from "lucide-react";

/* ---------------------------------------------------------------------
   TOKENS (shared visual language with the reader app)
--------------------------------------------------------------------- */
const ink = "#182238";
const inkSoft = "#2B3550";
const paper = "#F5F6F2";
const paperDeep = "#EEEFE9";
const line = "#D8DBD2";
const textPrimary = "#1B1F27";
const textSecondary = "#5C6472";
const brass = "#A97D3E";
const brassDeep = "#8A6530";
const success = "#2F6E4F";
const successBg = "#EAF2EC";
const warn = "#A3502B";
const warnBg = "#F5E8DF";
const danger = "#9B3B3B";
const dangerBg = "#F5E4E2";
const white = "#FFFFFF";

const serif = "'Source Serif 4', 'Iowan Old Style', Georgia, serif";
const sans = "'IBM Plex Sans', 'Segoe UI', sans-serif";

const CATEGORY_META = [
  { id: "cc", label: "Central Commentaries" },
  { id: "sc", label: "State Commentaries" },
  { id: "sba", label: "State Bare Acts" },
  { id: "cba", label: "Central Bare Acts with State Amendments" },
];
const ALL_CATS = CATEGORY_META.map((c) => c.id);

const PUB_STATUSES = ["Draft", "In review", "Scheduled", "Published", "Superseded", "Withdrawn", "Archived"];

/* ---------------------------------------------------------------------
   SEED DATA
--------------------------------------------------------------------- */
const SEED_BOOKS = [
  { id: "b-bns", title: "The Bharatiya Nyaya Sanhita, 2023", categories: ALL_CATS, state: "All-India", subject: "Criminal Law", edition: "Act No. 45 of 2023", effectiveDate: "1 Jul 2024", status: "Published" },
  { id: "b-bnss", title: "The Bharatiya Nagarik Suraksha Sanhita, 2023", categories: ALL_CATS, state: "All-India", subject: "Criminal Procedure", edition: "Act No. 46 of 2023", effectiveDate: "1 Jul 2024", status: "Published" },
  { id: "b-bsa", title: "The Bharatiya Sakshya Adhiniyam, 2023", categories: ALL_CATS, state: "All-India", subject: "Law of Evidence", edition: "Act No. 47 of 2023", effectiveDate: "1 Jul 2024", status: "Published" },
  { id: "b-m16", title: "The Uttar Pradesh Municipalities Act, 1916", categories: ALL_CATS, state: "Uttar Pradesh", subject: "Municipal Administration", edition: "Amended by U.P. Acts 5 & 6 of 2023", effectiveDate: "Consolidated 2023", status: "Published" },
  { id: "b-mc1959", title: "The Uttar Pradesh Municipal Corporation Act, 1959", categories: ALL_CATS, state: "Uttar Pradesh", subject: "Municipal Corporations", edition: "Amended through 2004", effectiveDate: "Consolidated 2004", status: "Published" },
  { id: "b-revenue-code", title: "The Uttar Pradesh Revenue Code, 2006", categories: ALL_CATS, state: "Uttar Pradesh", subject: "Land Revenue", edition: "As amended", effectiveDate: "Consolidated 2016", status: "Published" },
  { id: "b-urban-planning", title: "The Uttar Pradesh Urban Planning and Development Act, 1973", categories: ALL_CATS, state: "Uttar Pradesh", subject: "Urban Planning", edition: "Amended through 2023", effectiveDate: "Consolidated 2023", status: "Published" },
  { id: "b-rules-of-court", title: "Rules of Court, 1952 — with Commentary", categories: ALL_CATS, state: "Uttar Pradesh", subject: "Civil Procedure", edition: "Commentary edition, Ravikant", effectiveDate: "Updated 2025", status: "In review" },
];

const FIRST_NAMES = ["Ananya", "Rohan", "Priya", "Vikram", "Meera", "Arjun", "Kavita", "Suresh", "Neha", "Deepak"];
const LAST_NAMES = ["Sharma", "Verma", "Gupta", "Iyer", "Singh", "Rao", "Nair", "Chauhan", "Mehta", "Joshi"];
const PLANS = ["Starter", "Professional", "Complete Annual", "Institutional"];

function buildSeedSubscribers() {
  const now = Date.now();
  const day = 86400000;
  // daysLeft values chosen to cover active / expiring-soon / expired
  const daysLeftSeed = [310, 260, 210, 55, 29, 12, -5, -40, 300, 150];
  return daysLeftSeed.map((daysLeft, i) => {
    const expiry = now + daysLeft * day;
    const activation = expiry - 365 * day;
    let status = "Active";
    if (daysLeft < 0) status = "Expired";
    else if (daysLeft <= 30) status = "Expiring";
    return {
      id: `sub-${i + 1}`,
      name: `${FIRST_NAMES[i]} ${LAST_NAMES[i]}`,
      email: `${FIRST_NAMES[i].toLowerCase()}.${LAST_NAMES[i].toLowerCase()}@example.com`,
      plan: PLANS[i % PLANS.length],
      activation,
      expiry,
      status,
    };
  });
}

const SEED_AUDIT = [
  { id: "a1", at: Date.now() - 86400000 * 2, actor: "Admin — R. Sharma", action: "Published edition", target: "The Bharatiya Nyaya Sanhita, 2023" },
  { id: "a2", at: Date.now() - 86400000 * 5, actor: "Admin — R. Sharma", action: "Uploaded new title", target: "Rules of Court, 1952 — with Commentary" },
];

/* ---------------------------------------------------------------------
   STORAGE
--------------------------------------------------------------------- */
const STORE_KEY = "askreader-admin:v1";

async function loadPersisted() {
  try {
    const res = await window.storage.get(STORE_KEY, false);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) { /* not yet present */ }
  return { books: SEED_BOOKS, subscribers: buildSeedSubscribers(), auditLog: SEED_AUDIT };
}
async function savePersisted(data) {
  try { await window.storage.set(STORE_KEY, JSON.stringify(data), false); }
  catch (e) { console.error("Storage error", e); }
}

/* ---------------------------------------------------------------------
   PRIMITIVES
--------------------------------------------------------------------- */
function Pill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: paperDeep, fg: textSecondary, bd: line },
    success: { bg: successBg, fg: success, bd: "#C9DECB" },
    warn: { bg: warnBg, fg: warn, bd: "#E3C6AE" },
    danger: { bg: dangerBg, fg: danger, bd: "#E4C3BE" },
    brass: { bg: "#F3E9D8", fg: brassDeep, bd: "#DFC69B" },
  };
  const t = tones[tone];
  return (
    <span style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, fontFamily: sans, fontSize: 11.5, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Button({ children, onClick, variant = "primary", size = "md", icon: Icon, disabled }) {
  const base = {
    display: "inline-flex", alignItems: "center", gap: 6, cursor: disabled ? "default" : "pointer",
    fontFamily: sans, fontSize: size === "sm" ? 12.5 : 13.5, padding: size === "sm" ? "6px 10px" : "9px 16px",
    border: "1px solid transparent", opacity: disabled ? 0.5 : 1,
  };
  const variants = {
    primary: { background: ink, color: white },
    secondary: { background: white, color: ink, borderColor: line },
    danger: { background: white, color: danger, borderColor: "#E4C3BE" },
    ghost: { background: "transparent", color: textSecondary },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>
      {Icon && <Icon size={14} strokeWidth={2} />}
      {children}
    </button>
  );
}

function statusTone(status) {
  if (["Published", "Active"].includes(status)) return "success";
  if (["Expiring", "In review", "Scheduled"].includes(status)) return "warn";
  if (["Expired", "Withdrawn", "Suspended", "Cancelled"].includes(status)) return "danger";
  return "neutral";
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function daysBetween(a, b) {
  return Math.round((a - b) / 86400000);
}

/* ---------------------------------------------------------------------
   APP
--------------------------------------------------------------------- */
export default function ASKreaderAdmin() {
  const [ready, setReady] = useState(false);
  const [books, setBooks] = useState(SEED_BOOKS);
  const [subscribers, setSubscribers] = useState([]);
  const [auditLog, setAuditLog] = useState(SEED_AUDIT);

  const [tab, setTab] = useState("dashboard");
  const [editingBook, setEditingBook] = useState(null); // book object or "new"
  const [bookQuery, setBookQuery] = useState("");
  const [subFilter, setSubFilter] = useState("All");
  const [subQuery, setSubQuery] = useState("");

  useEffect(() => {
    loadPersisted().then((d) => {
      setBooks(d.books || SEED_BOOKS);
      setSubscribers(d.subscribers || buildSeedSubscribers());
      setAuditLog(d.auditLog || SEED_AUDIT);
      setReady(true);
    });
  }, []);

  const persist = useCallback((next) => { savePersisted(next); }, []);

  useEffect(() => {
    if (ready) persist({ books, subscribers, auditLog });
  }, [books, subscribers, auditLog, ready, persist]);

  function logEvent(action, target) {
    setAuditLog((prev) => [{ id: `a-${Date.now()}`, at: Date.now(), actor: "Admin — R. Sharma", action, target }, ...prev]);
  }

  function updateBookStatus(id, status) {
    const book = books.find((b) => b.id === id);
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    logEvent(`Set status to "${status}"`, book?.title || id);
  }

  function saveBook(book) {
    setBooks((prev) => {
      const exists = prev.some((b) => b.id === book.id);
      return exists ? prev.map((b) => (b.id === book.id ? book : b)) : [book, ...prev];
    });
    logEvent(books.some((b) => b.id === book.id) ? "Edited metadata" : "Uploaded new title", book.title);
    setEditingBook(null);
  }

  function deleteBook(id) {
    const book = books.find((b) => b.id === id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
    logEvent("Withdrew and removed record", book?.title || id);
  }

  function extendSubscriber(id) {
    setSubscribers((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const day = 86400000;
      const base = s.expiry > Date.now() ? s.expiry : Date.now();
      const newExpiry = base + 365 * day;
      logEvent("Extended entitlement by 365 days", s.name);
      return { ...s, expiry: newExpiry, status: daysBetween(newExpiry, Date.now()) <= 30 ? "Expiring" : "Active" };
    }));
  }

  function suspendSubscriber(id) {
    setSubscribers((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      logEvent("Suspended entitlement", s.name);
      return { ...s, status: "Suspended" };
    }));
  }

  const kpis = useMemo(() => {
    const published = books.filter((b) => b.status === "Published").length;
    const review = books.filter((b) => b.status === "In review" || b.status === "Draft").length;
    const active = subscribers.filter((s) => s.status === "Active").length;
    const expiring = subscribers.filter((s) => s.status === "Expiring").length;
    const expired = subscribers.filter((s) => s.status === "Expired").length;
    return { published, review, active, expiring, expired, total: books.length };
  }, [books, subscribers]);

  if (!ready) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, color: textSecondary, background: paper }}>Loading admin portal…</div>;
  }

  return (
    <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column", background: paper, fontFamily: sans, color: textPrimary }}>
      <header style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 18px", borderBottom: `1px solid ${line}`, background: white }}>
        <div style={{ width: 22, height: 22, background: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: brass, fontFamily: serif, fontSize: 13, fontWeight: 600 }}>A</span>
        </div>
        <span style={{ fontFamily: serif, fontSize: 17, color: ink }}>ASKreader</span>
        <span style={{ fontFamily: sans, fontSize: 12, color: textSecondary, borderLeft: `1px solid ${line}`, paddingLeft: 12 }}>Content &amp; Subscription Admin</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Pill tone="brass">Super Administrator</Pill>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: inkSoft, color: white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>RS</div>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <aside style={{ width: 210, flexShrink: 0, borderRight: `1px solid ${line}`, background: white, padding: "14px 0" }}>
          {[
            ["dashboard", LayoutDashboard, "Dashboard"],
            ["catalogue", Library, "Catalogue"],
            ["subscriptions", Users, "Subscriptions"],
            ["reports", BarChart3, "Reports"],
            ["audit", ScrollText, "Audit log"],
          ].map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px",
                background: tab === id ? paperDeep : "transparent",
                borderLeft: `2px solid ${tab === id ? brass : "transparent"}`, border: "none",
                borderLeftWidth: 2, color: tab === id ? ink : textSecondary, cursor: "pointer", fontFamily: sans, fontSize: 13.5, textAlign: "left",
              }}>
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </aside>

        <main style={{ flex: 1, overflowY: "auto" }}>
          {tab === "dashboard" && <DashboardTab kpis={kpis} auditLog={auditLog} onGo={setTab} />}
          {tab === "catalogue" && (
            <CatalogueTab
              books={books}
              query={bookQuery}
              setQuery={setBookQuery}
              onEdit={(b) => setEditingBook(b)}
              onNew={() => setEditingBook({ id: `b-${Date.now()}`, title: "", categories: [], state: "", subject: "", edition: "", effectiveDate: "", status: "Draft" })}
              onStatus={updateBookStatus}
              onDelete={deleteBook}
            />
          )}
          {tab === "subscriptions" && (
            <SubscriptionsTab
              subscribers={subscribers}
              filter={subFilter}
              setFilter={setSubFilter}
              query={subQuery}
              setQuery={setSubQuery}
              onExtend={extendSubscriber}
              onSuspend={suspendSubscriber}
            />
          )}
          {tab === "reports" && <ReportsTab books={books} subscribers={subscribers} />}
          {tab === "audit" && <AuditTab log={auditLog} />}
        </main>
      </div>

      {editingBook && (
        <BookEditor
          book={editingBook}
          onCancel={() => setEditingBook(null)}
          onSave={saveBook}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------
   DASHBOARD
--------------------------------------------------------------------- */
function KpiCard({ label, value, tone, sub }) {
  const tones = { success, warn, danger, ink };
  return (
    <div style={{ border: `1px solid ${line}`, background: white, padding: "16px 18px", flex: 1, minWidth: 140 }}>
      <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: serif, fontSize: 28, color: tones[tone] || ink }}>{value}</div>
      {sub && <div style={{ fontFamily: sans, fontSize: 11.5, color: textSecondary, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DashboardTab({ kpis, auditLog, onGo }) {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "30px 28px 60px" }}>
      <h1 style={{ fontFamily: serif, fontSize: 26, margin: "0 0 4px", color: ink }}>Dashboard</h1>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: textSecondary, margin: "0 0 24px" }}>Overview of catalogue health and subscription status.</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 30 }}>
        <KpiCard label="Published titles" value={kpis.published} tone="success" sub={`${kpis.total} total in catalogue`} />
        <KpiCard label="Awaiting review" value={kpis.review} tone="warn" />
        <KpiCard label="Active subscriptions" value={kpis.active} tone="success" />
        <KpiCard label="Expiring within 30 days" value={kpis.expiring} tone="warn" />
        <KpiCard label="Expired" value={kpis.expired} tone="danger" />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 30 }}>
        <Button variant="secondary" icon={Library} onClick={() => onGo("catalogue")}>Go to catalogue</Button>
        <Button variant="secondary" icon={Users} onClick={() => onGo("subscriptions")}>Go to subscriptions</Button>
      </div>

      <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginBottom: 10 }}>RECENT ACTIVITY</div>
      <div style={{ border: `1px solid ${line}`, background: white }}>
        {auditLog.slice(0, 6).map((e, i) => (
          <div key={e.id} style={{ display: "flex", gap: 14, padding: "12px 16px", borderBottom: i < 5 ? `1px solid ${line}` : "none" }}>
            <Clock size={14} color={textSecondary} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 13, color: textPrimary }}>
                <strong>{e.actor}</strong> — {e.action}
              </div>
              <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginTop: 2 }}>{e.target} · {fmtDate(e.at)}</div>
            </div>
          </div>
        ))}
        {auditLog.length === 0 && <div style={{ padding: 16, fontFamily: sans, fontSize: 13, color: textSecondary }}>No activity yet.</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   CATALOGUE
--------------------------------------------------------------------- */
function CatalogueTab({ books, query, setQuery, onEdit, onNew, onStatus, onDelete }) {
  const filtered = books.filter((b) => b.title.toLowerCase().includes(query.toLowerCase()));
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "30px 28px 60px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 26, margin: "0 0 4px", color: ink }}>Catalogue</h1>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: textSecondary, margin: 0 }}>{books.length} titles across four collections</p>
        </div>
        <Button icon={Plus} onClick={onNew}>Add title</Button>
      </div>

      <div style={{ position: "relative", maxWidth: 340, marginBottom: 18 }}>
        <Search size={14} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles…"
          style={{ width: "100%", height: 32, paddingLeft: 28, border: `1px solid ${line}`, background: white, fontFamily: sans, fontSize: 13, outline: "none" }} />
      </div>

      <div style={{ border: `1px solid ${line}`, background: white }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 130px 150px 90px", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${line}`, fontFamily: sans, fontSize: 11.5, color: textSecondary }}>
          <span>TITLE</span><span>STATE</span><span>EDITION</span><span>STATUS</span><span>ACTIONS</span>
        </div>
        {filtered.map((b) => (
          <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 130px 150px 90px", gap: 8, padding: "13px 14px", borderBottom: `1px solid ${line}`, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: serif, fontSize: 14, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</div>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: textSecondary, marginTop: 2 }}>{b.subject}</div>
            </div>
            <div style={{ fontFamily: sans, fontSize: 12.5, color: textSecondary }}>{b.state}</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.edition}</div>
            <select value={b.status} onChange={(e) => onStatus(b.id, e.target.value)}
              style={{ fontFamily: sans, fontSize: 12, border: `1px solid ${line}`, background: statusTone(b.status) === "success" ? successBg : statusTone(b.status) === "warn" ? warnBg : statusTone(b.status) === "danger" ? dangerBg : paperDeep, padding: "4px 6px", width: "fit-content" }}>
              {PUB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => onEdit(b)} title="Edit" style={{ border: "none", background: "none", cursor: "pointer", color: textSecondary }}><Pencil size={15} /></button>
              <button onClick={() => onDelete(b.id)} title="Remove" style={{ border: "none", background: "none", cursor: "pointer", color: textSecondary }}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ padding: 20, fontFamily: sans, fontSize: 13, color: textSecondary }}>No titles match your search.</div>}
      </div>
    </div>
  );
}

function BookEditor({ book, onCancel, onSave }) {
  const [form, setForm] = useState(book);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleCat = (id) => setForm((f) => ({ ...f, categories: f.categories.includes(id) ? f.categories.filter((c) => c !== id) : [...f.categories, id] }));

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(24,34,56,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ width: 520, maxHeight: "86vh", overflowY: "auto", background: white, border: `1px solid ${line}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${line}` }}>
          <span style={{ fontFamily: serif, fontSize: 17, color: ink }}>{book.title ? "Edit title" : "Add new title"}</span>
          <button onClick={onCancel} style={{ border: "none", background: "none", cursor: "pointer", color: textSecondary }}><X size={18} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Title">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Author / editor">
            <input value={form.author || ""} onChange={(e) => set("author", e.target.value)} style={inputStyle} />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="State" style={{ flex: 1 }}>
              <input value={form.state} onChange={(e) => set("state", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Subject" style={{ flex: 1 }}>
              <input value={form.subject} onChange={(e) => set("subject", e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Edition" style={{ flex: 1 }}>
              <input value={form.edition} onChange={(e) => set("edition", e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Amendment currency / effective date" style={{ flex: 1 }}>
              <input value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <Field label="Categories">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {CATEGORY_META.map((c) => (
                <button key={c.id} onClick={() => toggleCat(c.id)}
                  style={{
                    fontFamily: sans, fontSize: 12, padding: "5px 10px", cursor: "pointer",
                    border: `1px solid ${form.categories.includes(c.id) ? brass : line}`,
                    background: form.categories.includes(c.id) ? "#F3E9D8" : white,
                    color: form.categories.includes(c.id) ? brassDeep : textSecondary,
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Publication status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} style={inputStyle}>
              {PUB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: 16, borderTop: `1px solid ${line}` }}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button icon={Save} onClick={() => onSave(form)} disabled={!form.title.trim()}>Save</Button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children, style }) {
  return (
    <div style={style}>
      <div style={{ fontFamily: sans, fontSize: 11.5, color: textSecondary, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}
const inputStyle = { width: "100%", height: 34, border: `1px solid ${line}`, padding: "0 10px", fontFamily: sans, fontSize: 13, outline: "none", background: white };

/* ---------------------------------------------------------------------
   SUBSCRIPTIONS
--------------------------------------------------------------------- */
function SubscriptionsTab({ subscribers, filter, setFilter, query, setQuery, onExtend, onSuspend }) {
  const filtered = subscribers.filter((s) => (filter === "All" || s.status === filter) && s.name.toLowerCase().includes(query.toLowerCase()));
  const counts = {
    All: subscribers.length,
    Active: subscribers.filter((s) => s.status === "Active").length,
    Expiring: subscribers.filter((s) => s.status === "Expiring").length,
    Expired: subscribers.filter((s) => s.status === "Expired").length,
    Suspended: subscribers.filter((s) => s.status === "Suspended").length,
  };
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "30px 28px 60px" }}>
      <h1 style={{ fontFamily: serif, fontSize: 26, margin: "0 0 4px", color: ink }}>Subscriptions</h1>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: textSecondary, margin: "0 0 20px" }}>Entitlements follow a 365-day term from activation; early renewal preserves unused time.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.keys(counts).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{
              fontFamily: sans, fontSize: 12.5, padding: "6px 12px", cursor: "pointer",
              border: `1px solid ${filter === k ? ink : line}`, background: filter === k ? ink : white, color: filter === k ? white : textSecondary,
            }}>
            {k} ({counts[k]})
          </button>
        ))}
        <div style={{ position: "relative", marginLeft: "auto", width: 220 }}>
          <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subscriber…"
            style={{ width: "100%", height: 30, paddingLeft: 26, border: `1px solid ${line}`, background: white, fontFamily: sans, fontSize: 12.5, outline: "none" }} />
        </div>
      </div>

      <div style={{ border: `1px solid ${line}`, background: white }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 110px 110px 90px 110px 150px", gap: 8, padding: "9px 14px", borderBottom: `1px solid ${line}`, fontFamily: sans, fontSize: 11.5, color: textSecondary }}>
          <span>SUBSCRIBER</span><span>PLAN</span><span>ACTIVATED</span><span>EXPIRES</span><span>DAYS LEFT</span><span>STATUS</span><span>ACTIONS</span>
        </div>
        {filtered.map((s) => {
          const daysLeft = daysBetween(s.expiry, Date.now());
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 110px 110px 90px 110px 150px", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${line}`, alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: sans, fontSize: 13, color: textPrimary }}>{s.name}</div>
                <div style={{ fontFamily: sans, fontSize: 11.5, color: textSecondary }}>{s.email}</div>
              </div>
              <div style={{ fontFamily: sans, fontSize: 12.5, color: textSecondary }}>{s.plan}</div>
              <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary }}>{fmtDate(s.activation)}</div>
              <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary }}>{fmtDate(s.expiry)}</div>
              <div style={{ fontFamily: sans, fontSize: 12.5, color: daysLeft < 0 ? danger : daysLeft <= 30 ? warn : textPrimary }}>{daysLeft < 0 ? `${Math.abs(daysLeft)}d over` : `${daysLeft}d`}</div>
              <Pill tone={statusTone(s.status)}>
                {s.status === "Active" && <ShieldCheck size={11} />}
                {s.status === "Expiring" && <AlertTriangle size={11} />}
                {s.status === "Expired" && <XCircle size={11} />}
                {s.status}
              </Pill>
              <div style={{ display: "flex", gap: 4 }}>
                <Button size="sm" variant="secondary" icon={RefreshCcw} onClick={() => onExtend(s.id)}>Extend</Button>
                {s.status !== "Suspended" && <Button size="sm" variant="ghost" onClick={() => onSuspend(s.id)}>Suspend</Button>}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 20, fontFamily: sans, fontSize: 13, color: textSecondary }}>No subscribers match this view.</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   REPORTS
--------------------------------------------------------------------- */
function BarRow({ label, value, max, tone }) {
  const tones = { success, warn, brass: brassDeep, ink };
  const pct = Math.max(4, Math.round((value / max) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: sans, fontSize: 12.5, color: textPrimary, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: textSecondary }}>{value}</span>
      </div>
      <div style={{ height: 8, background: paperDeep }}>
        <div style={{ height: "100%", width: `${pct}%`, background: tones[tone] || ink }} />
      </div>
    </div>
  );
}

function ReportsTab({ books, subscribers }) {
  const byPlan = PLANS.map((p) => ({ label: p, value: subscribers.filter((s) => s.plan === p).length }));
  const maxPlan = Math.max(1, ...byPlan.map((b) => b.value));

  const mostRead = books.slice(0, 6).map((b, i) => ({ label: b.title, value: [412, 388, 355, 301, 266, 210][i] || 100 }));
  const maxRead = Math.max(1, ...mostRead.map((b) => b.value));

  const searchTerms = [
    { label: "bail", value: 940 }, { label: "definitions", value: 812 }, { label: "short title", value: 705 },
    { label: "cognizable offence", value: 588 }, { label: "development authority", value: 402 },
  ];
  const maxTerm = Math.max(1, ...searchTerms.map((t) => t.value));

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "30px 28px 60px" }}>
      <h1 style={{ fontFamily: serif, fontSize: 26, margin: "0 0 4px", color: ink }}>Reports</h1>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: textSecondary, margin: "0 0 26px" }}>Illustrative figures — will reflect live usage once connected to a production backend.</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ border: `1px solid ${line}`, background: white, padding: 18 }}>
          <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginBottom: 14 }}>SUBSCRIPTIONS BY PLAN</div>
          {byPlan.map((b) => <BarRow key={b.label} {...b} max={maxPlan} tone="ink" />)}
        </div>
        <div style={{ border: `1px solid ${line}`, background: white, padding: 18 }}>
          <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginBottom: 14 }}>TOP SEARCH TERMS</div>
          {searchTerms.map((t) => <BarRow key={t.label} {...t} max={maxTerm} tone="brass" />)}
        </div>
        <div style={{ border: `1px solid ${line}`, background: white, padding: 18, gridColumn: "1 / -1" }}>
          <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginBottom: 14 }}>MOST-READ TITLES (LAST 30 DAYS)</div>
          {mostRead.map((b) => <BarRow key={b.label} {...b} max={maxRead} tone="success" />)}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   AUDIT LOG
--------------------------------------------------------------------- */
function AuditTab({ log }) {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "30px 28px 60px" }}>
      <h1 style={{ fontFamily: serif, fontSize: 26, margin: "0 0 4px", color: ink }}>Audit log</h1>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: textSecondary, margin: "0 0 22px" }}>Every administrative action is recorded with actor, timestamp, and affected record.</p>
      <div style={{ border: `1px solid ${line}`, background: white }}>
        {log.map((e, i) => (
          <div key={e.id} style={{ display: "flex", gap: 14, padding: "13px 16px", borderBottom: i < log.length - 1 ? `1px solid ${line}` : "none" }}>
            <ScrollText size={14} color={textSecondary} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sans, fontSize: 13, color: textPrimary }}><strong>{e.actor}</strong> — {e.action}</div>
              <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginTop: 2 }}>{e.target} · {fmtDate(e.at)}</div>
            </div>
          </div>
        ))}
        {log.length === 0 && <div style={{ padding: 20, fontFamily: sans, fontSize: 13, color: textSecondary }}>No audit events recorded yet.</div>}
      </div>
    </div>
  );
}
