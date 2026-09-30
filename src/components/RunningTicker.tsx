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
    <div className="w-full bg-slate-900/90 border-y border-slate-800 backdrop-blur-md overflow-hidden relative select-none">
      <div className="flex items-center">
        {/* Left Badge: Status Siaran Langsung */}
        <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 bg-slate-950 border-r border-slate-800 z-10 shadow-sm text-xs font-semibold text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase whitespace-nowrap">
            Data Berjalan OPD
          </span>
        </div>

        {/* Marquee Viewport */}
        <div className="overflow-hidden flex-1 relative py-1.5">
          <div className="animate-marquee flex items-center gap-8 text-xs text-slate-300 whitespace-nowrap">
            {loopedFeed.map((item, idx) => (
              <button
                key={`${item.doc.id}-${idx}`}
                onClick={() => onSelectDocument(item.doc)}
                className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer group"
                title="Klik untuk membuka dokumen"
              >
                {item.icon}
                <span className={`font-semibold text-[11px] ${item.statusColor}`}>
                  [{item.statusLabel}]
                </span>
                <span className="text-slate-300 group-hover:underline">
                  {item.text}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({item.time})
                </span>
                <span className="text-slate-600 mx-2">/</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Counter */}
        <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-950 border-l border-slate-800 text-[11px] text-slate-400 font-mono shrink-0">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>{documents.length} Dokumen Terpantau</span>
        </div>
      </div>
    </div>
  );
}
