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
} from 'lucide-react';
import { DocumentItem } from '../types';
import { DocumentWatermark } from './DocumentWatermark';

interface DocumentViewerProps {
  document: DocumentItem;
}

export function DocumentViewer({ document }: DocumentViewerProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.14);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [imageHighContrast, setImageHighContrast] = useState<boolean>(false);

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

  return (
    <div
      className={`flex flex-col bg-white border border-blue-200/90 rounded-2xl shadow-md overflow-hidden transition-all duration-200 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl bg-white ring-8 ring-blue-600/20' : 'h-full min-h-[600px]'
      }`}
    >
      {/* Top Document Action & Control Toolbar - Elegant Vibrant Blue */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-xs text-white shadow-sm">
        {/* Left: Format & Document Title Info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 font-medium text-white truncate">
            {document.format === 'PDF' && <FileText className="w-4 h-4 text-rose-200 shrink-0" />}
            {document.format === 'DOCX' && <FileText className="w-4 h-4 text-sky-200 shrink-0" />}
            {document.format === 'XLSX' && <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />}
            {document.format === 'IMAGE' && <ImageIcon className="w-4 h-4 text-amber-200 shrink-0" />}
            <span className="font-bold text-white truncate drop-shadow-xs">{document.fileName}</span>
          </div>

          {/* Version & Lock Badges */}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-800/80 text-blue-100 border border-blue-400/50 shrink-0 font-semibold">
            v{document.currentVersion}
          </span>
          {isLocked && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500 text-white border border-emerald-300 font-bold shrink-0 shadow-xs">
              <Lock className="w-2.5 h-2.5" /> Terkunci
            </span>
          )}
        </div>

        {/* Center: Page Navigation (if PDF has multiple pages) */}
        {document.format === 'PDF' && totalPages > 1 && (
          <div className="flex items-center gap-1 bg-blue-800/70 px-2 py-1 rounded-lg border border-blue-400/40">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="p-1 text-blue-200 hover:text-white disabled:opacity-40 disabled:hover:text-blue-200 transition-colors cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-white px-1 font-semibold">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="p-1 text-blue-200 hover:text-white disabled:opacity-40 disabled:hover:text-blue-200 transition-colors cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Right: Zoom, Rotate, Watermark & View Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-blue-800/70 rounded-lg border border-blue-400/40 p-0.5">
            <button
              onClick={handleZoomOut}
              className="p-1 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded transition-colors cursor-pointer"
              title="Perkecil Tampilan"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-1.5 py-0.5 text-[11px] font-mono text-blue-100 hover:text-white hover:bg-blue-700/80 rounded transition-colors cursor-pointer font-bold"
              title="Reset Skala 100%"
            >
              {zoom}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded transition-colors cursor-pointer"
              title="Perbesar Tampilan"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleRotate}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded-lg border border-blue-400/40 transition-colors cursor-pointer"
            title="Putar Dokumen 90 Derajat"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Watermark Toggle */}
          <button
            onClick={() => setShowWatermark((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              showWatermark
                ? 'bg-blue-900/80 text-emerald-300 border-emerald-400/50 shadow-xs'
                : 'bg-blue-800/60 text-blue-200 border-blue-400/30'
            }`}
            title="Aktifkan / Sembunyikan Watermark Pengamanan"
          >
            {showWatermark ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Watermark</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`p-1.5 rounded-lg border border-blue-400/40 transition-colors cursor-pointer ${
              showSettings ? 'bg-white text-blue-900 shadow-xs' : 'text-blue-100 hover:text-white hover:bg-blue-700/80'
            }`}
            title="Pengaturan Watermark"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-1.5 text-blue-100 hover:text-white hover:bg-blue-700/80 rounded-lg border border-blue-400/40 transition-colors cursor-pointer"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Settings Bar */}
      {showSettings && (
        <div className="flex items-center justify-between gap-4 px-4 py-2 bg-blue-800/95 border-b border-blue-600 text-xs text-white">
          <div className="flex items-center gap-3">
            <span className="text-blue-200 font-medium">Ketebalan Watermark:</span>
            <input
              type="range"
              min="0.05"
              max="0.30"
              step="0.02"
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
              className="w-28 accent-sky-300 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-blue-100 font-bold">
              {Math.round(watermarkOpacity * 100)}%
            </span>
          </div>

          {document.format === 'IMAGE' && (
            <label className="flex items-center gap-2 cursor-pointer text-blue-100 hover:text-white">
              <input
                type="checkbox"
                checked={imageHighContrast}
                onChange={(e) => setImageHighContrast(e.target.checked)}
                className="rounded accent-sky-300"
              />
              <span>Tingkatkan Kontras Pindai</span>
            </label>
          )}

          <button
            onClick={() => setShowSettings(false)}
            className="text-blue-200 hover:text-white text-xs cursor-pointer font-semibold underline underline-offset-2"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Document Content Canvas Viewport - Elegant Bright Blue Backdrop */}
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-gradient-to-br from-blue-100 via-sky-100/70 to-blue-200/80 flex justify-center items-start relative select-text shadow-inner">
        <div
          className="transition-transform duration-150 origin-top"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          }}
        >
          {/* Paper Canvas Container */}
          <div className="relative w-full max-w-[840px] min-w-[320px] sm:min-w-[560px] md:min-w-[760px] bg-white text-slate-900 shadow-xl shadow-blue-900/10 rounded-xl p-6 sm:p-10 md:p-14 border border-blue-200/80">
            {/* Dynamic Watermark Layer */}
            {showWatermark && (
              <DocumentWatermark document={document} opacity={watermarkOpacity} />
            )}

            {/* Official Registration Header Banner if Approved & Locked */}
            {isApproved && document.registrationSeal && (
              <div className="mb-6 p-3 bg-emerald-50 border-2 border-emerald-600 rounded text-emerald-950 text-xs flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <BadgeCheck className="w-6 h-6 text-emerald-700 shrink-0" />
                  <div>
                    <div className="font-black text-xs uppercase tracking-wide text-emerald-900">
                      TELAH DIPERIKSA DAN DIVERIFIKASI RESMI
                    </div>
                    <div className="font-mono text-[11px] text-emerald-800">
                      NO REG: {document.registrationSeal.regNumber}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-[10px] text-emerald-800 shrink-0">
                  <div className="font-bold flex items-center gap-1 justify-end">
                    <Lock className="w-3 h-3 text-emerald-700" /> TERKUNCI (TIDAK BISA DIUBAH)
                  </div>
                  <div>TGL: {document.registrationSeal.issuedAt}</div>
                </div>
              </div>
            )}

            {/* Warning Banner if Revision Requested */}
            {document.status === 'REVISION' && (
              <div className="mb-6 p-3 bg-orange-50 border-l-4 border-orange-500 rounded text-orange-950 text-xs space-y-1 relative z-10">
                <div className="flex items-center gap-1.5 font-bold text-orange-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span>CATATAN PEMERIKSAAN DOKUMEN (BUTUH REVISI DARI DINAS)</span>
                </div>
                <p className="text-[11px] text-orange-800 italic">
                  "{document.verification?.notes || document.versions[document.versions.length - 1]?.reviewerNotes || 'Lakukan perbaikan berkas sesuai catatan pemeriksa lalu upload kembali.'}"
                </p>
              </div>
            )}

            {/* FORMAT: PDF */}
            {document.format === 'PDF' && (
              <div className="space-y-6 text-sm relative z-0">
                {/* PDF Formal Kop Surat */}
                {document.content.kopSurat && (
                  <div className="text-center border-b-4 border-double border-slate-900 pb-4 mb-6">
                    <div className="flex items-center justify-center gap-3 mb-1">
                      <Building2 className="w-8 h-8 text-slate-800" />
                      <div>
                        <h2 className="text-sm font-bold tracking-wider uppercase text-slate-800">
                          {document.content.kopSurat.pemerintah}
                        </h2>
                        <h1 className="text-lg md:text-xl font-black uppercase text-slate-950 tracking-tight">
                          {document.content.kopSurat.instansi}
                        </h1>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-serif">
                      {document.content.kopSurat.alamat}
                    </p>
                    <div className="mt-3 text-xs font-bold font-mono tracking-wide text-slate-900 bg-slate-100 py-1 border-y border-slate-300">
                      {document.content.kopSurat.nomorNaskah}
                    </div>
                  </div>
                )}

                {/* PDF Page Content */}
                {document.content.pdfPages && (
                  <div>
                    {document.content.pdfPages
                      .filter((p) => p.pageNumber === currentPage)
                      .map((page) => (
                        <div key={page.pageNumber} className="space-y-5">
                          <h3 className="text-center font-bold text-sm md:text-base uppercase tracking-wide text-slate-900 border-b border-slate-200 pb-2">
                            {page.title}
                          </h3>

                          {page.sections.map((sec, sIdx) => (
                            <div
                              key={sIdx}
                              className={`space-y-1.5 p-3 rounded ${
                                sec.highlight ? 'bg-amber-50/80 border-l-4 border-amber-500' : ''
                              }`}
                            >
                              {sec.heading && (
                                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                                  {sec.heading} :
                                </h4>
                              )}
                              <p className="text-xs md:text-sm text-slate-700 whitespace-pre-line leading-relaxed font-serif">
                                {sec.body}
                              </p>
                            </div>
                          ))}

                          {/* PDF Table Data if present */}
                          {page.tableData && (
                            <div className="mt-4 overflow-x-auto border border-slate-300 rounded">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                                  <tr>
                                    <th className="p-2 border-r border-slate-300">{page.tableData[0].col1}</th>
                                    <th className="p-2 border-r border-slate-300">{page.tableData[0].col2}</th>
                                    <th className="p-2 border-r border-slate-300">{page.tableData[0].col3}</th>
                                    <th className="p-2">{page.tableData[0].col4}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {page.tableData.slice(1).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50 font-serif">
                                      <td className="p-2 border-r border-slate-200 text-center font-mono">
                                        {row.col1}
                                      </td>
                                      <td className="p-2 border-r border-slate-200 font-medium">
                                        {row.col2}
                                      </td>
                                      <td className="p-2 border-r border-slate-200 text-slate-600">
                                        {row.col3}
                                      </td>
                                      <td className="p-2 font-mono font-semibold text-slate-900">
                                        {row.col4}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* FORMAT: DOCX */}
            {document.format === 'DOCX' && document.content.docxData && (
              <div className="space-y-6 text-sm font-serif relative z-0">
                <div className="text-center border-b-2 border-slate-900 pb-3">
                  <h2 className="text-lg font-bold tracking-widest uppercase text-slate-900">
                    NOTA DINAS
                  </h2>
                  <div className="text-xs font-mono font-semibold text-slate-700 mt-1">
                    Nomor : {document.nomorBerkas}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs border-b border-slate-200 pb-4">
                  <div>
                    <span className="font-bold text-slate-900">Kepada : </span>
                    <span className="text-slate-800">{document.content.docxData.kepada}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Dari : </span>
                    <span className="text-slate-800">{document.content.docxData.dari}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="font-bold text-slate-900">Perihal : </span>
                    <span className="text-slate-900 font-semibold underline">
                      {document.content.docxData.perihal}
                    </span>
                  </div>
                </div>

                {document.content.docxData.dasarHukum.length > 0 && (
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="font-bold text-slate-900 uppercase">Dasar Pertimbangan :</div>
                    <ul className="list-decimal pl-5 space-y-1">
                      {document.content.docxData.dasarHukum.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3.5 text-xs md:text-sm text-slate-800 leading-relaxed text-justify">
                  {document.content.docxData.isiParagraf.map((p, idx) => (
                    <p key={idx} className="indent-8">
                      {p}
                    </p>
                  ))}
                </div>

                <p className="text-xs md:text-sm text-slate-800 italic">
                  {document.content.docxData.penutup}
                </p>

                <div className="pt-8 flex justify-end">
                  <div className="w-64 text-center text-xs space-y-1">
                    <div className="text-slate-700 font-medium">
                      {document.content.docxData.pejabatTtd.jabatan}
                    </div>
                    <div className="h-16 flex items-center justify-center">
                      <span className="text-[10px] text-slate-400 italic">
                        [Tanda Tangan & Cap Sah Digital]
                      </span>
                    </div>
                    <div className="font-bold text-slate-950 underline">
                      {document.content.docxData.pejabatTtd.nama}
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
                      NIP. {document.content.docxData.pejabatTtd.nip}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FORMAT: XLSX */}
            {document.format === 'XLSX' && document.content.xlsxData && (
              <div className="space-y-4 text-xs font-sans relative z-0">
                <div className="bg-emerald-800 text-white p-3 rounded-t-sm flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                    <span>{document.content.xlsxData.sheetName}</span>
                  </div>
                  <span className="text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded font-mono">
                    T.A. {document.content.xlsxData.tahunAnggaran}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 border border-slate-200 rounded space-y-1">
                  <div className="font-bold text-slate-900 text-sm">
                    {document.content.xlsxData.subKegiatan}
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Rekening: {document.content.xlsxData.kodeRekening}
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-300">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 border-r border-slate-300 text-center w-8">No</th>
                        <th className="p-2 border-r border-slate-300">Kode AHSP</th>
                        <th className="p-2 border-r border-slate-300">Uraian Pekerjaan / Material</th>
                        <th className="p-2 border-r border-slate-300 text-right">Vol</th>
                        <th className="p-2 border-r border-slate-300 text-center">Satuan</th>
                        <th className="p-2 border-r border-slate-300 text-right">Harga Satuan (Rp)</th>
                        <th className="p-2 border-r border-slate-300 text-right">Jumlah Total (Rp)</th>
                        <th className="p-2">Ket</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {document.content.xlsxData.rows.map((row) => (
                        <tr key={row.no} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 text-center font-mono">{row.no}</td>
                          <td className="p-2 border-r border-slate-200 font-mono text-slate-600">{row.kode}</td>
                          <td className="p-2 border-r border-slate-200 font-medium text-slate-900">{row.uraian}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono tabular-nums">{row.volume.toLocaleString('id-ID')}</td>
                          <td className="p-2 border-r border-slate-200 text-center text-slate-600">{row.satuan}</td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono tabular-nums">
                            {row.hargaSatuan.toLocaleString('id-ID')}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {row.total.toLocaleString('id-ID')}
                          </td>
                          <td className="p-2 text-slate-500 text-[10px]">{row.keterangan}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <tr>
                        <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider text-slate-800">
                          Total Rencana Anggaran Biaya (RAB):
                        </td>
                        <td className="p-2.5 text-right font-mono text-sm text-emerald-800 tabular-nums">
                          Rp {document.content.xlsxData.totalAnggaran.toLocaleString('id-ID')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* FORMAT: IMAGE / SCAN */}
            {document.format === 'IMAGE' && document.content.imageData && (
              <div
                className={`space-y-4 text-xs font-sans relative z-0 transition-all ${
                  imageHighContrast ? 'contrast-125 saturate-50' : ''
                }`}
              >
                <div className="border-8 border-double border-amber-900/30 p-6 md:p-8 bg-amber-50/40 rounded-sm relative">
                  <div className="text-center space-y-2 border-b-2 border-amber-900/30 pb-4 mb-4">
                    <div className="inline-block p-2 bg-amber-100/80 rounded-full border border-amber-300">
                      <ShieldCheck className="w-10 h-10 text-amber-800" />
                    </div>
                    <h2 className="text-base md:text-lg font-black uppercase text-amber-950 tracking-wider">
                      {document.content.imageData.scanType}
                    </h2>
                    <div className="text-xs font-mono font-bold text-amber-900">
                      NOMOR REGISTRASI: {document.content.imageData.registrationNo}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-800 mb-6">
                    <div className="bg-white/80 p-3 rounded border border-amber-200/60">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Tanggal Terbit</div>
                      <div className="font-semibold text-xs mt-0.5">{document.content.imageData.issueDate}</div>
                    </div>
                    <div className="bg-white/80 p-3 rounded border border-amber-200/60">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Masa Berlaku</div>
                      <div className="font-semibold text-xs mt-0.5 text-emerald-700">{document.content.imageData.validUntil}</div>
                    </div>
                    <div className="bg-white/80 p-3 rounded border border-amber-200/60">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Otoritas Pengesahan</div>
                      <div className="font-medium text-xs mt-0.5">{document.content.imageData.stampedAuthority}</div>
                    </div>
                    <div className="bg-white/80 p-3 rounded border border-amber-200/60">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Kualitas Pindaian (Scan)</div>
                      <div className="font-mono text-[11px] text-slate-600 mt-0.5">{document.content.imageData.scanQuality}</div>
                    </div>
                  </div>

                  <div className="border border-dashed border-amber-400 p-2.5 bg-amber-100/40 text-[10px] text-amber-900 font-mono flex items-center justify-between">
                    <span>MICROPRINT: {document.id} • KEMENTERIAN / PEMDA AUTHENTICATED</span>
                    <span className="font-bold">STATUS: ORIGINAL DOCUMENT SCAN</span>
                  </div>
                </div>
              </div>
            )}

            {/* Document Bottom Footer Seal */}
            <div className="mt-12 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex items-center gap-1.5 font-mono">
                <span>SIMVERIF ID:</span>
                <span className="font-bold text-slate-700">{document.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">
                  Dikelola oleh {document.opdName}
                </span>
                <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                  Format: {document.format} · Versi {document.currentVersion}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar for Document Info */}
      <div className="px-4 py-2.5 bg-blue-50/90 border-t border-blue-200/90 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
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
            <span className="text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 font-mono text-[11px] shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Terverifikasi & Terkunci
            </span>
          )}
          {document.status === 'PENDING' && (
            <span className="text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
              Dalam Pemeriksaan
            </span>
          )}
          {document.status === 'REVISION' && (
            <span className="text-orange-800 bg-orange-100 border border-orange-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
              Butuh Revisi Dinas
            </span>
          )}
          {document.status === 'REJECTED' && (
            <span className="text-rose-800 bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
              Ditolak
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
