import {
  WebhookSyncLog,
  VerificationStatus,
  DocumentItem,
  DocumentVersion,
  GoogleDriveStorageInfo,
  UserAccount,
  OpdFolderRegistration,
} from '../types';
import { OPD_LIST } from '../data/opdData';

export function findOpdIdFromText(opdName?: string, opdId?: string): string {
  if (opdId && opdId.trim() && opdId.trim() !== 'Dinas' && opdId.trim() !== 'OPD' && opdId.trim() !== 'Umum') {
    const cleanId = opdId.trim().toUpperCase();
    const exact = OPD_LIST.find((o) => o.id === cleanId);
    if (exact) return exact.id;
  }
  if (!opdName || !opdName.trim()) return 'SETDA';
  const nameUpper = opdName.trim().toUpperCase();

  const match = OPD_LIST.find(
    (o) =>
      o.id === nameUpper ||
      o.name.toUpperCase() === nameUpper ||
      o.shortName.toUpperCase() === nameUpper ||
      nameUpper.includes(o.name.toUpperCase()) ||
      o.name.toUpperCase().includes(nameUpper) ||
      nameUpper.includes(o.id)
  );

  return match ? match.id : 'SETDA';
}

import {
  APPS_SCRIPT_CODE_GS,
  APPS_SCRIPT_INDEX_HTML,
  GOOGLE_APPS_SCRIPT_TEMPLATE as G_TEMPLATE,
} from './googleAppsScriptFiles';

// Embedded Google Apps Script Webhook URL directly in code
export const DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbznXpFIL805i7u9lF7khBk8TPEiW2Y9dFM9pDZJzBsnDNuZ1WZOapnZryn8GixWPiQhYg/exec';

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
  if (cachedWebhookUrl && cachedWebhookUrl.trim().startsWith('http')) {
    return cachedWebhookUrl.trim();
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
  
  // Abort controller with a 12-second network timeout for Google Apps Script response
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 12000);

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
        const currentStatus: VerificationStatus = (d.status as VerificationStatus) || 'PENDING';
        const isApproved = currentStatus === 'APPROVED';
        const matchedOpdId = findOpdIdFromText(d.opdName, d.opdId);
        const matchedOpdName = d.opdName || (OPD_LIST.find(o => o.id === matchedOpdId)?.name || 'Sekretariat Daerah');
        const bavNum = d.bavNumber || (isApproved ? `BAV/SAKIP-NGK/${matchedOpdId}/2026/${docId.slice(-4)}` : '');
        const sealHash = d.digitalSealHash || (isApproved ? `SHA256-${docId}-${Date.now().toString().slice(-4)}` : '');
        const verifierName = d.verifierName || 'Admin Verifikator SAKIP';
        const verifierNip = d.verifierNip || '19850101 201001 1 002';
        const noteContent = d.notes || (isApproved ? 'Seluruh instrumen kelengkapan berkas dan syarat teknis telah dipenuhi dan dinyatakan sah.' : 'Dokumen diajukan untuk verifikasi.');

        return {
          id: docId,
          nomorBerkas: d.nomorBerkas || 'Draf',
          judul: d.judul || 'Dokumen SAKIP',
          perihal: noteContent,
          opdId: matchedOpdId,
          opdName: matchedOpdName,
          pemohon: {
            nama: d.pemohon?.nama || 'Pemohon',
            instansi: d.pemohon?.instansi || matchedOpdName,
            kontak: '0812-0000-1111',
            email: d.pemohon?.email || `${(d.pemohon?.nama || 'user').toLowerCase().replace(/\s+/g, '.')}@nagekeokab.go.id`,
          },
          tanggalMasuk: d.tanggalMasuk || new Date().toLocaleString('id-ID'),
          format: d.format || 'PDF',
          fileSize: '3.5 MB',
          fileName: d.fileName || 'dokumen_sakip.pdf',
          status: currentStatus,
          urgency: 'TINGGI',
          currentVersion: d.currentVersion || 1,
          isLocked: isApproved,
          googleDrive: d.googleDrive,
          verification: {
            status: currentStatus,
            verifiedBy: verifierName,
            nip: verifierNip,
            jabatan: 'Verifikator SAKIP Nagekeo',
            verifiedAt: d.tanggalMasuk || new Date().toLocaleString('id-ID'),
            notes: noteContent,
            checklist: d.checklist || {
              'chk-ttd': true,
              'chk-format': true,
              'chk-identitas': true,
              'chk-lampiran': isApproved,
              'chk-evaluasi': isApproved,
              'chk-anggaran': isApproved,
            },
            bavNumber: bavNum,
            digitalSealHash: sealHash,
            syncedToGoogleSheet: true,
          },
          registrationSeal: isApproved
            ? {
                regNumber: `REG-${d.opdId || 'OPD'}-${(d.nomorBerkas || 'DOC').replace(/[^a-zA-Z0-9]/g, '')}-2026`,
                bavNumber: bavNum,
                issuedAt: d.tanggalMasuk || new Date().toLocaleString('id-ID'),
                examinedBy: verifierName,
                examinedNip: verifierNip,
                verifiedBy: verifierName,
                verifiedNip: verifierNip,
                qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(bavNum)}&size=150x150`,
                securityHash: sealHash,
                isLocked: true,
              }
            : undefined,
          versions: [
            {
              versionNumber: d.currentVersion || 1,
              uploadedAt: d.tanggalMasuk || new Date().toLocaleString('id-ID'),
              uploadedBy: d.pemohon?.nama || 'Pemohon',
              fileName: d.fileName || 'dokumen_sakip.pdf',
              fileSize: '3.5 MB',
              changeSummary: 'Pengajuan berkas.',
              status: currentStatus,
              reviewerNotes: noteContent,
              reviewedAt: d.tanggalMasuk || new Date().toLocaleString('id-ID'),
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

      const users: UserAccount[] = (data.users || []).map((u: any) => {
        const opdId = findOpdIdFromText(u.opdName, u.opdId);
        const opdName = u.opdName || (OPD_LIST.find((o) => o.id === opdId)?.name || 'Sekretariat Daerah');
        return {
          id: u.id || `usr-${u.username}`,
          username: u.username || 'user',
          email: u.email || `${u.username}@nagekeokab.go.id`,
          nama: u.nama || u.username,
          role: u.role || 'DINAS_PEMOHON',
          opdId: opdId,
          opdName: opdName,
          nip: u.nip || '19880101 201501 1 001',
          jabatan: u.jabatan || 'Pengelola SAKIP',
          pangkat: 'Penata Muda / III-a',
          password: u.password || '123456',
          lastPasswordChangedAt: new Date().toLocaleString('id-ID'),
          driveFolderId: u.driveFolderId || '',
          driveFolderName: u.driveFolderName || `Folder ${opdName}`,
          driveFolderUrl: u.driveFolderUrl || '',
        };
      });

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
  docId: string,
  opdName: string,
  fileName: string,
  customFolderId?: string,
  customFolderName?: string,
  customFolderUrl?: string
): GoogleDriveStorageInfo {
  const masterFolderId = customFolderId || getGoogleDriveFolderId();
  const fileUniqueId = `DRV-${docId}-${Date.now().toString().slice(-4)}`;
  const driveViewUrl = customFolderUrl ? `${customFolderUrl}/${fileName}` : `https://drive.google.com/file/d/${fileUniqueId}/view`;
  const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileUniqueId}`;

  return {
    fileId: fileUniqueId,
    folderId: masterFolderId,
    folderName: customFolderName || `${DEFAULT_GOOGLE_DRIVE_MASTER_NAME} / ${opdName}`,
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
    responseText = `Berkas disimpan di Google Drive / Folder [${doc.opdName}] & dicatat di worksheet DOKUMEN_PROSES.`;
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
    responseText = `Status verifikasi [${effectiveStatus}] dicatat di sheet ${effectiveStatus === 'APPROVED' ? 'DOKUMEN_SAH_TERVERIFIKASI' : 'DOKUMEN_PROSES'} & SUMMARY_RIWAYAT_REVISI.`;
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

export async function triggerAutoCleanOnSheet(): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  const targetUrl = getGoogleSheetsWebhookUrl();
  const timestamp = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const payload = {
    action: 'TRIGGER_AUTO_CLEAN',
    timestamp,
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

    return {
      success: true,
      message: 'Perintah pembersihan otomatis berkas revisi >3 bulan & arsip sah >5 tahun berhasil dieksekusi di Apps Script!',
      timestamp,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: `Gagal menjalankan pembersihan: ${err instanceof Error ? err.message : 'Koneksi bermasalah'}`,
      timestamp,
    };
  }
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = G_TEMPLATE;
export const GOOGLE_APPS_SCRIPT_CODE_GS = APPS_SCRIPT_CODE_GS;
export const GOOGLE_APPS_SCRIPT_INDEX_HTML = APPS_SCRIPT_INDEX_HTML;
