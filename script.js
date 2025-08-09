/* ============================================================
   AHS Class of ’28 — script.js (Max Edition)
   Pages supported:
     - Home (index.html): live date/time, global countdown, starfield,
                          Happening Now + Next Up from /data
     - Fundraisers (fundraisers.html): filters, search, sort, live badges,
                          per-card countdowns, URL state, accessibility
   Extras:
     - Theme toggle (auto + manual, saved)
     - Page fade transitions
     - Parallax hero
     - IntersectionObserver reveal animations
     - Toast queue
     - Keyboard shortcuts
   No external libraries. Vanilla JS.
   ============================================================ */

/* ========================= CONFIG ========================= */
const CONFIG = {
  TIMEZONE: undefined,                 // undefined = browser TZ; or "America/New_York"
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
  },
  TRANSITIONS: {
    enabled: true,
    fadeMs: 180
  },
  PARALLAX: {
    enabled: true,
    maxTranslateY: 18                // px
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
function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

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

/* ========================= TOAST (Queue) ========================= */
const toastEl = $("#toast");
let toastTimer = null;
const toastQueue = [];
function showToast(msg, type="info", ms=2800) {
  toastQueue.push({ msg, type, ms });
  if (!toastTimer) runToastQueue();
}
function runToastQueue(){
  if (!toastEl) return;
  const next = toastQueue.shift();
  if (!next) { toastTimer = null; return; }
  toastEl.textContent = next.msg;
  toastEl.className = `toast ${next.type}`;
  toastEl.classList.remove("hidden");
  toastTimer = setTimeout(()=>{
    toastEl.classList.add("hidden");
    toastTimer = null;
    runToastQueue();
  }, next.ms);
}

/* ========================= MOBILE MENU ========================= */
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

/* ========================= PAGE TRANSITIONS ========================= */
if (CONFIG.TRANSITIONS.enabled) {
  document.addEventListener("click", (e)=>{
    const a = e.target.closest("a");
    if (!a) return;
    const url = new URL(a.href, location.href);
    const sameHost = url.origin === location.origin;
    const sameTab = !a.hasAttribute("target");
    const isHash = url.pathname === location.pathname && url.hash && url.hash !== "#";
    if (sameHost && sameTab && !isHash) {
      e.preventDefault();
      fadeOut(()=> location.href = a.href);
    }
  });
  window.addEventListener("pageshow", ()=> fadeIn());
}
function fadeOut(done){
  const dur = CONFIG.TRANSITIONS.fadeMs;
  document.documentElement.style.transition = `opacity ${dur}ms ease`;
  document.documentElement.style.opacity = "0";
  setTimeout(done, dur);
}
function fadeIn(){
  const dur = CONFIG.TRANSITIONS.fadeMs;
  document.documentElement.style.opacity = "0";
  requestAnimationFrame(()=>{
    document.documentElement.style.transition = `opacity ${dur}ms ease`;
    document.documentElement.style.opacity = "1";
    setTimeout(()=> { document.documentElement.style.transition = ""; }, dur);
  });
}
fadeIn();

/* ========================= THEME TOGGLE ========================= */
(function themeControl(){
  const prefersDark = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const saved = localStorage.getItem("theme"); // 'dark' | 'light' | null
  let theme = saved || (prefersDark() ? "dark" : "light");
  applyTheme(theme);

  // Add a quick keyboard toggle: press 't'
  document.addEventListener("keydown", (e)=>{
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key.toLowerCase() === "t") {
      theme = theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", theme);
      applyTheme(theme);
      showToast(`Theme: ${theme}`, "info", 1200);
    }
  });

  function applyTheme(t){
    // We don't have separate CSS files, but this can hook in later if needed.
    // For now we just set a data attribute (you can use it in CSS if desired).
    document.documentElement.setAttribute("data-theme", t);
  }
})();

/* ========================= PARALLAX HERO ========================= */
(function parallax(){
  if (!CONFIG.PARALLAX.enabled) return;
  const hero = $(".hero .card");
  if (!hero) return;
  let ticking = false;

  window.addEventListener("scroll", ()=>{
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(()=>{
      const y = clamp(window.scrollY / 12, 0, CONFIG.PARALLAX.maxTranslateY);
      hero.style.transform = `translateY(${y}px)`;
      ticking = false;
    });
  }, { passive: true });
})();

/* ========================= INTERSECTION REVEAL ========================= */
(function revealOnScroll(){
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const io = new IntersectionObserver((entries)=>{
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.style.transition = "transform 500ms cubic-bezier(.2,.8,.2,1), opacity 500ms";
        e.target.style.transform = "translateY(0)";
        e.target.style.opacity = "1";
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.05 });

  $$(".panel, .card-item, .product, .achieve").forEach(el=>{
    el.style.transform = "translateY(16px)";
    el.style.opacity = "0";
    io.observe(el);
  });
})();

/* ========================= KEYBOARD SHORTCUTS ========================= */
/*  t  = theme toggle
    /  = focus search (fundraisers)
    g h = go home
    g f = go fundraisers
*/
document.addEventListener("keydown", (e)=>{
  if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key === "/") {
    const search = $("#searchInput");
    if (search) { e.preventDefault(); search.focus(); }
  } else if (e.key.toLowerCase() === "g") {
    let seq = "";
    const handler = (ev)=>{
      seq = (ev.key || "").toLowerCase();
      if (seq === "h") location.href = "./";
      if (seq === "f") location.href = "./fundraisers.html";
      document.removeEventListener("keydown", handler);
    };
    document.addEventListener("keydown", handler, { once: true });
  }
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
    showToast("Welcome to the Class of ’28 site!", "success", 2400);
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
                  <span class="status now">LIVE • ${fmtTime(f.start)}–${fmtTime(f.end)}</span>
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
    list.setAttribute("aria-busy", "true");
    setTimeout(()=>{ list.setAttribute("aria-busy","false"); showToast(msg, "info", 1200); }, 50);
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
    const metaClock = st === "live"
      ? `Ends ${relTime(item.end, now)} • ${fmtTime(item.end)}`
      : st === "upcoming"
        ? `Starts ${relTime(item.start, now)} • ${fmtTime(item.start)}`
        : `Ended ${relTime(item.end, now)}`;

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
        <div class="small" style="color:var(--muted);">${metaClock}</div>
      </article>
    `;
  }

  function applyFilters() {
    const now = new Date();
    let out = enriched.slice();

    if (activeTab !== "all") out = out.filter(x => statusOf(x, now) === activeTab);

    if (query) {
      const q = query.toLowerCase();
      out = out.filter(x => (x.title||"").toLowerCase().includes(q) || (x.notes||"").toLowerCase().includes(q));
    }

    if (sortBy === "soonest") {
      out.sort((a,b)=> a.start - b.start || (a.title||"").localeCompare(b.title||""));
    } else if (sortBy === "latest") {
      out.sort((a,b)=> b.start - a.start || (a.title||"").localeCompare(b.title||""));
    } else if (sortBy === "title") {
      out.sort((a,b)=> (a.title||"").localeCompare(b.title||"") || a.start - b.start);
    }

    return out;
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
      filterBtns.forEach(b => b.setAttribute("aria-pressed","false"));
      const def = filterBtns.find(b=> b.dataset.filter === activeTab);
      if (def) def.setAttribute("aria-pressed","true");
    }
    if (qs.q && searchInput) { query = qs.q; searchInput.value = qs.q; }
    if (qs.sort && sortSelect) { sortBy = qs.sort; sortSelect.value = qs.sort; }
  }

  async function init() {
    try {
      const data = await fetchJSON(CONFIG.PATHS.fundraisers);
      const arr = Array.isArray(data) ? data : [];
      if (!arr.length) showToast("No fundraisers yet — add some in data/fundraisers.json", "warn", 3000);

      // Make sure items have expected fields to avoid runtime errors
      raw = arr.map(x => ({
        title: x.title || "Untitled",
        location: x.location || "",
        start: x.start || "",
        end: x.end || x.start || "",
        notes: x.notes || ""
      }));
      enriched = hydrateDates(raw);

      applyQSDefaults();
      wireControls();
      refresh();

      // Live refresher (update statuses/countdowns)
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


/* =======================================================================
   AHS — ABOUT PAGE ADD-ON (no edits to existing code)
   - Runs ONLY if [data-flip] cards exist (i.e., on about.html)
   - Card flip on click/tap + keyboard (Enter/Space)
   - Stronger scroll reveal for About panels
   ======================================================================= */
(function AHS_aboutEnhancements(){
  const flipCards = Array.from(document.querySelectorAll('[data-flip]'));
  if (!flipCards.length) return; // Not on About page; do nothing

  // --- Card flip behavior (accessible) ---
  flipCards.forEach(card => {
    const front = card.querySelector('.front');
    const back  = card.querySelector('.back');

    // Safety: if structure missing, skip this card
    if (!front || !back) return;

    // Make the whole card focusable and button-like
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-expanded', 'false');

    // Helper: toggle front/back visibility
    function flip(){
      const showingBack = back.style.display !== 'none';
      if (showingBack) {
        back.style.display = 'none';
        front.style.display = '';
        card.setAttribute('aria-expanded', 'false');
      } else {
        back.style.display = '';
        front.style.display = 'none';
        card.setAttribute('aria-expanded', 'true');
      }
      // a little glow to emphasize interaction
      card.classList.toggle('glow');
      setTimeout(()=> card.classList.toggle('glow'), 700);
    }

    // Default state = show front, hide back
    back.style.display = 'none';
    front.style.display = '';

    // Click / tap
    card.addEventListener('click', flip);

    // Keyboard: Enter / Space
    card.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
    });
  });

  // --- Stronger reveal on scroll for About panels ---
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    const targets = document.querySelectorAll('.section .panel, .section .card');
    const io = new IntersectionObserver((entries)=>{
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.style.transition = 'transform 600ms cubic-bezier(.2,.8,.2,1), opacity 600ms';
          el.style.transform  = 'translateY(0) scale(1)';
          el.style.opacity    = '1';
          io.unobserve(el);
        }
      }
    }, { threshold: 0.08 });

    targets.forEach(el=>{
      el.style.transform = 'translateY(20px) scale(.98)';
      el.style.opacity   = '0';
      io.observe(el);
    });
  }

  // Friendly toast (if your toast element exists)
  try { if (typeof showToast === 'function') showToast('About page ready', 'success', 1400); } catch {}
})();
