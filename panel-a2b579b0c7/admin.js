/* ============================================================
   ÇOBANOĞLU — Admin Panel Mantığı (Supabase)
   ============================================================ */
(function () {
  "use strict";

  // ---------- Şifre göster/gizle (config'ten bağımsız) ----------
  (function () {
    var t = document.getElementById("pw-toggle"), p = document.getElementById("password");
    if (!t || !p) return;
    t.addEventListener("click", function () {
      var show = p.type === "password";
      p.type = show ? "text" : "password";
      t.querySelector(".eye").hidden = show;
      t.querySelector(".eye-off").hidden = !show;
      t.setAttribute("aria-label", show ? "Şifreyi gizle" : "Şifreyi göster");
      t.title = show ? "Şifreyi gizle" : "Şifreyi göster";
      p.focus();
    });
  })();

  // ---------- Yapılandırma kontrolü ----------
  if (!window.CBG_READY) {
    document.getElementById("config-warn").hidden = false;
    return;
  }
  // Supabase kütüphanesi CDN'den geç gelebilir — bekle, hemen "config eksik" deme
  if (!window.supabase) {
    let n = 0;
    const t = setInterval(() => {
      if (window.supabase) { clearInterval(t); init(); }
      else if (++n > 50) {
        clearInterval(t);
        const w = document.getElementById("config-warn"); w.hidden = false;
        w.querySelector(".msg").innerHTML = "Bağlantı kütüphanesi yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.";
      }
    }, 100);
    return;
  }
  init();

  function init() {
  const sb = window.supabase.createClient(
    window.CBG_CONFIG.SUPABASE_URL,
    window.CBG_CONFIG.SUPABASE_ANON_KEY
  );

  // ---------- Kısa yardımcılar ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function toast(msg, type) {
    const t = $("#toast");
    t.textContent = msg; t.className = "toast show " + (type || "");
    setTimeout(() => (t.className = "toast " + (type || "")), 2600);
  }

  const modalBack = $("#modal-back"), modalEl = $("#modal");
  function openModal(html) { modalEl.innerHTML = html; modalBack.classList.add("open"); }
  function closeModal() { modalBack.classList.remove("open"); modalEl.innerHTML = ""; }
  modalBack.addEventListener("click", (e) => { if (e.target === modalBack) closeModal(); });

  // ---------- Depolama: dosya yükle → public URL ----------
  async function uploadFile(file, folder) {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from("media").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  }

  // ---------- Görsel editörü (thumbs + ekle/sil), images dizisini mutasyonla ----------
  function imageEditor(images, folder, opts) {
    opts = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "thumbs";
    function render() {
      wrap.innerHTML = "";
      images.forEach((url, i) => {
        const t = document.createElement("div");
        t.className = "thumb";
        t.innerHTML = `<img src="${esc(url)}" alt=""><button type="button" title="Kaldır">×</button>`;
        t.querySelector("button").addEventListener("click", () => { images.splice(i, 1); render(); });
        wrap.appendChild(t);
      });
      if (!opts.single || images.length === 0) {
        const add = document.createElement("label");
        add.className = "thumb addbtn"; add.title = "Foto ekle"; add.textContent = "+";
        const inp = document.createElement("input");
        inp.type = "file"; inp.accept = "image/*"; inp.hidden = true; inp.multiple = !opts.single;
        add.appendChild(inp);
        inp.addEventListener("change", async () => {
          const files = Array.from(inp.files || []);
          for (const f of files) {
            add.innerHTML = '<span class="spinner"></span>';
            try { const url = await uploadFile(f, folder); if (opts.single) images.length = 0; images.push(url); }
            catch (e) { toast("Yükleme hatası: " + e.message, "err"); }
          }
          render();
        });
        wrap.appendChild(add);
      }
    }
    render();
    return wrap;
  }

  // ============================================================
  //  KİMLİK DOĞRULAMA
  // ============================================================
  const loginView = $("#login"), appView = $("#app");

  async function refreshAuth() {
    const { data } = await sb.auth.getSession();
    if (data.session) showApp(data.session.user);
    else showLogin();
  }
  function showLogin() { appView.hidden = true; loginView.hidden = false; }
  function showApp(user) {
    loginView.hidden = true; appView.hidden = false;
    $("#who").textContent = user.email;
    selectTab("genel");
  }

  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#login-btn"); btn.disabled = true; btn.textContent = "Giriş yapılıyor…";
    $("#login-msg").innerHTML = "";
    const { error } = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#password").value });
    btn.disabled = false; btn.textContent = "Giriş Yap";
    if (error) { $("#login-msg").innerHTML = `<div class="msg err">${esc(error.message)}</div>`; return; }
    refreshAuth();
  });
  $("#logout").addEventListener("click", async () => { await sb.auth.signOut(); showLogin(); });

  // ============================================================
  //  SEKME YÖNLENDİRME
  // ============================================================
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-tab]"); if (!b) return; selectTab(b.dataset.tab);
  });
  function selectTab(name) {
    $$("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    const fn = TABS[name]; if (fn) fn($("#panel"));
  }

  // ---------- ortak: settings oku/yaz ----------
  async function getSetting(key, def) {
    const { data } = await sb.from("settings").select("value").eq("key", key).maybeSingle();
    return (data && data.value) || def || {};
  }
  async function saveSetting(key, value) {
    const { error } = await sb.from("settings").upsert({ key, value }, { onConflict: "key" });
    if (error) throw error;
  }

  function head(title, desc) {
    return `<div class="page-title">${title}</div><div class="page-desc">${desc}</div>`;
  }

  // ============================================================
  //  SEKMELER
  // ============================================================
  const TABS = {};

  // ---------- GENEL BİLGİLER ----------
  TABS.genel = async (root) => {
    root.innerHTML = head("Genel Bilgiler", "İletişim, adres, saatler ve sosyal medya.");
    const c = await getSetting("contact");
    const card = document.createElement("div"); card.className = "card";
    card.innerHTML = `
      <h3>İletişim & Konum</h3>
      <div class="grid2">
        <div class="field"><label>Telefon (görünen)</label><input type="text" id="c_phone" value="${esc(c.phone)}"></div>
        <div class="field"><label>Telefon (arama linki) <span class="hint">boşluksuz, +90…</span></label><input type="text" id="c_phone_href" value="${esc(c.phone_href)}"></div>
        <div class="field"><label>E-posta</label><input type="text" id="c_email" value="${esc(c.email)}"></div>
        <div class="field"><label>Adres (TR)</label><input type="text" id="c_addr_tr" value="${esc(c.address_tr)}"></div>
        <div class="field"><label>Adres (EN)</label><input type="text" id="c_addr_en" value="${esc(c.address_en)}"></div>
        <div class="field"><label>Harita gömme linki <span class="hint">Google Maps → Paylaş → Yerleştir → src</span></label><input type="text" id="c_map" value="${esc(c.map_embed)}"></div>
        <div class="field"><label>Yol tarifi linki</label><input type="text" id="c_dir" value="${esc(c.map_dir)}"></div>
      </div>
      <h3 style="margin-top:12px">Çalışma Saatleri</h3>
      <div class="grid2">
        <div class="field"><label>Hafta içi</label><input type="text" id="c_hw" value="${esc(c.hours_week)}"></div>
        <div class="field"><label>Cumartesi</label><input type="text" id="c_hs" value="${esc(c.hours_sat)}"></div>
        <div class="field"><label>Pazar</label><input type="text" id="c_hsu" value="${esc(c.hours_sun)}"></div>
      </div>
      <h3 style="margin-top:12px">Sosyal Medya <span class="hint" style="font-weight:400">(boş bırakılırsa gizlenir)</span></h3>
      <div class="grid2">
        <div class="field"><label>Instagram</label><input type="text" id="c_ig" value="${esc(c.instagram)}"></div>
        <div class="field"><label>Facebook</label><input type="text" id="c_fb" value="${esc(c.facebook)}"></div>
        <div class="field"><label>X (Twitter)</label><input type="text" id="c_x" value="${esc(c.x)}"></div>
        <div class="field"><label>WhatsApp</label><input type="text" id="c_wa" value="${esc(c.whatsapp)}"></div>
      </div>
      <button class="btn btn-primary" id="save-genel">Kaydet</button>`;
    root.appendChild(card);
    $("#save-genel").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        await saveSetting("contact", {
          phone: $("#c_phone").value, phone_href: $("#c_phone_href").value, email: $("#c_email").value,
          address_tr: $("#c_addr_tr").value, address_en: $("#c_addr_en").value,
          map_embed: $("#c_map").value, map_dir: $("#c_dir").value,
          hours_week: $("#c_hw").value, hours_sat: $("#c_hs").value, hours_sun: $("#c_hsu").value,
          instagram: $("#c_ig").value, facebook: $("#c_fb").value, x: $("#c_x").value, whatsapp: $("#c_wa").value,
        });
        toast("Kaydedildi", "ok");
      } catch (err) { toast("Hata: " + err.message, "err"); }
      e.target.disabled = false;
    });
  };

  // ---------- ANASAYFA (hero + story + stats) ----------
  TABS.anasayfa = async (root) => {
    root.innerHTML = head("Anasayfa", "Hero bölümü, hikaye metni ve istatistikler.");
    const hero = await getSetting("hero"), story = await getSetting("story"), stats = await getSetting("stats");
    hero.images = hero.images || []; story.images = story.images || [];

    const card = document.createElement("div"); card.className = "card";
    card.innerHTML = `<h3>Hero (Üst Bölüm)</h3>
      <div class="grid2">
        <div class="field"><label>Üst etiket (TR)</label><input type="text" id="h_eb_tr" value="${esc(hero.eyebrow_tr)}"></div>
        <div class="field"><label>Üst etiket (EN)</label><input type="text" id="h_eb_en" value="${esc(hero.eyebrow_en)}"></div>
      </div>
      <div class="field"><label>Başlık (TR) <span class="hint">vurgulamak istediğin kelimeyi *yıldız* içine al — örn. *Közün*</span></label><input type="text" id="h_t_tr" value="${esc(hero.title_tr)}"></div>
      <div class="field"><label>Başlık (EN)</label><input type="text" id="h_t_en" value="${esc(hero.title_en)}"></div>
      <div class="field"><label>Alt metin (TR)</label><textarea id="h_s_tr">${esc(hero.sub_tr)}</textarea></div>
      <div class="field"><label>Alt metin (EN)</label><textarea id="h_s_en">${esc(hero.sub_en)}</textarea></div>
      <div class="field"><label>Arka plan görselleri <span class="hint">2+ foto = otomatik slider</span></label><div id="hero-imgs"></div></div>`;
    root.appendChild(card);
    card.querySelector("#hero-imgs").appendChild(imageEditor(hero.images, "hero"));

    const s2 = document.createElement("div"); s2.className = "card";
    s2.innerHTML = `<h3>Hikaye</h3>
      <div class="field"><label>Paragraf 1 (TR)</label><textarea id="st_p1_tr">${esc(story.p1_tr)}</textarea></div>
      <div class="field"><label>Paragraf 1 (EN)</label><textarea id="st_p1_en">${esc(story.p1_en)}</textarea></div>
      <div class="field"><label>Paragraf 2 (TR)</label><textarea id="st_p2_tr">${esc(story.p2_tr)}</textarea></div>
      <div class="field"><label>Paragraf 2 (EN)</label><textarea id="st_p2_en">${esc(story.p2_en)}</textarea></div>
      <div class="field"><label>Hikaye görselleri</label><div id="story-imgs"></div></div>`;
    root.appendChild(s2);
    s2.querySelector("#story-imgs").appendChild(imageEditor(story.images, "story"));

    const s3 = document.createElement("div"); s3.className = "card";
    s3.innerHTML = `<h3>İstatistikler</h3>
      <div class="grid2">
        <div class="field"><label>Yıllık tecrübe</label><input type="number" id="stat_exp" value="${esc(stats.experience)}"></div>
        <div class="field"><label>Günlük menü</label><input type="number" id="stat_menu" value="${esc(stats.daily_menu)}"></div>
        <div class="field"><label>Mutlu misafir</label><input type="number" id="stat_guest" value="${esc(stats.guests)}"></div>
        <div class="field"><label>Usta şef</label><input type="number" id="stat_chef" value="${esc(stats.chefs)}"></div>
      </div>`;
    root.appendChild(s3);

    const save = document.createElement("button");
    save.className = "btn btn-primary"; save.textContent = "Tümünü Kaydet";
    root.appendChild(save);
    save.addEventListener("click", async () => {
      save.disabled = true;
      try {
        await saveSetting("hero", {
          eyebrow_tr: $("#h_eb_tr").value, eyebrow_en: $("#h_eb_en").value,
          title_tr: $("#h_t_tr").value, title_en: $("#h_t_en").value,
          sub_tr: $("#h_s_tr").value, sub_en: $("#h_s_en").value, images: hero.images,
        });
        await saveSetting("story", {
          p1_tr: $("#st_p1_tr").value, p1_en: $("#st_p1_en").value,
          p2_tr: $("#st_p2_tr").value, p2_en: $("#st_p2_en").value, images: story.images,
        });
        await saveSetting("stats", {
          experience: +$("#stat_exp").value || 0, daily_menu: +$("#stat_menu").value || 0,
          guests: +$("#stat_guest").value || 0, chefs: +$("#stat_chef").value || 0,
        });
        toast("Kaydedildi", "ok");
      } catch (err) { toast("Hata: " + err.message, "err"); }
      save.disabled = false;
    });
  };

  // ---------- Ortak liste + editör üreteci (menü / lezzetler / galeri / video) ----------
  async function listCRUD(root, cfg) {
    root.innerHTML = head(cfg.title, cfg.desc);
    const bar = document.createElement("div");
    bar.innerHTML = `<button class="btn btn-primary" id="add-new">+ Yeni Ekle</button>`;
    bar.style.marginBottom = "18px";
    root.appendChild(bar);
    const listEl = document.createElement("div"); root.appendChild(listEl);

    let rows = [];
    async function load() {
      let q = sb.from(cfg.table).select("*");
      cfg.order.forEach((o) => (q = q.order(o)));
      const { data, error } = await q;
      if (error) { listEl.innerHTML = `<div class="msg err">${esc(error.message)}</div>`; return; }
      rows = data || [];
      draw();
    }
    function draw() {
      if (!rows.length) { listEl.innerHTML = `<div class="empty">Henüz kayıt yok. “Yeni Ekle” ile başla.</div>`; return; }
      listEl.innerHTML = "";
      rows.forEach((row) => {
        const item = document.createElement("div"); item.className = "item";
        const imgs = (row.images || []); const first = imgs[0] || row.poster_url || "";
        const thumb = first ? `<div class="thumbs"><div class="thumb"><img src="${esc(first)}"></div>${imgs.length > 1 ? `<span style="align-self:center;color:var(--muted);font-size:.8rem">+${imgs.length - 1}</span>` : ""}</div>` : `<div class="thumbs"></div>`;
        item.innerHTML = `${thumb}<div class="body">${cfg.rowHtml(row)}</div>`;
        const acts = document.createElement("div"); acts.className = "row-actions";
        const edit = document.createElement("button"); edit.className = "btn btn-ghost btn-sm"; edit.textContent = "Düzenle";
        edit.addEventListener("click", () => editor(row));
        const del = document.createElement("button"); del.className = "btn btn-danger btn-sm"; del.textContent = "Sil";
        del.addEventListener("click", async () => {
          if (!confirm("Bu kaydı silmek istediğine emin misin?")) return;
          const { error } = await sb.from(cfg.table).delete().eq("id", row.id);
          if (error) return toast("Hata: " + error.message, "err");
          toast("Silindi", "ok"); load();
        });
        acts.appendChild(edit); acts.appendChild(del);
        item.querySelector(".body").appendChild(acts);
        listEl.appendChild(item);
      });
    }
    function editor(row) {
      const isNew = !row;
      const data = Object.assign({}, cfg.defaults, row || {});
      data.images = (row && row.images ? row.images.slice() : []);
      openModal(`<h3>${isNew ? "Yeni" : "Düzenle"}</h3><form id="ed-form">${cfg.formHtml(data, cfg.extra || {})}</form>
        <div class="modal-foot"><button class="btn btn-ghost" id="ed-cancel">İptal</button><button class="btn btn-primary" id="ed-save">Kaydet</button></div>`);
      if (cfg.hasImages) {
        const holder = $("#ed-images"); if (holder) holder.appendChild(imageEditor(data.images, cfg.folder, cfg.imgOpts));
      }
      if (cfg.afterForm) cfg.afterForm(data);
      $("#ed-cancel").addEventListener("click", closeModal);
      $("#ed-save").addEventListener("click", async (e) => {
        e.target.disabled = true;
        const payload = cfg.collect(data);
        if (cfg.hasImages) payload.images = data.images;
        let res;
        if (isNew) res = await sb.from(cfg.table).insert(payload);
        else res = await sb.from(cfg.table).update(payload).eq("id", row.id);
        e.target.disabled = false;
        if (res.error) return toast("Hata: " + res.error.message, "err");
        toast("Kaydedildi", "ok"); closeModal(); load();
      });
    }
    $("#add-new").addEventListener("click", () => editor(null));
    load();
    // kategori vs. gibi ek verileri yüklemek için
    if (cfg.preload) await cfg.preload();
  }

  // ---------- MENÜ ----------
  TABS.menu = async (root) => {
    const { data: cats } = await sb.from("menu_categories").select("*").order("sort");
    const catOptions = (sel) => (cats || []).map((c) => `<option value="${c.id}" ${sel === c.id ? "selected" : ""}>${esc(c.name_tr)}</option>`).join("");
    const catName = (id) => { const c = (cats || []).find((x) => x.id === id); return c ? c.name_tr : "—"; };
    await listCRUD(root, {
      title: "Menü", desc: "Ürünleri ekle, düzenle, foto yükle. Bir ürüne 2+ foto eklersen slider olur.",
      table: "menu_items", order: ["sort", "created_at"], hasImages: true, folder: "menu",
      defaults: { name_tr: "", name_en: "", desc_tr: "", desc_en: "", price: "", badge_tr: "", badge_en: "", sort: 0, is_visible: true, category_id: (cats && cats[0] && cats[0].id) || null },
      rowHtml: (r) => `<h4>${esc(r.name_tr)} ${r.is_visible ? "" : '<span style="color:var(--muted);font-size:.8rem">(gizli)</span>'}</h4>
        <div class="meta">${esc(catName(r.category_id))}${r.badge_tr ? " · " + esc(r.badge_tr) : ""}</div>
        <div class="price">${esc(r.price)}</div>`,
      formHtml: (d) => `
        <div class="field"><label>Kategori</label><select id="f_cat">${catOptions(d.category_id)}</select></div>
        <div class="grid2">
          <div class="field"><label>İsim (TR)</label><input type="text" id="f_ntr" value="${esc(d.name_tr)}"></div>
          <div class="field"><label>İsim (EN)</label><input type="text" id="f_nen" value="${esc(d.name_en)}"></div>
        </div>
        <div class="field"><label>Açıklama (TR)</label><textarea id="f_dtr">${esc(d.desc_tr)}</textarea></div>
        <div class="field"><label>Açıklama (EN)</label><textarea id="f_den">${esc(d.desc_en)}</textarea></div>
        <div class="grid2">
          <div class="field"><label>Fiyat <span class="hint">örn. ₺320</span></label><input type="text" id="f_price" value="${esc(d.price)}"></div>
          <div class="field"><label>Sıra</label><input type="number" id="f_sort" value="${esc(d.sort)}"></div>
          <div class="field"><label>Etiket (TR) <span class="hint">örn. Şefin Seçimi</span></label><input type="text" id="f_btr" value="${esc(d.badge_tr)}"></div>
          <div class="field"><label>Etiket (EN)</label><input type="text" id="f_ben" value="${esc(d.badge_en)}"></div>
        </div>
        <div class="field"><label><input type="checkbox" id="f_vis" ${d.is_visible ? "checked" : ""}> Menüde görünsün</label></div>
        <div class="field"><label>Fotoğraflar</label><div id="ed-images"></div></div>`,
      collect: (d) => ({
        category_id: $("#f_cat").value || null, name_tr: $("#f_ntr").value, name_en: $("#f_nen").value,
        desc_tr: $("#f_dtr").value, desc_en: $("#f_den").value, price: $("#f_price").value,
        badge_tr: $("#f_btr").value, badge_en: $("#f_ben").value, sort: +$("#f_sort").value || 0, is_visible: $("#f_vis").checked,
      }),
    });
  };

  // ---------- İMZA LEZZETLER ----------
  TABS.lezzetler = async (root) => {
    await listCRUD(root, {
      title: "İmza Lezzetler", desc: "Anasayfada öne çıkan tabaklar.",
      table: "home_dishes", order: ["sort", "created_at"], hasImages: true, folder: "dishes",
      defaults: { name_tr: "", name_en: "", desc_tr: "", desc_en: "", price: "", badge_tr: "", badge_en: "", sort: 0, is_visible: true },
      rowHtml: (r) => `<h4>${esc(r.name_tr)}</h4><div class="meta">${r.badge_tr ? esc(r.badge_tr) : ""}</div><div class="price">${esc(r.price)}</div>`,
      formHtml: (d) => `
        <div class="grid2">
          <div class="field"><label>İsim (TR)</label><input type="text" id="f_ntr" value="${esc(d.name_tr)}"></div>
          <div class="field"><label>İsim (EN)</label><input type="text" id="f_nen" value="${esc(d.name_en)}"></div>
        </div>
        <div class="field"><label>Açıklama (TR)</label><textarea id="f_dtr">${esc(d.desc_tr)}</textarea></div>
        <div class="field"><label>Açıklama (EN)</label><textarea id="f_den">${esc(d.desc_en)}</textarea></div>
        <div class="grid2">
          <div class="field"><label>Fiyat</label><input type="text" id="f_price" value="${esc(d.price)}"></div>
          <div class="field"><label>Sıra</label><input type="number" id="f_sort" value="${esc(d.sort)}"></div>
          <div class="field"><label>Etiket (TR)</label><input type="text" id="f_btr" value="${esc(d.badge_tr)}"></div>
          <div class="field"><label>Etiket (EN)</label><input type="text" id="f_ben" value="${esc(d.badge_en)}"></div>
        </div>
        <div class="field"><label>Fotoğraflar <span class="hint">2+ = slider</span></label><div id="ed-images"></div></div>`,
      collect: () => ({
        name_tr: $("#f_ntr").value, name_en: $("#f_nen").value, desc_tr: $("#f_dtr").value, desc_en: $("#f_den").value,
        price: $("#f_price").value, badge_tr: $("#f_btr").value, badge_en: $("#f_ben").value, sort: +$("#f_sort").value || 0, is_visible: true,
      }),
    });
  };

  // ---------- GALERİ ----------
  TABS.galeri = async (root) => {
    await listCRUD(root, {
      title: "Galeri", desc: "Fotoğrafları yükle. Bir öğeye birden çok foto eklersen o kutu slider olur.",
      table: "gallery_items", order: ["sort", "created_at"], hasImages: true, folder: "gallery",
      defaults: { caption_tr: "", caption_en: "", size: "normal", sort: 0 },
      rowHtml: (r) => `<h4>${esc(r.caption_tr) || "(başlıksız)"}</h4><div class="meta">Boyut: ${esc(r.size)}</div>`,
      formHtml: (d) => `
        <div class="grid2">
          <div class="field"><label>Başlık (TR)</label><input type="text" id="f_ctr" value="${esc(d.caption_tr)}"></div>
          <div class="field"><label>Başlık (EN)</label><input type="text" id="f_cen" value="${esc(d.caption_en)}"></div>
          <div class="field"><label>Kutu boyutu</label><select id="f_size">
            <option value="normal" ${d.size === "normal" ? "selected" : ""}>Normal</option>
            <option value="wide" ${d.size === "wide" ? "selected" : ""}>Geniş</option>
            <option value="tall" ${d.size === "tall" ? "selected" : ""}>Uzun</option>
          </select></div>
          <div class="field"><label>Sıra</label><input type="number" id="f_sort" value="${esc(d.sort)}"></div>
        </div>
        <div class="field"><label>Fotoğraf(lar)</label><div id="ed-images"></div></div>`,
      collect: () => ({ caption_tr: $("#f_ctr").value, caption_en: $("#f_cen").value, size: $("#f_size").value, sort: +$("#f_sort").value || 0 }),
    });
  };

  // ---------- VİDEO ----------
  TABS.video = async (root) => {
    root.innerHTML = head("Video", "Video dosyası yükle (otomatik link oluşur) ya da YouTube/Vimeo linki yapıştır.");
    const bar = document.createElement("div"); bar.style.marginBottom = "18px";
    bar.innerHTML = `<button class="btn btn-primary" id="add-vid">+ Yeni Video</button>`;
    root.appendChild(bar);
    const listEl = document.createElement("div"); root.appendChild(listEl);

    async function load() {
      const { data } = await sb.from("videos").select("*").order("sort");
      const rows = data || [];
      if (!rows.length) { listEl.innerHTML = `<div class="empty">Henüz video yok.</div>`; return; }
      listEl.innerHTML = "";
      rows.forEach((r) => {
        const item = document.createElement("div"); item.className = "item";
        item.innerHTML = `<div class="thumbs">${r.poster_url ? `<div class="thumb"><img src="${esc(r.poster_url)}"></div>` : ""}</div>
          <div class="body"><h4>${esc(r.title_tr) || "(başlıksız)"}</h4>
          <div class="meta">${esc(r.kind)} · ${esc((r.url || "").slice(0, 48))}…</div></div>`;
        const acts = document.createElement("div"); acts.className = "row-actions";
        const ed = document.createElement("button"); ed.className = "btn btn-ghost btn-sm"; ed.textContent = "Düzenle";
        ed.addEventListener("click", () => editor(r));
        const del = document.createElement("button"); del.className = "btn btn-danger btn-sm"; del.textContent = "Sil";
        del.addEventListener("click", async () => { if (!confirm("Silinsin mi?")) return; await sb.from("videos").delete().eq("id", r.id); toast("Silindi", "ok"); load(); });
        acts.appendChild(ed); acts.appendChild(del); item.querySelector(".body").appendChild(acts);
        listEl.appendChild(item);
      });
    }

    function editor(row) {
      const isNew = !row; const d = Object.assign({ title_tr: "", title_en: "", url: "", poster_url: "", kind: "file", sort: 0 }, row || {});
      const poster = [d.poster_url].filter(Boolean);
      openModal(`<h3>${isNew ? "Yeni Video" : "Video Düzenle"}</h3>
        <div class="grid2">
          <div class="field"><label>Başlık (TR)</label><input type="text" id="v_ttr" value="${esc(d.title_tr)}"></div>
          <div class="field"><label>Başlık (EN)</label><input type="text" id="v_ten" value="${esc(d.title_en)}"></div>
        </div>
        <div class="field"><label>Video dosyası yükle <span class="hint">yükleyince link otomatik oluşur</span></label>
          <input type="file" id="v_file" accept="video/*"><div id="v_upstate"></div></div>
        <div class="field"><label>Video linki (URL) <span class="hint">yüklenen dosya buraya gelir; veya YouTube/Vimeo linki yapıştır</span></label>
          <input type="text" id="v_url" value="${esc(d.url)}"></div>
        <div class="field"><label>Tür</label><select id="v_kind">
          <option value="file" ${d.kind === "file" ? "selected" : ""}>Dosya</option>
          <option value="youtube" ${d.kind === "youtube" ? "selected" : ""}>YouTube</option>
          <option value="vimeo" ${d.kind === "vimeo" ? "selected" : ""}>Vimeo</option></select></div>
        <div class="field"><label>Kapak görseli (poster)</label><div id="v_poster"></div></div>
        <div class="field"><label>Sıra</label><input type="number" id="v_sort" value="${esc(d.sort)}"></div>
        <div class="modal-foot"><button class="btn btn-ghost" id="v_cancel">İptal</button><button class="btn btn-primary" id="v_save">Kaydet</button></div>`);
      $("#v_poster").appendChild(imageEditor(poster, "video-poster", { single: true }));
      $("#v_file").addEventListener("change", async (e) => {
        const f = e.target.files[0]; if (!f) return;
        $("#v_upstate").innerHTML = '<span class="uploading"><span class="spinner"></span> Yükleniyor…</span>';
        try { const url = await uploadFile(f, "video"); $("#v_url").value = url; $("#v_kind").value = "file"; $("#v_upstate").innerHTML = '<span style="color:var(--ok)">Yüklendi ✓</span>'; }
        catch (err) { $("#v_upstate").innerHTML = `<span style="color:var(--err)">Hata: ${esc(err.message)}</span>`; }
      });
      $("#v_cancel").addEventListener("click", closeModal);
      $("#v_save").addEventListener("click", async (e) => {
        e.target.disabled = true;
        const payload = { title_tr: $("#v_ttr").value, title_en: $("#v_ten").value, url: $("#v_url").value, kind: $("#v_kind").value, poster_url: poster[0] || "", sort: +$("#v_sort").value || 0 };
        const res = isNew ? await sb.from("videos").insert(payload) : await sb.from("videos").update(payload).eq("id", row.id);
        e.target.disabled = false;
        if (res.error) return toast("Hata: " + res.error.message, "err");
        toast("Kaydedildi", "ok"); closeModal(); load();
      });
    }
    $("#add-vid").addEventListener("click", () => editor(null));
    load();
  };

  // ---------- Başlat ----------
  sb.auth.onAuthStateChange((_e, session) => { if (!session) showLogin(); });
  refreshAuth();
  } // init sonu
})();
