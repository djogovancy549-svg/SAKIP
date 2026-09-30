import { OpdFolderRegistration } from '../types';

export const INITIAL_OPD_FOLDER_REGISTRATIONS: Record<string, OpdFolderRegistration> = {
  SETDA: {
    opdId: 'SETDA',
    opdName: 'SEKRETARIAT DAERAH',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderName: 'Google Drive Induk / 01_SETDA',
    registeredByAdmin: 'Admin Verifikator Pusat (Drs. Lukas Mbulu, M.Si.)',
    registeredAt: '2026-09-01 08:30',
    notes: 'Folder resmi pemberkasan Sekretariat Daerah Kabupaten Nagekeo',
  },
  DISKOMINFO: {
    opdId: 'DISKOMINFO',
    opdName: 'DINAS KOMUNIKASI DAN INFORMATIKA',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderName: 'Google Drive Induk / 17_DISKOMINFO',
    registeredByAdmin: 'Admin Verifikator Pusat (Drs. Lukas Mbulu, M.Si.)',
    registeredAt: '2026-09-01 08:35',
    notes: 'Folder resmi pemberkasan Kominfo, naskah TIK, dan SPBE',
  },
};
