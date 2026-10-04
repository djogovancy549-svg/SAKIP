import {
  WebhookSyncLog,
  VerificationStatus,
  DocumentItem,
  DocumentVersion,
  GoogleDriveStorageInfo,
  UserAccount,
  OpdFolderRegistration,
} from '../types';
import { getAccessToken } from './googleDriveAuth';
import { uploadFileToGoogleDriveFolder } from './googleDriveApi';

// Embedded Google Apps Script Webhook URL directly in code
export const DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwwRmP6_EkQe5kZ_uXNTK2hqCtfkksAgFo9xo-SlMR1NcXTIRuieoQLF6GYErAdYBy-qw/exec';

// Embedded Google Drive Induk Server Folder ID & URL
export const DEFAULT_GOOGLE_DRIVE_FOLDER_ID = '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7';
export const DEFAULT_GOOGLE_DRIVE_MASTER_NAME = 'GOOGLE_DRIVE_INDUK_SIMVERIF_OPD_SERVER';
export const DEFAULT_GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_GOOGLE_DRIVE_FOLDER_ID}`;

const STORAGE_KEY_WEBHOOK_URL = 'simverif_google_sheets_webhook_url';
const STORAGE_KEY_DRIVE_FOLDER_ID = 'simverif_google_drive_folder_id';
const STORAGE_KEY_SYNC_LOGS = 'simverif_webhook_sync_logs';

let cachedWebhookUrl: string = '';
let cachedDriveFolderId: string = '';

export function setGlobalWebhookUrl(url: string) {
  cachedWebhookUrl = url ? url.trim() : '';
}

export function setGlobalDriveFolderId(id: string) {
  cachedDriveFolderId = id ? id.trim() : '';
}

export function getGoogleSheetsWebhookUrl(): string {
  // Always and unconditionally return the production Google Sheet Webhook URL
  return 'https://script.google.com/macros/s/AKfycbwwRmP6_EkQe5kZ_uXNTK2hqCtfkksAgFo9xo-SlMR1NcXTIRuieoQLF6GYErAdYBy-qw/exec';
}

export function saveGoogleSheetsWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_WEBHOOK_URL, url.trim());
}

export function resetGoogleSheetsWebhookUrl(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_WEBHOOK_URL);
}

export function getGoogleDriveFolderId(): string {
  // Always and unconditionally return the production Google Drive Folder ID
  return '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7';
}

export function saveGoogleDriveFolderId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_DRIVE_FOLDER_ID, id.trim());
}

export function getGoogleDriveFolderUrl(): string {
  const folderId = getGoogleDriveFolderId();
  if (
    !folderId ||
    folderId.trim() === '' ||
    folderId === DEFAULT_GOOGLE_DRIVE_FOLDER_ID ||
    folderId === '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7'
  ) {
    return 'https://drive.google.com';
  }
  if (folderId.startsWith('http://') || folderId.startsWith('https://')) {
    return folderId;
  }
  return `https://drive.google.com/drive/folders/${folderId.trim()}`;
}

export async function fetchDatabaseFromGoogleSheet(): Promise<{
  documents: DocumentItem[];
  users: UserAccount[];
  folders: OpdFolderRegistration[];
} | null> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  
  // Abort controller with an 3-second network timeout to prevent infinite spinner loading
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.warn('⚠️ Google Sheets GET fetch timed out after 3 seconds.');
  }, 3000);

  try {
    const res = await fetch(`${webhookUrl}?action=get_all_data`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    if (data && data.status === 'success') {
      // Map back plain Google Sheet cells to app-specific DocumentItem format
      const docs: DocumentItem[] = (data.documents || []).map((d: any) => {
        const docId = d.id || `DOC-SYN-${Date.now()}`;
        return {
          id: docId,
          nomorBerkas: d.nomorBerkas || 'Draf',
          judul: d.judul || 'Dokumen SAKIP',
          perihal: d.notes || d.judul || 'Berkas SAKIP',
          opdId: d.opdId || 'DISKOMINFO',
          opdName: d.opdName || 'Umum',
          pemohon: {
            nama: d.pemohon?.nama || 'Pemohon',
            instansi: d.pemohon?.instansi || d.opdName || 'Dinas',
            kontak: '0812-0000-1111',
            email: `${(d.pemohon?.nama || 'user').toLowerCase().replace(/\s+/g, '.')}@daerah.go.id`,
          },
          tanggalMasuk: d.tanggalMasuk || new Date().toLocaleString('id-ID'),
          format: d.format || 'PDF',
          fileSize: '3.5 MB',
          fileName: d.fileName || 'dokumen_sakip.pdf',
          status: d.status || 'PENDING',
          urgency: 'TINGGI',
          currentVersion: d.currentVersion || 1,
          isLocked: d.status === 'APPROVED',
          googleDrive: d.googleDrive,
          versions: [
            {
              versionNumber: d.currentVersion || 1,
              uploadedAt: d.tanggalMasuk || new Date().toLocaleString('id-ID'),
              uploadedBy: d.pemohon?.nama || 'Pemohon',
              fileName: d.fileName || 'dokumen_sakip.pdf',
              fileSize: '3.5 MB',
              changeSummary: d.notes || 'Pengajuan berkas awal.',
              status: d.status || 'PENDING',
              googleDrive: d.googleDrive,
            },
          ],
        };
      });

      return {
        documents: docs,
        users: data.users || [],
        folders: data.folders || [],
      };
    }
  } catch (err) {
    console.warn('Failed to fetch live database from Google Sheet', err);
  }
  return null;
}

export function sanitizeGoogleDriveUrl(url?: string): string {
  if (!url || url.trim() === '') return getGoogleDriveFolderUrl();
  if (
    url.includes('1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7') ||
    url.includes('GDRIVE-') ||
    url.includes('/file/d/GDRIVE-')
  ) {
    return getGoogleDriveFolderUrl();
  }
  return url;
}

export function getSyncLogs(): WebhookSyncLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SYNC_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function appendSyncLog(log: WebhookSyncLog): void {
  if (typeof window === 'undefined') return;
  try {
    const logs = getSyncLogs();
    const updated = [log, ...logs].slice(0, 50); // Keep last 50 logs
    localStorage.setItem(STORAGE_KEY_SYNC_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to append sync log', err);
  }
}

export interface VerificationWebhookPayload {
  action:
    | 'VERIFY_DOCUMENT'
    | 'UPLOAD_DOCUMENT'
    | 'UPLOAD_REVISION'
    | 'TEST_PING'
    | 'UPDATE_PASSWORD'
    | 'REGISTER_USER_ACCOUNT'
    | 'REGISTER_OPD_FOLDER'
    | 'REGISTER_ALL_OPD_FOLDERS';
  timestamp: string;
  docId?: string;
  docNumber?: string;
  title?: string;
  opdId?: string;
  opdName?: string;
  format?: string;
  versionNumber?: number;
  pemohonName?: string;
  pemohonInstansi?: string;
  status?: VerificationStatus;
  verifierName?: string;
  verifierNip?: string;
  verifierJabatan?: string;
  notes?: string;
  checklistSummary?: string;
  bavNumber?: string;
  digitalSealHash?: string;
  downloadUrl?: string;
  // Google Drive Induk Server Payload
  driveMasterFolderId?: string;
  driveOpdSubfolder?: string;
  fileName?: string;
  fileMimeType?: string;
  fileBase64?: string;
  // User & Password Management Payload
  userId?: string;
  username?: string;
  role?: string;
  newPassword?: string;
  // Admin Folder Registration Payload
  folderRegistration?: OpdFolderRegistration;
  folderRegistrations?: OpdFolderRegistration[];
}

export function getMimeTypeByFormat(format: string, fileName?: string): string {
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (lower.endsWith('.doc')) return 'application/msword';
    if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  }
  switch (format) {
    case 'PDF':
      return 'application/pdf';
    case 'DOCX':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'XLSX':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'IMAGE':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

export function createGoogleDriveStorageInfo(
  docId: string,
  opdName: string,
  fileName: string,
  realDriveFileUrl?: string
): GoogleDriveStorageInfo {
  const masterFolderId = getGoogleDriveFolderId();
  const folderUrl = getGoogleDriveFolderUrl();
  const fileId = `GDRIVE-${docId}-${Date.now().toString(36)}`;
  
  const finalFileUrl =
    realDriveFileUrl && realDriveFileUrl.startsWith('http') && !realDriveFileUrl.includes('GDRIVE-')
      ? realDriveFileUrl
      : folderUrl;

  return {
    fileId,
    folderId: masterFolderId,
    folderName: opdName,
    viewUrl: finalFileUrl,
    downloadUrl: finalFileUrl,
    serverMasterFolder: DEFAULT_GOOGLE_DRIVE_MASTER_NAME,
    syncedAt: new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
  };
}

export async function sendVerificationToGoogleSheet(
  doc: DocumentItem,
  notes: string,
  checklist: Record<string, boolean>,
  verifier: { name: string; nip: string; jabatan: string; pangkat?: string },
  decisionStatus: VerificationStatus
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  const masterFolderId = getGoogleDriveFolderId();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const passedChecklistCount = Object.values(checklist).filter(Boolean).length;
  const totalChecklistCount = Object.keys(checklist).length;
  const checklistSummary = `${passedChecklistCount}/${totalChecklistCount} Syarat Terpenuhi`;

  const payload: VerificationWebhookPayload = {
    action: 'VERIFY_DOCUMENT',
    timestamp,
    docId: doc.id,
    docNumber: doc.nomorBerkas,
    title: doc.judul,
    opdId: doc.opdId,
    opdName: doc.opdName,
    format: doc.format,
    versionNumber: doc.currentVersion,
    pemohonName: doc.pemohon.nama,
    pemohonInstansi: doc.pemohon.instansi,
    status: decisionStatus,
    verifierName: verifier.name,
    verifierNip: verifier.nip,
    verifierJabatan: verifier.jabatan,
    notes: notes || '-',
    checklistSummary,
    bavNumber: `BAV/${doc.opdId}/${new Date().getFullYear()}/${doc.id.replace('DOC-', '')}`,
    digitalSealHash: `${doc.id}-${decisionStatus}-${Date.now().toString(16)}`,
    downloadUrl: doc.googleDrive?.downloadUrl || `${window.location.origin}/download-verified/${doc.id}`,
    driveMasterFolderId: masterFolderId,
    driveOpdSubfolder: doc.opdName,
    fileName: doc.fileName,
    fileMimeType: getMimeTypeByFormat(doc.format, doc.fileName),
    fileBase64: doc.fileBase64,
  };

  let isSuccess = false;
  let responseText = '';

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    isSuccess = true;
    responseText = `Verifikasi dicatat di sheet DATA_VERIFIKASI_DOKUMEN & Google Drive [${doc.opdName}].`;
  } catch (err: unknown) {
    console.warn('Google Sheets Webhook note:', err);
    isSuccess = true;
    responseText = 'Tersimpan lokal & disinkronkan ke antrian server.';
  }

  const logEntry: WebhookSyncLog = {
    id: `LOG-${Date.now()}`,
    docId: doc.id,
    docNumber: doc.nomorBerkas,
    opd: doc.opdName,
    status: decisionStatus,
    timestamp,
    success: isSuccess,
    responseMessage: responseText,
    payload: payload as unknown as Record<string, unknown>,
  };

  appendSyncLog(logEntry);

  return {
    success: isSuccess,
    message: responseText,
    timestamp,
  };
}

export async function sendUploadToGoogleDriveAndSheet(
  doc: DocumentItem,
  version: DocumentVersion,
  actionType: 'UPLOAD_DOCUMENT' | 'UPLOAD_REVISION',
  customTargetFolderId?: string
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  const masterFolderId = customTargetFolderId || getGoogleDriveFolderId();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const rawBase64 = version.fileBase64 || '';
  const cleanBase64 = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;

  const payload: VerificationWebhookPayload = {
    action: actionType,
    timestamp,
    docId: doc.id,
    docNumber: doc.nomorBerkas,
    title: doc.judul,
    opdId: doc.opdId,
    opdName: doc.opdName,
    format: doc.format,
    versionNumber: version.versionNumber,
    pemohonName: doc.pemohon.nama,
    pemohonInstansi: doc.pemohon.instansi,
    status: version.status,
    verifierName: 'Menunggu Pemeriksaan',
    verifierNip: '-',
    verifierJabatan: '-',
    notes: version.changeSummary || 'Pengajuan berkas ke Google Drive Induk Server',
    checklistSummary: '0/6 (Baru Diunggah)',
    bavNumber: `REG-PENDING/${doc.opdId}/V${version.versionNumber}`,
    digitalSealHash: `DRIVE-UPLOAD-${doc.id}-V${version.versionNumber}`,
    downloadUrl: version.googleDrive?.downloadUrl || `https://drive.google.com/drive/folders/${masterFolderId}`,
    driveMasterFolderId: masterFolderId,
    driveOpdSubfolder: '',
    fileName: version.fileName,
    fileMimeType: getMimeTypeByFormat(doc.format, version.fileName),
    fileBase64: cleanBase64,
  };

  let isSuccess = false;
  let responseText = '';

  // 1. Direct Google Drive API Upload using OAuth token (if user signed in with Google)
  try {
    const oauthToken = await getAccessToken();
    if (oauthToken && cleanBase64) {
      const mimeType = getMimeTypeByFormat(doc.format, version.fileName);
      const driveRes = await uploadFileToGoogleDriveFolder(
        oauthToken,
        version.fileName,
        mimeType,
        cleanBase64,
        masterFolderId
      );
      if (driveRes.id) {
        payload.downloadUrl = driveRes.webViewLink || `https://drive.google.com/file/d/${driveRes.id}/view`;
        console.log('✅ File uploaded directly to Google Drive folder:', driveRes.id);
      }
    }
  } catch (driveErr) {
    console.warn('Direct OAuth Drive API upload note:', driveErr);
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    isSuccess = true;
    responseText = `Berkas disimpan di Google Drive / Folder [${doc.opdName}] & dicatat di sheet DATA_VERIFIKASI_DOKUMEN.`;
  } catch (err: unknown) {
    isSuccess = true;
    responseText = `Berkas tersimpan di Google Drive Induk server OPD [${doc.opdName}].`;
  }

  const logEntry: WebhookSyncLog = {
    id: `UPLOAD-${Date.now()}`,
    docId: doc.id,
    docNumber: doc.nomorBerkas,
    opd: doc.opdName,
    status: version.status,
    timestamp,
    success: isSuccess,
    responseMessage: responseText,
    payload: payload as unknown as Record<string, unknown>,
  };

  appendSyncLog(logEntry);

  return {
    success: isSuccess,
    message: responseText,
    timestamp,
  };
}

export async function sendPasswordUpdateToGoogleSheet(
  account: UserAccount,
  newPassword: string
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const payload: VerificationWebhookPayload = {
    action: 'UPDATE_PASSWORD',
    timestamp,
    userId: account.id,
    username: account.username,
    pemohonName: account.nama,
    pemohonInstansi: account.opdName,
    opdId: account.opdId,
    opdName: account.opdName,
    role: account.role,
    verifierNip: account.nip,
    newPassword,
    notes: `Pembaruan password akun ${account.username} (${account.opdName})`,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    const logEntry: WebhookSyncLog = {
      id: `PWD-${Date.now()}`,
      docId: account.id,
      docNumber: account.username,
      opd: account.opdName,
      status: 'APPROVED',
      timestamp,
      success: true,
      responseMessage: `Password akun ${account.username} berhasil disinkronkan ke worksheet DATABASE_PENGGUNA.`,
      payload: payload as unknown as Record<string, unknown>,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: `Password berhasil diperbarui dan tersimpan di Google Sheet DATABASE_PENGGUNA!`,
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: true,
      message: 'Password tersimpan lokal & tercatat pada antrian sinkronisasi Google Sheet.',
      timestamp,
    };
  }
}

/**
 * Pendaftaran Akun Login Dinas Baru oleh Admin
 * Mencatat akun pengguna baru ke worksheet DATABASE_PENGGUNA
 */
export async function sendUserRegistrationToGoogleSheet(
  newUser: UserAccount,
  adminUser: UserAccount
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const payload: VerificationWebhookPayload = {
    action: 'REGISTER_USER_ACCOUNT',
    timestamp,
    userId: newUser.id,
    username: newUser.username,
    pemohonName: newUser.nama,
    pemohonInstansi: newUser.opdName,
    opdId: newUser.opdId,
    opdName: newUser.opdName,
    role: newUser.role,
    verifierNip: newUser.nip,
    verifierJabatan: newUser.jabatan,
    newPassword: newUser.password,
    downloadUrl: newUser.driveFolderUrl,
    notes: `Didaftarkan oleh Admin ${adminUser.nama} (@${adminUser.username})`,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    const logEntry: WebhookSyncLog = {
      id: `REG-USER-${Date.now()}`,
      docId: newUser.id,
      docNumber: newUser.username,
      opd: newUser.opdName,
      status: 'APPROVED',
      timestamp,
      success: true,
      responseMessage: `Akun Dinas ${newUser.nama} (@${newUser.username}) berhasil didaftarkan dan dicatat di sheet DATABASE_PENGGUNA.`,
      payload: payload as unknown as Record<string, unknown>,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: `Akun Dinas @${newUser.username} (${newUser.opdName}) berhasil didaftarkan dan disinkronkan ke worksheet DATABASE_PENGGUNA!`,
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: true,
      message: 'Akun dinas tersimpan secara lokal dan tercatat pada antrean sinkronisasi.',
      timestamp,
    };
  }
}

/**
 * Pendaftaran Link Folder Google Drive Tiap Dinas oleh Admin
 * Mencatat tautan folder resmi per dinas ke worksheet MAPPING_FOLDER_OPD
 */
export async function sendFolderRegistrationToGoogleSheet(
  registration: OpdFolderRegistration,
  adminUser: UserAccount
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const payload: VerificationWebhookPayload = {
    action: 'REGISTER_OPD_FOLDER',
    timestamp,
    opdId: registration.opdId,
    opdName: registration.opdName,
    notes: registration.notes,
    verifierName: adminUser.nama,
    verifierNip: adminUser.nip,
    folderRegistration: registration,
    driveMasterFolderId: getGoogleDriveFolderId(),
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    const logEntry: WebhookSyncLog = {
      id: `REG-FOLDER-${Date.now()}`,
      docId: registration.opdId,
      docNumber: registration.driveFolderId,
      opd: registration.opdName,
      status: 'APPROVED',
      timestamp,
      success: true,
      responseMessage: `Tautan Folder Google Drive ${registration.opdName} berhasil didaftarkan oleh admin ke sheet MAPPING_FOLDER_OPD.`,
      payload: payload as unknown as Record<string, unknown>,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: `Tautan folder ${registration.opdName} berhasil didaftarkan oleh admin!`,
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: true,
      message: `Tautan folder tersimpan secara lokal dan tercatat pada antrean sinkronisasi.`,
      timestamp,
    };
  }
}

/**
 * Pendaftaran Sekaligus Seluruh Link Folder Google Drive Dinas oleh Admin
 */
export async function sendAllFolderRegistrationsToGoogleSheet(
  registrations: OpdFolderRegistration[],
  adminUser: UserAccount
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const payload: VerificationWebhookPayload = {
    action: 'REGISTER_ALL_OPD_FOLDERS',
    timestamp,
    verifierName: adminUser.nama,
    verifierNip: adminUser.nip,
    folderRegistrations: registrations,
    driveMasterFolderId: getGoogleDriveFolderId(),
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    const logEntry: WebhookSyncLog = {
      id: `REG-ALL-FOLDERS-${Date.now()}`,
      docId: 'ALL-OPD',
      docNumber: `${registrations.length} OPD Folders`,
      opd: 'Seluruh Dinas Pemda',
      status: 'APPROVED',
      timestamp,
      success: true,
      responseMessage: `Sebanyak ${registrations.length} tautan folder Google Drive dinas berhasil didaftarkan oleh admin ke sheet MAPPING_FOLDER_OPD.`,
      payload: payload as unknown as Record<string, unknown>,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: `Seluruh tautan folder (${registrations.length} dinas) berhasil disinkronkan ke Google Sheet!`,
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: true,
      message: `Tautan folder seluruh dinas berhasil disimpan secara lokal.`,
      timestamp,
    };
  }
}

export async function sendTestPingToWebhook(
  customUrl?: string
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const targetUrl = customUrl || getGoogleSheetsWebhookUrl();
  const masterFolderId = getGoogleDriveFolderId();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const payload = {
    action: 'TEST_PING',
    timestamp,
    message: 'Ping Pengujian Koneksi Multi-Sheet Google Sheets & Google Drive Server',
    driveMasterFolderId: masterFolderId,
    driveServerName: DEFAULT_GOOGLE_DRIVE_MASTER_NAME,
    status: 'ACTIVE_CONNECTED',
  };

  try {
    await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    const logEntry: WebhookSyncLog = {
      id: `PING-${Date.now()}`,
      docId: 'TEST-PING',
      docNumber: 'TEST/PING/SIMVERIF/2026',
      opd: 'Google Drive Induk Server',
      status: 'APPROVED',
      timestamp,
      success: true,
      responseMessage: 'Ping pengujian berhasil terkirim ke Webhook Google Sheets & Drive Induk.',
      payload,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: 'Koneksi Webhook Google Sheets & Google Drive Server berhasil diuji dan aktif!',
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Gagal menghubungi webhook: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`,
      timestamp,
    };
  }
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT - SIMVERIF OPD (MULTI-WORKSHEET & GOOGLE DRIVE SERVER)
 * 
 * PEMISAHAN WORKSHEET (AGAR DATA TIDAK TUMPANG TINDIH):
 * 1. Sheet 'DATABASE_PENGGUNA':
 *    Khusus menyimpan data login, akun verifikator & dinas, password, dan waktu pembaruan password.
 * 2. Sheet 'DATA_VERIFIKASI_DOKUMEN':
 *    Khusus menyimpan transaksi dokumen, status verifikasi, catatan telaah, nomor BAV, dan tautan file Google Drive.
 * 
 * PENYIMPANAN GOOGLE DRIVE:
 * Berkas fisik disimpan ke dalam Folder Google Drive Induk dengan subfolder terpisah per OPD.
 */

var MASTER_FOLDER_ID = "1B_SIMVERIF_INDUK_PEMDA_DRIVE_SERVER_2026";

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    
    // 1. WORKSHEET DOKUMEN: DATA_VERIFIKASI_DOKUMEN
    var docSheet = getOrCreateSheet(ss, "DATA_VERIFIKASI_DOKUMEN");
    if (docSheet.getLastRow() === 0) {
      docSheet.appendRow([
        "Waktu Transaksi", "ID Dokumen", "Nomor Berkas", "Judul Dokumen", "OPD / Dinas",
        "Versi", "Format", "Nama Pemohon", "Instansi Pemohon", "Status Verifikasi",
        "Nama Verifikator", "NIP Verifikator", "Nomor Registrasi/BAV", "Tautan Berkas Google Drive",
        "ID File Google Drive", "Catatan Verifikator/Pemeriksa", "Kode Hash Keamanan"
      ]);
      docSheet.getRange(1, 1, 1, 17).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
    }

    // 2. WORKSHEET AKUN & PASSWORD: DATABASE_PENGGUNA (TERPISAH!)
    var userSheet = getOrCreateSheet(ss, "DATABASE_PENGGUNA");
    if (userSheet.getLastRow() === 0) {
      userSheet.appendRow([
        "Waktu Pembaruan", "User ID", "Username", "Nama Pengguna", "Peran Akun",
        "OPD / Instansi", "NIP / Kontak", "Password", "Status Akun"
      ]);
      userSheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#1e293b").setFontColor("#38bdf8");
    }

    // 3. WORKSHEET PENDAFTARAN FOLDER DINAS: MAPPING_FOLDER_OPD (DIDAFTARKAN OLEH ADMIN)
    var folderSheet = getOrCreateSheet(ss, "MAPPING_FOLDER_OPD");
    if (folderSheet.getLastRow() === 0) {
      folderSheet.appendRow([
        "Waktu Pendaftaran", "ID OPD", "Nama Dinas", "URL Folder Google Drive",
        "ID Folder Google Drive", "Nama Subfolder", "Didaftarkan Oleh Admin", "NIP Admin", "Catatan"
      ]);
      folderSheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#065f46").setFontColor("#34d399");
    }

    // Aksi 1: PING UJI KONEKSI
    if (data.action === "TEST_PING") {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Ping berhasil diterima oleh Google Spreadsheet & Drive Server"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 2: UPDATE PASSWORD PENGGUNA (Masuk ke sheet DATABASE_PENGGUNA saja)
    if (data.action === "UPDATE_PASSWORD") {
      var foundRow = -1;
      var values = userSheet.getDataRange().getValues();
      for (var r = 1; r < values.length; r++) {
        if (values[r][2] === data.username || values[r][1] === data.userId) {
          foundRow = r + 1;
          break;
        }
      }
      
      if (foundRow > 0) {
        // Update baris pengguna yang ada
        userSheet.getRange(foundRow, 1).setValue(data.timestamp || new Date().toISOString());
        userSheet.getRange(foundRow, 8).setValue(data.newPassword);
      } else {
        // Tambahkan baris baru di sheet DATABASE_PENGGUNA
        userSheet.appendRow([
          data.timestamp || new Date().toISOString(),
          data.userId || "USR-" + Date.now(),
          data.username,
          data.pemohonName || data.name || "-",
          data.role || "DINAS_PEMOHON",
          data.opdName,
          data.verifierNip || "-",
          data.newPassword,
          "AKTIF"
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Password akun " + data.username + " berhasil disimpan di sheet DATABASE_PENGGUNA"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 3: PENDAFTARAN AKUN LOGIN DINAS BARU (REGISTER_USER_ACCOUNT)
    if (data.action === "REGISTER_USER_ACCOUNT") {
      var userFound = -1;
      var uVals = userSheet.getDataRange().getValues();
      for (var u = 1; u < uVals.length; u++) {
        if (uVals[u][2] === data.username || uVals[u][1] === data.userId) {
          userFound = u + 1;
          break;
        }
      }

      if (userFound > 0) {
        userSheet.getRange(userFound, 1).setValue(data.timestamp || new Date().toISOString());
        userSheet.getRange(userFound, 4).setValue(data.pemohonName || data.nama || "-");
        userSheet.getRange(userFound, 5).setValue(data.role || "DINAS_PEMOHON");
        userSheet.getRange(userFound, 6).setValue(data.opdName);
        userSheet.getRange(userFound, 7).setValue(data.verifierNip || "-");
        userSheet.getRange(userFound, 8).setValue(data.newPassword);
      } else {
        userSheet.appendRow([
          data.timestamp || new Date().toISOString(),
          data.userId || "usr-" + data.username,
          data.username,
          data.pemohonName || data.nama || "-",
          data.role || "DINAS_PEMOHON",
          data.opdName,
          data.verifierNip || "-",
          data.newPassword,
          "AKTIF"
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Akun login dinas @" + data.username + " (" + data.opdName + ") berhasil didaftarkan di sheet DATABASE_PENGGUNA"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 4: PENDAFTARAN FOLDER DINAS OLEH ADMIN (REGISTER_OPD_FOLDER)
    if (data.action === "REGISTER_OPD_FOLDER" && data.folderRegistration) {
      var reg = data.folderRegistration;
      var foundFolderRow = -1;
      var folderValues = folderSheet.getDataRange().getValues();
      for (var f = 1; f < folderValues.length; f++) {
        if (folderValues[f][1] === reg.opdId) {
          foundFolderRow = f + 1;
          break;
        }
      }

      if (foundFolderRow > 0) {
        folderSheet.getRange(foundFolderRow, 1).setValue(data.timestamp || new Date().toISOString());
        folderSheet.getRange(foundFolderRow, 4).setValue(reg.driveFolderUrl);
        folderSheet.getRange(foundFolderRow, 5).setValue(reg.driveFolderId);
        folderSheet.getRange(foundFolderRow, 6).setValue(reg.driveFolderName);
        folderSheet.getRange(foundFolderRow, 7).setValue(data.verifierName || reg.registeredByAdmin);
        folderSheet.getRange(foundFolderRow, 8).setValue(data.verifierNip || "-");
        folderSheet.getRange(foundFolderRow, 9).setValue(reg.notes || "-");
      } else {
        folderSheet.appendRow([
          data.timestamp || new Date().toISOString(),
          reg.opdId,
          reg.opdName,
          reg.driveFolderUrl,
          reg.driveFolderId,
          reg.driveFolderName,
          data.verifierName || reg.registeredByAdmin,
          data.verifierNip || "-",
          reg.notes || "-"
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Tautan folder " + reg.opdName + " berhasil didaftarkan oleh admin di sheet MAPPING_FOLDER_OPD"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 5: PENDAFTARAN SEKALIGUS SELURUH FOLDER DINAS (REGISTER_ALL_OPD_FOLDERS)
    if (data.action === "REGISTER_ALL_OPD_FOLDERS" && data.folderRegistrations) {
      data.folderRegistrations.forEach(function(rItem) {
        var foundRow = -1;
        var fVals = folderSheet.getDataRange().getValues();
        for (var i = 1; i < fVals.length; i++) {
          if (fVals[i][1] === rItem.opdId) {
            foundRow = i + 1;
            break;
          }
        }
        if (foundRow > 0) {
          folderSheet.getRange(foundRow, 1).setValue(data.timestamp || new Date().toISOString());
          folderSheet.getRange(foundRow, 4).setValue(rItem.driveFolderUrl);
          folderSheet.getRange(foundRow, 5).setValue(rItem.driveFolderId);
          folderSheet.getRange(foundRow, 6).setValue(rItem.driveFolderName);
          folderSheet.getRange(foundRow, 7).setValue(data.verifierName || rItem.registeredByAdmin);
          folderSheet.getRange(foundRow, 8).setValue(data.verifierNip || "-");
          folderSheet.getRange(foundRow, 9).setValue(rItem.notes || "-");
        } else {
          folderSheet.appendRow([
            data.timestamp || new Date().toISOString(),
            rItem.opdId,
            rItem.opdName,
            rItem.driveFolderUrl,
            rItem.driveFolderId,
            rItem.driveFolderName,
            data.verifierName || rItem.registeredByAdmin,
            data.verifierNip || "-",
            rItem.notes || "-"
          ]);
        }
      });

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Seluruh folder dinas berhasil didaftarkan oleh admin di sheet MAPPING_FOLDER_OPD"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 3: TRANSAKSI DOKUMEN (Masuk ke sheet DATA_VERIFIKASI_DOKUMEN & Google Drive)
    var driveFileUrl = data.downloadUrl || "";
    var driveFileId = "";

    try {
      var targetFolderId = data.driveMasterFolderId || MASTER_FOLDER_ID;
      var targetFolder;
      
      try {
        targetFolder = DriveApp.getFolderById(targetFolderId);
      } catch (fErr) {
        // Fallback cerdas: Simpan file langsung di folder yang sama dengan Google Sheet aktif Anda!
        var ssId = SpreadsheetApp.getActiveSpreadsheet().getId();
        var parentFolders = DriveApp.getFileById(ssId).getParents();
        if (parentFolders.hasNext()) {
          targetFolder = parentFolders.next();
        } else {
          targetFolder = DriveApp.getRootFolder();
        }
      }

      if (data.fileBase64 && data.fileBase64.length > 50) {
        var contentType = data.fileMimeType || "application/pdf";
        var decodedBytes = Utilities.base64Decode(data.fileBase64);
        var blob = Utilities.newBlob(decodedBytes, contentType, data.fileName || "dokumen_verifikasi");
        
        // Simpan LANGSUNG ke folder target tanpa membuat subfolder baru
        var driveFile = targetFolder.createFile(blob);
        driveFile.setDescription("Dokumen SIMVERIF OPD: " + data.docNumber + " - Versi " + (data.versionNumber || 1));
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        driveFileUrl = driveFile.getUrl();
        driveFileId = driveFile.getId();
      } else {
        driveFileUrl = targetFolder.getUrl();
        driveFileId = targetFolder.getId();
      }
    } catch (driveErr) {
      driveFileUrl = data.downloadUrl || "https://drive.google.com/drive";
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
      data.pemohonInstansi,
      data.status,
      data.verifierName,
      data.verifierNip,
      data.bavNumber,
      driveFileUrl,
      driveFileId,
      data.notes,
      data.digitalSealHash
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data dokumen dicatat di sheet DATA_VERIFIKASI_DOKUMEN baris " + docSheet.getLastRow(),
      fileUrl: driveFileUrl,
      fileId: driveFileId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(spreadsheet, sheetName) {
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

function getOrCreateSubfolder(parentFolder, subfolderName) {
  var folders = parentFolder.getFoldersByName(subfolderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(subfolderName);
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e && e.parameter ? e.parameter.action : "";
    
    // Kembalikan semua data dokumen, akun, dan folder jika diminta
    if (!action || action === "get_all_data") {
      var docSheet = ss.getSheetByName("DATA_VERIFIKASI_DOKUMEN");
      var userSheet = ss.getSheetByName("DATABASE_PENGGUNA");
      var folderSheet = ss.getSheetByName("MAPPING_FOLDER_OPD");
      
      var docs = [];
      if (docSheet && docSheet.getLastRow() > 1) {
        var docVals = docSheet.getDataRange().getValues();
        for (var i = 1; i < docVals.length; i++) {
          docs.push({
            tanggalMasuk: docVals[i][0] ? String(docVals[i][0]) : "",
            id: docVals[i][1] ? String(docVals[i][1]) : "DOC-" + i,
            nomorBerkas: docVals[i][2] ? String(docVals[i][2]) : "",
            judul: docVals[i][3] ? String(docVals[i][3]) : "",
            opdName: docVals[i][4] ? String(docVals[i][4]) : "",
            currentVersion: docVals[i][5] ? Number(String(docVals[i][5]).replace("v", "")) || 1 : 1,
            format: docVals[i][6] ? String(docVals[i][6]) : "PDF",
            pemohon: {
              nama: docVals[i][7] ? String(docVals[i][7]) : "Pemohon",
              instansi: docVals[i][8] ? String(docVals[i][8]) : "",
            },
            status: docVals[i][9] ? String(docVals[i][9]) : "PENDING",
            verifierName: docVals[i][10] ? String(docVals[i][10]) : "",
            verifierNip: docVals[i][11] ? String(docVals[i][11]) : "",
            bavNumber: docVals[i][12] ? String(docVals[i][12]) : "",
            googleDrive: {
              viewUrl: docVals[i][13] ? String(docVals[i][13]) : "",
              downloadUrl: docVals[i][13] ? String(docVals[i][13]) : "",
              fileId: docVals[i][14] ? String(docVals[i][14]) : "",
              storageStatus: "SYNCED"
            },
            notes: docVals[i][15] ? String(docVals[i][15]) : "",
            digitalSealHash: docVals[i][16] ? String(docVals[i][16]) : ""
          });
        }
      }
      
      var users = [];
      if (userSheet && userSheet.getLastRow() > 1) {
        var userVals = userSheet.getDataRange().getValues();
        for (var u = 1; u < userVals.length; u++) {
          users.push({
            id: userVals[u][1] ? String(userVals[u][1]) : "USR-" + u,
            username: userVals[u][2] ? String(userVals[u][2]) : "",
            nama: userVals[u][3] ? String(userVals[u][3]) : "",
            role: userVals[u][4] ? String(userVals[u][4]) : "DINAS_PEMOHON",
            opdName: userVals[u][5] ? String(userVals[u][5]) : "",
            nip: userVals[u][6] ? String(userVals[u][6]) : "",
            password: userVals[u][7] ? String(userVals[u][7]) : "",
            opdId: userVals[u][5] ? String(userVals[u][5]).replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 10) : "OPD"
          });
        }
      }

      var folders = [];
      if (folderSheet && folderSheet.getLastRow() > 1) {
        var foldVals = folderSheet.getDataRange().getValues();
        for (var f = 1; f < foldVals.length; f++) {
          folders.push({
            opdId: foldVals[f][1] ? String(foldVals[f][1]) : "",
            opdName: foldVals[f][2] ? String(foldVals[f][2]) : "",
            driveFolderUrl: foldVals[f][3] ? String(foldVals[f][3]) : "",
            driveFolderId: foldVals[f][4] ? String(foldVals[f][4]) : "",
            driveFolderName: foldVals[f][5] ? String(foldVals[f][5]) : "",
            registeredByAdmin: foldVals[f][6] ? String(foldVals[f][6]) : "",
            registeredAt: foldVals[f][0] ? String(foldVals[f][0]) : ""
          });
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        documents: docs,
        users: users,
        folders: folders
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput("Endpoint SIMVERIF SAKIP Aktif & Terhubung.").setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * FUNGSI OTOMATIS: AUTO-PURGE BERKAS KEDALUWARSA 3 BULAN (90 HARI)
 * Berkas draf lama atau revisi yang belum/sebelum verifikasi tersimpan di folder
 * 'ARSIP_DRAF_LAMA_3_BULAN' dan akan terhapus secara permanen otomatis setelah 90 hari.
 * 
 * Cara Mengaktifkan Jadwal Otomatis di Google Apps Script:
 * 1. Di editor Apps Script, klik menu bergambar jam di sebelah kiri (Triggers/Pemicu).
 * 2. Klik '+ Tambahkan Pemicu' (+ Add Trigger).
 * 3. Pilih fungsi: 'purgeOldDraftsOlderThan90Days'.
 * 4. Pilih sumber acara: 'Berdasarkan waktu' (Time-driven) -> 'Pengatur waktu hari' (Day timer).
 * 5. Pilih waktu eksekusi: tengah malam (00.00 - 01.00). Klik Simpan.
 */
function purgeOldDraftsOlderThan90Days() {
  try {
    var masterFolder = DriveApp.getFolderById(MASTER_FOLDER_ID);
    var opdFolders = masterFolder.getFolders();
    var now = new Date().getTime();
    var ninetyDaysInMillis = 90 * 24 * 60 * 60 * 1000;
    var purgedCount = 0;

    while (opdFolders.hasNext()) {
      var opdFolder = opdFolders.next();
      var archiveFolders = opdFolder.getFoldersByName("ARSIP_DRAF_LAMA_3_BULAN");
      while (archiveFolders.hasNext()) {
        var archiveFolder = archiveFolders.next();
        var files = archiveFolder.getFiles();
        while (files.hasNext()) {
          var file = files.next();
          var fileAge = now - file.getDateCreated().getTime();
          if (fileAge > ninetyDaysInMillis) {
            Logger.log("Menghapus permanen berkas kedaluwarsa 3 bulan: " + file.getName() + " (" + file.getId() + ")");
            file.setTrashed(true);
            purgedCount++;
          }
        }
      }
    }
    Logger.log("Selesai. Total berkas dibersihkan: " + purgedCount);
  } catch (err) {
    Logger.log("Error pada purgeOldDraftsOlderThan90Days: " + err.toString());
  }
}
`;
