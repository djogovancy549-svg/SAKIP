import { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  Sliders,
  Lock,
  BadgeCheck,
  AlertTriangle,
  ExternalLink,
  Download,
  FolderOpen,
  HardDrive,
  CheckCircle2,
  Layers,
  RefreshCw,
  Loader2,
  Zap,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { DocumentWatermark } from './DocumentWatermark';
import { getGoogleDriveFolderUrl, sanitizeGoogleDriveUrl, fetchFileBase64FromAppsScript } from '../services/googleSheetsWebhook';

interface DocumentViewerProps {
  document: DocumentItem;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'ORIGINAL_FILE' | 'STRUCTURED_VIEW' | 'DRIVE_LOCATION'>('ORIGINAL_FILE');
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showWatermark, setShowWatermark] = useState<boolean>(false);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.04);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [serverStreamDataUri, setServerStreamDataUri] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const totalPages = document.content.pdfPages?.length || 1;
  const isApproved = document.status === 'APPROVED';
  const isLocked = document.isLocked || isApproved;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 70));
  const handleResetZoom = () => {
    setZoom(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Google Drive folder URL for this OPD or general server
  const driveUrl = sanitizeGoogleDriveUrl(
    document.googleDrive?.viewUrl || document.googleDrive?.downloadUrl || getGoogleDriveFolderUrl()
  );

  // Known Folder IDs that must never be treated as file IDs
  const isDriveFolderId = (idStr?: string) => {
    if (!idStr) return false;
    const s = idStr.trim();
    return (
      s.includes('folders/') ||
      s.includes('folder') ||
      s === '1oeL5XXQlG2Z2KkF06tVqPZq_w8f2M-F7' ||
      s.startsWith('1p8_bav_demo') ||
      s === '1hC5x1mP2qL4vK7j8n9w0e1r2t3y4u5i' ||
      s === '1jD6y2nP3rM5wL8k9o0x1f2s3u4v5w6x' ||
      s === '1kE7z3oQ4sN6xM9l0p1y2g3t4v5w6x7y' ||
      s === '1lF8a4pR5tO7yN0m1q2z3h4u5w6x7y8z' ||
      s === '1mG9b5qS6uP8zO1n2r3a4i5v6x7y8z9a' ||
      s === '1nH0c6rT7vQ9aP2o3s4b5j6w7y8z9a0b' ||
      s === '1oI1d7sU8wR0bQ3p4t5c6k7x8z9a0b1c'
    );
  };

  // Robust Google Drive File ID resolution: avoids folder IDs, "dsadasd", or fake IDs
  const getCleanDriveFileId = (): string => {
    const rawCandidates = [
      document.googleDrive?.fileId,
      document.googleDrive?.viewUrl,
      document.googleDrive?.downloadUrl,
      (document.googleDrive as any)?.previewUrl,
      document.verification?.bavNumber,
      document.notes,
    ];
    for (const cand of rawCandidates) {
      if (!cand || typeof cand !== 'string') continue;
      const str = cand.trim();
      if (str === 'dsadasd' || str.startsWith('DRV-') || str.startsWith('DOC-') || isDriveFolderId(str)) continue;
      const urlMatch = str.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
      if (urlMatch && !isDriveFolderId(urlMatch[1])) return urlMatch[1];
      const idMatch = str.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
      if (idMatch && !isDriveFolderId(idMatch[1])) return idMatch[1];
      if (
        str.length >= 25 &&
        str.length <= 45 &&
        !str.includes('/') &&
        !str.includes(' ') &&
        !str.includes('SHA256') &&
        !str.includes('BAV') &&
        !str.includes('REG') &&
        !isDriveFolderId(str)
      ) {
        return str;
      }
    }
    return '';
  };
  const driveFileId = getCleanDriveFileId();

  const handleLoadDirectStream = async () => {
    if (!driveFileId) return;
    setIsLoadingStream(true);
    setStreamError(null);
    try {
      const res = await fetchFileBase64FromAppsScript(driveFileId);
      if (res.success && res.dataUri) {
        setServerStreamDataUri(res.dataUri);
      } else {
        setStreamError(res.message || 'Gagal memuat stream dari server');
      }
    } catch (e) {
      setStreamError('Koneksi server gagal');
    } finally {
      setIsLoadingStream(false);
    }
  };

  const handleDownloadFile = () => {
    if (document.fileBlobUrl) {
      const a = window.document.createElement('a');
      a.href = document.fileBlobUrl;
      a.download = document.fileName;
      a.click();
    } else if (serverStreamDataUri) {
      const a = window.document.createElement('a');
      a.href = serverStreamDataUri;
      a.download = document.fileName || 'dokumen_sakip.pdf';
      a.click();
    } else if (driveFileId) {
      window.open(`https://drive.google.com/uc?export=download&id=${driveFileId}`, '_blank');
    } else {
      // Open Drive link
      window.open(driveUrl, '_blank');
    }
  };

  return (
    <div
      className={`flex flex-col bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-white ring-8 ring-blue-600/20' : 'h-full min-h-[620px]'
      }`}
    >
      {/* Top Document Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-xs text-white shadow-sm">
        {/* Left: Document Title & Badges */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-white/15 border border-white/20 rounded-lg shrink-0">
            {document.format === 'PDF' && <FileText className="w-4 h-4 text-white" />}
            {document.format === 'DOCX' && <FileText className="w-4 h-4 text-white" />}
            {document.format === 'XLSX' && <FileSpreadsheet className="w-4 h-4 text-white" />}
            {document.format === 'IMAGE' && <ImageIcon className="w-4 h-4 text-white" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white truncate text-xs md:text-sm drop-shadow-xs">
                {document.fileName}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 font-bold shrink-0">
                v{document.currentVersion}
              </span>
              {isLocked && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500 text-white border border-emerald-300 font-bold shrink-0 shadow-xs">
                  <Lock className="w-2.5 h-2.5" /> Terkunci
                </span>
              )}
            </div>
            <div className="text-[10px] text-blue-100 font-mono truncate">
              {document.nomorBerkas} · {document.opdName}
            </div>
          </div>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Direct Drive Button */}
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Buka Berkas / Folder di Google Drive"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buka di Google Drive</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Download Original File Button */}
          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all border border-white/25 cursor-pointer"
            title="Unduh Berkas Asli"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Unduh Berkas</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-white/10 rounded-xl p-0.5 border border-white/20">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              title="Perkecil (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-1.5 text-[10px] font-mono text-white font-bold hover:bg-white/20 rounded cursor-pointer"
              title="Reset Zoom (100%)"
            >
              {zoom}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-white hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
              title="Perbesar (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Watermark Toggle */}
          <button
            onClick={() => setShowWatermark((v) => !v)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              showWatermark
                ? 'bg-amber-400 text-blue-950 font-bold border-amber-300 shadow-xs'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title={showWatermark ? 'Sembunyikan Watermark Cap' : 'Tampilkan Watermark Cap'}
          >
            {showWatermark ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-colors cursor-pointer"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Sub-Tabs: Berkas Asli vs Naskah SAKIP vs Folder Drive */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-4 gap-2 text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('ORIGINAL_FILE')}
          className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'ORIGINAL_FILE'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>1. Pratinjau Berkas Asli ({document.fileName})</span>
        </button>

        <button
          onClick={() => setActiveTab('STRUCTURED_VIEW')}
          className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'STRUCTURED_VIEW'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>2. Naskah Surat &amp; Lembar Telaah SAKIP</span>
        </button>

        <button
          onClick={() => setActiveTab('DRIVE_LOCATION')}
          className={`py-2.5 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'DRIVE_LOCATION'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <HardDrive className="w-4 h-4 text-emerald-600" />
          <span>3. Lokasi Folder Google Drive</span>
        </button>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100 flex flex-col items-center justify-start relative select-text shadow-inner space-y-4">
        {/* Prominent Verifier Notes & Revision Callout Banner */}
        {((document.verification?.notes && document.verification.notes.trim() !== '-') || document.status === 'REVISION' || document.status === 'REJECTED' || document.status === 'APPROVED') && (
          <div className="w-full max-w-5xl">
            <div
              className={`p-4 rounded-2xl border-2 shadow-md space-y-2 text-xs font-sans ${
                document.status === 'REVISION'
                  ? 'bg-amber-50 border-amber-400 text-amber-950'
                  : document.status === 'REJECTED'
                  ? 'bg-rose-50 border-rose-400 text-rose-950'
                  : document.status === 'APPROVED'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-blue-50 border-blue-300 text-blue-950'
              }`}
            >
              <div className="flex items-center justify-between gap-2 border-b pb-2 border-slate-300/50">
                <div className="flex items-center gap-2 font-black uppercase text-xs tracking-wide">
                  {document.status === 'REVISION' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                  {document.status === 'REJECTED' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                  {document.status === 'APPROVED' && <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0" />}
                  {document.status === 'PENDING' && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                  <span>Catatan &amp; Petunjuk Perbaikan / Evaluasi Verifikator:</span>
                </div>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border font-bold">
                  {document.verification?.verifiedBy || 'Admin Verifikator SAKIP'}
                </span>
              </div>
              <p className="text-xs md:text-sm font-bold leading-relaxed bg-white/90 p-3 rounded-xl border border-slate-200 shadow-2xs italic">
                "{document.verification?.notes || document.notes || document.versions[document.versions.length - 1]?.reviewerNotes || document.perihal || 'Dokumen memerlukan pemeriksaan dan perbaikan.'}"
              </p>
            </div>
          </div>
        )}
        {/* TAB 1: PRATINJAU BERKAS ASLI (PDF / EMBED / GAMBAR) */}
        {activeTab === 'ORIGINAL_FILE' && (
          <div className="w-full max-w-5xl space-y-4">
            {/* If there's an actual user file base64 or valid blob */}
            {document.fileBase64 ? (
              <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-md space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      Menampilkan File Asli yang Diunggah Dinas: {document.fileName}
                    </span>
                  </div>
                  <button
                    onClick={handleDownloadFile}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>

                {document.format === 'PDF' && (
                  <iframe
                    src={`data:application/pdf;base64,${document.fileBase64}`}
                    title={document.fileName}
                    className="w-full h-[620px] rounded-xl border border-slate-200 bg-slate-50 shadow-inner"
                  />
                )}

                {document.format === 'IMAGE' && (
                  <div className="flex justify-center p-4 bg-slate-900 rounded-xl overflow-hidden">
                    <img
                      src={`data:image/png;base64,${document.fileBase64}`}
                      alt={document.fileName}
                      className="max-h-[600px] object-contain rounded-lg shadow-lg"
                    />
                  </div>
                )}

                {(document.format === 'DOCX' || document.format === 'XLSX') && (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="inline-block p-4 bg-blue-100 text-blue-700 rounded-2xl">
                      {document.format === 'DOCX' ? <FileText className="w-12 h-12" /> : <FileSpreadsheet className="w-12 h-12 text-emerald-600" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{document.fileName}</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Berkas naskah {document.format} siap dibuka di Google Drive atau diunduh untuk diedit pada komputer Anda.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <a
                        href={driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>Buka &amp; Edit di Google Drive</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={handleDownloadFile}
                        className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh ke Perangkat</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (driveFileId || serverStreamDataUri) ? (
              <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-md space-y-3 w-full">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      Berkas Google Drive OPD: {document.fileName || document.judul}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Direct Server Stream Button (Bypass Google Login) */}
                    <button
                      type="button"
                      onClick={handleLoadDirectStream}
                      disabled={isLoadingStream}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      title="Muat isi file langsung via Apps Script tanpa login Google"
                    >
                      {isLoadingStream ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5 text-amber-100" />
                      )}
                      <span>{serverStreamDataUri ? 'Muat Ulang Stream' : '⚡ Baca Server Stream (Bebas Login)'}</span>
                    </button>

                    {driveFileId && (
                      <>
                        <a
                          href={`https://drive.google.com/uc?export=download&id=${driveFileId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                        <a
                          href={`https://drive.google.com/file/d/${driveFileId}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka di Tab Drive</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {streamError && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{streamError}</span>
                  </div>
                )}

                <div className="relative w-full h-[620px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                  <iframe
                    src={serverStreamDataUri || `https://drive.google.com/file/d/${driveFileId}/preview`}
                    title={document.fileName || 'Pratinjau Dokumen'}
                    className="w-full h-full border-0 bg-white"
                  />
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Tersimpan resmi di Google Drive Server Nagekeo ({document.opdName}). Jika pratinjau terhalang cookie atau multi-login Google, klik tombol <strong>⚡ Baca Server Stream (Bebas Login)</strong> di atas.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* High-Contrast Document Canvas Layout */
              <div
                className="transition-transform duration-150 origin-top flex justify-center"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              >
                <div className="relative w-full max-w-[840px] bg-white text-slate-950 shadow-2xl rounded-2xl p-6 sm:p-10 md:p-12 border border-slate-200">
                  {showWatermark && <DocumentWatermark document={document} opacity={watermarkOpacity} />}

                  {/* Formal Kop Surat Pemerintah Kabupaten Nagekeo */}
                  <div className="text-center border-b-4 border-double border-slate-900 pb-4 mb-6">
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <Building2 className="w-9 h-9 text-slate-900" />
                      <div>
                        <h2 className="text-sm font-bold tracking-wider uppercase text-slate-800">
                          PEMERINTAH KABUPATEN NAGEKEO
                        </h2>
                        <h1 className="text-lg md:text-xl font-black uppercase text-slate-950 tracking-tight">
                          {document.opdName}
                        </h1>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">
                      Kompleks Kantor Bupati Nagekeo, Mbay · Nusa Tenggara Timur
                    </p>
                    <div className="mt-3 text-xs font-bold font-mono tracking-wide text-slate-900 bg-slate-100 py-1.5 border-y border-slate-300">
                      SURAT RESMI NOMOR: {document.nomorBerkas}
                    </div>
                  </div>

                  {/* Judul Dokumen */}
                  <div className="text-center mb-6 space-y-1">
                    <h2 className="text-base md:text-lg font-black uppercase text-slate-950 tracking-wide">
                      {document.judul}
                    </h2>
                    <p className="text-xs text-slate-600 font-medium">
                      Perihal: <span className="font-bold text-slate-900">{document.perihal}</span>
                    </p>
                  </div>

                  {/* Isi Berkas Dokumen dengan Tulisan Tajam & Jelas */}
                  <div className="space-y-4 text-xs md:text-sm text-slate-900 leading-relaxed font-sans">
                    <div className="bg-blue-50/70 border-l-4 border-blue-600 p-3.5 rounded-r-xl space-y-1">
                      <div className="font-black text-xs uppercase tracking-wider text-blue-950">
                        LATAR BELAKANG &amp; MAKSUD PERMOHONAN :
                      </div>
                      <p className="text-slate-900 text-xs md:text-sm leading-relaxed font-medium">
                        {document.perihal || 'Dokumen diajukan untuk verifikasi kelengkapan administratif dan teknis pada Organisasi Perangkat Daerah terkait.'}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                      <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
                        KETENTUAN &amp; PERSYARATAN ADMINISTRASI :
                      </div>
                      <p className="text-slate-800 text-xs md:text-sm leading-relaxed">
                        Dokumen ini disusun dan diajukan sesuai dengan mekanisme Sistem Akuntabilitas Kinerja Instansi Pemerintah (SAKIP) Pemerintah Kabupaten Nagekeo, memenuhi tata naskah dinas, dan siap untuk diteliti keabsahannya.
                      </p>
                    </div>

                    {/* Informasi Identitas Pemohon */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Pemohon / Pengelola Berkas:</span>
                        <span className="font-bold text-slate-950 text-xs">{document.pemohon.nama}</span>
                        <span className="text-[11px] text-slate-600 block">{document.pemohon.instansi}</span>
                      </div>
                      <div className="bg-white border border-slate-200 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Tautan di Google Drive:</span>
                        <a
                          href={driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">Google Drive Induk / {document.opdName}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Document Footer Info */}
                  <div className="mt-10 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                    <div className="font-mono">
                      <span>ID BERKAS: </span>
                      <span className="font-bold text-slate-800">{document.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Dikelola oleh: <strong>{document.opdName}</strong></span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                        Format: {document.format}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NASKAH RESMI & LEMBAR TELAAH SAKIP */}
        {activeTab === 'STRUCTURED_VIEW' && (
          <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 text-slate-900">
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Lembar Telaah &amp; Naskah Verifikasi SAKIP
                </h3>
                <p className="text-xs text-slate-500">
                  Pemeriksaan kesesuaian berkas dengan instrumen pengawasan SAKIP Nagekeo
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
                Versi {document.currentVersion}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-xs text-slate-900 uppercase">Identitas Berkas :</span>
                <div className="text-xs space-y-1 text-slate-700">
                  <div><strong>Nomor:</strong> {document.nomorBerkas}</div>
                  <div><strong>Judul:</strong> {document.judul}</div>
                  <div><strong>Instansi:</strong> {document.opdName}</div>
                  <div><strong>Waktu Masuk:</strong> {document.tanggalMasuk}</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-xs text-slate-900 uppercase">Status Pengesahan :</span>
                <div className="text-xs space-y-1 text-slate-700">
                  <div><strong>Status:</strong> {document.status}</div>
                  <div><strong>Pengunci Berkas:</strong> {isLocked ? 'Terkunci Permanen' : 'Dapat Ditelaah / Direvisi'}</div>
                  {document.registrationSeal && (
                    <div><strong>No. BAV:</strong> {document.registrationSeal.bavNumber}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
              <div className="font-bold text-xs text-blue-950 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Rekomendasi Tindakan Verifikator</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                Silakan buka tab formulir di sebelah kanan untuk memberikan centang checklist keabsahan berkas, mengisi catatan revisi jika terdapat kekurangan, atau menyetujui dan mengesahkan dokumen secara resmi.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: LOKASI FOLDER GOOGLE DRIVE */}
        {activeTab === 'DRIVE_LOCATION' && (
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md space-y-5 text-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl">
                <HardDrive className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Penyimpanan Google Drive Induk SAKIP Nagekeo
                </h3>
                <p className="text-xs text-slate-500">
                  Folder resmi tempat berkas dan naskah SAKIP disimpan dan disinkronkan
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-500 font-medium">Instansi Pemilik:</span>
                <span className="font-bold text-slate-900">{document.opdName}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-500 font-medium">Nama Berkas:</span>
                <span className="font-mono font-bold text-blue-900">{document.fileName}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-500 font-medium">Ukuran Berkas:</span>
                <span className="font-mono text-slate-700">{document.fileSize}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">Tautan Folder Server:</span>
                <a
                  href={getGoogleDriveFolderUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Buka Folder di Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary Bar */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-slate-500">Pemohon:</span>
            <span className="font-bold text-slate-900">{document.pemohon.nama}</span>
            <span className="text-slate-500 text-[11px]">({document.pemohon.instansi})</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500">Tgl Masuk:</span>
            <span className="font-mono text-slate-700 font-semibold">{document.tanggalMasuk}</span>
          </div>
        </div>

        {/* Status in Footer */}
        <div className="flex items-center gap-2 font-medium">
          <span className="text-slate-500 text-xs">Status:</span>
          {document.status === 'APPROVED' && (
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Terverifikasi &amp; Terkunci
            </span>
          )}
          {document.status === 'PENDING' && (
            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
              Dalam Pemeriksaan
            </span>
          )}
          {document.status === 'REVISION' && (
            <span className="text-orange-800 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
              Butuh Revisi Dinas
            </span>
          )}
          {document.status === 'REJECTED' && (
            <span className="text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
              Ditolak
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
