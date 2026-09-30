import { OpdFolderRegistration } from '../types';

/**
 * Registrasi Folder Google Drive Awal
 * Hanya memuat 1 folder yang sudah didaftarkan admin.
 * OPD lainnya berstatus kosong (belum didaftarkan) sampai didaftarkan oleh admin.
 */
export const INITIAL_OPD_FOLDER_REGISTRATIONS: Record<string, OpdFolderRegistration> = {
  SETDA: {
    opdId: 'SETDA',
    opdName: 'SEKRETARIAT DAERAH',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderName: 'Google Drive Induk / 01_SETDA',
    registeredByAdmin: 'Administrator SAKIP Nagekeo',
    registeredAt: '2026-09-29 19:30',
    notes: 'Folder resmi Google Drive SAKIP Kabupaten Nagekeo',
  },
};
