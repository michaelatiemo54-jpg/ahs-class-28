/* ============================================================
   AHS Class of ’28 — script.js (Deluxe)
   Pages supported:
     - Home (index.html): live date/time, global countdown, starfield,
                          Happening Now + Next Up from /data
     - Fundraisers (fundraisers.html): filters, search, sort, live badges,
                          per-card countdowns, URL state, accessibility
   No external libraries. All vanilla JS.
   ============================================================ */

/* ========================= CONFIG ========================= */
const CONFIG = {
  TIMEZONE: undefined,                 // undefined = browser TZ; or set "America/New_York"
  END_OF_SCHOOL_DATE: "2026-06-15",    // YYYY-MM-DD (end-of-day)
  STARFIELD_ON: true,                  // set false to disable background stars
  PATHS: {
    fundraisers: "data/fundraisers.json",
    events: "data/events.json",
  },
  HOME: {
    showWelcomeToastOnce: true
  },
  FUNDRAISERS: {
    liveWindowMs: 1000 * 30,           // refresh live statuses every 30s
    defaultTab: "all",
    defaultSort: "soonest"
  }
};

/* ========================= UTILITIES ========================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function parseISO(v) {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y,m,d] = v.split("-").map(Number);
    return new Date(y, m-1, d);
  }
  const dt = new Date(v);
  return isNaN(dt) ? null : dt;
}
function fmtDate(d) {
  return d.toLocaleDateString(CONFIG.TIMEZONE, { weekday:"short", month:"short", day:"numeric" });
}
function fmtTime(d) {
  return d.toLocaleTimeString(CONFIG.TIMEZONE, { hour:"numeric", minute:"2-digit" });
}
function fmtRange(start, end) {
  if (!start) return "";
  if (!end) end = start;
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${fmtDate(start)} • ${fmtTime(start)}–${fmtTime(end)}`;
  }
  return `${fmtDate(start)} ${fmtTime(start)} → ${fmtDate(end)} ${fmtTime(end)}`;
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------------------- Query String State ---------------------- */
function getQS() {
  const u = new URL(location.href);
  return {
    tab: u.searchParams.get("tab"),
    q: u.searchParams.get("q"),
    sort: u.searchParams.get("sort"),
  };
}
function setQS(state = {}) {
  const u = new URL(location.href);
  if (state.tab !== undefined)  state.tab ? u.searchParams.set("tab", state.tab) : u.searchParams.delete("tab");
  if (state.q !== undefined)    state.q ? u.searchParams.set("q", state.q) : u.searchParams.delete("q");
  if (state.sort !== undefined) state.sort ? u.searchParams.set("sort", state.sort) : u.searchParams.delete("sort");
  history.replaceState(null, "", u.toString());
}

/* ---------------------------- Fetch JSON ---------------------------- */
async function fetchJSON(path) {
  const res = await fetch(`${path}?v=${Date.now().toString().slice(0,10)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${path}`);
  return res.json();
}

/* ========================= GLOBAL UI BITS ========================= */
/* Toasts */
const toastEl = $("#toast");
let toastTimer;
function showToast(msg, type="info", ms=3000) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = `toast ${type}`;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> toastEl.classList.add("hidden"), ms);
}

/* Mobile menu toggle */
const menuBtn = $("#menuBtn");
const mobileMenu = $("#mobileMenu");
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener("click", () => {
    const expanded = menuBtn.getAttribute("aria-expanded") === "true";
    menuBtn.setAttribute("aria-expanded", String(!expanded));
    mobileMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!mobileMenu.classList.contains("hidden") &&
        !mobileMenu.contains(e.target) &&
        e.target !== menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
      mobileMenu.classList.add("hidden");
    }
  });
}

/* Smooth scroll for same-page anchors */
$$('a[href^="#"]').forEach(a=>{
  a.addEventListener("click", e=>{
    const target = $(a.getAttribute("href"));
    if (target) { e.preventDefault(); target.scrollIntoView({behavior:"smooth"}); }
  });
});

/* Entry animation */
window.addEventListener("DOMContentLoaded", ()=>{
  $$(".hover-up").forEach(card=>{
    card.style.opacity = 0; card.style.transform = "translateY(20px)";
    setTimeout(()=>{ card.style.transition="all .5s ease"; card.style.opacity=1; card.style.transform="translateY(0)"; }, 150);
  });
});

/* ========================= HOME PAGE LOGIC ========================= */
(function homeController(){
  const onHome = !!document.body && !!$(".hero") && !!$("#date") && !!$("#time");
  if (!onHome) return;

  // Live date/time
  const dateEl = $("#date"), timeEl = $("#time");
  function updateDateTime(){
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString(CONFIG.TIMEZONE, { weekday:"long", year:"numeric", month:"long", day:"numeric" });
    timeEl.textContent = now.toLocaleTimeString(CONFIG.TIMEZONE, { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  }
  setInterval(updateDateTime, 1000); updateDateTime();

  // Global countdown
  const cd = { d: $("#cd-days"), h: $("#cd-hrs"), m: $("#cd-min"), s: $("#cd-sec") };
  function tickCountdown(){
    const end = parseISO(CONFIG.END_OF_SCHOOL_DATE);
    if (!end) return;
    end.setHours(23,59,59,999);
    const diff = end - new Date();
    const total = Math.max(0, Math.floor(diff / 1000));
    const days = Math.floor(total / 86400);
    const hrs = Math.floor((total % 86400) / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    cd.d.textContent = String(days);
    cd.h.textContent = String(hrs).padStart(2,"0");
    cd.m.textContent = String(mins).padStart(2,"0");
    cd.s.textContent = String(secs).padStart(2,"0");
  }
  setInterval(tickCountdown, 1000); tickCountdown();

  // Welcome toast (once per session)
  if (CONFIG.HOME.showWelcomeToastOnce && !sessionStorage.getItem("welcomed")) {
    showToast("Welcome to the Class of ’28 site!", "info", 3200);
    sessionStorage.setItem("welcomed","1");
  }

  // Starfield (optional, motion-aware)
  if (CONFIG.STARFIELD_ON && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { position:"fixed", inset:"0", zIndex:"-1", pointerEvents:"none" });
    document.body.prepend(canvas);
    const ctx = canvas.getContext("2d");
    let w,h,stars;
    function resize(){
      w = canvas.width = innerWidth;
      h = canvas.height = innerHeight;
      const count = Math.min(220, Math.floor((w*h)/12000));
      stars = Array.from({length:count}, ()=>({
        x: Math.random()*w, y: Math.random()*h,
        r: Math.random()*1.3 + .3, a: Math.random()*1, v: Math.random()*.15 + .05
      }));
    }
    resize(); addEventListener("resize", resize);
    (function tick(){
      ctx.clearRect(0,0,w,h);
      for (const s of stars) {
        s.y += s.v; s.a += 0.02; if (s.y > h+2) { s.y=-2; s.x=Math.random()*w; }
        const flicker = 0.6 + Math.sin(s.a)*0.4;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fillStyle = `rgba(170,200,255,${0.35*flicker})`; ctx.fill();
      }
      requestAnimationFrame(tick);
    })();
  }

  // Home data hydrate: Happening Now + Next Up + next event
  const nowList = $("#nowList");
  const nextContainer = $("#nextContainer");
  (async function hydrateHome(){
    try {
      const [fundraisers, events] = await Promise.all([
        fetchJSON(CONFIG.PATHS.fundraisers),
        fetchJSON(CONFIG.PATHS.events)
      ]);

      const now = new Date();

      // Fundraisers: live + next upcoming
      if (Array.isArray(fundraisers)) {
        const enriched = fundraisers.map(f=>{
          const start = parseISO(f.start);
          const end   = parseISO(f.end) || start;
          return {...f, start, end};
        }).filter(x=>x.start);

        const live = enriched.filter(x=> x.start <= now && now <= x.end);
        const upcoming = enriched.filter(x=> x.start > now).sort((a,b)=> a.start - b.start);

        if (nowList) {
          nowList.innerHTML = "";
          if (!live.length) {
            nowList.innerHTML = `<div class="small" style="color:var(--muted)">Nothing is live this minute. Check “Next Up”.</div>`;
          } else {
            for (const f of live.slice(0,3)) {
              const card = document.createElement("div");
              card.className = "card-item";
              card.innerHTML = `
                <div class="row">
                  <div class="title">${escapeHTML(f.title || "Fundraiser")}</div>
                  <span class="status now">LIVE NOW • ${fmtTime(f.start)}–${fmtTime(f.end)}</span>
                </div>
                <div class="meta">
                  ${escapeHTML(f.location || "Location TBA")}
                  ${f.notes ? " • " + escapeHTML(f.notes) : ""}
                </div>`;
              nowList.appendChild(card);
            }
          }
        }

        if (nextContainer) {
          nextContainer.innerHTML = "";
          if (!upcoming.length) {
            nextContainer.innerHTML = `<div class="small" style="color:var(--muted)">No upcoming fundraisers yet. Add one in <code>data/fundraisers.json</code>.</div>`;
          } else {
            const f = upcoming[0];
            const card = document.createElement("div");
            card.className = "card-item";
            card.innerHTML = `
              <div class="row">
                <div class="title">${escapeHTML(f.title || "Fundraiser")}</div>
                <span class="status upcoming">${fmtDate(f.start)}</span>
              </div>
              <div class="meta">
                ${fmtRange(f.start, f.end)}
                • ${escapeHTML(f.location || "Location TBA")}
                ${f.notes ? " • " + escapeHTML(f.notes) : ""}
              </div>`;
            nextContainer.appendChild(card);
          }
        }
      }

      // Next school event (date-only list)
      if (Array.isArray(events) && nextContainer) {
        const today = new Date(); today.setHours(0,0,0,0);
        const upcomingEv = events
          .map(e => ({...e, _d: parseISO(e.date)}))
          .filter(e => e._d && e._d >= today)
          .sort((a,b)=> a._d - b._d);
        const hint = document.createElement("div");
        hint.className = "small"; hint.style.marginTop = "8px"; hint.style.color = "var(--muted)";
        hint.innerHTML = upcomingEv.length
          ? `Next school event: <strong>${escapeHTML(upcomingEv[0].title)}</strong> • ${fmtDate(upcomingEv[0]._d)}`
          : `No upcoming events listed. Update <code>data/events.json</code>.`;
        nextContainer.parentElement.appendChild(hint);
      }
    } catch (e) {
      console.warn(e);
      showToast("Couldn’t load latest data yet.", "warn", 3200);
    }
  })();
})();

/* ====================== FUNDRAISERS PAGE LOGIC ====================== */
(function fundraisersController(){
  const list = $("#fundraiserList");
  if (!list) return; // not on fundraisers page

  const emptyState = $("#emptyState");
  const filterBtns = $$("[data-filter]");
  const searchInput = $("#searchInput");
  const sortSelect = $("#sortSelect");

  let raw = [];          // original items from JSON
  let enriched = [];     // with Date objects
  let activeTab = CONFIG.FUNDRAISERS.defaultTab;
  let query = "";
  let sortBy = CONFIG.FUNDRAISERS.defaultSort;

  function announce(msg){
    // Announce updates for screen readers
    list.setAttribute("aria-busy", "true");
    setTimeout(()=>{ list.setAttribute("aria-busy","false"); showToast(msg, "info", 1500); }, 50);
  }

  function hydrateDates(items) {
    return items.map(f=>{
      const start = parseISO(f.start);
      const end = parseISO(f.end) || start;
      return {...f, start, end, _id: Math.random().toString(36).slice(2)};
    }).filter(x=>x.start);
  }

  function statusOf(item, now = new Date()) {
    if (item.start <= now && now <= item.end) return "live";
    if (item.start > now) return "upcoming";
    return "past";
  }

  function score(item) {
    // simple fuzzy-ish score: title+notes includes query terms
    if (!query) return 0;
    const hay = `${item.title||""} ${item.notes||""}`.toLowerCase();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let s = 0;
    for (const t of terms) if (hay.includes(t)) s += 1;
    return -s; // smaller is "better" (for sort stable tie-break)
  }

  function applyFilters() {
    const now = new Date();
    let out = enriched.slice();

    // filter by tab
    if (activeTab !== "all") {
      out = out.filter(x => statusOf(x, now) === activeTab);
    }

    // search
    if (query) {
      const q = query.toLowerCase();
      out = out.filter(x => (x.title||"").toLowerCase().includes(q) || (x.notes||"").toLowerCase().includes(q));
    }

    // sort
    if (sortBy === "soonest") {
      out.sort((a,b)=> a.start - b.start || score(a) - score(b));
    } else if (sortBy === "latest") {
      out.sort((a,b)=> b.start - a.start || score(a) - score(b));
    } else if (sortBy === "title") {
      out.sort((a,b)=> (a.title||"").localeCompare(b.title||"") || score(a) - score(b));
    }

    return out;
  }

  function relTime(target, now = new Date()){
    const diffMs = target - now;
    const sign = diffMs >= 0 ? 1 : -1;
    const sec = Math.abs(Math.floor(diffMs/1000));
    const min = Math.floor(sec/60);
    const hr  = Math.floor(min/60);
    const day = Math.floor(hr/24);
    if (day)  return (sign>0? "in " : "") + day + " day" + (day!==1?"s":"") + (sign<0? " ago": "");
    if (hr)   return (sign>0? "in " : "") + hr + " hr"  + (hr!==1?"s":"") + (sign<0? " ago": "");
    if (min)  return (sign>0? "in " : "") + min + " min" + (min!==1?"s":"") + (sign<0? " ago": "");
    return (sign>0? "in " : "") + sec + " sec" + (sec!==1?"s":"") + (sign<0? " ago": "");
  }

  function renderCard(item, now = new Date()){
    const st = statusOf(item, now);
    const badge =
      st === "live"     ? `<span class="status now">LIVE</span>` :
      st === "upcoming" ? `<span class="status upcoming">Upcoming</span>` :
                          `<span class="status past">Past</span>`;

    const when = fmtRange(item.start, item.end);
    const liveClock = st === "live"
      ? `<div class="small" style="color:var(--muted);">Ends ${relTime(item.end, now)} • ${fmtTime(item.end)}</div>`
      : st === "upcoming"
        ? `<div class="small" style="color:var(--muted);">Starts ${relTime(item.start, now)} • ${fmtTime(item.start)}</div>`
        : `<div class="small" style="color:var(--muted);">Ended ${relTime(item.end, now)}</div>`;

    return `
      <article class="card-item" data-id="${item._id}">
        <div class="row">
          <div class="title">${escapeHTML(item.title || "Fundraiser")}</div>
          ${badge}
        </div>
        <div class="meta">
          ${when} • ${escapeHTML(item.location || "Location TBA")}
          ${item.notes ? " • " + escapeHTML(item.notes) : ""}
        </div>
        ${liveClock}
      </article>
    `;
  }

  function renderList(items) {
    list.innerHTML = items.map(it => renderCard(it)).join("");
    if (emptyState) emptyState.classList.toggle("hidden", items.length !== 0);
  }

  function refresh() {
    const items = applyFilters();
    renderList(items);
    announce(`${items.length} item${items.length!==1?"s":""} shown`);
  }

  function wireControls() {
    // Filters
    filterBtns.forEach(btn=>{
      btn.addEventListener("click", ()=>{
        filterBtns.forEach(b=> b.setAttribute("aria-pressed","false"));
        btn.setAttribute("aria-pressed","true");
        activeTab = btn.dataset.filter || "all";
        setQS({tab: activeTab});
        refresh();
      });
    });

    // Search
    if (searchInput) {
      searchInput.addEventListener("input", ()=>{
        query = searchInput.value.trim();
        setQS({q: query});
        refresh();
      });
    }

    // Sort
    if (sortSelect) {
      sortSelect.addEventListener("change", ()=>{
        sortBy = sortSelect.value || CONFIG.FUNDRAISERS.defaultSort;
        setQS({sort: sortBy});
        refresh();
      });
    }

    // Keyboard quick-nav: slash to focus search
    document.addEventListener("keydown", (e)=>{
      if (e.key === "/" && searchInput) {
        e.preventDefault(); searchInput.focus();
      }
    });
  }

  function applyQSDefaults() {
    const qs = getQS();
    if (qs.tab) {
      activeTab = qs.tab;
      filterBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.filter === activeTab)));
    } else {
      // ensure default pressed state
      filterBtns.forEach(b => b.setAttribute("aria-pressed","false"));
      const def = filterBtns.find(b=> b.dataset.filter === activeTab);
      if (def) def.setAttribute("aria-pressed","true");
    }

    if (qs.q && searchInput) { query = qs.q; searchInput.value = qs.q; }
    if (qs.sort && sortSelect) { sortBy = qs.sort; sortSelect.value = qs.sort; }
  }

  async function init() {
    try {
      raw = await fetchJSON(CONFIG.PATHS.fundraisers);
      enriched = hydrateDates(Array.isArray(raw) ? raw : []);
      applyQSDefaults();
      wireControls();
      refresh();

      // Live refresher (update statuses/countdowns every 30s)
      setInterval(()=> {
        enriched = hydrateDates(raw);
        refresh();
      }, CONFIG.FUNDRAISERS.liveWindowMs);

    } catch (e) {
      console.error(e);
      list.innerHTML = `<div class="panel glass">Could not load fundraisers. Check <code>${CONFIG.PATHS.fundraisers}</code>.</div>`;
      if (emptyState) emptyState.classList.add("hidden");
      showToast("Couldn’t load fundraisers yet.", "warn", 3200);
    }
  }

  init();
})();

