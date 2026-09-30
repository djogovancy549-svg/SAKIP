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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">
                Unggah Dokumen Hasil Revisi (Versi {nextVersionNumber})
              </h2>
              <p className="text-[11px] text-slate-400">
                Berkas disimpan ke Google Drive Induk Server / Subfolder [{document.opdName}]
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* Target Document Info */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Dokumen Induk:</span>
              <span className="font-mono text-emerald-400 font-semibold">{document.nomorBerkas}</span>
            </div>
            <div className="font-semibold text-slate-200 text-xs truncate">
              {document.judul}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Instansi: <span className="text-slate-300">{document.opdName}</span></span>
              <span className="font-mono text-blue-400 flex items-center gap-1">
                <FolderTree className="w-3 h-3" /> Drive Induk/{document.opdName}
              </span>
            </div>
          </div>

          {/* Examiner's Notes Highlight Box */}
          <div className="p-3.5 bg-orange-950/40 border border-orange-500/30 rounded-lg space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-orange-400 text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Catatan Pemeriksaan yang Harus Diperbaiki :</span>
            </div>
            <p className="text-xs text-orange-200 leading-relaxed bg-black/30 p-2.5 rounded border border-orange-500/20 italic">
              "{lastReviewerNotes}"
            </p>
          </div>

          {/* Version Increment Indicator */}
          <div className="flex items-center justify-center gap-3 py-2 bg-slate-950/60 rounded border border-slate-800 text-xs">
            <span className="text-slate-400">Versi {document.currentVersion} (Perlu Revisi)</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-bold">Versi {nextVersionNumber} (Dokumen Hasil Revisi)</span>
          </div>

          {/* Real File Input for Revision */}
          <div>
            <label className="block font-bold text-slate-200 mb-1">
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
              className={`p-3.5 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                hasCustomFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-700 bg-slate-950 hover:border-slate-500'
              }`}
            >
              {hasCustomFile ? (
                <div className="text-center space-y-0.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <div className="font-semibold text-slate-100 text-xs font-mono">{newFileName}</div>
                  <div className="text-[11px] text-slate-400">Ukuran: {fileSize} · Siap dikirim ke Google Drive</div>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <HardDrive className="w-6 h-6 text-amber-400 mx-auto" />
                  <div className="font-semibold text-slate-200 text-xs">
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
            <label className="block font-medium text-slate-300 mb-1">
              Nama File di Server Google Drive
            </label>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={suggestedFileName}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Summary of Changes Done */}
          <div>
            <label className="block font-bold text-slate-200 mb-1">
              Rincian Perbaikan yang Dilakukan oleh Dinas *
            </label>
            <textarea
              required
              rows={3}
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Jelaskan bagian apa saja yang telah diubah atau dokumen pendukung apa yang telah ditambahkan sesuai catatan pemeriksa..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
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
              <UploadCloud className="w-4 h-4" />
              <span>Simpan ke Google Drive & Kirim Ulang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
