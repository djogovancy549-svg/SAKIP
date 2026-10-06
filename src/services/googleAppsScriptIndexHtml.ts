/**
 * GOOGLE APPS SCRIPT: Index.html (Dashboard Admin 3-Worksheet & 3-Folder Lifecycle UI)
 * SIMVERIF SAKIP - PEMERINTAH KABUPATEN NAGEKEO
 */

export const APPS_SCRIPT_INDEX_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Admin SIMVERIF SAKIP - Kabupaten Nagekeo</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #020617; }
    .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white">

  <!-- TOAST NOTIFICATION CONTAINER -->
  <div id="toastContainer" class="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"></div>

  <!-- HEADER UTAMA ADMIN -->
  <header class="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">
        <i class="fa-solid fa-shield-halved"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-sm sm:text-base font-extrabold text-white tracking-tight">DASHBOARD ADMIN SAKIP</h1>
          <span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">3-WORKSHEET ENGINE</span>
        </div>
        <p class="text-[11px] text-slate-400 font-medium">Pemerintah Kabupaten Nagekeo &bull; Retensi: 3 Bulan (Revisi) | 5 Tahun (Sah)</p>
      </div>
    </div>

    <div class="flex items-center gap-2.5 flex-wrap">
      <button type="button" onclick="triggerAutoCleanManual()" id="btnAutoClean" class="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 cursor-pointer">
        <i class="fa-solid fa-broom"></i>
        <span>Pembersihan Otomatis</span>
      </button>

      <button type="button" onclick="loadAllData()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer">
        <i class="fa-solid fa-rotate" id="refreshIcon"></i>
        <span>Segarkan</span>
      </button>

      <a id="sheetLinkBtn" href="https://docs.google.com/spreadsheets/" target="_blank" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95">
        <i class="fa-solid fa-table"></i>
        <span>Buka Google Sheet</span>
      </a>
    </div>
  </header>

  <!-- MAIN WORKSPACE -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- METRIK STATISTIK MULTI-LIFECYCLE -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <div class="bg-slate-900/80 border border-sky-900/40 p-4 rounded-2xl shadow-lg relative overflow-hidden">
        <div class="text-sky-400 text-xs font-medium flex items-center justify-between">
          <span>1. Dokumen Dalam Proses</span>
          <i class="fa-solid fa-hourglass-half text-sky-400/50"></i>
        </div>
        <div class="text-2xl font-black text-white mt-1" id="statProses">0</div>
        <div class="text-[10px] text-slate-400 mt-1 font-mono">Worksheet: DOKUMEN_PROSES</div>
      </div>

      <div class="bg-slate-900/80 border border-emerald-900/40 p-4 rounded-2xl shadow-lg relative overflow-hidden">
        <div class="text-emerald-400 text-xs font-medium flex items-center justify-between">
          <span>2. Dokumen Sah (5 Tahun)</span>
          <i class="fa-solid fa-stamp text-emerald-400/50"></i>
        </div>
        <div class="text-2xl font-black text-emerald-400 mt-1" id="statSah">0</div>
        <div class="text-[10px] text-slate-400 mt-1 font-mono">Worksheet: DOKUMEN_SAH (5 Thn)</div>
      </div>

      <div class="bg-slate-900/80 border border-amber-900/40 p-4 rounded-2xl shadow-lg relative overflow-hidden">
        <div class="text-amber-400 text-xs font-medium flex items-center justify-between">
          <span>3. Summary Revisi (3 Bulan)</span>
          <i class="fa-solid fa-clock-rotate-left text-amber-400/50"></i>
        </div>
        <div class="text-2xl font-black text-amber-400 mt-1" id="statRevisi">0</div>
        <div class="text-[10px] text-slate-400 mt-1 font-mono">Auto Clean 90 Hari</div>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden">
        <div class="text-indigo-400 text-xs font-medium flex items-center justify-between">
          <span>4. Akun Dinas Terdaftar</span>
          <i class="fa-solid fa-users text-indigo-400/50"></i>
        </div>
        <div class="text-2xl font-black text-indigo-400 mt-1" id="statUsers">0</div>
        <div class="text-[10px] text-slate-400 mt-1 font-mono">@nagekeokab.go.id</div>
      </div>
    </div>

    <!-- TABS WORKSPACE -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div class="flex border-b border-slate-800 bg-slate-900 px-4 sm:px-6 gap-3 sm:gap-6 text-xs font-bold overflow-x-auto custom-scrollbar">
        <button type="button" onclick="switchTab('PROSES')" id="tabBtnProses" class="py-4 border-b-2 border-sky-500 text-sky-400 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-file-circle-question"></i>
          <span>1. Dokumen Dalam Proses (DOKUMEN_PROSES)</span>
        </button>

        <button type="button" onclick="switchTab('SAH')" id="tabBtnSah" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-badge-check text-emerald-400"></i>
          <span>2. Dokumen Sah &amp; BAV (5 Tahun)</span>
        </button>

        <button type="button" onclick="switchTab('SUMMARY')" id="tabBtnSummary" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-clock-rotate-left text-amber-400"></i>
          <span>3. Summary &amp; Riwayat Revisi (Bersih 3 Bulan)</span>
        </button>

        <button type="button" onclick="switchTab('USERS')" id="tabBtnUsers" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-users-gear text-indigo-400"></i>
          <span>4. Akun Pengguna</span>
        </button>

        <button type="button" onclick="switchTab('FOLDERS')" id="tabBtnFolders" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-folder-tree text-teal-400"></i>
          <span>5. Folder OPD</span>
        </button>
      </div>

      <!-- TAB 1: DOKUMEN PROSES -->
      <div id="tabContentProses" class="p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-sky-900/30">
          <div class="text-xs">
            <span class="font-bold text-sky-400">Worksheet DOKUMEN_PROSES &bull; Folder 01_DOKUMEN_PROSES</span>
            <p class="text-[11px] text-slate-400">Saat dokumen diverifikasi dan <strong>DISAHKAN</strong>, baris langsung otomatis terhapus dari sheet proses ini dan dipindahkan ke sheet Sah.</p>
          </div>
          <input type="text" id="searchProses" oninput="renderProsesTable()" placeholder="Cari berkas proses..." class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500">
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Waktu / No. Berkas</th>
                <th class="p-3.5">Judul &amp; OPD</th>
                <th class="p-3.5">Pemohon</th>
                <th class="p-3.5">Status</th>
                <th class="p-3.5">Catatan Pemeriksaan</th>
                <th class="p-3.5 text-right">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody id="prosesTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Memuat data dari worksheet DOKUMEN_PROSES...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: DOKUMEN SAH (5 TAHUN) -->
      <div id="tabContentSah" class="p-5 space-y-4" style="display: none;">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-emerald-900/30">
          <div class="text-xs">
            <span class="font-bold text-emerald-400">Worksheet DOKUMEN_SAH_TERVERIFIKASI &bull; Folder 02_DOKUMEN_SAH_FINAL_5_TAHUN</span>
            <p class="text-[11px] text-slate-400">Berkas resmi terverifikasi &amp; nomor BAV. Disimpan selama <strong>5 TAHUN (1825 Hari)</strong> sebelum dibersihkan otomatis.</p>
          </div>
          <input type="text" id="searchSah" oninput="renderSahTable()" placeholder="Cari berkas sah / nomor BAV..." class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500">
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Waktu Sah / No. BAV</th>
                <th class="p-3.5">Nomor &amp; Judul Berkas</th>
                <th class="p-3.5">OPD &amp; Pemohon</th>
                <th class="p-3.5">Pejabat Verifikator</th>
                <th class="p-3.5">Masa Retensi (5 Thn)</th>
                <th class="p-3.5 text-right">File Sah Drive</th>
              </tr>
            </thead>
            <tbody id="sahTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Memuat data dari worksheet DOKUMEN_SAH_TERVERIFIKASI...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: SUMMARY & RIWAYAT REVISI (3 BULAN) -->
      <div id="tabContentSummary" class="p-5 space-y-4" style="display: none;">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-amber-900/30">
          <div class="text-xs">
            <span class="font-bold text-amber-400">Worksheet SUMMARY_RIWAYAT_REVISI &bull; Folder 03_DRAF_REVISI_SUMMARY_3_BULAN</span>
            <p class="text-[11px] text-slate-400">Catatan summary, petunjuk perbaikan, &amp; draf revisi. <strong>OTOMATIS DIBERSIHKAN SETELAH 90 HARI (3 BULAN)</strong>.</p>
          </div>
          <button type="button" onclick="triggerAutoCleanManual()" class="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
            <i class="fa-solid fa-broom"></i> Bersihkan Sekarang
          </button>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Waktu / Versi</th>
                <th class="p-3.5">Dokumen &amp; OPD</th>
                <th class="p-3.5">Jenis Catatan</th>
                <th class="p-3.5">Ringkasan Petunjuk Perbaikan (Summary)</th>
                <th class="p-3.5">Batas 3 Bulan</th>
                <th class="p-3.5 text-right">Draf Drive</th>
              </tr>
            </thead>
            <tbody id="summaryTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Memuat data dari worksheet SUMMARY_RIWAYAT_REVISI...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 4: PENGGUNA -->
      <div id="tabContentUsers" class="p-5 space-y-4" style="display: none;">
        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Username</th>
                <th class="p-3.5">Email</th>
                <th class="p-3.5">Nama &amp; OPD</th>
                <th class="p-3.5">Peran</th>
                <th class="p-3.5">Password</th>
                <th class="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody id="usersTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Memuat data akun dinas...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 5: FOLDER OPD -->
      <div id="tabContentFolders" class="p-5 space-y-4" style="display: none;">
        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">ID OPD</th>
                <th class="p-3.5">Nama Dinas</th>
                <th class="p-3.5">Tautan Drive Server</th>
                <th class="p-3.5">Didaftarkan</th>
              </tr>
            </thead>
            <tbody id="foldersTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="4" class="p-8 text-center text-slate-500">Memuat pemetaan folder...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </main>

  <!-- MODAL VERIFIKASI DOKUMEN (ADMIN) -->
  <div id="verifyModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" style="display: none;">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="font-bold text-white text-base flex items-center gap-2">
          <i class="fa-solid fa-file-signature text-emerald-400"></i>
          <span>Pengesahan Berkas: Pindah ke Sah (5 Thn) atau Revisi (3 Bln)</span>
        </div>
        <button type="button" onclick="closeVerifyModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <!-- Header Info Dokumen -->
      <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-[10px] text-sky-400 font-mono font-bold" id="modalDocNumber">-</div>
          <span class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono" id="modalDocOpd">-</span>
        </div>
        <div class="font-bold text-white text-sm" id="modalDocTitle">-</div>
      </div>

      <div class="space-y-4 text-xs">
        <div>
          <label class="block text-slate-300 font-bold mb-1.5">Keputusan Status Verifikasi :</label>
          <select id="selectStatus" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-emerald-500 focus:outline-none cursor-pointer">
            <option value="APPROVED">✅ SAH / DISETUJUI (HAPUS DARI PROSES &amp; SIMPAN RESMI 5 TAHUN)</option>
            <option value="REVISION">⚠️ PERLU REVISI (CATAT SUMMARY REVISI &amp; RETENSI 3 BULAN)</option>
            <option value="REJECTED">❌ DITOLAK (TIDAK MEMENUHI PERSYARATAN)</option>
          </select>
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1.5">Nomor Berita Acara Verifikasi (BAV) :</label>
          <input type="text" id="inputBav" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-300 font-bold mb-1.5">Nama Verifikator :</label>
            <input type="text" id="inputVerifier" value="Admin Verifikator SAKIP" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:border-emerald-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-slate-300 font-bold mb-1.5">NIP Verifikator :</label>
            <input type="text" id="inputNip" value="19850101 201001 1 002" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none">
          </div>
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1.5">Catatan Evaluasi / Petunjuk Perbaikan (Summary) :</label>
          <textarea id="inputNotes" rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" placeholder="Catatan perbaikan atau pengesahan..."></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        <button type="button" onclick="closeVerifyModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer">Batal</button>
        <button type="button" id="btnSubmitVerify" onclick="submitVerification()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95">
          <i class="fa-solid fa-check"></i> <span>Sahkan &amp; Eksekusi Multi-Worksheet</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    var globalData = {
      prosesDocs: [],
      sahDocs: [],
      summaryDocs: [],
      users: [],
      folders: []
    };

    var selectedVerifyDoc = null;

    function showToast(message, type) {
      var container = document.getElementById('toastContainer');
      if (!container) return;
      var toast = document.createElement('div');
      var isSuccess = type !== 'error';
      toast.className = 'p-3.5 rounded-2xl border text-xs font-bold shadow-xl flex items-center gap-2.5 transition-all pointer-events-auto ' +
        (isSuccess ? 'bg-emerald-950 border-emerald-600 text-emerald-200' : 'bg-rose-950 border-rose-600 text-rose-200');
      toast.innerHTML = '<i class="fa-solid ' + (isSuccess ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-rose-400') + '"></i><span>' + message + '</span>';
      container.appendChild(toast);
      setTimeout(function() {
        if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
      }, 4500);
    }

    function loadAllData() {
      var icon = document.getElementById('refreshIcon');
      if (icon) icon.classList.add('fa-spin');

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (icon) icon.classList.remove('fa-spin');
            if (res && res.status === 'success') {
              globalData.prosesDocs = res.prosesDocs || [];
              globalData.sahDocs = res.sahDocs || [];
              globalData.summaryDocs = res.summaryDocs || [];
              globalData.users = res.users || [];
              globalData.folders = res.folders || [];
              if (res.spreadsheetUrl) {
                var btn = document.getElementById('sheetLinkBtn');
                if (btn) btn.href = res.spreadsheetUrl;
              }
              showToast('Data 3 Worksheet berhasil disinkronkan!', 'success');
            }
            renderAllTables();
          })
          .withFailureHandler(function(err) {
            if (icon) icon.classList.remove('fa-spin');
            showToast('Koneksi note: ' + err.toString(), 'error');
            renderAllTables();
          })
          .adminGetDashboardData();
      } else {
        if (icon) icon.classList.remove('fa-spin');
        renderAllTables();
      }
    }

    function triggerAutoCleanManual() {
      var btn = document.getElementById('btnAutoClean');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Membersihkan...';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-broom"></i> Pembersihan Otomatis';
            showToast(res.message || 'Pembersihan 3 bulan & 5 tahun selesai!', 'success');
            loadAllData();
          })
          .withFailureHandler(function(err) {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-broom"></i> Pembersihan Otomatis';
            showToast('Gagal pembersihan: ' + err.toString(), 'error');
          })
          .autoCleanExpiredData();
      } else {
        setTimeout(function() {
          if (btn) btn.innerHTML = '<i class="fa-solid fa-broom"></i> Pembersihan Otomatis';
          showToast('Simulasi pembersihan: Draf revisi >3 bulan & arsip >5 tahun dibersihkan!', 'success');
        }, 1000);
      }
    }

    function renderAllTables() {
      document.getElementById('statProses').innerText = globalData.prosesDocs.length;
      document.getElementById('statSah').innerText = globalData.sahDocs.length;
      document.getElementById('statRevisi').innerText = globalData.summaryDocs.length;
      document.getElementById('statUsers').innerText = globalData.users.length;

      renderProsesTable();
      renderSahTable();
      renderSummaryTable();
      renderUsersTable();
      renderFoldersTable();
    }

    function renderProsesTable() {
      var tbody = document.getElementById('prosesTableBody');
      if (!tbody) return;
      var q = (document.getElementById('searchProses')?.value || '').toLowerCase();
      var docs = globalData.prosesDocs.filter(function(d) {
        return !q || d.nomorBerkas.toLowerCase().indexOf(q) !== -1 || d.judul.toLowerCase().indexOf(q) !== -1 || d.opdName.toLowerCase().indexOf(q) !== -1;
      });

      if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Tidak ada berkas yang sedang dalam proses. Semua berkas telah disahkan atau belum ada pengajuan baru.</td></tr>';
        return;
      }

      var html = '';
      for (var i = 0; i < docs.length; i++) {
        var d = docs[i];
        var stBadge = (d.status === 'REVISION')
          ? '<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-bold text-[10px]">REVISI</span>'
          : '<span class="px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded font-bold text-[10px]">PENDING</span>';

        html += '<tr class="hover:bg-slate-900/80">' +
          '<td class="p-3.5 font-mono font-bold text-white">' + d.nomorBerkas + '<div class="text-[10px] text-slate-500">' + d.tanggalMasuk + '</div></td>' +
          '<td class="p-3.5"><div class="font-bold text-slate-200">' + d.judul + '</div><div class="text-[11px] text-sky-400">' + d.opdName + ' (v' + d.currentVersion + ')</div></td>' +
          '<td class="p-3.5 text-slate-400">' + d.pemohon.nama + '<div class="text-[10px] font-mono">' + d.pemohon.email + '</div></td>' +
          '<td class="p-3.5">' + stBadge + '</td>' +
          '<td class="p-3.5 text-slate-400 max-w-xs truncate">' + (d.notes || '-') + '</td>' +
          '<td class="p-3.5 text-right"><button type="button" onclick="openVerifyModalForProses(' + i + ')" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md"><i class="fa-solid fa-signature"></i> Verifikasi</button></td>' +
          '</tr>';
      }
      tbody.innerHTML = html;
    }

    function renderSahTable() {
      var tbody = document.getElementById('sahTableBody');
      if (!tbody) return;
      var q = (document.getElementById('searchSah')?.value || '').toLowerCase();
      var docs = globalData.sahDocs.filter(function(d) {
        return !q || d.nomorBerkas.toLowerCase().indexOf(q) !== -1 || d.judul.toLowerCase().indexOf(q) !== -1 || (d.bavNumber && d.bavNumber.toLowerCase().indexOf(q) !== -1);
      });

      if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada berkas sah pada sheet DOKUMEN_SAH_TERVERIFIKASI.</td></tr>';
        return;
      }

      var html = '';
      for (var j = 0; j < docs.length; j++) {
        var s = docs[j];
        var driveLink = s.googleDrive && s.googleDrive.viewUrl ? '<a href="' + s.googleDrive.viewUrl + '" target="_blank" class="text-emerald-400 hover:underline font-mono text-[11px]"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka File Sah</a>' : '-';

        html += '<tr class="hover:bg-slate-900/80">' +
          '<td class="p-3.5 font-mono text-emerald-400 font-bold">' + (s.bavNumber || '-') + '<div class="text-[10px] text-slate-500">' + s.tanggalMasuk + '</div></td>' +
          '<td class="p-3.5"><div class="font-bold text-slate-200">' + s.judul + '</div><div class="text-[10px] text-slate-400 font-mono">' + s.nomorBerkas + '</div></td>' +
          '<td class="p-3.5 text-slate-300">' + s.opdName + '<div class="text-[10px] text-slate-500">' + s.pemohon.nama + '</div></td>' +
          '<td class="p-3.5 text-slate-400">' + s.verifierName + '<div class="text-[10px] font-mono">' + s.verifierNip + '</div></td>' +
          '<td class="p-3.5"><span class="px-2 py-0.5 bg-emerald-950 border border-emerald-600/40 text-emerald-300 rounded font-bold text-[10px]">5 TAHUN</span><div class="text-[10px] text-slate-400">' + (s.retentionExpiry || 'Resmi') + '</div></td>' +
          '<td class="p-3.5 text-right">' + driveLink + '</td>' +
          '</tr>';
      }
      tbody.innerHTML = html;
    }

    function renderSummaryTable() {
      var tbody = document.getElementById('summaryTableBody');
      if (!tbody) return;
      var docs = globalData.summaryDocs;

      if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada riwayat perbaikan pada sheet SUMMARY_RIWAYAT_REVISI.</td></tr>';
        return;
      }

      var html = '';
      for (var k = 0; k < docs.length; k++) {
        var sm = docs[k];
        var drafLink = sm.fileUrl ? '<a href="' + sm.fileUrl + '" target="_blank" class="text-amber-400 hover:underline font-mono text-[11px]"><i class="fa-solid fa-folder-open"></i> Draf</a>' : '-';

        html += '<tr class="hover:bg-slate-900/80">' +
          '<td class="p-3.5 font-mono text-slate-300">' + sm.tanggalMasuk + '<div class="text-[10px] text-amber-400 font-bold">v' + sm.versionNumber + '</div></td>' +
          '<td class="p-3.5"><div class="font-bold text-slate-200">' + sm.judul + '</div><div class="text-[10px] text-slate-400">' + sm.opdName + ' (' + sm.nomorBerkas + ')</div></td>' +
          '<td class="p-3.5"><span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-bold text-[10px]">' + sm.jenisCatatan + '</span></td>' +
          '<td class="p-3.5 text-amber-200/90 max-w-sm text-[11px] italic leading-snug">"' + (sm.detailEvaluasi || sm.summaryPetunjuk) + '"</td>' +
          '<td class="p-3.5"><span class="text-[10px] font-bold text-amber-400 font-mono">Batas: ' + sm.batasSimpan3Bln + '</span><div class="text-[9px] text-slate-500">Auto Clean 90 Hari</div></td>' +
          '<td class="p-3.5 text-right">' + drafLink + '</td>' +
          '</tr>';
      }
      tbody.innerHTML = html;
    }

    function renderUsersTable() {
      var tbody = document.getElementById('usersTableBody');
      if (!tbody) return;
      var html = '';
      for (var u = 0; u < globalData.users.length; u++) {
        var user = globalData.users[u];
        html += '<tr>' +
          '<td class="p-3.5 font-mono text-sky-400">@' + user.username + '</td>' +
          '<td class="p-3.5 font-mono text-emerald-400">' + user.email + '</td>' +
          '<td class="p-3.5">' + user.nama + '<div class="text-[10px] text-slate-400">' + user.opdName + '</div></td>' +
          '<td class="p-3.5">' + user.role + '</td>' +
          '<td class="p-3.5 font-mono text-slate-300">' + user.password + '</td>' +
          '<td class="p-3.5"><span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px]">AKTIF</span></td>' +
          '</tr>';
      }
      tbody.innerHTML = html || '<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada akun dinas.</td></tr>';
    }

    function renderFoldersTable() {
      var tbody = document.getElementById('foldersTableBody');
      if (!tbody) return;
      var html = '';
      for (var f = 0; f < globalData.folders.length; f++) {
        var fld = globalData.folders[f];
        html += '<tr>' +
          '<td class="p-3.5 font-mono text-teal-400">' + fld.opdId + '</td>' +
          '<td class="p-3.5 font-bold">' + fld.opdName + '</td>' +
          '<td class="p-3.5"><a href="' + fld.driveFolderUrl + '" target="_blank" class="text-sky-400 hover:underline font-mono text-[11px]"><i class="fa-solid fa-folder-open"></i> Buka Subfolder</a></td>' +
          '<td class="p-3.5 text-slate-400">' + (fld.registeredBy || 'Admin') + '</td>' +
          '</tr>';
      }
      tbody.innerHTML = html || '<tr><td colspan="4" class="p-8 text-center text-slate-500">Belum ada pemetaan folder.</td></tr>';
    }

    function switchTab(tab) {
      document.getElementById('tabContentProses').style.display = 'none';
      document.getElementById('tabContentSah').style.display = 'none';
      document.getElementById('tabContentSummary').style.display = 'none';
      document.getElementById('tabContentUsers').style.display = 'none';
      document.getElementById('tabContentFolders').style.display = 'none';

      document.getElementById('tabBtnProses').className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0';
      document.getElementById('tabBtnSah').className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0';
      document.getElementById('tabBtnSummary').className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0';
      document.getElementById('tabBtnUsers').className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0';
      document.getElementById('tabBtnFolders').className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0';

      if (tab === 'PROSES') {
        document.getElementById('tabContentProses').style.display = 'block';
        document.getElementById('tabBtnProses').className = 'py-4 border-b-2 border-sky-500 text-sky-400 flex items-center gap-2 cursor-pointer shrink-0';
      } else if (tab === 'SAH') {
        document.getElementById('tabContentSah').style.display = 'block';
        document.getElementById('tabBtnSah').className = 'py-4 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2 cursor-pointer shrink-0';
      } else if (tab === 'SUMMARY') {
        document.getElementById('tabContentSummary').style.display = 'block';
        document.getElementById('tabBtnSummary').className = 'py-4 border-b-2 border-amber-500 text-amber-400 flex items-center gap-2 cursor-pointer shrink-0';
      } else if (tab === 'USERS') {
        document.getElementById('tabContentUsers').style.display = 'block';
        document.getElementById('tabBtnUsers').className = 'py-4 border-b-2 border-indigo-500 text-indigo-400 flex items-center gap-2 cursor-pointer shrink-0';
      } else {
        document.getElementById('tabContentFolders').style.display = 'block';
        document.getElementById('tabBtnFolders').className = 'py-4 border-b-2 border-teal-500 text-teal-400 flex items-center gap-2 cursor-pointer shrink-0';
      }
    }

    function openVerifyModalForProses(idx) {
      selectedVerifyDoc = globalData.prosesDocs[idx];
      if (!selectedVerifyDoc) return;

      document.getElementById('modalDocNumber').innerText = selectedVerifyDoc.nomorBerkas;
      document.getElementById('modalDocOpd').innerText = selectedVerifyDoc.opdName;
      document.getElementById('modalDocTitle').innerText = selectedVerifyDoc.judul;

      var cleanNo = (selectedVerifyDoc.nomorBerkas || '').replace(/[^a-zA-Z0-9]/g, '');
      document.getElementById('inputBav').value = 'BAV/SAKIP-NGK/' + (selectedVerifyDoc.opdId || 'OPD') + '/' + new Date().getFullYear() + '/' + (cleanNo.slice(-4) || '001');
      document.getElementById('inputNotes').value = selectedVerifyDoc.notes || '';
      document.getElementById('selectStatus').value = 'APPROVED';

      document.getElementById('verifyModal').style.display = 'flex';
    }

    function closeVerifyModal() {
      document.getElementById('verifyModal').style.display = 'none';
      selectedVerifyDoc = null;
    }

    function submitVerification() {
      if (!selectedVerifyDoc) return;
      var status = document.getElementById('selectStatus').value;
      var bav = document.getElementById('inputBav').value;
      var verifier = document.getElementById('inputVerifier').value;
      var nip = document.getElementById('inputNip').value;
      var notes = document.getElementById('inputNotes').value;

      var btn = document.getElementById('btnSubmitVerify');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

      var payload = {
        action: 'VERIFY_DOCUMENT',
        docId: selectedVerifyDoc.id,
        docNumber: selectedVerifyDoc.nomorBerkas,
        title: selectedVerifyDoc.judul,
        opdName: selectedVerifyDoc.opdName,
        status: status,
        bavNumber: bav,
        verifierName: verifier,
        verifierNip: nip,
        notes: notes,
        downloadUrl: selectedVerifyDoc.googleDrive ? selectedVerifyDoc.googleDrive.viewUrl : '',
        timestamp: new Date().toLocaleString('id-ID')
      };

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> Sahkan &amp; Eksekusi Multi-Worksheet';
            closeVerifyModal();
            showToast(res.message || 'Status berhasil diperbarui!', 'success');
            loadAllData();
          })
          .withFailureHandler(function(err) {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> Sahkan &amp; Eksekusi Multi-Worksheet';
            closeVerifyModal();
            showToast('Error: ' + err.toString(), 'error');
          })
          .doPost({ postData: { contents: JSON.stringify(payload) } });
      } else {
        setTimeout(function() {
          if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> Sahkan &amp; Eksekusi Multi-Worksheet';
          closeVerifyModal();
          showToast('Status berhasil diubah! Berkas sah dipindahkan ke DOKUMEN_SAH dan dihapus dari DOKUMEN_PROSES.', 'success');
        }, 1000);
      }
    }

    // Load data on page ready
    window.addEventListener('DOMContentLoaded', function() {
      loadAllData();
    });
  </script>
</body>
</html>`;
