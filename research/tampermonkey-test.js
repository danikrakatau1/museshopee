// ==UserScript==
// @name         MuseShopee Research Test
// @namespace    museshopee
// @version      0.4
// @description  TEST v4: diagnosis mendalam struktur item
// @match        https://shopee.co.id/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const captured = [];
  let lastWrapper = null;

  function unwrap(w) {
    if (!w || typeof w !== 'object') return { item: w, isAd: false, how: ' mentah' };
    const isAd = w.adsid != null || w.campaignid != null;
    if (w.item_basic) return { item: w.item_basic, isAd, how: 'item_basic langsung' };
    if (typeof w.json_data === 'string' && w.json_data.length > 2) {
      try {
        const j = JSON.parse(w.json_data);
        const inner = j.item_basic || j.data || j;
        if (inner && (inner.name || inner.itemid)) {
          return { item: inner, isAd, how: 'json_data -> ' + Object.keys(j).slice(0, 8).join(',') };
        }
      } catch (e) { /* bukan JSON */ }
    }
    return { item: w.data || w, isAd, how: 'fallback wrapper' };
  }

  function handlePayload(url, data) {
    try {
      let raws = [];
      if (Array.isArray(data)) raws = data;
      else if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) raws = data.items;
        else if (data.data && Array.isArray(data.data.items)) raws = data.data.items;
      }
      if (raws.length && !lastWrapper) lastWrapper = raws[0];
      const items = raws.map(unwrap).filter((x) => x.item && (x.item.name || x.item.itemid));
      if (items.length) captured.push(...items);
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

  window.__museshopee = {
    // Diagnosis lengkap: dari wrapper sampai item akhir
    contoh: function () {
      const w = lastWrapper;
      if (!w) { console.log('[museshopee] belum ada data — reload + scroll dulu'); return; }
      console.log('=== WRAPPER keys ===');
      console.log(Object.keys(w).join(', '));
      console.log('=== json_data (100 karakter pertama) ===');
      console.log(String(w.json_data || '(kosong)').slice(0, 100));
      let parsed = null;
      try { parsed = JSON.parse(w.json_data); } catch (e) { console.log('json_data BUKAN JSON valid'); }
      if (parsed) {
        console.log('=== hasil parse json_data, keys ===');
        console.log(Object.keys(parsed).join(', '));
      }
      const u = unwrap(w);
      console.log('=== cara unwrap: ' + u.how + ' ===');
      console.log('=== ITEM AKHIR keys ===');
      console.log(Object.keys(u.item || {}).join(', '));
      // cari kandidat nama/harga
      const keys = Object.keys(u.item || {});
      console.log('=== kandidat nama ===', keys.filter((k) => /name|title/i.test(k)));
      console.log('=== kandidat harga ===', keys.filter((k) => /price/i.test(k)));
      console.log('=== kandidat terjual ===', keys.filter((k) => /sold/i.test(k)));
      return u.item;
    },
    jumlah: function () { return captured.length; },
  };

  console.log('%c[museshopee] v0.4 aktif. Reload + scroll, lalu __museshopee.contoh()', 'color: green; font-weight: bold');
})();
