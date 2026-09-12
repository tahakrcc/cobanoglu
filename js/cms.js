/* ============================================================
   ÇOBANOĞLU — CMS Veri Katmanı (Supabase)
   Public sayfalar buradan veri çeker. Yapılandırma boşsa
   sessizce devre dışı kalır (site statik varsayılanla çalışır).
   ============================================================ */
window.CBG = (function () {
  "use strict";

  let client = null;
  function db() {
    if (client) return client;
    if (!window.CBG_READY || !window.supabase) return null;
    client = window.supabase.createClient(
      window.CBG_CONFIG.SUPABASE_URL,
      window.CBG_CONFIG.SUPABASE_ANON_KEY
    );
    return client;
  }

  const lang = () => (localStorage.getItem("cbg-lang") === "en" ? "en" : "tr");

  // Belirli bir dilin alanını seç: pick(row,"name") -> row.name_tr / row.name_en
  function pick(row, base) {
    const v = row[base + "_" + lang()];
    return (v != null && v !== "") ? v : (row[base + "_tr"] ?? row[base + "_en"] ?? "");
  }

  async function getSettings() {
    const c = db(); if (!c) return null;
    const { data, error } = await c.from("settings").select("key,value");
    if (error) { console.warn("[CBG] settings", error.message); return null; }
    const out = {};
    (data || []).forEach((r) => (out[r.key] = r.value));
    return out;
  }

  async function getMenu() {
    const c = db(); if (!c) return null;
    const [{ data: cats }, { data: items }] = await Promise.all([
      c.from("menu_categories").select("*").order("sort"),
      c.from("menu_items").select("*").eq("is_visible", true).order("sort"),
    ]);
    if (!cats) return null;
    return { categories: cats, items: items || [] };
  }

  async function getHomeDishes() {
    const c = db(); if (!c) return null;
    const { data } = await c.from("home_dishes").select("*").eq("is_visible", true).order("sort");
    return data || [];
  }

  async function getGallery() {
    const c = db(); if (!c) return null;
    const { data } = await c.from("gallery_items").select("*").order("sort");
    return data || [];
  }

  async function getVideos() {
    const c = db(); if (!c) return null;
    const { data } = await c.from("videos").select("*").order("sort");
    return data || [];
  }

  return { db, lang, pick, getSettings, getMenu, getHomeDishes, getGallery, getVideos, ready: () => !!window.CBG_READY };
})();
