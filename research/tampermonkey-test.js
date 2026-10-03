// ==UserScript==
// @name         MuseShopee Research Test
// @namespace    museshopee
// @version      0.5
// @description  TEST v5: pakai display fields + bedah item_data untuk terjual/rating
// @match        https://shopee.co.id/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const captured = [];

  function handlePayload(url, data) {
    try {
      let raws = [];
      if (Array.isArray(data)) raws = data;
      else if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) raws = data.items;
        else if (data.data && Array.isArray(data.data.items)) raws = data.data.items;
      }
      // simpan wrapper apa adanya + tandai iklan
      for (const w of raws) {
        if (!w || typeof w !== 'object') continue;
        captured.push({ w, isAd: w.adsid != null || w.campaignid != null });
      }
    } catch (e) { /* abaikan */ }
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

  function parsePrice(p) {
    if (p == null) return null;
    if (typeof p === 'number') return p > 10000 ? Math.round(p / 100000) : p;
    if (typeof p === 'string') {
      const n = parseInt(p.replace(/[^0-9]/g, ''), 10);
      return isNaN(n) ? p : n;
    }
    if (typeof p === 'object') {
      const v = p.price || p.text || p.display || p.value;
      return parsePrice(v);
    }
    return null;
  }

  function findIn(obj, re) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const k of Object.keys(obj)) {
      if (re.test(k)) return obj[k];
    }
    return undefined;
  }

  function toProduct(x) {
    const w = x.w;
    const idata = w.item_data && typeof w.item_data === 'object' ? w.item_data : null;
    return {
      nama: (w.display_name || (Array.isArray(w.title_max_lines) ? w.title_max_lines.join(' ') : w.title_max_lines) || '').slice(0, 50),
      harga: parsePrice(w.item_card_price),
      terjual: findIn(idata, /sold/i) ?? findIn(w, /sold/i) ?? null,
      rating: findIn(idata, /rating_star/i) ?? null,
      iklan: x.isAd ? 'YA' : '-',
    };
  }

  window.__museshopee = {
    ringkas: function () {
      const out = captured.map(toProduct);
      console.table(out);
      return out;
    },
    // Bedah satu item ORGANIK: fokus ke item_data
    contoh: function () {
      const x = captured.find((c) => !c.isAd) || captured[0];
      if (!x) { console.log('[museshopee] belum ada data'); return; }
      const w = x.w;
      console.log('=== display_name ===', w.display_name);
      console.log('=== title_max_lines ===', w.title_max_lines);
      console.log('=== item_card_price (mentah) ===', JSON.stringify(w.item_card_price));
      const id = w.item_data;
      console.log('=== item_data tipe ===', id === null ? 'null' : typeof id);
      if (typeof id === 'string') {
        console.log('=== item_data string (300 pertama) ===', id.slice(0, 300));
      } else if (id && typeof id === 'object') {
        const keys = Object.keys(id);
        console.log('=== item_data keys ===', keys.join(', '));
        console.log('=== kandidat sold di item_data ===', keys.filter((k) => /sold/i.test(k)));
        console.log('=== kandidat rating di item_data ===', keys.filter((k) => /rating/i.test(k)));
      }
      console.log('=== hasil toProduct ===', toProduct(x));
      return x;
    },
    jumlah: function () { return captured.length; },
  };

  console.log('%c[museshopee] v0.5 aktif. Reload + scroll, lalu __museshopee.contoh()', 'color: green; font-weight: bold');
})();
