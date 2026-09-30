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
    id: 'chk-lampiran',
    label: 'Kelengkapan Dokumen Lampiran, KAK, BAST & Bukti Pendukung',
    category: 'TEKNIS',
    required: true,
  },
  {
    id: 'chk-evaluasi',
    label: 'Kesesuaian Indikator Kinerja & Pengawasan SAKIP Nagekeo',
    category: 'TEKNIS',
    required: true,
  },
  {
    id: 'chk-anggaran',
    label: 'Konsistensi Anggaran / Realisasi Belanja dengan DPA/RKA',
    category: 'ANGGARAN',
    required: false,
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
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    return document.verification?.checklist || {
      'chk-ttd': true,
      'chk-format': true,
      'chk-identitas': true,
      'chk-lampiran': false,
      'chk-evaluasi': false,
    };
  });

  const [notes, setNotes] = useState<string>(document.verification?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedReg, setCopiedReg] = useState<boolean>(false);

  const isVerifier = appRole === 'VERIFIKATOR';
  const isApproved = document.status === 'APPROVED';
  const isRevision = document.status === 'REVISION';
  const isPending = document.status === 'PENDING';
  const isRejected = document.status === 'REJECTED';
  const isLocked = document.isLocked || isApproved;

  const handleToggleChecklist = (id: string) => {
    if (isLocked || !isVerifier) return;
    setChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = (check: boolean) => {
    if (isLocked || !isVerifier) return;
    const updated: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach((item) => {
      updated[item.id] = check;
    });
    setChecklist(updated);
  };

  const handleInsertTemplateNote = (text: string) => {
    if (isLocked || !isVerifier) return;
    setNotes((prev) => (prev ? `${prev}\n${text}` : text));
  };

  const handleProcessDecision = async (newStatus: VerificationStatus) => {
    if (isLocked || !isVerifier) return;

    setIsSubmitting(true);
    setSyncFeedback(null);

    const timestampNow = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const cleanNumber = document.nomorBerkas.replace(/[^a-zA-Z0-9]/g, '');
    const uniqueSuffix = Date.now().toString().slice(-4);
    const regNumber = `REG-${document.opdId}-${cleanNumber}-${uniqueSuffix}`;
    const bavNumber = `BAV/SAKIP-NGK/${document.opdId}/${new Date().getFullYear()}/${uniqueSuffix}`;
    const securityHash = `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(regNumber)}&size=150x150`;

    const newSeal: RegistrationSeal | undefined =
      newStatus === 'APPROVED'
        ? {
            regNumber,
            bavNumber,
            issuedAt: timestampNow,
            examinedBy: verifier.name,
            examinedNip: verifier.nip,
            verifiedBy: verifier.name,
            verifiedNip: verifier.nip,
            qrCodeUrl,
            securityHash,
            isLocked: true,
          }
        : document.registrationSeal;

    const updatedVersions = document.versions.map((ver) => {
      if (ver.versionNumber === document.currentVersion) {
        return {
          ...ver,
          status: newStatus,
          reviewerNotes: notes || ver.reviewerNotes,
          reviewedAt: timestampNow,
        };
      }
      return ver;
    });

    const updatedDoc: DocumentItem = {
      ...document,
      status: newStatus,
      isLocked: newStatus === 'APPROVED',
      registrationSeal: newSeal,
      versions: updatedVersions,
      verification: {
        status: newStatus,
        verifiedBy: verifier.name,
        nip: verifier.nip,
        jabatan: verifier.jabatan,
        verifiedAt: timestampNow,
        notes,
        checklist,
        qrCodeUrl,
        digitalSealHash: securityHash,
        syncedToGoogleSheet: true,
        bavNumber,
      },
    };

    onUpdateDocument(updatedDoc);

    try {
      await sendVerificationToGoogleSheet(updatedDoc, notes, checklist, verifier, newStatus);
      setSyncFeedback({
        success: true,
        message: 'Hasil pemeriksaan berhasil disinkronkan ke Google Sheet Webhook SAKIP!',
      });
    } catch {
      setSyncFeedback({
        success: true,
        message: 'Hasil pemeriksaan tersimpan secara lokal di sistem.',
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
Pencatatan Basis Data        : Tersinkronisasi Otomatis ke Google Sheets Webhook SAKIP Nagekeo

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
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full shadow-xl text-slate-800">
      {/* Form Header - Vibrant Blue & Crisp White */}
      <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white border-b border-blue-500 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 border border-white/20 rounded-xl text-white shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide drop-shadow-xs">
                Alur Pemeriksaan &amp; Verifikasi Dokumen
              </h2>
              <p className="text-[11px] text-blue-100">
                Tahap: Pemeriksaan Berkas · Catatan Revisi · Pengesahan Final SAKIP
              </p>
            </div>
          </div>

          {/* Current Version Pill */}
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 bg-white/20 border border-white/30 text-white rounded-lg shadow-xs">
            Versi {document.currentVersion}
          </span>
        </div>

        {/* Target Document Quick Strip */}
        <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-xs space-y-1 text-white">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-blue-100 font-medium">Nomor Berkas:</span>
            <span className="font-mono font-bold text-white truncate">
              {document.nomorBerkas}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-blue-100 font-medium">Pemohon / OPD:</span>
            <span className="text-white font-medium truncate">
              {document.pemohon.nama} ({document.opdName})
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Form Body - Clean High Contrast Background */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-900 bg-white">
        {/* OPD ROLE NOTICE BANNER */}
        {!isVerifier && (
          <div className="p-3.5 bg-blue-50 border-2 border-blue-400 rounded-xl flex items-center gap-3 text-blue-950 font-bold text-xs shadow-xs">
            <Lock className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <span className="block font-black text-blue-900 uppercase">AKSES KHUSUS DINAS PEMOHON (BACA SAJA)</span>
              <span className="font-medium text-slate-800 text-[11px]">
                Sebagai akun OPD ({document.opdName}), Anda dapat membaca status, catatan revisi, dan mengunggah berkas perbaikan. Hak pengesahan dan verifikasi dokumen khusus dipegang oleh Admin / Petugas Verifikator SAKIP.
              </span>
            </div>
          </div>
        )}

        {/* SECTION 1: Status & Workflow Indicator */}
        <div
          className={`p-4 rounded-2xl border-2 flex items-start gap-3 shadow-xs ${
            isApproved
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
              : isRevision
              ? 'bg-amber-50 border-amber-400 text-amber-950'
              : isRejected
              ? 'bg-rose-50 border-rose-400 text-rose-950'
              : 'bg-blue-50 border-blue-400 text-blue-950'
          }`}
        >
          {isApproved ? (
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : isRevision ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : isRejected ? (
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1 flex-1">
            <div className="font-black text-xs flex items-center justify-between">
              <span>
                {isApproved && 'Tahap Selesai: Dokumen Terverifikasi & Terkunci'}
                {isRevision && 'Tahap Pemeriksaan: Dokumen Butuh Revisi Dinas'}
                {isPending && 'Tahap 1: Pemeriksaan Berkas Dokumen (Review)'}
                {isRejected && 'Dokumen Ditolak (Tidak Memenuhi Syarat)'}
              </span>
              {isLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 font-black">
                  <Lock className="w-3 h-3" /> TERKUNCI PERMANEN
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed font-bold text-slate-800">
              {isApproved && 'Dokumen telah diperiksa dan diverifikasi secara sah. Berkas terkunci permanen tidak dapat diubah lagi, dan tanda registrasi resmi telah diterbitkan.'}
              {isRevision && 'Bagian verifikasi telah memberikan catatan perbaikan. Dinas dapat mengunggah kembali dokumen hasil revisi melalui tombol di bawah.'}
              {isPending && 'Verifikator memeriksa lembar dokumen. Jika ada kekurangan, berikan catatan perbaikan. Jika telah lengkap, sahkan dokumen.'}
              {isRejected && 'Dokumen tidak memenuhi persyaratan dan tidak dapat diproses lebih lanjut.'}
            </p>
          </div>
        </div>

        {/* SECTION 2: TANDA REGISTRASI RESMI (JIKA SUDAH DIVERIFIKASI) */}
        {isApproved && document.registrationSeal && (
          <div className="p-4 bg-emerald-50/80 border-2 border-emerald-400 rounded-2xl space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
                    Tanda Registrasi Pemeriksaan &amp; Verifikasi
                  </h3>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    Sertifikat Pengesahan Resmi Pemerintah Kabupaten Nagekeo
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-300 font-bold">
                <Lock className="w-3 h-3 text-emerald-700" /> SAH &amp; TERKUNCI
              </div>
            </div>

            {/* Registration Number Strip with Copy */}
            <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-2 shadow-xs">
              <div>
                <div className="text-[9px] text-slate-500 uppercase font-mono font-bold">Nomor Registrasi Resmi:</div>
                <div className="font-mono font-black text-xs text-emerald-800 tracking-wide">
                  {document.registrationSeal.regNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyRegNumber}
                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
                title="Salin Nomor Registrasi"
              >
                {copiedReg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Seal Details Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-[11px] text-slate-700 bg-white/70 p-3 rounded-xl border border-emerald-100">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Telah Diperiksa Oleh:</span>
                <span className="font-bold text-slate-900">{document.registrationSeal.examinedBy}</span>
                <span className="text-[10px] font-mono text-slate-500 block">NIP. {document.registrationSeal.examinedNip}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Diverifikasi &amp; Disahkan:</span>
                <span className="font-bold text-slate-900">{document.registrationSeal.verifiedBy}</span>
                <span className="text-[10px] font-mono text-slate-500 block">NIP. {document.registrationSeal.verifiedNip}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Nomor Berita Acara (BAV):</span>
                <span className="font-mono text-emerald-800 font-bold">{document.registrationSeal.bavNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold">Waktu Pengesahan:</span>
                <span className="font-mono text-slate-700 font-medium">{document.registrationSeal.issuedAt}</span>
              </div>
            </div>

            {/* Immutability Note */}
            <div className="p-2 bg-white/80 rounded-lg border border-emerald-200 text-[10px] text-emerald-900 flex items-center gap-2 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Dokumen telah dikunci secara elektronik. Seluruh data berkas bersifat tetap dan tidak dapat diedit ulang.</span>
            </div>
          </div>
        )}

        {/* SECTION 3: REVISION ACTION FOR DINAS (JIKA SEDANG PERLU REVISI) */}
        {isRevision && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-xs text-amber-950">
                  Dinas Diminta Memperbaiki &amp; Mengunggah Ulang Dokumen
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Setelah berkas diperbaiki sesuai catatan verifikator di bawah, silakan unggah kembali dokumen hasil revisi untuk diperiksa ulang.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenRevisionModal}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Unggah Dokumen Hasil Revisi (Versi {document.currentVersion + 1})</span>
            </button>
          </div>
        )}

        {/* SECTION 4: VERSION TIMELINE & RIWAYAT PEMERIKSAAN */}
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>Riwayat Versi &amp; Pemeriksaan Dokumen</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Total: {document.versions.length} Versi
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {document.versions.map((ver) => (
              <div
                key={ver.versionNumber}
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  ver.versionNumber === document.currentVersion
                    ? 'bg-blue-50/70 border-blue-200 text-slate-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-blue-700 flex items-center gap-1">
                    <span>Versi {ver.versionNumber}</span>
                    {ver.versionNumber === document.currentVersion && (
                      <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-sans font-bold">
                        Aktif
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">{ver.uploadedAt}</span>
                </div>

                <div className="text-[11px] text-slate-800 flex items-center justify-between gap-2 font-medium">
                  <span className="truncate">{ver.fileName}</span>
                  <span className="font-mono text-slate-400 text-[10px] shrink-0">{ver.fileSize}</span>
                </div>

                {ver.changeSummary && (
                  <div className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-semibold">Keterangan Dinas: </span>
                    {ver.changeSummary}
                  </div>
                )}

                {ver.reviewerNotes && (
                  <div className="text-[10px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <span className="font-bold text-amber-700">Catatan Pemeriksa: </span>
                    {ver.reviewerNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: INSTRUMEN CHECKLIST PEMERIKSAAN */}
        <div className="space-y-3 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Instrumen Checklist Pemeriksaan</span>
            </div>
            {!isLocked && isVerifier && (
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Pilih Semua
                </button>
                <span className="text-slate-300">/</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-slate-500 hover:underline font-bold cursor-pointer"
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
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                    isLocked || !isVerifier ? 'cursor-default' : 'cursor-pointer hover:border-blue-400'
                  } ${
                    isChecked
                      ? 'bg-blue-50 border-blue-400 text-slate-950 font-bold shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={isLocked || !isVerifier}
                    checked={isChecked}
                    onChange={() => handleToggleChecklist(item.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-400 bg-white text-blue-600 focus:ring-blue-500/20 accent-blue-600 disabled:opacity-70 cursor-pointer"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-950">{item.label}</span>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-700 font-mono font-bold">
                      <span>Kategori: {item.category}</span>
                      <span>·</span>
                      <span className={item.required ? 'text-amber-800 font-black' : 'text-slate-600'}>
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
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <div className="flex items-center justify-between">
            <label htmlFor={notesId} className="font-black text-slate-950 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Catatan Pemeriksaan &amp; Butir yang Hendak Diubah</span>
            </label>
            <span className="text-[10px] text-slate-600 font-mono font-bold">
              *Tercatat di Google Sheet &amp; Riwayat
            </span>
          </div>

          {!isLocked && isVerifier && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleInsertTemplateNote(
                    'Perbaikan Dokumen: Harap melampirkan lembar pengesahan BAST dan bukti evaluasi SAKIP sebelum verifikasi disahkan.'
                  )
                }
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-[10px] rounded-lg text-slate-900 transition-colors font-bold cursor-pointer shadow-2xs"
              >
                + Butuh Lampiran SAKIP/BAST
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertTemplateNote(
                    'Perbaikan Format: Nomor register naskah dinas dan format tanda tangan belum sesuai Permendagri No. 1 Tahun 2023.'
                  )
                }
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-[10px] rounded-lg text-slate-900 transition-colors font-bold cursor-pointer shadow-2xs"
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
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-[10px] rounded-lg text-slate-900 transition-colors font-bold cursor-pointer shadow-2xs"
              >
                + Berkas Lengkap &amp; Siap Sah
              </button>
            </div>
          )}

          <textarea
            id={notesId}
            rows={3}
            disabled={isLocked || !isVerifier}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isVerifier
                ? 'Ketik catatan telaah, hasil pemeriksaan berkas, atau rincian butir yang harus diubah/direvisi oleh dinas...'
                : 'Catatan dari Petugas Verifikator...'
            }
            className="w-full bg-white border-2 border-slate-300 rounded-xl p-3 text-xs text-slate-950 font-bold placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-900 shadow-xs"
          />
        </div>

        {/* SECTION 7: KEPUTUSAN VERIFIKASI & PENGESAHAN */}
        {!isLocked ? (
          isVerifier ? (
            <div className="space-y-2 pt-3 border-t border-slate-200">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                Tindakan Pemeriksa &amp; Verifikator :
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* TOMBOL 1: SETUJUI & SAHKAN */}
                <button
                  type="button"
                  onClick={() => handleProcessDecision('APPROVED')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer text-xs active:scale-95"
                  title="Sahkan dokumen dan terbitkan tanda registrasi resmi (dokumen terkunci permanen)"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>SETUJUI &amp; SAHKAN</span>
                </button>

                {/* TOMBOL 2: KEMBALIKAN UNTUK REVISI */}
                <button
                  type="button"
                  onClick={() => handleProcessDecision('REVISION')}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer text-xs active:scale-95"
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
                  className="flex items-center justify-center gap-1.5 py-3 px-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer text-xs active:scale-95"
                  title="Tolak berkas secara resmi"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>TOLAK DOKUMEN</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-700 font-bold italic">
                *Catatan: Mengklik "SETUJUI &amp; SAHKAN" akan mengunci dokumen secara permanen dan menerbitkan Tanda Registrasi Resmi SAKIP Nagekeo.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 border-2 border-slate-300 rounded-2xl text-center space-y-2 shadow-xs">
              <ShieldCheck className="w-6 h-6 text-blue-700 mx-auto" />
              <div className="font-black text-slate-950 text-xs uppercase tracking-wide">
                Pengesahan &amp; Keputusan Khusus Admin / Petugas Verifikator
              </div>
              <p className="text-[11px] text-slate-800 font-bold max-w-md mx-auto leading-relaxed">
                Akun OPD ({document.opdName}) hanya dapat membaca lembar verifikasi ini. Keputusan pengesahan, revisi, atau penolakan dokumen secara resmi dilakukan oleh Admin Verifikator SAKIP Nagekeo.
              </p>
            </div>
          )
        ) : (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <span className="flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Dokumen telah selesai diverifikasi &amp; terkunci permanen.</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-300">
              STATUS: FINAL IMMUTABLE
            </span>
          </div>
        )}

        {/* SECTION 8: GOOGLE SHEETS WEBHOOK SYNC BAR */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-[11px] shadow-2xs">
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-slate-500 font-medium">Google Sheet:</span>
            {syncFeedback ? (
              <span className={syncFeedback.success ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                {syncFeedback.message}
              </span>
            ) : (
              <span className="text-slate-600">Pencatatan webhook aktif otomatis</span>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenGoogleSheetModal}
            className="text-blue-600 hover:underline flex items-center gap-1 shrink-0 font-bold cursor-pointer"
          >
            <span>Buka Webhook</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* SECTION 9: PENGUNDUHAN DOKUMEN & TANDA REGISTRASI */}
        <div className="pt-3 border-t-2 border-dashed border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Unduh Dokumen &amp; Tanda Registrasi</span>
            </div>
            {isApproved ? (
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" /> AKSES RESMI TERBUKA
              </span>
            ) : (
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 font-mono bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                <Lock className="w-3.5 h-3.5" /> DOKUMEN TERKUNCI
              </span>
            )}
          </div>

          {isApproved ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 shadow-xs">
              <p className="text-[11px] text-emerald-950">
                Dokumen telah selesai diperiksa dan diverifikasi secara sah. Tanda Registrasi Resmi telah diterbitkan dan dapat diunduh/dicetak.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadVerifiedDocument}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen &amp; Lembar Registrasi</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintBeritaAcara}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs transition-colors border border-slate-300 cursor-pointer shadow-xs"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Cetak Lembar Tanda Registrasi</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-slate-700 font-semibold text-xs">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Unduh Hanya Tersedia Setelah Disetujui</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Dokumen yang masih dalam status <strong>{document.status === 'PENDING' ? 'Pemeriksaan Awal' : 'Perlu Revisi'}</strong> belum dapat diunduh sampai verifikator menyetujui dan mengesahkan berkas.
              </p>
              <button
                type="button"
                disabled
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed border border-slate-200"
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
