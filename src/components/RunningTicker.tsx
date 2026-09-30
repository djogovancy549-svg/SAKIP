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
    let statusColor = 'text-amber-400';
    let icon = <Clock className="w-3.5 h-3.5 text-amber-400" />;

    if (doc.status === 'APPROVED') {
      statusLabel = 'DISAHKAN & DISETUJUI';
      statusColor = 'text-emerald-400';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    } else if (doc.status === 'REJECTED') {
      statusLabel = 'DITOLAK';
      statusColor = 'text-rose-400';
      icon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
    } else if (doc.status === 'REVISION') {
      statusLabel = 'PERLU REVISI';
      statusColor = 'text-orange-400';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
    }

    return {
      doc,
      icon,
      statusLabel,
      statusColor,
      text: `${doc.opdName}: [${doc.format}] ${doc.nomorBerkas} — "${doc.judul.slice(0, 48)}..."`,
      time: doc.verification?.verifiedAt || doc.tanggalMasuk,
    };
  });

  // Duplicate items for seamless continuous looping in marquee
  const loopedFeed = [...feedItems, ...feedItems];

  return (
    <div className="w-full bg-blue-100/70 border-y border-blue-200/90 backdrop-blur-md overflow-hidden relative select-none shadow-2xs">
      <div className="flex items-center">
        {/* Left Badge: Status Siaran Langsung */}
        <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-blue-600 border-r border-blue-700 z-10 shadow-sm text-xs font-semibold text-white">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="text-[11px] font-black tracking-wider text-white uppercase whitespace-nowrap">
            Data Berjalan OPD
          </span>
        </div>

        {/* Marquee Viewport */}
        <div className="overflow-hidden flex-1 relative py-1.5 px-3">
          {feedItems.length === 0 ? (
            <div className="flex items-center gap-3 text-xs text-blue-900 font-medium">
              <span className="font-bold text-blue-700 bg-blue-200/80 px-2 py-0.5 rounded text-[10px] uppercase font-mono">
                [SERVER SIAP]
              </span>
              <span>
                Sistem Siap &amp; Terhubung ke Google Drive Induk Server. Belum ada antrean dokumen. Silakan unggah berkas baru melalui tombol "Upload Dokumen".
              </span>
            </div>
          ) : (
            <div className="animate-marquee flex items-center gap-8 text-xs text-slate-700 whitespace-nowrap">
              {loopedFeed.map((item, idx) => (
                <button
                  key={`${item.doc.id}-${idx}`}
                  onClick={() => onSelectDocument(item.doc)}
                  className="flex items-center gap-2 hover:text-blue-900 transition-colors cursor-pointer group"
                  title="Klik untuk membuka dokumen"
                >
                  {item.icon}
                  <span className={`font-bold text-[11px] ${item.statusColor}`}>
                    [{item.statusLabel}]
                  </span>
                  <span className="text-slate-800 font-medium group-hover:underline">
                    {item.text}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({item.time})
                  </span>
                  <span className="text-blue-300 mx-2">/</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Counter */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-blue-50 border-l border-blue-200 text-[11px] text-blue-900 font-mono shrink-0 font-semibold">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span>{documents.length} Dokumen Terpantau</span>
        </div>
      </div>
    </div>
  );
}
