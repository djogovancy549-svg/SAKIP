import { ShieldCheck, ShieldAlert, Clock, AlertTriangle, Lock } from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentWatermarkProps {
  document: DocumentItem;
  opacity?: number;
  showPattern?: boolean;
}

export function DocumentWatermark({
  document,
  opacity = 0.04,
  showPattern = false,
}: DocumentWatermarkProps) {
  const isApproved = document.status === 'APPROVED';
  const isPending = document.status === 'PENDING';
  const isRejected = document.status === 'REJECTED';
  const isRevision = document.status === 'REVISION';

  let primaryText = `DRAF SAKIP NAGEKEO • ${document.opdName.toUpperCase()}`;
  let secondaryText = `VERSI ${document.currentVersion} • DALAM PEMERIKSAAN • ${document.nomorBerkas}`;
  let textColor = 'text-slate-900';

  if (isApproved) {
    primaryText = `TERVERIFIKASI & SAH • PEMKAB NAGEKEO`;
    secondaryText = `NO REG: ${document.registrationSeal?.regNumber || 'REG-VALID'} • TERKUNCI PERMANEN`;
    textColor = 'text-emerald-900';
  } else if (isRejected) {
    primaryText = `DOKUMEN DITOLAK • ${document.opdName.toUpperCase()}`;
    secondaryText = `TIDAK MEMENUHI PERSYARATAN SAKIP`;
    textColor = 'text-rose-900';
  } else if (isRevision) {
    primaryText = `BUTUH REVISI DINAS • ${document.opdName.toUpperCase()}`;
    secondaryText = `DIKEMBALIKAN UNTUK PERBAIKAN BERKAS • VERSI ${document.currentVersion}`;
    textColor = 'text-amber-900';
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-10 select-none flex flex-col justify-around"
      style={{ opacity }}
    >
      {/* Repeating Diagonal Watermark Rows - Clean and Subtle */}
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className="flex whitespace-nowrap -rotate-12 transform scale-110 justify-around select-none py-4"
        >
          {Array.from({ length: 3 }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={`flex items-center gap-3 font-mono font-black text-sm tracking-widest uppercase ${textColor}`}
            >
              <span>{primaryText}</span>
              <span>•</span>
              <span className="text-xs font-semibold">{secondaryText}</span>
              <span>•</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
