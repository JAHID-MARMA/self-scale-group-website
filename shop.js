/* ============================================================
   Self Scale Group — Shop v1
   ------------------------------------------------------------
   Product list + bKash order flow + "My products" downloads.

   This file REUSES the Supabase client and config created in
   app.js (supabaseClient / supabaseReady / CONTACT_FALLBACK_EMAIL).
   Load order in shop.html: supabase-js CDN → app.js → shop.js.
   Do NOT redeclare SUPABASE_URL / SUPABASE_ANON_KEY here.

   Honesty rules (Founder):
   - Products and prices come ONLY from the Supabase "products"
     table. Nothing is invented in code.
   - Card/Stripe checkout is disabled: Stripe does not serve
     Bangladesh. No fake checkout, no external payment links.
   - An order is only "pending" until the Founder personally
     confirms the bKash payment and grants the entitlement.
   ============================================================ */

/* ★ FOUNDER: set the real bKash number here before selling. ★
   While it says TO BE SET BY FOUNDER, the shop shows that exact
   text to customers — nobody is told to send money anywhere. */
const BKASH_NUMBER = "TO BE SET BY FOUNDER";

(function shop() {
  const grid = document.getElementById("productGrid");
  if (!grid) return; /* not the shop page */

  const shopNote = document.getElementById("shopNote");
  const buyPanel = document.getElementById("buyPanel");
  const buyTitle = document.getElementById("buyTitle");
  const buyPrice = document.getElementById("buyPrice");
  const bkashNumberEl = document.getElementById("bkashNumber");
  const trxEl = document.getElementById("trxId");
  const senderEl = document.getElementById("senderNumber");
  const bkashBtn = document.getElementById("bkashSubmit");
  const buyNote = document.getElementById("buyNote");
  const myNote = document.getElementById("myNote");
  const myList = document.getElementById("myList");
  const pendingList = document.getElementById("pendingList");

  let currentUser = null;
  let selectedProduct = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtPrice(v) {
    const n = Number(v);
    if (!isFinite(n)) return "";
    return "৳" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
  }
  function sayShop(msg, kind) {
    shopNote.textContent = msg;
    shopNote.className = "form-note" + (kind ? " " + kind : "");
  }
  function sayBuy(msg, kind) {
    buyNote.textContent = msg;
    buyNote.className = "form-note" + (kind ? " " + kind : "");
  }
  function sayMy(msg, kind) {
    myNote.textContent = msg;
    myNote.className = "form-note" + (kind ? " " + kind : "");
  }

  /* ---------- not connected: stay honest, offer email ---------- */
  if (!supabaseClient) {
    sayShop("The shop is not ready yet, so we cannot show products right now. Please email us at " +
      CONTACT_FALLBACK_EMAIL + " and we will help you.", "warn");
    sayMy("Log in is not available right now, so we cannot show your products. Please email us at " +
      CONTACT_FALLBACK_EMAIL + " and we will help you.", "warn");
    return;
  }

  bkashNumberEl.textContent = BKASH_NUMBER;

  /* ==========================================================
     1) PRODUCT LIST — from Supabase "products" (active only)
     ========================================================== */
  async function loadProducts() {
    sayShop("Loading products…", "");
    const { data, error } = await supabaseClient
      .from("products")
      .select("id, name, description, price_bdt")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (error) {
      grid.innerHTML = "";
      sayShop("We could not load the products just now. Please try again in a little while, or email us at " +
        CONTACT_FALLBACK_EMAIL + " and we will help you.", "err");
      return;
    }
    if (!data || data.length === 0) {
      grid.innerHTML =
        '<p class="shop-empty">Our first product is being prepared by KSM JAHID. Please check back soon.</p>';
      sayShop("", "");
      return;
    }

    sayShop("", "");
    grid.innerHTML = data.map(p => `
      <article class="svc shop-card">
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description || "")}</p>
        <p class="price">${esc(fmtPrice(p.price_bdt))}</p>
        <button class="btn btn-gold" type="button" data-buy="${esc(p.id)}">Buy this</button>
      </article>`).join("");

    grid.querySelectorAll("[data-buy]").forEach(btn => {
      btn.addEventListener("click", () => {
        const p = data.find(x => String(x.id) === btn.getAttribute("data-buy"));
        if (p) openBuy(p);
      });
    });
  }

  /* ==========================================================
     2) BUY FLOW — login required; bKash pending order
     ========================================================== */
  function openBuy(product) {
    if (!currentUser) {
      buyPanel.hidden = false;
      buyTitle.textContent = product.name;
      buyPrice.textContent = fmtPrice(product.price_bdt);
      sayBuy("Please log in or make an account first. We need your account so we can put your product in the right place for you.", "warn");
      document.getElementById("buyLoginLink").hidden = false;
      document.getElementById("bkashBox").hidden = true;
      buyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    selectedProduct = product;
    buyPanel.hidden = false;
    buyTitle.textContent = product.name;
    buyPrice.textContent = fmtPrice(product.price_bdt);
    document.getElementById("buyLoginLink").hidden = true;
    document.getElementById("bkashBox").hidden = false;
    sayBuy("Please pay by bKash first, then put your Trx ID below. Once the Founder confirms your payment, your product will appear in My Products.", "");
    buyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function mark(field, bad) {
    if (bad) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
    return !bad;
  }
  [trxEl, senderEl].forEach(f => f.addEventListener("input", () => f.removeAttribute("aria-invalid")));

  bkashBtn.addEventListener("click", async () => {
    if (!selectedProduct || !currentUser) {
      sayBuy("Please log in and choose a product first.", "err");
      return;
    }
    const trx = trxEl.value.trim();
    const sender = senderEl.value.trim();
    const okTrx = mark(trxEl, trx.length < 6);
    const okSender = mark(senderEl, !/^01\d{9}$/.test(sender));
    if (!okTrx) { sayBuy("Please put the bKash Trx ID from your payment here. It has at least 6 characters.", "err"); trxEl.focus(); return; }
    if (!okSender) { sayBuy("Please put the 11-digit mobile number you paid from. It should start with 01.", "err"); senderEl.focus(); return; }

    bkashBtn.disabled = true;
    const original = bkashBtn.textContent;
    bkashBtn.textContent = "Sending…";
    try {
      const { error } = await supabaseClient.from("orders").insert({
        user_id: currentUser.id,
        product_id: selectedProduct.id,
        amount: selectedProduct.price_bdt,
        method: "bkash",
        trx_id: trx,
        sender_number: sender,
        status: "pending",
      });
      if (error) throw error;
      trxEl.value = ""; senderEl.value = "";
      sayBuy("Thank you — we have your order. Payment check in progress. Once your bKash payment is confirmed, your product will appear in My Products below.", "ok");
      loadMyArea();
    } catch (e) {
      sayBuy("We could not send your order just now. Please check your connection and try again, or email us at " + CONTACT_FALLBACK_EMAIL + " and we will help you.", "err");
    } finally {
      bkashBtn.disabled = false;
      bkashBtn.textContent = original;
    }
  });

  /* ==========================================================
     3) MY PRODUCTS — approved entitlements + pending orders
     ========================================================== */
  async function loadMyArea() {
    myList.innerHTML = "";
    pendingList.innerHTML = "";
    if (!currentUser) {
      sayMy("Please log in to see your products.", "");
      return;
    }
    sayMy("Loading your products…", "");

    const [ents, pend] = await Promise.all([
      supabaseClient
        .from("entitlements")
        .select("id, file_path, granted_at, products(name)")
        .order("granted_at", { ascending: false }),
      supabaseClient
        .from("orders")
        .select("id, amount, method, created_at, products(name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    sayMy("", "");
    if (ents.error) {
      sayMy("We could not load your products just now. Please try again in a little while.", "err");
    } else if (!ents.data || ents.data.length === 0) {
      myList.innerHTML = '<p class="shop-empty">Nothing here yet. After we confirm a payment, your product will appear on this page.</p>';
    } else {
      myList.innerHTML = ents.data.map(e => `
        <div class="dl-row">
          <span class="dl-name">${esc(e.products ? e.products.name : "Product")}</span>
          <button class="btn btn-gold" type="button" data-dl="${esc(e.id)}">Download</button>
        </div>`).join("");
      myList.querySelectorAll("[data-dl]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const ent = ents.data.find(x => String(x.id) === btn.getAttribute("data-dl"));
          if (ent) download(ent, btn);
        });
      });
    }

    if (!pend.error && pend.data && pend.data.length > 0) {
      pendingList.innerHTML =
        '<h3 class="pending-title">Orders being checked</h3>' +
        pend.data.map(o => `
          <div class="dl-row">
            <span class="dl-name">${esc(o.products ? o.products.name : "Product")} — ${esc(fmtPrice(o.amount))}</span>
            <span class="chip-pending">Payment check in progress</span>
          </div>`).join("");
    }
  }

  async function download(ent, btn) {
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = "Getting your link…";
    try {
      const { data, error } = await supabaseClient.storage
        .from("product-files")
        .createSignedUrl(ent.file_path, 300);
      if (error || !data || !data.signedUrl) throw error || new Error("no url");
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      sayMy("Your download has started. This link is private and lasts 5 minutes. If it runs out, just press Download again.", "ok");
    } catch (e) {
      sayMy("We could not prepare your download just now. Please try again, or email us at " + CONTACT_FALLBACK_EMAIL + " and we will help you.", "err");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  /* ==========================================================
     4) AUTH STATE — restore session, keep UI in sync
     ========================================================== */
  function setUser(session) {
    currentUser = session && session.user ? session.user : null;
    loadMyArea();
    if (!currentUser && selectedProduct) { selectedProduct = null; }
  }
  supabaseClient.auth.getSession()
    .then(({ data }) => setUser(data ? data.session : null))
    .catch(() => setUser(null));
  supabaseClient.auth.onAuthStateChange((_event, session) => setUser(session));

  loadProducts();
})();
