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
  UserPlus,
  Users,
  KeyRound,
  HelpCircle,
  FileCode2,
  Send,
  Layers,
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
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'FOLDERS' | 'WEBHOOK_GUIDE'>('ACCOUNTS');
  const [localRegistrations, setLocalRegistrations] = useState<Record<string, OpdFolderRegistration>>(folderRegistrations);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingOpdId, setEditingOpdId] = useState<string | null>(null);
  const [savingOpdId, setSavingOpdId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Account Form State
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('Dinas@2026!');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newSelectedOpdId, setNewSelectedOpdId] = useState<string>(opdList[0]?.id || 'DINKES');
  const [newNip, setNewNip] = useState<string>('');
  const [newJabatan, setNewJabatan] = useState<string>('Operator / Verifikator OPD');
  const [newCustomDriveUrl, setNewCustomDriveUrl] = useState<string>('');
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);

  if (!isOpen) return null;

  const selectedOpdObj = opdList.find((o) => o.id === newSelectedOpdId) || opdList[0];

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

    onSaveRegistration(finalizedReg);

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
      `https://drive.google.com/drive/folders/DRIVE_${opdTarget.id}`;

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
      jabatan: newJabatan.trim() || `Pengelola Berkas ${opdTarget.shortName}`,
      pangkat: 'Penata Muda / III-a',
      lastPasswordChangedAt: new Date().toLocaleString('id-ID'),
      driveFolderId: effectiveFolderId,
      driveFolderName: `Google Drive Induk / ${opdTarget.name}`,
      driveFolderUrl: effectiveFolderUrl,
    };

    onAddUserAccount(newUser);

    try {
      await sendUserRegistrationToGoogleSheet(newUser, currentUser);
      setSuccessToast(`Akun dinas @${newUser.username} (${newUser.opdName}) berhasil didaftarkan dan disinkronkan ke worksheet DATABASE_PENGGUNA!`);
    } catch (err) {
      setSuccessToast(`Akun dinas @${newUser.username} berhasil disimpan secara lokal!`);
    } finally {
      setIsCreatingUser(false);
      // Reset form
      setNewUsername('');
      setNewFullName('');
      setNewNip('');
      setNewCustomDriveUrl('');
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
                  Pusat Registrasi Akun Dinas, Folder Drive & Webhook
                </h2>
                <span className="text-[10px] font-mono bg-white/20 text-white font-bold px-2 py-0.5 rounded-full border border-white/30 shrink-0">
                  Hak Akses Admin
                </span>
              </div>
              <p className="text-[11px] text-blue-100 truncate">
                Daftarkan akun login dinas, mapping link folder Google Drive, dan lihat panduan integrasi spreadsheet
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

        {/* Tab Navigation */}
        <div className="flex border-b border-blue-100 bg-blue-50/70 px-5 gap-3 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'ACCOUNTS'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4 text-blue-600" />
            <span>1. Pendaftaran Akun Dinas Baru</span>
            <span className="bg-blue-100 text-blue-800 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {userAccounts.length} Akun
            </span>
          </button>

          <button
            onClick={() => setActiveTab('FOLDERS')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'FOLDERS'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            <span>2. Pendaftaran Link Folder Google Drive</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              {opdList.length} OPD
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
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span>3. Panduan Webhook & Worksheet</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
              4 Sheet
            </span>
          </button>
        </div>

        {/* Success Toast */}
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

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 bg-white">
          {/* TAB 1: DAFTAR AKUN DINAS BARU */}
          {activeTab === 'ACCOUNTS' && (
            <div className="space-y-5">
              {/* Form Tambah Akun Dinas */}
              <div className="bg-blue-50/60 border border-blue-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-blue-100 pb-3">
                  <div className="flex items-center gap-2 font-bold text-blue-950 text-sm">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <span>Formulir Pendaftaran Akun Dinas Baru</span>
                  </div>
                  <span className="text-[11px] text-blue-600 bg-blue-100/80 px-2.5 py-0.5 rounded-full font-medium">
                    Tersinkron ke sheet: <strong className="font-mono">DATABASE_PENGGUNA</strong>
                  </span>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {/* OPD Target */}
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
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                      >
                        {opdList.map((opd) => (
                          <option key={opd.id} value={opd.id}>
                            {opd.name} ({opd.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Username */}
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
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Password */}
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
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Nama Lengkap Pejabat/Operator */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nama Pejabat / Pengelola Berkas *
                      </label>
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="Contoh: dr. Hendro Wicaksono, Sp.PK"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* NIP */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        NIP Pejabat / Staf
                      </label>
                      <input
                        type="text"
                        value={newNip}
                        onChange={(e) => setNewNip(e.target.value)}
                        placeholder="19850101 201001 1 005"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Jabatan */}
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Jabatan / Posisi
                      </label>
                      <input
                        type="text"
                        value={newJabatan}
                        onChange={(e) => setNewJabatan(e.target.value)}
                        placeholder="Kepala Bidang / Staf Verifikasi"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Tautan Folder Google Drive Khusus Dinas */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tautan URL Folder Google Drive Khusus Dinas (Opsional - default otomatis dari Drive Induk) :
                    </label>
                    <input
                      type="url"
                      value={newCustomDriveUrl}
                      onChange={(e) => setNewCustomDriveUrl(e.target.value)}
                      placeholder={`https://drive.google.com/drive/folders/DRIVE_${selectedOpdObj.id}_SERVER`}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isCreatingUser}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{isCreatingUser ? 'Mendaftarkan Akun...' : 'Daftarkan Akun & Simpan ke Spreadsheet'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabel Daftar Akun Terdaftar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Daftar Akun Dinas yang Terdaftar ({userAccounts.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Tersimpan di database & Google Sheet
                  </span>
                </div>

                <div className="border border-blue-200/90 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-700 to-sky-700 text-white text-[11px] font-bold">
                        <th className="p-3">Pengguna & OPD</th>
                        <th className="p-3">Username</th>
                        <th className="p-3">Password</th>
                        <th className="p-3">Folder Google Drive</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-100 bg-white">
                      {userAccounts.map((acc) => (
                        <tr key={acc.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-blue-950">{acc.nama}</div>
                            <div className="text-[11px] text-slate-500">{acc.opdName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{acc.nip} · {acc.jabatan}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              @{acc.username}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">{acc.role}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-semibold">
                              {acc.password}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 truncate max-w-[200px]">
                              <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">{acc.driveFolderName}</span>
                            </div>
                            <a
                              href={acc.driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <span>Buka Folder</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleCopyLink(`Username: ${acc.username}\nPassword: ${acc.password}\nOPD: ${acc.opdName}`, acc.id)}
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

          {/* TAB 2: DAFTAR LINK FOLDER GOOGLE DRIVE OPD */}
          {activeTab === 'FOLDERS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
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

                <button
                  onClick={handleSaveAll}
                  disabled={isSavingAll}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
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

              {/* Table of OPD Folder Mappings */}
              <div className="border border-blue-200/90 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-700 to-sky-700 text-white text-[11px] font-bold">
                      <th className="p-3">Instansi OPD</th>
                      <th className="p-3">Tautan URL Folder Google Drive</th>
                      <th className="p-3">Nama Folder di Server</th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100 bg-white">
                    {filteredOpds.map((opd) => {
                      const reg = localRegistrations[opd.id] || {
                        opdId: opd.id,
                        opdName: opd.name,
                        driveFolderUrl: `https://drive.google.com/drive/folders/1B_${opd.id}_PEMDA_SERVER`,
                        driveFolderId: `1B_${opd.id}_PEMDA_SERVER`,
                        driveFolderName: `Google Drive Induk / ${opd.name}`,
                        registeredByAdmin: currentUser.nama,
                        registeredAt: 'Default Sistem',
                      };

                      return (
                        <tr key={opd.id} className="hover:bg-blue-50/40 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{opd.name}</div>
                            <div className="text-[10px] text-blue-600 font-mono font-semibold">{opd.code} · {opd.category}</div>
                          </td>
                          <td className="p-3">
                            <input
                              type="url"
                              value={reg.driveFolderUrl}
                              onChange={(e) => handleInputChange(opd.id, 'driveFolderUrl', e.target.value)}
                              placeholder={`https://drive.google.com/drive/folders/...`}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={reg.driveFolderName}
                              onChange={(e) => handleInputChange(opd.id, 'driveFolderName', e.target.value)}
                              placeholder={`Google Drive Induk / ${opd.name}`}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleSaveSingle(opd.id)}
                              disabled={savingOpdId === opd.id}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
                            >
                              {savingOpdId === opd.id ? 'Menyimpan...' : 'Simpan'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PANDUAN PENANAMAN URL & WEBHOOK WORKSHEET */}
          {activeTab === 'WEBHOOK_GUIDE' && (
            <div className="space-y-4">
              {/* Box Lokasi URL & Webhook */}
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span>Di Mana Menanamkan URL Endpoint & Webhook Google Sheets?</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  URL Webhook Google Apps Script dan Folder ID Google Drive Induk tertanam langsung secara aman pada sistem di lokasi berikut:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* File 1 */}
                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <FileCode2 className="w-4 h-4 text-blue-600" />
                      <span>1. Pada Kode Aplikasi (Source Code)</span>
                    </div>
                    <div className="text-[11px] font-mono text-blue-800 bg-blue-50 p-2 rounded border border-blue-100">
                      src/services/googleSheetsWebhook.ts
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Variabel <code>DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL</code> dan <code>DEFAULT_GOOGLE_DRIVE_FOLDER_ID</code> dapat disesuaikan kapan saja.
                    </p>
                  </div>

                  {/* File 2 */}
                  <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-2xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>2. Pada Menu Pengaturan Web (UI Langsung)</span>
                    </div>
                    <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100">
                      Header &gt; Tombol "Google Drive &amp; Spreadsheet Server"
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pengguna/Admin dapat menempelkan URL Webhook baru di tab <strong>"Endpoint Webhook"</strong> tanpa perlu edit kode!
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Worksheets Structure */}
              <div className="border border-blue-200 rounded-2xl p-4 space-y-3 bg-white shadow-xs">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Struktur 4 Lembar Kerja (Worksheet) Otomatis pada Google Spreadsheet :</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-blue-700 text-xs">1. DATA_VERIFIKASI_DOKUMEN</div>
                    <p className="text-[11px] text-slate-600">
                      Mencatat nomor berkas, judul, status (SAH / REVISI / DITOLAK), nama verifikator, catatan pemeriksaan, dan link pratinjau dokumen Google Drive.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-blue-700 text-xs">2. DATABASE_PENGGUNA</div>
                    <p className="text-[11px] text-slate-600">
                      Menyimpan akun login dinas dan verifikator (Username, Password, OPD, NIP, Jabatan, Riwayat Ubah Password) secara terisolasi.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-blue-700 text-xs">3. MAPPING_FOLDER_OPD</div>
                    <p className="text-[11px] text-slate-600">
                      Menyimpan registrasi link folder resmi Google Drive untuk setiap OPD agar seluruh dinas memiliki ruang penyimpanan terisolasi.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="font-mono font-bold text-blue-700 text-xs">4. ARSIP_DOKUMEN_OPD</div>
                    <p className="text-[11px] text-slate-600">
                      Mencatat masa retensi arsip, subfolder tahunan (misal: <code>Arsip_2026/Permanen</code>), dan tanggal pemusnahan dokumen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
