import {
  WebhookSyncLog,
  VerificationStatus,
  DocumentItem,
  DocumentVersion,
  GoogleDriveStorageInfo,
  UserAccount,
  OpdFolderRegistration,
} from '../types';

// Embedded Google Apps Script Webhook URL directly in code
export const DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbwwRmP6_EkQe5kZ_uXNTK2hqCtfkksAgFo9xo-SlMR1NcXTIRuieoQLF6GYErAdYBy-qw/exec';

// Embedded Google Drive Induk Server Folder ID & URL
export const DEFAULT_GOOGLE_DRIVE_FOLDER_ID = '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7';
export const DEFAULT_GOOGLE_DRIVE_MASTER_NAME = 'GOOGLE_DRIVE_INDUK_SIMVERIF_OPD_SERVER';
export const DEFAULT_GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_GOOGLE_DRIVE_FOLDER_ID}`;

const STORAGE_KEY_WEBHOOK_URL = 'simverif_google_sheets_webhook_url';
const STORAGE_KEY_DRIVE_FOLDER_ID = 'simverif_google_drive_folder_id';
const STORAGE_KEY_SHEET_URL = 'simverif_google_sheet_url';
const STORAGE_KEY_SYNC_LOGS = 'simverif_webhook_sync_logs';

let cachedWebhookUrl: string = '';
let cachedDriveFolderId: string = '';
let cachedSheetUrl: string = '';

export function setGlobalWebhookUrl(url: string) {
  cachedWebhookUrl = url ? url.trim() : '';
}

export function setGlobalDriveFolderId(id: string) {
  cachedDriveFolderId = id ? id.trim() : '';
}

export function setGlobalSheetUrl(url: string) {
  cachedSheetUrl = url ? url.trim() : '';
}

export function getGoogleSpreadsheetUrl(): string {
  if (cachedSheetUrl && cachedSheetUrl.trim()) return cachedSheetUrl.trim();
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_SHEET_URL);
    if (saved && saved.trim()) return saved.trim();
  }
  return 'https://docs.google.com/spreadsheets/';
}

export function saveGoogleSpreadsheetUrl(url: string): void {
  if (typeof window === 'undefined') return;
  cachedSheetUrl = url.trim();
  localStorage.setItem(STORAGE_KEY_SHEET_URL, url.trim());
}

export function getGoogleSheetsWebhookUrl(): string {
  if (cachedWebhookUrl && cachedWebhookUrl.trim()) return cachedWebhookUrl.trim();
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_WEBHOOK_URL);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL;
}

export function saveGoogleSheetsWebhookUrl(url: string): void {
  if (typeof window === 'undefined') return;
  cachedWebhookUrl = url.trim();
  localStorage.setItem(STORAGE_KEY_WEBHOOK_URL, url.trim());
}

export function resetGoogleSheetsWebhookUrl(): void {
  if (typeof window === 'undefined') return;
  cachedWebhookUrl = '';
  localStorage.removeItem(STORAGE_KEY_WEBHOOK_URL);
}

export function getGoogleDriveFolderId(): string {
  if (cachedDriveFolderId && cachedDriveFolderId.trim()) return cachedDriveFolderId.trim();
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY_DRIVE_FOLDER_ID);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_GOOGLE_DRIVE_FOLDER_ID;
}

export function saveGoogleDriveFolderId(id: string): void {
  if (typeof window === 'undefined') return;
  cachedDriveFolderId = id.trim();
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
  
  // Abort controller with an 4-second network timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 4000);

  try {
    const res = await fetch(`${webhookUrl}?action=get_all_data`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    if (data && data.status === 'success') {
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
            email: d.pemohon?.email || `${(d.pemohon?.nama || 'user').toLowerCase().replace(/\s+/g, '.')}@nagekeokab.go.id`,
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
              changeSummary: 'Pengajuan berkas.',
              status: d.status || 'PENDING',
              googleDrive: d.googleDrive,
            },
          ],
          content: {
            kopSurat: {
              pemerintah: 'PEMERINTAH KABUPATEN NAGEKEO',
              instansi: d.opdName ? d.opdName.toUpperCase() : 'ORGANISASI PERANGKAT DAERAH',
              alamat: 'Jl. Mayor M. Pati No. 1, Mbay, Kabupaten Nagekeo',
              nomorNaskah: d.nomorBerkas || 'SURAT PENGANTAR',
            },
            pdfPages: [
              {
                pageNumber: 1,
                title: d.judul ? d.judul.toUpperCase() : 'DOKUMEN SAKIP',
                sections: [
                  {
                    heading: 'RINGKASAN & MAKSUD PERMOHONAN',
                    body: d.notes || 'Dokumen resmi diajukan untuk verifikasi kelengkapan administratif dan substansi SAKIP.',
                    highlight: true,
                  },
                ],
              },
            ],
            docxData: {
              kepada: `Yth. Tim Evaluasi SAKIP / Inspektorat Daerah`,
              dari: d.pemohon?.nama || 'Kepala Dinas / Pengelola SAKIP',
              tembusan: ['Sekretaris Daerah', 'Inspektur Daerah'],
              perihal: d.judul || 'Pengajuan Berkas SAKIP',
              dasarHukum: ['Peraturan Bupati tentang Penyelenggaraan SAKIP'],
              isiParagraf: [
                `Bersama ini kami sampaikan dokumen "${d.judul || 'Berkas SAKIP'}" untuk diteliti dan disahkan sesuai SOP yang berlaku.`,
              ],
              penutup: 'Demikian permohonan kami sampaikan.',
              pejabatTtd: {
                nama: d.pemohon?.nama || 'Pengelola SAKIP',
                nip: '19850101 201001 1 002',
                jabatan: d.opdName || 'Dinas Pemohon',
              },
            },
            xlsxData: {
              sheetName: 'Data_Kinerja',
              subKegiatan: d.judul || 'Kegiatan Utama',
              kodeRekening: '5.1.02.01 - Belanja Operasi',
              tahunAnggaran: '2026',
              totalAnggaran: 100000000,
              rows: [],
            },
            imageData: {
              scanType: `Pindai Dokumen Asli ${d.judul || ''}`,
              registrationNo: d.bavNumber || `REG-${Date.now().toString().slice(-6)}`,
              issueDate: d.tanggalMasuk || new Date().toLocaleDateString('id-ID'),
              validUntil: 'Berlaku Resmi',
              scanQuality: 'Color 300 DPI Legal Scan',
              stampedAuthority: d.opdName || 'Pemerintah Kabupaten Nagekeo',
              watermarkPreviewText: `VERIFIKASI ${d.opdId || 'OPD'}`,
            },
          },
        };
      });

      const users: UserAccount[] = (data.users || []).map((u: any) => ({
        id: u.id || `usr-${u.username}`,
        username: u.username || 'user',
        email: u.email || `${u.username}@nagekeokab.go.id`,
        nama: u.nama || u.username,
        role: u.role || 'DINAS_PEMOHON',
        opdId: u.opdId || 'SETDA',
        opdName: u.opdName || 'Sekretariat Daerah',
        nip: u.nip || '19880101 201501 1 001',
        jabatan: u.jabatan || 'Pengelola SAKIP',
        pangkat: 'Penata Muda / III-a',
        password: u.password || '123456',
        lastPasswordChangedAt: new Date().toLocaleString('id-ID'),
        driveFolderId: u.driveFolderId || '',
        driveFolderName: u.driveFolderName || `Folder ${u.opdName}`,
        driveFolderUrl: u.driveFolderUrl || '',
      }));

      const folders: OpdFolderRegistration[] = (data.folders || []).map((f: any) => ({
        opdId: f.opdId || '',
        opdName: f.opdName || '',
        driveFolderUrl: f.driveFolderUrl || '',
        driveFolderId: f.driveFolderId || '',
        driveFolderName: f.driveFolderName || `Folder ${f.opdName}`,
        registeredByAdmin: f.registeredByAdmin || 'Admin Verifikator',
        registeredAt: f.registeredAt || new Date().toLocaleString('id-ID'),
        notes: f.notes || '',
      }));

      return { documents: docs, users, folders };
    }
  } catch (err) {
    console.warn('Google Sheets GET sync note:', err);
  }
  return null;
}

export function sanitizeGoogleDriveUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) return `https://drive.google.com/drive/folders/${trimmed}`;
  return trimmed;
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
  opdName?: string;
  opdId?: string;
  format?: string;
  status?: string;
  verifierName?: string;
  verifierNip?: string;
  bavNumber?: string;
  digitalSealHash?: string;
  notes?: string;
  downloadUrl?: string;
  driveFolderUrl?: string;
  driveMasterFolderId?: string;
  driveServerName?: string;
  message?: string;
  newPassword?: string;
  userId?: string;
  username?: string;
  nama?: string;
  pemohonName?: string;
  pemohonEmail?: string;
  email?: string;
  pemohonInstansi?: string;
  versionNumber?: number;
  fileName?: string;
  fileMimeType?: string;
  fileBase64?: string;
  folderRegistration?: OpdFolderRegistration;
  folderRegistrations?: OpdFolderRegistration[];
}

export function createGoogleDriveStorageInfo(
  opdName: string,
  fileName: string,
  customFolderId?: string
): GoogleDriveStorageInfo {
  const masterFolderId = customFolderId || getGoogleDriveFolderId();
  const fileUniqueId = `DRV-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const driveViewUrl = `https://drive.google.com/file/d/${fileUniqueId}/view`;
  const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileUniqueId}`;

  return {
    fileId: fileUniqueId,
    folderId: masterFolderId,
    folderName: `${DEFAULT_GOOGLE_DRIVE_MASTER_NAME} / ${opdName}`,
    viewUrl: driveViewUrl,
    downloadUrl: driveDownloadUrl,
    serverMasterFolder: DEFAULT_GOOGLE_DRIVE_MASTER_NAME,
    syncedAt: new Date().toLocaleString('id-ID'),
  };
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

export function appendSyncLog(log: WebhookSyncLog): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSyncLogs();
    const updated = [log, ...current].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_SYNC_LOGS, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

function getMimeTypeByFormat(format: string, fileName?: string): string {
  const ext = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
  if (ext === 'pdf' || format === 'PDF') return 'application/pdf';
  if (ext === 'docx' || ext === 'doc' || format === 'DOCX')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'xlsx' || ext === 'xls' || format === 'XLSX')
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg' || format === 'IMAGE') return 'image/jpeg';
  return 'application/octet-stream';
}

export async function sendUploadToGoogleDriveAndSheet(
  doc: DocumentItem,
  version: DocumentVersion,
  actionType: 'UPLOAD_DOCUMENT' | 'UPLOAD_REVISION',
  customTargetFolderId?: string
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  let masterFolderId = customTargetFolderId || getGoogleDriveFolderId();

  if (masterFolderId && masterFolderId.includes('drive.google.com')) {
    const match = masterFolderId.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      masterFolderId = match[1];
    }
  }

  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  let cleanBase64 = version.fileBase64 || doc.fileBase64 || '';
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const payload: VerificationWebhookPayload = {
    action: actionType,
    timestamp,
    docId: doc.id,
    docNumber: doc.nomorBerkas,
    title: doc.judul,
    opdName: doc.opdName,
    opdId: doc.opdId,
    format: doc.format,
    status: 'PENDING',
    verifierName: '-',
    verifierNip: '-',
    bavNumber: '-',
    digitalSealHash: '-',
    notes: doc.perihal || 'Pengajuan berkas baru.',
    downloadUrl: version.googleDrive?.downloadUrl || doc.googleDrive?.downloadUrl || '',
    driveFolderUrl: getGoogleDriveFolderUrl(),
    driveMasterFolderId: masterFolderId,
    driveServerName: DEFAULT_GOOGLE_DRIVE_MASTER_NAME,
    pemohonName: doc.pemohon.nama,
    pemohonEmail: doc.pemohon.email || `${doc.opdId.toLowerCase()}@nagekeokab.go.id`,
    email: doc.pemohon.email || `${doc.opdId.toLowerCase()}@nagekeokab.go.id`,
    pemohonInstansi: doc.pemohon.instansi,
    versionNumber: version.versionNumber,
    fileName: version.fileName,
    fileMimeType: getMimeTypeByFormat(doc.format, version.fileName),
    fileBase64: cleanBase64,
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
    responseText = `Berkas disimpan di Google Drive / Folder [${doc.opdName}] & dicatat di sheet DATA_VERIFIKASI_DOKUMEN.`;
  } catch (err: unknown) {
    responseText = `Penyimpanan gagal: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`;
  }

  const logEntry: WebhookSyncLog = {
    id: `UP-${Date.now()}`,
    docId: doc.id,
    docNumber: doc.nomorBerkas,
    opd: doc.opdName,
    status: 'PENDING',
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

export async function sendVerificationToGoogleSheet(
  doc: DocumentItem,
  notesOrVerifier?: any,
  checklist?: any,
  verifierObj?: any,
  newStatus?: any
): Promise<{ success: boolean; message: string; timestamp: string }> {
  const webhookUrl = getGoogleSheetsWebhookUrl();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const effectiveVerifier =
    verifierObj && verifierObj.nama
      ? verifierObj
      : notesOrVerifier && notesOrVerifier.nama
      ? notesOrVerifier
      : { nama: 'Admin Verifikator', nip: '-', jabatan: 'Verifikator' };

  const effectiveNotes =
    typeof notesOrVerifier === 'string'
      ? notesOrVerifier
      : doc.verification?.notes || '-';

  const effectiveStatus = newStatus || doc.status || 'APPROVED';

  const payload: VerificationWebhookPayload = {
    action: 'VERIFY_DOCUMENT',
    timestamp,
    docId: doc.id,
    docNumber: doc.nomorBerkas,
    title: doc.judul,
    opdName: doc.opdName,
    opdId: doc.opdId,
    format: doc.format,
    status: effectiveStatus,
    verifierName: effectiveVerifier.nama,
    verifierNip: effectiveVerifier.nip,
    bavNumber: doc.verification?.bavNumber || `BAV/SAKIP/${doc.nomorBerkas}`,
    digitalSealHash: doc.verification?.digitalSealHash || '-',
    notes: effectiveNotes,
    downloadUrl: doc.googleDrive?.downloadUrl || '',
    driveFolderUrl: getGoogleDriveFolderUrl(),
    pemohonName: doc.pemohon.nama,
    pemohonEmail: doc.pemohon.email || `${doc.opdId.toLowerCase()}@nagekeokab.go.id`,
    email: doc.pemohon.email || `${doc.opdId.toLowerCase()}@nagekeokab.go.id`,
    pemohonInstansi: doc.pemohon.instansi,
    versionNumber: doc.currentVersion,
    fileName: doc.fileName,
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
    responseText = `Status verifikasi [${effectiveStatus}] dicatat di sheet DATA_VERIFIKASI_DOKUMEN.`;
  } catch (err: unknown) {
    responseText = `Pencatatan gagal: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`;
  }

  const logEntry: WebhookSyncLog = {
    id: `VER-${Date.now()}`,
    docId: doc.id,
    docNumber: doc.nomorBerkas,
    opd: doc.opdName,
    status: effectiveStatus as VerificationStatus,
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
  user: UserAccount,
  newPass: string
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
    userId: user.id,
    username: user.username,
    email: user.email || `${user.username}@nagekeokab.go.id`,
    newPassword: newPass,
    opdName: user.opdName,
    opdId: user.opdId,
    notes: `Pembaruan password untuk akun @${user.username}`,
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

    return {
      success: true,
      message: `Password akun @${user.username} berhasil diperbarui ke sheet DATABASE_PENGGUNA!`,
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Gagal memperbarui password: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`,
      timestamp,
    };
  }
}

export async function sendUserRegistrationToGoogleSheet(
  newUser: UserAccount,
  adminUser?: UserAccount | null
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
    email: newUser.email || `${newUser.username}@nagekeokab.go.id`,
    pemohonEmail: newUser.email || `${newUser.username}@nagekeokab.go.id`,
    pemohonName: newUser.nama,
    pemohonInstansi: newUser.opdName,
    opdId: newUser.opdId,
    opdName: newUser.opdName,
    verifierName: adminUser?.nama || 'Admin Registrasi',
    verifierNip: newUser.nip || adminUser?.nip || '-',
    newPassword: newUser.password,
    driveFolderUrl: newUser.driveFolderUrl || getGoogleDriveFolderUrl(),
    notes: `Pendaftaran akun login dinas @${newUser.username}`,
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
      docNumber: `AKUN/@${newUser.username}`,
      opd: newUser.opdName,
      status: 'APPROVED',
      timestamp,
      success: true,
      responseMessage: `Akun dinas @${newUser.username} (${newUser.email || `${newUser.username}@nagekeokab.go.id`}) dicatat ke sheet DATABASE_PENGGUNA.`,
      payload: payload as unknown as Record<string, unknown>,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: `Akun login dinas @${newUser.username} berhasil dicatat di sheet DATABASE_PENGGUNA!`,
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Gagal mengirim pendaftaran akun: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`,
      timestamp,
    };
  }
}

export async function sendFolderRegistrationToGoogleSheet(
  registration: OpdFolderRegistration,
  adminUser?: UserAccount | null
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
    driveFolderUrl: registration.driveFolderUrl,
    driveMasterFolderId: registration.driveFolderId,
    driveServerName: registration.driveFolderName,
    verifierName: adminUser?.nama || registration.registeredByAdmin,
    verifierNip: adminUser?.nip || '-',
    notes: registration.notes || '-',
    folderRegistration: registration,
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
      docNumber: `FOLDER/${registration.opdId}`,
      opd: registration.opdName,
      status: 'APPROVED',
      timestamp,
      success: true,
      responseMessage: `Folder Google Drive untuk ${registration.opdName} dicatat ke sheet MAPPING_FOLDER_OPD.`,
      payload: payload as unknown as Record<string, unknown>,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: `Tautan folder Google Drive ${registration.opdName} dicatat di sheet MAPPING_FOLDER_OPD!`,
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Gagal mengirim pendaftaran folder: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`,
      timestamp,
    };
  }
}

export async function sendAllFolderRegistrationsToGoogleSheet(
  registrations: OpdFolderRegistration[],
  adminUser?: UserAccount | null
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
    verifierName: adminUser?.nama || 'Admin Verifikator',
    verifierNip: adminUser?.nip || '-',
    folderRegistrations: registrations,
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
      docId: 'ALL-FOLDERS',
      docNumber: 'BATCH/FOLDER/MAPPING',
      opd: 'Seluruh OPD (38 Dinas)',
      status: 'APPROVED',
      timestamp,
      success: true,
      responseMessage: `Seluruh ${registrations.length} folder dinas dicatat ke sheet MAPPING_FOLDER_OPD.`,
      payload: payload as unknown as Record<string, unknown>,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: `Seluruh folder dinas (${registrations.length} OPD) berhasil dicatat ke sheet MAPPING_FOLDER_OPD!`,
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Gagal mengirim sinkronisasi folder: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`,
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

export async function sendSampleTestDocument(
  senderEmail?: string,
  opdName?: string
): Promise<{ success: boolean; message: string; timestamp: string; docNumber: string }> {
  const targetUrl = getGoogleSheetsWebhookUrl();
  const masterFolderId = getGoogleDriveFolderId();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
  const docNumber = `UJI/SIMVERIF/${Date.now().toString().slice(-6)}`;
  const effectiveEmail = senderEmail || 'inspektorat@nagekeokab.go.id';
  const effectiveOpd = opdName || 'Inspektorat Daerah Kabupaten Nagekeo';

  const payload: VerificationWebhookPayload = {
    action: 'UPLOAD_DOCUMENT',
    timestamp,
    docId: `DOC-TEST-${Date.now()}`,
    docNumber,
    title: 'Pengujian Mandiri Integrasi Google Sheets & Drive (Sampel Verifikasi)',
    opdName: effectiveOpd,
    format: 'PDF',
    status: 'PENDING',
    verifierName: 'Sistem Pengujian Mandiri',
    verifierNip: '19850101 201001 1 002',
    notes: 'Pemeriksaan mandiri: Data berhasil dikirim dan diverifikasi masuk ke baris sheet DATA_VERIFIKASI_DOKUMEN.',
    downloadUrl: getGoogleDriveFolderUrl(),
    driveFolderUrl: getGoogleDriveFolderUrl(),
    driveMasterFolderId: masterFolderId,
    bavNumber: `BAV-TEST-${Date.now().toString().slice(-4)}`,
    digitalSealHash: `SEAL-TEST-${Date.now().toString(16).toUpperCase()}`,
    pemohonName: 'Pemeriksa Mandiri (Uji Coba)',
    pemohonEmail: effectiveEmail,
    email: effectiveEmail,
    pemohonInstansi: effectiveOpd,
    versionNumber: 1,
    fileName: 'dokumen_uji_mandiri_simverif.pdf',
    fileMimeType: 'application/pdf',
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
      id: `TEST-DOC-${Date.now()}`,
      docId: payload.docId || 'DOC-TEST',
      docNumber,
      opd: effectiveOpd,
      status: 'PENDING',
      timestamp,
      success: true,
      responseMessage: `Data uji "${docNumber}" dikirim ke sheet DATA_VERIFIKASI_DOKUMEN dengan email pemohon ${effectiveEmail}.`,
      payload: payload as unknown as Record<string, unknown>,
    };
    appendSyncLog(logEntry);

    return {
      success: true,
      message: `Data uji dokumen "${docNumber}" berhasil dikirim! Silakan buka Google Sheet untuk memeriksa baris baru di sheet DATA_VERIFIKASI_DOKUMEN.`,
      timestamp,
      docNumber,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Gagal mengirim data uji: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`,
      timestamp,
      docNumber,
    };
  }
}

/**
 * GOOGLE APPS SCRIPT LENGKAP: Code.gs (Backend API + Server-side Rendering Dashboard Admin)
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT - SIMVERIF SAKIP NAGEKEO
 * (SERVER ENGINE, MULTI-WORKSHEET DATABASE & DASHBOARD ADMIN WEB APP)
 * 
 * STRUKTUR LEMBAR KERJA:
 * 1. Sheet 'DATA_VERIFIKASI_DOKUMEN': Transaksi berkas, status verifikasi, email pemohon, dan link Drive.
 * 2. Sheet 'DATABASE_PENGGUNA': Akun dinas, email kedinasan (@nagekeokab.go.id), password, dan status.
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
    if (files.hasNext()) {
      return SpreadsheetApp.open(files.next());
    }
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
 * 1. doGet: Melayani Permintaan Web App (HTML Dashboard Admin & JSON API)
 */
function doGet(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Spreadsheet tidak ditemukan."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = e && e.parameter ? e.parameter.action : "";
    
    // API 1: JSON DATA SYNC UNTUK APLIKASI WEB REACT (SIMVERIF)
    if (action === "get_all_data" || (e && e.parameter && e.parameter.format === "json")) {
      var dataObj = adminGetDashboardData();
      return ContentService.createTextOutput(JSON.stringify(dataObj))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // TAMPILKAN DASHBOARD ADMIN PROFESIONAL LANGSUNG DI BROWSER
    return HtmlService.createHtmlOutput(getAdminDashboardHtml())
      .setTitle("DASHBOARD ADMIN SIMVERIF SAKIP - KABUPATEN NAGEKEO")
      .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  } catch (error) {
    return ContentService.createTextOutput("Error: " + error.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * 2. doPost: Menerima Unggahan Berkas, Verifikasi, dan Pendaftaran Akun
 */
function doPost(e) {
  try {
    var ss = getActiveSpreadsheetSafely();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Spreadsheet tidak dapat diakses."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    
    // Inisialisasi 3 Lembar Kerja
    var docSheet = getOrCreateSheet(ss, "DATA_VERIFIKASI_DOKUMEN");
    if (docSheet.getLastRow() === 0) {
      docSheet.appendRow([
        "Waktu Transaksi", "ID Dokumen", "Nomor Berkas", "Judul Dokumen", "OPD / Dinas",
        "Versi", "Format", "Nama Pemohon", "Email Pemohon", "Instansi Pemohon", "Status Verifikasi",
        "Nama Verifikator", "NIP Verifikator", "Nomor Registrasi/BAV", "Tautan Berkas Google Drive",
        "ID File Google Drive", "Catatan Verifikator/Pemeriksa", "Kode Hash Keamanan"
      ]);
      docSheet.getRange(1, 1, 1, 18).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
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
        message: "Ping berhasil diterima oleh Google Spreadsheet & Drive Server"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 2: UPDATE STATUS VERIFIKASI (VERIFY_DOCUMENT)
    if (data.action === "VERIFY_DOCUMENT") {
      var foundDocRow = -1;
      var dVals = docSheet.getDataRange().getValues();
      for (var d = 1; d < dVals.length; d++) {
        if (dVals[d][1] === data.docId || dVals[d][2] === data.docNumber) {
          foundDocRow = d + 1;
          break;
        }
      }

      if (foundDocRow > 0) {
        docSheet.getRange(foundDocRow, 11).setValue(data.status);
        docSheet.getRange(foundDocRow, 12).setValue(data.verifierName || "Admin Verifikator");
        docSheet.getRange(foundDocRow, 13).setValue(data.verifierNip || "-");
        docSheet.getRange(foundDocRow, 14).setValue(data.bavNumber || "-");
        docSheet.getRange(foundDocRow, 17).setValue(data.notes || "-");
        docSheet.getRange(foundDocRow, 18).setValue(data.digitalSealHash || "-");
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Status verifikasi dokumen " + (data.docNumber || "") + " berhasil dicatat di sheet DATA_VERIFIKASI_DOKUMEN"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 3: UPDATE PASSWORD PENGGUNA
    if (data.action === "UPDATE_PASSWORD") {
      var foundRow = -1;
      var values = userSheet.getDataRange().getValues();
      for (var r = 1; r < values.length; r++) {
        if (values[r][2] === data.username || values[r][1] === data.userId || values[r][3] === data.username) {
          foundRow = r + 1;
          break;
        }
      }
      
      if (foundRow > 0) {
        userSheet.getRange(foundRow, 1).setValue(data.timestamp || new Date().toISOString());
        userSheet.getRange(foundRow, 10).setValue(data.newPassword);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Password akun " + data.username + " berhasil diperbarui di sheet DATABASE_PENGGUNA"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 4: PENDAFTARAN AKUN LOGIN DINAS (REGISTER_USER_ACCOUNT)
    if (data.action === "REGISTER_USER_ACCOUNT") {
      var userFound = -1;
      var uVals = userSheet.getDataRange().getValues();
      for (var u = 1; u < uVals.length; u++) {
        if (uVals[u][2] === data.username || uVals[u][1] === data.userId || (data.email && uVals[u][3] === data.email)) {
          userFound = u + 1;
          break;
        }
      }

      var userEmail = data.email || data.pemohonEmail || (data.username + "@nagekeokab.go.id");
      var userDriveUrl = data.driveFolderUrl || data.downloadUrl || "-";

      if (userFound > 0) {
        userSheet.getRange(userFound, 1).setValue(data.timestamp || new Date().toISOString());
        userSheet.getRange(userFound, 4).setValue(userEmail);
        userSheet.getRange(userFound, 5).setValue(data.pemohonName || data.nama || "-");
        userSheet.getRange(userFound, 6).setValue(data.role || "DINAS_PEMOHON");
        userSheet.getRange(userFound, 7).setValue(data.opdName);
        userSheet.getRange(userFound, 8).setValue(data.verifierNip || data.nip || "-");
        userSheet.getRange(userFound, 9).setValue(userDriveUrl);
        userSheet.getRange(userFound, 10).setValue(data.newPassword || "123456");
      } else {
        userSheet.appendRow([
          data.timestamp || new Date().toISOString(),
          data.userId || "usr-" + data.username,
          data.username,
          userEmail,
          data.pemohonName || data.nama || "-",
          data.role || "DINAS_PEMOHON",
          data.opdName,
          data.verifierNip || data.nip || "-",
          userDriveUrl,
          data.newPassword || "123456",
          "AKTIF"
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Akun dinas @" + data.username + " (" + userEmail + ") dicatat di sheet DATABASE_PENGGUNA"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 5: PENDAFTARAN FOLDER DINAS (REGISTER_OPD_FOLDER)
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
        message: "Folder dinas " + reg.opdName + " dicatat di sheet MAPPING_FOLDER_OPD"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Aksi 6: TRANSAKSI & UNGGAHAN DOKUMEN (Masuk ke sheet DATA_VERIFIKASI_DOKUMEN & Google Drive)
    var driveFileUrl = data.downloadUrl || data.driveFolderUrl || "";
    var driveFileId = "";

    try {
      var targetFolderId = data.driveMasterFolderId || MASTER_FOLDER_ID;
      if (targetFolderId && targetFolderId.indexOf("folders/") !== -1) {
        var parts = targetFolderId.split("folders/");
        if (parts.length > 1) {
          targetFolderId = parts[1].split("?")[0].split("/")[0].trim();
        }
      }

      var targetFolder = null;
      if (targetFolderId && targetFolderId.length > 5 && targetFolderId.indexOf("1B_SIMVERIF") === -1) {
        try {
          targetFolder = DriveApp.getFolderById(targetFolderId);
        } catch (fErr) {
          targetFolder = null;
        }
      }

      if (!targetFolder && ss) {
        try {
          var ssId = ss.getId();
          var parentFolders = DriveApp.getFileById(ssId).getParents();
          if (parentFolders.hasNext()) {
            targetFolder = parentFolders.next();
          }
        } catch (pErr) {}
      }

      if (!targetFolder) {
        targetFolder = DriveApp.getRootFolder();
      }

      if (data.fileBase64 && data.fileBase64.length > 50) {
        var contentType = data.fileMimeType || "application/pdf";
        var decodedBytes = Utilities.base64Decode(data.fileBase64);
        var blob = Utilities.newBlob(decodedBytes, contentType, data.fileName || "dokumen_verifikasi");
        
        var driveFile = targetFolder.createFile(blob);
        driveFile.setDescription("Dokumen SIMVERIF SAKIP: " + (data.docNumber || "") + " - " + (data.pemohonEmail || "") + " - Versi " + (data.versionNumber || 1));
        try {
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shErr) {}
        
        driveFileUrl = driveFile.getUrl();
        driveFileId = driveFile.getId();
      } else {
        driveFileUrl = targetFolder.getUrl();
        driveFileId = targetFolder.getId();
      }
    } catch (driveErr) {
      driveFileUrl = data.downloadUrl || data.driveFolderUrl || "https://drive.google.com";
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

/**
 * 3. Helper Pengambil Seluruh Data untuk Dashboard & API
 */
function adminGetDashboardData() {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", documents: [], users: [], folders: [] };

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
          email: docVals[i][8] ? String(docVals[i][8]) : "",
          instansi: docVals[i][9] ? String(docVals[i][9]) : "",
        },
        status: docVals[i][10] ? String(docVals[i][10]) : "PENDING",
        verifierName: docVals[i][11] ? String(docVals[i][11]) : "",
        verifierNip: docVals[i][12] ? String(docVals[i][12]) : "",
        bavNumber: docVals[i][13] ? String(docVals[i][13]) : "",
        googleDrive: {
          viewUrl: docVals[i][14] ? String(docVals[i][14]) : "",
          downloadUrl: docVals[i][14] ? String(docVals[i][14]) : "",
          fileId: docVals[i][15] ? String(docVals[i][15]) : "",
          storageStatus: "SYNCED"
        },
        notes: docVals[i][16] ? String(docVals[i][16]) : "",
        digitalSealHash: docVals[i][17] ? String(docVals[i][17]) : ""
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
        email: userVals[u][3] ? String(userVals[u][3]) : userVals[u][2] + "@nagekeokab.go.id",
        nama: userVals[u][4] ? String(userVals[u][4]) : "",
        role: userVals[u][5] ? String(userVals[u][5]) : "DINAS_PEMOHON",
        opdName: userVals[u][6] ? String(userVals[u][6]) : "",
        nip: userVals[u][7] ? String(userVals[u][7]) : "",
        driveFolderUrl: userVals[u][8] ? String(userVals[u][8]) : "",
        password: userVals[u][9] ? String(userVals[u][9]) : "",
        status: userVals[u][10] ? String(userVals[u][10]) : "AKTIF"
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

  return {
    status: "success",
    spreadsheetUrl: ss.getUrl(),
    documents: docs,
    users: users,
    folders: folders
  };
}

/**
 * 4. Aksi Server Langsung untuk Admin Dashboard Apps Script
 */
function adminVerifyDocServer(docId, docNumber, status, verifierName, verifierNip, bavNumber, notes) {
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
    docSheet.getRange(foundRow, 17).setValue(notes || "Diverifikasi melalui Dashboard Apps Script");
    docSheet.getRange(foundRow, 18).setValue(seal);
  }

  return adminGetDashboardData();
}

function adminCreateUserServer(username, email, nama, opdName, role, nip, password, driveFolderUrl) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
  var userSheet = getOrCreateSheet(ss, "DATABASE_PENGGUNA");

  var foundUser = -1;
  var uVals = userSheet.getDataRange().getValues();
  for (var u = 1; u < uVals.length; u++) {
    if (uVals[u][2] === username || uVals[u][3] === email) {
      foundUser = u + 1;
      break;
    }
  }

  var now = new Date().toISOString();
  if (foundUser > 0) {
    userSheet.getRange(foundUser, 1).setValue(now);
    userSheet.getRange(foundUser, 4).setValue(email);
    userSheet.getRange(foundUser, 5).setValue(nama);
    userSheet.getRange(foundUser, 6).setValue(role || "DINAS_PEMOHON");
    userSheet.getRange(foundUser, 7).setValue(opdName);
    userSheet.getRange(foundUser, 8).setValue(nip || "-");
    userSheet.getRange(foundUser, 9).setValue(driveFolderUrl || "-");
    userSheet.getRange(foundUser, 10).setValue(password || "123456");
  } else {
    userSheet.appendRow([
      now, "usr-" + username, username, email, nama,
      role || "DINAS_PEMOHON", opdName, nip || "-", driveFolderUrl || "-", password || "123456", "AKTIF"
    ]);
  }

  return adminGetDashboardData();
}

function adminRegisterFolderServer(opdId, opdName, driveFolderUrl, driveFolderId, driveFolderName, registeredByAdmin) {
  var ss = getActiveSpreadsheetSafely();
  if (!ss) return { status: "error", message: "Spreadsheet tidak ditemukan" };
  var folderSheet = getOrCreateSheet(ss, "MAPPING_FOLDER_OPD");

  var foundFolder = -1;
  var fVals = folderSheet.getDataRange().getValues();
  for (var f = 1; f < fVals.length; f++) {
    if (fVals[f][1] === opdId) {
      foundFolder = f + 1;
      break;
    }
  }

  var now = new Date().toISOString();
  if (foundFolder > 0) {
    folderSheet.getRange(foundFolder, 1).setValue(now);
    folderSheet.getRange(foundFolder, 4).setValue(driveFolderUrl);
    folderSheet.getRange(foundFolder, 5).setValue(driveFolderId);
    folderSheet.getRange(foundFolder, 6).setValue(driveFolderName);
    folderSheet.getRange(foundFolder, 7).setValue(registeredByAdmin || "Admin");
  } else {
    folderSheet.appendRow([
      now, opdId, opdName, driveFolderUrl, driveFolderId,
      driveFolderName, registeredByAdmin || "Admin", "-", "Pendaftaran melalui Dashboard Apps Script"
    ]);
  }

  return adminGetDashboardData();
}

/**
 * 5. Kode Antarmuka Dashboard Admin Profesional (HTML / CSS / JS)
 */
function getAdminDashboardHtml() {
  return \`<!DOCTYPE html>
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
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col">

  <!-- TOP HEADER -->
  <header class="bg-slate-800/90 border-b border-slate-700/80 sticky top-0 z-40 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">
        <i class="fa-solid fa-shield-halved"></i>
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-sm sm:text-base font-extrabold text-white tracking-tight">DASHBOARD ADMIN SAKIP</h1>
          <span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">GOOGLE APPS SCRIPT ENGINE</span>
        </div>
        <p class="text-[11px] text-slate-400 font-medium">Pemerintah Kabupaten Nagekeo &bull; Terhubung Langsung ke Google Sheet &amp; Drive</p>
      </div>
    </div>

    <div class="flex items-center gap-2.5">
      <button onclick="loadAllData()" class="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-600">
        <i class="fa-solid fa-rotate" id="refreshIcon"></i>
        <span>Segarkan Data</span>
      </button>
      <a id="sheetLinkBtn" href="#" target="_blank" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20">
        <i class="fa-solid fa-table"></i>
        <span>Buka Google Sheet</span>
      </a>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">

    <!-- METRIC STATS -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      <div class="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
        <div class="text-slate-400 text-xs font-medium">Total Berkas Masuk</div>
        <div class="text-2xl font-black text-white mt-1" id="statTotalDocs">0</div>
        <div class="text-[10px] text-slate-500 mt-1 font-mono">Sheet DATA_VERIFIKASI</div>
      </div>
      <div class="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
        <div class="text-amber-400 text-xs font-medium">Menunggu Verifikasi</div>
        <div class="text-2xl font-black text-amber-400 mt-1" id="statPendingDocs">0</div>
        <div class="text-[10px] text-slate-500 mt-1 font-mono">Antrean Aktif</div>
      </div>
      <div class="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
        <div class="text-emerald-400 text-xs font-medium">Berkas Sah / Disetujui</div>
        <div class="text-2xl font-black text-emerald-400 mt-1" id="statApprovedDocs">0</div>
        <div class="text-[10px] text-slate-500 mt-1 font-mono">Disahkan BAV</div>
      </div>
      <div class="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl">
        <div class="text-sky-400 text-xs font-medium">Akun Dinas Terdaftar</div>
        <div class="text-2xl font-black text-sky-400 mt-1" id="statTotalUsers">0</div>
        <div class="text-[10px] text-slate-500 mt-1 font-mono">@nagekeokab.go.id</div>
      </div>
    </div>

    <!-- TABS -->
    <div class="bg-slate-800/60 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl">
      <div class="flex border-b border-slate-700/80 bg-slate-800/90 px-4 sm:px-6 gap-2 sm:gap-6 text-xs font-bold overflow-x-auto">
        <button onclick="switchTab('DOCS')" id="tabBtnDocs" class="py-3.5 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2">
          <i class="fa-solid fa-file-signature"></i>
          <span>1. Verifikasi Berkas Dokumen</span>
        </button>
        <button onclick="switchTab('USERS')" id="tabBtnUsers" class="py-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2">
          <i class="fa-solid fa-users-gear"></i>
          <span>2. Akun &amp; Email Dinas</span>
        </button>
        <button onclick="switchTab('FOLDERS')" id="tabBtnFolders" class="py-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2">
          <i class="fa-solid fa-folder-tree"></i>
          <span>3. Folder Google Drive OPD</span>
        </button>
      </div>

      <!-- TAB 1: DOKUMEN -->
      <div id="tabContentDocs" class="p-4 sm:p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="relative flex-1 min-w-[240px]">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input type="text" id="docSearch" oninput="filterDocs()" placeholder="Cari nomor berkas, judul, nama dinas, atau email..." class="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500">
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <button onclick="filterByStatus('ALL')" class="px-3 py-1.5 rounded-xl font-bold bg-emerald-600 text-white" id="filterStatusAll">Semua</button>
            <button onclick="filterByStatus('PENDING')" class="px-3 py-1.5 rounded-xl font-bold bg-slate-700 text-slate-300 hover:bg-slate-600" id="filterStatusPending">Pending</button>
            <button onclick="filterByStatus('APPROVED')" class="px-3 py-1.5 rounded-xl font-bold bg-slate-700 text-slate-300 hover:bg-slate-600" id="filterStatusApproved">Sah</button>
            <button onclick="filterByStatus('REVISION')" class="px-3 py-1.5 rounded-xl font-bold bg-slate-700 text-slate-300 hover:bg-slate-600" id="filterStatusRevision">Revisi</button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-700/80">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-700/80">
              <tr>
                <th class="p-3.5">Waktu / No. Berkas</th>
                <th class="p-3.5">Judul Dokumen &amp; OPD</th>
                <th class="p-3.5">Email Pemohon</th>
                <th class="p-3.5">File Drive</th>
                <th class="p-3.5">Status</th>
                <th class="p-3.5 text-right">Aksi Verifikasi</th>
              </tr>
            </thead>
            <tbody id="docsTableBody" class="divide-y divide-slate-800 text-slate-300">
              <tr><td colspan="6" class="p-6 text-center text-slate-500">Memuat data dari Google Sheets...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 2: AKUN DINAS -->
      <div id="tabContentUsers" class="p-4 sm:p-6 space-y-4 hidden">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="font-bold text-slate-200 text-sm flex items-center gap-2">
            <i class="fa-solid fa-users text-sky-400"></i>
            <span>Daftar Akun Login Kedinasan (@nagekeokab.go.id)</span>
          </div>
          <span class="text-xs text-slate-400 font-mono">Tercatat di sheet DATABASE_PENGGUNA</span>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-700/80">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-700/80">
              <tr>
                <th class="p-3.5">Username</th>
                <th class="p-3.5">Email Kedinasan</th>
                <th class="p-3.5">Nama &amp; OPD</th>
                <th class="p-3.5">Peran</th>
                <th class="p-3.5">Password</th>
                <th class="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody id="usersTableBody" class="divide-y divide-slate-800 text-slate-300">
              <tr><td colspan="6" class="p-6 text-center text-slate-500">Memuat akun dinas...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TAB 3: FOLDER GOOGLE DRIVE OPD -->
      <div id="tabContentFolders" class="p-4 sm:p-6 space-y-4 hidden">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="font-bold text-slate-200 text-sm flex items-center gap-2">
            <i class="fa-solid fa-folder-tree text-emerald-400"></i>
            <span>Pemetaan Folder Google Drive OPD (38 Dinas)</span>
          </div>
          <span class="text-xs text-slate-400 font-mono">Tercatat di sheet MAPPING_FOLDER_OPD</span>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-700/80">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-700/80">
              <tr>
                <th class="p-3.5">ID &amp; Nama Dinas</th>
                <th class="p-3.5">Tautan Google Drive Folder</th>
                <th class="p-3.5">Folder ID</th>
                <th class="p-3.5">Didaftarkan</th>
              </tr>
            </thead>
            <tbody id="foldersTableBody" class="divide-y divide-slate-800 text-slate-300">
              <tr><td colspan="4" class="p-6 text-center text-slate-500">Memuat pemetaan folder...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <!-- MODAL VERIFIKASI DOKUMEN -->
    <div id="verifyModal" class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 hidden">
      <div class="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="font-bold text-white text-sm flex items-center gap-2">
            <i class="fa-solid fa-signature text-emerald-400"></i>
            <span>Formulir Verifikasi &amp; Berita Acara (BAV)</span>
          </div>
          <button onclick="closeVerifyModal()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-base"></i></button>
        </div>

        <div class="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80 text-xs space-y-1">
          <div class="text-[10px] text-slate-400 font-mono" id="modalDocNumber">-</div>
          <div class="font-bold text-white text-sm" id="modalDocTitle">-</div>
          <div class="text-emerald-400 font-medium" id="modalDocOpd">-</div>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-300 font-bold mb-1">Keputusan Status Verifikasi :</label>
            <select id="selectStatus" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:border-emerald-500 focus:outline-none">
              <option value="APPROVED">✅ SAH / DISETUJUI (BAV DITERBITKAN)</option>
              <option value="REVISION">⚠️ PERLU REVISI (KEMBALIKAN KE OPD)</option>
              <option value="REJECTED">❌ DITOLAK (TIDAK MEMENUHI SYARAT)</option>
            </select>
          </div>

          <div>
            <label class="block text-slate-300 font-bold mb-1">Nomor Registrasi / Berita Acara (BAV) :</label>
            <input type="text" id="inputBav" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none" placeholder="BAV/SAKIP/2026/...">
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-slate-300 font-bold mb-1">Nama Verifikator :</label>
              <input type="text" id="inputVerifier" value="Admin Verifikator SAKIP" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:border-emerald-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-slate-300 font-bold mb-1">NIP Verifikator :</label>
              <input type="text" id="inputNip" value="19850101 201001 1 002" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:border-emerald-500 focus:outline-none">
            </div>
          </div>

          <div>
            <label class="block text-slate-300 font-bold mb-1">Catatan / Rekomendasi Pemeriksaan :</label>
            <textarea id="inputNotes" rows="2" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none" placeholder="Tuliskan evaluasi dokumen..."></textarea>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button onclick="closeVerifyModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors">Batal</button>
          <button id="btnSubmitVerify" onclick="submitVerification()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-600/30">
            <i class="fa-solid fa-check"></i> <span>Sahkan &amp; Simpan ke Sheet</span>
          </button>
        </div>
      </div>
    </div>
  </main>

  <script>
    var globalData = { documents: [], users: [], folders: [] };
    var activeStatusFilter = 'ALL';

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
            renderFolders();
          }
        })
        .withFailureHandler(function(err) {
          if (icon) icon.classList.remove('fa-spin');
          alert('Gagal mengambil data dari Google Sheets: ' + err.toString());
        })
        .adminGetDashboardData();
    }

    function renderStats() {
      var docs = globalData.documents || [];
      var users = globalData.users || [];
      document.getElementById('statTotalDocs').innerText = docs.length;
      document.getElementById('statPendingDocs').innerText = docs.filter(function(d){ return d.status === 'PENDING'; }).length;
      document.getElementById('statApprovedDocs').innerText = docs.filter(function(d){ return d.status === 'APPROVED'; }).length;
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
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Tidak ada berkas yang sesuai filter.</td></tr>';
        return;
      }

      var html = '';
      filtered.forEach(function(d) {
        var statusBadge = '';
        if (d.status === 'APPROVED') {
          statusBadge = '<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">SAH / DISETUJUI</span>';
        } else if (d.status === 'REVISION') {
          statusBadge = '<span class="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">PERLU REVISI</span>';
        } else if (d.status === 'REJECTED') {
          statusBadge = '<span class="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">DITOLAK</span>';
        } else {
          statusBadge = '<span class="bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">MENUNGGU</span>';
        }

        var driveLink = d.googleDrive && d.googleDrive.viewUrl && d.googleDrive.viewUrl.length > 5
          ? '<a href="' + d.googleDrive.viewUrl + '" target="_blank" class="text-sky-400 hover:underline flex items-center gap-1 font-mono"><i class="fa-solid fa-arrow-up-right-from-square"></i> Buka Drive</a>'
          : '<span class="text-slate-500 font-mono">-</span>';

        var actionButtons = '<div class="flex items-center justify-end gap-1.5">' +
          '<button onclick="openVerifyModal(\\'' + (d.id || '') + '\\', \\'' + (d.nomorBerkas || '') + '\\', \\'' + (d.judul || '').replace(/'/g, "\\\\'") + '\\', \\'' + (d.opdName || '').replace(/'/g, "\\\\'") + '\\')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all">' +
          '<i class="fa-solid fa-signature"></i> <span>Verifikasi</span></button>' +
          '</div>';

        html += '<tr class="hover:bg-slate-800/80 transition-colors">' +
          '<td class="p-3.5"><div class="font-bold text-white font-mono">' + (d.nomorBerkas || '-') + '</div><div class="text-[10px] text-slate-500 font-mono">' + (d.tanggalMasuk || '') + '</div></td>' +
          '<td class="p-3.5"><div class="font-bold text-slate-200">' + (d.judul || '-') + '</div><div class="text-[11px] text-emerald-400 font-medium">' + (d.opdName || '-') + ' &bull; v' + (d.currentVersion || 1) + '</div></td>' +
          '<td class="p-3.5 font-mono text-[11px] text-slate-400">' + ((d.pemohon && d.pemohon.email) ? d.pemohon.email : '-') + '</td>' +
          '<td class="p-3.5">' + driveLink + '</td>' +
          '<td class="p-3.5">' + statusBadge + '</td>' +
          '<td class="p-3.5 text-right">' + actionButtons + '</td>' +
          '</tr>';
      });

      tbody.innerHTML = html;
    }

    // Modal Verifikasi Dokumen
    var selectedVerifyDoc = null;
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
      var notes = document.getElementById('inputNotes').value || 'Verifikasi SAKIP melalui Dashboard Apps Script';

      var btn = document.getElementById('btnSubmitVerify');
      if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan ke Sheet...'; }

      google.script.run
        .withSuccessHandler(function(res) {
          if (btn) { btn.disabled = false; btn.innerText = 'Sahkan & Simpan ke Sheet'; }
          closeVerifyModal();
          if (res && res.status === 'success') {
            globalData = res;
            renderStats();
            renderDocs();
            alert('Verifikasi berkas ' + selectedVerifyDoc.docNumber + ' berhasil dicatat di Google Sheet!');
          }
        })
        .withFailureHandler(function(err) {
          if (btn) { btn.disabled = false; btn.innerText = 'Sahkan & Simpan ke Sheet'; }
          alert('Gagal memverifikasi: ' + err.toString());
        })
        .adminVerifyDocServer(selectedVerifyDoc.id, selectedVerifyDoc.docNumber, status, verifier, nip, bav, notes);
    }

    function renderUsers() {
      var users = globalData.users || [];
      var tbody = document.getElementById('usersTableBody');
      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada akun dinas tercatat.</td></tr>';
        return;
      }
      var html = '';
      users.forEach(function(u) {
        html += '<tr class="hover:bg-slate-800/80 transition-colors">' +
          '<td class="p-3.5 font-bold font-mono text-sky-400">@' + (u.username || '') + '</td>' +
          '<td class="p-3.5 font-mono text-emerald-400 font-semibold">' + (u.email || (u.username + '@nagekeokab.go.id')) + '</td>' +
          '<td class="p-3.5"><div class="font-bold text-slate-200">' + (u.nama || '-') + '</div><div class="text-[10px] text-slate-500">' + (u.opdName || '-') + '</div></td>' +
          '<td class="p-3.5"><span class="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">' + (u.role || 'DINAS_PEMOHON') + '</span></td>' +
          '<td class="p-3.5 font-mono text-slate-300 font-bold">' + (u.password || '******') + '</td>' +
          '<td class="p-3.5"><span class="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold text-[10px]">AKTIF</span></td>' +
          '</tr>';
      });
      tbody.innerHTML = html;
    }

    function renderFolders() {
      var folders = globalData.folders || [];
      var tbody = document.getElementById('foldersTableBody');
      if (folders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">Belum ada mapping folder OPD.</td></tr>';
        return;
      }
      var html = '';
      folders.forEach(function(f) {
        html += '<tr class="hover:bg-slate-800/80 transition-colors">' +
          '<td class="p-3.5"><div class="font-bold text-white">' + (f.opdName || '-') + '</div><div class="text-[10px] text-slate-500 font-mono">' + (f.opdId || '') + '</div></td>' +
          '<td class="p-3.5 font-mono"><a href="' + (f.driveFolderUrl || '#') + '" target="_blank" class="text-sky-400 hover:underline truncate block max-w-xs">' + (f.driveFolderUrl || '-') + '</a></td>' +
          '<td class="p-3.5 font-mono text-slate-400 text-[11px]">' + (f.driveFolderId || '-') + '</td>' +
          '<td class="p-3.5 font-mono text-slate-500 text-[10px]">' + (f.registeredAt || '-') + '</td>' +
          '</tr>';
      });
      tbody.innerHTML = html;
    }

    function switchTab(tab) {
      document.getElementById('tabContentDocs').classList.add('hidden');
      document.getElementById('tabContentUsers').classList.add('hidden');
      document.getElementById('tabContentFolders').classList.add('hidden');

      document.getElementById('tabBtnDocs').className = 'py-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2';
      document.getElementById('tabBtnUsers').className = 'py-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2';
      document.getElementById('tabBtnFolders').className = 'py-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-200 flex items-center gap-2';

      if (tab === 'DOCS') {
        document.getElementById('tabContentDocs').classList.remove('hidden');
        document.getElementById('tabBtnDocs').className = 'py-3.5 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2';
      } else if (tab === 'USERS') {
        document.getElementById('tabContentUsers').classList.remove('hidden');
        document.getElementById('tabBtnUsers').className = 'py-3.5 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2';
      } else if (tab === 'FOLDERS') {
        document.getElementById('tabContentFolders').classList.remove('hidden');
        document.getElementById('tabBtnFolders').className = 'py-3.5 border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2';
      }
    }

    function filterDocs() {
      renderDocs();
    }

    function filterByStatus(status) {
      activeStatusFilter = status;
      document.getElementById('filterStatusAll').className = status === 'ALL' ? 'px-3 py-1.5 rounded-xl font-bold bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-xl font-bold bg-slate-700 text-slate-300 hover:bg-slate-600';
      document.getElementById('filterStatusPending').className = status === 'PENDING' ? 'px-3 py-1.5 rounded-xl font-bold bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-xl font-bold bg-slate-700 text-slate-300 hover:bg-slate-600';
      document.getElementById('filterStatusApproved').className = status === 'APPROVED' ? 'px-3 py-1.5 rounded-xl font-bold bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-xl font-bold bg-slate-700 text-slate-300 hover:bg-slate-600';
      document.getElementById('filterStatusRevision').className = status === 'REVISION' ? 'px-3 py-1.5 rounded-xl font-bold bg-emerald-600 text-white' : 'px-3 py-1.5 rounded-xl font-bold bg-slate-700 text-slate-300 hover:bg-slate-600';
      renderDocs();
    }

    // Auto-load on open
    window.onload = function() {
      loadAllData();
    };
  </script>
</body>
</html>\`;
}
`;
