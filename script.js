/* =====================================================
   AHS Class of ’28 — script.js (Home Enhancements)
   - Mobile menu + smooth scroll + toast
   - Live date/time + countdown
   - Fetch fundraisers/events JSON and populate "Happening Now" + "Next Up"
   - Optional starfield background (toggle STARFIELD_ON)
   ===================================================== */

/* ========================= CONFIG ========================= */
const STARFIELD_ON = true;                // turn off by setting to false
const TIMEZONE = undefined;               // use browser TZ; you can set "America/New_York" if needed
const END_OF_SCHOOL = "2026-06-15T23:59:59"; // countdown target (edit anytime)

/* Path helpers (works on GitHub Pages) */
const DATA = {
  fundraisers: "data/fundraisers.json",
  events: "data/events.json",
};

/* ================ 1) MOBILE MENU TOGGLE =================== */
const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");

if (menuBtn && mobileMenu) {
  menuBtn.addEventListener("click", () => {
    const expanded = menuBtn.getAttribute("aria-expanded") === "true";
    menuBtn.setAttribute("aria-expanded", String(!expanded));
    mobileMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!mobileMenu.classList.contains("hidden")
        && !mobileMenu.contains(e.target)
        && e.target !== menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
      mobileMenu.classList.add("hidden");
    }
  });
}

/* ================== 2) SMOOTH SCROLL ===================== */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", function (e) {
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

/* ================== 3) TOAST SYSTEM ====================== */
const toastEl = document.getElementById("toast");
let toastTimer;
function showToast(message, type = "info", duration = 3000) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), duration);
}

/* ========== 4) LIVE DATE/TIME + COUNTDOWN ================= */
const dateEl = document.getElementById("date");
const timeEl = document.getElementById("time");

function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString(TIMEZONE, {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const timeStr = now.toLocaleTimeString(TIMEZONE, {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  if (dateEl) dateEl.textContent = dateStr;
  if (timeEl) timeEl.textContent = timeStr;
}
setInterval(updateDateTime, 1000);
updateDateTime();

/* Countdown to end of school */
const cd = {
  wrap: document.querySelector(".countdown"),
  d: document.getElementById("cd-days"),
  h: document.getElementById("cd-hrs"),
  m: document.getElementById("cd-min"),
  s: document.getElementById("cd-sec"),
};
const targetDate = new Date(END_OF_SCHOOL).getTime();

function updateCountdown() {
  const diff = targetDate - Date.now();
  if (diff <= 0) {
    if (cd.wrap) cd.wrap.innerHTML = "<strong>School’s out!</strong>";
    return;
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hrs  = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (cd.d) cd.d.textContent = days;
  if (cd.h) cd.h.textContent = String(hrs).padStart(2, "0");
  if (cd.m) cd.m.textContent = String(mins).padStart(2, "0");
  if (cd.s) cd.s.textContent = String(secs).padStart(2, "0");
}
setInterval(updateCountdown, 1000);
updateCountdown();

/* ================= 5) JSON HELPERS ======================= */
async function fetchJSON(path) {
  try {
    // cache-bust so Pages updates quickly
    const res = await fetch(`${path}?v=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Failed to load", path, err);
    showToast(`Could not load ${path}`, "warn", 2500);
    return null;
  }
}

/* Time helpers */
function parseISO(s) { return s ? new Date(s) : null; }
function isLive(startISO, endISO, now = new Date()) {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (!s || !e) return false;
  return s <= now && now <= e;
}
function isUpcoming(startISO, now = new Date()) {
  const s = parseISO(startISO);
  if (!s) return false;
  return s > now;
}
function fmtRange(startISO, endISO) {
  const s = parseISO(startISO), e = parseISO(endISO);
  if (!s || !e) return "";
  const datePart = s.toLocaleDateString(TIMEZONE, { month:"short", day:"numeric" });
  const sTime = s.toLocaleTimeString(TIMEZONE, { hour:"numeric", minute:"2-digit" });
  const eTime = e.toLocaleTimeString(TIMEZONE, { hour:"numeric", minute:"2-digit" });
  return `${datePart} • ${sTime}–${eTime}`;
}
function fmtDateOnly(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(TIMEZONE, { weekday:"short", month:"short", day:"numeric" });
}

/* ============== 6) DOM TARGETS (existing HTML) ============== */
/* We’ll find the two panels we rendered on index.html:
   - First glass panel = “Happening Now”
   - Second glass panel = “Next Up”
*/
const glassPanels = Array.from(document.querySelectorAll(".section .panel.glass"));
const nowPanel = glassPanels[0] || null;
const nextPanel = glassPanels[1] || null;

const nowList = nowPanel ? nowPanel.querySelector(".card-list") : null;
const nextCardContainer = nextPanel ? nextPanel.querySelector(".card-item") : null;

/* ============== 7) RENDER TEMPLATES ======================== */
function renderLiveCard(item) {
  const when = fmtRange(item.start, item.end);
  const loc = item.location ? ` • ${item.location}` : "";
  const notes = item.notes ? ` • ${item.notes}` : "";
  return `
    <div class="card-item">
      <div class="row">
        <div class="title">${escapeHTML(item.title || "Untitled")}</div>
        <span class="status now">LIVE NOW</span>
      </div>
      <div class="meta">${escapeHTML(when)}${escapeHTML(loc)}${escapeHTML(notes)}</div>
    </div>
  `;
}
function renderUpcomingCard(item) {
  const when = fmtRange(item.start, item.end);
  const loc = item.location ? ` • ${item.location}` : "";
  const notes = item.notes ? ` • ${item.notes}` : "";
  return `
    <div class="row">
      <div class="title">${escapeHTML(item.title || "Untitled")}</div>
      <span class="status upcoming">${escapeHTML(when)}</span>
    </div>
    <div class="meta">${escapeHTML((item.location || "") + (item.notes ? " • " + item.notes : ""))}</div>
  `;
}
function renderNoLive() {
  return `
    <div class="card-item">
      <div class="row">
        <div class="title">Nothing live right this minute</div>
        <span class="status upcoming">Check “Next Up”</span>
      </div>
      <div class="meta">When a fundraiser’s start/end time matches now, it’ll light up here automatically.</div>
    </div>
  `;
}

/* Escape HTML to avoid accidental markup */
function escapeHTML(s) {
  return String(s || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

/* ============== 8) MAIN: LOAD DATA & POPULATE ============== */
async function hydrateHome() {
  // Only run on the home page (we check for panels)
  if (!nowPanel && !nextPanel) return;

  const [fundraisers, events] = await Promise.all([
    fetchJSON(DATA.fundraisers),
    fetchJSON(DATA.events)
  ]);

  const now = new Date();

  /* Fundraisers: live + next upcoming */
  if (fundraisers && Array.isArray(fundraisers)) {
    const live = fundraisers.filter(f => isLive(f.start, f.end, now));
    const upcoming = fundraisers
      .filter(f => isUpcoming(f.start, now))
      .sort((a,b) => new Date(a.start) - new Date(b.start));

    // Fill “Happening Now”
    if (nowList) {
      if (live.length) {
        nowList.innerHTML = live.slice(0,3).map(renderLiveCard).join("");
      } else {
        nowList.innerHTML = renderNoLive();
      }
    }

    // Fill “Next Up” fundraiser
    if (nextCardContainer) {
      nextCardContainer.innerHTML = upcoming.length
        ? renderUpcomingCard(upcoming[0])
        : `
          <div class="row">
            <div class="title">No upcoming fundraisers</div>
            <span class="status past">TBD</span>
          </div>
          <div class="meta">Add one in <code>data/fundraisers.json</code>.</div>
        `;
    }
  }

  /* Events: show next school event (date-only list) underneath Next Up */
  if (events && Array.isArray(events) && nextPanel) {
    const today = new Date(); today.setHours(0,0,0,0);
    const upcomingEvents = events
      .map(e => ({...e, _d: new Date(e.date + "T00:00:00")}))
      .filter(e => e._d >= today)
      .sort((a,b) => a._d - b._d);

    const holder = document.createElement("div");
    holder.className = "small";
    holder.style.marginTop = "8px";
    holder.style.color = "var(--muted)";

    if (upcomingEvents.length) {
      const ev = upcomingEvents[0];
      holder.innerHTML = `Next school event: <strong>${escapeHTML(ev.title)}</strong> • ${escapeHTML(fmtDateOnly(ev.date))}`;
    } else {
      holder.textContent = "No upcoming school events listed. Update data/events.json.";
    }
    nextPanel.appendChild(holder);
  }
}
hydrateHome();

/* ============== 9) ENTRY EFFECTS ========================== */
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".hover-up").forEach(card => {
    card.style.opacity = 0;
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "all .5s ease";
      card.style.opacity = 1;
      card.style.transform = "translateY(0)";
    }, 120);
  });

  showToast("Welcome to the Class of ’28 site!", "info", 3200);
});

/* ============== 10) OPTIONAL STARFIELD ==================== */
if (STARFIELD_ON) {
  // create canvas behind everything
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.zIndex = "-1";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let w, h, stars;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    // create stars proportional to screen size
    const count = Math.min(180, Math.floor((w*h)/14000));
    stars = Array.from({length: count}).map(() => ({
      x: Math.random()*w,
      y: Math.random()*h,
      z: 0.25 + Math.random()*0.75,
      r: Math.random()*1.2 + 0.2,
      tw: Math.random()*Math.PI*2
    }));
  }
  window.addEventListener("resize", resize);
  resize();

  function tickStarfield(t) {
    ctx.clearRect(0,0,w,h);

    // subtle gradient tint to blend with theme
    const grd = ctx.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,"rgba(82,168,255,0.06)");
    grd.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,w,h);

    // draw stars
    for (const s of stars) {
      s.x += 0.02 * s.z; // tiny drift
      if (s.x > w) s.x = 0;

      const pulse = 0.5 + 0.5*Math.sin(t/700 + s.tw);
      const alpha = 0.35 + 0.45*pulse*s.z;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(173, 216, 255, ${alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(tickStarfield);
  }
  requestAnimationFrame(tickStarfield);
}

