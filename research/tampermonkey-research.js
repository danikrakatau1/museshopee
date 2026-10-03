// ==UserScript==
// @name         MuseShopee Research
// @namespace    museshopee
// @version      1.0
// @description  Tangkap data produk dari pencarian Shopee (nama, harga, terjual, rating, toko, iklan)
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

  function num(str) {
    if (str == null) return null;
    if (typeof str === 'number') return str;
    // "1,2RB" -> 1200, "229" -> 229, "Rp52.900" -> 52900
    const s = String(str).toUpperCase().replace(/[^0-9,.]/g, '');
    if (!s) return null;
    let mult = 1;
    const up = String(str).toUpperCase();
    if (up.includes('RB')) mult = 1000;
    else if (up.includes('JT')) mult = 1000000;
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : Math.round(n * mult);
  }

  function toProduct(x) {
    const w = x.w;
    const d = w.item_data && typeof w.item_data === 'object' ? w.item_data : {};
    const rating = d.item_rating || {};
    const shop = d.shop_data || {};
    const title = Array.isArray(w.title_max_lines) ? w.title_max_lines.join(' ') : w.title_max_lines;
    const track = w.tracking_info && typeof w.tracking_info === 'object' ? w.tracking_info : {};
    const tname = track.item_name || track.product_name || track.title || track.name;
    return {
      nama: (w.display_name || title || d.name || tname || '').slice(0, 60),
      harga: num(d.item_card_display_price),
      terjual: num(d.item_card_display_sold_count),
      rating: rating.rating_star != null ? rating.rating_star : null,
      toko: shop.shop_name || shop.name || null,
      iklan: x.isAd ? 'YA' : '-',
      itemid: d.itemid || w.itemid || null,
    };
  }

  window.__museshopee = {
    ringkas: function () {
      const out = captured.map(toProduct);
      console.table(out);
      const okNama = out.filter((r) => r.nama).length;
      console.log('[museshopee] ' + out.length + ' produk | nama terisi: ' + okNama);
      return out;
    },
    download: function () {
      const blob = new Blob([JSON.stringify(captured.map(toProduct), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'museshopee-riset.json';
      a.click();
    },
    // Kirim hasil ke dashboard (URL dashboard, default localhost saat dev)
    kirim: function (endpoint) {
      const url = endpoint || 'https://museshopee.pages.dev/api/riset';
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: location.href, items: captured.map(toProduct), at: Date.now() }),
      }).then((r) => r.text()).then((t) => console.log('[museshopee] terkirim:', t.slice(0, 200)))
        .catch((e) => console.log('[museshopee] kirim butuh endpoint aktif. Simpan dulu pakai download(). Error:', String(e).slice(0, 120)));
    },
    jumlah: function () { return captured.length; },
  };

  console.log('%c[museshopee] v1.0 aktif — reload + scroll, lalu __museshopee.ringkas()', 'color: green; font-weight: bold');
})();
