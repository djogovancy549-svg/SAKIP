import { Activity, CheckCircle2, Clock, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { DocumentItem } from '../types';

interface RunningTickerProps {
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
}

export function RunningTicker({ documents, onSelectDocument }: RunningTickerProps) {
  // Build dynamic real-time event updates list from document data
  const feedItems = documents.map((doc) => {
    let statusLabel = 'MENUNGGU VERIFIKASI';
    let statusBg = 'bg-amber-400 text-slate-950 font-black';
    let icon = <Clock className="w-3.5 h-3.5 text-amber-300" />;

    if (doc.status === 'APPROVED') {
      statusLabel = 'DISAHKAN & DISETUJUI';
      statusBg = 'bg-emerald-400 text-slate-950 font-black';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />;
    } else if (doc.status === 'REJECTED') {
      statusLabel = 'DITOLAK';
      statusBg = 'bg-rose-500 text-white font-black';
      icon = <XCircle className="w-3.5 h-3.5 text-rose-300" />;
    } else if (doc.status === 'REVISION') {
      statusLabel = 'PERLU REVISI';
      statusBg = 'bg-orange-400 text-slate-950 font-black';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-orange-300" />;
    }

    return {
      doc,
      icon,
      statusLabel,
      statusBg,
      text: `${doc.opdName}: [${doc.format}] ${doc.nomorBerkas} — "${doc.judul.slice(0, 48)}..."`,
      time: doc.verification?.verifiedAt || doc.tanggalMasuk,
    };
  });

  // Duplicate items for seamless continuous looping in marquee
  const loopedFeed = [...feedItems, ...feedItems];

  return (
    <div className="w-full bg-blue-950 border-y-2 border-blue-900 text-white overflow-hidden relative select-none shadow-sm">
      <div className="flex items-center">
        {/* Left Badge: Status Siaran Langsung */}
        <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-blue-700 border-r border-blue-600 z-10 shadow-sm text-xs font-bold text-white">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="text-[11px] font-black tracking-wider text-white uppercase whitespace-nowrap">
            Data Berjalan OPD
          </span>
        </div>

        {/* Marquee Viewport */}
        <div className="overflow-hidden flex-1 relative py-2 px-3">
          {feedItems.length === 0 ? (
            <div className="flex items-center gap-3 text-xs text-white font-bold">
              <span className="font-black text-slate-950 bg-sky-300 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                [SERVER SIAP]
              </span>
              <span>
                Sistem Siap &amp; Terhubung ke Google Drive Induk Server. Belum ada antrean dokumen. Silakan unggah berkas baru melalui tombol "Upload Dokumen".
              </span>
            </div>
          ) : (
            <div className="animate-marquee flex items-center gap-8 text-xs text-white whitespace-nowrap">
              {loopedFeed.map((item, idx) => (
                <button
                  key={`${item.doc.id}-${idx}`}
                  onClick={() => onSelectDocument(item.doc)}
                  className="flex items-center gap-2 hover:text-sky-300 transition-colors cursor-pointer group"
                  title="Klik untuk membuka dokumen"
                >
                  {item.icon}
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${item.statusBg}`}>
                    [{item.statusLabel}]
                  </span>
                  <span className="text-white font-bold group-hover:underline">
                    {item.text}
                  </span>
                  <span className="text-[10px] text-sky-200 font-mono">
                    ({item.time})
                  </span>
                  <span className="text-blue-500 mx-2">/</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Counter */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-blue-900 border-l border-blue-800 text-[11px] text-sky-200 font-mono shrink-0 font-bold">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>{documents.length} Dokumen Terpantau</span>
        </div>
      </div>
    </div>
  );
}
