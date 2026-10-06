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
      <div class="bg-slate-900/80 border border-sky-900/40 p-4 rounded-2xl shadow-lg relative overflow-hidden cursor-pointer hover:border-sky-500/50 transition-all" onclick="switchTab('PROSES')">
        <div class="text-sky-400 text-xs font-medium flex items-center justify-between">
          <span>1. Dokumen Dalam Proses</span>
          <i class="fa-solid fa-hourglass-half text-sky-400/50"></i>
        </div>
        <div class="text-2xl font-black text-white mt-1" id="statProses">0</div>
        <div class="text-[10px] text-slate-400 mt-1 font-mono">Worksheet: DOKUMEN_PROSES</div>
      </div>

      <div class="bg-slate-900/80 border border-emerald-900/40 p-4 rounded-2xl shadow-lg relative overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all" onclick="switchTab('SAH')">
        <div class="text-emerald-400 text-xs font-medium flex items-center justify-between">
          <span>2. Dokumen Sah (5 Tahun)</span>
          <i class="fa-solid fa-stamp text-emerald-400/50"></i>
        </div>
        <div class="text-2xl font-black text-emerald-400 mt-1" id="statSah">0</div>
        <div class="text-[10px] text-slate-400 mt-1 font-mono">Worksheet: DOKUMEN_SAH (5 Thn)</div>
      </div>

      <div class="bg-slate-900/80 border border-amber-900/40 p-4 rounded-2xl shadow-lg relative overflow-hidden cursor-pointer hover:border-amber-500/50 transition-all" onclick="switchTab('SUMMARY')">
        <div class="text-amber-400 text-xs font-medium flex items-center justify-between">
          <span>3. Summary Revisi (3 Bulan)</span>
          <i class="fa-solid fa-clock-rotate-left text-amber-400/50"></i>
        </div>
        <div class="text-2xl font-black text-amber-400 mt-1" id="statRevisi">0</div>
        <div class="text-[10px] text-slate-400 mt-1 font-mono">Auto Clean 90 Hari</div>
      </div>

      <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg relative overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all" onclick="switchTab('USERS')">
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
          <span>1. Dokumen Dalam Proses (<span id="tabCountProses">0</span>)</span>
        </button>

        <button type="button" onclick="switchTab('SAH')" id="tabBtnSah" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-badge-check text-emerald-400"></i>
          <span>2. Dokumen Sah &amp; BAV 5 Tahun (<span id="tabCountSah">0</span>)</span>
        </button>

        <button type="button" onclick="switchTab('SUMMARY')" id="tabBtnSummary" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-clock-rotate-left text-amber-400"></i>
          <span>3. Summary &amp; Riwayat Revisi 3 Bulan (<span id="tabCountSummary">0</span>)</span>
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
            <span class="font-bold text-sky-400">Worksheet: DOKUMEN_PROSES &bull; Folder Drive: 01_DOKUMEN_PROSES</span>
            <p class="text-[11px] text-slate-400">Daftar berkas yang sedang diajukan atau dalam telaah verifikator. Klik <strong>Baca &amp; Buka Berkas</strong> untuk membaca isi dokumen langsung di dashboard admin tanpa harus membuka tab Google Drive yang sering terkendala akun.</p>
          </div>
          <div class="flex items-center gap-2">
            <input type="text" id="searchProses" oninput="renderProsesTable()" placeholder="Cari berkas / OPD..." class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500">
            <button type="button" onclick="loadAllData()" class="p-2 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-xl text-xs" title="Muat ulang tabel">
              <i class="fa-solid fa-arrows-rotate"></i>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Waktu / No. Berkas</th>
                <th class="p-3.5">Judul, OPD &amp; File Berkas</th>
                <th class="p-3.5">Pemohon</th>
                <th class="p-3.5">Status</th>
                <th class="p-3.5">Catatan Pemeriksaan</th>
                <th class="p-3.5 text-right">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody id="prosesTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Memuat data berkas dari spreadsheet...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: DOKUMEN SAH (5 TAHUN) -->
      <div id="tabContentSah" class="p-5 space-y-4" style="display: none;">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-emerald-900/30">
          <div class="text-xs">
            <span class="font-bold text-emerald-400">Worksheet: DOKUMEN_SAH_TERVERIFIKASI &bull; Folder Drive: 02_DOKUMEN_SAH_FINAL_5_TAHUN</span>
            <p class="text-[11px] text-slate-400">Dokumen resmi disahkan dengan nomor BAV &amp; segel digital. Retensi resmi: <strong>5 TAHUN (1825 Hari)</strong>.</p>
          </div>
          <input type="text" id="searchSah" oninput="renderSahTable()" placeholder="Cari nomor BAV / OPD..." class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500">
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
                <th class="p-3.5 text-right">Baca &amp; Unduh File Sah</th>
              </tr>
            </thead>
            <tbody id="sahTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada berkas sah.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: SUMMARY & RIWAYAT REVISI (3 BULAN) -->
      <div id="tabContentSummary" class="p-5 space-y-4" style="display: none;">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-amber-900/30">
          <div class="text-xs">
            <span class="font-bold text-amber-400">Worksheet: SUMMARY_RIWAYAT_REVISI &bull; Folder Drive: 03_DRAF_REVISI_SUMMARY_3_BULAN</span>
            <p class="text-[11px] text-slate-400">Catatan perbaikan, draf revisi dinas, dan ringkasan evaluasi. <strong>OTOMATIS DIBERSIHKAN DALAM 3 BULAN (90 HARI)</strong>.</p>
          </div>
          <button type="button" onclick="triggerAutoCleanManual()" class="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
            <i class="fa-solid fa-broom"></i> Bersihkan Sekarang
          </button>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Waktu Pencatatan</th>
                <th class="p-3.5">Nomor &amp; Judul Berkas</th>
                <th class="p-3.5">Kategori / Status</th>
                <th class="p-3.5">Petunjuk Perbaikan &amp; Evaluasi</th>
                <th class="p-3.5">Batas Simpan</th>
                <th class="p-3.5 text-right">Draf Berkas</th>
              </tr>
            </thead>
            <tbody id="summaryTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada riwayat perbaikan.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 4: AKUN PENGGUNA -->
      <div id="tabContentUsers" class="p-5 space-y-4" style="display: none;">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-indigo-900/30">
          <div class="text-xs">
            <span class="font-bold text-indigo-400">Worksheet: DATABASE_PENGGUNA</span>
            <p class="text-[11px] text-slate-400">Akun kedinasan seluruh Organisasi Perangkat Daerah Kabupaten Nagekeo.</p>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Username</th>
                <th class="p-3.5">Email Kedinasan</th>
                <th class="p-3.5">Nama &amp; OPD</th>
                <th class="p-3.5">Peran</th>
                <th class="p-3.5">Kata Sandi</th>
                <th class="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody id="usersTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Memuat akun pengguna...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 5: FOLDER OPD -->
      <div id="tabContentFolders" class="p-5 space-y-4" style="display: none;">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-teal-900/30">
          <div class="text-xs">
            <span class="font-bold text-teal-400">Worksheet: MAPPING_FOLDER_OPD</span>
            <p class="text-[11px] text-slate-400">Pemetaan tautan Google Drive khusus untuk masing-masing dinas/instansi.</p>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">ID OPD</th>
                <th class="p-3.5">Nama Instansi / OPD</th>
                <th class="p-3.5">Tautan Subfolder Drive</th>
                <th class="p-3.5">Didaftarkan Oleh</th>
              </tr>
            </thead>
            <tbody id="foldersTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="4" class="p-8 text-center text-slate-500">Memuat data folder...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </main>

  <!-- ===================================================================== -->
  <!-- MODAL 1: PEMBACA & PRATINJAU BERKAS (IN-DASHBOARD DOCUMENT VIEWER)    -->
  <!-- ===================================================================== -->
  <div id="previewModal" class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md hidden items-center justify-center p-3 sm:p-5">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl h-[92vh] overflow-hidden shadow-2xl animate-in fade-in duration-200 flex flex-col">
      <!-- Top Bar Modal Pratinjau -->
      <div class="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-lg">
            <i class="fa-solid fa-file-pdf"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-white text-sm" id="previewModalTitle">Membaca Berkas Dokumen</h3>
              <span class="px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded text-[10px] font-mono font-bold" id="previewModalDocNo">-</span>
            </div>
            <p class="text-[11px] text-slate-400" id="previewModalSubtitle">Pemerintah Kabupaten Nagekeo</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Tombol Unduh Langsung -->
          <a id="previewDownloadBtn" href="#" target="_blank" download class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer">
            <i class="fa-solid fa-download"></i>
            <span>Unduh Berkas</span>
          </a>

          <!-- Tombol Buka di Tab Baru Drive -->
          <a id="previewDriveBtn" href="#" target="_blank" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
            <i class="fa-solid fa-arrow-up-right-from-square text-sky-400"></i>
            <span>Tab Drive</span>
          </a>

          <!-- Tombol Lanjut Verifikasi -->
          <button type="button" onclick="proceedToVerifyFromPreview()" id="previewVerifyBtn" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer">
            <i class="fa-solid fa-stamp"></i>
            <span>Verifikasi Berkas</span>
          </button>

          <!-- Tutup -->
          <button type="button" onclick="closePreviewModal()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
            <i class="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      </div>

      <!-- Pilihan Mode Tampilan -->
      <div class="bg-slate-950/90 px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="text-slate-400 text-[11px]">Mode Pembaca:</span>
          <button type="button" onclick="switchViewerMode('DRIVE')" id="btnViewerDrive" class="px-2.5 py-1 bg-sky-600 text-white rounded-lg font-bold text-[11px] cursor-pointer">Pratinjau Drive</button>
          <button type="button" onclick="switchViewerMode('SERVER')" id="btnViewerServer" class="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-bold text-[11px] cursor-pointer">Baca Server Stream (Bebas Login)</button>
        </div>
        <div id="previewStatusMsg" class="text-[11px] text-slate-400 font-mono">Memuat viewer...</div>
      </div>

      <!-- Area Tampilan Berkas -->
      <div class="flex-1 bg-slate-950 p-2 relative overflow-hidden flex flex-col items-center justify-center">
        <!-- Frame Drive -->
        <iframe id="previewIframe" src="" class="w-full h-full rounded-2xl border border-slate-800 bg-white" style="display: block;"></iframe>

        <!-- Frame Server Stream -->
        <div id="serverStreamContainer" class="w-full h-full rounded-2xl border border-slate-800 bg-slate-900 hidden flex-col items-center justify-center p-2">
          <div id="streamLoading" class="flex flex-col items-center gap-3 text-slate-400 py-12">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-sky-500"></i>
            <span class="text-xs">Mengambil dokumen asli dari Google Drive Server...</span>
          </div>
          <div id="streamEmbedWrapper" class="w-full h-full flex flex-col items-center justify-center"></div>
        </div>
      </div>

      <!-- Banner Bantuan Akses Berkas -->
      <div class="bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
        <div class="flex items-center gap-1.5">
          <i class="fa-solid fa-circle-info text-sky-400"></i>
          <span>Jika pratinjau Drive terhalang cookie Google, gunakan tab <strong>Baca Server Stream</strong> atau klik tombol <strong>Unduh Berkas</strong> / <strong>Tab Drive</strong>.</span>
        </div>
        <div class="text-[10px] text-slate-500 font-mono">SIMVERIF SAKIP NAGEKEO</div>
      </div>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- MODAL 2: EKSEKUSI VERIFIKASI MULTI-WORKSHEET                         -->
  <!-- ===================================================================== -->
  <div id="verifyModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in duration-200 flex flex-col">
      <div class="p-5 border-b border-slate-800 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold">
            <i class="fa-solid fa-stamp"></i>
          </div>
          <div>
            <h3 class="font-bold text-white text-sm">Verifikasi Dokumen SAKIP</h3>
            <p class="text-[11px] text-sky-300" id="modalDocNumber">-</p>
          </div>
        </div>
        <button type="button" onclick="closeVerifyModal()" class="text-slate-400 hover:text-white p-2 cursor-pointer">
          <i class="fa-solid fa-xmark text-base"></i>
        </button>
      </div>

      <div class="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
        <div class="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <div class="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Informasi Berkas</div>
          <div class="font-bold text-white" id="modalDocTitle">-</div>
          <div class="text-sky-400 text-[11px]" id="modalDocOpd">-</div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-300 mb-1">Keputusan Verifikasi</label>
          <select id="selectStatus" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500 font-bold">
            <option value="APPROVED" class="text-emerald-400">✅ DISAHKAN (Pindahkan ke Dokumen Sah 5 Tahun &amp; Terbitkan BAV)</option>
            <option value="REVISION" class="text-amber-400">⚠️ PERLU REVISI (Catat di Summary 3 Bulan &amp; Beri Instruksi Perbaikan)</option>
            <option value="REJECTED" class="text-rose-400">❌ DITOLAK (Catat di Summary &amp; Kembalikan Berkas)</option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-300 mb-1">Nomor BAV / Register Resmi</label>
          <input type="text" id="inputBav" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500 font-mono" placeholder="BAV/SAKIP-NGK/SETDA/2026/001">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-bold text-slate-300 mb-1">Nama Verifikator</label>
            <input type="text" id="inputVerifier" value="Admin Verifikator SAKIP" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-300 mb-1">NIP Verifikator</label>
            <input type="text" id="inputNip" value="19850101 201001 1 002" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500 font-mono">
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-300 mb-1">Catatan Evaluasi / Petunjuk Perbaikan</label>
          <textarea id="inputNotes" rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-sky-500" placeholder="Tuliskan catatan kelengkapan berkas atau bagian yang perlu disesuaikan OPD..."></textarea>
        </div>
      </div>

      <div class="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2.5">
        <button type="button" onclick="closeVerifyModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer">Batal</button>
        <button type="button" onclick="submitVerification()" id="btnSubmitVerify" class="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-600/30 flex items-center gap-1.5 cursor-pointer">
          <i class="fa-solid fa-check"></i>
          <span>Sahkan &amp; Eksekusi Multi-Worksheet</span>
        </button>
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT CONTROLLER -->
  <script>
    var globalData = {
      prosesDocs: [],
      sahDocs: [],
      summaryDocs: [],
      users: [],
      folders: []
    };
    var selectedVerifyDoc = null;
    var currentPreviewDoc = null;

    function showToast(msg, type) {
      var container = document.getElementById('toastContainer');
      if (!container) return;
      var el = document.createElement('div');
      var colorClass = (type === 'success') ? 'bg-emerald-900/90 border-emerald-500 text-emerald-100' : 'bg-rose-900/90 border-rose-500 text-rose-100';
      el.className = 'p-3.5 rounded-2xl border text-xs shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-auto ' + colorClass;
      el.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>' + msg + '</span>';
      container.appendChild(el);
      setTimeout(function() {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 4000);
    }

    function handleDashboardResponse(res) {
      if (!res) {
        renderAllTables();
        return;
      }
      var rawDocs = res.documents || [];
      var pDocs = res.prosesDocs || [];
      var sDocs = res.sahDocs || [];
      var sumDocs = res.summaryDocs || [];

      // Resilient Fallback: Jika pDocs & sDocs kosong tapi rawDocs ada isinya
      if (pDocs.length === 0 && sDocs.length === 0 && rawDocs.length > 0) {
        for (var i = 0; i < rawDocs.length; i++) {
          var d = rawDocs[i];
          var st = String(d.status || 'PENDING').toUpperCase();
          if (st === 'APPROVED' || st === 'DISETUJUI' || st === 'SAH') {
            sDocs.push(d);
          } else {
            pDocs.push(d);
          }
          if (st === 'REVISION' || st === 'REVISI') {
            sumDocs.push({
              tanggalMasuk: d.tanggalMasuk || '',
              id: d.id || ('REV-' + i),
              nomorBerkas: d.nomorBerkas || '',
              judul: d.judul || '',
              opdName: d.opdName || '',
              versionNumber: d.currentVersion || 1,
              jenisCatatan: 'CATATAN_PERBAIKAN',
              summaryPetunjuk: d.notes || 'Perlu perbaikan berkas',
              detailEvaluasi: d.notes || 'Perlu perbaikan berkas',
              petugas: d.verifierName || 'Admin Verifikator',
              fileUrl: (d.googleDrive && d.googleDrive.viewUrl) || '',
              downloadUrl: (d.googleDrive && d.googleDrive.downloadUrl) || '',
              previewUrl: (d.googleDrive && d.googleDrive.previewUrl) || '',
              fileId: (d.googleDrive && d.googleDrive.fileId) || '',
              batasSimpan3Bln: '90 Hari',
              statusBersih: 'AKTIF_3_BULAN'
            });
          }
        }
      }

      globalData.prosesDocs = pDocs;
      globalData.sahDocs = sDocs;
      globalData.summaryDocs = sumDocs;
      globalData.users = res.users || [];
      globalData.folders = res.folders || [];

      if (res.spreadsheetUrl) {
        var btn = document.getElementById('sheetLinkBtn');
        if (btn) btn.href = res.spreadsheetUrl;
      }

      renderAllTables();
    }

    function fetchFallbackData(icon) {
      try {
        var base = window.location.href.split('?')[0];
        fetch(base + '?action=get_all_data')
          .then(function(r) { return r.json(); })
          .then(function(res) {
            if (icon) icon.classList.remove('fa-spin');
            handleDashboardResponse(res);
            showToast('Data berhasil dimuat & disinkronkan!', 'success');
          })
          .catch(function(e) {
            if (icon) icon.classList.remove('fa-spin');
            renderAllTables();
          });
      } catch (err) {
        if (icon) icon.classList.remove('fa-spin');
        renderAllTables();
      }
    }

    function loadAllData() {
      var icon = document.getElementById('refreshIcon');
      if (icon) icon.classList.add('fa-spin');

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (icon) icon.classList.remove('fa-spin');
            if (res && res.status === 'success') {
              handleDashboardResponse(res);
              showToast('Data 3 Worksheet berhasil disinkronkan!', 'success');
            } else if (res && (res.documents || res.prosesDocs)) {
              handleDashboardResponse(res);
            } else {
              renderAllTables();
              showToast(res && res.message ? res.message : 'Koneksi ke sheet selesai', 'info');
            }
          })
          .withFailureHandler(function(err) {
            if (icon) icon.classList.remove('fa-spin');
            console.warn('google.script.run notice:', err);
            renderAllTables();
            showToast('Catatan: ' + (err && err.message ? err.message : err.toString()), 'error');
          })
          .adminGetDashboardData();
      } else {
        fetchFallbackData(icon);
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
          showToast('Pembersihan draf revisi >3 bulan & arsip >5 tahun dieksekusi!', 'success');
          loadAllData();
        }, 1000);
      }
    }

    function renderAllTables() {
      document.getElementById('statProses').innerText = globalData.prosesDocs.length;
      document.getElementById('statSah').innerText = globalData.sahDocs.length;
      document.getElementById('statRevisi').innerText = globalData.summaryDocs.length;
      document.getElementById('statUsers').innerText = globalData.users.length;

      document.getElementById('tabCountProses').innerText = globalData.prosesDocs.length;
      document.getElementById('tabCountSah').innerText = globalData.sahDocs.length;
      document.getElementById('tabCountSummary').innerText = globalData.summaryDocs.length;

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
        return !q || (d.nomorBerkas && d.nomorBerkas.toLowerCase().indexOf(q) !== -1) ||
          (d.judul && d.judul.toLowerCase().indexOf(q) !== -1) ||
          (d.opdName && d.opdName.toLowerCase().indexOf(q) !== -1);
      });

      if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">' +
          '<div class="text-sm font-bold text-slate-400 mb-1">Tidak ada berkas yang sedang dalam proses</div>' +
          '<p class="text-xs text-slate-500">Semua berkas telah disahkan ke sheet Sah atau belum ada pengajuan baru dari OPD.</p>' +
          '</td></tr>';
        return;
      }

      var html = '';
      for (var i = 0; i < docs.length; i++) {
        var d = docs[i];
        var isRev = (d.status === 'REVISION');
        var stBadge = isRev
          ? '<span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-bold text-[10px]"><i class="fa-solid fa-triangle-exclamation mr-1"></i>REVISI</span>'
          : '<span class="px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded font-bold text-[10px]"><i class="fa-solid fa-clock mr-1"></i>PENDING</span>';

        var fileId = (d.googleDrive && d.googleDrive.fileId) ? d.googleDrive.fileId : '';
        var downloadUrl = fileId ? ('https://drive.google.com/uc?export=download&id=' + fileId) : (d.googleDrive?.downloadUrl || '#');

        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5 font-mono font-bold text-white">' + (d.nomorBerkas || '-') +
            '<div class="text-[10px] text-slate-500 font-sans mt-0.5">' + (d.tanggalMasuk || '-') + '</div>' +
          '</td>' +
          '<td class="p-3.5">' +
            '<div class="font-bold text-slate-200">' + (d.judul || '-') + '</div>' +
            '<div class="text-[11px] text-sky-400 font-medium mb-1.5">' + (d.opdName || '-') + ' <span class="text-slate-500">(v' + (d.currentVersion || 1) + ')</span></div>' +
            '<div class="flex items-center gap-1.5 flex-wrap">' +
              '<button type="button" onclick="openPreviewModalForProses(' + i + ')" class="px-2.5 py-1 bg-sky-950 hover:bg-sky-900 border border-sky-600/50 text-sky-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all">' +
                '<i class="fa-solid fa-book-open-reader text-sky-400"></i>' +
                '<span>Baca &amp; Buka Berkas</span>' +
              '</button>' +
              '<a href="' + downloadUrl + '" target="_blank" download class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer" title="Unduh Berkas PDF">' +
                '<i class="fa-solid fa-download text-emerald-400"></i> Unduh' +
              '</a>' +
            '</div>' +
          '</td>' +
          '<td class="p-3.5 text-slate-300">' + ((d.pemohon && d.pemohon.nama) ? d.pemohon.nama : 'Pemohon Dinas') +
            '<div class="text-[10px] text-slate-500 font-mono">' + ((d.pemohon && d.pemohon.email) ? d.pemohon.email : '-') + '</div>' +
          '</td>' +
          '<td class="p-3.5">' + stBadge + '</td>' +
          '<td class="p-3.5 text-slate-400 max-w-xs truncate" title="' + (d.notes || '-') + '">' + (d.notes || '-') + '</td>' +
          '<td class="p-3.5 text-right">' +
            '<button type="button" onclick="openVerifyModalForProses(' + i + ')" class="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5">' +
              '<i class="fa-solid fa-signature"></i>' +
              '<span>Verifikasi</span>' +
            '</button>' +
          '</td>' +
          '</tr>';
      }
      tbody.innerHTML = html;
    }

    function renderSahTable() {
      var tbody = document.getElementById('sahTableBody');
      if (!tbody) return;
      var q = (document.getElementById('searchSah')?.value || '').toLowerCase();
      var docs = globalData.sahDocs.filter(function(d) {
        return !q || (d.nomorBerkas && d.nomorBerkas.toLowerCase().indexOf(q) !== -1) ||
          (d.judul && d.judul.toLowerCase().indexOf(q) !== -1) ||
          (d.bavNumber && d.bavNumber.toLowerCase().indexOf(q) !== -1) ||
          (d.opdName && d.opdName.toLowerCase().indexOf(q) !== -1);
      });

      if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">' +
          '<div class="text-sm font-bold text-slate-400 mb-1">Belum ada berkas sah pada sheet DOKUMEN_SAH_TERVERIFIKASI</div>' +
          '<p class="text-xs text-slate-500">Berkas yang disahkan akan otomatis disimpan selama 5 tahun di sini.</p>' +
          '</td></tr>';
        return;
      }

      var html = '';
      for (var j = 0; j < docs.length; j++) {
        var s = docs[j];
        var sFileId = (s.googleDrive && s.googleDrive.fileId) ? s.googleDrive.fileId : '';
        var sDownloadUrl = sFileId ? ('https://drive.google.com/uc?export=download&id=' + sFileId) : (s.googleDrive?.downloadUrl || '#');

        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5 font-mono text-emerald-400 font-bold">' + (s.bavNumber || '-') +
            '<div class="text-[10px] text-slate-500 font-sans mt-0.5">' + (s.tanggalMasuk || '-') + '</div>' +
          '</td>' +
          '<td class="p-3.5">' +
            '<div class="font-bold text-slate-200">' + (s.judul || '-') + '</div>' +
            '<div class="text-[10px] text-slate-400 font-mono mb-1.5">' + (s.nomorBerkas || '-') + '</div>' +
            '<div class="flex items-center gap-1.5 flex-wrap">' +
              '<button type="button" onclick="openPreviewModalForSah(' + j + ')" class="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">' +
                '<i class="fa-solid fa-book-open text-emerald-400"></i> Baca Berkas Sah' +
              '</button>' +
              '<a href="' + sDownloadUrl + '" target="_blank" download class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer">' +
                '<i class="fa-solid fa-download text-emerald-400"></i> Unduh' +
              '</a>' +
            '</div>' +
          '</td>' +
          '<td class="p-3.5 text-slate-300">' + (s.opdName || '-') +
            '<div class="text-[10px] text-slate-500">' + ((s.pemohon && s.pemohon.nama) ? s.pemohon.nama : '-') + '</div>' +
          '</td>' +
          '<td class="p-3.5 text-slate-400">' + (s.verifierName || 'Admin SAKIP') +
            '<div class="text-[10px] font-mono text-slate-500">' + (s.verifierNip || '-') + '</div>' +
          '</td>' +
          '<td class="p-3.5">' +
            '<span class="px-2 py-0.5 bg-emerald-950 border border-emerald-600/40 text-emerald-300 rounded font-bold text-[10px]">5 TAHUN</span>' +
            '<div class="text-[10px] text-slate-400 mt-0.5">' + (s.retentionExpiry || 'Resmi') + '</div>' +
          '</td>' +
          '<td class="p-3.5 text-right">' +
            '<a href="' + (s.googleDrive?.viewUrl || '#') + '" target="_blank" class="text-emerald-400 hover:underline font-mono text-[11px] inline-flex items-center gap-1"><i class="fa-solid fa-arrow-up-right-from-square"></i> Tab Drive</a>' +
          '</td>' +
          '</tr>';
      }
      tbody.innerHTML = html;
    }

    function renderSummaryTable() {
      var tbody = document.getElementById('summaryTableBody');
      if (!tbody) return;
      var docs = globalData.summaryDocs;

      if (docs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">' +
          '<div class="text-sm font-bold text-slate-400 mb-1">Belum ada riwayat perbaikan pada sheet SUMMARY_RIWAYAT_REVISI</div>' +
          '<p class="text-xs text-slate-500">Catatan revisi dan instruksi perbaikan akan tercatat di sini dan dibersihkan otomatis dalam 3 bulan.</p>' +
          '</td></tr>';
        return;
      }

      var html = '';
      for (var k = 0; k < docs.length; k++) {
        var sm = docs[k];
        var smFileId = sm.fileId || '';
        var smDownloadUrl = smFileId ? ('https://drive.google.com/uc?export=download&id=' + smFileId) : (sm.downloadUrl || '#');

        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5 font-mono text-slate-300">' + (sm.tanggalMasuk || '-') +
            '<div class="text-[10px] text-amber-400 font-bold">v' + (sm.versionNumber || 1) + '</div>' +
          '</td>' +
          '<td class="p-3.5">' +
            '<div class="font-bold text-slate-200">' + (sm.judul || '-') + '</div>' +
            '<div class="text-[10px] text-slate-400 mb-1">' + (sm.opdName || '-') + ' (' + (sm.nomorBerkas || '-') + ')</div>' +
            '<div class="flex items-center gap-1.5 flex-wrap">' +
              '<button type="button" onclick="openPreviewModalForSummary(' + k + ')" class="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-600/50 text-amber-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer">' +
                '<i class="fa-solid fa-folder-open text-amber-400"></i> Baca Draf' +
              '</button>' +
              '<a href="' + smDownloadUrl + '" target="_blank" download class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer">' +
                '<i class="fa-solid fa-download text-amber-400"></i> Unduh' +
              '</a>' +
            '</div>' +
          '</td>' +
          '<td class="p-3.5"><span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-bold text-[10px]">' + (sm.jenisCatatan || 'REVISI') + '</span></td>' +
          '<td class="p-3.5 text-amber-200/90 max-w-sm text-[11px] italic leading-snug">"' + (sm.detailEvaluasi || sm.summaryPetunjuk || '-') + '"</td>' +
          '<td class="p-3.5"><span class="text-[10px] font-bold text-amber-400 font-mono">Batas: ' + (sm.batasSimpan3Bln || '90 Hari') + '</span><div class="text-[9px] text-slate-500">Auto Clean 90 Hari</div></td>' +
          '<td class="p-3.5 text-right"><a href="' + (sm.fileUrl || '#') + '" target="_blank" class="text-amber-400 hover:underline font-mono text-[11px]">Tab Drive</a></td>' +
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
        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5 font-mono text-sky-400">@' + user.username + '</td>' +
          '<td class="p-3.5 font-mono text-emerald-400">' + user.email + '</td>' +
          '<td class="p-3.5">' + user.nama + '<div class="text-[10px] text-slate-400">' + user.opdName + '</div></td>' +
          '<td class="p-3.5 text-slate-300">' + user.role + '</td>' +
          '<td class="p-3.5 font-mono text-slate-400">' + (user.password || '******') + '</td>' +
          '<td class="p-3.5"><span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-bold">AKTIF</span></td>' +
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
        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5 font-mono text-teal-400">' + fld.opdId + '</td>' +
          '<td class="p-3.5 font-bold text-slate-200">' + fld.opdName + '</td>' +
          '<td class="p-3.5"><a href="' + fld.driveFolderUrl + '" target="_blank" class="text-sky-400 hover:underline font-mono text-[11px] inline-flex items-center gap-1"><i class="fa-solid fa-folder-open"></i> Buka Subfolder Drive</a></td>' +
          '<td class="p-3.5 text-slate-400">' + (fld.registeredBy || 'Admin Verifikator') + '</td>' +
          '</tr>';
      }
      tbody.innerHTML = html || '<tr><td colspan="4" class="p-8 text-center text-slate-500">Belum ada pemetaan folder OPD.</td></tr>';
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

    // =========================================================================
    // FUNGSI MODAL PRATINJAU DOKUMEN (IN-APP DOCUMENT VIEWER)
    // =========================================================================
    function openPreviewModal(doc, category) {
      currentPreviewDoc = doc;
      var fileId = (doc.googleDrive && doc.googleDrive.fileId) ? doc.googleDrive.fileId : (doc.fileId || '');

      document.getElementById('previewModalTitle').innerText = doc.judul || 'Dokumen SAKIP';
      document.getElementById('previewModalDocNo').innerText = doc.nomorBerkas || '-';
      document.getElementById('previewModalSubtitle').innerText = (doc.opdName || 'Dinas') + ' • Versi ' + (doc.currentVersion || doc.versionNumber || 1);

      var downloadUrl = fileId ? ('https://drive.google.com/uc?export=download&id=' + fileId) : (doc.googleDrive?.downloadUrl || doc.downloadUrl || '#');
      var driveViewUrl = fileId ? ('https://drive.google.com/file/d/' + fileId + '/view') : (doc.googleDrive?.viewUrl || doc.fileUrl || '#');
      var previewUrl = fileId ? ('https://drive.google.com/file/d/' + fileId + '/preview') : driveViewUrl;

      document.getElementById('previewDownloadBtn').href = downloadUrl;
      document.getElementById('previewDriveBtn').href = driveViewUrl;

      var verifyBtn = document.getElementById('previewVerifyBtn');
      if (category === 'PROSES') {
        verifyBtn.style.display = 'flex';
      } else {
        verifyBtn.style.display = 'none';
      }

      // Default buka server stream bebas login agar tidak terhalang cookie Google Drive
      switchViewerMode('SERVER', previewUrl, fileId);

      document.getElementById('previewModal').style.display = 'flex';
    }

    function openPreviewModalForProses(idx) {
      openPreviewModal(globalData.prosesDocs[idx], 'PROSES');
    }
    function openPreviewModalForSah(idx) {
      openPreviewModal(globalData.sahDocs[idx], 'SAH');
    }
    function openPreviewModalForSummary(idx) {
      openPreviewModal(globalData.summaryDocs[idx], 'SUMMARY');
    }

    function closePreviewModal() {
      document.getElementById('previewModal').style.display = 'none';
      document.getElementById('previewIframe').src = '';
      var wrapper = document.getElementById('streamEmbedWrapper');
      if (wrapper) wrapper.innerHTML = '';
      currentPreviewDoc = null;
    }

    function switchViewerMode(mode, customPreviewUrl, customFileId) {
      var doc = currentPreviewDoc;
      if (!doc) return;
      var fileId = customFileId || (doc.googleDrive && doc.googleDrive.fileId) || doc.fileId || '';
      var previewUrl = customPreviewUrl || (fileId ? ('https://drive.google.com/file/d/' + fileId + '/preview') : (doc.googleDrive?.viewUrl || ''));

      var btnDrive = document.getElementById('btnViewerDrive');
      var btnServer = document.getElementById('btnViewerServer');
      var frameDrive = document.getElementById('previewIframe');
      var containerServer = document.getElementById('serverStreamContainer');
      var statusMsg = document.getElementById('previewStatusMsg');

      if (mode === 'DRIVE') {
        btnDrive.className = 'px-2.5 py-1 bg-sky-600 text-white rounded-lg font-bold text-[11px] cursor-pointer';
        btnServer.className = 'px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-bold text-[11px] cursor-pointer';
        frameDrive.style.display = 'block';
        containerServer.style.display = 'none';
        frameDrive.src = previewUrl;
        statusMsg.innerText = 'Pratinjau Google Drive Aktif';
      } else {
        btnDrive.className = 'px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg font-bold text-[11px] cursor-pointer';
        btnServer.className = 'px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] cursor-pointer';
        frameDrive.style.display = 'none';
        containerServer.style.display = 'flex';
        statusMsg.innerText = 'Mengambil file dari server script...';

        var loadingEl = document.getElementById('streamLoading');
        var wrapper = document.getElementById('streamEmbedWrapper');
        loadingEl.style.display = 'flex';
        wrapper.innerHTML = '';

        if (typeof google !== 'undefined' && google.script && google.script.run && fileId) {
          google.script.run
            .withSuccessHandler(function(res) {
              loadingEl.style.display = 'none';
              if (res && res.status === 'success' && res.dataUri) {
                wrapper.innerHTML = '<object data="' + res.dataUri + '" type="' + (res.mimeType || 'application/pdf') + '" class="w-full h-full rounded-xl bg-white shadow-inner">' +
                  '<div class="p-8 text-center text-slate-300 space-y-3 flex flex-col items-center justify-center h-full">' +
                    '<i class="fa-solid fa-file-pdf text-4xl text-rose-500"></i>' +
                    '<p class="text-sm font-bold text-white">' + (res.fileName || 'Dokumen SAKIP') + ' (' + (res.fileSize || '') + ')</p>' +
                    '<p class="text-xs text-slate-400 max-w-sm">Peramban Anda siap membuka atau mengunduh berkas ini secara langsung:</p>' +
                    '<div class="flex items-center gap-3 pt-2">' +
                      '<a href="' + (res.downloadUrl || '#') + '" target="_blank" download class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2"><i class="fa-solid fa-download"></i> Unduh File</a>' +
                      '<a href="' + (res.viewUrl || '#') + '" target="_blank" class="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2"><i class="fa-solid fa-arrow-up-right-from-square"></i> Tab Google Drive</a>' +
                    '</div>' +
                  '</div>' +
                '</object>';
                statusMsg.innerText = 'Berkas terbaca via Server (' + (res.fileSize || '') + ')';
              } else {
                statusMsg.innerText = 'Info: ' + (res.message || 'Gunakan link unduh.');
                wrapper.innerHTML = '<div class="p-6 text-center text-slate-400"><p class="text-xs mb-3">' + (res.message || 'Gagal memuat stream.') + '</p><a href="' + previewUrl + '" target="_blank" class="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka via Google Drive</a></div>';
              }
            })
            .withFailureHandler(function(err) {
              loadingEl.style.display = 'none';
              statusMsg.innerText = 'Error stream: ' + err.toString();
              wrapper.innerHTML = '<div class="p-6 text-center text-slate-400"><p class="text-xs mb-3">' + err.toString() + '</p><a href="' + previewUrl + '" target="_blank" class="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka via Google Drive</a></div>';
            })
            .adminGetFileBase64(fileId);
        } else {
          loadingEl.style.display = 'none';
          statusMsg.innerText = 'Mode pratinjau browser aktif.';
          wrapper.innerHTML = '<div class="p-8 text-center text-slate-300 space-y-3 flex flex-col items-center justify-center h-full"><p class="text-sm font-bold">Pratinjau Berkas Siap</p><div class="flex items-center gap-3"><a href="' + previewUrl + '" target="_blank" class="px-4 py-2 bg-sky-600 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka di Google Drive</a></div></div>';
        }
      }
    }

    function proceedToVerifyFromPreview() {
      var doc = currentPreviewDoc;
      closePreviewModal();
      if (doc) {
        var idx = globalData.prosesDocs.findIndex(function(d) {
          return d.id === doc.id || d.nomorBerkas === doc.nomorBerkas;
        });
        if (idx !== -1) {
          openVerifyModalForProses(idx);
        } else {
          selectedVerifyDoc = doc;
          openVerifyModalDirect(doc);
        }
      }
    }

    // =========================================================================
    // FUNGSI MODAL VERIFIKASI DOKUMEN
    // =========================================================================
    function openVerifyModalDirect(doc) {
      selectedVerifyDoc = doc;
      document.getElementById('modalDocNumber').innerText = doc.nomorBerkas;
      document.getElementById('modalDocOpd').innerText = doc.opdName;
      document.getElementById('modalDocTitle').innerText = doc.judul;

      var cleanNo = (doc.nomorBerkas || '').replace(/[^a-zA-Z0-9]/g, '');
      document.getElementById('inputBav').value = 'BAV/SAKIP-NGK/' + (doc.opdId || 'OPD') + '/' + new Date().getFullYear() + '/' + (cleanNo.slice(-4) || '001');
      document.getElementById('inputNotes').value = doc.notes || '';
      document.getElementById('selectStatus').value = 'APPROVED';

      document.getElementById('verifyModal').style.display = 'flex';
    }

    function openVerifyModalForProses(idx) {
      selectedVerifyDoc = globalData.prosesDocs[idx];
      if (!selectedVerifyDoc) return;
      openVerifyModalDirect(selectedVerifyDoc);
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
      if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan &amp; Menjalankan Lifecycle...';

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
        downloadUrl: (selectedVerifyDoc.googleDrive && selectedVerifyDoc.googleDrive.viewUrl) ? selectedVerifyDoc.googleDrive.viewUrl : '',
        timestamp: new Date().toLocaleString('id-ID')
      };

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> Sahkan &amp; Eksekusi Multi-Worksheet';
            closeVerifyModal();
            showToast(res.message || 'Status berhasil diperbarui & dicatat ke sheet terkait!', 'success');
            loadAllData();
          })
          .withFailureHandler(function(err) {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> Sahkan &amp; Eksekusi Multi-Worksheet';
            closeVerifyModal();
            showToast('Catatan: ' + err.toString(), 'error');
            loadAllData();
          })
          .adminProcessVerification(payload);
      } else {
        setTimeout(function() {
          if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> Sahkan &amp; Eksekusi Multi-Worksheet';
          closeVerifyModal();
          showToast('Status berhasil diubah! Berkas sah dipindahkan ke Dokumen Sah dan dihapus dari Proses.', 'success');
          loadAllData();
        }, 1000);
      }
    }

    window.addEventListener('DOMContentLoaded', function() {
      loadAllData();
      setInterval(function() {
        loadAllData();
      }, 20000);
    });
  </script>
</body>
</html>`;
