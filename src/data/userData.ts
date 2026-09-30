import { UserAccount } from '../types';

/**
 * Akun Pengguna Awal (Pemerintah Kabupaten Nagekeo)
 * Akun Master Admin & Tim Verifikator Pusat untuk inisialisasi awal.
 * Akun Dinas OPD dapat didaftarkan secara mandiri melalui menu "Daftar Folder Dinas / Akun Baru".
 */
export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'USR-ADMIN-01',
    username: 'admin',
    nama: 'Administrator SIMVERIF Nagekeo',
    role: 'VERIFIKATOR',
    opdId: 'SETDA',
    opdName: 'Sekretariat Daerah / Tim Verifikator Nagekeo',
    nip: '19820514 200801 1 001',
    jabatan: 'Administrator SIMVERIF & Analis Kebijakan',
    pangkat: 'Pembina (IV/a)',
    password: 'Admin@2026!',
    lastPasswordChangedAt: '2026-09-01 08:00',
    driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderName: 'Server Induk Verifikasi Kab. Nagekeo',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
  },
  {
    id: 'USR-VERIF-01',
    username: 'verifikator.pusat',
    nama: 'Tim Verifikator Terpadu Kab. Nagekeo',
    role: 'VERIFIKATOR',
    opdId: 'SETDA',
    opdName: 'Tim Verifikator Terpadu Kab. Nagekeo',
    nip: '19850110 201001 1 008',
    jabatan: 'Koordinator Verifikasi Digital & Dokumen',
    pangkat: 'Penata Tk. I (III/d)',
    password: 'Verif@Pusat2026',
    lastPasswordChangedAt: '2026-09-01 08:00',
    driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderName: 'Server Induk Verifikasi Kab. Nagekeo',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
  },
];
