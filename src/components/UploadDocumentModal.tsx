import { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Building2,
  HardDrive,
  CheckCircle2,
  FolderTree,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { DocumentFormat, DocumentItem, OPD, GoogleDriveStorageInfo } from '../types';
import {
  getGoogleDriveFolderId,
  createGoogleDriveStorageInfo,
  DEFAULT_GOOGLE_DRIVE_MASTER_NAME,
} from '../services/googleSheetsWebhook';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOpd: OPD;
  onAddDocument: (doc: DocumentItem) => void;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  activeOpd,
  onAddDocument,
}: UploadDocumentModalProps) {
  const [format, setFormat] = useState<DocumentFormat>('PDF');
  const [nomorBerkas, setNomorBerkas] = useState<string>('');
  const [judul, setJudul] = useState<string>('');
  const [perihal, setPerihal] = useState<string>('');
  const [pemohonNama, setPemohonNama] = useState<string>('');
  const [pemohonInstansi, setPemohonInstansi] = useState<string>('');
  const [pemohonKontak, setPemohonKontak] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('2.4 MB');
  const [fileBase64, setFileBase64] = useState<string | undefined>(undefined);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | undefined>(undefined);
  const [hasCustomFile, setHasCustomFile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const masterFolderId = getGoogleDriveFolderId();

  if (!isOpen) return null;

  // Handle real file picked by user
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    // Format human-readable size
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileSize(`${sizeInMb} MB`);
    setHasCustomFile(true);

    // Auto-detect format from extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') setFormat('PDF');
    else if (ext === 'docx' || ext === 'doc') setFormat('DOCX');
    else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') setFormat('XLSX');
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) setFormat('IMAGE');

    // Create object URL for client preview
    const blobUrl = URL.createObjectURL(file);
    setFileBlobUrl(blobUrl);

    // Read Base64 for Google Drive transmission
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Clean = result.includes(',') ? result.split(',')[1] : result;
      setFileBase64(base64Clean);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !nomorBerkas.trim() || !pemohonNama.trim()) return;

    setIsSubmitting(true);

    const newId = `DOC-${activeOpd.id}-${Date.now().toString().slice(-4)}`;
    const effectiveFileName =
      fileName.trim() ||
      `${judul.replace(/\s+/g, '_').slice(0, 24)}_v1.${format === 'PDF' ? 'pdf' : format === 'DOCX' ? 'docx' : format === 'XLSX' ? 'xlsx' : 'txt'}`;

    // Ensure base64 is populated so it always saves into Google Drive folder
    let finalBase64 = fileBase64;
    if (!finalBase64) {
      const draftContent = `========================================================================
PEMERINTAH KABUPATEN NAGEKEO - SAKIP NAGEKEO
LEMBAR PENGAJUAN DOKUMEN SAKIP RESMI
OPD / DINAS : ${activeOpd.name.toUpperCase()}
========================================================================

NOMOR BERKAS : ${nomorBerkas.trim()}
JUDUL        : ${judul.trim()}
PERIHAL      : ${perihal.trim() || judul.trim()}
PEMOHON      : ${pemohonNama.trim()} (${pemohonInstansi.trim() || activeOpd.name})
KONTAK       : ${pemohonKontak.trim() || '0812-0000-1111'}
TANGGAL      : ${new Date().toLocaleString('id-ID')}

URAIAN DOKUMEN:
Dokumen ini diajukan secara resmi melalui Sistem Informasi Administrasi dan
Pengawasan SAKIP Kabupaten Nagekeo ke Google Drive Server Induk.

STATUS BERKAS: DALAM PEMERIKSAAN AWAL (PENDING)
========================================================================`;
      finalBase64 = btoa(unescape(encodeURIComponent(draftContent)));
    }

    // Create Google Drive server storage metadata
    const googleDriveInfo: GoogleDriveStorageInfo = createGoogleDriveStorageInfo(
      newId,
      activeOpd.name,
      effectiveFileName
    );

    const newDoc: DocumentItem = {
      id: newId,
      nomorBerkas: nomorBerkas.trim(),
      judul: judul.trim(),
      perihal: perihal.trim() || judul.trim(),
      opdId: activeOpd.id,
      opdName: activeOpd.name,
      pemohon: {
        nama: pemohonNama.trim(),
        instansi: pemohonInstansi.trim() || activeOpd.name,
        kontak: pemohonKontak.trim() || '0812-0000-1111',
        email: `${pemohonNama.toLowerCase().replace(/\s+/g, '.')}@daerah.go.id`,
      },
      tanggalMasuk: new Date().toLocaleString('id-ID', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
      format,
      fileSize,
      fileName: effectiveFileName,
      status: 'PENDING',
      urgency: 'TINGGI',
      currentVersion: 1,
      isLocked: false,
      googleDrive: googleDriveInfo,
      fileBase64: finalBase64,
      fileBlobUrl,
      versions: [
        {
          versionNumber: 1,
          uploadedAt: new Date().toLocaleString('id-ID', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          uploadedBy: `${pemohonNama.trim()} (${activeOpd.name})`,
          fileName: effectiveFileName,
          fileSize,
          changeSummary: 'Pengajuan berkas awal untuk diperiksa dan diverifikasi.',
          status: 'PENDING',
          googleDrive: googleDriveInfo,
          fileBase64: finalBase64,
          fileBlobUrl,
        },
      ],
      content: {
        kopSurat: {
          pemerintah: 'PEMERINTAH KABUPATEN NAGEKEO',
          instansi: activeOpd.name.toUpperCase(),
          alamat: activeOpd.address,
          nomorNaskah: `SURAT RESMI NOMOR: ${nomorBerkas.trim()}`,
        },
        pdfPages: [
          {
            pageNumber: 1,
            title: judul.toUpperCase(),
            sections: [
              {
                heading: 'LATAR BELAKANG & MAKSUD PERMOHONAN',
                body:
                  perihal.trim() ||
                  'Dokumen diajukan untuk verifikasi kelengkapan administratif dan teknis pada Organisasi Perangkat Daerah terkait.',
                highlight: true,
              },
              {
                heading: 'KETENTUAN & PERSYARATAN',
                body:
                  'Dokumen ini disusun sesuai dengan ketentuan peraturan perundang-undangan yang berlaku dan standar operasional prosedur.',
              },
            ],
          },
        ],
        docxData: {
          kepada: `Yth. Kepala ${activeOpd.name}`,
          dari: pemohonNama.trim(),
          tembusan: ['Sekretariat OPD', 'Arsip'],
          perihal: perihal.trim() || judul.trim(),
          dasarHukum: ['Peraturan Daerah tentang Tata Naskah Dinas Elektronik'],
          isiParagraf: [
            `Bersama ini kami sampaikan dokumen mengenai ${judul.trim()} untuk diteliti, diverifikasi, dan disahkan sesuai dengan mekanisme yang berlaku.`,
            'Seluruh berkas persyaratan telah dilampirkan sebagaimana mestinya.',
          ],
          penutup: 'Demikian surat permohonan ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.',
          pejabatTtd: {
            nama: pemohonNama.trim(),
            nip: '19850712 201101 1 004',
            jabatan: `Pengelola SAKIP ${activeOpd.name}`,
          },
        },
        xlsxData: {
          sheetName: 'Rincian Realisasi SAKIP',
          subKegiatan: `Program Kegiatan ${activeOpd.name}`,
          kodeRekening: '5.1.02.01.01.0024',
          tahunAnggaran: `${new Date().getFullYear()}`,
          totalAnggaran: 125000000,
          rows: [
            {
              no: 1,
              kode: '5.1.02.01',
              uraian: `Kegiatan Program ${judul.trim()}`,
              volume: 1,
              satuan: 'Paket',
              hargaSatuan: 100000000,
              total: 100000000,
              keterangan: 'Harga acuan e-Katalog',
            },
            {
              no: 2,
              kode: 'PPN-11',
              uraian: 'Pajak Pertambahan Nilai (PPN 11%)',
              volume: 1,
              satuan: 'Kegiatan',
              hargaSatuan: 25000000,
              total: 25000000,
              keterangan: 'Pajak Resmi',
            },
          ],
        },
        imageData: {
          scanType: `Pindai Asli Berkas ${judul.trim()}`,
          registrationNo: `REG-${Date.now().toString().slice(-6)}`,
          issueDate: new Date().toLocaleDateString('id-ID'),
          validUntil: 'Berlaku 1 Tahun',
          scanQuality: 'Color 300 DPI Legal Scan',
          stampedAuthority: activeOpd.name,
          watermarkPreviewText: `VERIFIKASI ${activeOpd.id}`,
        },
      },
    };

    onAddDocument(newDoc);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-slate-300 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-slate-900">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 border border-white/25 rounded-xl text-white">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white drop-shadow-xs">
                Upload Dokumen ke Google Drive Induk Server
              </h2>
              <p className="text-[11px] text-blue-100 flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-sky-200" />
                <span>OPD Pengunggah: {activeOpd.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Solid White Background & Sharp Text */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-900 bg-white">
          {/* Target OPD Subfolder Indicator */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span>Subfolder Google Drive:</span>
              </span>
              <span className="font-mono font-bold text-blue-950 bg-white px-2 py-0.5 rounded border border-blue-200">
                /{activeOpd.name}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
              Berkas yang diunggah akan otomatis disimpan di subfolder <strong>{activeOpd.name}</strong> di Google Drive Server Induk Pemkab Nagekeo.
            </p>
          </div>

          {/* Real File Picker Area */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1.5">
              Pilih File Dokumen Fisik (PDF / DOCX / XLSX / Gambar) :
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                hasCustomFile
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-950'
                  : 'border-slate-300 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-500 text-slate-700'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                {hasCustomFile ? (
                  <>
                    <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    <span className="font-bold text-xs text-emerald-950 truncate max-w-sm">
                      {fileName}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300 font-bold">
                      Ukuran: {fileSize} · Format: {format}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium">
                      (Klik untuk mengganti file)
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-blue-600" />
                    <span className="font-bold text-xs text-slate-900">
                      Klik di sini untuk memilih file dari komputer / HP Anda
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium">
                      Mendukung PDF, Word (.docx), Excel (.xlsx), atau Foto Scan (Maks. 25 MB)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Nomor Berkas / Surat Resmi <span className="text-rose-600">*</span> :
              </label>
              <input
                type="text"
                required
                value={nomorBerkas}
                onChange={(e) => setNomorBerkas(e.target.value)}
                placeholder="Contoh: 056/sakip/2026"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-bold focus:outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Format Naskah :
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as DocumentFormat)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 shadow-2xs"
              >
                <option value="PDF">PDF (Dokumen Resmi &amp; Pengesahan)</option>
                <option value="DOCX">DOCX (Naskah Dinas Word)</option>
                <option value="XLSX">XLSX (Lembar Kerja / Anggaran)</option>
                <option value="IMAGE">IMAGE (Hasil Pindai Berkas)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Judul Dokumen SAKIP <span className="text-rose-600">*</span> :
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: DATA SURVEY KEPUASAN MASYARAKAT RSUD AERAMO"
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-bold focus:outline-none focus:border-blue-600 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Perihal / Ringkasan Isi :
            </label>
            <textarea
              rows={2}
              value={perihal}
              onChange={(e) => setPerihal(e.target.value)}
              placeholder="Ketik ringkasan singkat isi berkas atau maksud permohonan..."
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs"
            />
          </div>

          {/* Pemohon Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Nama Pengelola / Pemohon <span className="text-rose-600">*</span> :
              </label>
              <input
                type="text"
                required
                value={pemohonNama}
                onChange={(e) => setPemohonNama(e.target.value)}
                placeholder="Contoh: Admin RSUD Aeramo"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1">
                Nomor Kontak / WhatsApp :
              </label>
              <input
                type="text"
                value={pemohonKontak}
                onChange={(e) => setPemohonKontak(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Google Drive...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Simpan &amp; Unggah ke Google Drive</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
