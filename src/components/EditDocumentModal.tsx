import { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Building2,
  Save,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { DocumentFormat, DocumentItem } from '../types';

interface EditDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onSaveEdit: (updatedDoc: DocumentItem) => void;
  onDeleteDocument?: (docId: string) => void;
}

export function EditDocumentModal({
  isOpen,
  onClose,
  document,
  onSaveEdit,
  onDeleteDocument,
}: EditDocumentModalProps) {
  const [format, setFormat] = useState<DocumentFormat>('PDF');
  const [nomorBerkas, setNomorBerkas] = useState<string>('');
  const [judul, setJudul] = useState<string>('');
  const [perihal, setPerihal] = useState<string>('');
  const [pemohonNama, setPemohonNama] = useState<string>('');
  const [pemohonInstansi, setPemohonInstansi] = useState<string>('');
  const [pemohonKontak, setPemohonKontak] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [revisionDeadline, setRevisionDeadline] = useState<string>('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  useEffect(() => {
    if (document) {
      setFormat(document.format);
      setNomorBerkas(document.nomorBerkas);
      setJudul(document.judul);
      setPerihal(document.perihal || document.judul);
      setPemohonNama(document.pemohon?.nama || document.opdName || 'Dinas Pemohon');
      setPemohonInstansi(document.pemohon?.instansi || document.opdName || 'Pemerintah Kabupaten Nagekeo');
      setPemohonKontak(document.pemohon?.kontak || '');
      setFileName(document.fileName);
      setRevisionDeadline(document.revisionDeadline || '');
      setIsConfirmingDelete(false);
    }
  }, [document, isOpen]);

  if (!isOpen || !document) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !nomorBerkas.trim() || !pemohonNama.trim()) return;

    const updatedDoc: DocumentItem = {
      ...document,
      nomorBerkas: nomorBerkas.trim(),
      judul: judul.trim(),
      perihal: perihal.trim() || judul.trim(),
      format,
      fileName: fileName.trim() || document.fileName,
      revisionDeadline: revisionDeadline.trim() || undefined,
      pemohon: {
        ...document.pemohon,
        nama: pemohonNama.trim(),
        instansi: pemohonInstansi.trim() || document.opdName,
        kontak: pemohonKontak.trim() || document.pemohon.kontak,
      },
    };

    onSaveEdit(updatedDoc);
    onClose();
  };

  const handleDelete = () => {
    if (onDeleteDocument) {
      onDeleteDocument(document.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/50 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 border border-white/20 rounded-xl text-white">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Edit Data Berkas SAKIP
              </h3>
              <p className="text-[11px] text-blue-100 font-mono">
                {document.nomorBerkas} • {document.opdName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation View */}
        {isConfirmingDelete ? (
          <div className="p-6 space-y-4 text-slate-900">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-rose-950">
                  Konfirmasi Hapus Berkas
                </h4>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Apakah Anda yakin ingin menghapus berkas{' '}
                  <strong className="font-mono text-rose-950">{document.nomorBerkas}</strong> -{' '}
                  <span>"{document.judul}"</span> dari antrean sistem?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs text-slate-900">
            {/* Format Picker */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Format Berkas Dokumen
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
                  <span>WORD</span>
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
                  <span>EXCEL</span>
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

            {/* Nomor Berkas & Nama File */}
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
                  Nama File Dokumen
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="berkas_dokumen.pdf"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Judul Dokumen */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Judul Dokumen Lengkap *
              </label>
              <input
                type="text"
                required
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Judul dokumen..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Perihal */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Perihal / Ringkasan Isi
              </label>
              <textarea
                rows={2}
                value={perihal}
                onChange={(e) => setPerihal(e.target.value)}
                placeholder="Ringkasan isi..."
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
                    placeholder="Nama Pejabat..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 font-medium">Instansi / Unit Kerja</label>
                  <input
                    type="text"
                    value={pemohonInstansi}
                    onChange={(e) => setPemohonInstansi(e.target.value)}
                    placeholder="Unit Kerja..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Batas Waktu / Deadline Revisi */}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">
                  Batas Waktu (Deadline) Revisi Dokumen :
                </span>
                <span className="text-[10px] text-amber-800 font-bold">Admin SAKIP</span>
              </div>
              <input
                type="datetime-local"
                value={revisionDeadline}
                onChange={(e) => setRevisionDeadline(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <span className="text-slate-500">Perpanjang Cepat:</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    d.setHours(16, 0, 0, 0);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    setRevisionDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                  }}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold cursor-pointer"
                >
                  +3 Hari
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 7);
                    d.setHours(16, 0, 0, 0);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    setRevisionDeadline(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                  }}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold cursor-pointer"
                >
                  +7 Hari
                </button>
                {revisionDeadline && (
                  <button
                    type="button"
                    onClick={() => setRevisionDeadline('')}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold cursor-pointer ml-auto"
                  >
                    Hapus Batas Waktu
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              {onDeleteDocument ? (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Berkas</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
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
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
