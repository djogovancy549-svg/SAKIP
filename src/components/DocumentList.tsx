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
    <div className="flex flex-col h-full bg-white border border-blue-200/90 rounded-2xl shadow-sm overflow-hidden">
      {/* OPD Header Strip */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-blue-950 text-xs truncate">
            {activeOpd.name}
          </h2>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Kode: <span className="font-mono text-slate-700 font-semibold">{activeOpd.code}</span></span>
          <span className="text-blue-700 font-semibold font-mono">
            {opdDocuments.length} Dokumen Terdaftar
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-blue-100 bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor berkas, judul, pemohon..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="p-2 border-b border-blue-100 bg-blue-50/40">
        <div className="grid grid-cols-4 gap-1 text-[11px] font-medium">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`py-1.5 px-1.5 rounded-lg transition-colors truncate text-center cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            Semua ({opdDocuments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`py-1.5 px-1.5 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
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
                : 'text-orange-700 hover:bg-orange-50'
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
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
            title="Diverifikasi & Terkunci"
          >
            <span>Sah</span>
            <span className="font-mono font-bold">({approvedCount})</span>
          </button>
        </div>
      </div>

      {/* Format Filter Badges */}
      <div className="px-3 py-1.5 bg-slate-50/70 border-b border-blue-100 flex items-center gap-2 overflow-x-auto text-[10px] no-scrollbar">
        <span className="text-slate-400 font-medium shrink-0">Format:</span>
        {(['ALL', 'PDF', 'DOCX', 'XLSX', 'IMAGE'] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => setFormatFilter(fmt)}
            className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              formatFilter === fmt
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {fmt === 'ALL' ? 'Semua Format' : fmt}
          </button>
        ))}
      </div>

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-blue-50 p-2 space-y-1 bg-slate-50/30">
        {filteredDocuments.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-500 text-xs space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-30 text-blue-500" />
            <div className="font-semibold text-slate-700">Tidak ada dokumen ditemukan untuk {activeOpd.shortName}.</div>
            <p className="text-[11px] text-slate-400">
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
                    ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-200'
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
