/* ============================================================
   ÇOBANOĞLU — Ana Etkileşim & Animasyon Motoru
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     1) DİL SİSTEMİ (i18n)
     --------------------------------------------------------- */
  const DICT = window.I18N || { tr: {}, en: {} };
  const savedLang = localStorage.getItem("cbg-lang") || "tr";

  function applyLang(lang) {
    const dict = DICT[lang] || DICT.tr;
    document.documentElement.setAttribute("lang", lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.innerHTML = dict[key];
    });
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      // format: "attr:key, attr2:key2"
      el.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (dict[key] != null) el.setAttribute(attr, dict[key]);
      });
    });

    document.querySelectorAll("[data-lang-btn]").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-lang-btn") === lang);
    });
    localStorage.setItem("cbg-lang", lang);
    document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lang-btn]");
    if (btn) applyLang(btn.getAttribute("data-lang-btn"));
  });
  applyLang(savedLang);

  /* ---------------------------------------------------------
     2) LOADING EKRANI
     --------------------------------------------------------- */
  const loader = document.getElementById("loader");
  if (loader) {
    const bar = loader.querySelector(".loader-bar i");
    const pct = loader.querySelector(".loader-pct");
    let p = 0;
    document.body.classList.add("no-scroll");

    const tick = setInterval(() => {
      p += Math.random() * 18 + 6;
      if (p >= 100) { p = 100; clearInterval(tick); finish(); }
      if (bar) bar.style.width = p + "%";
      if (pct) pct.textContent = Math.floor(p) + "%";
    }, reduceMotion ? 40 : 160);

    function finish() {
      setTimeout(() => {
        loader.classList.add("done");
        document.body.classList.remove("no-scroll");
        document.dispatchEvent(new CustomEvent("loaded"));
      }, reduceMotion ? 0 : 350);
    }
    // güvenlik: 4 sn sonra her koşulda kapat
    setTimeout(() => { if (!loader.classList.contains("done")) { clearInterval(tick); finish(); } }, 4000);
  } else {
    document.dispatchEvent(new CustomEvent("loaded"));
  }

  /* ---------------------------------------------------------
     3) NAVBAR — scroll gölgesi + mobil menü
     --------------------------------------------------------- */
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");

  function onScroll() {
    if (nav) nav.classList.toggle("scrolled", window.scrollY > 30);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open);
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.classList.remove("open");
      })
    );
  }

  // Aktif sayfa linki
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) a.classList.add("active");
  });

  /* ---------------------------------------------------------
     4) GSAP ANİMASYONLARI (varsa) — yoksa CSS fallback
     --------------------------------------------------------- */
  function initAnimations() {
    const hasGSAP = window.gsap && window.ScrollTrigger;

    if (hasGSAP && !reduceMotion) {
      gsap.registerPlugin(ScrollTrigger);
      document.documentElement.classList.add("has-smooth");

      // Hero giriş
      const heroTl = gsap.timeline({ delay: 0.15 });
      heroTl.from(".hero .eyebrow", { y: 30, opacity: 0, duration: 0.7, ease: "power3.out" })
            .from(".hero h1", { y: 40, opacity: 0, duration: 0.9, ease: "power3.out" }, "-=0.4")
            .from(".hero p", { y: 30, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
            .from(".hero-actions .btn", { y: 24, opacity: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" }, "-=0.4")
            .from(".hero-badge", { x: 40, opacity: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" }, "-=0.3");

      // Hero parallax
      gsap.to(".hero-media", {
        yPercent: 18, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });

      // Generic reveal (stagger by group)
      gsap.utils.toArray("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 50, opacity: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" }
        });
      });

      // Stagger grupları
      gsap.utils.toArray("[data-stagger]").forEach((group) => {
        const items = group.children;
        gsap.from(items, {
          y: 60, opacity: 0, duration: 0.8, ease: "power3.out", stagger: 0.14,
          scrollTrigger: { trigger: group, start: "top 82%" }
        });
      });

      // Section başlıkları
      gsap.utils.toArray(".section-head").forEach((el) => {
        gsap.from(el.children, {
          y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" }
        });
      });

    } else {
      // Fallback: IntersectionObserver ile .reveal
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { threshold: 0.15 });
      document.querySelectorAll("[data-reveal], [data-stagger] > *, .reveal").forEach((el) => {
        el.classList.add("reveal"); io.observe(el);
      });
    }

    initCounters(hasGSAP);
  }

  /* ---------------------------------------------------------
     5) SAYAÇ ANİMASYONU
     --------------------------------------------------------- */
  function initCounters(hasGSAP) {
    const counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    const run = (el) => {
      const target = parseFloat(el.getAttribute("data-count"));
      const dur = 1800;
      if (reduceMotion) { el.textContent = format(target); return; }
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = format(Math.floor(eased * target));
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = format(target);
      };
      requestAnimationFrame(step);
    };
    const format = (n) => n.toLocaleString(localStorage.getItem("cbg-lang") === "en" ? "en-US" : "tr-TR");

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach((c) => io.observe(c));
  }

  // Loader bitince ya da direkt başlat
  if (loader) document.addEventListener("loaded", initAnimations, { once: true });
  else document.addEventListener("DOMContentLoaded", initAnimations);

  // Hydration sayaç değerlerini güncelleyince yeniden say
  document.addEventListener("cbg-refresh-counters", () => initCounters(!!(window.gsap && window.ScrollTrigger)));

  /* ---------------------------------------------------------
     6) MENÜ FİLTRESİ
     --------------------------------------------------------- */
  const filters = document.querySelector(".menu-filters");
  if (filters) {
    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      filters.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cat = btn.getAttribute("data-filter");
      document.querySelectorAll(".menu-item[data-cat]").forEach((item) => {
        const show = cat === "all" || item.getAttribute("data-cat") === cat;
        item.style.display = show ? "" : "none";
      });
    });
  }

  /* ---------------------------------------------------------
     7) GALERİ LIGHTBOX
     --------------------------------------------------------- */
  const gallery = document.querySelector(".gallery-grid");
  const lb = document.getElementById("lightbox");
  if (gallery && lb) {
    const lbImg = lb.querySelector("img");
    let imgs = [], idx = 0;
    const refresh = () => { imgs = Array.from(gallery.querySelectorAll("img")); };
    refresh();
    const open = (i) => { idx = i; lbImg.src = imgs[idx].src; lbImg.alt = imgs[idx].alt || ""; lb.classList.add("open"); document.body.classList.add("no-scroll"); };
    const close = () => { lb.classList.remove("open"); document.body.classList.remove("no-scroll"); };
    const move = (d) => { idx = (idx + d + imgs.length) % imgs.length; lbImg.src = imgs[idx].src; lbImg.alt = imgs[idx].alt || ""; };

    // olay delegasyonu — galeri sonradan yeniden kurulsa da çalışır
    gallery.addEventListener("click", (e) => {
      const fig = e.target.closest("figure"); if (!fig) return;
      refresh(); const i = imgs.indexOf(fig.querySelector("img")); if (i >= 0) open(i);
    });
    document.addEventListener("gallery-rebuilt", refresh);
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", (e) => { e.stopPropagation(); move(-1); });
    lb.querySelector(".lb-next").addEventListener("click", (e) => { e.stopPropagation(); move(1); });
    lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    });
  }

  /* ---------------------------------------------------------
     8) VİDEO OYNATICI (poster → video)
     --------------------------------------------------------- */
  document.querySelectorAll(".video-block").forEach((block) => {
    const poster = block.querySelector(".video-poster");
    const video = block.querySelector("video");
    if (poster && video) {
      poster.addEventListener("click", () => {
        poster.style.display = "none";
        video.setAttribute("controls", "");
        video.play().catch(() => {});
      });
    }
  });

  /* ---------------------------------------------------------
     9) YIL (footer)
     --------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ---------------------------------------------------------
     10) GÖRSEL FALLBACK
     Gerçek foto eklenene kadar temaya uygun placeholder göster.
     assets/img/*.jpg dosyaları eklendiğinde otomatik gerçek görsel gelir.
     --------------------------------------------------------- */
  function placeholder(label, w, h) {
    const palettes = [
      ["#DC2626", "#7f1010"], ["#A16207", "#5c3803"], ["#B91C1C", "#450A0A"],
      ["#CA8A04", "#7c4a02"], ["#991b1b", "#2a0606"]
    ];
    const p = palettes[Math.abs(hash(label)) % palettes.length];
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0' stop-color='${p[0]}'/><stop offset='1' stop-color='${p[1]}'/>
      </linearGradient></defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <g fill='none' stroke='rgba(255,255,255,0.14)' stroke-width='2'>
        <circle cx='${w * 0.5}' cy='${h * 0.5}' r='${Math.min(w, h) * 0.28}'/>
        <circle cx='${w * 0.5}' cy='${h * 0.5}' r='${Math.min(w, h) * 0.18}'/>
      </g>
      <text x='50%' y='47%' fill='rgba(255,255,255,0.9)' font-family='Georgia, serif' font-size='${Math.round(Math.min(w,h)*0.09)}' font-style='italic' text-anchor='middle'>Çobanoğlu</text>
      <text x='50%' y='58%' fill='rgba(255,255,255,0.6)' font-family='sans-serif' font-size='${Math.round(Math.min(w,h)*0.045)}' letter-spacing='3' text-anchor='middle'>${(label || "GÖRSEL").toUpperCase()}</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function hash(s) { let h = 0; s = s || ""; for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0; return h; }

  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", function handle() {
      img.removeEventListener("error", handle);
      const w = img.getAttribute("width") || img.clientWidth || 800;
      const h = img.getAttribute("height") || img.clientHeight || 600;
      img.src = placeholder(img.dataset.label || img.alt, +w || 800, +h || 600);
    }, { once: true });
    // zaten yüklenememişse tetikle
    if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event("error"));
  });

})();
