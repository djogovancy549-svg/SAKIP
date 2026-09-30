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
      fileBase64,
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
          fileBase64,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Upload Dokumen ke Google Drive Induk Server
              </h2>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-400" />
                <span>OPD Pengunggah: {activeOpd.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Google Drive Server Location Notice */}
          <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-300 text-xs">
              <HardDrive className="w-4 h-4 text-blue-400" />
              <span>Lokasi Server Penyimpanan: Google Drive Induk</span>
            </div>
            <div className="text-[11px] text-slate-300 flex items-center gap-1.5 font-mono">
              <FolderTree className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Drive Induk &gt; Folder [{activeOpd.name}]</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Berkas fisik yang Anda unggah secara otomatis disimpan ke folder Google Drive Induk server dan tautan resminya dicatat pada Google Spreadsheet.
            </p>
          </div>

          {/* Real File Input Area (Drag & Drop or File Picker) */}
          <div>
            <label className="block font-bold text-slate-200 mb-1">
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
              className={`p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                hasCustomFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-700 bg-slate-950 hover:border-slate-500'
              }`}
            >
              {hasCustomFile ? (
                <div className="text-center space-y-1">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                  <div className="font-semibold text-slate-100 text-xs font-mono">{fileName}</div>
                  <div className="text-[11px] text-slate-400">Ukuran: {fileSize} · Format: {format}</div>
                  <div className="text-[10px] text-emerald-400 underline">Klik untuk ganti file lain</div>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                  <div className="font-semibold text-slate-200 text-xs">
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
            <label className="block font-medium text-slate-300 mb-1.5">
              Kategori Format Berkas :
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setFormat('PDF')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors cursor-pointer ${
                  format === 'PDF'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 mb-1 text-rose-400" />
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('DOCX')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors cursor-pointer ${
                  format === 'DOCX'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileText className="w-4 h-4 mb-1 text-blue-400" />
                <span>DOCX</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('XLSX')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors cursor-pointer ${
                  format === 'XLSX'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 mb-1 text-emerald-400" />
                <span>XLSX</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('IMAGE')}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors cursor-pointer ${
                  format === 'IMAGE'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <ImageIcon className="w-4 h-4 mb-1 text-amber-400" />
                <span>SCAN</span>
              </button>
            </div>
          </div>

          {/* Nomor Berkas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Nomor Berkas / Register *
              </label>
              <input
                type="text"
                required
                value={nomorBerkas}
                onChange={(e) => setNomorBerkas(e.target.value)}
                placeholder="Contoh: 042/SPM/PUPR/IX/2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Nama File di Google Drive
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={`berkas_${activeOpd.id.toLowerCase()}.${format.toLowerCase()}`}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Judul Dokumen Lengkap *
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Permohonan Verifikasi Berkas SP2D Belanja Pemeliharaan Gedung"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Perihal / Ringkasan Isi
            </label>
            <textarea
              rows={2}
              value={perihal}
              onChange={(e) => setPerihal(e.target.value)}
              placeholder="Jelaskan secara ringkas maksud dan substansi berkas yang diajukan..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Data Pemohon */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5">
            <div className="font-bold text-slate-200 text-xs">Data Pemohon Berkas :</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400">Nama Pejabat / Pemohon *</label>
                <input
                  type="text"
                  required
                  value={pemohonNama}
                  onChange={(e) => setPemohonNama(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi, S.T."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Instansi / Unit Kerja</label>
                <input
                  type="text"
                  value={pemohonInstansi}
                  onChange={(e) => setPemohonInstansi(e.target.value)}
                  placeholder={`Bidang Teknis ${activeOpd.shortName}`}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <HardDrive className="w-4 h-4" />
              <span>Upload ke Google Drive & Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
