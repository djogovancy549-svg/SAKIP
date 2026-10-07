import { useState } from 'react';
import {
  X,
  HardDrive,
  Folder,
  FolderTree,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Download,
  Trash2,
  Calendar,
  History,
  Building2,
  CheckCircle2,
  Lock,
  Search,
  Eye,
  RefreshCw,
  FolderPlus,
  FolderCheck,
} from 'lucide-react';
import { DocumentItem, OPD, UserAccount, DocumentVersion, OpdFolderRegistration } from '../types';
import { getGoogleDriveFolderId, getGoogleDriveFolderUrl, sanitizeGoogleDriveUrl } from '../services/googleSheetsWebhook';
import { calculateRetention, formatArchiveSubfolder } from '../utils/retentionUtils';
import { OPD_LIST } from '../data/opdData';

interface DriveFolderExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  currentUser: UserAccount;
  folderRegistrations?: Record<string, OpdFolderRegistration>;
  onSelectDocument: (doc: DocumentItem) => void;
  onPurgeOldDrafts: (purgedVersionKeys: string[]) => void;
  onOpenAdminFolderRegistration?: () => void;
}

export function DriveFolderExplorerModal({
  isOpen,
  onClose,
  documents,
  currentUser,
  folderRegistrations = {},
  onSelectDocument,
  onPurgeOldDrafts,
  onOpenAdminFolderRegistration,
}: DriveFolderExplorerModalProps) {
  const [activeFolderTab, setActiveFolderTab] = useState<'FILES' | 'RETENTION_SUMMARY'>('FILES');
  const [selectedOpdId, setSelectedOpdId] = useState<string>(
    currentUser.role === 'DINAS_PEMOHON' ? currentUser.opdId : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeFeedback, setPurgeFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDinas = currentUser.role === 'DINAS_PEMOHON';
  const masterDriveUrl = getGoogleDriveFolderUrl();

  // Filter OPDs: If Dinas, only their own OPD; if Verifikator, all OPDs
  const availableOpds = isDinas
    ? OPD_LIST.filter((o) => o.id === currentUser.opdId)
    : OPD_LIST;

  // Filter documents by selected OPD
  const opdFilteredDocs = documents.filter((doc) => {
    if (selectedOpdId !== 'ALL' && doc.opdId !== selectedOpdId) return false;
    if (isDinas && doc.opdId !== currentUser.opdId) return false;
    return true;
  });

  // Current selected OPD registration details
  const currentOpdKey = isDinas ? currentUser.opdId : selectedOpdId !== 'ALL' ? selectedOpdId : null;
  const currentRegistration = currentOpdKey ? folderRegistrations[currentOpdKey] : null;

  // Collect all historical draft versions for 3-Month Retention Summary
  // (Old unverified drafts, replaced revisions, and preliminary versions)
  interface ArchivedDraftEntry {
    key: string;
    docId: string;
    docNumber: string;
    docTitle: string;
    opdId: string;
    opdName: string;
    version: DocumentVersion;
    expiryDateStr: string;
    daysLeft: number;
    isExpired: boolean;
    folderPath: string;
  }

  const archivedDrafts: ArchivedDraftEntry[] = [];

  documents.forEach((doc) => {
    if (isDinas && doc.opdId !== currentUser.opdId) return;
    if (selectedOpdId !== 'ALL' && doc.opdId !== selectedOpdId) return;

    doc.versions.forEach((ver) => {
      // It is an old replaced draft if version number < currentVersion or explicitly marked isArchived
      const isReplacedDraft = ver.versionNumber < doc.currentVersion || !!ver.isArchived;
      if (isReplacedDraft) {
        const retention = calculateRetention(ver.uploadedAt);
        archivedDrafts.push({
          key: `${doc.id}-v${ver.versionNumber}`,
          docId: doc.id,
          docNumber: doc.nomorBerkas,
          docTitle: doc.judul,
          opdId: doc.opdId,
          opdName: doc.opdName,
          version: ver,
          expiryDateStr: ver.retentionExpiryDate || retention.expiryDateStr,
          daysLeft: ver.retentionDaysLeft !== undefined ? ver.retentionDaysLeft : retention.daysLeft,
          isExpired: retention.isExpired,
          folderPath: formatArchiveSubfolder(doc.opdName),
        });
      }
    });
  });

  // Filter files by search query
  const searchedActiveDocs = opdFilteredDocs.filter(
    (d) =>
      d.nomorBerkas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchedArchivedDrafts = archivedDrafts.filter(
    (a) =>
      a.docNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.docTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.version.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSimulatePurge = () => {
    setIsPurging(true);
    setPurgeFeedback(null);
    setTimeout(() => {
      setIsPurging(false);
      setPurgeFeedback(
        'Sistem pembersih otomatis 3 bulan Google Drive aktif. Seluruh draf lama tercatat dalam log audit retensi 90 hari.'
      );
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200/90 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
        {/* Header Bar - Elegant Bright Blue */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-white shrink-0 shadow-xs">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-white truncate drop-shadow-xs">
                  Penjelajah Folder Google Drive Server
                </h2>
                <span className="text-[10px] font-mono bg-white/20 text-white font-bold px-2 py-0.5 rounded-full border border-white/30 shrink-0">
                  {currentUser.role === 'VERIFIKATOR' ? 'Akses Verifikator' : 'Akses Dinas'}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 truncate">
                Buka, telusuri pemberkasan berkas dinas, dan kelola arsip retensi 3 bulan langsung dari aplikasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={masterDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold border border-white/30 transition-colors"
            >
              <span>Buka Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search Controls */}
        <div className="bg-blue-50/70 border-b border-blue-100 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Main View Tabs */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-blue-200 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setActiveFolderTab('FILES')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFolderTab === 'FILES'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Berkas Aktif per OPD ({searchedActiveDocs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFolderTab('RETENTION_SUMMARY')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeFolderTab === 'RETENTION_SUMMARY'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-amber-800 hover:text-amber-900'
              }`}
              title="Draf lama yang belum diverifikasi atau telah diperbaiki (tersimpan 3 bulan)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Ringkasan Draf Lama (Retensi 3 Bulan) ({searchedArchivedDrafts.length})</span>
            </button>

            {onOpenAdminFolderRegistration && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminFolderRegistration();
                }}
                className="px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 cursor-pointer font-bold"
                title="Daftarkan & kelola tautan folder Google Drive tiap dinas"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kelola Folder Dinas</span>
              </button>
            )}
          </div>

          {/* OPD Filter (For Verifikator) + Search Input */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            {!isDinas && (
              <select
                value={selectedOpdId}
                onChange={(e) => setSelectedOpdId(e.target.value)}
                className="bg-white border border-blue-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs font-medium cursor-pointer"
              >
                <option value="ALL">Semua Folder Dinas</option>
                {availableOpds.map((opd) => (
                  <option key={opd.id} value={opd.id}>
                    {opd.shortName}
                  </option>
                ))}
              </select>
            )}

            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama berkas..."
                className="w-full bg-white border border-blue-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 bg-sky-50/30">
          {/* TAB 1: BERKAS AKTIF PER OPD */}
          {activeFolderTab === 'FILES' && (
            <div className="space-y-4">
              {/* Official Folder Registration Info Card */}
              {currentRegistration && (
                <div className="p-3.5 bg-white border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-600 shrink-0">
                      <FolderCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          {currentRegistration.driveFolderName}
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                          Folder Terdaftar Resmi
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span>
                          Didaftarkan oleh Admin:{' '}
                          <strong className="text-slate-800">{currentRegistration.registeredByAdmin}</strong>
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-slate-600">{currentRegistration.registeredAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={currentRegistration.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs transition-colors"
                    >
                      <span>Buka Folder di Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {onOpenAdminFolderRegistration && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAdminFolderRegistration();
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Ubah & kelola pendaftaran tautan folder dinas ini"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kelola Pendaftaran</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-600 border-b border-blue-100 pb-2">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-blue-950">
                    Struktur Folder Aktif di Google Drive Server
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">
                  Menampilkan berkas resmi terbaru yang sedang diproses / disahkan
                </span>
              </div>

              {searchedActiveDocs.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <Folder className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                  <div>Tidak ada berkas ditemukan pada folder yang dipilih.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchedActiveDocs.map((doc) => {
                    const isDocApproved = doc.status === 'APPROVED';

                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          onSelectDocument(doc);
                          onClose();
                        }}
                        className="p-3.5 bg-white border border-blue-200 rounded-xl space-y-2.5 hover:border-blue-500 hover:shadow-md transition-all shadow-xs cursor-pointer group"
                        title="Klik untuk membuka dokumen ini"
                      >
                        {/* Folder Breadcrumb */}
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-600 bg-blue-50/80 p-1.5 rounded border border-blue-100">
                          <span className="truncate flex items-center gap-1 text-slate-700">
                            <Folder className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Induk/{doc.opdName}</span>
                          </span>
                          <span className="text-blue-700 font-bold shrink-0">
                            Versi {doc.currentVersion}
                          </span>
                        </div>

                        {/* Document File Name & Title */}
                        <div className="flex items-start gap-2.5">
                          {doc.format === 'PDF' && <FileText className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                          {doc.format === 'DOCX' && <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
                          {doc.format === 'XLSX' && <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                          {doc.format === 'IMAGE' && <ImageIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 text-xs truncate">
                              {doc.fileName}
                            </div>
                            <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                              {doc.judul}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                              <span>No: {doc.nomorBerkas}</span>
                              <span>·</span>
                              <span>{doc.fileSize}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                          <div>
                            {isDocApproved ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Lock className="w-3 h-3 text-emerald-600" /> TERVERIFIKASI SAH
                              </span>
                            ) : doc.status === 'REVISION' ? (
                              <span className="inline-flex items-center gap-1 text-orange-700 font-semibold text-[10px] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                                <AlertTriangle className="w-3 h-3" /> BUTUH REVISI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-800 font-semibold text-[10px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3" /> DALAM PEMERIKSAAN
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectDocument(doc);
                                onClose();
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Buka langsung di penampil dokumen"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Buka Dokumen</span>
                            </button>

                            {doc.googleDrive?.viewUrl && (
                              <a
                                href={sanitizeGoogleDriveUrl(doc.googleDrive.viewUrl)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                title="Buka berkas di Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RINGKASAN ARSIP DRAF LAMA (RETENSI 3 BULAN) */}
          {activeFolderTab === 'RETENTION_SUMMARY' && (
            <div className="space-y-4">
              {/* Policy Explanation Banner */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Kebijakan Retensi Berkas Draf Lama: 3 Bulan (90 Hari)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulatePurge}
                    disabled={isPurging}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPurging ? 'animate-spin' : ''}`} />
                    <span>{isPurging ? 'Memproses...' : 'Jalankan Pembersihan Otomatis'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-amber-950/80 leading-relaxed">
                  Semua berkas draf lama yang belum diverifikasi atau draf yang telah digantikan oleh revisi baru <strong>tersimpan utuh di folder khusus <code>ARSIP_DRAF_LAMA_3_BULAN</code></strong> sebagai riwayat pembuktian hingga berkas disahkan. Setelah jangka waktu 3 bulan (90 hari) terlampaui, berkas draf lama tersebut akan dihapus secara permanen dari Google Drive server.
                </p>
                {purgeFeedback && (
                  <div className="p-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-[11px] flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{purgeFeedback}</span>
                  </div>
                )}
              </div>

              {/* Retention Summary Table */}
              <div className="border border-blue-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-950">
                    Daftar Ringkasan Draf Lama dalam Masa Retensi ({searchedArchivedDrafts.length} Berkas)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Folder: ARSIP_DRAF_LAMA_3_BULAN
                  </span>
                </div>

                {searchedArchivedDrafts.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-1">
                    <Clock className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                    <div>Belum ada draf lama yang masuk ke masa retensi 3 bulan.</div>
                    <p className="text-[11px] text-slate-500">
                      Draf lama otomatis diarsipkan ke folder ini saat dinas mengunggah berkas revisi baru.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="p-3">Nama Berkas & Dokumen</th>
                          <th className="p-3">OPD Pemohon</th>
                          <th className="p-3">Versi</th>
                          <th className="p-3">Tanggal Unggah</th>
                          <th className="p-3">Kedaluwarsa (3 Bulan)</th>
                          <th className="p-3">Sisa Waktu Simpan</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {searchedArchivedDrafts.map((entry) => (
                          <tr key={entry.key} className="hover:bg-blue-50/40">
                            <td className="p-3">
                              <div className="font-semibold text-slate-900 truncate max-w-[220px]">
                                {entry.version.fileName}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[220px]">
                                {entry.docTitle}
                              </div>
                              <div className="text-[9px] font-mono text-slate-400">
                                No: {entry.docNumber}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-800 font-medium">{entry.opdName}</span>
                              <div className="text-[10px] font-mono text-slate-500">
                                {entry.folderPath}
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                                v{entry.version.versionNumber} (Draf Lama)
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-600">
                              {entry.version.uploadedAt}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-700 font-semibold">
                              {entry.expiryDateStr}
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              {entry.isExpired ? (
                                <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  Kedaluwarsa (Siap Purge)
                                </span>
                              ) : (
                                <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Sisa {entry.daysLeft} Hari
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetDoc = documents.find((d) => d.id === entry.docId);
                                    if (targetDoc) {
                                      onSelectDocument(targetDoc);
                                      onClose();
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Lihat riwayat di aplikasi"
                                >
                                  Lihat Riwayat
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-blue-50/70 border-t border-blue-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700">Server Google Drive: Terkoneksi & Retensi Otomatis 90 Hari Aktif</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
          >
            Tutup Penjelajah
          </button>
        </div>
      </div>
    </div>
  );
}
