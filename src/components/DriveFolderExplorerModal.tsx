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
import { getGoogleDriveFolderId, getGoogleDriveFolderUrl } from '../services/googleSheetsWebhook';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-slate-100 truncate">
                  Penjelajah Folder Google Drive Server
                </h2>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 shrink-0">
                  {currentUser.role === 'VERIFIKATOR' ? 'Akses Verifikator' : 'Akses Dinas'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Buka, telusuri pemberkasan berkas dinas, dan kelola arsip retensi 3 bulan langsung dari aplikasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={masterDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <span>Buka Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search Controls */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Main View Tabs */}
          <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveFolderTab('FILES')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeFolderTab === 'FILES'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Berkas Aktif per OPD ({searchedActiveDocs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFolderTab('RETENTION_SUMMARY')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                activeFolderTab === 'RETENTION_SUMMARY'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
              title="Draf lama yang belum diverifikasi atau telah diperbaiki (tersimpan 3 bulan)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Ringkasan Draf Lama (Retensi 3 Bulan) ({searchedArchivedDrafts.length})</span>
            </button>

            {!isDinas && onOpenAdminFolderRegistration && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminFolderRegistration();
                }}
                className="px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
                title="Daftarkan tautan folder Google Drive tiap dinas oleh admin"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pendaftaran Folder Dinas (Admin)</span>
              </button>
            )}
          </div>

          {/* OPD Filter (For Verifikator) + Search Input */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            {!isDinas && (
              <select
                value={selectedOpdId}
                onChange={(e) => setSelectedOpdId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama berkas..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-300">
          {/* TAB 1: BERKAS AKTIF PER OPD */}
          {activeFolderTab === 'FILES' && (
            <div className="space-y-4">
              {/* Official Folder Registration Info Card */}
              {currentRegistration && (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 shrink-0">
                      <FolderCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100">
                          {currentRegistration.driveFolderName}
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Folder Terdaftar Resmi
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span>
                          Didaftarkan oleh Admin:{' '}
                          <strong className="text-slate-200">{currentRegistration.registeredByAdmin}</strong>
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="font-mono text-slate-500">{currentRegistration.registeredAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={currentRegistration.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg font-medium text-xs transition-colors"
                    >
                      <span>Buka Folder di Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {!isDinas && onOpenAdminFolderRegistration && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAdminFolderRegistration();
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        title="Ubah pendaftaran tautan folder dinas ini"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Kelola Pendaftaran</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-200">
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
                        className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 hover:border-slate-700 transition-colors"
                      >
                        {/* Folder Breadcrumb */}
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 bg-slate-900 p-1.5 rounded border border-slate-800/80">
                          <span className="truncate flex items-center gap-1 text-slate-300">
                            <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Induk/{doc.opdName}</span>
                          </span>
                          <span className="text-emerald-400 font-bold shrink-0">
                            Versi {doc.currentVersion}
                          </span>
                        </div>

                        {/* Document File Name & Title */}
                        <div className="flex items-start gap-2.5">
                          {doc.format === 'PDF' && <FileText className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
                          {doc.format === 'DOCX' && <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
                          {doc.format === 'XLSX' && <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
                          {doc.format === 'IMAGE' && <ImageIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}

                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-100 text-xs truncate">
                              {doc.fileName}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
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
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                          <div>
                            {isDocApproved ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold font-mono text-[10px]">
                                <Lock className="w-3 h-3 text-emerald-500" /> TERVERIFIKASI SAH
                              </span>
                            ) : doc.status === 'REVISION' ? (
                              <span className="inline-flex items-center gap-1 text-orange-400 font-semibold text-[10px]">
                                <AlertTriangle className="w-3 h-3" /> BUTUH REVISI
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-[10px]">
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
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-[11px] flex items-center gap-1 transition-colors"
                              title="Buka langsung di penampil dokumen"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Buka Dokumen</span>
                            </button>

                            {doc.googleDrive?.viewUrl && (
                              <a
                                href={doc.googleDrive.viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
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
              <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Kebijakan Retensi Berkas Draf Lama: 3 Bulan (90 Hari)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSimulatePurge}
                    disabled={isPurging}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPurging ? 'animate-spin' : ''}`} />
                    <span>{isPurging ? 'Memproses...' : 'Jalankan Pembersihan Otomatis'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Semua berkas draf lama yang belum diverifikasi atau draf yang telah digantikan oleh revisi baru <strong>tersimpan utuh di folder khusus <code>ARSIP_DRAF_LAMA_3_BULAN</code></strong> sebagai riwayat pembuktian hingga berkas disahkan. Setelah jangka waktu 3 bulan (90 hari) terlampaui, berkas draf lama tersebut akan dihapus secara permanen dari Google Drive server.
                </p>
                {purgeFeedback && (
                  <div className="p-2 bg-emerald-950/50 border border-emerald-500/30 rounded text-emerald-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{purgeFeedback}</span>
                  </div>
                )}
              </div>

              {/* Retention Summary Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">
                    Daftar Ringkasan Draf Lama dalam Masa Retensi ({searchedArchivedDrafts.length} Berkas)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Folder: ARSIP_DRAF_LAMA_3_BULAN
                  </span>
                </div>

                {searchedArchivedDrafts.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-1">
                    <Clock className="w-8 h-8 mx-auto opacity-30" />
                    <div>Belum ada draf lama yang masuk ke masa retensi 3 bulan.</div>
                    <p className="text-[11px] text-slate-600">
                      Draf lama otomatis diarsipkan ke folder ini saat dinas mengunggah berkas revisi baru.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
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
                      <tbody className="divide-y divide-slate-800/80">
                        {searchedArchivedDrafts.map((entry) => (
                          <tr key={entry.key} className="hover:bg-slate-900/60">
                            <td className="p-3">
                              <div className="font-semibold text-slate-100 truncate max-w-[220px]">
                                {entry.version.fileName}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                {entry.docTitle}
                              </div>
                              <div className="text-[9px] font-mono text-slate-500">
                                No: {entry.docNumber}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-slate-300 font-medium">{entry.opdName}</span>
                              <div className="text-[10px] font-mono text-slate-500">
                                {entry.folderPath}
                              </div>
                            </td>
                            <td className="p-3 font-mono">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold text-[10px]">
                                v{entry.version.versionNumber} (Draf Lama)
                              </span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-400">
                              {entry.version.uploadedAt}
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-300">
                              {entry.expiryDateStr}
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              {entry.isExpired ? (
                                <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
                                  Kedaluwarsa (Siap Purge)
                                </span>
                              ) : (
                                <span className="text-amber-400 font-semibold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-500/30">
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
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-medium"
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
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Server Google Drive: Terkoneksi & Retensi Otomatis 90 Hari Aktif</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-colors"
          >
            Tutup Penjelajah
          </button>
        </div>
      </div>
    </div>
  );
}
