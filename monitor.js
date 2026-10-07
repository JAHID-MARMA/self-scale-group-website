/* ============================================================
   Self Scale Group — Founder Live Monitor (v1)
   ------------------------------------------------------------
   Private page. Three states, nothing else:
     1. Logged out        → login box only. No data is fetched.
     2. Logged in, not on the allowlist (public.monitor_admins)
                        → "This area is private." No data shown.
     3. Logged in + allowlisted → the 7 panels, refreshed every
        60 seconds, plus a manual Refresh button.

   Security lives in the database, not in this file: every
   monitor table has Row Level Security that returns rows only
   to allowlisted emails, and no write policy exists at all.
   This page never displays the anon key or any secret, and
   never shows a number it could not read from the database.

   Money rule: only revenue_ledger rows with status 'received'
   count. An approved shop order is not revenue.
   This file REUSES the client from app.js (supabaseClient,
   supabaseReady, CONTACT_FALLBACK_EMAIL). Load order in
   monitor.html: supabase-js CDN → app.js → monitor.js.
   ============================================================ */

(function monitor() {
  const loginBox = document.getElementById("monLoginBox");
  if (!loginBox) return; /* not the monitor page */

  const loginForm = document.getElementById("monLoginForm");
  const emailEl = document.getElementById("monEmail");
  const passEl = document.getElementById("monPassword");
  const loginBtn = document.getElementById("monLoginBtn");
  const loginNote = document.getElementById("monLoginNote");

  const privateBox = document.getElementById("monPrivateBox");
  const privateEmail = document.getElementById("monPrivateEmail");
  const privateLogoutBtn = document.getElementById("monPrivateLogoutBtn");

  const panels = document.getElementById("monPanels");
  const userEmailEl = document.getElementById("monUserEmail");
  const lastUpdatedEl = document.getElementById("monLastUpdated");
  const refreshBtn = document.getElementById("monRefreshBtn");
  const logoutBtn = document.getElementById("monLogoutBtn");
  const note = document.getElementById("monNote");

  const PANELS = {
    revenue: document.getElementById("panRevenue"),
    shop: document.getElementById("panShop"),
    staff: document.getElementById("panStaff"),
    tools: document.getElementById("panTools"),
    pipelines: document.getElementById("panPipelines"),
    decisions: document.getElementById("panDecisions"),
    health: document.getElementById("panHealth"),
  };

  let currentUser = null;
  let isAdmin = false;
  let timer = null;
  const REFRESH_MS = 60 * 1000;

  /* ---------- small helpers ---------- */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function taka(n) {
    const num = Number(n) || 0;
    return "৳" + num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function niceDate(v, withTime) {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d.getTime())) return esc(String(v));
    return withTime ? d.toLocaleString() : d.toLocaleDateString();
  }

  function tile(label, value, state) {
    const cls = state ? " " + state : "";
    return '<div class="mon-tile' + cls + '"><span class="mon-tile-label">' +
      esc(label) + '</span><span class="mon-tile-value">' + value + "</span></div>";
  }

  function emptyMsg(text) {
    return '<p class="mon-empty">' + esc(text) + "</p>";
  }

  function errMsg() {
    return '<p class="mon-empty">Could not load this just now. Use Refresh in a moment.</p>';
  }

  function chip(text, kind) {
    return '<span class="mon-chip ' + kind + '">' + esc(text) + "</span>";
  }

  /* ---------- panel renders (one per table) ---------- */

  async function loadRevenue() {
    const box = PANELS.revenue;
    const { data, error } = await supabaseClient
      .from("revenue_ledger")
      .select("received_at, source, product_or_service, buyer_label, amount_bdt, method, status")
      .order("received_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) { box.innerHTML = errMsg(); return; }
    const rows = data || [];
    if (!rows.length) {
      box.innerHTML = emptyMsg("No records yet — no money has come in through the ledger yet.") +
        '<div class="mon-tiles">' + tile("Total received", taka(0), "st-ok") + "</div>";
      return;
    }
    const received = rows.filter(r => r.status === "received");
    const pending = rows.filter(r => r.status === "pending");
    const total = received.reduce((s, r) => s + (Number(r.amount_bdt) || 0), 0);
    const now = new Date();
    const monthTotal = received
      .filter(r => {
        if (!r.received_at) return false;
        const d = new Date(r.received_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce((s, r) => s + (Number(r.amount_bdt) || 0), 0);
    const pendTotal = pending.reduce((s, r) => s + (Number(r.amount_bdt) || 0), 0);

    let html = '<div class="mon-tiles">' +
      tile("Total received", taka(total), "st-ok") +
      tile("Received this month", taka(monthTotal), "st-ok") +
      tile("Waiting (not revenue)", taka(pendTotal), pending.length ? "st-wait" : "") +
      "</div>";

    const latest = received.slice(0, 5);
    if (latest.length) {
      html += '<ul class="mon-list">' + latest.map(r =>
        '<li><span class="mon-li-main"><b>' + esc(r.product_or_service || r.source || "Payment") +
        "</b> · " + esc(r.buyer_label || "") + '</span><span class="mon-li-side">' +
        taka(r.amount_bdt) + "<small>" + niceDate(r.received_at) + " · " + esc(r.method || "") +
        "</small></span></li>").join("") + "</ul>";
    } else {
      html += emptyMsg("No received payments recorded yet.");
    }
    box.innerHTML = html;
  }

  async function loadShop() {
    const box = PANELS.shop;
    const prod = await supabaseClient
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    if (prod.error) { box.innerHTML = errMsg(); return; }
    const count = prod.count || 0;
    box.innerHTML =
      '<div class="mon-tiles">' +
      tile("Products live in the shop", String(count), count ? "st-ok" : "st-wait") +
      "</div>" +
      '<p class="mon-note">Orders and downloads are confirmed by hand today and read in full in the Supabase desk. This page never shows buyer names or buyer rows.</p>';
  }

  async function loadStaff() {
    const box = PANELS.staff;
    const { data, error } = await supabaseClient
      .from("monitor_activity")
      .select("happened_at, actor, category, action, detail, status, proof_url")
      .order("happened_at", { ascending: false })
      .limit(12);
    if (error) { box.innerHTML = errMsg(); return; }
    const rows = data || [];
    if (!rows.length) {
      box.innerHTML = emptyMsg("No activity logged yet. Work appears here after the CEO checks and records it.");
      return;
    }
    const chipFor = s => ({
      done: chip("Done", "ok"),
      in_progress: chip("In progress", "info"),
      blocked: chip("Blocked", "bad"),
      waiting_founder: chip("Waiting on you", "wait"),
    }[s] || chip(s || "", "info"));
    box.innerHTML = '<ul class="mon-list">' + rows.map(r => {
      let line = '<li><span class="mon-li-main"><b>' + esc(r.actor || "") + "</b> — " +
        esc(r.action || "");
      if (r.detail) line += '<small class="mon-detail">' + esc(r.detail) + "</small>";
      if (r.proof_url) line += ' <a href="' + esc(r.proof_url) + '" target="_blank" rel="noopener">Proof</a>';
      line += '</span><span class="mon-li-side">' + chipFor(r.status) +
        "<small>" + niceDate(r.happened_at) + "</small></span></li>";
      return line;
    }).join("") + "</ul>";
  }

  async function loadTools() {
    const box = PANELS.tools;
    const { data, error } = await supabaseClient
      .from("tool_status")
      .select("tool, works, plan, credits_left, credit_limit, note, checked_on, checked_by")
      .order("tool", { ascending: true });
    if (error) { box.innerHTML = errMsg(); return; }
    const rows = data || [];
    if (!rows.length) {
      box.innerHTML = emptyMsg("No tools recorded yet.");
      return;
    }
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    box.innerHTML = '<div class="mon-tools">' + rows.map(r => {
      const checked = r.checked_on ? new Date(r.checked_on + "T00:00:00") : null;
      const stale = !checked || checked.getTime() < weekAgo;
      const state = !r.works ? "st-bad" : stale ? "st-wait" : "st-ok";
      const stateChip = !r.works ? chip("Not working", "bad")
        : stale ? chip("Check is old", "wait") : chip("Working", "ok");
      let line = '<div class="mon-tile mon-tool ' + state + '">' +
        '<span class="mon-tile-label">' + esc(r.tool || "") + "</span>" +
        '<span class="mon-tool-state">' + stateChip + "</span>" +
        '<span class="mon-tool-credits">' + esc(r.credits_left || "Not checked yet") + "</span>";
      const bits = [];
      if (r.plan) bits.push("Plan: " + esc(r.plan));
      if (r.note) bits.push(esc(r.note));
      bits.push("Last checked: " + (r.checked_on ? niceDate(r.checked_on) : "not checked yet") +
        (r.checked_by ? " by " + esc(r.checked_by) : ""));
      line += '<span class="mon-tool-note">' + bits.join(" · ") + "</span></div>";
      return line;
    }).join("") + "</div>";
  }

  async function loadPipelines() {
    const box = PANELS.pipelines;
    const { data, error } = await supabaseClient
      .from("pipelines")
      .select("title, stage, owner, next_step, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10);
    if (error) { box.innerHTML = errMsg(); return; }
    const rows = data || [];
    if (!rows.length) {
      box.innerHTML = emptyMsg("No work in flight is recorded right now.");
      return;
    }
    const stageChip = s => ({
      idea: chip("Idea", "info"),
      drafting: chip("Drafting", "info"),
      building: chip("Building", "info"),
      ceo_check: chip("CEO checking", "wait"),
      waiting_founder: chip("Waiting on you", "wait"),
      live: chip("Live", "ok"),
      done: chip("Done", "ok"),
    }[s] || chip(s || "", "info"));
    box.innerHTML = '<ul class="mon-list">' + rows.map(r =>
      '<li><span class="mon-li-main"><b>' + esc(r.title || "") + "</b>" +
      (r.owner ? '<small class="mon-detail">Owner: ' + esc(r.owner) + "</small>" : "") +
      (r.next_step ? '<small class="mon-detail">Next: ' + esc(r.next_step) + "</small>" : "") +
      '</span><span class="mon-li-side">' + stageChip(r.stage) +
      "<small>" + niceDate(r.updated_at) + "</small></span></li>").join("") + "</ul>";
  }

  async function loadDecisions() {
    const box = PANELS.decisions;
    const { data, error } = await supabaseClient
      .from("decisions")
      .select("raised_at, title, detail, link_url, status")
      .order("raised_at", { ascending: false })
      .limit(20);
    if (error) { box.innerHTML = errMsg(); return; }
    const open = (data || []).filter(r => r.status === "open");
    let html = '<p class="mon-note">View only. Give your decision to the CEO in chat, as always — nothing is approved from this page.</p>';
    if (!open.length) {
      box.innerHTML = html + emptyMsg("Nothing is waiting on you right now.");
      return;
    }
    html += '<ul class="mon-list">' + open.map(r => {
      let line = '<li><span class="mon-li-main"><b>' + esc(r.title || "") + "</b>";
      if (r.detail) line += '<small class="mon-detail">' + esc(r.detail) + "</small>";
      if (r.link_url) line += ' <a href="' + esc(r.link_url) + '" target="_blank" rel="noopener">Open</a>';
      line += '</span><span class="mon-li-side">' + chip("Waiting on you", "wait") +
        "<small>" + niceDate(r.raised_at) + "</small></span></li>";
      return line;
    }).join("") + "</ul>";
    box.innerHTML = html;
  }

  function loadHealth() {
    PANELS.health.innerHTML =
      '<div class="mon-tiles">' + tile("Automatic check", "Not set up yet", "st-wait") + "</div>" +
      '<p class="mon-note">The automatic up/down check is a later pipe. Until it exists, this tile says so plainly instead of guessing. The CEO checks the site by hand and records any problem in Staff Activity.</p>';
  }

  /* ---------- load + refresh ---------- */

  async function loadAll() {
    if (!supabaseClient || !isAdmin) return;
    note.textContent = "";
    const jobs = [loadRevenue(), loadShop(), loadStaff(), loadTools(), loadPipelines(), loadDecisions()];
    loadHealth();
    await Promise.all(jobs.map(j => j.catch(() => {})));
    lastUpdatedEl.textContent = new Date().toLocaleTimeString();
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => { loadAll(); }, REFRESH_MS);
  }
  function stopTimer() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* ---------- the three states ---------- */

  function showLogin(msg, kind) {
    stopTimer();
    isAdmin = false;
    currentUser = null;
    panels.hidden = true;
    privateBox.hidden = true;
    loginBox.hidden = false;
    if (msg) { loginNote.textContent = msg; loginNote.className = "form-note" + (kind ? " " + kind : ""); }
  }

  function showPrivate(email) {
    stopTimer();
    isAdmin = false;
    loginBox.hidden = true;
    panels.hidden = true;
    privateEmail.textContent = email || "";
    privateBox.hidden = false;
  }

  async function showPanels(user) {
    loginBox.hidden = true;
    privateBox.hidden = true;
    panels.hidden = false;
    userEmailEl.textContent = user.email || "";
    isAdmin = true;
    await loadAll();
    startTimer();
  }

  async function checkAdmin(user) {
    const { data, error } = await supabaseClient
      .from("monitor_admins")
      .select("email")
      .eq("email", user.email || "");
    if (error) return false;
    return !!(data && data.length);
  }

  async function route(session) {
    const user = session && session.user ? session.user : null;
    if (!user) { showLogin(); return; }
    currentUser = user;
    let admin = false;
    try { admin = await checkAdmin(user); } catch (e) { admin = false; }
    if (admin) showPanels(user);
    else showPrivate(user.email || "");
  }

  /* ---------- login / logout ---------- */

  if (!supabaseClient) {
    loginBtn.disabled = true;
    loginNote.textContent = "Accounts are not working right now. Please email us at " +
      CONTACT_FALLBACK_EMAIL + " and we will help you.";
    loginNote.className = "form-note warn";
    return;
  }

  function mark(field, bad) {
    if (bad) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    return !bad;
  }
  [emailEl, passEl].forEach(f => f.addEventListener("input", () => f.removeAttribute("aria-invalid")));

  loginForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const email = emailEl.value.trim();
    const password = passEl.value;
    const okEmail = mark(emailEl, !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
    const okPass = mark(passEl, !password);
    if (!(okEmail && okPass)) {
      loginNote.textContent = "Please add a valid email address and your password.";
      loginNote.className = "form-note err";
      (!okEmail ? emailEl : passEl).focus();
      return;
    }
    loginBtn.disabled = true;
    loginBtn.textContent = "Please wait…";
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        loginNote.textContent = error.message;
        loginNote.className = "form-note err";
        return;
      }
      passEl.value = "";
      await route(data ? data.session : null);
    } catch (e) {
      loginNote.textContent = "We could not log you in just now. Please check your connection and try again.";
      loginNote.className = "form-note err";
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Log In";
    }
  });

  async function doLogout() {
    stopTimer();
    try { await supabaseClient.auth.signOut(); } catch (e) { /* session is cleared locally either way */ }
    showLogin("You are logged out.", "");
  }
  logoutBtn.addEventListener("click", doLogout);
  privateLogoutBtn.addEventListener("click", doLogout);
  refreshBtn.addEventListener("click", () => { loadAll(); });

  /* Restore the session on arrival, then keep the page in sync. */
  supabaseClient.auth.getSession()
    .then(({ data }) => route(data ? data.session : null))
    .catch(() => showLogin());
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    const user = session && session.user ? session.user : null;
    if (!user) { showLogin(); return; }
    if (currentUser && currentUser.id === user.id && (isAdmin || !privateBox.hidden)) return;
    route(session);
  });
})();
