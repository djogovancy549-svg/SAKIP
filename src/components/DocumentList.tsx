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
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* OPD Header Strip */}
      <div className="p-3.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <h2 className="font-bold text-slate-100 text-xs truncate">
            {activeOpd.name}
          </h2>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Kode: <span className="font-mono text-slate-300">{activeOpd.code}</span></span>
          <span className="text-emerald-400 font-semibold font-mono">
            {opdDocuments.length} Dokumen Terdaftar
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor berkas, judul, pemohon..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/20">
        <div className="grid grid-cols-4 gap-1 text-[11px] font-medium">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`py-1.5 px-1.5 rounded-md transition-colors truncate text-center ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({opdDocuments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`py-1.5 px-1.5 rounded-md transition-colors truncate flex items-center justify-center gap-1 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
            title="Dalam Pemeriksaan Awal"
          >
            <span>Periksa</span>
            <span className="font-mono font-bold">({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('REVISION')}
            className={`py-1.5 px-1.5 rounded-md transition-colors truncate flex items-center justify-center gap-1 ${
              statusFilter === 'REVISION'
                ? 'bg-orange-500/20 text-orange-300 font-semibold'
                : 'text-orange-400/80 hover:text-orange-300'
            }`}
            title="Perlu Revisi Dinas"
          >
            <span>Revisi</span>
            <span className="font-mono font-bold">({revisionCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`py-1.5 px-1.5 rounded-md transition-colors truncate flex items-center justify-center gap-1 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                : 'text-emerald-400/80 hover:text-emerald-300'
            }`}
            title="Diverifikasi & Terkunci"
          >
            <span>Sah</span>
            <span className="font-mono font-bold">({approvedCount})</span>
          </button>
        </div>
      </div>

      {/* Format Filter Badges */}
      <div className="px-3 py-1.5 bg-slate-950/30 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-[10px] no-scrollbar">
        <span className="text-slate-500 font-medium shrink-0">Format:</span>
        {(['ALL', 'PDF', 'DOCX', 'XLSX', 'IMAGE'] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => setFormatFilter(fmt)}
            className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
              formatFilter === fmt
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {fmt === 'ALL' ? 'Semua Format' : fmt}
          </button>
        ))}
      </div>

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-2 space-y-1">
        {filteredDocuments.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-500 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-30" />
            <div>Tidak ada dokumen ditemukan untuk {activeOpd.shortName}.</div>
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
                className={`w-full text-left p-3 rounded-lg transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                {/* Header: Nomor Berkas & Status Indicator */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-200 truncate">
                    {doc.format === 'PDF' && <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    {doc.format === 'DOCX' && <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    {doc.format === 'XLSX' && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {doc.format === 'IMAGE' && <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    <span className="truncate">{doc.nomorBerkas}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1 rounded border border-slate-800">
                      v{doc.currentVersion}
                    </span>

                    {/* Status Indicator */}
                    {doc.status === 'APPROVED' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                        <Lock className="w-3 h-3 text-emerald-500" />
                        <span>SAH</span>
                      </span>
                    )}
                    {doc.status === 'PENDING' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                        <Clock className="w-3 h-3" />
                        <span>PERIKSA</span>
                      </span>
                    )}
                    {doc.status === 'REVISION' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>REVISI</span>
                      </span>
                    )}
                    {doc.status === 'REJECTED' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400">
                        <XCircle className="w-3 h-3" />
                        <span>DITOLAK</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Judul Dokumen */}
                <div className="font-semibold text-xs text-slate-100 line-clamp-2 leading-snug mb-1">
                  {doc.judul}
                </div>

                {/* Notice jika Perlu Revisi */}
                {doc.status === 'REVISION' && (
                  <div className="my-1.5 p-1.5 bg-orange-950/40 border border-orange-500/20 rounded text-[10px] text-orange-300 line-clamp-2">
                    <span className="font-bold text-orange-400">Perbaikan: </span>
                    {doc.versions[doc.versions.length - 1]?.reviewerNotes || doc.verification?.notes || 'Perlu perbaikan berkas'}
                  </div>
                )}

                {/* Notice jika Terverifikasi & Terkunci */}
                {isDocLocked && doc.registrationSeal && (
                  <div className="my-1 p-1 bg-emerald-950/30 border border-emerald-500/20 rounded text-[10px] text-emerald-300 font-mono flex items-center justify-between">
                    <span className="truncate">{doc.registrationSeal.regNumber}</span>
                    <span className="shrink-0 font-bold text-[9px] text-emerald-400">TERKUNCI</span>
                  </div>
                )}

                {/* Pemohon & Tanggal */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60 mt-2">
                  <span className="truncate max-w-[140px] text-slate-300">
                    {doc.pemohon.nama}
                  </span>
                  <span className="font-mono text-slate-500">
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
