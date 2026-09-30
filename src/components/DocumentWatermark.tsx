import { ShieldCheck, ShieldAlert, Clock, AlertTriangle, Lock } from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentWatermarkProps {
  document: DocumentItem;
  opacity?: number;
  showPattern?: boolean;
}

export function DocumentWatermark({
  document,
  opacity = 0.12,
  showPattern = true,
}: DocumentWatermarkProps) {
  const isApproved = document.status === 'APPROVED';
  const isPending = document.status === 'PENDING';
  const isRejected = document.status === 'REJECTED';
  const isRevision = document.status === 'REVISION';

  let primaryText = `DRAF PEMERIKSAAN • ${document.opdName.toUpperCase()}`;
  let secondaryText = `VERSI ${document.currentVersion} • BELUM DISAHKAN • NO: ${document.nomorBerkas}`;
  let borderColor = 'border-amber-500/20';
  let textColor = 'text-amber-500';

  if (isApproved) {
    primaryText = `TERVERIFIKASI & SAH • ${document.opdName.toUpperCase()}`;
    secondaryText = `NO REG: ${document.registrationSeal?.regNumber || 'REG-VALID'} • DOKUMEN TERKUNCI PERMANEN`;
    borderColor = 'border-emerald-500/30';
    textColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (isRejected) {
    primaryText = `DOKUMEN DITOLAK • ${document.opdName.toUpperCase()}`;
    secondaryText = `TIDAK BERLAKU / TIDAK MEMENUHI SYARAT`;
    borderColor = 'border-rose-500/30';
    textColor = 'text-rose-600 dark:text-rose-400';
  } else if (isRevision) {
    primaryText = `PERLU REVISI DINAS • ${document.opdName.toUpperCase()}`;
    secondaryText = `DIKEMBALIKAN UNTUK PERBAIKAN BERKAS • VERSI ${document.currentVersion}`;
    borderColor = 'border-orange-500/30';
    textColor = 'text-orange-600 dark:text-orange-400';
  }

  // Generate repeating watermark rows
  const watermarkRows = Array.from({ length: 6 });

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-10 select-none flex flex-col justify-between"
      style={{ opacity }}
    >
      {/* Background Micro Security Pattern Grid */}
      {showPattern && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {/* Repeating Diagonal Watermark Lines */}
      <div className="absolute inset-0 flex flex-col justify-around rotate-[-25deg] scale-125">
        {watermarkRows.map((_, i) => (
          <div
            key={i}
            className={`flex items-center justify-around whitespace-nowrap text-xs md:text-sm font-black uppercase tracking-widest ${textColor}`}
          >
            <span className="flex items-center gap-2">
              <span>{primaryText}</span>
              <span className="opacity-50">/</span>
              <span className="text-[11px] font-mono">{secondaryText}</span>
            </span>
            <span className="hidden md:flex items-center gap-2">
              <span>{primaryText}</span>
              <span className="opacity-50">/</span>
              <span className="text-[11px] font-mono">{secondaryText}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Center Official Digital Stamp */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-76 h-76 md:w-88 md:h-88 rounded-full border-4 border-dashed ${borderColor} flex flex-col items-center justify-center p-6 text-center transform rotate-[-12deg]`}
        >
          {isApproved ? (
            <ShieldCheck className="w-16 h-16 text-emerald-500 mb-2 opacity-85" />
          ) : isPending ? (
            <Clock className="w-14 h-14 text-amber-500 mb-2 opacity-70" />
          ) : isRevision ? (
            <AlertTriangle className="w-14 h-14 text-orange-500 mb-2 opacity-75" />
          ) : (
            <ShieldAlert className="w-14 h-14 text-rose-500 mb-2 opacity-75" />
          )}

          <div className={`text-base md:text-lg font-black uppercase tracking-widest ${textColor}`}>
            {isApproved
              ? 'TERVERIFIKASI & TERKUNCI'
              : isPending
              ? 'DALAM PEMERIKSAAN'
              : isRevision
              ? 'MENUNGGU REVISI DINAS'
              : 'DITOLAK RESMI'}
          </div>
          <div className="text-[11px] font-semibold text-slate-500 mt-1 max-w-[210px]">
            {document.opdName}
          </div>
          {isApproved && document.registrationSeal ? (
            <div className="text-[10px] font-mono text-emerald-600 font-bold mt-2">
              {document.registrationSeal.regNumber}
            </div>
          ) : (
            <div className="text-[10px] font-mono text-slate-500 mt-2">
              BERKAS VERSI {document.currentVersion}
            </div>
          )}
          {document.verification?.verifiedAt && (
            <div className="text-[9px] font-mono text-slate-400 mt-1">
              SAH: {document.verification.verifiedAt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
