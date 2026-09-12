/* ============================================================
   ÇOBANOĞLU — Yeniden Kullanılabilir Slider
   Kullanım:
     CBGSlider.build(containerEl, ["url1","url2"], { alt:"Adana", interval:4500 });
   - 0 foto  -> placeholder (img onerror fallback devrede)
   - 1 foto  -> sabit görsel
   - 2+ foto -> otomatik dönen slider (fade), ok + nokta + kaydırma
   prefers-reduced-motion: otomatik dönüş kapanır, oklar kalır.
   ============================================================ */
window.CBGSlider = (function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function build(container, images, opts) {
    opts = opts || {};
    const alt = opts.alt || "";
    const interval = opts.interval || 4500;
    images = (images || []).filter(Boolean);

    container.classList.add("cbg-slider");
    container.innerHTML = "";

    // Görsel yoksa tek placeholder img (fallback SVG main.js'te devreye girer)
    if (images.length === 0) {
      const img = document.createElement("img");
      img.alt = alt; img.dataset.label = alt; img.src = "assets/img/__missing__.jpg";
      container.appendChild(img);
      return { destroy() {} };
    }

    const track = document.createElement("div");
    track.className = "cbg-slides";
    images.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "cbg-slide" + (i === 0 ? " active" : "");
      const img = document.createElement("img");
      img.src = src; img.alt = alt; img.dataset.label = alt;
      img.loading = i === 0 ? "eager" : "lazy";
      slide.appendChild(img);
      track.appendChild(slide);
    });
    container.appendChild(track);

    if (images.length === 1) return { destroy() {} };

    // Noktalar
    const dots = document.createElement("div");
    dots.className = "cbg-dots";
    images.forEach((_, i) => {
      const d = document.createElement("button");
      d.type = "button"; d.className = "cbg-dot" + (i === 0 ? " active" : "");
      d.setAttribute("aria-label", (i + 1) + ". görsel");
      d.addEventListener("click", (e) => { e.stopPropagation(); go(i); });
      dots.appendChild(d);
    });
    container.appendChild(dots);

    // Oklar
    const mk = (cls, label, txt) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "cbg-arrow " + cls; b.innerHTML = txt;
      b.setAttribute("aria-label", label);
      return b;
    };
    const prev = mk("cbg-prev", "Önceki", "&#8249;");
    const next = mk("cbg-next", "Sonraki", "&#8250;");
    prev.addEventListener("click", (e) => { e.stopPropagation(); go(idx - 1); });
    next.addEventListener("click", (e) => { e.stopPropagation(); go(idx + 1); });
    container.appendChild(prev); container.appendChild(next);

    let idx = 0, timer = null;
    const slides = track.querySelectorAll(".cbg-slide");
    const dotEls = dots.querySelectorAll(".cbg-dot");

    function go(n) {
      idx = (n + images.length) % images.length;
      slides.forEach((s, i) => s.classList.toggle("active", i === idx));
      dotEls.forEach((d, i) => d.classList.toggle("active", i === idx));
      restart();
    }
    function restart() {
      if (reduce) return;
      clearInterval(timer);
      timer = setInterval(() => go(idx + 1), interval);
    }

    // Dokunmatik kaydırma
    let sx = 0;
    container.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    container.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
    }, { passive: true });

    // Fareyle üzerine gelince dur
    container.addEventListener("mouseenter", () => clearInterval(timer));
    container.addEventListener("mouseleave", restart);

    restart();
    return { destroy() { clearInterval(timer); } };
  }

  return { build };
})();
