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
} from 'lucide-react';
import { DocumentItem, DocumentFormat, VerificationStatus, OPD, AppRole } from '../types';
import { OPD_LIST } from '../data/opdData';

interface DocumentListProps {
  documents: DocumentItem[];
  selectedDocument: DocumentItem | null;
  onSelectDocument: (doc: DocumentItem) => void;
  activeOpd: OPD;
  appRole: AppRole;
  onOpenRevisionModalForDoc?: (doc: DocumentItem) => void;
  onSelectOpd?: (opd: OPD) => void;
}

export function DocumentList({
  documents,
  selectedDocument,
  onSelectDocument,
  activeOpd,
  appRole,
  onOpenRevisionModalForDoc,
  onSelectOpd,
}: DocumentListProps) {
  const isVerifier = appRole === 'VERIFIKATOR';
  const [opdScope, setOpdScope] = useState<'ALL' | 'SINGLE'>(isVerifier ? 'ALL' : 'SINGLE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | VerificationStatus>('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | DocumentFormat>('ALL');

  // If verifier and opdScope is ALL, show all documents across all 38 OPDs; otherwise filter by active OPD
  const opdDocuments = isVerifier && opdScope === 'ALL'
    ? documents
    : documents.filter((doc) => doc.opdId === activeOpd.id);

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

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden text-slate-800">
      {/* Top Header Strip: Scope & OPD Info */}
      <div className="p-3.5 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white border-b border-blue-500 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-sky-200 shrink-0" />
            <h2 className="font-bold text-white text-xs truncate">
              {isVerifier && opdScope === 'ALL'
                ? 'Semua Antrean Masuk Pemkab Nagekeo'
                : activeOpd.name}
            </h2>
          </div>

          <span className="text-[10px] bg-white/20 border border-white/30 text-white px-2 py-0.5 rounded-full font-mono font-bold shrink-0">
            {opdDocuments.length} Berkas
          </span>
        </div>

        {/* Verifier Scope Toggle Bar */}
        {isVerifier && (
          <div className="grid grid-cols-2 p-1 bg-white/15 backdrop-blur-md rounded-xl border border-white/20 text-[11px] font-semibold mt-2">
            <button
              onClick={() => setOpdScope('ALL')}
              className={`py-1 px-2 rounded-lg transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
                opdScope === 'ALL'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Semua OPD ({documents.length})</span>
            </button>
            <button
              onClick={() => setOpdScope('SINGLE')}
              className={`py-1 px-2 rounded-lg transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
                opdScope === 'SINGLE'
                  ? 'bg-white text-blue-900 shadow-xs font-bold'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Hanya {activeOpd.shortName}</span>
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-2.5 border-b border-slate-200 bg-slate-50">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor berkas, judul, dinas, pemohon..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Status Segmented Tabs */}
      <div className="p-2 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-4 gap-1 text-[11px] font-medium">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`py-1.5 px-1 rounded-lg transition-colors truncate text-center cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            Semua ({opdDocuments.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`py-1.5 px-1 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
            title="Dalam Pemeriksaan Awal"
          >
            <span>Periksa</span>
            <span className="font-mono font-bold">({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('REVISION')}
            className={`py-1.5 px-1 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'REVISION'
                ? 'bg-orange-600 text-white font-bold shadow-xs'
                : 'text-orange-800 hover:bg-orange-50'
            }`}
            title="Perlu Revisi Dinas"
          >
            <span>Revisi</span>
            <span className="font-mono font-bold">({revisionCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`py-1.5 px-1 rounded-lg transition-colors truncate flex items-center justify-center gap-1 cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
            title="Diverifikasi & Terkunci"
          >
            <span>Sah</span>
            <span className="font-mono font-bold">({approvedCount})</span>
          </button>
        </div>
      </div>

      {/* Format Filter Badges */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-[10px] no-scrollbar">
        <span className="text-slate-500 font-semibold shrink-0">Format:</span>
        {(['ALL', 'PDF', 'DOCX', 'XLSX', 'IMAGE'] as const).map((fmt) => (
          <button
            key={fmt}
            onClick={() => setFormatFilter(fmt)}
            className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              formatFilter === fmt
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {fmt === 'ALL' ? 'Semua Format' : fmt}
          </button>
        ))}
      </div>

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 bg-slate-50/50">
        {filteredDocuments.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-500 text-xs space-y-2 bg-white rounded-xl border border-slate-200 m-2">
            <FileText className="w-8 h-8 mx-auto text-slate-300" />
            <div className="font-bold text-slate-700">Tidak ada dokumen ditemukan.</div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              {isVerifier
                ? 'Belum ada dokumen yang diunggah oleh OPD atau ubah filter pencarian di atas.'
                : `Belum ada dokumen yang diajukan oleh ${activeOpd.name}.`}
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
                    ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-400/30'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-300 shadow-2xs'
                }`}
              >
                {/* OPD Badge if in ALL view */}
                {isVerifier && opdScope === 'ALL' && (
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-mono">
                      <Building2 className="w-3 h-3" />
                      <span>{doc.opdName}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {doc.tanggalMasuk.split(' ')[0]}
                    </span>
                  </div>
                )}

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
