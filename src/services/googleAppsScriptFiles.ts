/**
 * GOOGLE APPS SCRIPT FILES: Code.gs & Index.html
 * Lengkap dengan Pengelolaan Akun Dinas, Verifikasi Berkas, dan Pemetaan Folder Google Drive
 */

export const APPS_SCRIPT_CODE_GS = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: Code.gs (Backend Controller & Database Engine)
 * SAKIP / SIMVERIF KABUPATEN NAGEKEO
 * =========================================================================
 * 
 * STRUKTUR DATABASE MULTI-SHEET:
 * 1. Sheet 'DATA_VERIFIKASI_DOKUMEN': Transaksi berkas, status verifikasi, email pemohon, dan link Drive.
 * 2. Sheet 'DATABASE_PENGGUNA': Akun dinas (@nagekeokab.go.id), password, dan peran pengguna.
 * 3. Sheet 'MAPPING_FOLDER_OPD': Pemetaan tautan Google Drive per masing-masing 38 OPD.
 */

var MASTER_FOLDER_ID = "1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7";

function getActiveSpreadsheetSafely() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}
  try {
    var files = DriveApp.getFilesByName("DATABASE_SIMVERIF_SAKIP_NAGEKEO");
    if (files.hasNext()) return SpreadsheetApp.open(files.next());
    return SpreadsheetApp.create("DATABASE_SIMVERIF_SAKIP_NAGEKEO");
  } catch (err) {
    return null;
  }
}

function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

/**
 * 1. doGet: Merender Web App Dashboard Admin & Melayani API JSON untuk User Dinas
 */
function doGet(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    var action = e && e.parameter ? e.parameter.action : "";
    
    // API 1: JSON Endpoint untuk Aplikasi Web User Dinas (Mengambil status berkas real-time)
    if (action === "get_all_data" || (e && e.parameter && e.parameter.format === "json")) {
      return ContentService.createTextOutput(JSON.stringify(adminGetDashboardData()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Render Dashboard Admin Profesional dari file Index.html
    return HtmlService.createTemplateFromFile("Index").evaluate()
      .setTitle("DASHBOARD ADMIN SAKIP - KABUPATEN NAGEKEO")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * 2. doPost: Menerima Unggahan Berkas Dokumen & Revisi dari User Dinas
 */
function doPost(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Spreadsheet tidak ditemukan." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var docSheet = getOrCreateSheet(ss, "DATA_VERIFIKASI_DOKUMEN");
    
    // Inisialisasi Header Dokumen
    if (docSheet.getLastRow() === 0) {
      docSheet.appendRow([
        "Waktu Transaksi", "ID Dokumen", "Nomor Berkas", "Judul Dokumen", "OPD / Dinas",
        "Versi", "Format", "Nama Pemohon", "Email Pemohon", "Instansi Pemohon", "Status Verifikasi",
        "Nama Verifikator", "NIP Verifikator", "Nomor Registrasi/BAV", "Tautan Berkas Google Drive",
        "ID File Google Drive", "Catatan Verifikator/Pemeriksa", "Kode Hash Keamanan"
      ]);
      docSheet.getRange(1, 1, 1, 18).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
    }

    var userSheet = getOrCreateSheet(ss, "DATABASE_PENGGUNA");
    if (userSheet.getLastRow() === 0) {
      userSheet.appendRow([
        "Waktu Pembaruan", "User ID", "Username", "Email Kedinasan", "Nama Pengguna", "Peran Akun",
        "OPD / Instansi", "NIP / Kontak", "URL Folder Google Drive", "Password", "Status Akun"
      ]);
      userSheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#1e293b").setFontColor("#38bdf8");
    }

    var folderSheet = getOrCreateSheet(ss, "MAPPING_FOLDER_OPD");
    if (folderSheet.getLastRow() === 0) {
      folderSheet.appendRow([
        "Waktu Pendaftaran", "ID OPD", "Nama Dinas", "URL Folder Google Drive",
        "ID Folder Google Drive", "Nama Subfolder", "Didaftarkan Oleh", "NIP / Kontak", "Catatan"
      ]);
      folderSheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#065f46").setFontColor("#34d399");
    }

    // Aksi 1: PING UJI KONEKSI
    if (data.action === "TEST_PING") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Koneksi Webhook Google Sheets & Drive Server Aktif!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 2: PENDAFTARAN AKUN DARI WEB
    if (data.action === "REGISTER_USER_ACCOUNT") {
      return ContentService.createTextOutput(JSON.stringify(
        adminSaveUserAccount(data.userId, data.username, data.email, data.pemohonName || data.nama, data.role, data.opdName, data.verifierNip || data.nip, data.newPassword, data.driveFolderUrl)
      )).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 3: VERIFIKASI DOKUMEN DARI LUAR
    if (data.action === "VERIFY_DOCUMENT") {
      var dVals = docSheet.getDataRange().getValues();
      for (var d = 1; d < dVals.length; d++) {
        if (dVals[d][1] === data.docId || dVals[d][2] === data.docNumber) {
          docSheet.getRange(d + 1, 11).setValue(data.status);
          docSheet.getRange(d + 1, 12).setValue(data.verifierName || "Admin Verifikator");
          docSheet.getRange(d + 1, 13).setValue(data.verifierNip || "-");
          docSheet.getRange(d + 1, 14).setValue(data.bavNumber || "-");
          docSheet.getRange(d + 1, 17).setValue(data.notes || "-");
          docSheet.getRange(d + 1, 18).setValue(data.digitalSealHash || "-");
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Status verifikasi berhasil dicatat di sheet."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 4: SIMPAN UNGGAHAN DOKUMEN BARU ATAU REVISI DARI DINAS
    var driveFileUrl = data.downloadUrl || data.driveFolderUrl || "";
    var driveFileId = "";

    if (data.fileBase64 && data.fileBase64.length > 50) {
      try {
        var targetFolder = DriveApp.getRootFolder();
        var targetFolderId = data.driveMasterFolderId || MASTER_FOLDER_ID;
        if (targetFolderId && targetFolderId.length > 5) {
          try { targetFolder = DriveApp.getFolderById(targetFolderId); } catch(fErr){}
        }
        var decodedBytes = Utilities.base64Decode(data.fileBase64);
        var blob = Utilities.newBlob(decodedBytes, data.fileMimeType || "application/pdf", data.fileName || "dokumen_sakip.pdf");
        var driveFile = targetFolder.createFile(blob);
        driveFile.setDescription("Dokumen SAKIP: " + (data.docNumber || "") + " - " + (data.pemohonEmail || "") + " - v" + (data.versionNumber || 1));
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        driveFileUrl = driveFile.getUrl();
        driveFileId = driveFile.getId();
      } catch (driveErr) {
        driveFileUrl = data.downloadUrl || data.driveFolderUrl || "https://drive.google.com";
      }
    }

    docSheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.docId,
      data.docNumber,
      data.title,
      data.opdName,
      "v" + (data.versionNumber || 1),
      data.format,
      data.pemohonName,
      data.pemohonEmail || data.email || "-",
      data.pemohonInstansi,
      data.status || "PENDING",
      data.verifierName || "-",
      data.verifierNip || "-",
      data.bavNumber || "-",
      driveFileUrl,
      driveFileId,
      data.notes || "-",
      data.digitalSealHash || "-"
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data dokumen berhasil masuk ke baris sheet DATA_VERIFIKASI_DOKUMEN.",
      fileUrl: driveFileUrl,
      fileId: driveFileId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. Helper Pengambil Seluruh Data untuk Dashboard & API
 */
function adminGetDashboardData() {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", documents: [], users: [], spreadsheetUrl: "" };

  var docSheet = ss.getSheetByName("DATA_VERIFIKASI_DOKUMEN");
  var userSheet = ss.getSheetByName("DATABASE_PENGGUNA");
  
  var docs = [];
  if (docSheet && docSheet.getLastRow() > 1) {
    var v = docSheet.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      docs.push({
        tanggalMasuk: String(v[i][0] || ""),
        id: String(v[i][1] || "DOC-" + i),
        nomorBerkas: String(v[i][2] || ""),
        judul: String(v[i][3] || ""),
        opdName: String(v[i][4] || ""),
        currentVersion: Number(String(v[i][5] || "1").replace("v", "")) || 1,
        format: String(v[i][6] || "PDF"),
        pemohon: {
          nama: String(v[i][7] || "Pemohon"),
          email: String(v[i][8] || ""),
          instansi: String(v[i][9] || ""),
        },
        status: String(v[i][10] || "PENDING"),
        verifierName: String(v[i][11] || ""),
        verifierNip: String(v[i][12] || ""),
        bavNumber: String(v[i][13] || ""),
        googleDrive: {
          viewUrl: String(v[i][14] || ""),
          downloadUrl: String(v[i][14] || ""),
          fileId: String(v[i][15] || "")
        },
        notes: String(v[i][16] || ""),
        digitalSealHash: String(v[i][17] || "")
      });
    }
  }

  var users = [];
  if (userSheet && userSheet.getLastRow() > 1) {
    var u = userSheet.getDataRange().getValues();
    for (var j = 1; j < u.length; j++) {
      users.push({
        id: String(u[j][1] || "USR-" + j),
        username: String(u[j][2] || ""),
        email: String(u[j][3] || ""),
        nama: String(u[j][4] || ""),
        role: String(u[j][5] || "DINAS_PEMOHON"),
        opdName: String(u[j][6] || ""),
        nip: String(u[j][7] || ""),
        driveFolderUrl: String(u[j][8] || ""),
        password: String(u[j][9] || "123456"),
        status: String(u[j][10] || "AKTIF")
      });
    }
  }

  return {
    status: "success",
    spreadsheetUrl: ss.getUrl(),
    documents: docs,
    users: users
  };
}

/**
 * 4. Fungsi Server untuk Memproses Keputusan Verifikasi Admin
 */
function adminProcessVerification(docId, docNumber, status, verifierName, verifierNip, bavNumber, notes) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
  var docSheet = ss.getSheetByName("DATA_VERIFIKASI_DOKUMEN");
  if (!docSheet) return { status: "error", message: "Sheet DATA_VERIFIKASI_DOKUMEN tidak ada" };

  var foundRow = -1;
  var dVals = docSheet.getDataRange().getValues();
  for (var d = 1; d < dVals.length; d++) {
    if (dVals[d][1] === docId || dVals[d][2] === docNumber) {
      foundRow = d + 1;
      break;
    }
  }

  var seal = "SEAL-ADMIN-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMddHHmmss");
  if (foundRow > 0) {
    docSheet.getRange(foundRow, 11).setValue(status);
    docSheet.getRange(foundRow, 12).setValue(verifierName || "Admin Verifikator SAKIP");
    docSheet.getRange(foundRow, 13).setValue(verifierNip || "-");
    docSheet.getRange(foundRow, 14).setValue(bavNumber || ("BAV/SAKIP/" + docNumber));
    docSheet.getRange(foundRow, 17).setValue(notes || "Pemeriksaan SAKIP selesai");
    docSheet.getRange(foundRow, 18).setValue(seal);
  }

  return adminGetDashboardData();
}

/**
 * 5. Fungsi Server untuk Mengelola Akun Dinas di Sheet 'DATABASE_PENGGUNA'
 */
function adminSaveUserAccount(userId, username, email, nama, role, opdName, nip, password, driveFolderUrl) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
  var userSheet = getOrCreateSheet(ss, "DATABASE_PENGGUNA");

  var foundUserRow = -1;
  var uVals = userSheet.getDataRange().getValues();
  for (var u = 1; u < uVals.length; u++) {
    if (uVals[u][2] === username || uVals[u][3] === email || uVals[u][1] === userId) {
      foundUserRow = u + 1;
      break;
    }
  }

  var effectiveEmail = email || (username + "@nagekeokab.go.id");
  var now = new Date().toISOString();

  if (foundUserRow > 0) {
    userSheet.getRange(foundUserRow, 1).setValue(now);
    userSheet.getRange(foundUserRow, 4).setValue(effectiveEmail);
    userSheet.getRange(foundUserRow, 5).setValue(nama || "-");
    userSheet.getRange(foundUserRow, 6).setValue(role || "DINAS_PEMOHON");
    userSheet.getRange(foundUserRow, 7).setValue(opdName || "-");
    userSheet.getRange(foundUserRow, 8).setValue(nip || "-");
    userSheet.getRange(foundUserRow, 9).setValue(driveFolderUrl || "-");
    if (password) userSheet.getRange(foundUserRow, 10).setValue(password);
  } else {
    userSheet.appendRow([
      now,
      userId || ("usr-" + username),
      username,
      effectiveEmail,
      nama || "-",
      role || "DINAS_PEMOHON",
      opdName || "-",
      nip || "-",
      driveFolderUrl || "-",
      password || "123456",
      "AKTIF"
    ]);
  }

  return adminGetDashboardData();
}
`;

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
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-emerald-500 selection:text-white">

  <!-- HEADER UTAMA ADMIN -->
  <header class="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">
        <i class="fa-solid fa-shield-halved"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-sm sm:text-base font-extrabold text-white tracking-tight">DASHBOARD ADMIN SAKIP</h1>
          <span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">VERIFIKASI &amp; USER</span>
        </div>
        <p class="text-[11px] text-slate-400 font-medium">Pemerintah Kabupaten Nagekeo &bull; Terhubung Langsung ke Sheet &amp; User Dinas</p>
      </div>
    </div>

    <div class="flex items-center gap-2.5">
      <button onclick="loadAllData()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer">
        <i class="fa-solid fa-rotate" id="refreshIcon"></i>
        <span>Segarkan Data</span>
      </button>
      <a id="sheetLinkBtn" href="#" target="_blank" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95">
        <i class="fa-solid fa-table"></i>
        <span>Buka Google Sheet</span>
      </a>
    </div>
  </header>

  <!-- MAIN WORKSPACE -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">

    <!-- METRIK STATISTIK -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div class="text-slate-400 text-xs font-medium">Total Berkas Masuk</div>
        <div class="text-2xl font-black text-white mt-1" id="statTotalDocs">0</div>
        <div class="text-[10px] text-slate-500 mt-1 font-mono">Semua Usulan SAKIP</div>
      </div>
      <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div class="text-amber-400 text-xs font-medium">Menunggu Verifikasi</div>
        <div class="text-2xl font-black text-amber-400 mt-1" id="statPendingDocs">0</div>
        <div class="text-[10px] text-slate-500 mt-1 font-mono">Belum Diperiksa Admin</div>
      </div>
      <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div class="text-rose-400 text-xs font-medium">Perlu Perbaikan / Revisi</div>
        <div class="text-2xl font-black text-rose-400 mt-1" id="statRevisionDocs">0</div>
        <div class="text-[10px] text-slate-500 mt-1 font-mono">Dikembalikan ke Dinas</div>
      </div>
      <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div class="text-sky-400 text-xs font-medium">Akun Dinas Terdaftar</div>
        <div class="text-2xl font-black text-sky-400 mt-1" id="statTotalUsers">0</div>
        <div class="text-[10px] text-slate-500 mt-1 font-mono">@nagekeokab.go.id</div>
      </div>
    </div>

    <!-- TAB NAVIGASI UTAMA DASHBOARD ADMIN -->
    <div class="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div class="flex border-b border-slate-800 bg-slate-900 px-4 sm:px-6 gap-3 sm:gap-6 text-xs font-bold overflow-x-auto">
        <button onclick="switchTab('DOCS')" id="tabBtnDocs" class="py-4 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2 cursor-pointer">
          <i class="fa-solid fa-file-signature"></i>
          <span>1. Verifikasi Berkas Dokumen SAKIP</span>
        </button>
        <button onclick="switchTab('USERS')" id="tabBtnUsers" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer">
          <i class="fa-solid fa-users-gear text-sky-400"></i>
          <span>2. Kelola Akun &amp; Pengguna Dinas (@nagekeokab.go.id)</span>
        </button>
      </div>

      <!-- TAB 1: VERIFIKASI DOKUMEN -->
      <div id="tabContentDocs" class="p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="relative flex-1 min-w-[260px]">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input type="text" id="docSearch" oninput="renderDocs()" placeholder="Cari nomor berkas, judul dokumen, nama dinas, atau email..." class="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500">
          </div>

          <div class="flex items-center gap-1.5 text-xs overflow-x-auto">
            <button onclick="filterByStatus('ALL')" class="px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 text-white transition-colors" id="filterStatusAll">Semua</button>
            <button onclick="filterByStatus('PENDING')" class="px-3.5 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors" id="filterStatusPending">Menunggu</button>
            <button onclick="filterByStatus('REVISION')" class="px-3.5 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors" id="filterStatusRevision">Perlu Revisi</button>
            <button onclick="filterByStatus('APPROVED')" class="px-3.5 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors" id="filterStatusApproved">Disetujui (Sah)</button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Waktu / No. Berkas</th>
                <th class="p-3.5">Judul Dokumen &amp; OPD</th>
                <th class="p-3.5">Pemohon &amp; Email Dinas</th>
                <th class="p-3.5">File Drive</th>
                <th class="p-3.5">Status</th>
                <th class="p-3.5">Catatan Verifikator</th>
                <th class="p-3.5 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody id="docsTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="7" class="p-8 text-center text-slate-500">Memuat data dari Google Sheets...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: KELOLA AKUN & PENGGUNA DINAS -->
      <div id="tabContentUsers" class="p-5 space-y-4 hidden">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div>
            <div class="font-bold text-white text-sm flex items-center gap-2">
              <i class="fa-solid fa-users text-sky-400"></i>
              <span>Pusat Pengelolaan Akun Dinas Kabupaten Nagekeo</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Tersinkronisasi ke Google Sheet lembar <strong>DATABASE_PENGGUNA</strong></p>
          </div>

          <button onclick="openUserModal()" class="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer">
            <i class="fa-solid fa-user-plus"></i>
            <span>+ Daftarkan Akun Dinas Baru</span>
          </button>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">Username Login</th>
                <th class="p-3.5">Email Kedinasan</th>
                <th class="p-3.5">Nama &amp; OPD</th>
                <th class="p-3.5">Peran</th>
                <th class="p-3.5">Password</th>
                <th class="p-3.5">Status</th>
                <th class="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="usersTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="7" class="p-8 text-center text-slate-500">Memuat data pengguna...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </main>

  <!-- MODAL VERIFIKASI DOKUMEN -->
  <div id="verifyModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="font-bold text-white text-base flex items-center gap-2">
          <i class="fa-solid fa-file-signature text-emerald-400"></i>
          <span>Formulir Keputusan Verifikasi &amp; BAV</span>
        </div>
        <button onclick="closeVerifyModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-1">
        <div class="text-[10px] text-emerald-400 font-mono font-bold" id="modalDocNumber">-</div>
        <div class="font-bold text-white text-sm" id="modalDocTitle">-</div>
        <div class="text-slate-400 font-medium" id="modalDocOpd">-</div>
      </div>

      <div class="space-y-4 text-xs">
        <div>
          <label class="block text-slate-300 font-bold mb-1.5">Keputusan Status Verifikasi :</label>
          <select id="selectStatus" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:border-emerald-500 focus:outline-none cursor-pointer">
            <option value="APPROVED">✅ SAH / DISETUJUI (TERBITKAN NOMOR BAV)</option>
            <option value="REVISION">⚠️ PERLU REVISI / PERBAIKAN (KEMBALIKAN KE DINAS)</option>
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
          <label class="block text-slate-300 font-bold mb-1.5">Catatan / Petunjuk Perbaikan untuk Dinas :</label>
          <textarea id="inputNotes" rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" placeholder="Catatan evaluasi atau perbaikan..."></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        <button onclick="closeVerifyModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer">Batal</button>
        <button id="btnSubmitVerify" onclick="submitVerification()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95">
          <i class="fa-solid fa-check"></i> <span>Sahkan &amp; Simpan ke Google Sheet</span>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL TAMBAH / EDIT AKUN PENGGUNA DINAS -->
  <div id="userModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 hidden">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="font-bold text-white text-base flex items-center gap-2">
          <i class="fa-solid fa-user-gear text-sky-400"></i>
          <span>Kelola Akun Dinas (@nagekeokab.go.id)</span>
        </div>
        <button onclick="closeUserModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <div class="space-y-3 text-xs">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-300 font-bold mb-1">Username Login :</label>
            <input type="text" id="inputUsername" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none" placeholder="contoh: disdik">
          </div>
          <div>
            <label class="block text-slate-300 font-bold mb-1">Password :</label>
            <input type="text" id="inputPassword" value="123456" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none">
          </div>
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1">Email Kedinasan (@nagekeokab.go.id) :</label>
          <input type="email" id="inputEmail" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none" placeholder="disdik@nagekeokab.go.id">
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1">Nama Pengguna / Pejabat :</label>
          <input type="text" id="inputNama" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-sky-500 focus:outline-none" placeholder="Nama lengkap pengguna...">
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1">OPD / Instansi :</label>
          <input type="text" id="inputOpd" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-sky-500 focus:outline-none" placeholder="Contoh: Dinas Pendidikan dan Kebudayaan">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-300 font-bold mb-1">NIP / Kontak :</label>
            <input type="text" id="inputUserNip" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none" placeholder="1980...">
          </div>
          <div>
            <label class="block text-slate-300 font-bold mb-1">Peran Akun :</label>
            <select id="selectRole" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-sky-500 focus:outline-none">
              <option value="DINAS_PEMOHON">DINAS_PEMOHON (User Dinas)</option>
              <option value="VERIFIKATOR">VERIFIKATOR (Admin SAKIP)</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1">URL Folder Google Drive OPD :</label>
          <input type="text" id="inputDriveUrl" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:border-sky-500 focus:outline-none" placeholder="https://drive.google.com/drive/folders/...">
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        <button onclick="closeUserModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer">Batal</button>
        <button id="btnSubmitUser" onclick="submitUser()" class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-sky-600/30 cursor-pointer active:scale-95">
          <i class="fa-solid fa-save"></i> <span>Simpan ke DATABASE_PENGGUNA</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    var globalData = { documents: [], users: [] };
    var activeStatusFilter = 'ALL';
    var selectedVerifyDoc = null;

    function loadAllData() {
      var icon = document.getElementById('refreshIcon');
      if (icon) icon.classList.add('fa-spin');

      google.script.run
        .withSuccessHandler(function(res) {
          if (icon) icon.classList.remove('fa-spin');
          if (res && res.status === 'success') {
            globalData = res;
            if (res.spreadsheetUrl) {
              document.getElementById('sheetLinkBtn').href = res.spreadsheetUrl;
            }
            renderStats();
            renderDocs();
            renderUsers();
          }
        })
        .withFailureHandler(function(err) {
          if (icon) icon.classList.remove('fa-spin');
          alert('Gagal memuat data dari Google Sheets: ' + err.toString());
        })
        .adminGetDashboardData();
    }

    function renderStats() {
      var docs = globalData.documents || [];
      var users = globalData.users || [];
      document.getElementById('statTotalDocs').innerText = docs.length;
      document.getElementById('statPendingDocs').innerText = docs.filter(function(d){ return d.status === 'PENDING'; }).length;
      document.getElementById('statRevisionDocs').innerText = docs.filter(function(d){ return d.status === 'REVISION'; }).length;
      document.getElementById('statTotalUsers').innerText = users.length;
    }

    function renderDocs() {
      var docs = globalData.documents || [];
      var search = (document.getElementById('docSearch').value || '').toLowerCase();

      var filtered = docs.filter(function(d) {
        var matchStatus = activeStatusFilter === 'ALL' || d.status === activeStatusFilter;
        var matchSearch = !search ||
          (d.nomorBerkas && d.nomorBerkas.toLowerCase().includes(search)) ||
          (d.judul && d.judul.toLowerCase().includes(search)) ||
          (d.opdName && d.opdName.toLowerCase().includes(search)) ||
          (d.pemohon && d.pemohon.email && d.pemohon.email.toLowerCase().includes(search));
        return matchStatus && matchSearch;
      });

      var tbody = document.getElementById('docsTableBody');
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-500">Tidak ada berkas yang sesuai filter.</td></tr>';
        return;
      }

      var html = '';
      filtered.forEach(function(d) {
        var statusBadge = '';
        if (d.status === 'APPROVED') {
          statusBadge = '<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full font-bold text-[10px]">SAH / DISETUJUI</span>';
        } else if (d.status === 'REVISION') {
          statusBadge = '<span class="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2.5 py-1 rounded-full font-bold text-[10px]">PERLU REVISI</span>';
        } else if (d.status === 'REJECTED') {
          statusBadge = '<span class="bg-slate-700 text-slate-300 border border-slate-600 px-2.5 py-1 rounded-full font-bold text-[10px]">DITOLAK</span>';
        } else {
          statusBadge = '<span class="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2.5 py-1 rounded-full font-bold text-[10px]">MENUNGGU</span>';
        }

        var driveLink = d.googleDrive && d.googleDrive.viewUrl && d.googleDrive.viewUrl.length > 5
          ? '<a href="' + d.googleDrive.viewUrl + '" target="_blank" class="text-sky-400 hover:underline flex items-center gap-1 font-mono text-[11px]"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Drive</a>'
          : '<span class="text-slate-500 font-mono">-</span>';

        var actionButton = '<button onclick="openVerifyModal(\\'' + (d.id || '') + '\\', \\'' + (d.nomorBerkas || '') + '\\', \\'' + (d.judul || '').replace(/'/g, "\\\\'") + '\\', \\'' + (d.opdName || '').replace(/'/g, "\\\\'") + '\\')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer">' +
          '<i class="fa-solid fa-signature"></i> <span>Verifikasi Berkas</span></button>';

        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5"><div class="font-bold text-white font-mono">' + (d.nomorBerkas || '-') + '</div><div class="text-[10px] text-slate-500 font-mono">' + (d.tanggalMasuk || '') + '</div></td>' +
          '<td class="p-3.5"><div class="font-bold text-slate-200">' + (d.judul || '-') + '</div><div class="text-[11px] text-emerald-400 font-medium">' + (d.opdName || '-') + ' &bull; v' + (d.currentVersion || 1) + '</div></td>' +
          '<td class="p-3.5 font-mono text-[11px] text-slate-400"><div class="text-slate-200 font-sans">' + ((d.pemohon && d.pemohon.nama) ? d.pemohon.nama : '-') + '</div><div>' + ((d.pemohon && d.pemohon.email) ? d.pemohon.email : '-') + '</div></td>' +
          '<td class="p-3.5">' + driveLink + '</td>' +
          '<td class="p-3.5">' + statusBadge + '</td>' +
          '<td class="p-3.5 text-[11px] text-slate-400 max-w-xs truncate" title="' + (d.notes || '-') + '">' + (d.notes || '-') + '</td>' +
          '<td class="p-3.5 text-right">' + actionButton + '</td>' +
          '</tr>';
      });

      tbody.innerHTML = html;
    }

    function renderUsers() {
      var users = globalData.users || [];
      var tbody = document.getElementById('usersTableBody');
      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-500">Belum ada akun dinas. Klik "+ Daftarkan Akun Dinas Baru" di atas.</td></tr>';
        return;
      }

      var html = '';
      users.forEach(function(u) {
        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5 font-bold font-mono text-sky-400">@' + (u.username || '') + '</td>' +
          '<td class="p-3.5 font-mono text-emerald-400 font-semibold">' + (u.email || '') + '</td>' +
          '<td class="p-3.5"><div class="font-bold text-slate-200">' + (u.nama || '-') + '</div><div class="text-[10px] text-slate-400">' + (u.opdName || '-') + '</div></td>' +
          '<td class="p-3.5"><span class="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">' + (u.role || 'DINAS_PEMOHON') + '</span></td>' +
          '<td class="p-3.5 font-mono text-slate-300 font-bold">' + (u.password || '******') + '</td>' +
          '<td class="p-3.5"><span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold text-[10px]">AKTIF</span></td>' +
          '<td class="p-3.5 text-right"><button onclick="editUserAccount(\\'' + (u.username || '') + '\\', \\'' + (u.email || '') + '\\', \\'' + (u.nama || '') + '\\', \\'' + (u.opdName || '') + '\\', \\'' + (u.password || '') + '\\')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-bold transition-colors"><i class="fa-solid fa-pen-to-square"></i> Edit</button></td>' +
          '</tr>';
      });

      tbody.innerHTML = html;
    }

    function switchTab(tab) {
      document.getElementById('tabContentDocs').classList.add('hidden');
      document.getElementById('tabContentUsers').classList.add('hidden');
      document.getElementById('tabBtnDocs').className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer';
      document.getElementById('tabBtnUsers').className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer';

      if (tab === 'DOCS') {
        document.getElementById('tabContentDocs').classList.remove('hidden');
        document.getElementById('tabBtnDocs').className = 'py-4 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2 cursor-pointer';
      } else {
        document.getElementById('tabContentUsers').classList.remove('hidden');
        document.getElementById('tabBtnUsers').className = 'py-4 border-b-2 border-sky-500 text-sky-400 flex items-center gap-2 cursor-pointer';
      }
    }

    function openVerifyModal(docId, docNumber, title, opd) {
      selectedVerifyDoc = { id: docId, docNumber: docNumber, title: title, opd: opd };
      var modal = document.getElementById('verifyModal');
      if (!modal) return;
      document.getElementById('modalDocNumber').innerText = docNumber;
      document.getElementById('modalDocTitle').innerText = title;
      document.getElementById('modalDocOpd').innerText = opd;
      document.getElementById('inputBav').value = 'BAV/SAKIP/' + docNumber;
      modal.classList.remove('hidden');
    }

    function closeVerifyModal() {
      var modal = document.getElementById('verifyModal');
      if (modal) modal.classList.add('hidden');
      selectedVerifyDoc = null;
    }

    function submitVerification() {
      if (!selectedVerifyDoc) return;
      var status = document.getElementById('selectStatus').value;
      var verifier = document.getElementById('inputVerifier').value || 'Admin Verifikator';
      var nip = document.getElementById('inputNip').value || '-';
      var bav = document.getElementById('inputBav').value || ('BAV/SAKIP/' + selectedVerifyDoc.docNumber);
      var notes = document.getElementById('inputNotes').value || 'Pemeriksaan SAKIP selesai';

      var btn = document.getElementById('btnSubmitVerify');
      if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }

      google.script.run
        .withSuccessHandler(function(res) {
          if (btn) { btn.disabled = false; btn.innerText = 'Sahkan & Simpan ke Google Sheet'; }
          closeVerifyModal();
          if (res && res.status === 'success') {
            globalData = res;
            renderStats();
            renderDocs();
            alert('Hasil verifikasi berkas ' + selectedVerifyDoc.docNumber + ' berhasil disimpan di Google Sheet!');
          }
        })
        .withFailureHandler(function(err) {
          if (btn) { btn.disabled = false; btn.innerText = 'Sahkan & Simpan ke Google Sheet'; }
          alert('Gagal memverifikasi: ' + err.toString());
        })
        .adminProcessVerification(selectedVerifyDoc.id, selectedVerifyDoc.docNumber, status, verifier, nip, bav, notes);
    }

    function openUserModal() {
      document.getElementById('inputUsername').value = '';
      document.getElementById('inputPassword').value = '123456';
      document.getElementById('inputEmail').value = '';
      document.getElementById('inputNama').value = '';
      document.getElementById('inputOpd').value = '';
      document.getElementById('inputUserNip').value = '';
      document.getElementById('userModal').classList.remove('hidden');
    }

    function editUserAccount(username, email, nama, opd, pass) {
      document.getElementById('inputUsername').value = username;
      document.getElementById('inputEmail').value = email;
      document.getElementById('inputNama').value = nama;
      document.getElementById('inputOpd').value = opd;
      document.getElementById('inputPassword').value = pass || '123456';
      document.getElementById('userModal').classList.remove('hidden');
    }

    function closeUserModal() {
      document.getElementById('userModal').classList.add('hidden');
    }

    function submitUser() {
      var username = document.getElementById('inputUsername').value.trim();
      var pass = document.getElementById('inputPassword').value.trim();
      var email = document.getElementById('inputEmail').value.trim();
      var nama = document.getElementById('inputNama').value.trim();
      var opd = document.getElementById('inputOpd').value.trim();
      var nip = document.getElementById('inputUserNip').value.trim();
      var role = document.getElementById('selectRole').value;
      var driveUrl = document.getElementById('inputDriveUrl').value.trim();

      if (!username) { alert('Harap isi username!'); return; }
      if (!email) email = username + '@nagekeokab.go.id';

      var btn = document.getElementById('btnSubmitUser');
      if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan Akun...'; }

      google.script.run
        .withSuccessHandler(function(res) {
          if (btn) { btn.disabled = false; btn.innerText = 'Simpan ke DATABASE_PENGGUNA'; }
          closeUserModal();
          if (res && res.status === 'success') {
            globalData = res;
            renderStats();
            renderUsers();
            alert('Akun dinas @' + username + ' berhasil dicatat di sheet DATABASE_PENGGUNA!');
          }
        })
        .withFailureHandler(function(err) {
          if (btn) { btn.disabled = false; btn.innerText = 'Simpan ke DATABASE_PENGGUNA'; }
          alert('Gagal menyimpan akun: ' + err.toString());
        })
        .adminSaveUserAccount('usr-' + username, username, email, nama, role, opd, nip, pass, driveUrl);
    }

    function filterByStatus(status) {
      activeStatusFilter = status;
      var btnIds = ['filterStatusAll', 'filterStatusPending', 'filterStatusRevision', 'filterStatusApproved'];
      btnIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.className = 'px-3.5 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors';
      });

      var activeId = 'filterStatusAll';
      if (status === 'PENDING') activeId = 'filterStatusPending';
      if (status === 'REVISION') activeId = 'filterStatusRevision';
      if (status === 'APPROVED') activeId = 'filterStatusApproved';

      var activeEl = document.getElementById(activeId);
      if (activeEl) activeEl.className = 'px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 text-white transition-colors';
      renderDocs();
    }

    window.onload = function() {
      loadAllData();
    };
  </script>
</body>
</html>`;
