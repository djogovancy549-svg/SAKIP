import { useState, useRef, useEffect } from 'react';
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
  Mail,
  Database,
} from 'lucide-react';
import { DocumentFormat, DocumentItem, OPD, GoogleDriveStorageInfo, UserAccount, OpdFolderRegistration } from '../types';
import {
  getGoogleDriveFolderId,
  createGoogleDriveStorageInfo,
  DEFAULT_GOOGLE_DRIVE_MASTER_NAME,
} from '../services/googleSheetsWebhook';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeOpd: OPD;
  currentUser?: UserAccount;
  folderRegistrations?: Record<string, OpdFolderRegistration>;
  onAddDocument: (doc: DocumentItem) => void;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  activeOpd,
  currentUser,
  folderRegistrations = {},
  onAddDocument,
}: UploadDocumentModalProps) {
  const [format, setFormat] = useState<DocumentFormat>('PDF');
  const [nomorBerkas, setNomorBerkas] = useState<string>('');
  const [judul, setJudul] = useState<string>('');
  const [perihal, setPerihal] = useState<string>('');
  const [pemohonNama, setPemohonNama] = useState<string>(currentUser?.nama || '');
  const [pemohonInstansi, setPemohonInstansi] = useState<string>(currentUser?.opdName || activeOpd.name);
  const [pemohonKontak, setPemohonKontak] = useState<string>(currentUser?.nip || '');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('2.4 MB');
  const [fileBase64, setFileBase64] = useState<string | undefined>(undefined);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | undefined>(undefined);
  const [hasCustomFile, setHasCustomFile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const masterFolderId = getGoogleDriveFolderId();

  useEffect(() => {
    if (currentUser) {
      if (!pemohonNama) setPemohonNama(currentUser.nama);
      if (!pemohonInstansi) setPemohonInstansi(currentUser.opdName);
      if (!pemohonKontak) setPemohonKontak(currentUser.nip);
    }
  }, [currentUser]);

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
      // Strip metadata prefix if data URL (e.g. data:application/pdf;base64,...)
      const base64Clean = result.includes(',') ? result.split(',')[1] : result;
      setFileBase64(base64Clean);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !nomorBerkas.trim() || !pemohonNama.trim()) return;

    const newId = `DOC-${activeOpd.id}-${Date.now().toString().slice(-4)}`;
    const effectiveFileName =
      fileName.trim() ||
      `${judul.replace(/\s+/g, '_').slice(0, 24)}_v1.${format.toLowerCase()}`;

    const defaultDocumentText = `========================================================================
PEMERINTAH KABUPATEN NAGEKEO - SAKIP NAGEKEO
DOKUMEN DILAMPIRKAN RESMI UNTUK GOOGLE DRIVE INDUK SERVER
========================================================================
NOMOR BERKAS : ${nomorBerkas.trim()}
JUDUL        : ${judul.trim()}
PERIHAL      : ${perihal.trim() || judul.trim()}
OPD          : ${activeOpd.name} (${activeOpd.code})
PEMOHON      : ${pemohonNama.trim()} (${pemohonInstansi.trim() || activeOpd.name})
TANGGAL      : ${new Date().toLocaleString('id-ID')}
STATUS       : PENDING VERIFIKASI SAKIP

Dokumen ini diunggah melalui SIMVERIF SAKIP Nagekeo dan disimpan secara fisik di Folder Google Drive Induk Server Pemkab Nagekeo.
========================================================================`;

    const base64ToUse =
      fileBase64 ||
      btoa(unescape(encodeURIComponent(defaultDocumentText)));

    // Check if OPD has registered a specific Google Drive folder URL
    const regFolder = folderRegistrations[activeOpd.id];
    const targetFolderId = regFolder?.driveFolderId || activeOpd.driveFolderId || getGoogleDriveFolderId();
    const targetFolderName = regFolder?.driveFolderName || `${DEFAULT_GOOGLE_DRIVE_MASTER_NAME} / ${activeOpd.name}`;
    const targetFolderUrl = regFolder?.driveFolderUrl;

    // Create Google Drive server storage metadata
    const googleDriveInfo: GoogleDriveStorageInfo = createGoogleDriveStorageInfo(
      newId,
      activeOpd.name,
      effectiveFileName,
      targetFolderId,
      targetFolderName,
      targetFolderUrl
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
        kontak: pemohonKontak.trim() || currentUser?.nip || '0812-0000-1111',
        email: currentUser?.email || `${activeOpd.shortName.toLowerCase()}@nagekeokab.go.id`,
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
      uploadedByUserId: currentUser?.id,
      uploadedByUsername: currentUser?.username,
      currentVersion: 1,
      isLocked: false,
      googleDrive: googleDriveInfo,
      fileBase64: base64ToUse,
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
          fileBase64: base64ToUse,
          fileBlobUrl,
        },
      ],
      content: {
        kopSurat: {
          pemerintah: 'PEMERINTAH DAERAH PROVINSI',
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
          penutup: 'Demikian permohonan ini kami sampaikan, terima kasih.',
          pejabatTtd: {
            nama: pemohonNama.trim(),
            nip: '19890101 201501 1 001',
            jabatan: pemohonInstansi.trim() || 'Pemohon Berkas',
          },
        },
        xlsxData: {
          sheetName: 'RAB_Pengajuan_2026',
          subKegiatan: judul.trim(),
          kodeRekening: '5.1.02.01.01.0001 - Belanja Barang dan Jasa',
          tahunAnggaran: '2026',
          totalAnggaran: 125000000,
          rows: [
            {
              no: 1,
              kode: 'BELANJA-01',
              uraian: 'Pengadaan Paket Utama Sesuai Spesifikasi Teknis',
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200/90 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 border border-white/20 rounded-xl text-white">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white drop-shadow-xs">
                Upload Dokumen ke Google Drive Induk Server
              </h2>
              <p className="text-[11px] text-blue-100 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-sky-200" />
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 bg-white">
          {/* Google Drive Server Location Notice */}
          <div className="p-3 bg-blue-50/80 border border-blue-200/90 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>Lokasi Server Penyimpanan: Google Drive Induk</span>
            </div>
            <div className="text-[11px] text-blue-950 flex items-center gap-1.5 font-mono">
              <FolderTree className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Drive Induk &gt; Folder [{activeOpd.name}]</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Berkas fisik yang Anda unggah secara otomatis disimpan ke folder Google Drive Induk server dan tautan resminya dicatat pada Google Spreadsheet.
            </p>
          </div>

          {/* Real File Input Area (Drag & Drop or File Picker) */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Pilih Berkas Dokumen Fisik (PDF / Word / Excel / Gambar) :
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                hasCustomFile
                  ? 'border-emerald-400 bg-emerald-50/60'
                  : 'border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50/80'
              }`}
            >
              {hasCustomFile ? (
                <div className="text-center space-y-1">
                  <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                  <div className="font-semibold text-slate-900 text-xs font-mono">{fileName}</div>
                  <div className="text-[11px] text-slate-500">Ukuran: {fileSize} · Format: {format}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold underline">Klik untuk ganti file lain</div>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <Upload className="w-7 h-7 text-blue-500 mx-auto" />
                  <div className="font-semibold text-slate-800 text-xs">
                    Klik untuk memilih file dari komputer / HP
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Mendukung format PDF, DOCX, XLSX, dan Scan Gambar (Maks. 25 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Format Selection Buttons */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Kategori Format Berkas :
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFormat('PDF')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-colors cursor-pointer ${
                  format === 'PDF'
                    ? 'bg-rose-50 border-rose-400 text-rose-700 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'
                }`}
              >
                <FileText className="w-4 h-4 mb-1 text-rose-600" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('DOCX')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-colors cursor-pointer ${
                  format === 'DOCX'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'
                }`}
              >
                <FileText className="w-4 h-4 mb-1 text-blue-600" />
                <span>DOCX</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('XLSX')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-colors cursor-pointer ${
                  format === 'XLSX'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 mb-1 text-emerald-600" />
                <span>XLSX</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('IMAGE')}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-colors cursor-pointer ${
                  format === 'IMAGE'
                    ? 'bg-amber-50 border-amber-400 text-amber-700 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'
                }`}
              >
                <ImageIcon className="w-4 h-4 mb-1 text-amber-600" />
                <span>SCAN</span>
              </button>
            </div>
          </div>

          {/* Nomor Berkas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nomor Berkas / Register *
              </label>
              <input
                type="text"
                required
                value={nomorBerkas}
                onChange={(e) => setNomorBerkas(e.target.value)}
                placeholder="Contoh: 042/SPM/PUPR/IX/2026"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama File di Google Drive
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={`berkas_${activeOpd.id.toLowerCase()}.${format.toLowerCase()}`}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Judul Dokumen Lengkap *
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Permohonan Verifikasi Berkas SP2D Belanja Pemeliharaan Gedung"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Perihal / Ringkasan Isi
            </label>
            <textarea
              rows={2}
              value={perihal}
              onChange={(e) => setPerihal(e.target.value)}
              placeholder="Jelaskan secara ringkas maksud dan substansi berkas yang diajukan..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Data Pemohon */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2.5">
            <div className="font-bold text-slate-800 text-xs">Data Pemohon Berkas :</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 font-medium">Nama Pejabat / Pemohon *</label>
                <input
                  type="text"
                  required
                  value={pemohonNama}
                  onChange={(e) => setPemohonNama(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi, S.T."
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 font-medium">Instansi / Unit Kerja</label>
                <input
                  type="text"
                  value={pemohonInstansi}
                  onChange={(e) => setPemohonInstansi(e.target.value)}
                  placeholder={`Bidang Teknis ${activeOpd.shortName}`}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Dinas Email & Google Drive Status Banner */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl space-y-1.5 text-xs shadow-xs text-blue-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="truncate text-[11px]">
                  <span>Email Pemohon: <strong className="font-mono text-blue-900">{currentUser?.email || `${activeOpd.shortName.toLowerCase()}@nagekeokab.go.id`}</strong></span>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full font-mono shrink-0">
                Tersambung
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-600 pt-1 border-t border-blue-100/80">
              <div className="flex items-center gap-1 font-mono text-blue-950">
                <HardDrive className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Drive: Folder [{activeOpd.name}]</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-emerald-950">
                <Database className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Sheet: DATA_VERIFIKASI_DOKUMEN</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Simpan ke Google Drive &amp; Sheet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
