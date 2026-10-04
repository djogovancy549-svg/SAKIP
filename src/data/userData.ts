import { UserAccount } from '../types';

/**
 * Akun Pengguna Awal (Pemerintah Kabupaten Nagekeo)
 * Seluruh akun dikhususkan sebagai USER DINAS / OPD sesuai permintaan pengguna.
 * Akun Admin/Verifikator dilepas karena akan dikelola secara mandiri oleh tim teknis SAKIP.
 */
export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'USR-DENIN-01',
    username: 'deni',
    nama: 'Denin',
    role: 'DINAS_PEMOHON',
    opdId: 'DISDIKBUD',
    opdName: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    nip: '19890514 201201 1 003',
    jabatan: 'Operator SAKIP Dinas Pendidikan',
    pangkat: 'Penata (III/c)',
    password: 'deni',
    lastPasswordChangedAt: '2026-09-29 08:00',
    driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderName: 'Server Induk Verifikasi Kab. Nagekeo',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
  },
  {
    id: 'USR-DIKBUD-01',
    username: 'dinas.dikbud',
    nama: 'Dinas Pendidikan dan Kebudayaan Nagekeo',
    role: 'DINAS_PEMOHON',
    opdId: 'DISDIKBUD',
    opdName: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    nip: '19820514 200801 1 001',
    jabatan: 'Operator Utama SAKIP',
    pangkat: 'Penata Tk. I (III/d)',
    password: 'dinas.dikbud',
    lastPasswordChangedAt: '2026-10-01 08:00',
    driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderName: 'Server Induk Verifikasi Kab. Nagekeo',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
  },
  {
    id: 'USR-INSP-01',
    username: 'inspektorat',
    nama: 'Inspektorat Daerah Kabupaten Nagekeo',
    role: 'DINAS_PEMOHON',
    opdId: 'INSPEKTORAT',
    opdName: 'INSPEKTORAT',
    nip: '19850110 201001 1 008',
    jabatan: 'Operator SAKIP Inspektorat',
    pangkat: 'Pembina (IV/a)',
    password: 'inspektorat',
    lastPasswordChangedAt: '2026-10-01 08:00',
    driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
    driveFolderName: 'Server Induk Verifikasi Kab. Nagekeo',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
  },
];
