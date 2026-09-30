import { useState } from 'react';
import {
  X,
  HardDrive,
  FolderPlus,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Building2,
  Database,
  Save,
  RefreshCw,
  Search,
  Check,
  Copy,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { OPD, OpdFolderRegistration, UserAccount } from '../types';
import { extractDriveFolderId, buildDriveFolderUrl, isValidDriveLink } from '../utils/driveFolderUtils';
import {
  sendFolderRegistrationToGoogleSheet,
  sendAllFolderRegistrationsToGoogleSheet,
} from '../services/googleSheetsWebhook';

interface AdminFolderRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  opdList: OPD[];
  folderRegistrations: Record<string, OpdFolderRegistration>;
  currentUser: UserAccount;
  onSaveRegistration: (registration: OpdFolderRegistration) => void;
  onSaveAllRegistrations: (registrations: Record<string, OpdFolderRegistration>) => void;
}

export function AdminFolderRegistrationModal({
  isOpen,
  onClose,
  opdList,
  folderRegistrations,
  currentUser,
  onSaveRegistration,
  onSaveAllRegistrations,
}: AdminFolderRegistrationModalProps) {
  const [localRegistrations, setLocalRegistrations] = useState<Record<string, OpdFolderRegistration>>(folderRegistrations);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingOpdId, setEditingOpdId] = useState<string | null>(null);
  const [savingOpdId, setSavingOpdId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredOpds = opdList.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (opdId: string, field: keyof OpdFolderRegistration, value: string) => {
    setLocalRegistrations((prev) => {
      const current = prev[opdId] || {
        opdId,
        opdName: opdList.find((o) => o.id === opdId)?.name || opdId,
        driveFolderUrl: '',
        driveFolderId: '',
        driveFolderName: `Google Drive Induk / ${opdId}`,
        registeredByAdmin: currentUser.nama,
        registeredAt: new Date().toLocaleString('id-ID'),
        notes: '',
      };

      const updated = { ...current, [field]: value };

      // If URL changed, auto extract folder ID and normalize URL
      if (field === 'driveFolderUrl') {
        const extractedId = extractDriveFolderId(value);
        updated.driveFolderId = extractedId;
      }

      return {
        ...prev,
        [opdId]: updated,
      };
    });
  };

  const handleSaveSingle = async (opdId: string) => {
    const reg = localRegistrations[opdId];
    if (!reg) return;

    setSavingOpdId(opdId);
    setSuccessToast(null);

    const timestampNow = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const finalizedReg: OpdFolderRegistration = {
      ...reg,
      driveFolderUrl: buildDriveFolderUrl(reg.driveFolderUrl || reg.driveFolderId),
      driveFolderId: extractDriveFolderId(reg.driveFolderUrl || reg.driveFolderId),
      registeredByAdmin: currentUser.nama,
      registeredAt: timestampNow,
    };

    // Update parent state & localStorage
    onSaveRegistration(finalizedReg);

    // Sync to Google Sheet via webhook
    try {
      await sendFolderRegistrationToGoogleSheet(finalizedReg, currentUser);
      setSuccessToast(`Tautan Google Drive untuk ${reg.opdName} berhasil didaftarkan & disinkronkan ke Google Sheet!`);
    } catch (e) {
      setSuccessToast(`Tautan Google Drive untuk ${reg.opdName} berhasil didaftarkan secara lokal!`);
    } finally {
      setSavingOpdId(null);
    }
  };

  const handleSaveAll = async () => {
    setIsSavingAll(true);
    setSuccessToast(null);

    const timestampNow = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const finalizedMap: Record<string, OpdFolderRegistration> = {};
    const finalizedList: OpdFolderRegistration[] = [];

    Object.keys(localRegistrations).forEach((opdId) => {
      const reg = localRegistrations[opdId];
      const finalized: OpdFolderRegistration = {
        ...reg,
        driveFolderUrl: buildDriveFolderUrl(reg.driveFolderUrl || reg.driveFolderId),
        driveFolderId: extractDriveFolderId(reg.driveFolderUrl || reg.driveFolderId),
        registeredByAdmin: currentUser.nama,
        registeredAt: timestampNow,
      };
      finalizedMap[opdId] = finalized;
      finalizedList.push(finalized);
    });

    onSaveAllRegistrations(finalizedMap);

    try {
      await sendAllFolderRegistrationsToGoogleSheet(finalizedList, currentUser);
      setSuccessToast(`Seluruh tautan folder (${finalizedList.length} dinas) berhasil didaftarkan dan dicatat di sheet MAPPING_FOLDER_OPD!`);
    } catch (e) {
      setSuccessToast(`Seluruh tautan folder berhasil disimpan secara lokal!`);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200/90 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Header - Elegant Bright Blue */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-white shrink-0 shadow-xs">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-white truncate drop-shadow-xs">
                  Pendaftaran Tautan Folder Google Drive Tiap Dinas
                </h2>
                <span className="text-[10px] font-mono bg-white/20 text-white font-bold px-2 py-0.5 rounded-full border border-white/30 shrink-0">
                  Hak Akses Admin
                </span>
              </div>
              <p className="text-[11px] text-blue-100 truncate">
                Admin mendaftarkan link folder resmi Google Drive untuk setiap dinas agar pemberkasan terisolasi dan tertata rapi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Banner */}
        <div className="bg-blue-50/70 px-5 py-3 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Administrator aktif:{' '}
              <strong className="text-blue-950 font-bold">{currentUser.nama}</strong> (@{currentUser.username})
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Worksheet Terdaftar: <strong className="text-blue-900 font-bold">MAPPING_FOLDER_OPD</strong></span>
          </div>
        </div>

        {/* Toolbar & Search Bar */}
        <div className="p-4 bg-white border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dinas berdasarkan nama, kode, atau kategori..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAll}
              disabled={isSavingAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSavingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyinkronkan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan & Sinkronkan Seluruh Dinas</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {successToast && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800 animate-in fade-in duration-200 shadow-xs">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* OPD Folder Registration Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-sky-50/30">
          {filteredOpds.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Tidak ada dinas yang cocok dengan pencarian "{searchQuery}".
            </div>
          ) : (
            filteredOpds.map((opd) => {
              const reg = localRegistrations[opd.id] || {
                opdId: opd.id,
                opdName: opd.name,
                driveFolderUrl: '',
                driveFolderId: '',
                driveFolderName: `Google Drive Induk / ${opd.id}`,
                registeredByAdmin: currentUser.nama,
                registeredAt: '-',
                notes: '',
              };

              const isSavingThis = savingOpdId === opd.id;
              const hasLink = Boolean(reg.driveFolderUrl || reg.driveFolderId);
              const testUrl = buildDriveFolderUrl(reg.driveFolderUrl || reg.driveFolderId);

              return (
                <div
                  key={opd.id}
                  className="bg-white border border-blue-200/90 hover:border-blue-400 hover:shadow-md rounded-2xl p-4 transition-all space-y-3 shadow-xs"
                >
                  {/* Top Row: OPD Identity & Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{opd.name}</span>
                          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-100">
                            {opd.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {opd.category} · {opd.shortName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasLink ? (
                        <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Folder Terdaftar
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Belum Didaftarkan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form Inputs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                    {/* Input 1: Google Drive Folder URL / ID */}
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>Tautan URL Folder Google Drive:</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Format: URL atau ID Folder
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={reg.driveFolderUrl}
                          onChange={(e) => handleInputChange(opd.id, 'driveFolderUrl', e.target.value)}
                          placeholder="https://drive.google.com/drive/folders/1abcxyz..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 font-mono focus:bg-white focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
                        />
                      </div>
                      {reg.driveFolderId && (
                        <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                          <span>ID Folder:</span>
                          <span className="text-blue-700 font-bold truncate max-w-[200px]">{reg.driveFolderId}</span>
                        </div>
                      )}
                    </div>

                    {/* Input 2: Subfolder Name on Drive Induk */}
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Nama Folder / Jalur Server:
                      </label>
                      <input
                        type="text"
                        value={reg.driveFolderName}
                        onChange={(e) => handleInputChange(opd.id, 'driveFolderName', e.target.value)}
                        placeholder="Google Drive Induk / 01_Nama_Dinas"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
                      />
                    </div>

                    {/* Input 3: Notes / Keterangan Berkas */}
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Keterangan Dokumen:
                      </label>
                      <input
                        type="text"
                        value={reg.notes || ''}
                        onChange={(e) => handleInputChange(opd.id, 'notes', e.target.value)}
                        placeholder="Contoh: Berkas SK, SPM, Perizinan..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Bottom Row: Registration Meta & Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Didaftarkan oleh:</span>
                      <span className="font-semibold text-slate-800">{reg.registeredByAdmin || '-'}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">Waktu:</span>
                      <span className="text-slate-600 font-mono">{reg.registeredAt || '-'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {testUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopyLink(testUrl, opd.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            title="Salin Tautan Folder Google Drive"
                          >
                            {copiedId === opd.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Salin Link</span>
                              </>
                            )}
                          </button>

                          <a
                            href={testUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-colors"
                          >
                            <span>Uji Buka Folder</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}

                      <button
                        onClick={() => handleSaveSingle(opd.id)}
                        disabled={isSavingThis}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {isSavingThis ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyimpan...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Daftarkan Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-blue-50/70 border-t border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-medium text-slate-700">
              Ketika dinas login, sistem otomatis mengunci akses folder Google Drive mereka ke tautan yang didaftarkan di atas.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
