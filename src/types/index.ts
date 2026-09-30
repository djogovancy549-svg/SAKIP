export type DocumentFormat = 'PDF' | 'DOCX' | 'XLSX' | 'IMAGE';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION';

export type AppRole = 'VERIFIKATOR' | 'DINAS_PEMOHON';

export interface OPD {
  id: string;
  name: string;
  shortName: string;
  code: string;
  category: string;
  address: string;
  badgeColor: string;
  driveFolderUrl?: string; // Tautan Google Drive yang didaftarkan oleh admin
  driveFolderId?: string; // ID folder Google Drive
  driveFolderName?: string; // Nama folder di Google Drive
  registeredByAdmin?: string; // Nama admin/verifikator yang mendaftarkan link
  registeredAt?: string; // Tanggal & waktu pendaftaran tautan
}

export interface OpdFolderRegistration {
  opdId: string;
  opdName: string;
  driveFolderUrl: string;
  driveFolderId: string;
  driveFolderName: string;
  registeredByAdmin: string;
  registeredAt: string;
  notes?: string;
}

export interface VerifierProfile {
  name: string;
  nip: string;
  jabatan: string;
  opdId: string;
  pangkat: string;
}

export interface UserAccount {
  id: string;
  username: string;
  nama: string;
  role: AppRole; // 'VERIFIKATOR' | 'DINAS_PEMOHON'
  opdId: string;
  opdName: string;
  nip: string;
  jabatan: string;
  pangkat?: string;
  password: string; // Plain/hashed password that can be changed
  lastPasswordChangedAt?: string;
  driveFolderId?: string; // Folder Google Drive khusus OPD ini
  driveFolderName?: string;
  driveFolderUrl?: string;
  email?: string;
}

export type NotificationType =
  | 'NEW_UPLOAD'
  | 'REVISION_UPLOAD'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'VERIFICATION_REVISION_NEEDED'
  | 'FOLDER_REGISTERED'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  targetRole: AppRole | 'ALL';
  targetOpdId?: string; // If OPD specific
  docId?: string;
  docNumber?: string;
  senderName: string;
  senderOpd: string;
  isRead: boolean;
}

export interface VerificationChecklistItem {
  id: string;
  label: string;
  category: 'ADMIN' | 'TEKNIS' | 'ANGGARAN';
  required: boolean;
}

export interface GoogleDriveStorageInfo {
  fileId: string;
  folderId: string;
  folderName: string; // Subfolder OPD dalam Google Drive Induk
  viewUrl: string; // Link pratinjau Google Drive
  downloadUrl: string; // Link unduh langsung dari Google Drive
  serverMasterFolder: string; // Nama folder induk yang menjadi server
  syncedAt: string;
}

export interface DocumentVersion {
  versionNumber: number;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  fileSize: string;
  changeSummary?: string; // Catatan perubahan dari dinas yang mengupload revisi
  status: VerificationStatus;
  reviewerNotes?: string; // Catatan yang hendak diubah dari bagian pemeriksa/verifikator
  checklist?: Record<string, boolean>;
  reviewedBy?: string;
  reviewedAt?: string;
  googleDrive?: GoogleDriveStorageInfo; // Penyimpanan di Google Drive Induk
  fileBase64?: string;
  fileBlobUrl?: string;
  // 3-Month Retention Archive Fields (Retensi 90 Hari Draf Lama)
  isArchived?: boolean; // True jika merupakan versi draf lama yang telah digantikan
  retentionExpiryDate?: string; // Tanggal kedaluwarsa 3 bulan dari pengunggahan
  retentionDaysLeft?: number; // Sisa hari sebelum dihapus permanen dari Google Drive
  archiveFolder?: string; // Subfolder arsip: ARSIP_DRAF_LAMA_3_BULAN
}

export interface RegistrationSeal {
  regNumber: string; // e.g. "REG-VERIF/DISDIK/2026/0892"
  issuedAt: string;
  examinedBy: string; // Petugas Pemeriksa Dokumen
  examinedNip: string;
  verifiedBy: string; // Pejabat Verifikator Akhir
  verifiedNip: string;
  bavNumber: string; // Nomor Berita Acara Verifikasi
  securityHash: string; // Hash pengaman digital tak terbantahkan
  qrCodeUrl: string;
  isLocked: boolean; // Dokumen terkunci permanen, tidak bisa diubah lagi
}

export interface VerificationResult {
  verifiedAt: string;
  verifiedBy: string;
  nip: string;
  jabatan: string;
  status: VerificationStatus;
  checklist: Record<string, boolean>;
  notes: string;
  qrCodeUrl: string;
  digitalSealHash: string;
  syncedToGoogleSheet: boolean;
  googleSheetTimestamp?: string;
  bavNumber: string;
}

export interface DocumentItem {
  id: string;
  nomorBerkas: string;
  judul: string;
  perihal: string;
  opdId: string; // Tenant isolation key
  opdName: string;
  pemohon: {
    nama: string;
    instansi: string;
    kontak: string;
    email: string;
  };
  tanggalMasuk: string;
  format: DocumentFormat;
  fileSize: string;
  fileName: string;
  status: VerificationStatus;
  urgency: 'TINGGI' | 'SEDANG' | 'STANDAR';
  
  // Revision Cycle & Versioning
  currentVersion: number;
  versions: DocumentVersion[];
  isLocked: boolean; // Terkunci permanen setelah verifikasi disetujui (tidak bisa diubah)
  registrationSeal?: RegistrationSeal; // Tanda registrasi resmi bahwa telah diperiksa & diverifikasi
  googleDrive?: GoogleDriveStorageInfo; // Lokasi penyimpanan di Google Drive Induk (Server)
  fileBase64?: string;
  fileBlobUrl?: string;

  // Format-specific simulated content
  content: {
    // For PDF (Official decree / agreement / minutes)
    kopSurat?: {
      pemerintah: string;
      instansi: string;
      alamat: string;
      nomorNaskah: string;
    };
    pdfPages?: Array<{
      pageNumber: number;
      title: string;
      sections: Array<{
        heading?: string;
        body: string;
        highlight?: boolean;
      }>;
      tableData?: Array<{
        col1: string;
        col2: string;
        col3: string;
        col4: string;
      }>;
    }>;

    // For DOCX (Official memorandum / proposal)
    docxData?: {
      kepada: string;
      dari: string;
      tembusan: string[];
      perihal: string;
      isiParagraf: string[];
      dasarHukum: string[];
      penutup: string;
      pejabatTtd: {
        nama: string;
        nip: string;
        jabatan: string;
      };
    };

    // For XLSX (Budget RAB / Finance report)
    xlsxData?: {
      sheetName: string;
      subKegiatan: string;
      kodeRekening: string;
      tahunAnggaran: string;
      totalAnggaran: number;
      rows: Array<{
        no: number;
        kode: string;
        uraian: string;
        volume: number;
        satuan: string;
        hargaSatuan: number;
        total: number;
        keterangan: string;
      }>;
    };

    // For IMAGE (Scanned original document / Certificate / Izin)
    imageData?: {
      imageUrl?: string;
      scanType: string;
      registrationNo: string;
      issueDate: string;
      validUntil: string;
      scanQuality: string;
      stampedAuthority: string;
      watermarkPreviewText: string;
    };
  };

  verification?: VerificationResult;
}

export interface WebhookSyncLog {
  id: string;
  docId: string;
  docNumber: string;
  opd: string;
  status: VerificationStatus;
  timestamp: string;
  success: boolean;
  responseMessage: string;
  payload: Record<string, unknown>;
}
