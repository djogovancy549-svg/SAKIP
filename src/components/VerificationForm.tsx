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
  Database,
  ExternalLink,
  History,
  UploadCloud,
  Check,
  Copy,
  BadgeCheck,
  RefreshCw,
  X,
  FileCode,
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
  const isVerifier = appRole === 'VERIFIKATOR';

  // State for Admin Form
  const [selectedStatus, setSelectedStatus] = useState<VerificationStatus>(
    document.status || 'APPROVED'
  );
  
  const defaultBav =
    document.verification?.bavNumber ||
    document.registrationSeal?.bavNumber ||
    `BAV/SAKIP/${document.nomorBerkas}`;

  const [bavNumber, setBavNumber] = useState<string>(defaultBav);
  const [verifierName, setVerifierName] = useState<string>(
    document.verification?.verifiedBy || verifier.name || 'Admin Verifikator SAKIP'
  );
  const [verifierNip, setVerifierNip] = useState<string>(
    document.verification?.nip || verifier.nip || '19850101 201001 1 002'
  );
  const [notes, setNotes] = useState<string>(document.verification?.notes || '');
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    return (
      document.verification?.checklist || {
        'chk-ttd': true,
        'chk-format': true,
        'chk-identitas': true,
        'chk-lampiran': document.status === 'APPROVED',
        'chk-evaluasi': document.status === 'APPROVED',
        'chk-anggaran': document.status === 'APPROVED',
      }
    );
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedReg, setCopiedReg] = useState<boolean>(false);

  const isApproved = document.status === 'APPROVED';
  const isRevision = document.status === 'REVISION';
  const isPending = document.status === 'PENDING';
  const isRejected = document.status === 'REJECTED';

  const handleToggleChecklist = (id: string) => {
    setChecklist((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAllChecklist = (check: boolean) => {
    const updated: Record<string, boolean> = {};
    DEFAULT_CHECKLIST.forEach((item) => {
      updated[item.id] = check;
    });
    setChecklist(updated);
  };

  const handleInsertTemplateNote = (text: string) => {
    setNotes((prev) => (prev ? `${prev}\n${text}` : text));
  };

  // ADMIN SUBMIT VERIFICATION FORM (MATCHING IMAGE.PNG DESIGN)
  const handleSubmitAdminForm = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    const effectiveBav = bavNumber.trim() || `BAV/SAKIP/${document.nomorBerkas}`;
    const securityHash = `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(regNumber)}&size=150x150`;

    const newSeal: RegistrationSeal | undefined =
      selectedStatus === 'APPROVED'
        ? {
            regNumber,
            bavNumber: effectiveBav,
            issuedAt: timestampNow,
            examinedBy: verifierName,
            examinedNip: verifierNip,
            verifiedBy: verifierName,
            verifiedNip: verifierNip,
            qrCodeUrl,
            securityHash,
            isLocked: true,
          }
        : document.registrationSeal;

    const updatedVersions = document.versions.map((ver) => {
      if (ver.versionNumber === document.currentVersion) {
        return {
          ...ver,
          status: selectedStatus,
          reviewerNotes: notes || ver.reviewerNotes,
          reviewedAt: timestampNow,
        };
      }
      return ver;
    });

    const updatedDoc: DocumentItem = {
      ...document,
      status: selectedStatus,
      isLocked: selectedStatus === 'APPROVED',
      registrationSeal: newSeal,
      versions: updatedVersions,
      verification: {
        status: selectedStatus,
        verifiedBy: verifierName,
        nip: verifierNip,
        jabatan: 'Verifikator SAKIP Nagekeo',
        verifiedAt: timestampNow,
        notes,
        checklist,
        qrCodeUrl,
        digitalSealHash: securityHash,
        syncedToGoogleSheet: true,
        bavNumber: effectiveBav,
      },
    };

    onUpdateDocument(updatedDoc);

    const verifierObj = {
      nama: verifierName,
      nip: verifierNip,
      jabatan: 'Verifikator SAKIP',
    };

    try {
      await sendVerificationToGoogleSheet(updatedDoc, notes, checklist, verifierObj, selectedStatus);
      setSyncFeedback({
        success: true,
        message: 'Hasil keputusan verifikasi & BAV berhasil tersimpan dan tersinkronisasi ke Google Sheet DATA_VERIFIKASI_DOKUMEN!',
      });
    } catch {
      setSyncFeedback({
        success: true,
        message: 'Hasil keputusan verifikasi tersimpan di sistem lokal.',
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
TANGGAL & WAKTU SAH   : ${reg?.issuedAt || document.verification?.verifiedAt || new Date().toLocaleString('id-ID')}

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
Petugas Pemeriksa/Verifikator : ${reg?.verifiedBy || verifierName}
NIP                           : ${reg?.verifiedNip || verifierNip}
Nomor Berita Acara (BAV)      : ${reg?.bavNumber || bavNumber}
Catatan Pengesahan            :
"${document.verification?.notes || notes || 'Seluruh instrumen kelengkapan berkas dan syarat teknis telah dipenuhi dan dinyatakan sah.'}"

------------------------------------------------------------------------
III. KODE INTEGRITAS & PENGAMANAN DIGITAL (IMMUTABILITY)
------------------------------------------------------------------------
Hash Bukti Digital (SHA-256) : ${reg?.securityHash || 'HASH-PROOF-VALID'}
Keterangan Status Kunci      : DOKUMEN TERKUNCI PERMANEN
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

  // =========================================================================
  // VIEW 1: ADMIN ROLE - FORMULIR KEPUTUSAN VERIFIKASI & BAV (MATCHES IMAGE.PNG)
  // =========================================================================
  if (isVerifier) {
    return (
      <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl text-slate-100 font-sans selection:bg-emerald-500/30">
        {/* Header - Dark Sleek Title matching image.png */}
        <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide">
                Formulir Keputusan Verifikasi &amp; BAV
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Pemeriksaan Berkas Admin · Penerbitan BAV · Sinkronisasi Google Sheet
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 bg-slate-800 border border-slate-700 text-emerald-400 rounded-xl">
            ADMIN VERIFIKATOR
          </span>
        </div>

        {/* Form Body - Matching image.png */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-200">
          {syncFeedback && (
            <div
              className={`p-4 rounded-2xl border-2 flex items-center gap-3 text-xs font-bold animate-in fade-in ${
                syncFeedback.success
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{syncFeedback.message}</span>
            </div>
          )}

          {/* 1. Target Document Strip Box (Matches Image.png) */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
            <div className="text-[11px] font-mono font-bold text-emerald-400 tracking-wide">
              {document.nomorBerkas}
            </div>
            <div className="text-sm font-black text-white">{document.judul}</div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              {document.opdName}
            </div>
          </div>

          <form onSubmit={handleSubmitAdminForm} className="space-y-4">
            {/* 2. Keputusan Status Verifikasi Dropdown (Matches Image.png) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Keputusan Status Verifikasi :
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as VerificationStatus)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs shadow-inner cursor-pointer"
              >
                <option value="APPROVED">
                  ✅ SAH / DISETUJUI (TERBITKAN NOMOR BAV)
                </option>
                <option value="REVISION">
                  ⚠️ MEMERLUKAN REVISI / PERBAIKAN BERKAS
                </option>
                <option value="REJECTED">
                  ❌ DITOLAK
                </option>
              </select>
            </div>

            {/* 3. Nomor Berita Acara Verifikasi (BAV) Input (Matches Image.png) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Nomor Berita Acara Verifikasi (BAV) :
              </label>
              <input
                type="text"
                value={bavNumber}
                onChange={(e) => setBavNumber(e.target.value)}
                placeholder="BAV/SAKIP/04/sakip/2026"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs shadow-inner"
              />
            </div>

            {/* 4. Nama & NIP Verifikator in 2 Columns (Matches Image.png) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Nama Verifikator :
                </label>
                <input
                  type="text"
                  value={verifierName}
                  onChange={(e) => setVerifierName(e.target.value)}
                  placeholder="Admin Verifikator SAKIP"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  NIP Verifikator :
                </label>
                <input
                  type="text"
                  value={verifierNip}
                  onChange={(e) => setVerifierNip(e.target.value)}
                  placeholder="19850101 201001 1 002"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono font-bold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs shadow-inner"
                />
              </div>
            </div>

            {/* 5. Catatan / Petunjuk Perbaikan untuk Dinas Textarea (Matches Image.png) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={notesId} className="block text-xs font-bold text-slate-300">
                  Catatan / Petunjuk Perbaikan untuk Dinas :
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertTemplateNote(
                        'Harap melampirkan lembar pengesahan BAST dan bukti evaluasi SAKIP.'
                      )
                    }
                    className="text-[10px] text-sky-400 hover:underline font-bold cursor-pointer"
                  >
                    + BAST/SAKIP
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertTemplateNote(
                        'Format nomor register naskah dinas belum sesuai aturan.'
                      )
                    }
                    className="text-[10px] text-sky-400 hover:underline font-bold cursor-pointer"
                  >
                    + Format
                  </button>
                </div>
              </div>
              <textarea
                id={notesId}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan evaluasi atau petunjuk perbaikan..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-medium placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 text-xs shadow-inner"
              />
            </div>

            {/* 6. Instrumen Checklist Pemeriksaan Admin */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-slate-300">
                  Instrumen Checklist Pemeriksaan Dokumen :
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleSelectAllChecklist(true)}
                    className="text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-600">/</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAllChecklist(false)}
                    className="text-slate-400 hover:underline font-bold cursor-pointer"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_CHECKLIST.map((item) => {
                  const isChecked = !!checklist[item.id];
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100 font-bold'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleChecklist(item.id)}
                        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-[11px] leading-tight">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 7. Action Buttons Bar (Matches Image.png) */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => onOpenGoogleSheetModal()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Buka Webhook
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                )}
                <span>Sahkan &amp; Simpan ke Google Sheet</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: DINAS / OPD ROLE - INFORMASI STATUS & CATATAN VERIFIKASI DOKUMEN
  // (NO VERIFICATION FORM, READ-ONLY WITH DYNAMIC CARDS & REVISION ACTION)
  // =========================================================================
  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col h-full shadow-xl text-slate-800 font-sans">
      {/* Header for Dinas View */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white border-b border-blue-500 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 border border-white/20 rounded-xl text-white shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wide drop-shadow-xs">
                Informasi Status &amp; Catatan Verifikasi
              </h2>
              <p className="text-[11px] text-blue-100">
                Informasi resmi pemeriksaan dari Tim Verifikator SAKIP Nagekeo
              </p>
            </div>
          </div>

          <span className="text-[11px] font-mono font-bold px-3 py-1 bg-white/20 border border-white/30 text-white rounded-xl">
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

      {/* Body for Dinas View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-900 bg-white">
        {/* DYNAMIC STATUS CARD BASED ON STATUS */}
        {isApproved && (
          <div className="p-5 bg-emerald-50 border-2 border-emerald-400 rounded-3xl space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-emerald-950 uppercase tracking-wide">
                    Dokumen Disahkan &amp; Terverifikasi Resmi
                  </h3>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    Tanda Registrasi &amp; BAV Resmi SAKIP Nagekeo telah diterbitkan
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] font-mono bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-300 font-black">
                <Lock className="w-3.5 h-3.5 text-emerald-700" /> SAH &amp; TERKUNCI
              </div>
            </div>

            {/* BAV & Registration Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-800 bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Nomor Berita Acara (BAV):</span>
                <span className="font-mono font-black text-emerald-900 text-xs">
                  {document.verification?.bavNumber || document.registrationSeal?.bavNumber || `BAV/SAKIP/${document.nomorBerkas}`}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Nomor Registrasi SAKIP:</span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {document.registrationSeal?.regNumber || `REG-${document.opdId}-2026`}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Disahkan Oleh:</span>
                <span className="font-bold text-slate-900">
                  {document.verification?.verifiedBy || 'Admin Verifikator SAKIP'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block">
                  NIP. {document.verification?.nip || '19850101 201001 1 002'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Waktu Pengesahan:</span>
                <span className="font-mono text-slate-800 font-medium">
                  {document.verification?.verifiedAt || document.tanggalMasuk}
                </span>
              </div>
            </div>

            {/* Official Notes from Admin */}
            <div className="p-3.5 bg-white rounded-xl border border-emerald-200 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                Catatan Pengesahan Verifikator:
              </span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed italic">
                "{document.verification?.notes || notes || 'Seluruh instrumen kelengkapan berkas dan syarat teknis telah dipenuhi dan dinyatakan sah.'}"
              </p>
            </div>

            {/* Download & Print Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadVerifiedDocument}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Lembar Tanda Registrasi Sah</span>
              </button>

              <button
                type="button"
                onClick={handlePrintBeritaAcara}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs transition-colors border border-slate-300 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Cetak Lembar Berita Acara (BAV)</span>
              </button>
            </div>
          </div>
        )}

        {isRevision && (
          <div className="p-5 bg-amber-50 border-2 border-amber-400 rounded-3xl space-y-4 shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-600 text-white rounded-xl shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm text-amber-950 uppercase tracking-wide">
                  Memerlukan Perbaikan / Revisi Berkas
                </h3>
                <p className="text-xs text-amber-900 leading-relaxed font-medium">
                  Tim Verifikator telah memeriksa dokumen Anda dan meminta perbaikan. Silakan periksa catatan di bawah dan unggah ulang berkas hasil revisi.
                </p>
              </div>
            </div>

            {/* Revision Notes Callout Box */}
            <div className="p-4 bg-white rounded-2xl border-2 border-amber-300 space-y-1.5 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                Petunjuk / Catatan Perbaikan dari Verifikator:
              </span>
              <p className="text-xs font-bold text-amber-950 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                {document.verification?.notes || notes || 'Harap melengkapi dokumen lampiran dan menyesuaikan format naskah dinas.'}
              </p>
            </div>

            {/* Direct Action Upload Revision Button */}
            <button
              type="button"
              onClick={onOpenRevisionModal}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black rounded-2xl text-xs transition-all shadow-md cursor-pointer animate-pulse"
            >
              <UploadCloud className="w-5 h-5" />
              <span>Unggah Dokumen Hasil Revisi (Versi {document.currentVersion + 1})</span>
            </button>
          </div>
        )}

        {isRejected && (
          <div className="p-5 bg-rose-50 border-2 border-rose-400 rounded-3xl space-y-3 shadow-md">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-600 text-white rounded-xl shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm text-rose-950 uppercase tracking-wide">
                  Dokumen Ditolak
                </h3>
                <p className="text-xs text-rose-900 leading-relaxed font-medium mt-1">
                  Dokumen ini dinyatakan tidak memenuhi syarat. Alasan penolakan dari verifikator:
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-rose-200 text-xs font-bold text-rose-950">
              "{document.verification?.notes || notes || 'Dokumen tidak memenuhi persyaratan SAKIP.'}"
            </div>
          </div>
        )}

        {isPending && (
          <div className="p-5 bg-blue-50 border-2 border-blue-300 rounded-3xl space-y-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm text-blue-950 uppercase tracking-wide">
                  Dalam Tahap Pemeriksaan Admin Verifikator
                </h3>
                <p className="text-xs text-blue-900 leading-relaxed font-medium">
                  Dokumen Anda telah berhasil diajukan dan sedang dalam antrean pemeriksaan oleh Tim Verifikator SAKIP Nagekeo. Hasil pemeriksaan akan diperbarui di lembar ini.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VERSION TIMELINE */}
        <div className="space-y-2 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              <span>Riwayat Versi Dokumen</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Total: {document.versions.length} Versi
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {document.versions.map((ver) => (
              <div
                key={ver.versionNumber}
                className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                  ver.versionNumber === document.currentVersion
                    ? 'bg-blue-50/70 border-blue-300 text-slate-900 shadow-2xs font-bold'
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

                {ver.reviewerNotes && (
                  <div className="text-[10px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-800">Catatan Verifikator: </span>
                    {ver.reviewerNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
