import { useState, useEffect } from 'react';
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
  UserPlus,
  Users,
  KeyRound,
  HelpCircle,
  FileCode2,
  Send,
  Layers,
  Trash2,
  Plus,
} from 'lucide-react';
import { OPD, OpdFolderRegistration, UserAccount } from '../types';
import { extractDriveFolderId, buildDriveFolderUrl, isValidDriveLink } from '../utils/driveFolderUtils';
import {
  sendFolderRegistrationToGoogleSheet,
  sendAllFolderRegistrationsToGoogleSheet,
  sendUserRegistrationToGoogleSheet,
  getGoogleSheetsWebhookUrl,
  getGoogleDriveFolderId,
  getGoogleDriveFolderUrl,
  DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL,
} from '../services/googleSheetsWebhook';

interface AdminFolderRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  opdList: OPD[];
  folderRegistrations: Record<string, OpdFolderRegistration>;
  userAccounts: UserAccount[];
  currentUser: UserAccount;
  onSaveRegistration: (registration: OpdFolderRegistration) => void;
  onSaveAllRegistrations: (registrations: Record<string, OpdFolderRegistration>) => void;
  onAddUserAccount: (newUser: UserAccount) => void;
}

export function AdminFolderRegistrationModal({
  isOpen,
  onClose,
  opdList,
  folderRegistrations,
  userAccounts,
  currentUser,
  onSaveRegistration,
  onSaveAllRegistrations,
  onAddUserAccount,
}: AdminFolderRegistrationModalProps) {
  const [activeTab, setActiveTab] = useState<'FOLDERS' | 'ACCOUNTS' | 'WEBHOOK_GUIDE'>('FOLDERS');
  const [folderViewFilter, setFolderViewFilter] = useState<'REGISTERED_ONLY' | 'ADD_NEW' | 'ALL_38'>('REGISTERED_ONLY');
  const [localRegistrations, setLocalRegistrations] = useState<Record<string, OpdFolderRegistration>>(folderRegistrations);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savingOpdId, setSavingOpdId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Quick Register Single Folder Form State
  const [quickOpdId, setQuickOpdId] = useState<string>(opdList[0]?.id || 'SETDA');
  const [quickDriveUrl, setQuickDriveUrl] = useState<string>('');
  const [quickFolderName, setQuickFolderName] = useState<string>('');
  const [quickNotes, setQuickNotes] = useState<string>('');

  // New Account Form State
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('Dinas@2026!');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newSelectedOpdId, setNewSelectedOpdId] = useState<string>(opdList[0]?.id || 'SETDA');
  const [newNip, setNewNip] = useState<string>('');
  const [newJabatan, setNewJabatan] = useState<string>('Operator / Verifikator OPD');
  const [newCustomDriveUrl, setNewCustomDriveUrl] = useState<string>('');
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);

  useEffect(() => {
    setLocalRegistrations(folderRegistrations);
  }, [folderRegistrations]);

  if (!isOpen) return null;

  // Registered folders list (only real entries that have non-empty url/id)
  const registeredEntries = Object.values(localRegistrations).filter(
    (reg) => reg && reg.driveFolderUrl && reg.driveFolderUrl.trim() !== ''
  );

  const registeredOpdIds = new Set(registeredEntries.map((r) => r.opdId));

  const handleQuickRegisterFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDriveUrl.trim()) return;

    const opd = opdList.find((o) => o.id === quickOpdId) || opdList[0];
    const folderId = extractDriveFolderId(quickDriveUrl.trim());
    const folderUrl = buildDriveFolderUrl(quickDriveUrl.trim());
    const folderName = quickFolderName.trim() || `Google Drive Induk / ${opd.shortName}`;

    const timestampNow = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const newReg: OpdFolderRegistration = {
      opdId: opd.id,
      opdName: opd.name,
      driveFolderUrl: folderUrl,
      driveFolderId: folderId,
      driveFolderName: folderName,
      registeredByAdmin: currentUser.nama,
      registeredAt: timestampNow,
      notes: quickNotes.trim(),
    };

    setSavingOpdId(opd.id);
    setSuccessToast(null);

    setLocalRegistrations((prev) => ({
      ...prev,
      [opd.id]: newReg,
    }));

    onSaveRegistration(newReg);

    try {
      await sendFolderRegistrationToGoogleSheet(newReg, currentUser);
      setSuccessToast(`Folder Google Drive untuk "${opd.name}" berhasil didaftarkan dan dicatat di sheet MAPPING_FOLDER_OPD!`);
    } catch {
      setSuccessToast(`Folder Google Drive untuk "${opd.name}" berhasil disimpan secara lokal!`);
    } finally {
      setSavingOpdId(null);
      setQuickDriveUrl('');
      setQuickFolderName('');
      setQuickNotes('');
      setFolderViewFilter('REGISTERED_ONLY');
    }
  };

  const handleDeleteRegistration = (opdId: string, opdName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus pendaftaran folder Google Drive untuk "${opdName}"?`)) {
      const updated = { ...localRegistrations };
      delete updated[opdId];
      setLocalRegistrations(updated);
      onSaveAllRegistrations(updated);
      setSuccessToast(`Pendaftaran folder untuk "${opdName}" telah dihapus.`);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) return;

    setIsCreatingUser(true);
    setSuccessToast(null);

    const opdTarget = opdList.find((o) => o.id === newSelectedOpdId) || opdList[0];
    const registeredFolder = localRegistrations[opdTarget.id];

    const effectiveFolderUrl =
      newCustomDriveUrl.trim() ||
      registeredFolder?.driveFolderUrl ||
      getGoogleDriveFolderUrl();

    const effectiveFolderId = extractDriveFolderId(effectiveFolderUrl);

    const newUser: UserAccount = {
      id: `usr-${newUsername.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      username: newUsername.trim().toLowerCase(),
      password: newPassword,
      nama: newFullName.trim(),
      role: 'DINAS_PEMOHON',
      opdId: opdTarget.id,
      opdName: opdTarget.name,
      nip: newNip.trim() || '19880101 201501 1 001',
      jabatan: newJabatan.trim() || `Pengelola SAKIP ${opdTarget.shortName}`,
      pangkat: 'Penata Muda / III-a',
      lastPasswordChangedAt: new Date().toLocaleString('id-ID'),
      driveFolderId: effectiveFolderId,
      driveFolderName: registeredFolder?.driveFolderName || `Google Drive SAKIP / ${opdTarget.name}`,
      driveFolderUrl: effectiveFolderUrl,
    };

    onAddUserAccount(newUser);

    try {
      await sendUserRegistrationToGoogleSheet(newUser, currentUser);
      setSuccessToast(`Akun dinas @${newUser.username} (${newUser.opdName}) berhasil didaftarkan dan disinkronkan ke worksheet DATABASE_PENGGUNA!`);
    } catch {
      setSuccessToast(`Akun dinas @${newUser.username} berhasil disimpan secara lokal!`);
    } finally {
      setIsCreatingUser(false);
      setNewUsername('');
      setNewFullName('');
      setNewNip('');
      setNewCustomDriveUrl('');
    }
  };

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-white/15 border border-white/20 rounded-2xl text-white shrink-0 shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-white truncate drop-shadow-xs">
                  Pusat Registrasi Folder Drive &amp; Akun SAKIP Nagekeo
                </h2>
                <span className="text-[10px] font-mono bg-white/20 text-white font-bold px-2 py-0.5 rounded-full border border-white/30 shrink-0">
                  Admin Panel
                </span>
              </div>
              <p className="text-[11px] text-blue-100 truncate">
                Daftarkan tautan Google Drive dinas, buat akun login, dan kelola pemetaan data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-blue-100 hover:text-white rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
            title="Tutup Menu Registrasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 gap-2 sm:gap-4 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('FOLDERS')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'FOLDERS'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <span>1. Folder Google Drive Dinas</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              {registeredEntries.length} Terdaftar
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'ACCOUNTS'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span>2. Akun Login Dinas</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              {userAccounts.length} Akun
            </span>
          </button>

          <button
            onClick={() => setActiveTab('WEBHOOK_GUIDE')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'WEBHOOK_GUIDE'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-purple-600" />
            <span>3. Panduan Webhook &amp; Sheets</span>
          </button>
        </div>

        {/* Success Toast Banner */}
        {successToast && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-800 flex items-center justify-between gap-2 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5 text-xs text-slate-700 bg-slate-50/50">
          {/* TAB 1: FOLDER GOOGLE DRIVE DINAS */}
          {activeTab === 'FOLDERS' && (
            <div className="space-y-4">
              {/* Filter & View Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setFolderViewFilter('REGISTERED_ONLY')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                      folderViewFilter === 'REGISTERED_ONLY'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Folder yang Sudah Terdaftar ({registeredEntries.length})</span>
                  </button>

                  <button
                    onClick={() => setFolderViewFilter('ADD_NEW')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                      folderViewFilter === 'ADD_NEW'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Daftarkan Folder Baru</span>
                  </button>

                  <button
                    onClick={() => setFolderViewFilter('ALL_38')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5 ${
                      folderViewFilter === 'ALL_38'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Daftar 38 OPD Nagekeo</span>
                  </button>
                </div>
              </div>

              {/* VIEW MODE 1: HANYA YANG SUDAH TERDAFTAR */}
              {folderViewFilter === 'REGISTERED_ONLY' && (
                <div className="space-y-3">
                  {registeredEntries.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
                      <FolderPlus className="w-10 h-10 text-slate-300 mx-auto" />
                      <div className="font-bold text-slate-700 text-sm">Belum Ada Folder OPD yang Didaftarkan</div>
                      <p className="text-slate-500 max-w-sm mx-auto text-xs">
                        Klik tombol <strong>"+ Daftarkan Folder Baru"</strong> di atas untuk menautkan link Google Drive bagi OPD Kabupaten Nagekeo.
                      </p>
                      <button
                        onClick={() => setFolderViewFilter('ADD_NEW')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Daftarkan Folder Sekarang</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {registeredEntries.map((reg) => (
                        <div
                          key={reg.opdId}
                          className="bg-white border border-blue-200 rounded-2xl p-4 space-y-2.5 shadow-xs hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{reg.opdName}</div>
                              <div className="text-[10px] text-blue-600 font-mono font-semibold">
                                ID: {reg.opdId} · Didaftarkan oleh {reg.registeredByAdmin}
                              </div>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono shrink-0">
                              ✓ Terdaftar
                            </span>
                          </div>

                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1 text-[11px] font-mono text-slate-700">
                            <div className="flex items-center gap-1.5 truncate">
                              <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-semibold truncate">{reg.driveFolderName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              ID: {reg.driveFolderId}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <a
                              href={reg.driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold transition-colors inline-flex items-center gap-1.5 text-[11px]"
                            >
                              <span>Buka di Google Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDeleteRegistration(reg.opdId, reg.opdName)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                              title="Hapus Pendaftaran Folder"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW MODE 2: FORM DAFTARKAN FOLDER BARU */}
              {folderViewFilter === 'ADD_NEW' && (
                <div className="bg-white border border-blue-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="border-b border-slate-100 pb-3">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <FolderPlus className="w-4 h-4 text-blue-600" />
                      <span>Formulir Pendaftaran Folder Google Drive</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Pilih instansi OPD di Kabupaten Nagekeo dan tempelkan (paste) link folder Google Drive-nya.
                    </p>
                  </div>

                  <form onSubmit={handleQuickRegisterFolder} className="space-y-3.5">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Pilih Dinas / Instansi Pemkab Nagekeo *
                      </label>
                      <select
                        value={quickOpdId}
                        onChange={(e) => {
                          setQuickOpdId(e.target.value);
                          const o = opdList.find((x) => x.id === e.target.value);
                          if (o) {
                            setQuickFolderName(`Google Drive Induk / ${o.shortName}`);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                      >
                        {opdList.map((opd) => (
                          <option key={opd.id} value={opd.id}>
                            {opd.name} ({opd.code}) {registeredOpdIds.has(opd.id) ? '— [Sudah Terdaftar]' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Link URL Folder Google Drive *
                      </label>
                      <input
                        type="url"
                        required
                        value={quickDriveUrl}
                        onChange={(e) => setQuickDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Pastikan izin folder Google Drive sudah diatur ke "Siapa saja yang memiliki link dapat melihat/mengedit" (Anyone with link).
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Nama Label Folder di Server (Opsional)
                        </label>
                        <input
                          type="text"
                          value={quickFolderName}
                          onChange={(e) => setQuickFolderName(e.target.value)}
                          placeholder="Google Drive Induk / 01_SETDA"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Catatan / Keterangan Folder (Opsional)
                        </label>
                        <input
                          type="text"
                          value={quickNotes}
                          onChange={(e) => setQuickNotes(e.target.value)}
                          placeholder="Folder naskah evaluasi SAKIP tahun 2026"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setFolderViewFilter('REGISTERED_ONLY')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors cursor-pointer text-xs"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={savingOpdId !== null || !quickDriveUrl.trim()}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 text-xs inline-flex items-center gap-2"
                      >
                        {savingOpdId ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Simpan Folder Dinas</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* VIEW MODE 3: TABEL 38 OPD */}
              {folderViewFilter === 'ALL_38' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari dinas, badan, kecamatan di Nagekeo..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-bold border-b border-slate-200">
                          <th className="p-3">Instansi OPD (38)</th>
                          <th className="p-3">Status Folder</th>
                          <th className="p-3">Tautan URL Google Drive</th>
                          <th className="p-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {opdList
                          .filter(
                            (o) =>
                              o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              o.shortName.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((opd) => {
                            const reg = localRegistrations[opd.id];
                            const isRegistered = Boolean(reg && reg.driveFolderUrl && reg.driveFolderUrl.trim() !== '');

                            return (
                              <tr key={opd.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-slate-900">{opd.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {opd.code} · {opd.category}
                                  </div>
                                </td>
                                <td className="p-3">
                                  {isRegistered ? (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono inline-flex items-center gap-1">
                                      <Check className="w-3 h-3" /> Terdaftar
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-medium font-mono">
                                      Belum Didaftarkan
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-[11px]">
                                  {isRegistered ? (
                                    <a
                                      href={reg.driveFolderUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[220px]"
                                    >
                                      <span className="truncate">{reg.driveFolderUrl}</span>
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 italic text-[10px]">
                                      (Kosong — belum ada tautan)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  {isRegistered ? (
                                    <button
                                      onClick={() => handleDeleteRegistration(opd.id, opd.name)}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer text-[11px]"
                                      title="Hapus Folder"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setQuickOpdId(opd.id);
                                        setQuickFolderName(`Google Drive Induk / ${opd.shortName}`);
                                        setFolderViewFilter('ADD_NEW');
                                      }}
                                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold transition-colors cursor-pointer text-[11px]"
                                    >
                                      + Daftarkan
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAFTAR AKUN DINAS BARU */}
          {activeTab === 'ACCOUNTS' && (
            <div className="space-y-4">
              {/* Form Tambah Akun Dinas */}
              <div className="bg-white border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
                    <UserPlus className="w-4 h-4 text-blue-600" />
                    <span>Formulir Pendaftaran Akun Dinas Baru</span>
                  </div>
                  <span className="text-[11px] text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full font-medium border border-blue-200">
                    Tersinkron ke Google Sheet: <strong className="font-mono">DATABASE_PENGGUNA</strong>
                  </span>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Pilih Dinas / Instansi OPD *
                      </label>
                      <select
                        value={newSelectedOpdId}
                        onChange={(e) => {
                          setNewSelectedOpdId(e.target.value);
                          const o = opdList.find((x) => x.id === e.target.value);
                          if (o) {
                            setNewUsername(`dinas.${o.shortName.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
                            setNewFullName(`Operator ${o.name}`);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                      >
                        {opdList.map((opd) => (
                          <option key={opd.id} value={opd.id}>
                            {opd.name} ({opd.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Username Login *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="contoh: dinas.kesehatan"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Password Awal *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Password akun"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nama Pejabat / Pengelola Berkas *
                      </label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="Nama staf operator"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        NIP Pejabat / Staf (Opsional)
                      </label>
                      <input
                        type="text"
                        value={newNip}
                        onChange={(e) => setNewNip(e.target.value)}
                        placeholder="19850101 201001 1 005"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Jabatan Operator SAKIP
                      </label>
                      <input
                        type="text"
                        value={newJabatan}
                        onChange={(e) => setNewJabatan(e.target.value)}
                        placeholder="Operator SAKIP OPD"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 text-xs inline-flex items-center gap-2"
                    >
                      {isCreatingUser ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Daftarkan Akun &amp; Sinkronkan ke Google Sheet</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabel Akun Login Terdaftar */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Daftar Akun Pengguna Terdaftar ({userAccounts.length})</span>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      {userAccounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{acc.nama}</div>
                            <div className="text-[10px] text-slate-500">{acc.opdName}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              @{acc.username}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                              {acc.password}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleCopyLink(`Username: ${acc.username}\nPassword: ${acc.password}\nInstansi: ${acc.opdName}`, acc.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium"
                              title="Salin Kredensial Login"
                            >
                              {copiedId === acc.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedId === acc.id ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PANDUAN WEBHOOK & GOOGLE SHEETS */}
          {activeTab === 'WEBHOOK_GUIDE' && (
            <div className="space-y-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>Struktur 4 Worksheet Google Sheets SAKIP Nagekeo</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Semua data registrasi folder, akun pengguna, unggahan berkas, dan verifikasi otomatis tersimpan ke 4 tab lembar kerja Google Sheets berikut:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-blue-900 text-xs font-mono">1. MAPPING_FOLDER_OPD</div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Mencatat ID OPD, Nama Dinas, URL Folder Google Drive, dan admin pendaftar.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-emerald-900 text-xs font-mono">2. DATABASE_PENGGUNA</div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Mencatat daftar akun login, username, password, NIP, jabatan, dan hak akses dinas.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-amber-900 text-xs font-mono">3. LOG_UNGGAHAN_DOKUMEN</div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Mencatat seluruh berkas dokumen SAKIP yang diupload oleh masing-masing dinas.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <div className="font-bold text-purple-900 text-xs font-mono">4. LOG_VERIFIKASI_DOKUMEN</div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Mencatat hasil verifikasi, nomor Berita Acara, status SAH / REVISI, dan catatan telaah.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-medium">
            Pemerintah Kabupaten Nagekeo · SAKIP NAGEKEO
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
