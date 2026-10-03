/* museshopee — kalkulator & riset seller Shopee (tanpa backend, tanpa simpan data) */
'use strict';

// ---------- util ----------
const $ = (id) => document.getElementById(id);
const rp = (n) => {
  if (n == null || isNaN(n)) return '-';
  return 'Rp' + Math.round(n).toLocaleString('id-ID');
};
const pct = (n) => (n == null || isNaN(n) ? '-' : n.toFixed(1).replace('.', ',') + '%');
const val = (id) => {
  const v = parseFloat(String($(id).value).replace(',', '.'));
  return isNaN(v) ? 0 : v;
};
function errBox(el, msg) {
  el.innerHTML = '<span class="badge bad">⚠️ ' + msg + '</span>';
}
function rows(list) {
  return list.map(([k, v]) => '<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>').join('');
}

// ---------- navigasi ----------
document.querySelectorAll('[data-nav]').forEach((el) => {
  el.addEventListener('click', () => {
    const target = el.getAttribute('data-nav');
    document.querySelectorAll('.page').forEach((p) => p.classList.toggle('active', p.id === target));
    document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('active', b.getAttribute('data-nav') === target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ---------- 1. Harga Jual Ideal ----------
// HJ = (HPP + biaya lain) / (1 - margin - fee)
function calcHJ() {
  const out = $('hj-out');
  const hpp = val('hj-hpp'), margin = val('hj-margin') / 100, fee = val('hj-fee') / 100, lain = val('hj-lain');
  if (hpp <= 0) return errBox(out, 'Isi HPP dulu.');
  if (margin + fee >= 1) return errBox(out, 'Margin + fee tidak boleh ≥ 100%.');
  const hj = (hpp + lain) / (1 - margin - fee);
  const feeRp = hj * fee, marginRp = hj * margin;
  out.innerHTML =
    '<div class="big">' + rp(hj) + '</div>' +
    '<div class="kv"><span>Harga jual ideal</span><b>dibulatkan ' + rp(Math.ceil(hj / 500) * 500) + '</b></div>' +
    rows([
      ['HPP', rp(hpp)],
      ['Fee Shopee (' + (fee * 100).toLocaleString('id-ID') + '%)', rp(feeRp)],
      ['Margin (' + (margin * 100).toLocaleString('id-ID') + '%)', rp(marginRp)],
      ['Biaya lain', rp(lain)],
    ]);
}

// ---------- 2. Margin / Laba ----------
function calcMargin() {
  const out = $('mg-out');
  const hj = val('mg-hj'), hpp = val('mg-hpp'), fee = val('mg-fee') / 100;
  const iklan = val('mg-iklan'), lain = val('mg-lain');
  if (hj <= 0) return errBox(out, 'Isi harga jual dulu.');
  const feeRp = hj * fee;
  const laba = hj - hpp - feeRp - iklan - lain;
  const mpct = (laba / hj) * 100;
  let badge;
  if (mpct >= 30) badge = '<span class="badge ok">Cuan tebal 💪</span>';
  else if (mpct >= 15) badge = '<span class="badge ok">Sehat ✅</span>';
  else if (mpct >= 0) badge = '<span class="badge warn">Tipis ⚠️</span>';
  else badge = '<span class="badge bad">Boncos 📉</span>';
  out.innerHTML =
    '<div class="big">' + rp(laba) + '</div>' +
    '<div style="margin:.4rem 0">' + badge + ' <span class="badge info">margin ' + pct(mpct) + '</span></div>' +
    rows([
      ['Harga jual', rp(hj)],
      ['HPP', rp(hpp)],
      ['Fee Shopee', rp(feeRp)],
      ['Biaya iklan', rp(iklan)],
      ['Biaya lain', rp(lain)],
    ]);
}

// ---------- 3. ROAS ----------
function calcROAS() {
  const out = $('ro-out');
  const biaya = val('ro-biaya'), omzet = val('ro-omzet'), margin = val('ro-margin') / 100;
  if (biaya <= 0) return errBox(out, 'Isi biaya iklan dulu.');
  const roas = omzet / biaya;
  let html = '<div class="big">' + roas.toFixed(1).replace('.', ',') + 'x</div>' +
    rows([['Biaya iklan', rp(biaya)], ['Omzet dari iklan', rp(omzet)]]);
  if (margin > 0 && margin < 1) {
    const bep = 1 / margin;
    const ok = roas >= bep;
    html += '<div style="margin-top:.6rem">' +
      (ok ? '<span class="badge ok">Di atas BEP ✅</span>' : '<span class="badge bad">Di bawah BEP 📉</span>') +
      ' <span class="badge info">BEP ROAS: ' + bep.toFixed(1).replace('.', ',') + 'x</span></div>' +
      '<p class="note">BEP ROAS = 1 ÷ margin (' + (margin * 100).toLocaleString('id-ID') + '%). ROAS di atas ini berarti iklan menghasilkan laba.</p>';
  } else {
    html += '<p class="note">Isi margin produk untuk melihat BEP ROAS (batas impas iklan).</p>';
  }
  out.innerHTML = html;
}

// ---------- 4. Diskon & Voucher ----------
function calcDiskon() {
  const out = $('dk-out');
  const hj = val('dk-hj'), disc = val('dk-disc') / 100, voucher = val('dk-voucher');
  const hpp = val('dk-hpp'), fee = val('dk-fee') / 100;
  if (hj <= 0) return errBox(out, 'Isi harga normal dulu.');
  const hargaDiskon = hj * (1 - disc);
  const bayar = Math.max(0, hargaDiskon - voucher);
  const feeRp = bayar * fee;
  const laba = bayar - hpp - feeRp;
  const mpct = bayar > 0 ? (laba / bayar) * 100 : 0;
  const badge = laba >= 0 ? '<span class="badge ok">Masih cuan ✅</span>' : '<span class="badge bad">Rugi per pcs! 🛑</span>';
  out.innerHTML =
    '<div class="big">' + rp(bayar) + '</div>' +
    '<div style="margin:.4rem 0">' + badge + ' <span class="badge info">margin sisa ' + pct(mpct) + '</span></div>' +
    rows([
      ['Harga setelah diskon', rp(hargaDiskon)],
      ['Voucher ditanggung', rp(voucher)],
      ['Fee Shopee', rp(feeRp)],
      ['HPP', rp(hpp)],
      ['Laba per pcs', rp(laba)],
    ]);
}

// ---------- 5. Fee Shopee ----------
function calcFee() {
  const out = $('fe-out');
  const hj = val('fe-hj'), pctFee = val('fe-pct') / 100, tetap = val('fe-tetap');
  if (hj <= 0) return errBox(out, 'Isi harga jual dulu.');
  const feeRp = hj * pctFee;
  const diterima = hj - feeRp - tetap;
  out.innerHTML =
    '<div class="big">' + rp(diterima) + '</div>' +
    '<div class="kv"><span>Dana diterima bersih</span></div>' +
    rows([
      ['Harga jual', rp(hj)],
      ['Fee Shopee (' + (pctFee * 100).toLocaleString('id-ID') + '%)', rp(feeRp)],
      ['Biaya tetap/order', rp(tetap)],
    ]) +
    '<p class="note">Tarif fee berubah-ubah per akun & program — cek Seller Centre untuk angka pastinya.</p>';
}

// ---------- 6. BEP ----------
function calcBEP() {
  const out = $('be-out');
  const tetap = val('be-tetap'), marginPcs = val('be-margin');
  if (tetap <= 0 || marginPcs <= 0) return errBox(out, 'Isi biaya tetap dan margin per pcs.');
  const units = Math.ceil(tetap / marginPcs);
  const perHari = (units / 30).toFixed(1).replace('.', ',');
  out.innerHTML =
    '<div class="big">' + units.toLocaleString('id-ID') + ' pcs</div>' +
    '<div class="kv"><span>Target per bulan</span></div>' +
    rows([
      ['Per hari (±30 hari)', perHari + ' pcs'],
      ['Biaya tetap/bulan', rp(tetap)],
      ['Margin per pcs', rp(marginPcs)],
    ]);
}

// ---------- 7. Riset Produk ----------
let risetData = [];
let risetSort = { k: 'skor', dir: -1 };

function skorProduk(p, maxTerjual) {
  const demand = Math.log10((p.terjual || 0) + 1) / Math.log10(maxTerjual + 1 || 10);
  const rating = p.rating != null ? p.rating : 3;
  const weakness = 1 - rating / 5;
  return Math.round(100 * (0.65 * demand + 0.35 * weakness));
}

function importRiset() {
  const sum = $('rs-summary');
  let raw = $('rs-paste').value.trim();
  const file = $('rs-file').files[0];
  const done = (text) => {
    try {
      let arr = JSON.parse(text);
      if (!Array.isArray(arr)) arr = arr.items || arr.data || [];
      if (!Array.isArray(arr) || !arr.length) throw new Error('kosong');
      const maxT = Math.max(...arr.map((x) => x.terjual || 0), 1);
      risetData = arr.map((x) => {
        const p = {
          nama: String(x.nama || x.name || '').slice(0, 60),
          harga: x.harga || x.price || null,
          terjual: x.terjual || x.sold || 0,
          rating: x.rating != null ? x.rating : null,
          toko: x.toko || x.shop || '-',
          iklan: x.iklan || '-',
        };
        p.omzet = p.harga && p.terjual ? p.harga * p.terjual : null;
        p.skor = skorProduk(p, maxT);
        return p;
      });
      renderRiset();
      const med = median(risetData.map((x) => x.harga).filter(Boolean));
      sum.innerHTML = rows([
        ['Total produk', risetData.length],
        ['Median harga', rp(med)],
        ['Total terjual', risetData.reduce((a, x) => a + (x.terjual || 0), 0).toLocaleString('id-ID')],
      ]);
    } catch (e) {
      sum.innerHTML = '<span class="badge bad">JSON tidak valid / kosong.</span>';
    }
  };
  if (file) {
    const r = new FileReader();
    r.onload = () => done(r.result);
    r.readAsText(file);
  } else if (raw) {
    done(raw);
  } else {
    sum.innerHTML = '<span class="badge warn">Upload file atau tempel JSON dulu.</span>';
  }
}

function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function renderRiset() {
  const tb = $('rs-body'), table = $('rs-table');
  const { k, dir } = risetSort;
  const arr = [...risetData].sort((a, b) => {
    const va = a[k] ?? -1, vb = b[k] ?? -1;
    return (va > vb ? 1 : va < vb ? -1 : 0) * dir;
  });
  tb.innerHTML = arr.map((p) => {
    const cls = p.skor >= 65 ? 'hi' : p.skor >= 40 ? 'mid' : 'lo';
    return '<tr>' +
      '<td><span class="score ' + cls + '">' + p.skor + '</span></td>' +
      '<td style="white-space:normal;min-width:180px">' + esc(p.nama) + '</td>' +
      '<td class="num">' + rp(p.harga) + '</td>' +
      '<td class="num">' + (p.terjual || 0).toLocaleString('id-ID') + '</td>' +
      '<td class="num">' + (p.rating != null ? String(p.rating).replace('.', ',') : '-') + '</td>' +
      '<td class="num">' + rp(p.omzet) + '</td>' +
      '<td>' + (p.iklan === 'YA' ? '<span class="badge warn">iklan</span>' : '-') + '</td>' +
      '</tr>';
  }).join('');
  table.hidden = false;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

document.querySelectorAll('#rs-table th').forEach((th) => {
  th.addEventListener('click', () => {
    const k = th.getAttribute('data-k');
    if (risetSort.k === k) risetSort.dir *= -1;
    else risetSort = { k, dir: k === 'nama' ? 1 : -1 };
    renderRiset();
  });
});
