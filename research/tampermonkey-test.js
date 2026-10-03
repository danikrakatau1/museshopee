// ==UserScript==
// @name         MuseShopee Research Test
// @namespace    museshopee
// @version      0.2
// @description  TEST v2: tangkap data produk dari halaman pencarian Shopee + diagnosis struktur
// @match        https://shopee.co.id/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const captured = [];

  function unwrap(w) {
    if (!w || typeof w !== 'object') return w;
    return w.item_basic || w.data || w;
  }

  function handlePayload(url, data) {
    try {
      console.log('[museshopee] respons tertangkap dari:', url);
      let items = [];
      if (Array.isArray(data)) {
        // Kasus kemarin: respons top-level berupa Array
        console.log('[museshopee] top-level adalah Array(' + data.length + '), pakai langsung');
        items = data.map(unwrap);
      } else if (data && typeof data === 'object') {
        console.log('[museshopee] struktur data:', Object.keys(data));
        if (Array.isArray(data.items)) {
          items = data.items.map(unwrap);
        } else if (data.data && Array.isArray(data.data.items)) {
          items = data.data.items.map(unwrap);
        }
      }
      console.log('[museshopee] jumlah item respons ini:', items.length);
      if (items.length > 0) {
        captured.push(...items);
        console.log('[museshopee] total terkumpul:', captured.length, 'produk');
        console.log('[museshopee] jalankan __museshopee.contoh() untuk lihat struktur 1 item');
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

  function pick(obj, candidates) {
    for (const k of candidates) {
      if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
  }

  window.__museshopee = {
    // Diagnosis: tampilkan keys + potongan mentah 1 item pertama
    contoh: function () {
      const i = captured[0];
      if (!i) { console.log('[museshopee] belum ada data — scroll halaman pencarian dulu'); return; }
      console.log('[museshopee] keys item:', Object.keys(i));
      const raw = JSON.stringify(i);
      console.log('[museshopee] mentah (2000 karakter pertama):', raw.slice(0, 2000));
      return i;
    },
    // Versi ringkas dengan banyak kandidat nama field
    ringkas: function () {
      const out = captured.map((i) => {
        const priceRaw = pick(i, ['price_min', 'price', 'current_price', 'show_price']);
        const ratingObj = i.item_rating || {};
        return {
          nama: pick(i, ['name', 'item_name', 'title']),
          harga: typeof priceRaw === 'number' ? Math.round(priceRaw / 100000) : priceRaw,
          terjual: pick(i, ['sold', 'historical_sold', 'sold_count']),
          rating: pick(ratingObj, ['rating_star']) !== undefined
            ? ratingObj.rating_star
            : pick(i, ['rating_star', 'rating']),
          toko: pick(i, ['shop_name']) || (i.shop_info && i.shop_info.shop_name) || null,
        };
      });
      console.table(out);
      return out;
    },
    download: function () {
      const blob = new Blob([JSON.stringify(captured, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'museshopee-test.json';
      a.click();
    },
    jumlah: function () { return captured.length; },
  };

  console.log('%c[museshopee] v0.2 aktif. Buka halaman pencarian Shopee, scroll, lalu jalankan __museshopee.contoh()', 'color: green; font-weight: bold');
})();
