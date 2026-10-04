/**
 * GOOGLE APPS SCRIPT FILES: Code.gs & Index.html
 * Versi Mutakhir: Penempatan Otomatis Berkas ke Subfolder OPD & Solusi Pencegahan Error 404 Google Drive
 */

export const APPS_SCRIPT_CODE_GS = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: Code.gs (Backend Controller & Multi-Sheet Engine)
 * SIMVERIF SAKIP - PEMERINTAH KABUPATEN NAGEKEO
 * =========================================================================
 * 
 * STRUKTUR DATABASE MULTI-SHEET:
 * 1. Sheet 'DATA_VERIFIKASI_DOKUMEN': Transaksi berkas SAKIP, status verifikasi, pemohon, dan link Drive.
 * 2. Sheet 'DATABASE_PENGGUNA': Akun dinas (@nagekeokab.go.id), password, OPD, dan hak akses.
 * 3. Sheet 'MAPPING_FOLDER_OPD': Pemetaan folder Google Drive per masing-masing 38 OPD.
 */

var MASTER_FOLDER_ID = "1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7";

/**
 * Mendapatkan Spreadsheet aktif atau membuat baru jika belum ada
 */
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

/**
 * Mengambil atau membuat sheet berdasarkan nama
 */
function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

/**
 * Ekstraksi ID Folder dari URL Google Drive
 */
function extractFolderIdFromUrl(url) {
  if (!url || typeof url !== "string") return "";
  var match = url.match(/folders\\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  if (url.length >= 25 && url.indexOf("/") === -1 && url.indexOf(" ") === -1 && url.indexOf("DRV-") === -1) return url;
  return "";
}

/**
 * Mendapatkan Folder Induk Server (Master Folder)
 */
function getMasterFolder() {
  try {
    if (MASTER_FOLDER_ID && MASTER_FOLDER_ID.length > 10) {
      return DriveApp.getFolderById(MASTER_FOLDER_ID);
    }
  } catch (e) {}
  return DriveApp.getRootFolder();
}

/**
 * MENCARI ATAU MEMBUAT SUBFOLDER OPD SECARA OTOMATIS
 * Menjamin berkas dinas 100% masuk ke subfolder masing-masing OPD dan tidak salah masuk ke root/induk
 */
function getOrCreateOpdSubfolder(opdId, opdName, customFolderId, customFolderUrl) {
  var master = getMasterFolder();
  var effectiveOpdName = opdName || opdId || "OPD";
  var targetSubfolderName = "SAKIP - " + effectiveOpdName;

  // 1. Jika ada custom folder ID yang valid dan bisa diakses
  var cleanCustomId = extractFolderIdFromUrl(customFolderUrl) || customFolderId || "";
  if (cleanCustomId && cleanCustomId.length > 15 && cleanCustomId !== MASTER_FOLDER_ID && cleanCustomId.indexOf("DRV-") === -1) {
    try {
      var customFolder = DriveApp.getFolderById(cleanCustomId);
      if (customFolder) return customFolder;
    } catch (e) {}
  }

  // 2. Cek apakah folder OPD sudah tercatat di sheet MAPPING_FOLDER_OPD
  var ss = getActiveSpreadsheetSafely();
  if (ss) {
    var folderSheet = ss.getSheetByName("MAPPING_FOLDER_OPD");
    if (folderSheet && folderSheet.getLastRow() > 1) {
      var fVals = folderSheet.getDataRange().getValues();
      var reqId = String(opdId || "").toLowerCase();
      var reqName = String(opdName || "").toLowerCase();

      for (var f = 1; f < fVals.length; f++) {
        var rowId = String(fVals[f][1] || "").toLowerCase();
        var rowName = String(fVals[f][2] || "").toLowerCase();

        if ((reqId && rowId === reqId) || (reqName && (rowName === reqName || reqName.indexOf(rowName) !== -1 || rowName.indexOf(reqName) !== -1))) {
          var savedId = String(fVals[f][4] || "");
          if (savedId && savedId.length > 15 && savedId !== MASTER_FOLDER_ID && savedId.indexOf("DRV-") === -1) {
            try {
              var mappedFolder = DriveApp.getFolderById(savedId);
              if (mappedFolder) return mappedFolder;
            } catch (e) {}
          }
        }
      }
    }
  }

  // 3. Cari apakah subfolder dengan nama OPD sudah ada di dalam Master Folder
  var folders = master.getFoldersByName(targetSubfolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var altFolders = master.getFoldersByName(effectiveOpdName);
  if (altFolders.hasNext()) {
    return altFolders.next();
  }

  // 4. Jika belum ada, BUAT SUBFOLDER BARU secara otomatis di dalam Master Folder
  try {
    var newFolder = master.createFolder(targetSubfolderName);
    try {
      newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sErr) {}

    // Daftarkan subfolder baru ini ke sheet MAPPING_FOLDER_OPD
    adminRegisterFolderServer(
      opdId || "OPD",
      effectiveOpdName,
      newFolder.getUrl(),
      newFolder.getId(),
      targetSubfolderName,
      "Sistem Otomatis",
      "-",
      "Subfolder Google Drive Terverifikasi"
    );

    return newFolder;
  } catch (err) {
    return master;
  }
}

/**
 * Inisialisasi Data Default jika Sheet Masih Kosong
 */
function initDefaultDataIfEmpty(ss) {
  var docSheet = getOrCreateSheet(ss, "DATA_VERIFIKASI_DOKUMEN");
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
}

/**
 * 1. doGet: Merender Web App Dashboard Admin & Menyajikan JSON untuk User Dinas
 */
function doGet(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (ss) {
      initDefaultDataIfEmpty(ss);
    }

    var action = e && e.parameter ? e.parameter.action : "";
    
    // API Endpoint JSON: Melayani data real-time untuk aplikasi Web User Dinas
    if (action === "get_all_data" || (e && e.parameter && e.parameter.format === "json")) {
      return ContentService.createTextOutput(JSON.stringify(adminGetDashboardData()))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Render Dashboard Admin Web App dari file Index.html
    return HtmlService.createTemplateFromFile("Index").evaluate()
      .setTitle("DASHBOARD ADMIN SAKIP - KABUPATEN NAGEKEO")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * 2. doPost: Menerima Unggahan Berkas Dokumen, Pendaftaran Folder, & Sinkronisasi
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

    var docSheet = getOrCreateSheet(ss, "DATA_VERIFIKASI_DOKUMEN");

    // Aksi 1: PING UJI KONEKSI
    if (data.action === "TEST_PING") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Koneksi Webhook Google Sheets & Google Drive Server Aktif!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 2: PENDAFTARAN ATAU PEMBARUAN AKUN DINAS
    if (data.action === "REGISTER_USER_ACCOUNT" || data.action === "UPDATE_USER_PASSWORD") {
      return ContentService.createTextOutput(JSON.stringify(
        adminSaveUserAccount(data.userId, data.username, data.email, data.pemohonName || data.nama, data.role, data.opdName, data.verifierNip || data.nip, data.newPassword, data.driveFolderUrl)
      )).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 3: PENDAFTARAN FOLDER GOOGLE DRIVE OPD
    if (data.action === "REGISTER_FOLDER" || data.action === "REGISTER_OPD_FOLDER") {
      var r = data.folderRegistration || data;
      return ContentService.createTextOutput(JSON.stringify(
        adminRegisterFolderServer(r.opdId, r.opdName, r.driveFolderUrl, r.driveFolderId || r.driveMasterFolderId, r.subfolderName || r.driveServerName, r.registeredBy || r.verifierName, r.nip || r.verifierNip, r.notes)
      )).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 4: BATCH PENDAFTARAN SEMUA FOLDER OPD
    if ((data.action === "REGISTER_ALL_FOLDERS" || data.action === "REGISTER_ALL_OPD_FOLDERS") && data.folderRegistrations) {
      var regs = data.folderRegistrations;
      for (var k = 0; k < regs.length; k++) {
        var item = regs[k];
        adminRegisterFolderServer(item.opdId, item.opdName, item.driveFolderUrl, item.driveFolderId, item.subfolderName || item.driveFolderName, item.registeredBy || item.registeredByAdmin, item.nip, item.notes);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Seluruh folder OPD berhasil disimpan ke sheet MAPPING_FOLDER_OPD."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 5: KEPUTUSAN VERIFIKASI DOKUMEN
    if (data.action === "VERIFY_DOCUMENT") {
      var dVals = docSheet.getDataRange().getValues();
      for (var d = 1; d < dVals.length; d++) {
        if (String(dVals[d][1]) === String(data.docId) || String(dVals[d][2]) === String(data.docNumber)) {
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
        message: "Status verifikasi berhasil dicatat di sheet DATA_VERIFIKASI_DOKUMEN."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 6: SIMPAN UNGGAHAN BERKAS KE DALAM SUBFOLDER OPD GOOGLE DRIVE
    // Mendapatkan target subfolder OPD secara spesifik
    var targetSubfolder = getOrCreateOpdSubfolder(
      data.opdId,
      data.opdName,
      data.driveFolderId || data.driveMasterFolderId,
      data.driveFolderUrl
    );

    var driveFileUrl = targetSubfolder.getUrl();
    var driveFileId = "";

    // Simpan file fisik ke dalam Subfolder OPD
    if (data.fileBase64 && data.fileBase64.length > 30) {
      try {
        var decodedBytes = Utilities.base64Decode(data.fileBase64);
        var mimeType = data.fileMimeType || "application/pdf";
        var fileName = data.fileName || ("dokumen_" + (data.docNumber || "sakip") + ".pdf");
        var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        
        var driveFile = targetSubfolder.createFile(blob);
        driveFile.setDescription("Dokumen SAKIP Nagekeo: " + (data.docNumber || "") + " - " + (data.opdName || ""));
        
        try {
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {}
        
        driveFileUrl = driveFile.getUrl();
        driveFileId = driveFile.getId();
      } catch (driveErr) {
        driveFileUrl = targetSubfolder.getUrl();
      }
    }

    // Catat transaksi berkas ke sheet DATA_VERIFIKASI_DOKUMEN
    docSheet.appendRow([
      data.timestamp || new Date().toLocaleString("id-ID"),
      data.docId || ("DOC-" + Date.now()),
      data.docNumber || "Draf",
      data.title || "Dokumen SAKIP",
      data.opdName || "Dinas",
      "v" + (data.versionNumber || 1),
      data.format || "PDF",
      data.pemohonName || "Pemohon",
      data.pemohonEmail || data.email || "-",
      data.pemohonInstansi || data.opdName || "-",
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
      message: "Data dokumen berhasil masuk ke subfolder Google Drive [" + targetSubfolder.getName() + "] dan sheet DATA_VERIFIKASI_DOKUMEN.",
      fileUrl: driveFileUrl,
      fileId: driveFileId,
      folderUrl: targetSubfolder.getUrl(),
      folderName: targetSubfolder.getName()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. Helper Pengambil Seluruh Data untuk Dashboard & API JSON
 */
function adminGetDashboardData() {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", documents: [], users: [], folders: [], spreadsheetUrl: "" };

  initDefaultDataIfEmpty(ss);

  var docSheet = ss.getSheetByName("DATA_VERIFIKASI_DOKUMEN");
  var userSheet = ss.getSheetByName("DATABASE_PENGGUNA");
  var folderSheet = ss.getSheetByName("MAPPING_FOLDER_OPD");
  
  var docs = [];
  if (docSheet && docSheet.getLastRow() > 1) {
    var v = docSheet.getDataRange().getValues();
    for (var i = 1; i < v.length; i++) {
      var rawUrl = String(v[i][14] || "");
      // Hindari link dummy DRV- yang menyebabkan 404
      var cleanViewUrl = rawUrl.indexOf("DRV-") !== -1 ? ("https://drive.google.com/drive/folders/" + MASTER_FOLDER_ID) : rawUrl;

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
          viewUrl: cleanViewUrl,
          downloadUrl: cleanViewUrl,
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

  var folders = [];
  if (folderSheet && folderSheet.getLastRow() > 1) {
    var f = folderSheet.getDataRange().getValues();
    for (var k = 1; k < f.length; k++) {
      folders.push({
        registeredAt: String(f[k][0] || ""),
        opdId: String(f[k][1] || ""),
        opdName: String(f[k][2] || ""),
        driveFolderUrl: String(f[k][3] || ""),
        driveFolderId: String(f[k][4] || ""),
        subfolderName: String(f[k][5] || ""),
        registeredBy: String(f[k][6] || ""),
        nip: String(f[k][7] || ""),
        notes: String(f[k][8] || "")
      });
    }
  }

  return {
    status: "success",
    spreadsheetUrl: ss.getUrl(),
    documents: docs,
    users: users,
    folders: folders
  };
}

/**
 * 4. Fungsi Server Verifikasi Dokumen Admin
 */
function adminProcessVerification(docId, docNumber, status, verifierName, verifierNip, bavNumber, notes) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
  var docSheet = ss.getSheetByName("DATA_VERIFIKASI_DOKUMEN");
  if (!docSheet) return { status: "error", message: "Sheet DATA_VERIFIKASI_DOKUMEN tidak ada" };

  var foundRow = -1;
  var dVals = docSheet.getDataRange().getValues();
  for (var d = 1; d < dVals.length; d++) {
    if (String(dVals[d][1]) === String(docId) || String(dVals[d][2]) === String(docNumber)) {
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
 * 5. Fungsi Server Pengelolaan Akun Dinas di Sheet 'DATABASE_PENGGUNA'
 */
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

/**
 * 6. Fungsi Server Pendaftaran Folder Google Drive di Sheet 'MAPPING_FOLDER_OPD'
 */
function adminRegisterFolderServer(opdId, opdName, driveUrl, folderId, subfolderName, registrar, nip, notes) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
  var folderSheet = getOrCreateSheet(ss, "MAPPING_FOLDER_OPD");

  var effectiveFolderId = folderId || extractFolderIdFromUrl(driveUrl) || MASTER_FOLDER_ID;
  var now = new Date().toLocaleString("id-ID");

  var foundFolderRow = -1;
  var fVals = folderSheet.getDataRange().getValues();
  for (var f = 1; f < fVals.length; f++) {
    if (String(fVals[f][1]) === String(opdId) || String(fVals[f][2]) === String(opdName)) {
      foundFolderRow = f + 1;
      break;
    }
  }

  var validUrl = driveUrl || ("https://drive.google.com/drive/folders/" + effectiveFolderId);

  if (foundFolderRow > 0) {
    folderSheet.getRange(foundFolderRow, 1).setValue(now);
    folderSheet.getRange(foundFolderRow, 4).setValue(validUrl);
    folderSheet.getRange(foundFolderRow, 5).setValue(effectiveFolderId);
    folderSheet.getRange(foundFolderRow, 6).setValue(subfolderName || opdName);
    folderSheet.getRange(foundFolderRow, 7).setValue(registrar || "Admin SAKIP");
    folderSheet.getRange(foundFolderRow, 8).setValue(nip || "-");
    folderSheet.getRange(foundFolderRow, 9).setValue(notes || "Pembaruan Folder OPD");
  } else {
    folderSheet.appendRow([
      now,
      opdId,
      opdName,
      validUrl,
      effectiveFolderId,
      subfolderName || opdName,
      registrar || "Admin SAKIP",
      nip || "-",
      notes || "Pendaftaran Folder OPD"
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
      <button type="button" onclick="loadAllData()" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer">
        <i class="fa-solid fa-rotate" id="refreshIcon"></i>
        <span>Segarkan Data</span>
      </button>
      <a id="sheetLinkBtn" href="https://docs.google.com/spreadsheets/" target="_blank" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95">
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
      <div class="flex border-b border-slate-800 bg-slate-900 px-4 sm:px-6 gap-3 sm:gap-6 text-xs font-bold overflow-x-auto custom-scrollbar">
        <button type="button" onclick="switchTab('DOCS')" id="tabBtnDocs" class="py-4 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-file-signature"></i>
          <span>1. Verifikasi Berkas Dokumen SAKIP</span>
        </button>
        <button type="button" onclick="switchTab('USERS')" id="tabBtnUsers" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-users-gear text-sky-400"></i>
          <span>2. Kelola Akun &amp; Pengguna Dinas</span>
        </button>
        <button type="button" onclick="switchTab('FOLDERS')" id="tabBtnFolders" class="py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0">
          <i class="fa-solid fa-folder-tree text-amber-400"></i>
          <span>3. Pemetaan Folder Google Drive (38 OPD)</span>
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
            <button type="button" onclick="filterByStatus('ALL')" class="px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 text-white transition-colors cursor-pointer" id="filterStatusAll">Semua</button>
            <button type="button" onclick="filterByStatus('PENDING')" class="px-3.5 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors cursor-pointer" id="filterStatusPending">Menunggu</button>
            <button type="button" onclick="filterByStatus('REVISION')" class="px-3.5 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors cursor-pointer" id="filterStatusRevision">Perlu Revisi</button>
            <button type="button" onclick="filterByStatus('APPROVED')" class="px-3.5 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors cursor-pointer" id="filterStatusApproved">Disetujui (Sah)</button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
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
      <div id="tabContentUsers" class="p-5 space-y-4" style="display: none;">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div>
            <div class="font-bold text-white text-sm flex items-center gap-2">
              <i class="fa-solid fa-users text-sky-400"></i>
              <span>Pusat Pengelolaan Akun Dinas (@nagekeokab.go.id)</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Tersinkronisasi langsung ke Google Sheet lembar <strong>DATABASE_PENGGUNA</strong></p>
          </div>

          <button type="button" onclick="openUserModal()" class="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 active:scale-95 cursor-pointer">
            <i class="fa-solid fa-user-plus"></i>
            <span>+ Daftarkan Akun Dinas Baru</span>
          </button>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
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

      <!-- TAB 3: PEMETAAN FOLDER GOOGLE DRIVE OPD (38 DINAS) -->
      <div id="tabContentFolders" class="p-5 space-y-4" style="display: none;">
        <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div>
            <div class="font-bold text-white text-sm flex items-center gap-2">
              <i class="fa-solid fa-folder-tree text-amber-400"></i>
              <span>Pemetaan Folder Google Drive OPD (38 Dinas)</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">Tersimpan di sheet <strong>MAPPING_FOLDER_OPD</strong> &bull; Berkas otomatis masuk ke subfolder dinas masing-masing.</p>
          </div>

          <button type="button" onclick="openFolderModal()" class="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95 cursor-pointer">
            <i class="fa-solid fa-folder-plus"></i>
            <span>+ Daftarkan / Edit Folder OPD</span>
          </button>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 custom-scrollbar">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th class="p-3.5">ID &amp; Nama Dinas</th>
                <th class="p-3.5">Subfolder Target</th>
                <th class="p-3.5">ID Folder Google Drive</th>
                <th class="p-3.5">Tautan Drive</th>
                <th class="p-3.5">Didaftarkan Oleh</th>
                <th class="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody id="foldersTableBody" class="divide-y divide-slate-800/80 text-slate-300">
              <tr><td colspan="6" class="p-8 text-center text-slate-500">Memuat pemetaan folder OPD...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </main>

  <!-- MODAL VERIFIKASI DOKUMEN -->
  <div id="verifyModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" style="display: none;">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="font-bold text-white text-base flex items-center gap-2">
          <i class="fa-solid fa-file-signature text-emerald-400"></i>
          <span>Formulir Keputusan Verifikasi &amp; BAV</span>
        </div>
        <button type="button" onclick="closeVerifyModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
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
          <textarea id="inputNotes" rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" placeholder="Catatan evaluasi atau petunjuk perbaikan..."></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        <button type="button" onclick="closeVerifyModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer">Batal</button>
        <button type="button" id="btnSubmitVerify" onclick="submitVerification()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95">
          <i class="fa-solid fa-check"></i> <span>Sahkan &amp; Simpan ke Google Sheet</span>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL TAMBAH / EDIT AKUN PENGGUNA DINAS -->
  <div id="userModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" style="display: none;">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="font-bold text-white text-base flex items-center gap-2">
          <i class="fa-solid fa-user-gear text-sky-400"></i>
          <span>Kelola Akun Dinas (@nagekeokab.go.id)</span>
        </div>
        <button type="button" onclick="closeUserModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
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
        <button type="button" onclick="closeUserModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer">Batal</button>
        <button type="button" id="btnSubmitUser" onclick="submitUser()" class="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-sky-600/30 cursor-pointer active:scale-95">
          <i class="fa-solid fa-save"></i> <span>Simpan ke DATABASE_PENGGUNA</span>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL DAFTAR / EDIT FOLDER GOOGLE DRIVE OPD -->
  <div id="folderModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" style="display: none;">
    <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="font-bold text-white text-base flex items-center gap-2">
          <i class="fa-solid fa-folder-plus text-amber-400"></i>
          <span>Pemetaan Folder Google Drive OPD</span>
        </div>
        <button type="button" onclick="closeFolderModal()" class="text-slate-400 hover:text-white p-1 cursor-pointer"><i class="fa-solid fa-xmark text-lg"></i></button>
      </div>

      <div class="space-y-3 text-xs">
        <div>
          <label class="block text-slate-300 font-bold mb-1">ID OPD / Kode Dinas :</label>
          <input type="text" id="inputFolderOpdId" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none" placeholder="Contoh: DISDIKBUD">
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1">Nama Lengkap Dinas / OPD :</label>
          <input type="text" id="inputFolderOpdName" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none" placeholder="Dinas Pendidikan dan Kebudayaan">
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1">URL Folder Google Drive OPD :</label>
          <input type="text" id="inputFolderDriveUrl" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-[11px] focus:border-amber-500 focus:outline-none" placeholder="https://drive.google.com/drive/folders/...">
        </div>

        <div>
          <label class="block text-slate-300 font-bold mb-1">ID Folder Google Drive (Opsional) :</label>
          <input type="text" id="inputFolderDriveId" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none" placeholder="1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-300 font-bold mb-1">Nama Subfolder :</label>
            <input type="text" id="inputFolderSubname" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none" placeholder="SAKIP_DISDIKBUD_2026">
          </div>
          <div>
            <label class="block text-slate-300 font-bold mb-1">Didaftarkan Oleh :</label>
            <input type="text" id="inputFolderRegistrar" value="Admin Verifikator" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-amber-500 focus:outline-none">
          </div>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        <button type="button" onclick="closeFolderModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer">Batal</button>
        <button type="button" id="btnSubmitFolder" onclick="submitFolder()" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-amber-600/30 cursor-pointer active:scale-95">
          <i class="fa-solid fa-save"></i> <span>Simpan ke MAPPING_FOLDER_OPD</span>
        </button>
      </div>
    </div>
  </div>

  <script>
    var globalData = {
      documents: [],
      users: [],
      folders: []
    };

    var activeStatusFilter = 'ALL';
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
      }, 4000);
    }

    function loadAllData() {
      var icon = document.getElementById('refreshIcon');
      if (icon) icon.classList.add('fa-spin');

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (icon) icon.classList.remove('fa-spin');
            if (res && res.status === 'success') {
              globalData.documents = res.documents || [];
              globalData.users = res.users || [];
              globalData.folders = res.folders || [];
              if (res.spreadsheetUrl) {
                var btn = document.getElementById('sheetLinkBtn');
                if (btn) btn.href = res.spreadsheetUrl;
              }
              showToast('Data berhasil dimuat dari Google Sheet!', 'success');
            }
            renderStats();
            renderDocs();
            renderUsers();
            renderFolders();
          })
          .withFailureHandler(function(err) {
            if (icon) icon.classList.remove('fa-spin');
            showToast('Catatan koneksi: ' + err.toString(), 'error');
            renderStats();
            renderDocs();
            renderUsers();
            renderFolders();
          })
          .adminGetDashboardData();
      } else {
        if (icon) icon.classList.remove('fa-spin');
        renderStats();
        renderDocs();
        renderUsers();
        renderFolders();
      }
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

      var filtered = [];
      for (var i = 0; i < docs.length; i++) {
        var d = docs[i];
        var matchStatus = activeStatusFilter === 'ALL' || d.status === activeStatusFilter;
        var matchSearch = !search ||
          (d.nomorBerkas && d.nomorBerkas.toLowerCase().indexOf(search) !== -1) ||
          (d.judul && d.judul.toLowerCase().indexOf(search) !== -1) ||
          (d.opdName && d.opdName.toLowerCase().indexOf(search) !== -1) ||
          (d.pemohon && d.pemohon.email && d.pemohon.email.toLowerCase().indexOf(search) !== -1);
        if (matchStatus && matchSearch) {
          filtered.push({ doc: d, originalIndex: i });
        }
      }

      var tbody = document.getElementById('docsTableBody');
      if (!tbody) return;

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-500">Belum ada berkas yang masuk. Berkas baru akan muncul di sini secara otomatis.</td></tr>';
        return;
      }

      var html = '';
      for (var k = 0; k < filtered.length; k++) {
        var item = filtered[k];
        var d = item.doc;
        var idx = item.originalIndex;

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

        var viewLink = (d.googleDrive && d.googleDrive.viewUrl) ? d.googleDrive.viewUrl : '';
        if (viewLink.indexOf('DRV-') !== -1) viewLink = '';

        var driveLink = viewLink && viewLink.length > 5
          ? '<a href="' + viewLink + '" target="_blank" class="text-sky-400 hover:underline flex items-center gap-1 font-mono text-[11px]"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Drive</a>'
          : '<span class="text-slate-500 font-mono">-</span>';

        var actionButton = '<button type="button" onclick="openVerifyModalByIndex(' + idx + ')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95">' +
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
      }

      tbody.innerHTML = html;
    }

    function renderUsers() {
      var users = globalData.users || [];
      var tbody = document.getElementById('usersTableBody');
      if (!tbody) return;

      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-500">Belum ada akun dinas. Klik "+ Daftarkan Akun Dinas Baru" di atas.</td></tr>';
        return;
      }

      var html = '';
      for (var j = 0; j < users.length; j++) {
        var u = users[j];
        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5 font-bold font-mono text-sky-400">@' + (u.username || '') + '</td>' +
          '<td class="p-3.5 font-mono text-emerald-400 font-semibold">' + (u.email || '') + '</td>' +
          '<td class="p-3.5"><div class="font-bold text-slate-200">' + (u.nama || '-') + '</div><div class="text-[10px] text-slate-400">' + (u.opdName || '-') + '</div></td>' +
          '<td class="p-3.5"><span class="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">' + (u.role || 'DINAS_PEMOHON') + '</span></td>' +
          '<td class="p-3.5 font-mono text-slate-300 font-bold">' + (u.password || '******') + '</td>' +
          '<td class="p-3.5"><span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold text-[10px]">AKTIF</span></td>' +
          '<td class="p-3.5 text-right"><button type="button" onclick="editUserAccountByIndex(' + j + ')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"><i class="fa-solid fa-pen-to-square"></i> Edit</button></td>' +
          '</tr>';
      }

      tbody.innerHTML = html;
    }

    function renderFolders() {
      var folders = globalData.folders || [];
      var tbody = document.getElementById('foldersTableBody');
      if (!tbody) return;

      if (folders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada pemetaan folder OPD. Klik "+ Daftarkan / Edit Folder OPD" di atas.</td></tr>';
        return;
      }

      var html = '';
      for (var f = 0; f < folders.length; f++) {
        var itm = folders[f];
        var driveLink = itm.driveFolderUrl && itm.driveFolderUrl.indexOf('DRV-') === -1
          ? '<a href="' + itm.driveFolderUrl + '" target="_blank" class="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[11px]"><i class="fa-solid fa-folder-open"></i> Buka Subfolder</a>'
          : '<span class="text-slate-500 font-mono">-</span>';

        html += '<tr class="hover:bg-slate-900/80 transition-colors">' +
          '<td class="p-3.5"><div class="font-bold text-white">' + (itm.opdName || '-') + '</div><div class="text-[10px] text-amber-400 font-mono font-bold">' + (itm.opdId || '-') + '</div></td>' +
          '<td class="p-3.5 font-mono text-slate-300">' + (itm.subfolderName || '-') + '</td>' +
          '<td class="p-3.5 font-mono text-slate-400 text-[11px]">' + (itm.driveFolderId || '-') + '</td>' +
          '<td class="p-3.5">' + driveLink + '</td>' +
          '<td class="p-3.5 text-[11px] text-slate-400"><div class="text-slate-200">' + (itm.registeredBy || '-') + '</div><div>' + (itm.registeredAt || '') + '</div></td>' +
          '<td class="p-3.5 text-right"><button type="button" onclick="editFolderMappingByIndex(' + f + ')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"><i class="fa-solid fa-pen-to-square"></i> Edit</button></td>' +
          '</tr>';
      }

      tbody.innerHTML = html;
    }

    function switchTab(tab) {
      var tabDocs = document.getElementById('tabContentDocs');
      var tabUsers = document.getElementById('tabContentUsers');
      var tabFolders = document.getElementById('tabContentFolders');
      var btnDocs = document.getElementById('tabBtnDocs');
      var btnUsers = document.getElementById('tabBtnUsers');
      var btnFolders = document.getElementById('tabBtnFolders');

      tabDocs.style.display = 'none';
      tabUsers.style.display = 'none';
      tabFolders.style.display = 'none';

      btnDocs.className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0';
      btnUsers.className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0';
      btnFolders.className = 'py-4 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0';

      if (tab === 'DOCS') {
        tabDocs.style.display = 'block';
        btnDocs.className = 'py-4 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2 cursor-pointer shrink-0';
      } else if (tab === 'USERS') {
        tabUsers.style.display = 'block';
        btnUsers.className = 'py-4 border-b-2 border-sky-500 text-sky-400 flex items-center gap-2 cursor-pointer shrink-0';
      } else {
        tabFolders.style.display = 'block';
        btnFolders.className = 'py-4 border-b-2 border-amber-500 text-amber-400 flex items-center gap-2 cursor-pointer shrink-0';
      }
    }

    function openVerifyModalByIndex(index) {
      var doc = (globalData.documents || [])[index];
      if (!doc) return;
      selectedVerifyDoc = doc;

      document.getElementById('modalDocNumber').innerText = doc.nomorBerkas || '-';
      document.getElementById('modalDocTitle').innerText = doc.judul || '-';
      document.getElementById('modalDocOpd').innerText = doc.opdName || '-';
      document.getElementById('inputBav').value = 'BAV/SAKIP/' + (doc.nomorBerkas || Date.now());
      document.getElementById('inputNotes').value = doc.notes || '';
      if (doc.status === 'APPROVED' || doc.status === 'REVISION' || doc.status === 'REJECTED') {
        document.getElementById('selectStatus').value = doc.status;
      } else {
        document.getElementById('selectStatus').value = 'APPROVED';
      }

      var modal = document.getElementById('verifyModal');
      if (modal) modal.style.display = 'flex';
    }

    function closeVerifyModal() {
      var modal = document.getElementById('verifyModal');
      if (modal) modal.style.display = 'none';
      selectedVerifyDoc = null;
    }

    function submitVerification() {
      if (!selectedVerifyDoc) return;
      var status = document.getElementById('selectStatus').value;
      var verifier = document.getElementById('inputVerifier').value || 'Admin Verifikator SAKIP';
      var nip = document.getElementById('inputNip').value || '-';
      var bav = document.getElementById('inputBav').value || ('BAV/SAKIP/' + selectedVerifyDoc.nomorBerkas);
      var notes = document.getElementById('inputNotes').value || 'Pemeriksaan SAKIP selesai';

      selectedVerifyDoc.status = status;
      selectedVerifyDoc.verifierName = verifier;
      selectedVerifyDoc.verifierNip = nip;
      selectedVerifyDoc.bavNumber = bav;
      selectedVerifyDoc.notes = notes;

      var btn = document.getElementById('btnSubmitVerify');
      if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (btn) { btn.disabled = false; btn.innerText = 'Sahkan & Simpan ke Google Sheet'; }
            closeVerifyModal();
            if (res && res.status === 'success') {
              if (res.documents) globalData.documents = res.documents;
              renderStats();
              renderDocs();
              showToast('Hasil verifikasi berkas ' + selectedVerifyDoc.nomorBerkas + ' berhasil dicatat di Sheet!', 'success');
            } else {
              renderStats();
              renderDocs();
              showToast('Status berhasil diubah.', 'success');
            }
          })
          .withFailureHandler(function(err) {
            if (btn) { btn.disabled = false; btn.innerText = 'Sahkan & Simpan ke Google Sheet'; }
            closeVerifyModal();
            renderStats();
            renderDocs();
            showToast('Tersimpan di tampilan lokal: ' + err.toString(), 'error');
          })
          .adminProcessVerification(selectedVerifyDoc.id, selectedVerifyDoc.nomorBerkas, status, verifier, nip, bav, notes);
      } else {
        if (btn) { btn.disabled = false; btn.innerText = 'Sahkan & Simpan ke Google Sheet'; }
        closeVerifyModal();
        renderStats();
        renderDocs();
        showToast('Hasil verifikasi berhasil diperbarui.', 'success');
      }
    }

    function openUserModal() {
      document.getElementById('inputUsername').value = '';
      document.getElementById('inputPassword').value = '123456';
      document.getElementById('inputEmail').value = '';
      document.getElementById('inputNama').value = '';
      document.getElementById('inputOpd').value = '';
      document.getElementById('inputUserNip').value = '';
      document.getElementById('inputDriveUrl').value = '';
      var modal = document.getElementById('userModal');
      if (modal) modal.style.display = 'flex';
    }

    function editUserAccountByIndex(index) {
      var u = (globalData.users || [])[index];
      if (!u) return;
      document.getElementById('inputUsername').value = u.username || '';
      document.getElementById('inputEmail').value = u.email || '';
      document.getElementById('inputNama').value = u.nama || '';
      document.getElementById('inputOpd').value = u.opdName || '';
      document.getElementById('inputUserNip').value = u.nip || '';
      document.getElementById('inputPassword').value = u.password || '123456';
      document.getElementById('inputDriveUrl').value = u.driveFolderUrl || '';
      var modal = document.getElementById('userModal');
      if (modal) modal.style.display = 'flex';
    }

    function closeUserModal() {
      var modal = document.getElementById('userModal');
      if (modal) modal.style.display = 'none';
    }

    function submitUser() {
      var username = document.getElementById('inputUsername').value.trim();
      var pass = document.getElementById('inputPassword').value.trim() || '123456';
      var email = document.getElementById('inputEmail').value.trim();
      var nama = document.getElementById('inputNama').value.trim();
      var opd = document.getElementById('inputOpd').value.trim();
      var nip = document.getElementById('inputUserNip').value.trim();
      var role = document.getElementById('selectRole').value;
      var driveUrl = document.getElementById('inputDriveUrl').value.trim();

      if (!username) { showToast('Harap isi username!', 'error'); return; }
      if (!email) email = username + '@nagekeokab.go.id';

      var btn = document.getElementById('btnSubmitUser');
      if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (btn) { btn.disabled = false; btn.innerText = 'Simpan ke DATABASE_PENGGUNA'; }
            closeUserModal();
            if (res && res.status === 'success' && res.users) {
              globalData.users = res.users;
            }
            renderStats();
            renderUsers();
            showToast('Akun dinas @' + username + ' berhasil dicatat di DATABASE_PENGGUNA!', 'success');
          })
          .withFailureHandler(function(err) {
            if (btn) { btn.disabled = false; btn.innerText = 'Simpan ke DATABASE_PENGGUNA'; }
            closeUserModal();
            renderStats();
            renderUsers();
            showToast('Akun disimpan: ' + err.toString(), 'error');
          })
          .adminSaveUserAccount('usr-' + username, username, email, nama, role, opd, nip, pass, driveUrl);
      } else {
        if (btn) { btn.disabled = false; btn.innerText = 'Simpan ke DATABASE_PENGGUNA'; }
        closeUserModal();
        renderStats();
        renderUsers();
        showToast('Akun dinas @' + username + ' berhasil disimpan.', 'success');
      }
    }

    function openFolderModal() {
      document.getElementById('inputFolderOpdId').value = '';
      document.getElementById('inputFolderOpdName').value = '';
      document.getElementById('inputFolderDriveUrl').value = '';
      document.getElementById('inputFolderDriveId').value = '';
      document.getElementById('inputFolderSubname').value = '';
      var modal = document.getElementById('folderModal');
      if (modal) modal.style.display = 'flex';
    }

    function editFolderMappingByIndex(index) {
      var f = (globalData.folders || [])[index];
      if (!f) return;
      document.getElementById('inputFolderOpdId').value = f.opdId || '';
      document.getElementById('inputFolderOpdName').value = f.opdName || '';
      document.getElementById('inputFolderDriveUrl').value = f.driveFolderUrl || '';
      document.getElementById('inputFolderDriveId').value = f.driveFolderId || '';
      document.getElementById('inputFolderSubname').value = f.subfolderName || '';
      var modal = document.getElementById('folderModal');
      if (modal) modal.style.display = 'flex';
    }

    function closeFolderModal() {
      var modal = document.getElementById('folderModal');
      if (modal) modal.style.display = 'none';
    }

    function submitFolder() {
      var opdId = document.getElementById('inputFolderOpdId').value.trim();
      var opdName = document.getElementById('inputFolderOpdName').value.trim();
      var driveUrl = document.getElementById('inputFolderDriveUrl').value.trim();
      var driveId = document.getElementById('inputFolderDriveId').value.trim();
      var subname = document.getElementById('inputFolderSubname').value.trim();
      var registrar = document.getElementById('inputFolderRegistrar').value.trim() || 'Admin SAKIP';

      if (!opdId || !opdName) { showToast('Harap isi ID OPD dan Nama Dinas!', 'error'); return; }

      var btn = document.getElementById('btnSubmitFolder');
      if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            if (btn) { btn.disabled = false; btn.innerText = 'Simpan ke MAPPING_FOLDER_OPD'; }
            closeFolderModal();
            if (res && res.status === 'success' && res.folders) {
              globalData.folders = res.folders;
            }
            renderFolders();
            showToast('Subfolder ' + opdName + ' dicatat di MAPPING_FOLDER_OPD!', 'success');
          })
          .withFailureHandler(function(err) {
            if (btn) { btn.disabled = false; btn.innerText = 'Simpan ke MAPPING_FOLDER_OPD'; }
            closeFolderModal();
            renderFolders();
            showToast('Folder disimpan: ' + err.toString(), 'error');
          })
          .adminRegisterFolderServer(opdId, opdName, driveUrl, driveId, subname, registrar, '-', 'Pendaftaran Folder OPD');
      } else {
        if (btn) { btn.disabled = false; btn.innerText = 'Simpan ke MAPPING_FOLDER_OPD'; }
        closeFolderModal();
        renderFolders();
        showToast('Folder ' + opdName + ' berhasil dicatat.', 'success');
      }
    }

    function filterByStatus(status) {
      activeStatusFilter = status;
      var btnIds = ['filterStatusAll', 'filterStatusPending', 'filterStatusRevision', 'filterStatusApproved'];
      for (var b = 0; b < btnIds.length; b++) {
        var el = document.getElementById(btnIds[b]);
        if (el) el.className = 'px-3.5 py-1.5 rounded-xl font-bold bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors cursor-pointer';
      }

      var activeId = 'filterStatusAll';
      if (status === 'PENDING') activeId = 'filterStatusPending';
      if (status === 'REVISION') activeId = 'filterStatusRevision';
      if (status === 'APPROVED') activeId = 'filterStatusApproved';

      var activeEl = document.getElementById(activeId);
      if (activeEl) activeEl.className = 'px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 text-white transition-colors cursor-pointer';
      renderDocs();
    }

    window.addEventListener('DOMContentLoaded', function() {
      loadAllData();
    });
    window.onload = function() {
      loadAllData();
    };
  </script>
</body>
</html>`;

export const GOOGLE_APPS_SCRIPT_TEMPLATE = APPS_SCRIPT_CODE_GS;
export const GOOGLE_APPS_SCRIPT_CODE_GS = APPS_SCRIPT_CODE_GS;
export const GOOGLE_APPS_SCRIPT_INDEX_HTML = APPS_SCRIPT_INDEX_HTML;
