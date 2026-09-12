/* ============================================================
   ÇOBANOĞLU — Public Sayfa Hydration
   Supabase yapılandırılmış ve veri varsa DOM'u günceller.
   Yapılandırma yoksa hiçbir şey yapmaz (statik içerik kalır).
   ============================================================ */
(function () {
  "use strict";
  if (!window.CBG || !CBG.ready()) return;

  const lang = () => CBG.lang();
  const T = (row, base) => CBG.pick(row, base);
  const byId = (id) => document.getElementById(id);

  // slider kur (container'ı temizleyip yeniden çizer)
  function slider(container, images, alt) {
    if (!container) return;
    if (window.CBGSlider) CBGSlider.build(container, images, { alt: alt || "" });
  }

  let cache = {};

  async function hydrateAll() {
    const [settings, dishes, menu, gallery, videos] = await Promise.all([
      CBG.getSettings(), CBG.getHomeDishes(), CBG.getMenu(), CBG.getGallery(), CBG.getVideos(),
    ]);
    cache = { settings, dishes, menu, gallery, videos };
    render();
  }

  function render() {
    const { settings, dishes, menu, gallery, videos } = cache;
    if (settings) { renderHero(settings.hero); renderStory(settings.story); renderStats(settings.stats); renderContact(settings.contact); }
    if (dishes) renderDishes(dishes);
    if (menu) renderMenu(menu);
    if (gallery) renderGallery(gallery);
    if (videos) renderVideos(videos);
    document.dispatchEvent(new CustomEvent("cbg-refresh-counters"));
  }

  // ---------- HERO ----------
  function renderHero(hero) {
    if (!hero) return;
    const sec = document.querySelector(".hero"); if (!sec) return;
    const set = (sel, val, html) => { const el = sec.querySelector(sel); if (el && val != null && val !== "") { html ? (el.innerHTML = val) : (el.textContent = val); } };
    set(".eyebrow", lang() === "en" ? hero.eyebrow_en : hero.eyebrow_tr);
    const title = (lang() === "en" ? hero.title_en : hero.title_tr) || "";
    set("h1", emphasize(title), true);
    set(".hero-inner p", lang() === "en" ? hero.sub_en : hero.sub_tr);
    const media = sec.querySelector(".hero-media");
    if (media && hero.images && hero.images.length) {
      const img = media.querySelector("img"); if (img) img.remove();
      let holder = media.querySelector(".cbg-holder");
      if (!holder) { holder = document.createElement("div"); holder.className = "cbg-holder"; holder.style.cssText = "width:100%;height:100%"; media.insertBefore(holder, media.firstChild); }
      slider(holder, hero.images, "Çobanoğlu");
    }
  }

  // ---------- STORY ----------
  function renderStory(story) {
    if (!story) return;
    document.querySelectorAll(".split").forEach((split) => {
      const ps = split.querySelectorAll(".split-text p:not(.signature)");
      if (ps[0]) ps[0].textContent = lang() === "en" ? story.p1_en : story.p1_tr;
      if (ps[1]) ps[1].textContent = lang() === "en" ? story.p2_en : story.p2_tr;
      const media = split.querySelector(".split-media");
      if (media && story.images && story.images.length) {
        // exp-badge ve frame'i koru, sadece görseli slider'a çevir
        const badge = media.querySelector(".exp-badge");
        const frame = media.querySelector(".frame");
        const img = media.querySelector("img"); if (img) img.remove();
        const holder = document.createElement("div"); holder.className = "cbg-box";
        media.insertBefore(holder, media.firstChild);
        slider(holder, story.images, "Hikaye");
        if (frame) media.appendChild(frame);
        if (badge) media.appendChild(badge);
      }
    });
  }

  // ---------- STATS ----------
  function renderStats(stats) {
    if (!stats) return;
    const map = { experience: 0, daily_menu: 1, guests: 2, chefs: 3 };
    const counters = document.querySelectorAll("[data-count]");
    // Sıralı eşleme yerine sayfadaki 4 sayaç varsayımı
    const vals = [stats.experience, stats.daily_menu, stats.guests, stats.chefs];
    // Yalnızca stats bölümündeki sayaçları güncelle (story badge'i data-count=50)
    document.querySelectorAll(".stats [data-count]").forEach((el, i) => { if (vals[i] != null) el.setAttribute("data-count", vals[i]); });
    const storyBadge = document.querySelector(".exp-badge [data-count]");
    if (storyBadge && stats.experience != null) storyBadge.setAttribute("data-count", stats.experience);
  }

  // ---------- CONTACT ----------
  function renderContact(c) {
    if (!c) return;
    document.querySelectorAll('a[href^="tel:"]').forEach((a) => { if (c.phone_href) a.href = "tel:" + c.phone_href; if (a.textContent.trim().startsWith("+") && c.phone) a.textContent = c.phone; });
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => { if (c.email) { a.href = "mailto:" + c.email; if (a.textContent.includes("@")) a.textContent = c.email; } });
    // iletisim sayfası özel alanlar
    const set = (id, val) => { const el = byId(id); if (el && val) el.innerHTML = val; };
    set("cms-address", lang() === "en" ? c.address_en : c.address_tr);
    set("cms-phone", c.phone);
    set("cms-email", c.email);
    set("cms-hours-week", c.hours_week); set("cms-hours-sat", c.hours_sat); set("cms-hours-sun", c.hours_sun);
    const map = byId("cms-map"); if (map && c.map_embed) map.src = c.map_embed;
    const dir = document.querySelectorAll('[data-cms="dir"]'); dir.forEach((a) => { if (c.map_dir) a.href = c.map_dir; });
    // sosyal linkler
    const soc = { instagram: c.instagram, facebook: c.facebook, x: c.x, whatsapp: c.whatsapp };
    document.querySelectorAll("[data-social]").forEach((a) => {
      const k = a.getAttribute("data-social"); if (soc[k]) { a.href = soc[k]; a.style.display = ""; } else { a.style.display = "none"; }
    });
  }

  // ---------- HOME DISHES ----------
  function renderDishes(dishes) {
    const grid = document.querySelector(".dish-grid"); if (!grid || !dishes.length) return;
    grid.innerHTML = "";
    dishes.forEach((d) => {
      const card = document.createElement("article"); card.className = "dish-card";
      const badge = lang() === "en" ? d.badge_en : d.badge_tr;
      const thumb = document.createElement("div"); thumb.className = "dish-thumb";
      if (badge) { const s = document.createElement("span"); s.className = "dish-tag"; s.textContent = badge; thumb.appendChild(s); }
      const sh = document.createElement("div"); sh.style.cssText = "width:100%;height:100%"; thumb.appendChild(sh);
      card.appendChild(thumb);
      const body = document.createElement("div"); body.className = "dish-body";
      body.innerHTML = `<h3><span>${escapeHtml(T(d, "name"))}</span><span class="dish-price">${escapeHtml(d.price)}</span></h3><p>${escapeHtml(T(d, "desc"))}</p>`;
      card.appendChild(body); grid.appendChild(card);
      slider(sh, d.images || [], T(d, "name"));
    });
  }

  // ---------- MENU ----------
  function renderMenu(menu) {
    const list = document.querySelector(".menu-list"); if (!list) return;
    if (!menu.items || !menu.items.length) return; // ürün yoksa statik menüyü koru
    const filters = document.querySelector(".menu-filters");
    const catById = {}; menu.categories.forEach((c) => (catById[c.id] = c));
    // filtre butonlarını yeniden kur
    if (filters) {
      filters.innerHTML = `<button data-filter="all" class="active">${lang() === "en" ? "All" : "Tümü"}</button>` +
        menu.categories.map((c) => `<button data-filter="${c.id}">${escapeHtml(lang() === "en" ? c.name_en : c.name_tr)}</button>`).join("");
    }
    list.innerHTML = "";
    menu.items.forEach((it) => {
      const row = document.createElement("div"); row.className = "menu-item"; row.setAttribute("data-cat", it.category_id || "");
      const badge = lang() === "en" ? it.badge_en : it.badge_tr;
      const imgHolder = document.createElement("div");
      imgHolder.style.cssText = "width:92px;height:92px;border-radius:var(--radius);overflow:hidden;flex-shrink:0;box-shadow:var(--shadow-sm);position:relative";
      row.appendChild(imgHolder);
      const body = document.createElement("div"); body.className = "mi-body";
      body.innerHTML = `<div class="mi-top"><h4>${escapeHtml(T(it, "name"))}${badge ? ` <span class="badge-v">${escapeHtml(badge)}</span>` : ""}</h4><span class="dots"></span><span class="mi-price">${escapeHtml(it.price)}</span></div><p>${escapeHtml(T(it, "desc"))}</p>`;
      row.appendChild(body); list.appendChild(row);
      slider(imgHolder, it.images || [], T(it, "name"));
    });
  }

  // ---------- GALLERY ----------
  function renderGallery(items) {
    const grid = document.querySelector(".gallery-grid"); if (!grid || !items.length) return;
    grid.innerHTML = "";
    items.forEach((g) => {
      const fig = document.createElement("figure");
      if (g.size === "wide") fig.className = "wide"; if (g.size === "tall") fig.className = "tall";
      const holder = document.createElement("div"); holder.style.cssText = "width:100%;height:100%"; fig.appendChild(holder);
      const cap = lang() === "en" ? g.caption_en : g.caption_tr;
      if (cap) { const fc = document.createElement("figcaption"); fc.textContent = cap; fig.appendChild(fc); }
      grid.appendChild(fig);
      slider(holder, g.images || [], cap || "Galeri");
    });
    // lightbox img listesini tazele (main.js zaten yüklü — basit yeniden bağlama)
    document.dispatchEvent(new CustomEvent("gallery-rebuilt"));
  }

  // ---------- VIDEOS ----------
  function renderVideos(videos) {
    const block = document.querySelector(".video-block"); if (!block || !videos.length) return;
    const v = videos[0];
    block.innerHTML = "";
    if (v.kind === "youtube" || v.kind === "vimeo" || /youtube|youtu\.be|vimeo/.test(v.url)) {
      const src = toEmbed(v.url);
      block.innerHTML = `<iframe src="${escapeHtml(src)}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="${escapeHtml(T(v, "title"))}"></iframe>`;
    } else {
      block.innerHTML = `<video preload="none" ${v.poster_url ? `poster="${escapeHtml(v.poster_url)}"` : ""} playsinline><source src="${escapeHtml(v.url)}" type="video/mp4"></video>
        <div class="video-poster">${v.poster_url ? `<img src="${escapeHtml(v.poster_url)}" alt="">` : ""}<button class="play-btn" aria-label="Oynat"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button></div>`;
      const poster = block.querySelector(".video-poster"), video = block.querySelector("video");
      if (poster && video) poster.addEventListener("click", () => { poster.style.display = "none"; video.setAttribute("controls", ""); video.play().catch(() => {}); });
    }
  }
  function toEmbed(url) {
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (m) return "https://www.youtube.com/embed/" + m[1];
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return "https://player.vimeo.com/video/" + m[1];
    return url;
  }

  function escapeHtml(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  // *kelime* -> vurgulu (kırmızı italik). Eski <em>kelime</em> de çalışır.
  function emphasize(s) {
    return String(s == null ? "" : s)
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  // dil değişince yeniden render (i18n'den SONRA çalışır)
  document.addEventListener("langchange", () => { if (Object.keys(cache).length) render(); });

  // başlat
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hydrateAll);
  else hydrateAll();
})();
