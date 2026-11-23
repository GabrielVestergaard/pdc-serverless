// Paradise Donut Co. front end: loads one store's menu from the API and keeps a per-store donut box.
(() => {
  "use strict";

  const API_BASE = (window.PDC_CONFIG && window.PDC_CONFIG.apiBase || "").replace(/\/$/, "");
  const STORES = [
    { id: "provo", label: "Provo", icon: "🏔️" },
    { id: "honolulu", label: "Honolulu", icon: "🌺" },
    { id: "sydney", label: "Sydney", icon: "🌊" },
  ];
  const BOX_SIZE = 12;
  const DOZEN_DISCOUNT = 0.1;

  const $ = (id) => document.getElementById(id);
  const state = { store: null, profile: null, items: [], category: "All", query: "", sort: "featured", box: {}, detailItem: null, qty: 1 };

  // ---------- helpers ----------
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => {
    const currency = (state.profile && state.profile.currency) || "USD";
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  };
  const storage = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } },
  };
  const boxKey = () => `pdc-box-${state.store}`;
  const findItem = (id) => state.items.find((i) => i.itemId === id);
  const boxCount = () => Object.values(state.box).reduce((a, b) => a + b, 0);

  let toastTimer;
  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ---------- store switch ----------
  function renderStoreSwitch() {
    $("store-switch").innerHTML = STORES.map((s) =>
      `<button type="button" data-store="${s.id}" aria-pressed="${s.id === state.store}"><span class="flag" aria-hidden="true">${s.icon}</span>${esc(s.label)}</button>`
    ).join("");
  }

  $("store-switch").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-store]");
    if (!btn || btn.dataset.store === state.store) return;
    history.replaceState(null, "", `?store=${btn.dataset.store}`);
    loadStore(btn.dataset.store);
  });

  // ---------- hours ----------
  function storeClock(profile) {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: profile.timezone, hour: "numeric", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour").value);
    const time = new Intl.DateTimeFormat("en-US", { timeZone: profile.timezone, hour: "numeric", minute: "2-digit" }).format(now);
    return { open: hour >= profile.openHour && hour < profile.closeHour, time };
  }
  const hourLabel = (h) => new Intl.DateTimeFormat("en-US", { hour: "numeric" }).format(new Date(2000, 0, 1, h));

  function renderHero() {
    const p = state.profile;
    document.body.dataset.store = state.store;
    // each store's colors come from its PROFILE row in DynamoDB
    if (p.accent) document.body.style.setProperty("--accent", p.accent);
    if (p.paper) document.body.style.setProperty("--paper", p.paper);
    if (p.paperDeep) document.body.style.setProperty("--paper-deep", p.paperDeep);
    document.title = `Paradise Donut Co. | ${p.name}`;
    $("store-name").textContent = p.name;
    $("store-name").classList.toggle("long", p.name.length > 6);
    $("store-tagline").textContent = p.tagline;
    $("store-blurb").textContent = p.blurb;
    $("store-address").textContent = p.address;
    $("store-hours").textContent = `${hourLabel(p.openHour)} to ${hourLabel(p.closeHour)} daily`;

    const clock = storeClock(p);
    const status = $("store-status");
    status.className = `status ${clock.open ? "open" : "closed"}`;
    status.lastElementChild.textContent = `${clock.open ? "Open now" : "Closed now"}. It's ${clock.time} in ${p.name}.`;

    const banner = $("store-banner");
    banner.src = p.bannerUrl;
    banner.alt = `Illustration of the Paradise Donut shop in ${p.city}`;

    const pick = state.items.find((i) => i.featured) || state.items[0];
    const pickBtn = $("todays-pick");
    if (pick) {
      $("pick-img").src = pick.imageUrl;
      $("pick-name").textContent = pick.name;
      $("pick-price").textContent = money(pick.price);
      pickBtn.dataset.item = pick.itemId;
      pickBtn.setAttribute("aria-label", `Today's pick: ${pick.name}. View details.`);
      pickBtn.hidden = false;
    } else {
      pickBtn.hidden = true;
    }
  }
  $("todays-pick").addEventListener("click", (e) => openDetail(e.currentTarget.dataset.item));

  // ---------- menu ----------
  function renderChips() {
    const cats = ["All", ...new Set(state.items.map((i) => i.category))];
    if (!cats.includes(state.category)) state.category = "All";
    $("chips").innerHTML = cats.map((c) => `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === state.category}">${esc(c)}</button>`).join("");
  }
  $("chips").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cat]");
    if (!btn) return;
    state.category = btn.dataset.cat;
    renderChips();
    renderGrid();
  });
  $("search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); renderGrid(); });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });

  function visibleItems() {
    let list = state.items.filter((i) =>
      (state.category === "All" || i.category === state.category) &&
      (!state.query || `${i.name} ${i.description} ${i.category} ${(i.tags || []).join(" ")}`.toLowerCase().includes(state.query))
    );
    const sorters = {
      featured: (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99),
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      calories: (a, b) => a.calories - b.calories,
    };
    return list.sort(sorters[state.sort]);
  }

  function renderGrid() {
    const grid = $("grid");
    const notice = $("notice");
    const list = visibleItems();
    grid.setAttribute("aria-busy", "false");
    $("menu-count").textContent = `${list.length} of ${state.items.length} donuts`;

    if (!list.length) {
      grid.innerHTML = "";
      notice.hidden = false;
      notice.innerHTML = `<p>No donuts match your search.</p><button type="button" id="clear-filters">Show all donuts</button>`;
      $("clear-filters").onclick = () => {
        state.query = ""; state.category = "All"; $("search").value = "";
        renderChips(); renderGrid();
      };
      return;
    }
    notice.hidden = true;
    grid.innerHTML = list.map((i) => `
      <article class="card" style="--disc:${esc(i.accent || "")}">
        <button type="button" class="card-open" data-open="${esc(i.itemId)}" aria-label="${esc(i.name)}: view details">
          <div class="card-art"><img src="${esc(i.imageUrl)}" alt="" loading="lazy" width="300" height="300"></div>
        </button>
        <div class="tags">${(i.tags || []).map((t) => `<span class="tag ${t === "Best seller" ? "hot" : ""}">${esc(t)}</span>`).join("")}</div>
        <h3>${esc(i.name)}</h3>
        <p>${esc(i.description)}</p>
        <div class="card-foot">
          <span class="price">${money(i.price)}<span class="cal">${esc(i.calories)} cal</span></span>
          <button type="button" class="add" data-add="${esc(i.itemId)}" aria-label="Add ${esc(i.name)} to your box">Add</button>
        </div>
      </article>`).join("");
  }

  $("grid").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) return addToBox(add.dataset.add, 1);
    const open = e.target.closest("[data-open]");
    if (open) openDetail(open.dataset.open);
  });

  function renderSkeleton() {
    $("grid").setAttribute("aria-busy", "true");
    $("notice").hidden = true;
    $("grid").innerHTML = Array.from({ length: 6 }, () =>
      `<div class="card skeleton" aria-hidden="true"><div class="card-art"></div><div class="line" style="width:60%"></div><div class="line"></div><div class="line" style="width:40%"></div></div>`
    ).join("");
  }

  function renderError(message) {
    $("grid").innerHTML = "";
    $("grid").setAttribute("aria-busy", "false");
    const notice = $("notice");
    notice.hidden = false;
    notice.innerHTML = `<p>${esc(message)}</p><button type="button" id="retry">Try again</button>`;
    $("retry").onclick = () => loadStore(state.store);
  }

  // ---------- data ----------
  async function loadStore(storeId) {
    if (!STORES.some((s) => s.id === storeId)) storeId = STORES[0].id;
    state.store = storeId;
    state.box = storage.get(boxKey());
    renderStoreSwitch();
    renderSkeleton();
    renderTray();

    const started = performance.now();
    try {
      const res = await fetch(`${API_BASE}/items?store=${encodeURIComponent(storeId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (state.store !== storeId) return; // user switched stores mid-request
      const ms = Math.round(performance.now() - started);
      state.profile = data.profile;
      state.items = data.items;
      // drop box entries for donuts this store no longer sells
      Object.keys(state.box).forEach((id) => { if (!findItem(id)) delete state.box[id]; });
      renderHero();
      renderChips();
      renderGrid();
      renderTray();
      $("latency").textContent = `This menu came from DynamoDB through API Gateway and Lambda in ${ms} ms.`;
    } catch (err) {
      console.error("Menu request failed:", err);
      renderError("The menu didn't load. Check your connection, then try again.");
    }
  }

  // ---------- detail dialog ----------
  function openDetail(itemId) {
    const item = findItem(itemId);
    if (!item) return;
    state.detailItem = item;
    state.qty = 1;
    $("detail-art").style.setProperty("--disc", item.accent || "");
    $("detail-img").src = item.imageUrl;
    $("detail-img").alt = `${item.name} donut`;
    $("detail-tags").innerHTML = (item.tags || []).map((t) => `<span class="tag ${t === "Best seller" ? "hot" : ""}">${esc(t)}</span>`).join("");
    $("detail-name").textContent = item.name;
    $("detail-price").textContent = money(item.price);
    $("detail-desc").textContent = item.description;
    $("detail-cal").textContent = `${item.calories}`;
    $("detail-pair").textContent = item.pairsWith || "Anything";
    $("detail-allergens").textContent = (item.allergens || []).join(", ") || "None listed";
    $("qty").textContent = "1";
    $("detail").showModal();
  }
  $("qty-minus").onclick = () => { state.qty = Math.max(1, state.qty - 1); $("qty").textContent = state.qty; };
  $("qty-plus").onclick = () => { state.qty = Math.min(BOX_SIZE, state.qty + 1); $("qty").textContent = state.qty; };
  $("detail-add").onclick = () => {
    if (addToBox(state.detailItem.itemId, state.qty)) $("detail").close();
  };

  // ---------- box ----------
  function addToBox(itemId, qty) {
    const room = BOX_SIZE - boxCount();
    if (room <= 0) { toast("Your box is full. Review it to check out or swap a donut."); return false; }
    const added = Math.min(qty, room);
    state.box[itemId] = (state.box[itemId] || 0) + added;
    storage.set(boxKey(), state.box);
    renderTray(added);
    const name = findItem(itemId).name;
    toast(added < qty ? `Added ${added} ${name}. Your box is now full.` : `Added ${added} ${name} to your box.`);
    return true;
  }
  function setQty(itemId, qty) {
    if (qty <= 0) delete state.box[itemId];
    else state.box[itemId] = Math.min(qty, state.box[itemId] + (BOX_SIZE - boxCount()));
    storage.set(boxKey(), state.box);
    renderTray();
    renderBox();
  }

  function totals() {
    const subtotal = Object.entries(state.box).reduce((sum, [id, q]) => sum + (findItem(id)?.price || 0) * q, 0);
    const discount = boxCount() === BOX_SIZE ? subtotal * DOZEN_DISCOUNT : 0;
    return { subtotal, discount, total: subtotal - discount };
  }

  function renderTray(justAdded = 0) {
    const count = boxCount();
    const flat = Object.entries(state.box).flatMap(([id, q]) => Array(q).fill(findItem(id))).filter(Boolean);
    $("tray-slots").innerHTML = Array.from({ length: BOX_SIZE }, (_, i) => {
      const item = flat[i];
      const fresh = item && i >= flat.length - justAdded;
      return `<span class="slot ${fresh ? "just-added" : ""}">${item ? `<img src="${esc(item.imageUrl)}" alt="">` : ""}</span>`;
    }).join("");
    $("box-count").textContent = count;
    $("tray-review").disabled = count === 0;
    if (count === 0) {
      $("tray-title").textContent = "Your box is empty";
      $("tray-sub").textContent = "Add up to 12 donuts. A full dozen saves 10%.";
    } else {
      const { total } = totals();
      $("tray-title").textContent = `${count} of ${BOX_SIZE} donuts for ${money(total)}`;
      $("tray-sub").textContent = count === BOX_SIZE ? "Full dozen. You're saving 10%." : `Add ${BOX_SIZE - count} more for a full dozen and save 10%.`;
    }
  }

  function renderBox() {
    const entries = Object.entries(state.box).filter(([id]) => findItem(id));
    const list = $("box-list");
    list.innerHTML = entries.length ? entries.map(([id, q]) => {
      const i = findItem(id);
      return `<li>
        <img src="${esc(i.imageUrl)}" alt="">
        <div><div class="name">${esc(i.name)}</div><div class="line-price">${money(i.price)} each</div></div>
        <div class="stepper" role="group" aria-label="${esc(i.name)} quantity">
          <button type="button" data-dec="${esc(id)}" aria-label="One fewer ${esc(i.name)}">&minus;</button>
          <output>${q}</output>
          <button type="button" data-inc="${esc(id)}" aria-label="One more ${esc(i.name)}">+</button>
        </div>
      </li>`;
    }).join("") : `<li class="box-empty">Your box is empty. Add a donut from the menu to start one.</li>`;

    const t = totals();
    $("box-subtotal").textContent = money(t.subtotal);
    $("box-discount-row").hidden = !t.discount;
    $("box-discount").textContent = `−${money(t.discount)}`;
    $("box-total").textContent = money(t.total);
    const left = BOX_SIZE - boxCount();
    $("box-hint").textContent = left === 0 ? "Full dozen. The 10% discount is applied." : `Add ${left} more for a full dozen and save 10%.`;
    $("checkout").disabled = entries.length === 0;
  }

  $("box-list").addEventListener("click", (e) => {
    const dec = e.target.closest("[data-dec]");
    const inc = e.target.closest("[data-inc]");
    if (dec) setQty(dec.dataset.dec, state.box[dec.dataset.dec] - 1);
    if (inc) {
      if (boxCount() >= BOX_SIZE) return toast("Your box is full.");
      setQty(inc.dataset.inc, state.box[inc.dataset.inc] + 1);
    }
  });
  const openBox = () => { renderBox(); $("box").showModal(); };
  $("open-box").onclick = openBox;
  $("tray-review").onclick = openBox;
  $("clear-box").onclick = () => { state.box = {}; storage.set(boxKey(), state.box); renderTray(); renderBox(); toast("Your box is empty."); };
  $("checkout").onclick = () => toast("Online checkout isn't live yet. Your box is saved on this device.");

  // close dialogs when the backdrop is clicked
  document.querySelectorAll("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));

  // ---------- start ----------
  const initial = (new URLSearchParams(location.search).get("store") || "provo").toLowerCase();
  loadStore(initial);
})();
