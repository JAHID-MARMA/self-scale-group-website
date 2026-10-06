# Self Scale Group — Company Website

A fast, premium, mobile-responsive static website for **Self Scale Group**, the AI-native company founded by Muhammad Jahid Hasan (KSM JAHID). No build step, no framework — plain HTML, CSS and JavaScript. Open `index.html` and it works.

## Structure

```
self-scale-website/
├── index.html          # All page sections (hero, about, leadership, team, services, contact)
├── style.css           # Navy (#0a1a38) + gold (#f4c542) premium theme, responsive
├── app.js              # Team directory, contact-form logic (Supabase-ready), small UI helpers
├── assets/
│   └── photos/         # founder.jpg, ceo.jpg + 16 department-lead portraits
├── supabase/
│   └── schema.sql      # Creates the `website_messages` table (RLS, insert-only for anon)
└── README.md
```

- **Hero** — Self Scale Group with Founder & Chairman photo and tagline.
- **About** — what the company is and how it works.
- **Leadership** — Founder & Chairman and Group CEO, with official emails.
- **Team** — all 16 department leads with photo, designation and official email (rendered from the directory in `app.js`).
- **Services** — six service cards.
- **Contact** — contact details plus a "Send a message" form.

## Run locally

Just open `index.html` in a browser. Everything works offline except Google Fonts and (when configured) the Supabase form submission.

## Deploy to Netlify

**Option A — drag & drop (fastest):**
1. Go to [app.netlify.com](https://app.netlify.com) → Sites → "Add new site" → "Deploy manually".
2. Drag the whole `self-scale-website/` folder onto the drop zone.
3. Netlify publishes it and gives a live URL (change the site name in Site settings if you want).

**Option B — GitHub connect (auto-deploy on every push):**
1. Push this folder to a GitHub repository.
2. In Netlify: "Add new site" → "Import from Git" → choose the repo.
3. Build command: leave empty. Publish directory: `.` (or the folder name if it's a subfolder).
4. Deploy. Every future push re-publishes automatically.

## Activate the contact form with Supabase (optional, free)

Until this is done, the form falls back to opening the visitor's own email app (`mailto:`) — the site works either way.

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the whole contents of `supabase/schema.sql`, and run it. This creates the `website_messages` table with Row Level Security: anonymous visitors can **insert only** — they cannot read, edit or delete messages.
3. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.
4. Open `app.js`, find the clearly-marked **SUPABASE CONFIG BLOCK** near the top of the form section, and paste:
   ```js
   const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
   ```
5. Re-deploy (or re-push). Submitted messages now land in Supabase → **Table Editor → `website_messages`**.

> The anon key is designed to be public — it is safe in the website code **because** the RLS policy allows inserts only. Never put the `service_role` key in website code.

## Notes

- Photos in `assets/photos/` are web-optimized (max 900px wide). To change a portrait, replace the file with the same name.
- To update a team member, edit the `TEAM` list at the top of `app.js` — the grid re-renders automatically.
- Netlify deployment and GitHub publishing are done by the Group CEO, not by this folder.
