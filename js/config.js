/* ============================================================
   ÇOBANOĞLU — Yapılandırma
   Supabase projeni açınca buradaki iki değeri doldur.
   Bunlar HERKESE AÇIK ve güvenlidir (repoda durabilir).
   Project Settings → API sayfasından al.
   ============================================================ */
window.CBG_CONFIG = {
  SUPABASE_URL: "https://sxfczfufmfozvwnenxob.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZmN6ZnVmbWZvenZ3bmVueG9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTcwMDUsImV4cCI6MjEwNDc5MzAwNX0.7xP1NlpK-0G3lj_TAwDNjxni2tQnnvcF2zemvxjDaWI", // anon public (JWT) — güvenli
};

/* Yapılandırma dolu mu? (boşsa site statik varsayılan içerikle çalışır) */
window.CBG_READY = !!(window.CBG_CONFIG.SUPABASE_URL && window.CBG_CONFIG.SUPABASE_ANON_KEY);
