// ==UserScript==
// @name         MuseShopee Research
// @namespace    museshopee
// @version      1.1
// @description  Riset produk Shopee: baca langsung dari kartu produk yang tampil (nama dari slug URL, harga/terjual/rating dari teks)
// @match        https://shopee.co.id/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // "1,2RB" -> 1200, "10RB+" -> 10000, "229" -> 229, "2,5JT" -> 2500000
  function parseIDN(s) {
    if (s == null) return null;
    let str = String(s).toUpperCase().replace(/\+/g, '').trim();
    let mult = 1;
    if (str.includes('JT')) mult = 1000000;
    else if (str.includes('RB')) mult = 1000;
    const num = parseFloat(str.replace(/[^0-9,]/g, '').replace(',', '.'));
    return isNaN(num) ? null : Math.round(num * mult);
  }

  function scrape() {
    const seen = new Map();
    // Kartu produk Shopee: link berisi "-i.<shopid>.<itemid>"
    document.querySelectorAll('a[href*="-i."]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const m = href.match(/-i\.(\d+)\.(\d+)/);
      if (!m) return;
      const shopid = m[1], itemid = m[2];
      if (seen.has(itemid)) return;

      // Nama dari slug URL: /Nama-Produk-Sepatu-i.123.456 -> "Nama Produk Sepatu"
      let nama = '';
      const slug = href.match(/\/([^\/\?#]+)-i\.\d+\.\d+/);
      if (slug) {
        try { nama = decodeURIComponent(slug[1]).replace(/-/g, ' ').slice(0, 60); }
        catch (e) { nama = slug[1].replace(/-/g, ' ').slice(0, 60); }
      }

      const text = a.innerText || '';

      // Harga: ambil semua "Rp52.900", pilih yang terkecil (harga diskon)
      let harga = null;
      const prices = [...text.matchAll(/Rp\s?([\d.]+)/g)]
        .map((x) => parseInt(x[1].replace(/\./g, ''), 10))
        .filter((n) => !isNaN(n) && n > 0);
      if (prices.length) harga = Math.min(...prices);

      // Terjual: "229 terjual", "1,2RB terjual"
      let terjual = null;
      const sm = text.match(/([\d.,]+\s*(?:RB|JT)?\+?)\s*terjual/i);
      if (sm) terjual = parseIDN(sm[1]);

      // Rating: "4,9" atau "4.9" (koma atau titik desimal)
      let rating = null;
      const rm = text.match(/(\d[,.]\d)/);
      if (rm) rating = parseFloat(rm[1].replace(',', '.'));

      seen.set(itemid, { nama, harga, terjual, rating, itemid, shopid });
    });

    const out = [...seen.values()];
    console.table(out);
    const okNama = out.filter((r) => r.nama).length;
    const okHarga = out.filter((r) => r.harga).length;
    console.log('[museshopee] ' + out.length + ' produk | nama: ' + okNama + ' | harga: ' + okHarga);
    return out;
  }

  window.__museshopee = {
    scrape: scrape,
    // alias agar konsisten dengan versi sebelumnya
    ringkas: scrape,
    download: function () {
      const data = scrape();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'museshopee-riset.json';
      a.click();
    },
    jumlah: function () {
      return document.querySelectorAll('a[href*="-i."]').length;
    },
  };

  console.log('%c[museshopee] v1.1 (DOM) aktif. Scroll untuk muat produk, lalu __museshopee.scrape()', 'color: green; font-weight: bold');
})();
