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
  return DriveApp.getRootFolder();
}

/**
 * Mendapatkan atau membuat subfolder khusus kategori:
 * 1. "01_DOKUMEN_PROSES"
 * 2. "02_DOKUMEN_SAH_FINAL_5_TAHUN"
 * 3. "03_DRAF_REVISI_SUMMARY_3_BULAN"
 */
function getCategoryFolder(categoryName) {
  var master = getMasterFolder();
  var folders = master.getFoldersByName(categoryName);
  if (folders.hasNext()) return folders.next();
  try {
    var f = master.createFolder(categoryName);
    try {
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    return f;
  } catch (err) {
    return master;
  }
}

function getOpdTargetFolder(categoryName, opdName) {
  var parent = getCategoryFolder(categoryName);
  var effectiveOpd = opdName || "UMUM_OPD";
  var subName = "SAKIP - " + effectiveOpd;
  var existing = parent.getFoldersByName(subName);
  if (existing.hasNext()) return existing.next();
  try {
    var opdF = parent.createFolder(subName);
    try {
      opdF.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}
    return opdF;
  } catch (e) {
    return parent;
  }
}

/**
 * Inisialisasi Header & Struktur Tabel jika masih kosong
 */
function initDefaultDataIfEmpty(ss) {
  // 1. Sheet DOKUMEN_PROSES (Berkas berjalan yang belum sah)
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

  // 2. Sheet DOKUMEN_SAH_TERVERIFIKASI (Retensi 5 Tahun)
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

  // 3. Sheet SUMMARY_RIWAYAT_REVISI (Auto Clean 3 Bulan)
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

  // 4. Sheet DATABASE_PENGGUNA
  var userSheet = getOrCreateSheet(ss, "DATABASE_PENGGUNA");
  if (userSheet.getLastRow() === 0) {
    userSheet.appendRow([
      "Waktu Pembaruan", "User ID", "Username", "Email Kedinasan", "Nama Pengguna", "Peran Akun",
      "OPD / Instansi", "NIP / Kontak", "URL Folder Google Drive", "Password", "Status Akun"
    ]);
    userSheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#1e293b").setFontColor("#38bdf8");
  }

  // 5. Sheet MAPPING_FOLDER_OPD
  var folderSheet = getOrCreateSheet(ss, "MAPPING_FOLDER_OPD");
  if (folderSheet.getLastRow() === 0) {
    folderSheet.appendRow([
      "Waktu Pendaftaran", "ID OPD", "Nama Dinas", "URL Folder Proses",
      "URL Folder Sah 5Thn", "URL Folder Revisi 3Bln", "Didaftarkan Oleh", "NIP", "Catatan"
    ]);
    folderSheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#134e4a").setFontColor("#2dd4bf");
  }
}

/**
 * =========================================================================
 * PEMBERSIHAN OTOMATIS (LIFECYCLE AUTO CLEAN):
 * 1. SUMMARY & DRAF REVISI > 3 BULAN (90 HARI) DIHAPUS OTOMATIS DARI SHEET & DRIVE
 * 2. DOKUMEN SAH > 5 TAHUN (1825 HARI) DIARSIPKAN / DIHAPUS
 * =========================================================================
 */
function autoCleanExpiredData() {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan." };
  initDefaultDataIfEmpty(ss);

  var now = new Date().getTime();
  var summarySheet = ss.getSheetByName("SUMMARY_RIWAYAT_REVISI");
  var sahSheet = ss.getSheetByName("DOKUMEN_SAH_TERVERIFIKASI");
  var deletedSummaryCount = 0;
  var deletedSahCount = 0;

  // 1. Bersihkan SUMMARY_RIWAYAT_REVISI > 90 Hari (3 Bulan)
  if (summarySheet && summarySheet.getLastRow() > 1) {
    var sVals = summarySheet.getDataRange().getValues();
    // Loop mundur dari bawah ke atas agar indeks baris tetap valid saat deleteRow
    for (var r = sVals.length - 1; r >= 1; r--) {
      var dateStr = String(sVals[r][0] || "");
      var fileId = String(sVals[r][11] || "");
      var rowTime = Date.parse(dateStr);
      if (!isNaN(rowTime)) {
        var ageDays = (now - rowTime) / (1000 * 60 * 60 * 24);
        if (ageDays >= RETENTION_REVISION_DAYS) {
          // Hapus file fisik draf lama dari Google Drive jika ada
          if (fileId && fileId.length > 15 && fileId.indexOf("DRV-") === -1) {
            try {
              DriveApp.getFileById(fileId).setTrashed(true);
            } catch (e) {}
          }
          summarySheet.deleteRow(r + 1);
          deletedSummaryCount++;
        }
      }
    }
  }

  // 2. Bersihkan DOKUMEN_SAH_TERVERIFIKASI > 5 Tahun (1825 Hari)
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
            try {
              DriveApp.getFileById(sahFileId).setTrashed(true);
            } catch (e) {}
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
 * Memasang Time-Driven Trigger harian jam 02:00 pagi
 */
function setupAutoCleanTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "autoCleanExpiredData") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("autoCleanExpiredData")
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  return "Trigger pembersihan otomatis harian (jam 02:00 pagi) berhasil dipasang!";
}

/**
 * =========================================================================
 * 1. doGet: Melayani Web App Dashboard Admin & API JSON Multi-Worksheet
 * =========================================================================
 */
function doGet(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (ss) {
      initDefaultDataIfEmpty(ss);
    }

    var action = e && e.parameter ? e.parameter.action : "";

    // Endpoint API JSON lengkap untuk User Dinas & Admin
    if (action === "get_all_data" || (e && e.parameter && e.parameter.format === "json")) {
      return ContentService.createTextOutput(JSON.stringify(adminGetDashboardData()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Trigger pembersihan manual via URL GET
    if (action === "clean_expired") {
      return ContentService.createTextOutput(JSON.stringify(autoCleanExpiredData()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Render Web App Dashboard Admin
    return HtmlService.createTemplateFromFile("Index").evaluate()
      .setTitle("DASHBOARD ADMIN SAKIP - KABUPATEN NAGEKEO")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * =========================================================================
 * 2. doPost: Penerimaan Berkas, Pemindahan Status & Eksekusi Lifecycle
 * =========================================================================
 */
function doPost(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Spreadsheet tidak ditemukan." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    initDefaultDataIfEmpty(ss);

    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }

    // AKSI: TEST PING
    if (data.action === "TEST_PING") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Koneksi Webhook Google Sheets & Drive 3-Worksheet Aktif!",
        timestamp: new Date().toLocaleString("id-ID")
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // AKSI: TRIGGER PEMBERSIHAN 3 BULAN / 5 TAHUN
    if (data.action === "TRIGGER_AUTO_CLEAN") {
      return ContentService.createTextOutput(JSON.stringify(autoCleanExpiredData()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // AKSI: KELOLA AKUN PENGGUNA
    if (data.action === "REGISTER_USER_ACCOUNT" || data.action === "UPDATE_USER_PASSWORD" || data.action === "UPDATE_PASSWORD") {
      return ContentService.createTextOutput(JSON.stringify(
        adminSaveUserAccount(data.userId, data.username, data.email, data.pemohonName || data.nama, data.role, data.opdName, data.verifierNip || data.nip, data.newPassword, data.driveFolderUrl)
      )).setMimeType(ContentService.MimeType.JSON);
    }

    // AKSI: KELOLA FOLDER OPD
    if (data.action === "REGISTER_FOLDER" || data.action === "REGISTER_OPD_FOLDER") {
      var r = data.folderRegistration || data;
      return ContentService.createTextOutput(JSON.stringify(
        adminRegisterFolderServer(r.opdId, r.opdName, r.driveFolderUrl, r.driveFolderId, r.subfolderName, r.registeredBy, r.nip, r.notes)
      )).setMimeType(ContentService.MimeType.JSON);
    }

    var prosesSheet = ss.getSheetByName("DOKUMEN_PROSES");
    var sahSheet = ss.getSheetByName("DOKUMEN_SAH_TERVERIFIKASI");
    var summarySheet = ss.getSheetByName("SUMMARY_RIWAYAT_REVISI");
    var nowStr = data.timestamp || new Date().toLocaleString("id-ID");

    // =========================================================================
    // AKSI: KEPUTUSAN VERIFIKASI (APPROVE -> PINDAH KE SAH & HAPUS DARI PROSES)
    // =========================================================================
    if (data.action === "VERIFY_DOCUMENT") {
      var docId = String(data.docId || "").trim();
      var docNumber = String(data.docNumber || "").trim();
      var status = data.status || "APPROVED";
      var verifier = data.verifierName || "Admin Verifikator SAKIP";
      var nip = data.verifierNip || "19850101 201001 1 002";
      var bav = data.bavNumber || ("BAV/SAKIP/" + docNumber);
      var notes = data.notes || "Verifikasi selesai";
      var sealHash = data.digitalSealHash || ("SHA256-" + Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMddHHmmss") + "-" + docId);

      // Cari baris di DOKUMEN_PROSES
      var pVals = prosesSheet.getDataRange().getValues();
      var foundPRow = -1;
      var existingRowData = null;

      for (var p = 1; p < pVals.length; p++) {
        var rowId = String(pVals[p][1] || "").trim().toLowerCase();
        var rowNo = String(pVals[p][2] || "").trim().toLowerCase();
        if ((docId && rowId === docId.toLowerCase()) || (docNumber && (rowNo === docNumber.toLowerCase() || rowNo.indexOf(docNumber.toLowerCase()) !== -1))) {
          foundPRow = p + 1;
          existingRowData = pVals[p];
          break;
        }
      }

      var fileUrl = data.downloadUrl || (existingRowData ? String(existingRowData[13] || "") : "");
      var fileId = (existingRowData ? String(existingRowData[14] || "") : "");
      var opd = data.opdName || (existingRowData ? String(existingRowData[4] || "") : "OPD");
      var title = data.title || (existingRowData ? String(existingRowData[3] || "") : "Dokumen SAKIP");
      var format = data.format || (existingRowData ? String(existingRowData[6] || "") : "PDF");
      var pemohonName = data.pemohonName || (existingRowData ? String(existingRowData[7] || "") : "Pemohon");
      var pemohonEmail = data.email || data.pemohonEmail || (existingRowData ? String(existingRowData[8] || "") : "-");
      var version = data.versionNumber || (existingRowData ? Number(String(existingRowData[5] || "1").replace("v", "")) : 1);

      if (status === "APPROVED") {
        // 1. PINDAHKAN FILE FISIK KE FOLDER DOKUMEN SAH (02_DOKUMEN_SAH_FINAL_5_TAHUN)
        var sahFolder = getOpdTargetFolder("02_DOKUMEN_SAH_FINAL_5_TAHUN", opd);
        if (fileId && fileId.length > 15 && fileId.indexOf("DRV-") === -1) {
          try {
            var driveFile = DriveApp.getFileById(fileId);
            driveFile.moveTo(sahFolder);
            fileUrl = driveFile.getUrl();
          } catch (mErr) {
            fileUrl = sahFolder.getUrl();
          }
        } else if (!fileUrl || fileUrl.indexOf("DRV-") !== -1) {
          fileUrl = sahFolder.getUrl();
        }

        // 2. HITUNG TANGGAL KEDALUWARSA RETENSI 5 TAHUN
        var expiry5Y = new Date();
        expiry5Y.setFullYear(expiry5Y.getFullYear() + 5);
        var expiry5YStr = expiry5Y.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

        // 3. MASUKKAN KE SHEET DOKUMEN_SAH_TERVERIFIKASI
        sahSheet.appendRow([
          nowStr,
          docId,
          docNumber,
          title,
          opd,
          "v" + version,
          format,
          pemohonName,
          pemohonEmail,
          "APPROVED",
          verifier,
          nip,
          bav,
          fileUrl,
          fileId,
          notes,
          sealHash,
          expiry5YStr,
          RETENTION_APPROVED_DAYS
        ]);

        // 4. CATAT RINGKASAN KE SHEET SUMMARY_RIWAYAT_REVISI
        summarySheet.appendRow([
          nowStr,
          docId,
          docNumber,
          title,
          opd,
          "v" + version,
          "PENGESAHAN_FINAL",
          "Dokumen Disahkan & Terbit BAV Resmi",
          notes,
          verifier,
          fileUrl,
          fileId,
          "Disimpan Sah 5 Tahun",
          "-",
          "SAH_FINAL"
        ]);

        // 5. HAPUS BARIS DARI SHEET DOKUMEN_PROSES KARENA SUDAH SELESAI
        if (foundPRow > 0) {
          prosesSheet.deleteRow(foundPRow);
        }

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "Dokumen berhasil DISAHKAN! Data dipindahkan ke DOKUMEN_SAH_TERVERIFIKASI (retensi 5 tahun) dan otomatis terhapus dari DOKUMEN_PROSES.",
          docId: docId,
          docNumber: docNumber,
          bavNumber: bav
        })).setMimeType(ContentService.MimeType.JSON);

      } else {
        // STATUS: REVISION / REJECTED -> PERBARUI DI DOKUMEN_PROSES & CATAT SUMMARY REVISI (3 BULAN)
        if (foundPRow > 0) {
          prosesSheet.getRange(foundPRow, 11).setValue(status);
          prosesSheet.getRange(foundPRow, 12).setValue(verifier);
          prosesSheet.getRange(foundPRow, 13).setValue(nip);
          prosesSheet.getRange(foundPRow, 16).setValue(notes);
        } else {
          prosesSheet.appendRow([
            nowStr, docId, docNumber, title, opd, "v" + version, format,
            pemohonName, pemohonEmail, opd, status, verifier, nip, fileUrl, fileId, notes, "01_DOKUMEN_PROSES"
          ]);
        }

        // Catat ke SUMMARY_RIWAYAT_REVISI dengan batas 3 bulan (90 hari)
        var expiry3M = new Date();
        expiry3M.setDate(expiry3M.getDate() + 90);
        var expiry3MStr = expiry3M.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

        summarySheet.appendRow([
          nowStr,
          docId,
          docNumber,
          title,
          opd,
          "v" + version,
          status === "REVISION" ? "CATATAN_PERBAIKAN" : "PENOLAKAN",
          notes.slice(0, 80),
          notes,
          verifier,
          fileUrl,
          fileId,
          expiry3MStr,
          RETENTION_REVISION_DAYS,
          "AKTIF_3_BULAN"
        ]);

        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          message: "Status " + status + " dicatat di DOKUMEN_PROSES dan ringkasan perbaikan dicatat di SUMMARY_RIWAYAT_REVISI (aktif 3 bulan).",
          docId: docId
        })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // =========================================================================
    // AKSI: UNGGAH DOKUMEN BARU / DRAF REVISI
    // =========================================================================
    var isRevisionUpload = (data.action === "UPLOAD_REVISION");
    var targetFolderName = isRevisionUpload ? "03_DRAF_REVISI_SUMMARY_3_BULAN" : "01_DOKUMEN_PROSES";
    var targetOpdFolder = getOpdTargetFolder(targetFolderName, data.opdName);
    var driveFileUrl = targetOpdFolder.getUrl();
    var driveFileId = "";

    // Simpan file fisik ke subfolder terkait
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
        } catch (se) {}
        driveFileUrl = fileCreated.getUrl();
        driveFileId = fileCreated.getId();
      } catch (fErr) {
        driveFileUrl = targetOpdFolder.getUrl();
      }
    }

    if (isRevisionUpload) {
      // Catat ke SUMMARY_RIWAYAT_REVISI (aktif 3 bulan)
      var expiry3M2 = new Date();
      expiry3M2.setDate(expiry3M2.getDate() + 90);
      var expiry3MStr2 = expiry3M2.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

      summarySheet.appendRow([
        nowStr,
        data.docId || ("DOC-" + Date.now()),
        data.docNumber || "-",
        data.title || "Draf Revisi",
        data.opdName || "Dinas",
        "v" + (data.versionNumber || 2),
        "UNGGAH_REVISI",
        data.notes || "Pengajuan draf hasil perbaikan dinas",
        data.notes || "-",
        data.pemohonName || "Pemohon",
        driveFileUrl,
        driveFileId,
        expiry3MStr2,
        RETENTION_REVISION_DAYS,
        "AKTIF_3_BULAN"
      ]);

      // Perbarui status di DOKUMEN_PROSES kembali menjadi PENDING
      var pVals2 = prosesSheet.getDataRange().getValues();
      var foundPRow2 = -1;
      for (var p2 = 1; p2 < pVals2.length; p2++) {
        if (String(pVals2[p2][1]) === String(data.docId) || String(pVals2[p2][2]) === String(data.docNumber)) {
          foundPRow2 = p2 + 1;
          break;
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

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Berkas revisi berhasil diunggah ke folder [" + targetOpdFolder.getName() + "], dicatat di SUMMARY_RIWAYAT_REVISI (retensi 3 bulan), dan status di DOKUMEN_PROSES kembali ke PENDING.",
        fileUrl: driveFileUrl,
        fileId: driveFileId
      })).setMimeType(ContentService.MimeType.JSON);

    } else {
      // UNGGAH DOKUMEN BARU (MASUK DOKUMEN_PROSES)
      prosesSheet.appendRow([
        nowStr,
        data.docId || ("DOC-" + Date.now()),
        data.docNumber || "Draf",
        data.title || "Dokumen SAKIP",
        data.opdName || "Dinas",
        "v" + (data.versionNumber || 1),
        data.format || "PDF",
        data.pemohonName || "Pemohon",
        data.pemohonEmail || data.email || "-",
        data.pemohonInstansi || data.opdName || "-",
        "PENDING",
        "-",
        "-",
        driveFileUrl,
        driveFileId,
        data.notes || "Pengajuan berkas baru",
        targetFolderName
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Dokumen baru berhasil disimpan ke folder [" + targetOpdFolder.getName() + "] dan dicatat di worksheet DOKUMEN_PROSES.",
        fileUrl: driveFileUrl,
        fileId: driveFileId
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * =========================================================================
 * 3. Helper Pengambil Seluruh Data (Dashboard & API) dari 3 Worksheet
 * =========================================================================
 */
function adminGetDashboardData() {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", documents: [], prosesDocs: [], sahDocs: [], summaryDocs: [], users: [], folders: [], spreadsheetUrl: "" };

  initDefaultDataIfEmpty(ss);

  var prosesSheet = ss.getSheetByName("DOKUMEN_PROSES");
  var sahSheet = ss.getSheetByName("DOKUMEN_SAH_TERVERIFIKASI");
  var summarySheet = ss.getSheetByName("SUMMARY_RIWAYAT_REVISI");
  var userSheet = ss.getSheetByName("DATABASE_PENGGUNA");
  var folderSheet = ss.getSheetByName("MAPPING_FOLDER_OPD");

  var master = getMasterFolder();
  var masterUrl = master.getUrl();

  // 1. Ambil Dokumen Dalam Proses
  var prosesDocs = [];
  if (prosesSheet && prosesSheet.getLastRow() > 1) {
    var pV = prosesSheet.getDataRange().getValues();
    for (var i = 1; i < pV.length; i++) {
      var pUrl = String(pV[i][13] || "");
      if (pUrl.indexOf("DRV-") !== -1) pUrl = masterUrl;

      prosesDocs.push({
        tanggalMasuk: String(pV[i][0] || ""),
        id: String(pV[i][1] || "DOC-P-" + i),
        nomorBerkas: String(pV[i][2] || ""),
        judul: String(pV[i][3] || ""),
        opdName: String(pV[i][4] || ""),
        opdId: String(pV[i][4] || ""),
        currentVersion: Number(String(pV[i][5] || "1").replace("v", "")) || 1,
        format: String(pV[i][6] || "PDF"),
        pemohon: {
          nama: String(pV[i][7] || "Pemohon"),
          email: String(pV[i][8] || ""),
          instansi: String(pV[i][9] || ""),
        },
        status: String(pV[i][10] || "PENDING"),
        verifierName: String(pV[i][11] || "-"),
        verifierNip: String(pV[i][12] || "-"),
        googleDrive: {
          viewUrl: pUrl,
          downloadUrl: pUrl,
          fileId: String(pV[i][14] || "")
        },
        notes: String(pV[i][15] || ""),
        sourceSheet: "DOKUMEN_PROSES",
        verification: {
          status: String(pV[i][10] || "PENDING"),
          verifiedBy: String(pV[i][11] || "Admin Verifikator"),
          nip: String(pV[i][12] || "-"),
          notes: String(pV[i][15] || "")
        }
      });
    }
  }

  // 2. Ambil Dokumen Sah (5 Tahun)
  var sahDocs = [];
  if (sahSheet && sahSheet.getLastRow() > 1) {
    var sV = sahSheet.getDataRange().getValues();
    for (var j = 1; j < sV.length; j++) {
      var sUrl = String(sV[j][13] || "");
      if (sUrl.indexOf("DRV-") !== -1) sUrl = masterUrl;

      sahDocs.push({
        tanggalMasuk: String(sV[j][0] || ""),
        id: String(sV[j][1] || "DOC-S-" + j),
        nomorBerkas: String(sV[j][2] || ""),
        judul: String(sV[j][3] || ""),
        opdName: String(sV[j][4] || ""),
        opdId: String(sV[j][4] || ""),
        currentVersion: Number(String(sV[j][5] || "1").replace("v", "")) || 1,
        format: String(sV[j][6] || "PDF"),
        pemohon: {
          nama: String(sV[j][7] || "Pemohon"),
          email: String(sV[j][8] || ""),
          instansi: String(sV[j][4] || ""),
        },
        status: "APPROVED",
        verifierName: String(sV[j][10] || "Admin Verifikator SAKIP"),
        verifierNip: String(sV[j][11] || "-"),
        bavNumber: String(sV[j][12] || ""),
        googleDrive: {
          viewUrl: sUrl,
          downloadUrl: sUrl,
          fileId: String(sV[j][14] || "")
        },
        notes: String(sV[j][15] || ""),
        digitalSealHash: String(sV[j][16] || ""),
        retentionExpiry: String(sV[j][17] || "5 Tahun"),
        sourceSheet: "DOKUMEN_SAH_TERVERIFIKASI",
        isLocked: true,
        verification: {
          status: "APPROVED",
          verifiedBy: String(sV[j][10] || "Admin Verifikator SAKIP"),
          nip: String(sV[j][11] || "-"),
          bavNumber: String(sV[j][12] || ""),
          notes: String(sV[j][15] || ""),
          digitalSealHash: String(sV[j][16] || "")
        }
      });
    }
  }

  // 3. Ambil Summary & Riwayat Revisi (3 Bulan)
  var summaryDocs = [];
  if (summarySheet && summarySheet.getLastRow() > 1) {
    var smV = summarySheet.getDataRange().getValues();
    for (var k = 1; k < smV.length; k++) {
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
        fileUrl: String(smV[k][10] || ""),
        fileId: String(smV[k][11] || ""),
        batasSimpan3Bln: String(smV[k][12] || "90 Hari"),
        statusBersih: String(smV[k][14] || "AKTIF_3_BULAN")
      });
    }
  }

  // Gabungkan seluruh dokumen aktif (Proses + Sah) untuk frontend
  var allDocs = prosesDocs.concat(sahDocs);

  // Ambil Pengguna
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

  // Ambil Folder Mapping
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
      retentionPolicy: {
        revisiDays: RETENTION_REVISION_DAYS,
        sahYears: 5
      }
    }
  };
}

function adminSaveUserAccount(userId, username, email, nama, role, opdName, nip, password, driveFolderUrl) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
  var userSheet = getOrCreateSheet(ss, "DATABASE_PENGGUNA");

  var foundUserRow = -1;
  var uVals = userSheet.getDataRange().getValues();
  for (var u = 1; u < uVals.length; u++) {
    if (String(uVals[u][2]) === String(username) || String(uVals[u][3]) === String(email) || String(uVals[u][1]) === String(userId)) {
      foundUserRow = u + 1;
      break;
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
}

function adminRegisterFolderServer(opdId, opdName, driveUrl, folderId, subfolderName, registrar, nip, notes) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
  var folderSheet = getOrCreateSheet(ss, "MAPPING_FOLDER_OPD");

  var now = new Date().toLocaleString("id-ID");
  var foundFolderRow = -1;
  var fVals = folderSheet.getDataRange().getValues();
  for (var f = 1; f < fVals.length; f++) {
    if (String(fVals[f][1]) === String(opdId) || String(fVals[f][2]) === String(opdName)) {
      foundFolderRow = f + 1;
      break;
    }
  }

  var validUrl = driveUrl || getMasterFolder().getUrl();

  if (foundFolderRow > 0) {
    folderSheet.getRange(foundFolderRow, 1).setValue(now);
    folderSheet.getRange(foundFolderRow, 4).setValue(validUrl);
    folderSheet.getRange(foundFolderRow, 7).setValue(registrar || "Admin SAKIP");
    folderSheet.getRange(foundFolderRow, 8).setValue(nip || "-");
    folderSheet.getRange(foundFolderRow, 9).setValue(notes || "Pembaruan Folder OPD");
  } else {
    folderSheet.appendRow([
      now, opdId, opdName, validUrl, validUrl, validUrl, registrar || "Admin SAKIP", nip || "-", notes || "Pendaftaran Folder OPD"
    ]);
  }

  return adminGetDashboardData();
}
`;
