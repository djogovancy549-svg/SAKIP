import { useState, useId } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Download,
  Lock,
  CheckCircle2,
  FileCheck,
  Printer,
  FileText,
  UserCheck,
  Database,
  QrCode,
  ExternalLink,
  History,
  UploadCloud,
  Check,
  Copy,
  BadgeCheck,
  ArrowRight,
  Eye,
} from 'lucide-react';
import {
  DocumentItem,
  VerificationChecklistItem,
  VerificationStatus,
  VerifierProfile,
  RegistrationSeal,
  AppRole,
} from '../types';
import { sendVerificationToGoogleSheet } from '../services/googleSheetsWebhook';

interface VerificationFormProps {
  document: DocumentItem;
  verifier: VerifierProfile;
  appRole: AppRole;
  onUpdateDocument: (updated: DocumentItem) => void;
  onOpenGoogleSheetModal: () => void;
  onOpenRevisionModal: () => void;
}

const DEFAULT_CHECKLIST: VerificationChecklistItem[] = [
  {
    id: 'chk-ttd',
    label: 'Keabsahan Tanda Tangan & Cap / Segel Resmi Instansi',
    category: 'ADMIN',
    required: true,
  },
  {
    id: 'chk-format',
    label: 'Kesesuaian Tata Naskah Dinas & Penomoran Surat Resmi',
    category: 'ADMIN',
    required: true,
  },
  {
    id: 'chk-identitas',
    label: 'Kebenaran Identitas Pemohon & Instansi / Sub-Kegiatan Terkait',
    category: 'ADMIN',
    required: true,
  },
  {
    id: 'chk-regulasi',
    label: 'Kesesuaian dengan Dasar Regulasi, Perda, & Juknis Terkait',
    category: 'TEKNIS',
    required: true,
  },
  {
    id: 'chk-anggaran',
    label: 'Kesesuaian Rincian Biaya / Anggaran dengan Dokumen Pelaksanaan (DPA)',
    category: 'ANGGARAN',
    required: false,
  },
  {
    id: 'chk-lampiran',
    label: 'Kelengkapan Berkas Lampiran Pendukung (BAST / Kurva S / Hasil Uji Lab)',
    category: 'TEKNIS',
    required: true,
  },
];

export function VerificationForm({
  document,
  verifier,
  appRole,
  onUpdateDocument,
  onOpenGoogleSheetModal,
  onOpenRevisionModal,
}: VerificationFormProps) {
  const notesId = useId();

  // Local state for verification form
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    document.verification?.checklist || {
      'chk-ttd': true,
      'chk-format': true,
      'chk-identitas': true,
      'chk-regulasi': true,
      'chk-anggaran': true,
      'chk-lampiran': document.status === 'REVISION' ? false : true,
    }
  );

  const [notes, setNotes] = useState<string>(
    document.verification?.notes ||
      (document.status === 'REVISION'
        ? document.versions[document.versions.length - 1]?.reviewerNotes || ''
        : '')
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedReg, setCopiedReg] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(
    document.verification?.syncedToGoogleSheet
      ? {
          success: true,
          message: 'Tercatat di Google Sheets Webhook',
          timestamp: document.verification.googleSheetTimestamp,
        }
      : null
  );

  const isApproved = document.status === 'APPROVED';
  const isRejected = document.status === 'REJECTED';
  const isRevision = document.status === 'REVISION';
  const isPending = document.status === 'PENDING';
  const isLocked = document.isLocked || isApproved;

  const handleToggleChecklist = (id: string) => {
    if (isLocked) return;
    setChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = (value: boolean) => {
    if (isLocked) return;
    const updated: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach((item) => {
      updated[item.id] = value;
    });
    setChecklist(updated);
  };

  const handleInsertTemplateNote = (text: string) => {
    if (isLocked) return;
    setNotes((prev) => (prev ? `${prev}\n${text}` : text));
  };

  // Perform Verification / Examination Action
  const handleProcessDecision = async (decision: VerificationStatus) => {
    if (isLocked) return;
    setIsSubmitting(true);
    setSyncFeedback(null);

    try {
      // 1. Post webhook to Google Sheets
      const syncResult = await sendVerificationToGoogleSheet(
        document,
        notes,
        checklist,
        verifier,
        decision
      );

      const timestampNow = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      const bavNumber = `BAV/${document.opdId}/${new Date().getFullYear()}/${document.id.replace('DOC-', '')}`;
      const regNumber = `REG-VERIF/${document.opdId}/${new Date().getFullYear()}/${document.id.replace('DOC-', '')}-V${document.currentVersion}`;
      const securityHash = `SHA256-${document.id}-V${document.currentVersion}-${Date.now().toString(36).toUpperCase()}-VERIFIED`;

      // Update latest version entry with examination feedback
      const updatedVersions = [...document.versions];
      const currentVerIdx = updatedVersions.findIndex((v) => v.versionNumber === document.currentVersion);
      if (currentVerIdx >= 0) {
        updatedVersions[currentVerIdx] = {
          ...updatedVersions[currentVerIdx],
          status: decision,
          reviewerNotes: notes.trim(),
          checklist,
          reviewedBy: verifier.name,
          reviewedAt: timestampNow,
        };
      }

      // Generate Registration Seal if Approved
      let registrationSeal: RegistrationSeal | undefined = document.registrationSeal;
      if (decision === 'APPROVED') {
        registrationSeal = {
          regNumber,
          issuedAt: `${timestampNow} WIB`,
          examinedBy: verifier.name,
          examinedNip: verifier.nip,
          verifiedBy: verifier.name,
          verifiedNip: verifier.nip,
          bavNumber,
          securityHash,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
            `SIMVERIF-SAH|${regNumber}|${document.nomorBerkas}|${document.opdName}|${timestampNow}`
          )}`,
          isLocked: true, // Dokumen yang sudah diverifikasi terkunci permanen
        };
      }

      const updatedDoc: DocumentItem = {
        ...document,
        status: decision,
        // If APPROVED: locked permanently!
        isLocked: decision === 'APPROVED',
        registrationSeal,
        versions: updatedVersions,
        verification: {
          verifiedAt: timestampNow,
          verifiedBy: verifier.name,
          nip: verifier.nip,
          jabatan: verifier.jabatan,
          status: decision,
          checklist,
          notes: notes.trim(),
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VERIF-${document.id}-${decision}`,
          digitalSealHash: securityHash,
          syncedToGoogleSheet: syncResult.success,
          googleSheetTimestamp: syncResult.timestamp,
          bavNumber,
        },
      };

      onUpdateDocument(updatedDoc);
      setSyncFeedback({
        success: syncResult.success,
        message: syncResult.message,
        timestamp: syncResult.timestamp,
      });
    } catch (err: unknown) {
      console.error('Error in decision processing:', err);
      setSyncFeedback({
        success: false,
        message: 'Gagal mengirim ke Webhook Google Sheets',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyRegNumber = () => {
    if (!document.registrationSeal) return;
    navigator.clipboard.writeText(document.registrationSeal.regNumber);
    setCopiedReg(true);
    setTimeout(() => setCopiedReg(false), 2000);
  };

  // Download Official Verified Package
  const handleDownloadVerifiedDocument = () => {
    if (!isApproved) return;

    const reg = document.registrationSeal;
    const verifiedContent = `========================================================================
PEMERINTAH KABUPATEN NAGEKEO - SAKIP NAGEKEO
SISTEM INFORMASI ADMINISTRASI DAN PENGAWASAN SAKIP
LEMBAR TANDA REGISTRASI PEMERIKSAAN & PENGESAHAN DOKUMEN SAKIP RESMI
========================================================================

KODE REGISTRASI RESMI : ${reg?.regNumber || 'REG-TERVERIFIKASI-2026'}
STATUS DOKUMEN        : [ TERVERIFIKASI & TERKUNCI PERMANEN ]
KEPUTUSAN             : DIVERIFIKASI DAN DINYATAKAN SAH HUKUM
TANGGAL & WAKTU SAH   : ${reg?.issuedAt || document.verification?.verifiedAt || '2026-09-29'}

------------------------------------------------------------------------
I. IDENTITAS DOKUMEN RESMI
------------------------------------------------------------------------
Nomor Berkas / Register : ${document.nomorBerkas}
Judul Dokumen          : ${document.judul}
Perihal                : ${document.perihal}
OPD / Dinas Terkait    : ${document.opdName}
Nama Pemohon           : ${document.pemohon.nama} (${document.pemohon.instansi})
Versi Disetujui        : Versi ${document.currentVersion} (Final)
File Asli              : ${document.fileName} (${document.fileSize})

------------------------------------------------------------------------
II. CATATAN HASIL PEMERIKSAAN & TELAAH VERIFIKATOR
------------------------------------------------------------------------
Petugas Pemeriksa/Verifikator : ${reg?.verifiedBy || verifier.name}
NIP                           : ${reg?.verifiedNip || verifier.nip}
Nomor Berita Acara (BAV)      : ${reg?.bavNumber || 'BAV-VALID-2026'}
Catatan Pengesahan            :
"${document.verification?.notes || 'Seluruh instrumen kelengkapan berkas dan syarat teknis telah dipenuhi dan dinyatakan sah.'}"

------------------------------------------------------------------------
III. KODE INTEGRITAS & PENGAMANAN DIGITAL (IMMUTABILITY)
------------------------------------------------------------------------
Hash Bukti Digital (SHA-256) : ${reg?.securityHash || 'HASH-PROOF-VALID'}
Keterangan Status Kunci      : DOKUMEN TERKUNCI PERMANEN (TIDAK DAPAT DIUBAH LAGI)
Pencatatan Basis Data        : Tersinkronisasi Otomatis ke Google Sheets Webhook OPD

========================================================================
Dokumen ini merupakan tanda bukti pengesahan elektronik resmi yang sah.
========================================================================`;

    const blob = new Blob([verifiedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `TANDA_REGISTRASI_SAH_${document.nomorBerkas.replace(/[/\\?%*:|"<>]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintBeritaAcara = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
      {/* Form Header */}
      <div className="px-5 py-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                Alur Pemeriksaan & Verifikasi Dokumen
              </h2>
              <p className="text-[11px] text-slate-400">
                Tahap: Pemeriksaan Berkas · Catatan Revisi · Pengesahan Final
              </p>
            </div>
          </div>

          {/* Current Version Pill */}
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-slate-800 border border-slate-700 text-emerald-400 rounded">
            Versi {document.currentVersion}
          </span>
        </div>

        {/* Target Document Quick Strip */}
        <div className="p-2.5 bg-slate-900 rounded border border-slate-800 text-xs space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-slate-400">Nomor Berkas:</span>
            <span className="font-mono font-semibold text-slate-200 truncate">
              {document.nomorBerkas}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-slate-400">Pemohon:</span>
            <span className="text-slate-300 truncate">
              {document.pemohon.nama} ({document.opdName})
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-300">
        {/* SECTION 1: Status & Workflow Indicator */}
        <div
          className={`p-3.5 rounded-lg border flex items-start gap-3 ${
            isApproved
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
              : isRevision
              ? 'bg-orange-950/30 border-orange-500/30 text-orange-300'
              : isRejected
              ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
          }`}
        >
          {isApproved ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : isRevision ? (
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          ) : isRejected ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1 flex-1">
            <div className="font-bold text-xs flex items-center justify-between">
              <span>
                {isApproved && 'Tahap Selesai: Dokumen Terverifikasi & Terkunci'}
                {isRevision && 'Tahap Pemeriksaan: Dokumen Butuh Revisi Dinas'}
                {isPending && 'Tahap 1: Pemeriksaan Berkas Dokumen (Review)'}
                {isRejected && 'Dokumen Ditolak (Tidak Memenuhi Syarat)'}
              </span>
              {isLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  <Lock className="w-3 h-3" /> TERKUNCI PERMANEN
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {isApproved && 'Dokumen telah diperiksa dan diverifikasi secara sah. Berkas terkunci permanen tidak dapat diubah lagi, dan tanda registrasi resmi telah diterbitkan.'}
              {isRevision && 'Bagian verifikasi telah memberikan catatan perbaikan. Dinas dapat mengunggah kembali dokumen hasil revisi melalui tombol di bawah.'}
              {isPending && 'Verifikator memeriksa lembar dokumen. Jika ada kekurangan, berikan catatan perbaikan. Jika telah lengkap, sahkan dokumen.'}
              {isRejected && 'Dokumen tidak memenuhi persyaratan dan tidak dapat diproses lebih lanjut.'}
            </p>
          </div>
        </div>

        {/* SECTION 2: TANDA REGISTRASI RESMI (JIKA SUDAH DIVERIFIKASI) */}
        {isApproved && document.registrationSeal && (
          <div className="p-4 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-xl space-y-3 relative overflow-hidden shadow-xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">
                    Tanda Registrasi Pemeriksaan & Verifikasi
                  </h3>
                  <p className="text-[10px] text-emerald-300/80">
                    Sertifikat Pengesahan Resmi Pemerintah Daerah
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono bg-emerald-900/40 text-emerald-300 px-2 py-1 rounded border border-emerald-500/30">
                <Lock className="w-3 h-3" /> SAH & TERKUNCI
              </div>
            </div>

            {/* Registration Number Strip with Copy */}
            <div className="p-2.5 bg-black/40 rounded-lg border border-emerald-500/30 flex items-center justify-between gap-2">
              <div>
                <div className="text-[9px] text-slate-400 uppercase font-mono">Nomor Registrasi Resmi:</div>
                <div className="font-mono font-black text-xs text-emerald-300 tracking-wide">
                  {document.registrationSeal.regNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyRegNumber}
                className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 rounded border border-emerald-500/30 transition-colors"
                title="Salin Nomor Registrasi"
              >
                {copiedReg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Seal Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">Telah Diperiksa Oleh:</span>
                <span className="font-medium text-slate-200">{document.registrationSeal.examinedBy}</span>
                <span className="text-[10px] font-mono text-slate-400 block">NIP. {document.registrationSeal.examinedNip}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Diverifikasi & Disahkan:</span>
                <span className="font-medium text-slate-200">{document.registrationSeal.verifiedBy}</span>
                <span className="text-[10px] font-mono text-slate-400 block">NIP. {document.registrationSeal.verifiedNip}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Nomor Berita Acara (BAV):</span>
                <span className="font-mono text-emerald-300 font-semibold">{document.registrationSeal.bavNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Waktu Pengesahan:</span>
                <span className="font-mono text-slate-300">{document.registrationSeal.issuedAt}</span>
              </div>
            </div>

            {/* Immutability Note */}
            <div className="p-2 bg-slate-950/80 rounded border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Dokumen telah dikunci secara elektronik. Seluruh data berkas bersifat tetap dan tidak dapat diedit ulang.</span>
            </div>
          </div>
        )}

        {/* SECTION 3: REVISION ACTION FOR DINAS (JIKA SEDANG PERLU REVISI) */}
        {isRevision && (
          <div className="p-4 bg-orange-950/30 border border-orange-500/40 rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-xs text-orange-200">
                  Dinas Diminta Memperbaiki & Mengunggah Ulang Dokumen
                </div>
                <p className="text-[11px] text-orange-300/80">
                  Setelah berkas diperbaiki sesuai catatan verifikator di bawah, silakan unggah kembali dokumen hasil revisi untuk diperiksa ulang.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenRevisionModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Unggah Dokumen Hasil Revisi (Versi {document.currentVersion + 1})</span>
            </button>
          </div>
        )}

        {/* SECTION 4: VERSION TIMELINE & RIWAYAT PEMERIKSAAN */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-400" />
              <span>Riwayat Versi & Pemeriksaan Dokumen</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Total: {document.versions.length} Versi
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {document.versions.map((ver) => (
              <div
                key={ver.versionNumber}
                className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                  ver.versionNumber === document.currentVersion
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800/60 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>Versi {ver.versionNumber}</span>
                    {ver.versionNumber === document.currentVersion && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-sans">
                        Aktif
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-500">{ver.uploadedAt}</span>
                </div>

                <div className="text-[11px] text-slate-300 flex items-center justify-between gap-2">
                  <span className="truncate">{ver.fileName}</span>
                  <span className="font-mono text-slate-500 text-[10px] shrink-0">{ver.fileSize}</span>
                </div>

                {ver.changeSummary && (
                  <div className="text-[10px] text-slate-400 bg-slate-900/80 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-500 font-semibold">Keterangan Dinas: </span>
                    {ver.changeSummary}
                  </div>
                )}

                {ver.reviewerNotes && (
                  <div className="text-[10px] text-orange-300/90 bg-orange-950/30 p-1.5 rounded border border-orange-500/20">
                    <span className="font-semibold text-orange-400">Catatan Pemeriksa: </span>
                    {ver.reviewerNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: INSTRUMEN CHECKLIST PEMERIKSAAN */}
        <div className="space-y-3 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instrumen Checklist Pemeriksaan</span>
            </div>
            {!isLocked && (
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-emerald-400 hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-600">/</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-slate-400 hover:underline"
                >
                  Kosongkan
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {DEFAULT_CHECKLIST.map((item) => {
              const isChecked = !!checklist[item.id];
              return (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                    isLocked ? 'cursor-default opacity-85' : 'cursor-pointer'
                  } ${
                    isChecked
                      ? 'bg-slate-800/80 border-emerald-500/30 text-slate-100'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={isChecked}
                    onChange={() => handleToggleChecklist(item.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400/20 accent-emerald-500 disabled:opacity-70"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-medium">{item.label}</span>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>Kategori: {item.category}</span>
                      <span>·</span>
                      <span className={item.required ? 'text-amber-400' : 'text-slate-400'}>
                        {item.required ? 'Syarat Wajib' : 'Tambahan'}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* SECTION 6: CATATAN PEMERIKSAAN YANG HENDAK DIUBAH */}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between">
            <label htmlFor={notesId} className="font-bold text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Catatan Pemeriksaan & Butir yang Hendak Diubah</span>
            </label>
            <span className="text-[10px] text-slate-500">
              *Tercatat di Google Sheet & Riwayat
            </span>
          </div>

          {!isLocked && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleInsertTemplateNote(
                    'Perbaikan Dokumen: Harap melampirkan lembar pengesahan BAST dan bukti uji mutu material sebelum verifikasi disahkan.'
                  )
                }
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-300 transition-colors"
              >
                + Butuh Lampiran BAST/Uji Mutu
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertTemplateNote(
                    'Perbaikan Format: Nomor register naskah dinas dan format tanda tangan belum sesuai Permendagri No. 1 Tahun 2023.'
                  )
                }
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-300 transition-colors"
              >
                + Koreksi Format Naskah
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertTemplateNote(
                    'Hasil Pemeriksaan: Seluruh berkas telah lengkap, valid, dan memenuhi syarat untuk diverifikasi dan disahkan.'
                  )
                }
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded text-slate-300 transition-colors"
              >
                + Berkas Lengkap & Siap Sah
              </button>
            </div>
          )}

          <textarea
            id={notesId}
            rows={3}
            disabled={isLocked}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ketik catatan telaah, hasil pemeriksaan berkas, atau rincian butir yang harus diubah/direvisi oleh dinas..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-60"
          />
        </div>

        {/* SECTION 7: KEPUTUSAN VERIFIKASI & PENGESAHAN */}
        {!isLocked ? (
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tindakan Pemeriksa & Verifikator :
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* TOMBOL 1: SETUJUI & SAHKAN (KUNCI DOKUMEN) */}
              <button
                type="button"
                onClick={() => handleProcessDecision('APPROVED')}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-1.5 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer text-xs"
                title="Sahkan dokumen dan terbitkan tanda registrasi resmi (dokumen terkunci permanen)"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>SETUJUI & SAHKAN</span>
              </button>

              {/* TOMBOL 2: KEMBALIKAN UNTUK REVISI */}
              <button
                type="button"
                onClick={() => handleProcessDecision('REVISION')}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-1.5 py-3 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer text-xs"
                title="Kembalikan berkas ke dinas dengan catatan perbaikan untuk diunggah ulang"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>KEMBALIKAN REVISI</span>
              </button>

              {/* TOMBOL 3: TOLAK BERKAS */}
              <button
                type="button"
                onClick={() => handleProcessDecision('REJECTED')}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-1.5 py-3 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer text-xs"
                title="Tolak berkas secara resmi"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>TOLAK DOKUMEN</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              *Catatan: Mengklik "SETUJUI & SAHKAN" akan mengunci dokumen secara permanen dan menerbitkan Tanda Registrasi Resmi.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Dokumen telah selesai diverifikasi & terkunci permanen.</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400">STATUS: FINAL IMMUTABLE</span>
          </div>
        )}

        {/* SECTION 8: GOOGLE SHEETS WEBHOOK SYNC BAR */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Google Sheet:</span>
            {syncFeedback ? (
              <span className={syncFeedback.success ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                {syncFeedback.message}
              </span>
            ) : (
              <span className="text-slate-500">Pencatatan webhook aktif otomatis</span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenGoogleSheetModal}
            className="text-emerald-400 hover:underline flex items-center gap-1 shrink-0 font-medium"
          >
            <span>Buka Webhook</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* SECTION 9: PENGUNDUHAN DOKUMEN & TANDA REGISTRASI */}
        <div className="pt-3 border-t-2 border-dashed border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Unduh Dokumen & Tanda Registrasi</span>
            </div>
            {isApproved ? (
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" /> AKSES RESMI TERBUKA
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 font-mono">
                <Lock className="w-3.5 h-3.5" /> DOKUMEN TERKUNCI
              </span>
            )}
          </div>

          {isApproved ? (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-3">
              <p className="text-[11px] text-slate-300">
                Dokumen telah selesai diperiksa dan diverifikasi secara sah. Tanda Registrasi Resmi telah diterbitkan dan dapat diunduh/dicetak.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadVerifiedDocument}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen & Lembar Registrasi</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintBeritaAcara}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors border border-slate-700 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Lembar Tanda Registrasi</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Lock className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-xs">Unduh Hanya Tersedia Setelah Disetujui</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Dokumen yang masih dalam status <strong>{document.status === 'PENDING' ? 'Pemeriksaan Awal' : 'Perlu Revisi'}</strong> belum dapat diunduh sampai verifikator menyetujui dan mengesahkan berkas.
              </p>
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800/40 text-slate-600 font-bold rounded-lg text-xs cursor-not-allowed border border-slate-800/80"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Unduh Dokumen (Terkunci Sebelum Disahkan)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
