import { useState } from 'react';
import {
  Search,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  ShieldCheck,
  Building2,
  Clock,
  AlertTriangle,
  XCircle,
  Lock,
  UploadCloud,
  Layers,
  CheckCircle2,
  Filter,
  Plus,
  RefreshCw,
  FolderOpen,
  Edit3,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { DocumentItem, DocumentFormat, VerificationStatus, OPD, AppRole, UserAccount } from '../types';
import { OPD_LIST } from '../data/opdData';

interface DocumentListProps {
  documents: DocumentItem[];
  selectedDocument: DocumentItem | null;
  onSelectDocument: (doc: DocumentItem) => void;
  activeOpd: OPD;
  appRole: AppRole;
  currentUser?: UserAccount | null;
  onOpenRevisionModalForDoc?: (doc: DocumentItem) => void;
  onSelectOpd?: (opd: OPD) => void;
  onOpenUploadModal?: () => void;
  onOpenEditModal?: (doc: DocumentItem) => void;
  onDeleteDocument?: (docId: string) => void;
  onOpenVerificationForm?: (doc: DocumentItem) => void;
}

export function DocumentList({
  documents,
  selectedDocument,
  onSelectDocument,
  activeOpd,
  appRole,
  currentUser,
  onOpenRevisionModalForDoc,
  onSelectOpd,
  onOpenUploadModal,
  onOpenEditModal,
  onDeleteDocument,
  onOpenVerificationForm,
}: DocumentListProps) {
  const isVerifier = appRole === 'VERIFIKATOR';
  const [opdScope, setOpdScope] = useState<'ALL' | 'SINGLE'>(isVerifier ? 'ALL' : 'SINGLE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | DocumentFormat>('ALL');

  // Robust OPD & User Filtering:
  // If verifier and opdScope is ALL, show all documents across all 38 OPDs;
  // Otherwise filter by active OPD, and if user is Dinas, ensure all their OPD documents are included.
  const opdDocuments = isVerifier && opdScope === 'ALL'
    ? documents
    : documents.filter((doc) => {
        // Direct matching by OPD ID
        if (doc.opdId && activeOpd?.id && (doc.opdId === activeOpd.id || doc.opdId.toUpperCase() === activeOpd.id.toUpperCase())) return true;
        // Matching by OPD name or shortName
        if (doc.opdName && activeOpd?.name && (
          doc.opdName.toLowerCase() === activeOpd.name.toLowerCase() ||
          doc.opdName.toLowerCase().includes(activeOpd.shortName?.toLowerCase() || '') ||
          activeOpd.name.toLowerCase().includes(doc.opdName.toLowerCase())
        )) return true;
        // When logged in as Dinas Pemohon, ensure ALL documents belonging to user's OPD or pemohon are visible:
        if (!isVerifier && currentUser) {
          if (currentUser.opdId && (doc.opdId === currentUser.opdId || doc.opdId?.toUpperCase() === currentUser.opdId.toUpperCase())) return true;
          if (currentUser.opdName && doc.opdName && (
            doc.opdName.toLowerCase() === currentUser.opdName.toLowerCase() ||
            doc.opdName.toLowerCase().includes(currentUser.opdName.toLowerCase()) ||
            currentUser.opdName.toLowerCase().includes(doc.opdName.toLowerCase())
          )) return true;
          if (currentUser.email && doc.pemohon?.email && doc.pemohon.email.toLowerCase() === currentUser.email.toLowerCase()) return true;
          if (currentUser.nama && doc.pemohon?.nama && doc.pemohon.nama.toLowerCase() === currentUser.nama.toLowerCase()) return true;
        }
        return false;
      });

  // Apply search and status filters
  const filteredDocuments = opdDocuments.filter((doc) => {
    const matchesSearch =
      doc.nomorBerkas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.opdName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.pemohon.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.pemohon.instansi.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    const matchesFormat = formatFilter === 'ALL' || doc.format === formatFilter;

    return matchesSearch && matchesStatus && matchesFormat;
  });

  // Calculate status counts
  const pendingCount = opdDocuments.filter((d) => d.status === 'PENDING').length;
  const approvedCount = opdDocuments.filter((d) => d.status === 'APPROVED').length;
  const revisionCount = opdDocuments.filter((d) => d.status === 'REVISION').length;
  const rejectedCount = opdDocuments.filter((d) => d.status === 'REJECTED').length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setFormatFilter('ALL');
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-300 rounded-2xl shadow-xl overflow-hidden text-slate-900">
      {/* Top Header Strip: Scope & OPD Info */}
      <div className="p-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white border-b border-blue-500 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-sky-200 shrink-0" />
            <h2 className="font-bold text-white text-xs sm:text-sm truncate drop-shadow-xs">
              {isVerifier && opdScope === 'ALL'
                ? 'Semua Antrean Masuk Pemkab Nagekeo'
                : activeOpd.name}
            </h2>
          </div>

          <span className="text-[10px] bg-white/20 border border-white/30 text-white px-2.5 py-0.5 rounded-full font-mono font-bold shrink-0">
            {opdDocuments.length} Berkas
          </span>
        </div>

        {/* Verifier Scope Toggle Bar */}
        {isVerifier && (
          <div className="grid grid-cols-2 p-1 bg-white/20 backdrop-blur-md rounded-xl border border-white/25 text-xs font-bold mt-2">
            <button
              onClick={() => setOpdScope('ALL')}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer truncate flex items-center justify-center gap-1.5 ${
                opdScope === 'ALL'
                  ? 'bg-white text-blue-900 shadow-xs font-black'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua OPD ({documents.length})</span>
            </button>
            <button
              onClick={() => setOpdScope('SINGLE')}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer truncate flex items-center justify-center gap-1.5 ${
                opdScope === 'SINGLE'
                  ? 'bg-white text-blue-900 shadow-xs font-black'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Hanya {activeOpd.shortName}</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Bar with High Contrast */}
      <div className="p-3 border-b border-slate-200 bg-slate-50">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor berkas, judul, dinas, pemohon..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 shadow-2xs"
          />
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="p-2 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`py-1.5 px-1 rounded-lg transition-colors truncate text-center cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Semua ({opdDocuments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`py-1.5 px-1 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-900 hover:bg-amber-50'
            }`}
            title="Dalam Pemeriksaan Awal"
          >
            <span>Periksa</span>
            <span className="font-mono">({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('REVISION')}
            className={`py-1.5 px-1 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'REVISION'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-orange-900 hover:bg-orange-50'
            }`}
            title="Perlu Revisi Dinas"
          >
            <span>Revisi</span>
            <span className="font-mono">({revisionCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`py-1.5 px-1 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-900 hover:bg-emerald-50'
            }`}
            title="Diverifikasi & Terkunci"
          >
            <span>Sah</span>
            <span className="font-mono">({approvedCount})</span>
          </button>
        </div>
      </div>

      {/* Format Filter Badges */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-[11px] no-scrollbar">
        <span className="text-slate-700 font-bold shrink-0">Format:</span>
        {(['ALL', 'PDF', 'DOCX', 'XLSX', 'IMAGE'] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => setFormatFilter(fmt)}
            className={`px-2.5 py-0.5 rounded-md transition-colors whitespace-nowrap font-semibold cursor-pointer ${
              formatFilter === fmt
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {fmt === 'ALL' ? 'Semua Format' : fmt}
          </button>
        ))}
      </div>

      {/* Document Items List / Clear Empty State */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 bg-slate-50/50">
        {filteredDocuments.length === 0 ? (
          <div className="py-10 px-4 text-center bg-white rounded-2xl border-2 border-slate-200 m-2 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-200">
              <FileText className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-sm md:text-base">
                Tidak Ada Dokumen pada Antrean Ini
              </h3>
              <p className="text-xs text-slate-700 font-medium max-w-sm mx-auto leading-relaxed">
                {isVerifier
                  ? `Saat ini belum ada berkas masuk untuk ${activeOpd.name}. Anda dapat melihat berkas dari OPD lain atau membuka antrean seluruh dinas.`
                  : `Belum ada dokumen yang diajukan oleh akun ${activeOpd.name}. Silakan unggah dokumen baru melalui tombol di bawah.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {/* If Verifier and in SINGLE mode, button to switch to ALL OPDs */}
              {isVerifier && opdScope === 'SINGLE' && (
                <button
                  type="button"
                  onClick={() => setOpdScope('ALL')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Layers className="w-4 h-4" />
                  <span>Buka Antrean Semua OPD ({documents.length} Berkas)</span>
                </button>
              )}

              {/* Upload Document Button */}
              {onOpenUploadModal && (
                <button
                  type="button"
                  onClick={onOpenUploadModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Unggah Dokumen Baru</span>
                </button>
              )}

              {/* Reset Search Button if search is active */}
              {(searchQuery || statusFilter !== 'ALL' || formatFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 border border-slate-300 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Filter Pencarian</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const isSelected = selectedDocument?.id === doc.id;
            const isDocLocked = doc.isLocked || doc.status === 'APPROVED';

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`w-full text-left p-3 rounded-xl transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 shadow-md ring-2 ring-blue-500/30'
                    : 'bg-white border-slate-300 hover:bg-slate-50 hover:border-blue-400 shadow-2xs'
                }`}
              >
                {/* OPD Badge if in ALL view */}
                {isVerifier && opdScope === 'ALL' && (
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md font-mono border border-blue-200">
                      <Building2 className="w-3 h-3 text-blue-700" />
                      <span>{doc.opdName}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-semibold">
                      {doc.tanggalMasuk.split(' ')[0]}
                    </span>
                  </div>
                )}

                {/* Header: Nomor Berkas & Status Indicator */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-900 truncate">
                    {doc.format === 'PDF' && <FileText className="w-4 h-4 text-rose-600 shrink-0" />}
                    {doc.format === 'DOCX' && <FileText className="w-4 h-4 text-blue-600 shrink-0" />}
                    {doc.format === 'XLSX' && <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {doc.format === 'IMAGE' && <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />}
                    <span className="truncate">{doc.nomorBerkas}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-bold">
                      v{doc.currentVersion}
                    </span>

                    {/* Status Indicator */}
                    {doc.status === 'APPROVED' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                        <Lock className="w-3 h-3 text-emerald-700" />
                        <span>SAH</span>
                      </span>
                    )}
                    {doc.status === 'PENDING' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                        <Clock className="w-3 h-3" />
                        <span>PERIKSA</span>
                      </span>
                    )}
                    {doc.status === 'REVISION' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-orange-900 bg-orange-100 px-2 py-0.5 rounded-md border border-orange-300">
                        <AlertTriangle className="w-3 h-3" />
                        <span>REVISI</span>
                      </span>
                    )}
                    {doc.status === 'REJECTED' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                        <XCircle className="w-3 h-3" />
                        <span>DITOLAK</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Judul Dokumen */}
                <div className="font-black text-xs text-slate-950 line-clamp-2 leading-snug mb-1">
                  {doc.judul}
                </div>

                {/* Highlighted Verifier / Revision Notes Box */}
                {doc.status === 'REVISION' && (
                  <div className="my-2 p-2.5 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-950 font-sans shadow-2xs space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 font-black text-[11px] text-amber-800 uppercase tracking-wide">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Catatan Revisi / Instruksi Perbaikan:</span>
                      </div>
                      <span className="font-mono text-[9px] bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                        Wajib Diperbaiki
                      </span>
                    </div>
                    <p className="font-bold leading-relaxed line-clamp-3 italic bg-white/95 p-2 rounded-lg border border-amber-200">
                      "{doc.verification?.notes || doc.versions[doc.versions.length - 1]?.reviewerNotes || doc.perihal || 'Harap lakukan perbaikan sesuai arahan verifikator.'}"
                    </p>
                    {!isVerifier && onOpenRevisionModalForDoc && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRevisionModalForDoc(doc);
                        }}
                        className="w-full mt-1 py-1.5 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Unggah Berkas Hasil Revisi</span>
                      </button>
                    )}
                  </div>
                )}

                {doc.status === 'PENDING' && (doc.verification?.notes || doc.notes) && (doc.verification?.notes || doc.notes || '').trim() !== '-' && (doc.verification?.notes || doc.notes || '').trim() !== '' && (
                  <div className="my-2 p-2.5 bg-sky-50 border-2 border-sky-300 rounded-xl text-xs text-sky-950 font-sans shadow-2xs space-y-1">
                    <div className="flex items-center gap-1 font-black text-[11px] text-sky-800 uppercase tracking-wide">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Catatan Evaluasi / Catatan Pengajuan:</span>
                    </div>
                    <p className="font-bold leading-relaxed line-clamp-3 italic bg-white/95 p-2 rounded-lg border border-sky-200">
                      "{doc.verification?.notes || doc.notes}"
                    </p>
                  </div>
                )}

                {doc.status === 'REJECTED' && (
                  <div className="my-2 p-2.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-950 font-sans shadow-2xs space-y-0.5">
                    <div className="flex items-center gap-1 font-black text-[11px] text-rose-800 uppercase tracking-wide">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Alasan Penolakan Verifikator:</span>
                    </div>
                    <p className="font-bold leading-relaxed line-clamp-3 italic bg-white/90 p-1.5 rounded-md border border-rose-200">
                      "{doc.verification?.notes || doc.versions[doc.versions.length - 1]?.reviewerNotes || 'Dokumen tidak memenuhi persyaratan.'}"
                    </p>
                  </div>
                )}

                {doc.status === 'APPROVED' && (
                  <div className="my-2 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 font-sans shadow-2xs space-y-1">
                    <div className="flex items-center justify-between font-mono font-bold text-[10px]">
                      <span className="text-emerald-800">BAV / SEGEL SAH:</span>
                      <span className="bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded">{doc.verification?.bavNumber || doc.registrationSeal?.bavNumber || 'TERKUNCI'}</span>
                    </div>
                    {doc.verification?.notes && doc.verification.notes.trim() !== '-' && (
                      <p className="text-[11px] font-medium leading-tight text-emerald-900 italic line-clamp-2">
                        "{doc.verification.notes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Pemohon, Tanggal & Tombol Aksi Verifikasi, Edit & Hapus */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-slate-200 mt-2 font-medium gap-2">
                  <span className="truncate max-w-[120px] text-slate-900 font-bold">
                    {doc.pemohon.nama}
                  </span>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {/* Primary Verification Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDocument(doc);
                        if (onOpenVerificationForm) {
                          onOpenVerificationForm(doc);
                        }
                      }}
                      className="px-2.5 py-0.5 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white font-bold rounded-md text-[10px] inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="Buka Lembar Verifikasi & Keputusan (Setujui / Revisi / Tolak)"
                    >
                      <ShieldCheck className="w-3 h-3 text-sky-200" />
                      <span>{isVerifier ? 'Verifikasi' : 'Status'}</span>
                    </button>

                    {/* Upload Revision Button for Dinas if doc status is REVISION */}
                    {!isVerifier && doc.status === 'REVISION' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDocument(doc);
                          if (onOpenRevisionModalForDoc) {
                            onOpenRevisionModalForDoc(doc);
                          }
                        }}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-md text-[10px] inline-flex items-center gap-1 transition-all cursor-pointer shadow-xs animate-pulse"
                        title="Upload Berkas Perbaikan"
                      >
                        <UploadCloud className="w-3 h-3" />
                        <span>Upload Revisi</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenEditModal) onOpenEditModal(doc);
                      }}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md border border-slate-300 text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Edit Data Berkas"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteDocument) {
                          if (confirm(`Apakah Anda yakin ingin menghapus berkas "${doc.nomorBerkas} - ${doc.judul}"?`)) {
                            onDeleteDocument(doc.id);
                          }
                        }
                      }}
                      className="px-2 py-0.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold rounded-md border border-rose-200 text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Hapus Berkas Ini"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>

                    <span className="font-mono text-slate-500 text-[10px] pl-1 border-l border-slate-200">
                      {doc.tanggalMasuk.split(' ')[0]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
