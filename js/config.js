/* ============================================================
   ÇOBANOĞLU — Yapılandırma
   Supabase projeni açınca buradaki iki değeri doldur.
   Bunlar HERKESE AÇIK ve güvenlidir (repoda durabilir).
   Project Settings → API sayfasından al.
   ============================================================ */
window.CBG_CONFIG = {
  SUPABASE_URL: "",       // örn: https://xxxxxxxx.supabase.co
  SUPABASE_ANON_KEY: "",  // "anon public" anahtarı
};

/* Yapılandırma dolu mu? (boşsa site statik varsayılan içerikle çalışır) */
window.CBG_READY = !!(window.CBG_CONFIG.SUPABASE_URL && window.CBG_CONFIG.SUPABASE_ANON_KEY);
