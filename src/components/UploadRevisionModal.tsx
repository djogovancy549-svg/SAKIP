import { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowRight,
  HardDrive,
  FolderTree,
} from 'lucide-react';
import { DocumentItem, DocumentVersion, GoogleDriveStorageInfo } from '../types';
import {
  getGoogleDriveFolderId,
  createGoogleDriveStorageInfo,
} from '../services/googleSheetsWebhook';

interface UploadRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onUploadRevision: (
    docId: string,
    newVersion: DocumentVersion,
    updatedFileContent?: Partial<DocumentItem['content']>
  ) => void;
}

export function UploadRevisionModal({
  isOpen,
  onClose,
  document,
  onUploadRevision,
}: UploadRevisionModalProps) {
  const [newFileName, setNewFileName] = useState<string>('');
  const [changeSummary, setChangeSummary] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('2.5 MB');
  const [fileBase64, setFileBase64] = useState<string | undefined>(undefined);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | undefined>(undefined);
  const [hasCustomFile, setHasCustomFile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !document) return null;

  const lastReviewerNotes =
    document.verification?.notes ||
    document.versions[document.versions.length - 1]?.reviewerNotes ||
    'Perlu dilakukan perbaikan berkas administrasi / teknis sesuai arahan pemeriksa.';

  const nextVersionNumber = document.currentVersion + 1;
  const suggestedFileName = `${document.fileName.replace(/\.[^/.]+$/, '')}_v${nextVersionNumber}_Revisi.${document.format.toLowerCase()}`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNewFileName(file.name);
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileSize(`${sizeInMb} MB`);
    setHasCustomFile(true);

    const blobUrl = URL.createObjectURL(file);
    setFileBlobUrl(blobUrl);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Clean = result.includes(',') ? result.split(',')[1] : result;
      setFileBase64(base64Clean);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeSummary.trim()) return;

    const effectiveFileName = newFileName.trim() || suggestedFileName;

    // Create updated Google Drive storage reference for revised version
    const googleDriveInfo: GoogleDriveStorageInfo = createGoogleDriveStorageInfo(
      document.id,
      document.opdName,
      effectiveFileName
    );

    const newVersion: DocumentVersion = {
      versionNumber: nextVersionNumber,
      uploadedAt: new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      uploadedBy: `${document.pemohon.nama} (${document.opdName})`,
      fileName: effectiveFileName,
      fileSize,
      changeSummary: changeSummary.trim(),
      status: 'PENDING',
      googleDrive: googleDriveInfo,
      fileBase64,
      fileBlobUrl,
    };

    onUploadRevision(document.id, newVersion);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200/90 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 border border-white/20 rounded-xl text-white">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white drop-shadow-xs">
                Unggah Dokumen Hasil Revisi (Versi {nextVersionNumber})
              </h2>
              <p className="text-[11px] text-blue-100">
                Berkas disimpan ke Google Drive Induk Server / Subfolder [{document.opdName}]
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 bg-white">
          {/* Target Document Info */}
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Dokumen Induk:</span>
              <span className="font-mono text-blue-700 font-bold">{document.nomorBerkas}</span>
            </div>
            <div className="font-bold text-slate-900 text-xs truncate">
              {document.judul}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Instansi: <span className="text-slate-700 font-semibold">{document.opdName}</span></span>
              <span className="font-mono text-blue-600 flex items-center gap-1 font-semibold">
                <FolderTree className="w-3 h-3" /> Drive Induk/{document.opdName}
              </span>
            </div>
          </div>

          {/* Examiner's Notes Highlight Box */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Catatan Pemeriksaan yang Harus Diperbaiki :</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200 italic font-medium">
              "{lastReviewerNotes}"
            </p>
          </div>

          {/* Version Increment Indicator */}
          <div className="flex items-center justify-center gap-3 py-2 bg-blue-50/60 rounded-xl border border-blue-100 text-xs">
            <span className="text-slate-500">Versi {document.currentVersion} (Perlu Revisi)</span>
            <ArrowRight className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700 font-bold">Versi {nextVersionNumber} (Dokumen Hasil Revisi)</span>
          </div>

          {/* Real File Input for Revision */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Pilih Berkas Hasil Perbaikan Baru (Fisik) :
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
              className={`p-3.5 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                hasCustomFile
                  ? 'border-emerald-400 bg-emerald-50/60'
                  : 'border-blue-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50/80'
              }`}
            >
              {hasCustomFile ? (
                <div className="text-center space-y-0.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <div className="font-semibold text-slate-900 text-xs font-mono">{newFileName}</div>
                  <div className="text-[11px] text-slate-500">Ukuran: {fileSize} · Siap dikirim ke Google Drive</div>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <HardDrive className="w-6 h-6 text-blue-500 mx-auto" />
                  <div className="font-semibold text-slate-800 text-xs">
                    Klik untuk memilih berkas yang sudah diperbaiki
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Otomatis disimpan di Google Drive Induk / Subfolder {document.opdName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload File Details */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nama File di Server Google Drive
            </label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={suggestedFileName}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Summary of Changes Done */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Rincian Perbaikan yang Dilakukan oleh Dinas *
            </label>
            <textarea
              required
              rows={3}
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Jelaskan bagian apa saja yang telah diubah atau dokumen pendukung apa yang telah ditambahkan sesuai catatan pemeriksa..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Simpan ke Google Drive & Kirim Ulang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
