-- ============================================================
-- ÇOBANOĞLU KEBAP — Supabase Şeması
-- Supabase Dashboard → SQL Editor → New query → yapıştır → RUN
-- Bir kez çalıştır. Tekrar çalıştırmak güvenli (IF NOT EXISTS / ON CONFLICT).
-- ============================================================

-- ---------- UZANTILAR ----------
create extension if not exists "pgcrypto";

-- ---------- ORTAK: updated_at tetikleyici ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============================================================
-- 1) GENEL AYARLAR (anahtar/değer, jsonb)
--    hero, story, stats, contact, features gibi tekil içerikler
-- ============================================================
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated before update on public.settings
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2) MENÜ KATEGORİLERİ
-- ============================================================
create table if not exists public.menu_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name_tr     text not null,
  name_en     text not null default '',
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3) MENÜ ÜRÜNLERİ  (images: slider için URL dizisi)
-- ============================================================
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid references public.menu_categories(id) on delete set null,
  name_tr      text not null,
  name_en      text not null default '',
  desc_tr      text not null default '',
  desc_en      text not null default '',
  price        text not null default '',
  badge_tr     text not null default '',
  badge_en     text not null default '',
  images       jsonb not null default '[]'::jsonb,
  sort         int  not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
drop trigger if exists trg_menu_items_updated on public.menu_items;
create trigger trg_menu_items_updated before update on public.menu_items
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4) ANASAYFA İMZA LEZZETLER  (images: slider)
-- ============================================================
create table if not exists public.home_dishes (
  id          uuid primary key default gen_random_uuid(),
  name_tr     text not null,
  name_en     text not null default '',
  desc_tr     text not null default '',
  desc_en     text not null default '',
  price       text not null default '',
  badge_tr    text not null default '',
  badge_en    text not null default '',
  images      jsonb not null default '[]'::jsonb,
  sort        int  not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_home_dishes_updated on public.home_dishes;
create trigger trg_home_dishes_updated before update on public.home_dishes
  for each row execute function public.set_updated_at();

-- ============================================================
-- 5) GALERİ  (images: tek foto ya da slider)
-- ============================================================
create table if not exists public.gallery_items (
  id          uuid primary key default gen_random_uuid(),
  images      jsonb not null default '[]'::jsonb,
  caption_tr  text not null default '',
  caption_en  text not null default '',
  size        text not null default 'normal', -- normal | wide | tall
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 6) VİDEOLAR  (url: yüklenen dosya URL'si ya da dış link)
-- ============================================================
create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  title_tr    text not null default '',
  title_en    text not null default '',
  url         text not null default '',       -- Supabase storage URL veya YouTube/Vimeo
  poster_url  text not null default '',
  kind        text not null default 'file',   -- file | youtube | vimeo
  sort        int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- RLS (Satır Seviyesi Güvenlik)
-- Herkes OKUR, sadece giriş yapmış admin YAZAR.
-- ============================================================
alter table public.settings         enable row level security;
alter table public.menu_categories  enable row level security;
alter table public.menu_items       enable row level security;
alter table public.home_dishes      enable row level security;
alter table public.gallery_items    enable row level security;
alter table public.videos           enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','menu_categories','menu_items','home_dishes','gallery_items','videos']
  loop
    execute format('drop policy if exists "public_read" on public.%I;', t);
    execute format('create policy "public_read" on public.%I for select using (true);', t);

    execute format('drop policy if exists "auth_insert" on public.%I;', t);
    execute format('create policy "auth_insert" on public.%I for insert to authenticated with check (true);', t);

    execute format('drop policy if exists "auth_update" on public.%I;', t);
    execute format('create policy "auth_update" on public.%I for update to authenticated using (true) with check (true);', t);

    execute format('drop policy if exists "auth_delete" on public.%I;', t);
    execute format('create policy "auth_delete" on public.%I for delete to authenticated using (true);', t);
  end loop;
end $$;

-- ============================================================
-- STORAGE (medya kovası: foto + video)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- Storage RLS: herkes okur, giriş yapan yazar/siler
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using ( bucket_id = 'media' );

drop policy if exists "media_auth_insert" on storage.objects;
create policy "media_auth_insert" on storage.objects
  for insert to authenticated with check ( bucket_id = 'media' );

drop policy if exists "media_auth_update" on storage.objects;
create policy "media_auth_update" on storage.objects
  for update to authenticated using ( bucket_id = 'media' );

drop policy if exists "media_auth_delete" on storage.objects;
create policy "media_auth_delete" on storage.objects
  for delete to authenticated using ( bucket_id = 'media' );

-- ============================================================
-- BAŞLANGIÇ VERİSİ (mevcut sitedeki içerik) — seed
-- ============================================================
insert into public.settings (key, value) values
('contact', '{
  "phone": "+90 212 123 45 67",
  "phone_href": "+902121234567",
  "email": "info@cobanoglukebap.com",
  "address_tr": "Merkez Mah. Lezzet Cad. No:1, Şişli / İstanbul",
  "address_en": "Merkez Mah. Lezzet Cad. No:1, Sisli / Istanbul",
  "map_embed": "https://www.google.com/maps?q=Sisli+Istanbul&output=embed",
  "map_dir": "https://www.google.com/maps/dir/?api=1&destination=Sisli+Istanbul",
  "hours_week": "11:00 – 23:00",
  "hours_sat": "11:00 – 24:00",
  "hours_sun": "12:00 – 23:00",
  "instagram": "", "facebook": "", "x": "", "whatsapp": ""
}'::jsonb),
('hero', '{
  "eyebrow_tr": "1974''ten Bu Yana Odun Ateşinde",
  "eyebrow_en": "Over Wood Fire Since 1974",
  "title_tr": "Ustanın Elinden, <em>Közün</em> Sofraya",
  "title_en": "From the Master''s Hand, <em>Embers</em> to Your Table",
  "sub_tr": "Anadolu''nun köklü lezzet geleneğini, seçkin etleri ve açık ateşin sıcaklığını modern bir sofrada buluşturuyoruz.",
  "sub_en": "We bring Anatolia''s deep-rooted culinary heritage, prime cuts and the warmth of an open flame together at a modern table.",
  "images": []
}'::jsonb),
('story', '{
  "p1_tr": "Çobanoğlu, 1974 yılında küçük bir ocakbaşıyla yola çıktı. Dedemizin köz üzerinde çevirdiği ilk şişten bugüne, tek bir şey hiç değişmedi: işi hakkını vererek yapmak.",
  "p1_en": "Çobanoğlu began in 1974 with a small grill. From our grandfather''s first skewer turned over embers to today, one thing never changed: doing the work right.",
  "p2_tr": "Bugün üçüncü kuşak olarak aynı ateşi, aynı özeni ve aynı misafirperverliği sürdürüyoruz. Her misafirimiz bizim için sofraya davet ettiğimiz bir dost.",
  "p2_en": "Today, as the third generation, we carry on the same fire, the same care and the same hospitality. Every guest is a friend we''ve invited to our table.",
  "images": []
}'::jsonb),
('stats', '{
  "experience": 50, "daily_menu": 40, "guests": 120000, "chefs": 8
}'::jsonb)
on conflict (key) do nothing;

insert into public.menu_categories (slug, name_tr, name_en, sort) values
('kebap','Kebaplar','Kebabs',1),
('izgara','Izgaralar','Grills',2),
('baslangic','Başlangıçlar','Starters',3),
('tatli','Tatlılar','Desserts',4)
on conflict (slug) do nothing;

-- NOT: Menü ürünleri, imza lezzetler, galeri ve videolar admin panelden eklenecek.
-- (İstersen mevcut örnek ürünleri de buraya seed olarak ekleyebiliriz.)

-- ============================================================
-- BİTTİ. Sonraki adım: Authentication → Users → admin kullanıcısı ekle,
-- ve Authentication → Providers → Email → "Allow new users to sign up" KAPAT.
-- ============================================================
