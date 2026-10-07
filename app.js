/* Self Scale Group — website app */
document.documentElement.classList.add("js");

/* ============================================================
   1) TEAM DIRECTORY (official public directory — do not edit
      names, roles or emails without Founder approval)
   ============================================================ */
const TEAM = [
  { img: "maheer",  name: "Maheer Qureshi",     role: "Chief Graphic Designer & Art Director", email: "maheer.designer.ssg@gmail.com" },
  { img: "tahmeed", name: "Tahmeed Rahman",     role: "Head of Teaching Content",              email: "tahmeed.teaching.ssg@gmail.com" },
  { img: "aariz",   name: "Aariz Talukder",     role: "Senior MS Office Expert",               email: "aariz.office.ssg@gmail.com" },
  { img: "awuf",    name: "Abdur Rahman Awuf",  role: "Head of Finance & Accounts",            email: "awuf.finance.ssg@gmail.com" },
  { img: "samira",  name: "Samira Khatun",      role: "Head of People & HR",                   email: "samira.hr.ssg@gmail.com" },
  { img: "rafid",   name: "Rafid Hasan",        role: "Operations Manager",                    email: "rafid.operations.ssg@gmail.com" },
  { img: "mishal",  name: "Mishal Karim",       role: "Head of Research & Intelligence",       email: "mishal.research.ssg@gmail.com" },
  { img: "arman",   name: "Arman Hossain",      role: "Head of Revenue & Sales",               email: "arman.sales.ssg@gmail.com" },
  { img: "nusrat",  name: "Nusrat Jahan",       role: "Client Success Lead",                   email: "nusrat.client.ssg@gmail.com" },
  { img: "sakib",   name: "Sakib Rahman",       role: "Legal & Compliance Officer",            email: "sakib.legal.ssg@gmail.com" },
  { img: "inaya",   name: "Inaya Sultana",      role: "Social Media Lead",                     email: "inaya.social.ssg@gmail.com" },
  { img: "aydin",   name: "Aydin Chowdhury",    role: "Senior Video Editor",                   email: "aydin.video.ssg@gmail.com" },
  { img: "arham",   name: "Arham Siddiqui",     role: "Marketing Lead",                        email: "arham.marketing.ssg@gmail.com" },
  { img: "zavian",  name: "Zavian Karim",       role: "Senior App Developer",                  email: "zavian.app.ssg@gmail.com" },
  { img: "taseen",  name: "Taseen Ahmed",       role: "AI Prompt Engineer",                    email: "taseen.prompt.ssg@gmail.com" },
  { img: "zunaira", name: "Zunaira Haque",      role: "Chief Quality Checker",                 email: "zunaira.quality.ssg@gmail.com" },
];

(function renderTeam() {
  const grid = document.getElementById("teamGrid");
  if (!grid) return;
  grid.innerHTML = TEAM.map(m => `
    <article class="member reveal" data-search="${(m.name + " " + m.role).toLowerCase()}">
      <img src="assets/photos/${m.img}.jpg" alt="Portrait of ${m.name}, ${m.role} at Self Scale Group" loading="lazy" decoding="async">
      <div class="member-body">
        <h3>${m.name}</h3>
        <p class="mrole">${m.role}</p>
        <a class="mail" href="mailto:${m.email}">${m.email}</a>
      </div>
    </article>`).join("");

  /* simple name/role search */
  const input = document.getElementById("teamSearch");
  const count = document.getElementById("teamCount");
  const empty = document.getElementById("teamEmpty");
  const clear = document.getElementById("teamClear");
  const cards = Array.from(grid.querySelectorAll(".member"));
  function applyFilter() {
    const q = (input.value || "").trim().toLowerCase();
    let shown = 0;
    cards.forEach(c => {
      const hit = !q || c.dataset.search.includes(q);
      c.hidden = !hit;
      if (hit) shown++;
    });
    count.textContent = q
      ? shown + " of " + TEAM.length + " department leads"
      : TEAM.length + " department leads";
    empty.hidden = shown !== 0;
  }
  if (input) {
    input.addEventListener("input", applyFilter);
    applyFilter();
  }
  if (clear) clear.addEventListener("click", () => { input.value = ""; applyFilter(); input.focus(); });
})();

/* ============================================================
   2) CONTACT FORM → SUPABASE
   ------------------------------------------------------------
   ★★★  SUPABASE CONFIG BLOCK — FILL THESE TWO VALUES  ★★★
   ------------------------------------------------------------
   After creating your Supabase project and running
   supabase/schema.sql, paste your project values here:

     SUPABASE_URL      →  Project Settings → API → Project URL
     SUPABASE_ANON_KEY →  Project Settings → API → anon public key

   While the sample values below are unchanged, the site is
   HONEST about it: the form states it is not connected yet and
   offers the contact email instead. It never fakes a success.
   No real keys are stored in this repository until the CEO
   pastes them here.
   ============================================================ */
const SUPABASE_URL = "https://npgmkmewyjnqvzqmmppd.supabase.co";   // ← paste your Project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZ21rbWV3eWpucXZ6cW1tcHBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTk5NDcsImV4cCI6MjEwNjg3NTk0N30.b5x5MC1dBR2pKRhxyg06SMNGhRwHDP48dqfJ3xjaXt4";       // ← paste your anon public key
const CONTACT_FALLBACK_EMAIL = "jahid.chairman.ssg@gmail.com";

function supabaseReady() {
  return SUPABASE_URL.startsWith("https://") &&
         !SUPABASE_URL.includes("YOUR-PROJECT") &&
         SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
}

/* One Supabase client (supabase-js v2, CDN) shared by the contact
   form and the account/auth features below. */
const supabaseClient = (supabaseReady() && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

async function sendToSupabase({ name, email, message }) {
  if (supabaseClient) {
    const { error } = await supabaseClient
      .from("website_messages")
      .insert({ name, email, message });
    if (error) throw new Error("Supabase insert failed: " + error.message);
    return;
  }
  /* Fallback if the CDN library failed to load: plain REST insert. */
  const res = await fetch(`${SUPABASE_URL}/rest/v1/website_messages`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({ name, email, message }),
  });
  if (!res.ok) throw new Error("Supabase insert failed: " + res.status);
}

(function wireForm() {
  const form = document.getElementById("msgForm");
  if (!form) return;
  const note = document.getElementById("formNote");
  const btn = document.getElementById("sendBtn");
  const fName = document.getElementById("fName");
  const fEmail = document.getElementById("fEmail");
  const fMsg = document.getElementById("fMsg");

  function notConnectedNotice() {
    note.className = "form-note warn";
    note.innerHTML = "This form is not ready yet, so please do not use it today. " +
      'Email us at <a href="mailto:' + CONTACT_FALLBACK_EMAIL + '">' + CONTACT_FALLBACK_EMAIL + "</a> and a person will help you.";
  }

  /* Be honest from the start when Supabase is not configured. */
  if (!supabaseReady()) notConnectedNotice();

  function mark(field, bad) {
    if (bad) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    return !bad;
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = fName.value.trim();
    const email = fEmail.value.trim();
    const message = fMsg.value.trim();

    const okName = mark(fName, !name);
    const okEmail = mark(fEmail, !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
    const okMsg = mark(fMsg, !message);
    if (!(okName && okEmail && okMsg)) {
      note.textContent = "Please add your name, a valid email address, and a short message — we need all three to get back to you.";
      note.className = "form-note err";
      ( !okName ? fName : !okEmail ? fEmail : fMsg ).focus();
      return;
    }

    if (!supabaseReady()) { notConnectedNotice(); return; }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Sending…";
    try {
      await sendToSupabase({ name, email, message });
      note.textContent = "Thank you, " + name.split(" ")[0] + " — we have your message. A person reads every message. When we reply, it will be from our company email.";
      note.className = "form-note ok";
      form.reset();
    } catch (e) {
      note.textContent = "Sorry — your message could not be sent just now. Please email us directly at " + CONTACT_FALLBACK_EMAIL + " and we will help you.";
      note.className = "form-note err";
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  [fName, fEmail, fMsg].forEach(f => f.addEventListener("input", () => f.removeAttribute("aria-invalid")));
})();

/* ============================================================
   3) ACCOUNT — real Supabase Auth (email + password)
   ============================================================ */
(function wireAuth() {
  const form = document.getElementById("authForm");
  if (!form) return;
  const emailEl = document.getElementById("authEmail");
  const passEl = document.getElementById("authPassword");
  const signUpBtn = document.getElementById("signUpBtn");
  const logInBtn = document.getElementById("logInBtn");
  const logOutBtn = document.getElementById("logOutBtn");
  const loggedOutBox = document.getElementById("authLoggedOut");
  const loggedInBox = document.getElementById("authLoggedIn");
  const userEmailEl = document.getElementById("authUserEmail");
  const note = document.getElementById("authNote");

  function say(message, kind) {
    note.textContent = message;
    note.className = "form-note" + (kind ? " " + kind : "");
  }

  function render(session) {
    const user = session && session.user ? session.user : null;
    loggedOutBox.hidden = !!user;
    loggedInBox.hidden = !user;
    userEmailEl.textContent = user ? (user.email || "") : "";
  }

  if (!supabaseClient) {
    say("Accounts are not working right now. Please email us at " + CONTACT_FALLBACK_EMAIL + " and we will help you.", "warn");
    signUpBtn.disabled = true;
    logInBtn.disabled = true;
    render(null);
    return;
  }

  function mark(field, bad) {
    if (bad) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    return !bad;
  }
  [emailEl, passEl].forEach(f => f.addEventListener("input", () => f.removeAttribute("aria-invalid")));

  function readCredentials() {
    const email = emailEl.value.trim();
    const password = passEl.value;
    const okEmail = mark(emailEl, !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
    const okPass = mark(passEl, !password);
    if (!(okEmail && okPass)) {
      say("Please add a valid email address and your password.", "err");
      (!okEmail ? emailEl : passEl).focus();
      return null;
    }
    return { email, password };
  }

  function setBusy(busy) {
    signUpBtn.disabled = busy;
    logInBtn.disabled = busy;
    signUpBtn.textContent = busy ? "Please wait…" : "Sign Up";
    logInBtn.textContent = busy ? "Please wait…" : "Log In";
  }

  async function doSignUp() {
    const creds = readCredentials();
    if (!creds) return;
    setBusy(true);
    try {
      const { data, error } = await supabaseClient.auth.signUp(creds);
      if (error) { say(error.message, "err"); return; }
      if (data && data.session) {
        say("Your account is ready, and you are logged in as " + creds.email + ".", "ok");
      } else {
        say("Please check your email to confirm your account, then come back and log in.", "ok");
      }
    } catch (e) {
      say("We could not make your account just now. Please check your connection and try again.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function doLogIn() {
    const creds = readCredentials();
    if (!creds) return;
    setBusy(true);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword(creds);
      if (error) { say(error.message, "err"); return; }
      say("Welcome back. You are logged in as " + (data.user ? data.user.email : creds.email) + ".", "ok");
      passEl.value = "";
    } catch (e) {
      say("We could not log you in just now. Please check your connection and try again.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function doLogOut() {
    logOutBtn.disabled = true;
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) { say(error.message, "err"); return; }
      say("You are logged out.", "");
      passEl.value = "";
    } catch (e) {
      say("We could not log you out just now. Please try again.", "err");
    } finally {
      logOutBtn.disabled = false;
    }
  }

  signUpBtn.addEventListener("click", doSignUp);
  logInBtn.addEventListener("click", doLogIn);
  logOutBtn.addEventListener("click", doLogOut);
  /* Pressing Enter in the form logs in. */
  form.addEventListener("submit", (ev) => { ev.preventDefault(); doLogIn(); });

  /* Restore any existing session, then keep the UI in sync. */
  supabaseClient.auth.getSession()
    .then(({ data }) => render(data ? data.session : null))
    .catch(() => render(null));
  supabaseClient.auth.onAuthStateChange((_event, session) => render(session));
})();

/* ============================================================
   4) UI HELPERS — year, mobile nav (aria), scroll reveal
   ============================================================ */
(function ui() {
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("primaryNav");
  if (toggle && links) {
    const setOpen = (open) => {
      links.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    toggle.addEventListener("click", () =>
      setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    links.querySelectorAll("a").forEach(a =>
      a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && links.classList.contains("open")) {
        setOpen(false); toggle.focus();
      }
    });
  }

  /* Reveal on scroll — content is visible if JS/IO is unavailable. */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealEls = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach(el => el.classList.add("on"));
  } else {
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    revealEls.forEach(el => io.observe(el));
  }
})();
