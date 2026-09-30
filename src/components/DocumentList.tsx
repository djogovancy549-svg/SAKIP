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
} from 'lucide-react';
import { DocumentItem, DocumentFormat, VerificationStatus, OPD, AppRole } from '../types';

interface DocumentListProps {
  documents: DocumentItem[];
  selectedDocument: DocumentItem | null;
  onSelectDocument: (doc: DocumentItem) => void;
  activeOpd: OPD;
  appRole: AppRole;
  onOpenRevisionModalForDoc?: (doc: DocumentItem) => void;
}

export function DocumentList({
  documents,
  selectedDocument,
  onSelectDocument,
  activeOpd,
  appRole,
  onOpenRevisionModalForDoc,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | DocumentFormat>('ALL');

  // Strict OPD Isolation: only filter documents belonging to the active OPD
  const opdDocuments = documents.filter((doc) => doc.opdId === activeOpd.id);

  // Apply search and status filters within the OPD
  const filteredDocuments = opdDocuments.filter((doc) => {
    const matchesSearch =
      doc.nomorBerkas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.pemohon.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.pemohon.instansi.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
    const matchesFormat = formatFilter === 'ALL' || doc.format === formatFilter;

    return matchesSearch && matchesStatus && matchesFormat;
  });

  // Calculate status counts for active OPD
  const pendingCount = opdDocuments.filter((d) => d.status === 'PENDING').length;
  const approvedCount = opdDocuments.filter((d) => d.status === 'APPROVED').length;
  const revisionCount = opdDocuments.filter((d) => d.status === 'REVISION').length;
  const rejectedCount = opdDocuments.filter((d) => d.status === 'REJECTED').length;

  return (
    <div className="flex flex-col h-full bg-white/45 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden">
      {/* OPD Header Strip */}
      <div className="p-3.5 bg-white/40 border-b border-white/40">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-blue-950 text-xs truncate">
            {activeOpd.name}
          </h2>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-700">
          <span>Kode: <span className="font-mono text-slate-900 font-bold">{activeOpd.code}</span></span>
          <span className="text-blue-800 font-bold font-mono">
            {opdDocuments.length} Dokumen Terdaftar
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-white/40 bg-white/30">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor berkas, judul, pemohon..."
            className="w-full bg-white/60 border border-white/70 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-500 focus:bg-white/90 focus:outline-none focus:border-blue-500 transition-colors shadow-xs"
          />
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="p-2 border-b border-white/40 bg-white/20">
        <div className="grid grid-cols-4 gap-1 text-[11px] font-medium">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`py-1.5 px-1.5 rounded-lg transition-colors truncate text-center cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            Semua ({opdDocuments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`py-1.5 px-1.5 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-amber-800 hover:bg-white/60'
            }`}
            title="Dalam Pemeriksaan Awal"
          >
            <span>Periksa</span>
            <span className="font-mono font-bold">({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('REVISION')}
            className={`py-1.5 px-1.5 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'REVISION'
                ? 'bg-orange-600 text-white font-bold shadow-xs'
                : 'text-orange-800 hover:bg-white/60'
            }`}
            title="Perlu Revisi Dinas"
          >
            <span>Revisi</span>
            <span className="font-mono font-bold">({revisionCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`py-1.5 px-1.5 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-emerald-800 hover:bg-white/60'
            }`}
            title="Diverifikasi & Terkunci"
          >
            <span>Sah</span>
            <span className="font-mono font-bold">({approvedCount})</span>
          </button>
        </div>
      </div>

      {/* Format Filter Badges */}
      <div className="px-3 py-1.5 bg-white/20 border-b border-white/40 flex items-center gap-2 overflow-x-auto text-[10px] no-scrollbar">
        <span className="text-slate-600 font-semibold shrink-0">Format:</span>
        {(['ALL', 'PDF', 'DOCX', 'XLSX', 'IMAGE'] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => setFormatFilter(fmt)}
            className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              formatFilter === fmt
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white/50 border border-white/60 text-slate-700 hover:text-slate-950 hover:bg-white/80'
            }`}
          >
            {fmt === 'ALL' ? 'Semua Format' : fmt}
          </button>
        ))}
      </div>

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/40 p-2 space-y-1.5 bg-transparent">
        {filteredDocuments.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-600 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-40 text-blue-600" />
            <div className="font-semibold text-slate-800">Tidak ada dokumen ditemukan untuk {activeOpd.shortName}.</div>
            <p className="text-[11px] text-slate-600">
              Ubah kata kunci pencarian atau ganti status filter.
            </p>
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
                    ? 'bg-blue-500/20 border-blue-600 shadow-md ring-2 ring-blue-500/30 backdrop-blur-md'
                    : 'bg-white/50 border-white/60 hover:bg-white/80 hover:border-blue-300 backdrop-blur-md shadow-xs'
                }`}
              >
                {/* Header: Nomor Berkas & Status Indicator */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800 truncate">
                    {doc.format === 'PDF' && <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                    {doc.format === 'DOCX' && <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    {doc.format === 'XLSX' && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    {doc.format === 'IMAGE' && <ImageIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <span className="truncate">{doc.nomorBerkas}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      v{doc.currentVersion}
                    </span>

                    {/* Status Indicator */}
                    {doc.status === 'APPROVED' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        <span>SAH</span>
                      </span>
                    )}
                    {doc.status === 'PENDING' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>PERIKSA</span>
                      </span>
                    )}
                    {doc.status === 'REVISION' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                        <AlertTriangle className="w-3 h-3" />
                        <span>REVISI</span>
                      </span>
                    )}
                    {doc.status === 'REJECTED' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        <XCircle className="w-3 h-3" />
                        <span>DITOLAK</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Judul Dokumen */}
                <div className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug mb-1">
                  {doc.judul}
                </div>

                {/* Notice jika Perlu Revisi */}
                {doc.status === 'REVISION' && (
                  <div className="my-1.5 p-1.5 bg-orange-50 border border-orange-200 rounded-lg text-[10px] text-orange-800 line-clamp-2">
                    <span className="font-bold text-orange-700">Perbaikan: </span>
                    {doc.versions[doc.versions.length - 1]?.reviewerNotes || doc.verification?.notes || 'Perlu perbaikan berkas'}
                  </div>
                )}

                {/* Notice jika Terverifikasi & Terkunci */}
                {isDocLocked && doc.registrationSeal && (
                  <div className="my-1 p-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] text-emerald-800 font-mono flex items-center justify-between">
                    <span className="truncate">{doc.registrationSeal.regNumber}</span>
                    <span className="shrink-0 font-bold text-[9px] text-emerald-700">TERKUNCI</span>
                  </div>
                )}

                {/* Pemohon & Tanggal */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 mt-2">
                  <span className="truncate max-w-[140px] text-slate-600 font-medium">
                    {doc.pemohon.nama}
                  </span>
                  <span className="font-mono text-slate-400">
                    {doc.tanggalMasuk.split(' ')[0]}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
