import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search, ChevronDown, ChevronRight, Bookmark, BookmarkCheck, StickyNote,
  Home, LibraryBig, User, Menu, X, ZoomIn, ZoomOut, Moon, SunMedium,
  ArrowLeft, ListTree, Clock, ShieldCheck, AlertTriangle, ChevronLeft,
} from "lucide-react";

/* ---------------------------------------------------------------------
   TOKENS
--------------------------------------------------------------------- */
const ink = "#182238";
const inkSoft = "#2B3550";
const paper = "#F5F6F2";
const paperDeep = "#EEEFE9";
const line = "#D8DBD2";
const lineSoft = "#E4E6DF";
const textPrimary = "#1B1F27";
const textSecondary = "#5C6472";
const brass = "#A97D3E";
const brassDeep = "#8A6530";
const success = "#2F6E4F";
const warn = "#A3502B";
const white = "#FFFFFF";

const serif = "'Source Serif 4', 'Iowan Old Style', Georgia, serif";
const sans = "'IBM Plex Sans', 'Segoe UI', sans-serif";
const mono = "'IBM Plex Mono', monospace";

/* ---------------------------------------------------------------------
   MOCK CONTENT
   Original placeholder text written for this demo — not reproduced
   from any real statute, judgment, or commentary.
--------------------------------------------------------------------- */
const CATEGORY_META = [
  { id: "cc", label: "Central Commentaries", short: "Detailed explanatory works on Central legislation and subjects" },
  { id: "sc", label: "State Commentaries", short: "State-focused explanatory and practice-oriented publications" },
  { id: "sba", label: "State Bare Acts", short: "Official or publisher-prepared bare Acts, arranged by state" },
  { id: "cba", label: "Central Bare Acts with State Amendments", short: "Central legislation with applicable state amendment context" },
];

function sec(id, title, paras) {
  return { id, title, paras };
}
function chap(id, title, sections) {
  return { id, title, sections };
}

// All four categories, applied to every title — per publisher instruction
// to surface this initial sample set under each collection.
const ALL_CATS = CATEGORY_META.map((c) => c.id);

const BOOKS = [
  {
    id: "b-bns",
    categories: ALL_CATS,
    title: "The Bharatiya Nyaya Sanhita, 2023",
    author: "Bare Act — Government of India",
    state: "All-India",
    subject: "Criminal Law — Offences and Punishments",
    edition: "Act No. 45 of 2023",
    effectiveDate: "In force from 1 July 2024",
    chapters: [
      chap("c1", "Chapter I — Preliminary", [
        sec("s1", "1. Short title, commencement and application", [
          "Be it enacted by Parliament in the Seventy-fourth Year of the Republic of India as follows:—",
          "(1) This Act may be called the Bharatiya Nyaya Sanhita, 2023.",
          "(2) It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint, and different dates may be appointed for different provisions of this Sanhita.",
          "(3) Every person shall be liable to punishment under this Sanhita and not otherwise for every act or omission contrary to the provisions thereof, of which he shall be guilty within India.",
          "(4) Any person liable, by any law for the time being in force in India, to be tried for an offence committed beyond India shall be dealt with according to the provisions of this Sanhita for any act committed beyond India in the same manner as if such act had been committed within India.",
          "(5) The provisions of this Sanhita shall also apply to any offence committed by any citizen of India in any place without and beyond India; any person on any ship or aircraft registered in India wherever it may be; and any person in any place without and beyond India committing an offence targeting a computer resource located in India.",
          "(6) Nothing in this Sanhita shall affect the provisions of any Act for punishing mutiny and desertion of officers, soldiers, sailors or airmen in the service of the Government of India, or the provisions of any special or local law.",
        ]),
        sec("s2", "2. Definitions", [
          "In this Sanhita, unless the context otherwise requires, the following expressions have the meanings assigned to them below.",
          "\u201cAct\u201d denotes as well a series of acts as a single act; \u201cchild\u201d means any person below the age of eighteen years; \u201cCourt of Justice\u201d denotes a Judge who is empowered by law to act judicially, alone or as a member of a body of Judges, when acting judicially.",
          "\u201cGovernment\u201d includes the Central Government, or the State Government, or both, as the case may be; \u201cinjury\u201d denotes any harm illegally caused to any person in body, mind, reputation or property.",
          "(The section continues with further defined terms used throughout the Sanhita.)",
        ]),
      ]),
    ],
  },
  {
    id: "b-bnss",
    categories: ALL_CATS,
    title: "The Bharatiya Nagarik Suraksha Sanhita, 2023",
    author: "Bare Act — Government of India",
    state: "All-India",
    subject: "Criminal Procedure",
    edition: "Act No. 46 of 2023",
    effectiveDate: "In force from 1 July 2024",
    chapters: [
      chap("c1", "Chapter I — Preliminary", [
        sec("s1", "1. Short title, extent and commencement", [
          "An Act to consolidate and amend the law relating to Criminal Procedure. Be it enacted by Parliament in the Seventy-fourth Year of the Republic of India as follows:",
          "(1) This Act may be called the Bharatiya Nagarik Suraksha Sanhita, 2023.",
          "(2) The provisions of this Sanhita, other than those relating to Chapters IX, XI and XII thereof, shall not apply to the State of Nagaland or to the tribal areas, but the concerned State Government may, by notification, apply such provisions with such modifications as may be specified.",
          "(3) It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint.",
        ]),
        sec("s2", "2. Definitions", [
          "(1) In this Sanhita, unless the context otherwise requires: \u201cbail\u201d means release of a person accused of or suspected of commission of an offence from the custody of law upon certain conditions imposed by an officer or Court on execution by such person of a bond or a bail bond.",
          "\u201cbailable offence\u201d means an offence which is shown as bailable in the First Schedule, or which is made bailable by any other law for the time being in force; and \u201cnon-bailable offence\u201d means any other offence.",
          "\u201ccognizable offence\u201d means an offence for which, and \u201ccognizable case\u201d means a case in which, a police officer may, in accordance with the First Schedule or under any other law for the time being in force, arrest without warrant.",
          "(The section continues with further defined terms used throughout the Sanhita.)",
        ]),
      ]),
    ],
  },
  {
    id: "b-bsa",
    categories: ALL_CATS,
    title: "The Bharatiya Sakshya Adhiniyam, 2023",
    author: "Bare Act — Government of India",
    state: "All-India",
    subject: "Law of Evidence",
    edition: "Act No. 47 of 2023",
    effectiveDate: "In force from 1 July 2024",
    chapters: [
      chap("c1", "Chapter I — Preliminary", [
        sec("s1", "1. Short title, application, commencement", [
          "Be it enacted by Parliament in the Seventy-fourth Year of the Republic of India as follows:—",
          "(1) This Act may be called the Bharatiya Sakshya Adhiniyam, 2023.",
          "(2) It applies to all judicial proceedings in or before any Court, including Courts-martial, but not to affidavits presented to any Court or officer, nor to proceedings before an arbitrator.",
          "(3) It shall come into force on such date as the Central Government may, by notification in the Official Gazette, appoint.",
        ]),
        sec("s2", "2. Definitions", [
          "(1) In this Adhiniyam, unless the context otherwise requires: \u201cCourt\u201d includes all Judges and Magistrates, and all persons, except arbitrators, legally authorised to take evidence.",
          "\u201cconclusive proof\u201d means that when one fact is declared by this Adhiniyam to be conclusive proof of another, the Court shall, on proof of the one fact, regard the other as proved, and shall not allow evidence to be given for the purpose of disproving it.",
          "\u201cdocument\u201d means any matter expressed or described or otherwise recorded upon any substance by means of letters, figures or marks, intended to be used for recording that matter, and includes electronic and digital records.",
          "(The section continues with further defined terms used throughout the Adhiniyam.)",
        ]),
      ]),
    ],
  },
  {
    id: "b-m16",
    categories: ALL_CATS,
    title: "The Uttar Pradesh Municipalities Act, 1916",
    author: "Bare Act — Government of Uttar Pradesh",
    state: "Uttar Pradesh",
    subject: "Municipal Administration",
    edition: "As amended by U.P. Acts 5 and 6 of 2023",
    effectiveDate: "Consolidated through 2023",
    chapters: [
      chap("c1", "Chapter I — Preliminary", [
        sec("s1", "1. Short title, extent and commencement", [
          "An Act to consolidate and amend the law relating to Municipalities in Uttar Pradesh. Whereas it is expedient to consolidate and amend the law relating to Municipalities in Uttar Pradesh, it is hereby enacted as follows:",
          "(1) This Act may be called the Uttar Pradesh Municipalities Act, 1916.",
          "(2) It shall extend to the whole of Uttar Pradesh.",
          "(3) It shall come into force on the first day of July, 1916.",
        ]),
        sec("s2", "2. Definitions", [
          "In this Act, unless there is something repugnant in the subject or context: \u201cbuildings\u201d means a house, out-house, stable, shed, hut or other enclosure or structure whether of masonry, bricks, wood, mud, metal or any other material whatsoever, whether used as a human dwelling or otherwise, and includes any verandah, platform, plinth, staircase or door step.",
          "\u201cbye-law\u201d means a bye-law made in exercise of a power conferred by this Act; \u201cCompound\u201d means land, whether enclosed or not, which is the appurtenance of a building or the common appurtenance of several buildings.",
          "(The section continues with further defined terms used throughout the Act.)",
        ]),
      ]),
    ],
  },
  {
    id: "b-mc1959",
    categories: ALL_CATS,
    title: "The Uttar Pradesh Municipal Corporation Act, 1959",
    author: "Bare Act — Government of Uttar Pradesh",
    state: "Uttar Pradesh",
    subject: "Municipal Corporations",
    edition: "As amended through 2004",
    effectiveDate: "Consolidated through 2004",
    chapters: [
      chap("c1", "Chapter I — Preliminary", [
        sec("s1", "1. Short title, extent and commencement", [
          "(1) This Act may be called the Uttar Pradesh Municipal Corporation Act, 1959.",
          "(2) It extends to the whole of the State of Uttar Pradesh.",
          "(3) This Chapter shall come into operation at once, and the remaining provisions of this Act shall, in relation to a City, come into operation from such day as the State Government may by notification in the Official Gazette appoint in that behalf, and different dates may be appointed for different provisions.",
        ]),
        sec("s2", "2. Definitions", [
          "In this Act, unless there be something repugnant in the subject or context: \u201cadvertisement\u201d means any word, letter, model, sign, placard, board, notice, device or representation, whether illuminated or not, employed wholly or in part for the purpose of advertisement, announcement or direction.",
          "\u201cappointed day\u201d, with reference to a City, means the day on which the due constitution of the Corporation for the City is notified in the Official Gazette.",
          "\u201cbuilding\u201d includes a house, out-house, stable, shed, hut and other enclosure or structure whether of masonry, bricks, wood, mud, metal or any other material whatever, and also includes verandahs, fixed platforms, plinths, door-steps and walls, but does not include a tent or other such portable temporary structure.",
          "(The section continues with further defined terms used throughout the Act.)",
        ]),
      ]),
    ],
  },
  {
    id: "b-revenue-code",
    categories: ALL_CATS,
    title: "The Uttar Pradesh Revenue Code, 2006",
    author: "Bare Act — Government of Uttar Pradesh",
    state: "Uttar Pradesh",
    subject: "Land Revenue",
    edition: "As amended",
    effectiveDate: "Consolidated through 2016",
    chapters: [
      chap("c1", "Chapter I — Preliminary", [
        sec("s1", "1. Short title, extent and commencement", [
          "(1) This Act may be called the Uttar Pradesh Revenue Code, 2006.",
          "(2) It extends to the whole of Uttar Pradesh.",
          "(3) It shall come into force on such date as the State Government may, by notification, appoint, and different dates may be appointed for different areas or for different provisions of this Code.",
        ]),
        sec("s2", "2. Applicability of the Code", [
          "The provisions of this Code, except Chapters VIII and IX, shall apply to the whole of Uttar Pradesh, and Chapters VIII and IX shall apply to the areas to which the enactments repealed by this Code were applicable immediately before their repeal.",
          "3. Extension of the Code to new areas — where, after the commencement of this Code, any area is added to the territory of Uttar Pradesh, the State Government may, by notification, extend the whole or any provision of this Code to such area.",
        ]),
      ]),
    ],
  },
  {
    id: "b-urban-planning",
    categories: ALL_CATS,
    title: "The Uttar Pradesh Urban Planning and Development Act, 1973",
    author: "Bare Act — Government of Uttar Pradesh",
    state: "Uttar Pradesh",
    subject: "Urban Planning and Development",
    edition: "As amended through 2023",
    effectiveDate: "Consolidated through 2023",
    chapters: [
      chap("c1", "Chapter I — Preliminary", [
        sec("s1", "1. Short title and extent", [
          "(1) This Act may be called the Uttar Pradesh Urban Planning and Development Act, 1973.",
          "(2) It extends to the whole of Uttar Pradesh, excluding Cantonment areas and lands owned, requisitioned or taken on lease by the Central Government for the purposes of defence.",
        ]),
        sec("s2", "2. Definitions", [
          "In this Act, unless the context otherwise requires: \u201camenity\u201d includes road, water supply, street-lighting, drainage, sewerage, development of public parks and open spaces, solid waste management and disposal, sewage treatment plant, and other public works, utilities and services.",
          "\u201cbuilding\u201d includes any structure or erection or part of a structure or erection intended to be used for residential, industrial, commercial or other purposes, whether in actual use or not.",
          "\u201cdevelopment\u201d, with its grammatical variations, means the carrying out of building, engineering, mining or other operations in, on, over or under land, or the making of any material change in any building or land, and includes re-development.",
          "(The section continues with further defined terms used throughout the Act.)",
        ]),
      ]),
    ],
  },
  {
    id: "b-rules-of-court",
    categories: ALL_CATS,
    title: "Rules of Court, 1952 — with Commentary",
    author: "Ravikant",
    state: "Uttar Pradesh (Allahabad High Court)",
    subject: "Civil Procedure — Rules of Court",
    edition: "Commentary edition",
    effectiveDate: "Updated through 2025",
    chapters: [
      chap("c1", "Chapter I — Preliminary", [
        sec("s1", "1. Introductory", [
          "The opening chapter sets the interpretive frame for the rules that follow, situating them within the wider guarantee of access to justice and explaining how the rules interact with the Court's inherent powers.",
        ]),
        sec("s2", "2. Right of appeal and judicial discipline", [
          "This section discusses how the rules structure the right of appeal, and surveys the commentary's treatment of judicial discipline as the principle that keeps subordinate courts bound by the pronouncements of superior courts within the same hierarchy.",
        ]),
      ]),
    ],
  },
];

const PLAN = {
  name: "Complete Annual",
  activation: "12 October 2025",
  expiry: "12 October 2026",
  daysLeft: 38,
};

/* ---------------------------------------------------------------------
   STORAGE HELPERS
--------------------------------------------------------------------- */
const STORE_KEY = "askreader:v1";
const emptyPersisted = { bookmarks: {}, notes: {}, lastRead: {}, recents: [] };

async function loadPersisted() {
  try {
    const res = await window.storage.get(STORE_KEY, false);
    if (res && res.value) return { ...emptyPersisted, ...JSON.parse(res.value) };
  } catch (e) {
    /* key not present yet */
  }
  return emptyPersisted;
}
async function savePersisted(data) {
  try {
    await window.storage.set(STORE_KEY, JSON.stringify(data), false);
  } catch (e) {
    console.error("Storage error", e);
  }
}

/* ---------------------------------------------------------------------
   SMALL UI PRIMITIVES
--------------------------------------------------------------------- */
function Pill({ children, tone = "neutral", style }) {
  const tones = {
    neutral: { bg: paperDeep, fg: textSecondary, bd: line },
    success: { bg: "#EAF2EC", fg: success, bd: "#C9DECB" },
    warn: { bg: "#F5E8DF", fg: warn, bd: "#E3C6AE" },
    brass: { bg: "#F3E9D8", fg: brassDeep, bd: "#DFC69B" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        fontFamily: sans,
        fontSize: 12,
        letterSpacing: 0.2,
        padding: "3px 9px",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function IconButton({ icon: Icon, onClick, active, title, size = 17 }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? paperDeep : "transparent",
        border: `1px solid ${active ? line : "transparent"}`,
        color: active ? ink : textSecondary,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = paperDeep; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Icon size={size} strokeWidth={1.75} />
    </button>
  );
}

/* ---------------------------------------------------------------------
   APP
--------------------------------------------------------------------- */
export default function ASKreader() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(emptyPersisted);

  const [view, setView] = useState("dashboard"); // dashboard | library | reader
  const [expanded, setExpanded] = useState({ cc: true });
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeBook, setActiveBook] = useState(null);
  const [activeSection, setActiveSection] = useState(null);

  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [fontScale, setFontScale] = useState(1);
  const [dark, setDark] = useState(false);
  const [tocOpen, setTocOpen] = useState(true);
  const [noteDraft, setNoteDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadPersisted().then((d) => { setData(d); setReady(true); });
  }, []);

  const persist = useCallback((updater) => {
    setData((prev) => {
      const next = updater(prev);
      savePersisted(next);
      return next;
    });
  }, []);

  const bookById = useCallback((id) => BOOKS.find((b) => b.id === id), []);

  function openBook(book, sectionId) {
    const last = data.lastRead[book.id];
    const targetSection = sectionId || last?.sectionId || book.chapters[0].sections[0].id;
    setActiveBook(book);
    setActiveSection(targetSection);
    setView("reader");
    persist((prev) => {
      const recents = [book.id, ...prev.recents.filter((id) => id !== book.id)].slice(0, 6);
      return { ...prev, recents };
    });
  }

  function recordLastRead(bookId, chapterId, sectionId) {
    persist((prev) => ({
      ...prev,
      lastRead: { ...prev.lastRead, [bookId]: { chapterId, sectionId, at: Date.now() } },
    }));
  }

  function toggleBookmark(bookId, sectionId) {
    persist((prev) => {
      const key = `${bookId}::${sectionId}`;
      const next = { ...prev.bookmarks };
      if (next[key]) delete next[key];
      else next[key] = { bookId, sectionId, at: Date.now() };
      return { ...prev, bookmarks: next };
    });
  }

  function saveNote(bookId, sectionId, text) {
    persist((prev) => {
      const key = `${bookId}::${sectionId}`;
      const next = { ...prev.notes };
      if (!text.trim()) delete next[key];
      else next[key] = { bookId, sectionId, text, at: Date.now() };
      return { ...prev, notes: next };
    });
  }

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const results = [];
    BOOKS.forEach((book) => {
      book.chapters.forEach((c) => {
        c.sections.forEach((s) => {
          const hay = (s.title + " " + s.paras.join(" ")).toLowerCase();
          if (hay.includes(q)) {
            const idx = hay.indexOf(q);
            const excerpt = (s.paras.join(" ")).slice(Math.max(0, idx - 40), idx + 80);
            results.push({ book, chapter: c, section: s, excerpt });
          }
        });
      });
    });
    return results.slice(0, 20);
  }, [query]);

  if (!ready) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, color: textSecondary, background: paper }}>
        Loading library…
      </div>
    );
  }

  const bg = dark ? "#15181F" : paper;
  const fg = dark ? "#E7E5DD" : textPrimary;

  return (
    <div style={{ height: "100vh", width: "100%", display: "flex", flexDirection: "column", background: bg, fontFamily: sans, color: fg }}>
      <TopBar
        query={query}
        setQuery={setQuery}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        goHome={() => { setView("dashboard"); setSearchOpen(false); setQuery(""); }}
        onMenu={() => setSidebarOpen((v) => !v)}
        dark={dark}
      />

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {searchOpen && query.trim() ? (
          <SearchResults
            results={searchResults}
            query={query}
            onOpen={(book, sectionId) => { setSearchOpen(false); setQuery(""); openBook(book, sectionId); }}
            dark={dark}
          />
        ) : (
          <>
            {sidebarOpen && (
              <Sidebar
                expanded={expanded}
                setExpanded={setExpanded}
                view={view}
                activeCategory={activeCategory}
                onSelectCategory={(id) => { setActiveCategory(id); setView("library"); }}
                onNav={(v) => setView(v)}
                dark={dark}
              />
            )}

            <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
              {view === "dashboard" && (
                <Dashboard
                  data={data}
                  bookById={bookById}
                  onOpenBook={openBook}
                  onBrowse={(id) => { setActiveCategory(id); setView("library"); }}
                  dark={dark}
                />
              )}
              {view === "library" && (
                <Library
                  categoryId={activeCategory}
                  onOpenBook={openBook}
                  dark={dark}
                />
              )}
              {view === "mybookmarks" && (
                <BookmarksView data={data} bookById={bookById} onOpenBook={openBook} dark={dark} />
              )}
              {view === "account" && <AccountView dark={dark} />}
              {view === "reader" && activeBook && (
                <Reader
                  book={activeBook}
                  sectionId={activeSection}
                  setSectionId={(chId, secId) => { setActiveSection(secId); recordLastRead(activeBook.id, chId, secId); }}
                  onBack={() => setView("dashboard")}
                  fontScale={fontScale}
                  setFontScale={setFontScale}
                  dark={dark}
                  setDark={setDark}
                  tocOpen={tocOpen}
                  setTocOpen={setTocOpen}
                  bookmarks={data.bookmarks}
                  toggleBookmark={toggleBookmark}
                  notes={data.notes}
                  saveNote={saveNote}
                  noteDraft={noteDraft}
                  setNoteDraft={setNoteDraft}
                />
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   TOP BAR
--------------------------------------------------------------------- */
function TopBar({ query, setQuery, searchOpen, setSearchOpen, goHome, onMenu, dark }) {
  const border = dark ? "#2A2E37" : line;
  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 16px",
        borderBottom: `1px solid ${border}`,
        background: dark ? "#181B22" : white,
      }}
    >
      <button onClick={onMenu} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary, display: "flex" }}>
        <Menu size={19} strokeWidth={1.75} />
      </button>
      <button onClick={goHome} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 22, height: 22, background: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: brass, fontFamily: serif, fontSize: 13, fontWeight: 600 }}>A</span>
        </div>
        <span style={{ fontFamily: serif, fontSize: 18, letterSpacing: 0.2, color: dark ? "#EDEBE2" : ink }}>ASKreader</span>
      </button>

      <div style={{ flex: 1, maxWidth: 460, position: "relative", marginLeft: 12 }}>
        <Search size={15} strokeWidth={1.75} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: textSecondary }} />
        <input
          value={query}
          onFocus={() => setSearchOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
          placeholder="Search the library you're authorised to read…"
          style={{
            width: "100%",
            height: 34,
            paddingLeft: 32,
            paddingRight: query ? 32 : 10,
            border: `1px solid ${border}`,
            background: dark ? "#20242D" : paperDeep,
            color: dark ? "#E7E5DD" : textPrimary,
            fontFamily: sans,
            fontSize: 13.5,
            outline: "none",
          }}
        />
        {query && (
          <button onClick={() => { setQuery(""); setSearchOpen(false); }} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: textSecondary }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <Pill tone="success" style={{ display: window.innerWidth < 640 ? "none" : "inline-flex" }}>
          <ShieldCheck size={12} strokeWidth={2} /> Active · {PLAN.daysLeft} days left
        </Pill>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: inkSoft, color: white, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontSize: 12.5 }}>
          RS
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------------
   SIDEBAR
--------------------------------------------------------------------- */
function NavRow({ icon: Icon, label, onClick, active, dark }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        background: active ? (dark ? "#232833" : paperDeep) : "transparent",
        border: "none",
        borderLeft: `2px solid ${active ? brass : "transparent"}`,
        color: active ? (dark ? "#F2F0E7" : ink) : textSecondary,
        cursor: "pointer",
        fontFamily: sans,
        fontSize: 13.5,
        textAlign: "left",
      }}
    >
      <Icon size={16} strokeWidth={1.75} />
      {label}
    </button>
  );
}

function Sidebar({ expanded, setExpanded, view, activeCategory, onSelectCategory, onNav, dark }) {
  const border = dark ? "#2A2E37" : line;
  return (
    <aside style={{ width: 252, flexShrink: 0, borderRight: `1px solid ${border}`, overflowY: "auto", background: dark ? "#181B22" : white, paddingBottom: 20 }}>
      <div style={{ padding: "14px 14px 6px" }}>
        <NavRow icon={Home} label="Dashboard" active={view === "dashboard"} onClick={() => onNav("dashboard")} dark={dark} />
        <NavRow icon={Bookmark} label="Bookmarks and notes" active={view === "mybookmarks"} onClick={() => onNav("mybookmarks")} dark={dark} />
        <NavRow icon={User} label="Subscription and account" active={view === "account"} onClick={() => onNav("account")} dark={dark} />
      </div>

      <div style={{ padding: "10px 14px 4px", fontFamily: sans, fontSize: 11, letterSpacing: 0.4, color: textSecondary, borderTop: `1px solid ${border}`, marginTop: 6 }}>
        LIBRARY
      </div>

      {CATEGORY_META.map((cat) => {
        const isOpen = !!expanded[cat.id];
        const books = BOOKS.filter((b) => b.categories.includes(cat.id));
        return (
          <div key={cat.id}>
            <button
              onClick={() => setExpanded((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: sans,
                fontSize: 13.5,
                color: dark ? "#EDEBE2" : ink,
                textAlign: "left",
              }}
            >
              {isOpen ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
              <span style={{ flex: 1 }}>{cat.label}</span>
            </button>
            {isOpen && (
              <div style={{ paddingBottom: 4 }}>
                <button
                  onClick={() => onSelectCategory(cat.id)}
                  style={{
                    width: "calc(100% - 36px)",
                    marginLeft: 36,
                    textAlign: "left",
                    background: activeCategory === cat.id && view === "library" ? (dark ? "#232833" : paperDeep) : "transparent",
                    border: "none",
                    color: dark ? "#B9B6AB" : brassDeep,
                    fontFamily: sans,
                    fontSize: 12.5,
                    padding: "5px 8px",
                    cursor: "pointer",
                  }}
                >
                  View all ({books.length})
                </button>
                {books.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onSelectCategory(cat.id)}
                    style={{
                      width: "calc(100% - 36px)",
                      marginLeft: 36,
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      color: textSecondary,
                      fontFamily: sans,
                      fontSize: 12.5,
                      padding: "5px 8px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={b.title}
                  >
                    {b.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

/* ---------------------------------------------------------------------
   DASHBOARD
--------------------------------------------------------------------- */
function Dashboard({ data, bookById, onOpenBook, onBrowse, dark }) {
  const border = dark ? "#2A2E37" : line;
  const recents = data.recents.map(bookById).filter(Boolean);

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "36px 28px 60px" }}>
      <p style={{ fontFamily: sans, fontSize: 12, letterSpacing: 0.4, color: textSecondary, margin: 0 }}>
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>
      <h1 style={{ fontFamily: serif, fontSize: 30, fontWeight: 500, margin: "6px 0 4px", color: dark ? "#F2F0E7" : ink }}>
        Welcome back
      </h1>
      <p style={{ fontFamily: sans, fontSize: 14, color: textSecondary, margin: "0 0 28px", maxWidth: 560 }}>
        Your Complete Annual plan covers all four collections. Pick up where you left off, or browse the library from the panel on the left.
      </p>

      <div style={{ border: `1px solid ${border}`, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, background: dark ? "#1D212A" : white }}>
        <div>
          <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginBottom: 3 }}>Subscription</div>
          <div style={{ fontFamily: serif, fontSize: 16, color: dark ? "#F2F0E7" : ink }}>{PLAN.name} · expires {PLAN.expiry}</div>
        </div>
        <Pill tone={PLAN.daysLeft <= 45 ? "warn" : "success"}>
          {PLAN.daysLeft <= 45 ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
          {PLAN.daysLeft} days remaining
        </Pill>
      </div>

      {recents.length > 0 && (
        <>
          <SectionLabel>Continue reading</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
            {recents.map((b) => {
              const last = data.lastRead[b.id];
              return (
                <button
                  key={b.id}
                  onClick={() => onOpenBook(b)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 4px",
                    borderBottom: `1px solid ${border}`,
                    background: "transparent",
                    border: "none",
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    borderBottomColor: border,
                    cursor: "pointer",
                    textAlign: "left",
                    width: "100%",
                  }}
                >
                  <Clock size={15} strokeWidth={1.75} color={textSecondary} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: serif, fontSize: 15, color: dark ? "#EDEBE2" : textPrimary }}>{b.title}</div>
                    <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary }}>
                      {b.state} · {last ? "resume where you left off" : "start reading"}
                    </div>
                  </div>
                  <ChevronRight size={16} color={textSecondary} />
                </button>
              );
            })}
          </div>
        </>
      )}

      <SectionLabel>Browse the library</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {CATEGORY_META.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onBrowse(cat.id)}
            style={{
              textAlign: "left",
              border: `1px solid ${border}`,
              background: dark ? "#1D212A" : white,
              padding: "16px 16px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontFamily: serif, fontSize: 15.5, color: dark ? "#F2F0E7" : ink, marginBottom: 6 }}>{cat.label}</div>
            <div style={{ fontFamily: sans, fontSize: 12.5, color: textSecondary, lineHeight: 1.5 }}>{cat.short}</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: brassDeep, marginTop: 10 }}>
              {BOOKS.filter((b) => b.categories.includes(cat.id)).length} titles →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: sans, fontSize: 12, letterSpacing: 0.3, color: textSecondary, marginBottom: 10, marginTop: 4 }}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------
   LIBRARY
--------------------------------------------------------------------- */
function Library({ categoryId, onOpenBook, dark }) {
  const cat = CATEGORY_META.find((c) => c.id === categoryId) || CATEGORY_META[0];
  const books = BOOKS.filter((b) => b.categories.includes(cat.id));
  const border = dark ? "#2A2E37" : line;

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "36px 28px 60px" }}>
      <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, margin: "0 0 4px", color: dark ? "#F2F0E7" : ink }}>{cat.label}</h1>
      <p style={{ fontFamily: sans, fontSize: 13.5, color: textSecondary, margin: "0 0 26px" }}>{cat.short} · {books.length} titles</p>

      <div>
        {books.map((b) => (
          <button
            key={b.id}
            onClick={() => onOpenBook(b)}
            style={{
              display: "flex",
              width: "100%",
              gap: 16,
              alignItems: "flex-start",
              padding: "18px 4px",
              borderBottom: `1px solid ${border}`,
              background: "transparent",
              border: "none",
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: border,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <div style={{ width: 46, height: 62, flexShrink: 0, background: ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: brass, fontFamily: serif, fontSize: 20 }}>{b.title[0]}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: serif, fontSize: 16.5, color: dark ? "#F2F0E7" : textPrimary, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontFamily: sans, fontSize: 12.5, color: textSecondary, marginBottom: 8 }}>
                {b.author} · {b.edition} · {b.state}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Pill>{b.subject}</Pill>
                <Pill tone="brass">{b.effectiveDate}</Pill>
              </div>
            </div>
            <ChevronRight size={18} color={textSecondary} style={{ marginTop: 20 }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   SEARCH RESULTS
--------------------------------------------------------------------- */
function SearchResults({ results, query, onOpen, dark }) {
  const border = dark ? "#2A2E37" : line;
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "30px 28px" }}>
        <p style={{ fontFamily: sans, fontSize: 13, color: textSecondary, marginBottom: 20 }}>
          {results.length} result{results.length !== 1 ? "s" : ""} across your authorised library for "{query}"
        </p>
        {results.length === 0 && (
          <p style={{ fontFamily: sans, fontSize: 13.5, color: textSecondary }}>
            No matches in content you're entitled to read. Try a different term.
          </p>
        )}
        {results.map((r, i) => (
          <button
            key={i}
            onClick={() => onOpen(r.book, r.section.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${border}`,
              padding: "14px 2px",
              cursor: "pointer",
            }}
          >
            <div style={{ fontFamily: serif, fontSize: 15, color: dark ? "#EDEBE2" : textPrimary }}>{r.section.title}</div>
            <div style={{ fontFamily: sans, fontSize: 12, color: brassDeep, margin: "3px 0 6px" }}>
              {r.book.title} · {r.chapter.title}
            </div>
            <div style={{ fontFamily: sans, fontSize: 13, color: textSecondary, lineHeight: 1.5 }}>…{r.excerpt}…</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   READER
--------------------------------------------------------------------- */
function Reader({
  book, sectionId, setSectionId, onBack, fontScale, setFontScale,
  dark, setDark, tocOpen, setTocOpen, bookmarks, toggleBookmark, notes, saveNote,
  noteDraft, setNoteDraft,
}) {
  const border = dark ? "#2A2E37" : line;
  let currentChapter = book.chapters[0];
  let currentSection = book.chapters[0].sections[0];
  book.chapters.forEach((c) => c.sections.forEach((s) => { if (s.id === sectionId) { currentChapter = c; currentSection = s; } }));

  const key = `${book.id}::${currentSection.id}`;
  const isBookmarked = !!bookmarks[key];
  const noteText = notes[key]?.text || "";
  const [localNote, setLocalNote] = useState(noteText);
  const noteRef = useRef(null);

  useEffect(() => { setLocalNote(noteText); }, [sectionId]);

  // flatten section order for prev/next
  const flat = [];
  book.chapters.forEach((c) => c.sections.forEach((s) => flat.push({ c, s })));
  const idx = flat.findIndex((f) => f.s.id === currentSection.id);
  const prevItem = flat[idx - 1];
  const nextItem = flat[idx + 1];

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {tocOpen && (
        <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${border}`, overflowY: "auto", background: dark ? "#181B22" : white }}>
          <div style={{ padding: "14px 16px 10px" }}>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: textSecondary, cursor: "pointer", fontFamily: sans, fontSize: 12.5, padding: 0, marginBottom: 14 }}>
              <ArrowLeft size={14} /> Back to library
            </button>
            <div style={{ fontFamily: serif, fontSize: 14.5, color: dark ? "#F2F0E7" : ink, lineHeight: 1.3 }}>{book.title}</div>
            <div style={{ fontFamily: sans, fontSize: 11.5, color: textSecondary, marginTop: 3 }}>{book.effectiveDate}</div>
          </div>
          {book.chapters.map((c) => (
            <div key={c.id} style={{ marginBottom: 4 }}>
              <div style={{ fontFamily: sans, fontSize: 11.5, letterSpacing: 0.3, color: textSecondary, padding: "8px 16px 4px" }}>{c.title}</div>
              {c.sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSectionId(c.id, s.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: s.id === currentSection.id ? (dark ? "#232833" : paperDeep) : "transparent",
                    border: "none",
                    borderLeft: `2px solid ${s.id === currentSection.id ? brass : "transparent"}`,
                    color: s.id === currentSection.id ? (dark ? "#F2F0E7" : ink) : textSecondary,
                    fontFamily: sans,
                    fontSize: 12.5,
                    padding: "7px 16px",
                    cursor: "pointer",
                  }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ height: 46, flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "0 12px", borderBottom: `1px solid ${border}`, background: dark ? "#181B22" : white }}>
          <IconButton icon={ListTree} onClick={() => setTocOpen((v) => !v)} active={tocOpen} title="Table of contents" />
          <div style={{ width: 1, height: 20, background: border, margin: "0 6px" }} />
          <IconButton icon={ZoomOut} onClick={() => setFontScale((v) => Math.max(0.85, v - 0.1))} title="Smaller text" />
          <IconButton icon={ZoomIn} onClick={() => setFontScale((v) => Math.min(1.5, v + 0.1))} title="Larger text" />
          <IconButton icon={dark ? SunMedium : Moon} onClick={() => setDark((v) => !v)} title="Toggle theme" />
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <IconButton icon={isBookmarked ? BookmarkCheck : Bookmark} onClick={() => toggleBookmark(book.id, currentSection.id)} active={isBookmarked} title="Bookmark this section" />
            <IconButton icon={StickyNote} onClick={() => noteRef.current?.focus()} active={!!noteText} title="Add a note" />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 28px 30px" }}>
            <div style={{ fontFamily: sans, fontSize: 11.5, color: brassDeep, letterSpacing: 0.3, marginBottom: 8 }}>
              {currentChapter.title.toUpperCase()}
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 24 * fontScale, fontWeight: 500, color: dark ? "#F2F0E7" : textPrimary, margin: "0 0 20px", lineHeight: 1.3 }}>
              {currentSection.title}
            </h2>
            {currentSection.paras.map((p, i) => (
              <p key={i} style={{ fontFamily: serif, fontSize: 16.5 * fontScale, lineHeight: 1.75, color: dark ? "#D9D6CB" : textPrimary, margin: "0 0 18px", maxWidth: "70ch" }}>
                {p}
              </p>
            ))}

            <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <StickyNote size={14} color={textSecondary} />
                <span style={{ fontFamily: sans, fontSize: 12, color: textSecondary }}>Your note on this section</span>
              </div>
              <textarea
                ref={noteRef}
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                onBlur={() => saveNote(book.id, currentSection.id, localNote)}
                placeholder="Add a private note — saved automatically when you click away"
                style={{
                  width: "100%",
                  minHeight: 64,
                  fontFamily: sans,
                  fontSize: 13,
                  color: dark ? "#E7E5DD" : textPrimary,
                  background: dark ? "#1D212A" : paperDeep,
                  border: `1px solid ${border}`,
                  padding: 10,
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 34, paddingTop: 18, borderTop: `1px solid ${border}` }}>
              {prevItem ? (
                <button onClick={() => setSectionId(prevItem.c.id, prevItem.s.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: textSecondary, cursor: "pointer", fontFamily: sans, fontSize: 12.5 }}>
                  <ChevronLeft size={14} /> {prevItem.s.title}
                </button>
              ) : <span />}
              {nextItem ? (
                <button onClick={() => setSectionId(nextItem.c.id, nextItem.s.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: brassDeep, cursor: "pointer", fontFamily: sans, fontSize: 12.5 }}>
                  {nextItem.s.title} <ChevronRight size={14} />
                </button>
              ) : <span />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   BOOKMARKS VIEW
--------------------------------------------------------------------- */
function BookmarksView({ data, bookById, onOpenBook, dark }) {
  const border = dark ? "#2A2E37" : line;
  const bookmarkList = Object.values(data.bookmarks).sort((a, b) => b.at - a.at);
  const noteList = Object.values(data.notes).sort((a, b) => b.at - a.at);

  function findSection(bookId, sectionId) {
    const book = bookById(bookId);
    if (!book) return null;
    for (const c of book.chapters) {
      const s = c.sections.find((s) => s.id === sectionId);
      if (s) return { book, chapter: c, section: s };
    }
    return null;
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 28px 60px" }}>
      <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, margin: "0 0 26px", color: dark ? "#F2F0E7" : ink }}>Bookmarks and notes</h1>

      <SectionLabel>Bookmarked sections ({bookmarkList.length})</SectionLabel>
      {bookmarkList.length === 0 && <EmptyHint dark={dark}>Sections you bookmark while reading will appear here.</EmptyHint>}
      <div style={{ marginBottom: 30 }}>
        {bookmarkList.map((bm) => {
          const found = findSection(bm.bookId, bm.sectionId);
          if (!found) return null;
          return (
            <button key={`${bm.bookId}-${bm.sectionId}`} onClick={() => onOpenBook(found.book, bm.sectionId)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: `1px solid ${border}`, padding: "12px 2px", cursor: "pointer" }}>
              <div style={{ fontFamily: serif, fontSize: 14.5, color: dark ? "#EDEBE2" : textPrimary }}>{found.section.title}</div>
              <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, marginTop: 2 }}>{found.book.title} · {found.chapter.title}</div>
            </button>
          );
        })}
      </div>

      <SectionLabel>Notes ({noteList.length})</SectionLabel>
      {noteList.length === 0 && <EmptyHint dark={dark}>Notes you write while reading will appear here.</EmptyHint>}
      <div>
        {noteList.map((n) => {
          const found = findSection(n.bookId, n.sectionId);
          if (!found) return null;
          return (
            <button key={`${n.bookId}-${n.sectionId}`} onClick={() => onOpenBook(found.book, n.sectionId)}
              style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderBottom: `1px solid ${border}`, padding: "12px 2px", cursor: "pointer" }}>
              <div style={{ fontFamily: serif, fontSize: 14.5, color: dark ? "#EDEBE2" : textPrimary }}>{found.section.title}</div>
              <div style={{ fontFamily: sans, fontSize: 12, color: textSecondary, margin: "2px 0 6px" }}>{found.book.title} · {found.chapter.title}</div>
              <div style={{ fontFamily: sans, fontSize: 13, color: textSecondary, background: dark ? "#1D212A" : paperDeep, padding: "8px 10px" }}>{n.text}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyHint({ children, dark }) {
  return (
    <p style={{ fontFamily: sans, fontSize: 13, color: textSecondary, padding: "10px 0 24px", fontStyle: "italic" }}>
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------------
   ACCOUNT VIEW
--------------------------------------------------------------------- */
function AccountView({ dark }) {
  const border = dark ? "#2A2E37" : line;
  const rows = [
    ["Plan", PLAN.name],
    ["Activated", PLAN.activation],
    ["Expires", PLAN.expiry],
    ["Included collections", "Central Commentaries, State Commentaries, State Bare Acts, Central Bare Acts with State Amendments"],
    ["Devices", "2 of 3 used"],
    ["Renewal", "Manual — you'll be notified at 30, 15, 7, and 1 day before expiry"],
  ];
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "36px 28px 60px" }}>
      <h1 style={{ fontFamily: serif, fontSize: 26, fontWeight: 500, margin: "0 0 22px", color: dark ? "#F2F0E7" : ink }}>Subscription and account</h1>
      <div style={{ border: `1px solid ${border}` }}>
        {rows.map(([label, value], i) => (
          <div key={i} style={{ display: "flex", padding: "13px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${border}` : "none" }}>
            <div style={{ width: 190, flexShrink: 0, fontFamily: sans, fontSize: 12.5, color: textSecondary }}>{label}</div>
            <div style={{ fontFamily: sans, fontSize: 13.5, color: dark ? "#EDEBE2" : textPrimary }}>{value}</div>
          </div>
        ))}
      </div>
      <button style={{ marginTop: 18, background: ink, color: white, border: "none", padding: "10px 20px", fontFamily: sans, fontSize: 13.5, cursor: "pointer" }}>
        Renew subscription
      </button>
    </div>
  );
}
