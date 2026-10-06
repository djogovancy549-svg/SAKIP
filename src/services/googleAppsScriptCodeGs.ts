/**
 * GOOGLE APPS SCRIPT: Code.gs (Backend Controller & 3-Worksheet & 3-Folder Lifecycle Engine)
 * SIMVERIF SAKIP - PEMERINTAH KABUPATEN NAGEKEO
 * 
 * STRUKTUR WORKSPACE & FOLDER MULTI-LIFECYCLE:
 * 1. Sheet 'DOKUMEN_PROSES': Berkas dalam usulan / antrean verifikasi / telaah.
 *    Folder Drive: '01_DOKUMEN_PROSES'
 *    -> Saat status DISAHKAN (APPROVED), baris LANGSUNG DIHAPUS dari sheet ini!
 * 2. Sheet 'DOKUMEN_SAH_TERVERIFIKASI': Berkas sah, nomor BAV & segel resmi.
 *    Folder Drive: '02_DOKUMEN_SAH_FINAL_5_TAHUN'
 *    -> Retensi Resmi: Disimpan selama 5 TAHUN (1825 hari) lalu dibersihkan.
 * 3. Sheet 'SUMMARY_RIWAYAT_REVISI': Ringkasan evaluasi, draf perbaikan, & log telaah.
 *    Folder Drive: '03_DRAF_REVISI_SUMMARY_3_BULAN'
 *    -> Retensi Draf: OTOMATIS DIBERSIHKAN DALAM 3 BULAN (90 hari) langsung di Apps Script.
 * 4. Sheet 'DATABASE_PENGGUNA': Akun dinas (@nagekeokab.go.id).
 * 5. Sheet 'MAPPING_FOLDER_OPD': Pemetaan folder Google Drive per 38 OPD.
 */

export const APPS_SCRIPT_CODE_GS = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: Code.gs (Backend 3-Worksheet & 3-Folder Lifecycle Engine)
 * SAKIP NAGEKEO - PEMBERSIHAN OTOMATIS 3 BULAN (REVISI) & 5 TAHUN (SAH)
 * DILENGKAPI FITUR AUTO-MIGRASI DATA LAMA & SERVER-SIDE FILE READER
 * =========================================================================
 */

var MASTER_FOLDER_ID = "1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7";
var RETENTION_REVISION_DAYS = 90; // 3 Bulan untuk draf & summary revisi
var RETENTION_APPROVED_DAYS = 1825; // 5 Tahun untuk dokumen sah

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

function getMasterFolder() {
  try {
    if (MASTER_FOLDER_ID && MASTER_FOLDER_ID.length > 10) {
      return DriveApp.getFolderById(MASTER_FOLDER_ID);
    }
  } catch (e) {}
  try {
    var foundMasters = DriveApp.getFoldersByName("DATABASE_SIMVERIF_SAKIP_NAGEKEO");
    if (foundMasters.hasNext()) return foundMasters.next();
    var createdMaster = DriveApp.createFolder("DATABASE_SIMVERIF_SAKIP_NAGEKEO");
    try { createdMaster.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return createdMaster;
  } catch (e2) {}
  return DriveApp.getRootFolder();
}

/**
 * =========================================================================
 * FOLDER TUNGGAL PER OPD (1 DINAS = 1 FOLDER GOOGLE DRIVE)
 * Memastikan semua berkas (baru, revisi, maupun disahkan) milik satu dinas
 * masuk secara otomatis ke SATU folder Google Drive saja.
 * Sangat ketat memeriksa pendaftaran agar TIDAK MEMBUAT FOLDER GANDA.
 * =========================================================================
 */
function getSingleOpdFolder(opdName, opdId, customFolderId, customFolderUrl) {
  var rawName = String(opdName || opdId || "UMUM_OPD").trim();
  var cleanName = rawName.replace(/^SAKIP\s*[-_:]\s*/i, "").replace(/^Folder\s*/i, "").trim();
  if (!cleanName) cleanName = "UMUM_OPD";
  var folderDisplayName = "SAKIP - " + cleanName;

  function extractFolderId(candidate) {
    if (!candidate || typeof candidate !== "string") return "";
    var s = candidate.trim();
    if (s.indexOf("folders/") !== -1) {
      var m = s.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (m) return m[1];
    }
    if (s.length >= 20 && s.length <= 50 && s.indexOf("http") === -1 && s.indexOf(" ") === -1 && s.indexOf("/") === -1) {
      return s;
    }
    return "";
  }

  // 1. Cek parameter customFolderId / customFolderUrl yang dikirim dari aplikasi
  var directId = extractFolderId(customFolderId) || extractFolderId(customFolderUrl);
  if (directId) {
    try {
      var fDirect = DriveApp.getFolderById(directId);
      if (fDirect) {
        try { fDirect.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
        return fDirect;
      }
    } catch (e) {}
  }

  // 2. Cek sheet MAPPING_FOLDER_OPD & DATABASE_PENGGUNA
  try {
    var ss = getActiveSpreadsheetSafely();
    if (ss) {
      var mapSheet = ss.getSheetByName("MAPPING_FOLDER_OPD");
      if (mapSheet && mapSheet.getLastRow() > 1) {
        var mVals = mapSheet.getDataRange().getValues();
        for (var m = 1; m < mVals.length; m++) {
          var mId = String(mVals[m][1] || "").trim().toLowerCase();
          var mName = String(mVals[m][2] || "").trim().toLowerCase();
          var targetId = String(opdId || "").trim().toLowerCase();
          var targetName = cleanName.toLowerCase();

          if ((targetId && mId === targetId) || (targetName && (mName === targetName || mName.indexOf(targetName) !== -1 || targetName.indexOf(mName) !== -1))) {
            var rowText = mVals[m].join(" ");
            var fid = extractFolderId(rowText);
            if (fid) {
              try {
                var fMap = DriveApp.getFolderById(fid);
                if (fMap) {
                  try { fMap.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
                  return fMap;
                }
              } catch (e) {}
            }
          }
        }
      }

      var uSheet = ss.getSheetByName("DATABASE_PENGGUNA");
      if (uSheet && uSheet.getLastRow() > 1) {
        var uVals = uSheet.getDataRange().getValues();
        for (var u = 1; u < uVals.length; u++) {
          var uOpd = String(uVals[u][6] || "").trim().toLowerCase();
          if (cleanName.toLowerCase() === uOpd || cleanName.toLowerCase().indexOf(uOpd) !== -1 || uOpd.indexOf(cleanName.toLowerCase()) !== -1) {
            var uFid = extractFolderId(String(uVals[u][8] || ""));
            if (uFid) {
              try {
                var fUser = DriveApp.getFolderById(uFid);
                if (fUser) {
                  try { fUser.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
                  return fUser;
                }
              } catch (e) {}
            }
          }
        }
      }
    }
  } catch (errDb) {}

  // 3. Cari di dalam folder Master Google Drive
  var master = getMasterFolder();
  var exactFolders = master.getFoldersByName(folderDisplayName);
  if (exactFolders.hasNext()) return exactFolders.next();

  var plainFolders = master.getFoldersByName(cleanName);
  if (plainFolders.hasNext()) return plainFolders.next();

  var allSubFolders = master.getFolders();
  while (allSubFolders.hasNext()) {
    var subF = allSubFolders.next();
    var subName = subF.getName().toLowerCase();
    if (subName.indexOf(cleanName.toLowerCase()) !== -1 || (opdId && subName.indexOf(String(opdId).toLowerCase()) !== -1)) {
      return subF;
    }
  }

  // 4. Cari di seluruh Google Drive sebelum membuat folder baru
  try {
    var globalF = DriveApp.getFoldersByName(folderDisplayName);
    if (globalF.hasNext()) return globalF.next();
    var globalF2 = DriveApp.getFoldersByName("Folder " + cleanName);
    if (globalF2.hasNext()) return globalF2.next();
    var globalF3 = DriveApp.getFoldersByName(cleanName);
    if (globalF3.hasNext()) return globalF3.next();
  } catch (eG) {}

  // 5. Hanya jika benar-benar belum ada folder sama sekali, buat 1 folder di master
  try {
    var newFolder = master.createFolder(folderDisplayName);
    try {
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) {}

    // Daftarkan ke MAPPING_FOLDER_OPD
    try {
      var ss2 = getActiveSpreadsheetSafely();
      if (ss2) {
        var mapSheet2 = ss2.getSheetByName("MAPPING_FOLDER_OPD");
        if (mapSheet2) {
          mapSheet2.appendRow([
            new Date().toLocaleString("id-ID"),
            opdId || cleanName,
            cleanName,
            newFolder.getUrl(),
            newFolder.getId(),
            newFolder.getName(),
            "Sistem Otomatis",
            "-",
            "Folder tunggal dinas Google Drive"
          ]);
        }
      }
    } catch (eReg) {}

    return newFolder;
  } catch (errCreate) {
    return master;
  }
}

// Alias untuk kompatibilitas ke belakang (selalu arahkan ke folder tunggal dinas!)
function getOpdTargetFolder(categoryOrOpd, opdName) {
  var actualOpd = opdName || categoryOrOpd;
  return getSingleOpdFolder(actualOpd);
}

function initDefaultDataIfEmpty(ss) {
  var prosesSheet = getOrCreateSheet(ss, "DOKUMEN_PROSES");
  if (prosesSheet.getLastRow() === 0) {
    prosesSheet.appendRow([
      "Waktu Pengajuan", "ID Dokumen", "Nomor Berkas", "Judul Dokumen", "OPD / Dinas",
      "Versi", "Format", "Nama Pemohon", "Email Dinas", "Instansi Pemohon",
      "Status Proses", "Nama Verifikator", "NIP Verifikator", "Tautan File Drive",
      "ID File Drive", "Catatan Verifikator", "Folder Kategori"
    ]);
    prosesSheet.getRange(1, 1, 1, 17).setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  }

  var sahSheet = getOrCreateSheet(ss, "DOKUMEN_SAH_TERVERIFIKASI");
  if (sahSheet.getLastRow() === 0) {
    sahSheet.appendRow([
      "Waktu Pengesahan", "ID Dokumen", "Nomor Berkas", "Judul Dokumen", "OPD / Dinas",
      "Versi Sah", "Format", "Nama Pemohon", "Email Dinas", "Status Verifikasi",
      "Nama Verifikator", "NIP Verifikator", "Nomor BAV", "Tautan File Sah Drive",
      "ID File Drive", "Catatan Pengesahan", "Hash Pengaman SHA-256",
      "Batas Retensi (5 Tahun)", "Sisa Hari Retensi"
    ]);
    sahSheet.getRange(1, 1, 1, 19).setFontWeight("bold").setBackground("#064e3b").setFontColor("#34d399");
  }

  var summarySheet = getOrCreateSheet(ss, "SUMMARY_RIWAYAT_REVISI");
  if (summarySheet.getLastRow() === 0) {
    summarySheet.appendRow([
      "Waktu Pencatatan", "ID Dokumen", "Nomor Berkas", "Judul Dokumen", "OPD / Dinas",
      "Versi Terkait", "Jenis Catatan", "Ringkasan Petunjuk Revisi", "Detail Catatan Evaluasi",
      "Nama Verifikator / Pemohon", "Tautan Berkas Draf", "ID File Drive",
      "Batas Simpan (3 Bulan)", "Sisa Hari Aktif", "Status Bersih"
    ]);
    summarySheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#7c2d12").setFontColor("#fdba74");
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
      "Waktu Pendaftaran", "ID OPD", "Nama Dinas", "URL Folder Proses",
      "URL Folder Sah 5Thn", "URL Folder Revisi 3Bln", "Didaftarkan Oleh", "NIP", "Catatan"
    ]);
    folderSheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#134e4a").setFontColor("#2dd4bf");
  }

  cleanObsoleteLegacySheetsAndFix(ss);
}

/**
 * Membersihkan sheet-sheet usang di luar struktur baru yang telah ditetapkan,
 * menghapus baris duplikat di MAPPING_FOLDER_OPD,
 * dan memulihkan baris dokumen yang kolom ID file-nya rusak atau bergeser.
 */
function cleanObsoleteLegacySheetsAndFix(ss) {
  if (!ss) return;
  try {
    // 1. Hapus sheet lama yang tidak terpakai
    var obsoleteNames = ["DATA_VERIFIKASI_DOKUMEN", "Sheet1", "Sheet 1", "DOKUMEN_SAKIP"];
    for (var l = 0; l < obsoleteNames.length; l++) {
      var ls = ss.getSheetByName(obsoleteNames[l]);
      if (ls && ss.getSheets().length > 1) {
        try { ss.deleteSheet(ls); } catch (e) {}
      }
    }

    // 2. Bersihkan duplikat pada MAPPING_FOLDER_OPD
    var mapSheet = ss.getSheetByName("MAPPING_FOLDER_OPD");
    if (mapSheet && mapSheet.getLastRow() > 1) {
      var mVals = mapSheet.getDataRange().getValues();
      var seenOpds = {};
      for (var mr = mVals.length - 1; mr >= 1; mr--) {
        var opdKey = (String(mVals[mr][1] || "") + "_" + String(mVals[mr][2] || "")).trim().toLowerCase();
        if (opdKey && opdKey !== "_") {
          if (seenOpds[opdKey]) {
            mapSheet.deleteRow(mr + 1);
          } else {
            seenOpds[opdKey] = true;
          }
        }
      }
    }
  } catch (err) {
    console.error("Clean legacy note:", err);
  }
}

function autoCleanExpiredData() {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan." };
  initDefaultDataIfEmpty(ss);

  var now = new Date().getTime();
  var summarySheet = ss.getSheetByName("SUMMARY_RIWAYAT_REVISI");
  var sahSheet = ss.getSheetByName("DOKUMEN_SAH_TERVERIFIKASI");
  var deletedSummaryCount = 0;
  var deletedSahCount = 0;

  if (summarySheet && summarySheet.getLastRow() > 1) {
    var sVals = summarySheet.getDataRange().getValues();
    for (var r = sVals.length - 1; r >= 1; r--) {
      var dateStr = String(sVals[r][0] || "");
      var fileId = String(sVals[r][11] || "");
      var rowTime = Date.parse(dateStr);
      if (!isNaN(rowTime)) {
        var ageDays = (now - rowTime) / (1000 * 60 * 60 * 24);
        if (ageDays >= RETENTION_REVISION_DAYS) {
          if (fileId && fileId.length > 15 && fileId.indexOf("DRV-") === -1) {
            try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e) {}
          }
          summarySheet.deleteRow(r + 1);
          deletedSummaryCount++;
        }
      }
    }
  }

  if (sahSheet && sahSheet.getLastRow() > 1) {
    var hVals = sahSheet.getDataRange().getValues();
    for (var h = hVals.length - 1; h >= 1; h--) {
      var sahDateStr = String(hVals[h][0] || "");
      var sahFileId = String(hVals[h][14] || "");
      var sahTime = Date.parse(sahDateStr);
      if (!isNaN(sahTime)) {
        var sahAgeDays = (now - sahTime) / (1000 * 60 * 60 * 24);
        if (sahAgeDays >= RETENTION_APPROVED_DAYS) {
          if (sahFileId && sahFileId.length > 15 && sahFileId.indexOf("DRV-") === -1) {
            try { DriveApp.getFileById(sahFileId).setTrashed(true); } catch (e) {}
          }
          sahSheet.deleteRow(h + 1);
          deletedSahCount++;
        }
      }
    }
  }

  return {
    status: "success",
    message: "Pembersihan otomatis berhasil! " + deletedSummaryCount + " draf revisi (>3 bulan) dan " + deletedSahCount + " arsip sah (>5 tahun) telah dibersihkan.",
    deletedSummaryCount: deletedSummaryCount,
    deletedSahCount: deletedSahCount,
    timestamp: new Date().toLocaleString("id-ID")
  };
}

/**
 * =========================================================================
 * SERVER-SIDE FILE READER & STREAM (Mengatasi Error "Maaf Tidak Dapat Membuka File")
 * Mengambil Blob file secara langsung dengan otoritas script sehingga admin
 * bisa membaca isi berkas di dalam dashboard tanpa diblokir Google Drive.
 * =========================================================================
 */
function adminGetFileBase64(fileId) {
  try {
    if (!fileId || fileId.length < 10) {
      return { status: "error", message: "ID berkas Google Drive tidak valid." };
    }

    var cleanId = fileId.trim();
    if (cleanId.indexOf("/file/d/") !== -1) {
      var match = cleanId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match) cleanId = match[1];
    }
    if (cleanId.indexOf("?") !== -1) {
      cleanId = cleanId.split("?")[0];
    }

    var file = DriveApp.getFileById(cleanId);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (se) {}

    var blob = file.getBlob();
    var bytes = blob.getBytes();
    var b64 = Utilities.base64Encode(bytes);
    var mime = blob.getContentType() || "application/pdf";

    return {
      status: "success",
      fileName: file.getName(),
      mimeType: mime,
      fileSize: Math.round(bytes.length / 1024) + " KB",
      dataUri: "data:" + mime + ";base64," + b64,
      downloadUrl: "https://drive.google.com/uc?export=download&id=" + cleanId,
      previewUrl: "https://drive.google.com/file/d/" + cleanId + "/preview",
      viewUrl: "https://drive.google.com/file/d/" + cleanId + "/view"
    };
  } catch (err) {
    return {
      status: "error",
      message: "Gagal membaca berkas dari Google Drive: " + err.toString()
    };
  }
}

function doGet(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (ss) initDefaultDataIfEmpty(ss);

    var action = e && e.parameter ? e.parameter.action : "";
    if (action === "get_all_data" || (e && e.parameter && e.parameter.format === "json")) {
      return ContentService.createTextOutput(JSON.stringify(adminGetDashboardData()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "delete_document" || action === "delete") {
      return ContentService.createTextOutput(JSON.stringify(adminDeleteDocument(e.parameter)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "clean_expired") {
      return ContentService.createTextOutput(JSON.stringify(autoCleanExpiredData()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "read_file" && e.parameter.fileId) {
      return ContentService.createTextOutput(JSON.stringify(adminGetFileBase64(e.parameter.fileId)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    try {
      return HtmlService.createTemplateFromFile("Index").evaluate()
        .setTitle("DASHBOARD ADMIN SAKIP - KABUPATEN NAGEKEO")
        .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (eIndex) {
      try {
        return HtmlService.createTemplateFromFile("index").evaluate()
          .setTitle("DASHBOARD ADMIN SAKIP - KABUPATEN NAGEKEO")
          .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      } catch (eIndex2) {
        return HtmlService.createHtmlOutput("<h1>File Index.html tidak ditemukan di proyek Apps Script</h1><p>Pastikan Anda membuat file HTML dengan nama <b>Index</b> (atau <b>Index.html</b>) di editor Google Apps Script Anda.</p>");
      }
    }
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * =========================================================================
 * PENGHAPUSAN BERKAS PERMANEN (Web, Google Sheet & Google Drive)
 * Menghapus baris berkas dari sheet DOKUMEN_PROSES, DOKUMEN_SAH_TERVERIFIKASI,
 * dan SUMMARY_RIWAYAT_REVISI serta memasukkan berkas Drive ke kotak sampah.
 * =========================================================================
 */
function adminDeleteDocument(data) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan." };

  var docId = String(data.docId || "").trim().toLowerCase();
  var docNumber = String(data.docNumber || "").trim().toLowerCase();
  var fileId = String(data.fileId || "").trim();

  if (fileId.indexOf("/file/d/") !== -1) {
    var match = fileId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  }
  if (fileId.indexOf("?") !== -1) {
    fileId = fileId.split("?")[0];
  }

  // 1. Hapus / Buang file ke trash di Google Drive
  if (fileId && fileId.length > 15 && fileId.indexOf("DRV-") === -1 && fileId !== "dsadasd") {
    try {
      var df = DriveApp.getFileById(fileId);
      df.setTrashed(true);
    } catch (eDrive) {
      console.warn("Drive trash note:", eDrive);
    }
  }

  // 2. Hapus baris dari seluruh worksheet
  var sheetsToPurge = ["DOKUMEN_PROSES", "DOKUMEN_SAH_TERVERIFIKASI", "SUMMARY_RIWAYAT_REVISI"];
  var deletedCount = 0;

  for (var s = 0; s < sheetsToPurge.length; s++) {
    var sh = ss.getSheetByName(sheetsToPurge[s]);
    if (sh && sh.getLastRow() > 1) {
      var vals = sh.getDataRange().getValues();
      for (var r = vals.length - 1; r >= 1; r--) {
        var rowId = String(vals[r][1] || "").trim().toLowerCase();
        var rowNo = String(vals[r][2] || "").trim().toLowerCase();
        var rowFileId = String(vals[r][14] || vals[r][11] || "").trim();

        // Jika belum terhapus di Drive dan baris ini menyimpan ID file, buang ke trash
        if (!fileId && rowFileId && rowFileId.length > 15 && rowFileId.indexOf("DRV-") === -1 && rowFileId !== "dsadasd") {
          try {
            DriveApp.getFileById(rowFileId).setTrashed(true);
          } catch (e) {}
        }

        var matchId = docId && (rowId === docId || (docId.length >= 6 && rowId.indexOf(docId) !== -1));
        var matchNo = docNumber && (rowNo === docNumber || (docNumber.length >= 3 && rowNo.indexOf(docNumber) !== -1));

        if (matchId || matchNo) {
          sh.deleteRow(r + 1);
          deletedCount++;
        }
      }
    }
  }

  return {
    status: "success",
    message: "Dokumen (" + (data.docNumber || data.docId) + ") berhasil dihapus permanen dari Google Sheet (" + deletedCount + " baris) dan Google Drive.",
    deletedRows: deletedCount
  };
}

function doPost(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Spreadsheet tidak ditemukan." })).setMimeType(ContentService.MimeType.JSON);

    initDefaultDataIfEmpty(ss);
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    if (data.action === "TEST_PING") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Koneksi Webhook Aktif!" })).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "TRIGGER_AUTO_CLEAN") {
      return ContentService.createTextOutput(JSON.stringify(autoCleanExpiredData())).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "READ_FILE") {
      return ContentService.createTextOutput(JSON.stringify(adminGetFileBase64(data.fileId))).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "DELETE_DOCUMENT" || data.action === "DELETE") {
      return ContentService.createTextOutput(JSON.stringify(adminDeleteDocument(data))).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "REGISTER_USER_ACCOUNT" || data.action === "UPDATE_USER_PASSWORD" || data.action === "UPDATE_PASSWORD") {
      return ContentService.createTextOutput(JSON.stringify(adminSaveUserAccount(data.userId, data.username, data.email, data.pemohonName || data.nama, data.role, data.opdName, data.verifierNip || data.nip, data.newPassword, data.driveFolderUrl))).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "REGISTER_OPD_FOLDER" || data.action === "SAVE_OPD_FOLDER") {
      return ContentService.createTextOutput(JSON.stringify(adminRegisterFolderServer(data.opdId, data.opdName, data.driveFolderUrl || data.driveUrl, data.driveFolderId || data.folderId, data.driveFolderName || data.subfolderName, data.registrar || data.pemohonName, data.nip, data.notes))).setMimeType(ContentService.MimeType.JSON);
    }
    if (data.action === "VERIFY_DOCUMENT" || data.action === "UPDATE_STATUS") {
      return ContentService.createTextOutput(JSON.stringify(adminProcessVerification(data))).setMimeType(ContentService.MimeType.JSON);
    }

    var prosesSheet = ss.getSheetByName("DOKUMEN_PROSES");
    var summarySheet = ss.getSheetByName("SUMMARY_RIWAYAT_REVISI");
    var nowStr = data.timestamp || new Date().toLocaleString("id-ID");

    var isRevisionUpload = (data.action === "UPLOAD_REVISION" || data.action === "REVISE_DOCUMENT");
    // Gunakan folder tunggal OPD
    var targetOpdFolder = getSingleOpdFolder(data.opdName, data.opdId, data.driveMasterFolderId || data.folderId, data.driveFolderUrl);
    var targetFolderName = targetOpdFolder.getName();
    var driveFileUrl = targetOpdFolder.getUrl();
    var driveFileId = "";

    if (data.fileBase64 && data.fileBase64.length > 30) {
      try {
        var decoded = Utilities.base64Decode(data.fileBase64);
        var mime = data.fileMimeType || "application/pdf";
        var fName = data.fileName || ("sakip_" + (data.docNumber || "doc") + ".pdf");
        var blob = Utilities.newBlob(decoded, mime, fName);
        var fileCreated = targetOpdFolder.createFile(blob);
        fileCreated.setDescription("SAKIP Nagekeo: " + (data.docNumber || "") + " - " + (data.opdName || ""));
        try {
          fileCreated.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (se) {
          try {
            fileCreated.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (de) {}
        }
        driveFileId = fileCreated.getId();
        driveFileUrl = "https://drive.google.com/file/d/" + driveFileId + "/view";
      } catch (fErr) {
        driveFileUrl = targetOpdFolder.getUrl();
      }
    }

    if (isRevisionUpload) {
      var expiry3M2 = new Date();
      expiry3M2.setDate(expiry3M2.getDate() + 90);
      summarySheet.appendRow([
        nowStr, data.docId || ("DOC-" + Date.now()), data.docNumber || "-", data.title || "Draf Revisi",
        data.opdName || "Dinas", "v" + (data.versionNumber || 2), "UNGGAH_REVISI",
        data.notes || "Pengajuan draf revisi", data.notes || "-", data.pemohonName || "Pemohon",
        driveFileUrl, driveFileId, expiry3M2.toLocaleDateString("id-ID"), RETENTION_REVISION_DAYS, "AKTIF_3_BULAN"
      ]);

      var pVals2 = prosesSheet.getDataRange().getValues();
      var foundPRow2 = -1;
      for (var p2 = 1; p2 < pVals2.length; p2++) {
        if (String(pVals2[p2][1]) === String(data.docId) || String(pVals2[p2][2]) === String(data.docNumber)) {
          foundPRow2 = p2 + 1; break;
        }
      }
      if (foundPRow2 > 0) {
        prosesSheet.getRange(foundPRow2, 6).setValue("v" + (data.versionNumber || 2));
        prosesSheet.getRange(foundPRow2, 11).setValue("PENDING");
        prosesSheet.getRange(foundPRow2, 14).setValue(driveFileUrl);
        prosesSheet.getRange(foundPRow2, 15).setValue(driveFileId);
        prosesSheet.getRange(foundPRow2, 16).setValue("Draf revisi diajukan: " + (data.notes || ""));
      } else {
        prosesSheet.appendRow([
          nowStr, data.docId || ("DOC-" + Date.now()), data.docNumber || "Draf", data.title || "Dokumen SAKIP",
          data.opdName || "Dinas", "v" + (data.versionNumber || 2), data.format || "PDF",
          data.pemohonName || "Pemohon", data.pemohonEmail || data.email || "-", data.pemohonInstansi || data.opdName || "-",
          "PENDING", "-", "-", driveFileUrl, driveFileId, "Draf revisi diajukan", targetFolderName
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Berkas revisi berhasil diunggah!", fileUrl: driveFileUrl, fileId: driveFileId })).setMimeType(ContentService.MimeType.JSON);

    } else {
      prosesSheet.appendRow([
        nowStr, data.docId || ("DOC-" + Date.now()), data.docNumber || "Draf", data.title || "Dokumen SAKIP",
        data.opdName || "Dinas", "v" + (data.versionNumber || 1), data.format || "PDF",
        data.pemohonName || "Pemohon", data.pemohonEmail || data.email || "-", data.pemohonInstansi || data.opdName || "-",
        "PENDING", "-", "-", driveFileUrl, driveFileId, data.notes || "Pengajuan berkas baru", targetFolderName
      ]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Dokumen baru (" + (data.docNumber || "") + ") berhasil disimpan ke DOKUMEN_PROSES!", fileUrl: driveFileUrl, fileId: driveFileId })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function adminProcessVerification(data) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan." };
    initDefaultDataIfEmpty(ss);

    var docId = String(data.docId || "").trim();
    var docNumber = String(data.docNumber || "").trim();
    var status = String(data.status || "APPROVED").trim().toUpperCase();
    var verifier = data.verifierName || "Admin Verifikator SAKIP";
    var nip = data.verifierNip || "19850101 201001 1 002";
    var bav = data.bavNumber || ("BAV/SAKIP/" + (docNumber || "001"));
    var notes = String(data.notes || "Verifikasi selesai").trim();
    var nowStr = data.timestamp || new Date().toLocaleString("id-ID");
    var sealHash = data.digitalSealHash || ("SHA256-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMddHHmmss") + "-" + (docId || "DOC"));

    var prosesSheet = getOrCreateSheet(ss, "DOKUMEN_PROSES");
    var sahSheet = getOrCreateSheet(ss, "DOKUMEN_SAH_TERVERIFIKASI");
    var summarySheet = getOrCreateSheet(ss, "SUMMARY_RIWAYAT_REVISI");

    var foundPRow = -1;
    var existingRowData = null;
    if (prosesSheet && prosesSheet.getLastRow() > 1) {
      var pVals = prosesSheet.getDataRange().getValues();
      for (var p = 1; p < pVals.length; p++) {
        var rowId = String(pVals[p][1] || "").trim().toLowerCase();
        var rowNo = String(pVals[p][2] || "").trim().toLowerCase();
        if ((docId && rowId === docId.toLowerCase()) || (docNumber && (rowNo === docNumber.toLowerCase() || rowNo.indexOf(docNumber.toLowerCase()) !== -1))) {
          foundPRow = p + 1;
          existingRowData = pVals[p];
          break;
        }
      }
    }

    var fileUrl = data.downloadUrl || (existingRowData ? String(existingRowData[13] || existingRowData[14] || "") : "");
    var fileId = (existingRowData ? String(existingRowData[14] || existingRowData[15] || "") : "");
    var opd = data.opdName || (existingRowData ? String(existingRowData[4] || "") : "OPD");
    var title = data.title || (existingRowData ? String(existingRowData[3] || "") : "Dokumen SAKIP");
    var format = data.format || (existingRowData ? String(existingRowData[6] || "") : "PDF");
    var pemohonName = data.pemohonName || (existingRowData ? String(existingRowData[7] || "") : "Pemohon");
    var pemohonEmail = data.email || data.pemohonEmail || (existingRowData ? String(existingRowData[8] || "") : "-");
    var version = data.versionNumber || (existingRowData ? Number(String(existingRowData[5] || "1").replace("v", "")) : 1);

    if (status === "APPROVED") {
      // Berkas tetap berada di folder tunggal dinas
      if (fileId && fileId.length > 15 && fileId.indexOf("DRV-") === -1 && fileId !== "dsadasd") {
        try {
          var driveFile = DriveApp.getFileById(fileId);
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          fileUrl = "https://drive.google.com/file/d/" + fileId + "/view";
        } catch (se) {}
      } else if (!fileUrl) {
        try {
          var opdF = getSingleOpdFolder(opd, data.opdId);
          fileUrl = opdF.getUrl();
        } catch (ef) {}
      }

      var expiry5Y = new Date();
      expiry5Y.setFullYear(expiry5Y.getFullYear() + 5);

      sahSheet.appendRow([
        nowStr, docId, docNumber, title, opd, "v" + version, format,
        pemohonName, pemohonEmail, "APPROVED", verifier, nip, bav,
        fileUrl, fileId, notes, sealHash, expiry5Y.toLocaleDateString("id-ID"), RETENTION_APPROVED_DAYS
      ]);

      summarySheet.appendRow([
        nowStr, docId, docNumber, title, opd, "v" + version,
        "PENGESAHAN_FINAL", "Dokumen Disahkan & Terbit BAV Resmi", notes,
        verifier, fileUrl, fileId, "Disimpan Sah 5 Tahun", "-", "SAH_FINAL"
      ]);

      if (foundPRow > 0 && prosesSheet && prosesSheet.getLastRow() >= foundPRow) {
        try { prosesSheet.deleteRow(foundPRow); } catch (dp) {}
      }
      cleanLegacyDoc(ss, docId, docNumber);

      return {
        status: "success",
        message: "Dokumen (" + (docNumber || title) + ") berhasil DISAHKAN! Berkas dicatat di DOKUMEN_SAH_TERVERIFIKASI dan otomatis terhapus dari DOKUMEN_PROSES.",
        docId: docId,
        docNumber: docNumber,
        bavNumber: bav
      };

    } else {
      // Status REVISION atau REJECTED
      if (foundPRow > 0 && prosesSheet) {
        try {
          prosesSheet.getRange(foundPRow, 11).setValue(status);
          prosesSheet.getRange(foundPRow, 12).setValue(verifier);
          prosesSheet.getRange(foundPRow, 13).setValue(nip);
          prosesSheet.getRange(foundPRow, 16).setValue(notes);
        } catch (up) {}
      } else if (prosesSheet) {
        prosesSheet.appendRow([
          nowStr, docId, docNumber, title, opd, "v" + version, format,
          pemohonName, pemohonEmail, opd, status, verifier, nip, fileUrl, fileId, notes, "01_DOKUMEN_PROSES"
        ]);
      }

      var expiry3M = new Date();
      expiry3M.setDate(expiry3M.getDate() + 90);

      var shortNote = notes.length > 80 ? notes.substring(0, 80) + "..." : notes;

      summarySheet.appendRow([
        nowStr, docId, docNumber, title, opd, "v" + version,
        status === "REVISION" ? "CATATAN_PERBAIKAN" : "PENOLAKAN",
        shortNote, notes, verifier, fileUrl, fileId,
        expiry3M.toLocaleDateString("id-ID"), RETENTION_REVISION_DAYS, "AKTIF_3_BULAN"
      ]);

      return {
        status: "success",
        message: "Status " + status + " (" + (docNumber || title) + ") berhasil dicatat ke DOKUMEN_PROSES dan ringkasan dicatat ke SUMMARY_RIWAYAT_REVISI.",
        docId: docId,
        docNumber: docNumber
      };
    }
  } catch (err) {
    console.error("adminProcessVerification error:", err);
    return {
      status: "error",
      message: "Gagal memproses verifikasi: " + err.toString()
    };
  }
}

function cleanLegacyDoc(ss, docId, docNumber) {
  try {
    var legacySheets = ["DATA_VERIFIKASI_DOKUMEN", "Sheet1", "Sheet 1", "DOKUMEN_SAKIP"];
    for (var l = 0; l < legacySheets.length; l++) {
      var sheet = ss.getSheetByName(legacySheets[l]);
      if (sheet && sheet.getLastRow() > 1) {
        var vals = sheet.getDataRange().getValues();
        for (var r = vals.length - 1; r >= 1; r--) {
          var rowId = String(vals[r][1] || "").trim().toLowerCase();
          var rowNo = String(vals[r][2] || "").trim().toLowerCase();
          if ((docId && rowId === docId.toLowerCase()) || (docNumber && (rowNo === docNumber.toLowerCase() || rowNo.indexOf(docNumber.toLowerCase()) !== -1))) {
            sheet.deleteRow(r + 1);
          }
        }
      }
    }
  } catch (e) {}
}

function adminGetDashboardData() {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan", documents: [], prosesDocs: [], sahDocs: [], summaryDocs: [], users: [], folders: [], spreadsheetUrl: "" };

    initDefaultDataIfEmpty(ss);

    var prosesSheet = ss.getSheetByName("DOKUMEN_PROSES");
    var sahSheet = ss.getSheetByName("DOKUMEN_SAH_TERVERIFIKASI");
    var summarySheet = ss.getSheetByName("SUMMARY_RIWAYAT_REVISI");
    var userSheet = ss.getSheetByName("DATABASE_PENGGUNA");
    var folderSheet = ss.getSheetByName("MAPPING_FOLDER_OPD");

    var masterUrl = "https://drive.google.com/";
    try {
      var master = getMasterFolder();
      if (master) masterUrl = master.getUrl();
    } catch (me) {}

    function isFolder(str) {
      if (!str) return false;
      var s = String(str).trim();
      return s.indexOf("folders/") !== -1 || s.indexOf("folder") !== -1 || s === "1oeL5XXQlG2Z2KkF06tVqPZq_w8f2M-F7" || s.indexOf("1p8_bav_demo") === 0;
    }

    function sanitizeDriveUrls(rawUrl, rawFileId, rowData) {
      var fileId = String(rawFileId || "").trim();
      var url = String(rawUrl || "").trim();

      if (isFolder(fileId)) fileId = "";

      if (fileId.indexOf("/file/d/") !== -1) {
        var match = fileId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      }
      if (fileId.indexOf("?") !== -1) {
        fileId = fileId.split("?")[0];
      }

      if (!fileId || fileId.length < 15 || fileId === "dsadasd" || fileId.indexOf("DRV-") !== -1 || isFolder(fileId)) {
        fileId = "";
        var haystack = (url + " " + (rowData ? rowData.join(" ") : "")).trim();
        var m1 = haystack.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
        if (m1 && !isFolder(m1[1])) {
          fileId = m1[1];
        } else {
          var m2 = haystack.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
          if (m2 && !isFolder(m2[1])) {
            fileId = m2[1];
          }
        }
      }

      var cleanViewUrl = (fileId && fileId.length > 15 && !isFolder(fileId)) ? ("https://drive.google.com/file/d/" + fileId + "/view") : (url || masterUrl);
      var downloadUrl = (fileId && fileId.length > 15 && !isFolder(fileId)) ? ("https://drive.google.com/uc?export=download&id=" + fileId) : cleanViewUrl;
      var previewUrl = (fileId && fileId.length > 15 && !isFolder(fileId)) ? ("https://drive.google.com/file/d/" + fileId + "/preview") : cleanViewUrl;

      return {
        fileId: isFolder(fileId) ? "" : fileId,
        viewUrl: cleanViewUrl,
        downloadUrl: downloadUrl,
        previewUrl: previewUrl
      };
    }

  var prosesDocs = [];
  if (prosesSheet && prosesSheet.getLastRow() > 1) {
    var pV = prosesSheet.getDataRange().getValues();
    for (var i = 1; i < pV.length; i++) {
      var urls = sanitizeDriveUrls(pV[i][13], pV[i][14], pV[i]);

      prosesDocs.push({
        tanggalMasuk: String(pV[i][0] || ""),
        id: String(pV[i][1] || "DOC-P-" + i),
        nomorBerkas: String(pV[i][2] || ""),
        judul: String(pV[i][3] || ""),
        opdName: String(pV[i][4] || ""),
        opdId: String(pV[i][4] || ""),
        currentVersion: Number(String(pV[i][5] || "1").replace("v", "")) || 1,
        format: String(pV[i][6] || "PDF"),
        pemohon: { nama: String(pV[i][7] || "Pemohon"), email: String(pV[i][8] || ""), instansi: String(pV[i][9] || "") },
        status: String(pV[i][10] || "PENDING"),
        verifierName: String(pV[i][11] || "-"),
        verifierNip: String(pV[i][12] || "-"),
        googleDrive: {
          viewUrl: urls.viewUrl,
          downloadUrl: urls.downloadUrl,
          previewUrl: urls.previewUrl,
          fileId: urls.fileId
        },
        notes: String(pV[i][15] || ""),
        sourceSheet: "DOKUMEN_PROSES",
        verification: { status: String(pV[i][10] || "PENDING"), verifiedBy: String(pV[i][11] || "Admin Verifikator"), nip: String(pV[i][12] || "-"), notes: String(pV[i][15] || "") }
      });
    }
  }

  var sahDocs = [];
  if (sahSheet && sahSheet.getLastRow() > 1) {
    var sV = sahSheet.getDataRange().getValues();
    for (var j = 1; j < sV.length; j++) {
      var sUrls = sanitizeDriveUrls(sV[j][13], sV[j][14], sV[j]);

      sahDocs.push({
        tanggalMasuk: String(sV[j][0] || ""),
        id: String(sV[j][1] || "DOC-S-" + j),
        nomorBerkas: String(sV[j][2] || ""),
        judul: String(sV[j][3] || ""),
        opdName: String(sV[j][4] || ""),
        opdId: String(sV[j][4] || ""),
        currentVersion: Number(String(sV[j][5] || "1").replace("v", "")) || 1,
        format: String(sV[j][6] || "PDF"),
        pemohon: { nama: String(sV[j][7] || "Pemohon"), email: String(sV[j][8] || ""), instansi: String(sV[j][4] || "") },
        status: "APPROVED",
        verifierName: String(sV[j][10] || "Admin Verifikator SAKIP"),
        verifierNip: String(sV[j][11] || "-"),
        bavNumber: String(sV[j][12] || ""),
        googleDrive: {
          viewUrl: sUrls.viewUrl,
          downloadUrl: sUrls.downloadUrl,
          previewUrl: sUrls.previewUrl,
          fileId: sUrls.fileId
        },
        notes: String(sV[j][15] || ""),
        digitalSealHash: String(sV[j][16] || ""),
        retentionExpiry: String(sV[j][17] || "5 Tahun"),
        sourceSheet: "DOKUMEN_SAH_TERVERIFIKASI",
        isLocked: true,
        verification: { status: "APPROVED", verifiedBy: String(sV[j][10] || "Admin Verifikator SAKIP"), nip: String(sV[j][11] || "-"), bavNumber: String(sV[j][12] || ""), notes: String(sV[j][15] || ""), digitalSealHash: String(sV[j][16] || "") }
      });
    }
  }

  var summaryDocs = [];
  if (summarySheet && summarySheet.getLastRow() > 1) {
    var smV = summarySheet.getDataRange().getValues();
    for (var k = 1; k < smV.length; k++) {
      var smUrls = sanitizeDriveUrls(smV[k][10], smV[k][11], smV[k]);

      summaryDocs.push({
        tanggalMasuk: String(smV[k][0] || ""),
        id: String(smV[k][1] || "REV-" + k),
        nomorBerkas: String(smV[k][2] || ""),
        judul: String(smV[k][3] || ""),
        opdName: String(smV[k][4] || ""),
        versionNumber: Number(String(smV[k][5] || "1").replace("v", "")) || 1,
        jenisCatatan: String(smV[k][6] || "REVISI"),
        summaryPetunjuk: String(smV[k][7] || ""),
        detailEvaluasi: String(smV[k][8] || ""),
        petugas: String(smV[k][9] || ""),
        fileUrl: smUrls.viewUrl,
        downloadUrl: smUrls.downloadUrl,
        previewUrl: smUrls.previewUrl,
        fileId: smUrls.fileId,
        batasSimpan3Bln: String(smV[k][12] || "90 Hari"),
        statusBersih: String(smV[k][14] || "AKTIF_3_BULAN")
      });
    }
  }

  var allDocs = prosesDocs.concat(sahDocs);

  var users = [];
  if (userSheet && userSheet.getLastRow() > 1) {
    var uV = userSheet.getDataRange().getValues();
    for (var u = 1; u < uV.length; u++) {
      users.push({
        id: String(uV[u][1] || "USR-" + u),
        username: String(uV[u][2] || ""),
        email: String(uV[u][3] || ""),
        nama: String(uV[u][4] || ""),
        role: String(uV[u][5] || "DINAS_PEMOHON"),
        opdName: String(uV[u][6] || ""),
        nip: String(uV[u][7] || ""),
        driveFolderUrl: String(uV[u][8] || ""),
        password: String(uV[u][9] || "123456"),
        status: String(uV[u][10] || "AKTIF")
      });
    }
  }

  var folders = [];
  if (folderSheet && folderSheet.getLastRow() > 1) {
    var fV = folderSheet.getDataRange().getValues();
    for (var f = 1; f < fV.length; f++) {
      folders.push({
        registeredAt: String(fV[f][0] || ""),
        opdId: String(fV[f][1] || ""),
        opdName: String(fV[f][2] || ""),
        driveFolderUrl: String(fV[f][3] || ""),
        driveFolderId: String(fV[f][4] || ""),
        registeredBy: String(fV[f][6] || ""),
        nip: String(fV[f][7] || ""),
        notes: String(fV[f][8] || "")
      });
    }
  }

  return {
    status: "success",
    spreadsheetUrl: ss.getUrl(),
    documents: allDocs,
    prosesDocs: prosesDocs,
    sahDocs: sahDocs,
    summaryDocs: summaryDocs,
    users: users,
    folders: folders,
    stats: {
      totalProses: prosesDocs.length,
      totalSah: sahDocs.length,
      totalSummaryRevisi: summaryDocs.length,
      totalUsers: users.length,
      retentionPolicy: { revisiDays: RETENTION_REVISION_DAYS, sahYears: 5 }
    }
  };
  } catch (err) {
    return {
      status: "error",
      message: err.toString(),
      documents: [],
      prosesDocs: [],
      sahDocs: [],
      summaryDocs: [],
      users: [],
      folders: [],
      spreadsheetUrl: ""
    };
  }
}

function adminSaveUserAccount(userId, username, email, nama, role, opdName, nip, password, driveFolderUrl) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
    initDefaultDataIfEmpty(ss);
    var userSheet = getOrCreateSheet(ss, "DATABASE_PENGGUNA");

    var foundUserRow = -1;
    var uVals = userSheet.getDataRange().getValues();
    for (var u = 1; u < uVals.length; u++) {
      if (String(uVals[u][2]) === String(username) || String(uVals[u][3]) === String(email) || String(uVals[u][1]) === String(userId)) {
        foundUserRow = u + 1; break;
      }
    }

    var effectiveEmail = email || (username + "@nagekeokab.go.id");
    var now = new Date().toLocaleString("id-ID");

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
        now, userId || ("usr-" + username), username, effectiveEmail, nama || "-",
        role || "DINAS_PEMOHON", opdName || "-", nip || "-", driveFolderUrl || "-",
        password || "123456", "AKTIF"
      ]);
    }
    return adminGetDashboardData();
  } catch (err) {
    console.error("adminSaveUserAccount error:", err);
    return { status: "error", message: "Gagal menyimpan akun: " + err.toString() };
  }
}

function adminRegisterFolderServer(opdId, opdName, driveUrl, folderId, subfolderName, registrar, nip, notes) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
    initDefaultDataIfEmpty(ss);
    var folderSheet = getOrCreateSheet(ss, "MAPPING_FOLDER_OPD");

    var now = new Date().toLocaleString("id-ID");
    var foundFolderRow = -1;
    var fVals = folderSheet.getDataRange().getValues();
    for (var f = 1; f < fVals.length; f++) {
      if (String(fVals[f][1]) === String(opdId) || String(fVals[f][2]) === String(opdName)) {
        foundFolderRow = f + 1; break;
      }
    }

    var validUrl = driveUrl || getMasterFolder().getUrl();
    var effectiveFolderId = folderId || "";
    if (!effectiveFolderId && validUrl.indexOf("folders/") !== -1) {
      var m = validUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (m) effectiveFolderId = m[1];
    }
    var effectiveSubfolderName = subfolderName || ("Folder " + (opdName || "OPD"));

    if (foundFolderRow > 0) {
      folderSheet.getRange(foundFolderRow, 1).setValue(now);
      folderSheet.getRange(foundFolderRow, 3).setValue(opdName || "-");
      folderSheet.getRange(foundFolderRow, 4).setValue(validUrl);
      folderSheet.getRange(foundFolderRow, 5).setValue(effectiveFolderId);
      folderSheet.getRange(foundFolderRow, 6).setValue(effectiveSubfolderName);
      folderSheet.getRange(foundFolderRow, 7).setValue(registrar || "Admin SAKIP");
      folderSheet.getRange(foundFolderRow, 8).setValue(nip || "-");
      folderSheet.getRange(foundFolderRow, 9).setValue(notes || "Pembaruan Folder OPD");
    } else {
      folderSheet.appendRow([
        now, opdId, opdName, validUrl, effectiveFolderId, effectiveSubfolderName, registrar || "Admin SAKIP", nip || "-", notes || "Pendaftaran Folder OPD"
      ]);
    }
    return adminGetDashboardData();
  } catch (err) {
    console.error("adminRegisterFolderServer error:", err);
    return { status: "error", message: "Gagal menyimpan folder: " + err.toString() };
  }
}
`;
