// ==UserScript==
// @name         MuseShopee Research Test
// @namespace    museshopee
// @version      0.1
// @description  TEST: tangkap data produk dari halaman pencarian Shopee (read-only, tanpa klik otomatis)
// @match        https://shopee.co.id/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const captured = [];

  function handlePayload(url, data) {
    try {
      console.log('[museshopee] respons tertangkap dari:', url);
      console.log('[museshopee] struktur data:', Object.keys(data || {}));

      // Coba beberapa bentuk struktur respons yang umum
      let items = [];
      if (Array.isArray(data.items)) {
        items = data.items.map((w) => w.item_basic || w);
      } else if (data.data && Array.isArray(data.data.items)) {
        items = data.data.items.map((w) => w.item_basic || w);
      }

      console.log('[museshopee] jumlah item:', items.length);
      if (items.length > 0) {
        console.log('[museshopee] contoh 1 item (mentah):', items[0]);
        captured.push(...items);
        console.log('[museshopee] total terkumpul:', captured.length, 'produk');
        console.log('[museshopee] jalankan __museshopee.ringkas() untuk versi ringkasnya');
      } else {
        console.log('[museshopee] bentuk respons tidak dikenali, lihat struktur di atas lalu laporkan ke Muse');
      }
    } catch (e) {
      console.log('[museshopee] gagal parse:', e);
    }
  }

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await origFetch.apply(this, args);
    try {
      const url = String((args[0] && args[0].url) || args[0] || '');
      if (url.includes('/api/v4/search/search_items')) {
        const clone = res.clone();
        clone.json().then((data) => handlePayload(url, data)).catch(() => {});
      }
    } catch (e) { /* abaikan */ }
    return res;
  };

  window.__museshopee = {
    // Versi ringkas: nama, harga (Rp), terjual, rating
    ringkas: function () {
      const out = captured.map((i) => ({
        nama: i.name,
        harga: i.price ? Math.round(i.price / 100000) : (i.price_min ? Math.round(i.price_min / 100000) : null),
        terjual: i.sold != null ? i.sold : i.historical_sold,
        rating: i.item_rating ? i.item_rating.rating_star : i.rating_star,
        toko: (i.shop_info && i.shop_info.shop_name) || null,
      }));
      console.table(out);
      return out;
    },
    // Unduh semua data mentah sebagai JSON
    download: function () {
      const blob = new Blob([JSON.stringify(captured, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'museshopee-test.json';
      a.click();
    },
    jumlah: function () { return captured.length; },
  };

  console.log('%c[museshopee] script aktif. Buka halaman pencarian Shopee, lalu cek console ini.', 'color: green; font-weight: bold');
})();
