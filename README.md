# Çobanoğlu Kebap — Tanıtım Sitesi

Saf HTML + CSS + JS. Backend/randevu yok. TR + EN çift dilli, çok sayfalı.
Üst düzey efektler: loading ekranı, scroll reveal, kart stagger, parallax, sayaç animasyonu, galeri lightbox.

## Çalıştırma
Dosyaları çift tıklayarak açabilirsin ama **harita ve bazı özellikler için yerel sunucu önerilir**:

```bash
cd /Users/tk/Desktop/Projeler/cobanoglu
python3 -m http.server 8000
```
Sonra tarayıcıda: http://localhost:8000

## Sayfalar
- `index.html` — Anasayfa (hero video/foto, öne çıkanlar, hikaye, imza lezzetler, sayaçlar)
- `menu.html` — Menü (kategori filtreli)
- `hakkimizda.html` — Hikaye + değerler
- `galeri.html` — Foto galeri (lightbox) + tanıtım videosu
- `iletisim.html` — Harita, adres, telefon, saatler, sosyal medya

## 📷 Eklenecek Medya Dosyaları
Aşağıdaki dosyaları `assets/img/` ve `assets/video/` klasörlerine **aynı isimle** koy — otomatik gelir.
Dosya eklenmezse yerine temaya uygun placeholder gösterilir (site boş görünmez).

### assets/img/ (JPG öneri: ~1600px genişlik, optimize edilmiş)
| Dosya | Nerede |
|---|---|
| `hero.jpg` | Anasayfa büyük arka plan (yatay, koyu tonlu iyi durur) |
| `usta.jpg` / `hikaye.jpg` | Hikaye bölümü (dikey) |
| `adana.jpg`, `kuzu-sis.jpg`, `beyti.jpg`, `urfa.jpg`, `patlicanli.jpg`, `tavuk-sis.jpg`, `pirzola.jpg`, `karisik.jpg` | Menü/yemek görselleri |
| `mezeler.jpg`, `mercimek.jpg`, `icli-kofte.jpg` | Başlangıçlar |
| `baklava.jpg`, `kunefe.jpg`, `dondurma.jpg` | Tatlılar |
| `video-poster.jpg` | Video kapak görseli |
| `g1.jpg` … `g9.jpg` | Galeri fotoğrafları |

### assets/video/
| Dosya | Nerede |
|---|---|
| `tanitim.mp4` | Galeri sayfasındaki tanıtım videosu |

## ✏️ Düzenlenecek Gerçek Bilgiler
- **Telefon:** Tüm sayfalarda `+902121234567` → gerçek numara (`tel:` linkleri + görünen metin)
- **Adres:** footer + `iletisim.html`
- **E-posta:** `info@cobanoglukebap.com`
- **Harita:** `iletisim.html` içindeki iframe `src` — Google Maps'te işletmeyi bul → Paylaş → Haritayı yerleştir → `src` bağlantısını yapıştır. "Yol Tarifi" butonundaki `destination=` da güncelle.
- **Çalışma saatleri:** footer + `iletisim.html`
- **Sosyal medya:** `iletisim.html` içindeki `href="#"` bağlantıları
- **Fiyatlar:** `menu.html` ve `index.html` içindeki `₺` değerleri

## 🌐 Dil metinleri
Tüm çeviriler `js/i18n.js` içinde (`tr` ve `en` sözlükleri). Metni değiştirmek için ilgili anahtarı düzenle.

## Notlar
- GSAP (animasyon) CDN'den yüklenir; internet yoksa otomatik CSS fallback devreye girer.
- `prefers-reduced-motion` açık kullanıcılarda animasyonlar sadeleşir (erişilebilirlik).
- Responsive: 375 / 768 / 1024 / 1440 px test edildi.
