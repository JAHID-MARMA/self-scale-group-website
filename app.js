/* ============================================================
   Self Scale Group — website app
   1) Team directory (official, public)
   2) Contact form → Supabase-ready (see CONFIG BLOCK below)
   3) Small UI helpers (mobile nav, reveal, year)
   ============================================================ */

/* ---------- 1) TEAM DIRECTORY ---------- */
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
    <article class="member reveal">
      <img src="assets/photos/${m.img}.jpg" alt="${m.name}, ${m.role} at Self Scale Group" loading="lazy">
      <div class="member-body">
        <h3>${m.name}</h3>
        <div class="mrole">${m.role}</div>
        <a class="mail" href="mailto:${m.email}">${m.email}</a>
      </div>
    </article>`).join("");
})();

/* ============================================================
   2) SUPABASE CONFIG BLOCK  ★ FILL THESE TWO VALUES TO GO LIVE ★
   ------------------------------------------------------------
   After creating your Supabase project and running
   supabase/schema.sql, paste your project values here:

     SUPABASE_URL      →  Project Settings → API → Project URL
     SUPABASE_ANON_KEY →  Project Settings → API → anon public key

   While they hold the placeholder text below, the form falls
   back to opening the visitor's email app (mailto). No real
   keys are stored in this repository.
   ============================================================ */
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";   // ← paste your Project URL
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";       // ← paste your anon public key
const CONTACT_FALLBACK_EMAIL = "jahid.chairman.ssg@gmail.com";

function supabaseReady() {
  return SUPABASE_URL.startsWith("https://") &&
         !SUPABASE_URL.includes("YOUR-PROJECT") &&
         SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
}

async function sendToSupabase({ name, email, message }) {
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
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = document.getElementById("fName").value.trim();
    const email = document.getElementById("fEmail").value.trim();
    const message = document.getElementById("fMsg").value.trim();
    if (!name || !email || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      note.textContent = "Please fill in your name, a valid email, and your message.";
      note.className = "form-note err";
      return;
    }
    if (supabaseReady()) {
      btn.disabled = true; btn.textContent = "Sending…";
      try {
        await sendToSupabase({ name, email, message });
        note.textContent = "✅ Thank you, " + name.split(" ")[0] + ". Your message has been received. We will reply to " + email + ".";
        note.className = "form-note ok";
        form.reset();
      } catch (e) {
        note.textContent = "Sorry — sending failed just now. Please email us directly at " + CONTACT_FALLBACK_EMAIL + ".";
        note.className = "form-note err";
      } finally {
        btn.disabled = false; btn.textContent = "Send Message";
      }
    } else {
      // Fallback (no Supabase configured yet): open the visitor's email app.
      const subject = encodeURIComponent("Website message from " + name);
      const body = encodeURIComponent(message + "\n\n— " + name + " (" + email + ")");
      window.location.href = `mailto:${CONTACT_FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
      note.textContent = "Opening your email app to send the message to " + CONTACT_FALLBACK_EMAIL + "…";
      note.className = "form-note ok";
    }
  });
})();

/* ---------- 3) UI HELPERS ---------- */
(function ui() {
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => links.classList.remove("open")));
  }

  const io = ("IntersectionObserver" in window) ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
  }, { threshold: 0.08 }) : null;
  document.querySelectorAll(".reveal").forEach(el => io ? io.observe(el) : el.classList.add("on"));
})();
