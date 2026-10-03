// ==UserScript==
// @name         MuseShopee Research Test
// @namespace    museshopee
// @version      0.3
// @description  TEST v3: buka bungkusan json_data + tandai item iklan
// @match        https://shopee.co.id/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const captured = [];

  // Buka wrapper Shopee: item_basic langsung, atau JSON di dalam json_data
  function unwrap(w) {
    if (!w || typeof w !== 'object') return { item: w, isAd: false };
    const isAd = w.adsid != null || w.campaignid != null;
    if (w.item_basic) return { item: w.item_basic, isAd };
    if (typeof w.json_data === 'string' && w.json_data.length > 2) {
      try {
        const j = JSON.parse(w.json_data);
        const inner = j.item_basic || j.data || j;
        if (inner && (inner.name || inner.itemid)) return { item: inner, isAd };
      } catch (e) { /* bukan JSON valid */ }
    }
    const fallback = w.data || w;
    return { item: fallback, isAd };
  }

  function handlePayload(url, data) {
    try {
      let raws = [];
      if (Array.isArray(data)) {
        raws = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.items)) raws = data.items;
        else if (data.data && Array.isArray(data.data.items)) raws = data.data.items;
      }
      const items = raws.map(unwrap).filter((x) => x.item && (x.item.name || x.item.itemid));
      if (items.length > 0) {
        captured.push(...items);
        const ads = items.filter((x) => x.isAd).length;
        console.log('[museshopee] +' + items.length + ' produk (' + ads + ' iklan), total: ' + captured.length);
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
    ringkas: function () {
      const out = captured.map((x) => {
        const i = x.item;
        const priceRaw = pick(i, ['price_min', 'price', 'current_price']);
        const ratingObj = i.item_rating || {};
        return {
          nama: (pick(i, ['name', 'item_name']) || '').slice(0, 45),
          harga: typeof priceRaw === 'number' ? Math.round(priceRaw / 100000) : priceRaw,
          terjual: pick(i, ['historical_sold', 'sold']),
          rating: ratingObj.rating_star !== undefined ? ratingObj.rating_star : pick(i, ['rating_star']),
          iklan: x.isAd ? 'YA' : '-',
        };
      });
      console.table(out);
      const organik = out.filter((r) => r.iklan === '-').length;
      console.log('[museshopee] ' + out.length + ' produk (' + organik + ' organik, ' + (out.length - organik) + ' iklan)');
      return out;
    },
    download: function () {
      const blob = new Blob([JSON.stringify(captured.map((x) => x.item), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'museshopee-test.json';
      a.click();
    },
    jumlah: function () { return captured.length; },
  };

  console.log('%c[museshopee] v0.3 aktif. Reload halaman pencarian, scroll, lalu __museshopee.ringkas()', 'color: green; font-weight: bold');
})();
