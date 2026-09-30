import { useState } from 'react';
import {
  Building2,
  Database,
  PlusCircle,
  ChevronDown,
  UserCheck,
  ShieldCheck,
  KeyRound,
  LogOut,
  FolderTree,
  HardDrive,
  Lock,
  FolderPlus,
  ExternalLink,
} from 'lucide-react';
import { OPD, UserAccount } from '../types';
import { OPD_LIST } from '../data/opdData';

interface HeaderProps {
  activeOpd: OPD;
  onSelectOpd: (opd: OPD) => void;
  currentUser: UserAccount;
  onOpenGoogleSheetModal: () => void;
  onOpenUploadModal: () => void;
  onOpenChangePasswordModal: () => void;
  onOpenDriveExplorer: () => void;
  onOpenAdminFolderRegistration: () => void;
  onLogout: () => void;
}

export function Header({
  activeOpd,
  onSelectOpd,
  currentUser,
  onOpenGoogleSheetModal,
  onOpenUploadModal,
  onOpenChangePasswordModal,
  onOpenDriveExplorer,
  onOpenAdminFolderRegistration,
  onLogout,
}: HeaderProps) {
  const [isOpdDropdownOpen, setIsOpdDropdownOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  const isDinas = currentUser.role === 'DINAS_PEMOHON';

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Wordmark & Emblem */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <span className="text-base font-black tracking-tight text-white block">
              SIMVERIF OPD
            </span>
            <span className="text-[10px] font-mono text-slate-400 block tracking-wider uppercase">
              Pemeriksaan & Verifikasi Dokumen
            </span>
          </div>
        </div>

        {/* Zone 2: Active OPD / Designated Google Drive Folder */}
        <div className="flex items-center gap-2">
          {/* OPD Selector or Locked Dinas Banner */}
          {isDinas ? (
            // Dinas mode: locked to their own OPD
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
              <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] text-slate-400 block uppercase font-mono">Dinas Anda (Terkunci):</span>
                <span className="font-semibold text-slate-100 text-xs">
                  {currentUser.opdName}
                </span>
              </div>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono ml-1">
                Akses Mandiri
              </span>
            </div>
          ) : (
            // Verifikator mode: can switch OPD queue
            <div className="relative">
              <button
                onClick={() => {
                  setIsOpdDropdownOpen((v) => !v);
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-xs transition-colors cursor-pointer"
                title="Pilih Antrean Dinas / OPD"
              >
                <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-left hidden sm:block max-w-[160px] md:max-w-[200px]">
                  <span className="text-[9px] text-slate-400 block uppercase font-mono">Antrean Dinas:</span>
                  <span className="font-semibold text-slate-100 truncate block text-xs">
                    {activeOpd.shortName}
                  </span>
                </div>
                <span className="sm:hidden font-semibold text-slate-100 text-xs truncate max-w-[90px]">
                  {activeOpd.id}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isOpdDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs">
                    <div className="font-bold text-slate-200">Pilih Antrean Dinas / OPD</div>
                    <div className="text-[11px] text-slate-400">
                      Sebagai Verifikator, Anda dapat memeriksa berkas seluruh dinas
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 p-1">
                    {OPD_LIST.map((opd) => {
                      const isCurrent = opd.id === activeOpd.id;
                      return (
                        <button
                          key={opd.id}
                          onClick={() => {
                            onSelectOpd(opd);
                            setIsOpdDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-600/20 text-emerald-300 font-bold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="font-semibold text-xs">{opd.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {opd.category} · {opd.code}
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono shrink-0">
                              Aktif
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Designated Google Drive Subfolder Pill */}
          <button
            type="button"
            onClick={onOpenDriveExplorer}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
            title="Buka Penjelajah Folder Google Drive Server Langsung di Web"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-mono text-[11px] truncate max-w-[150px]">
              {currentUser.driveFolderName}
            </span>
          </button>
        </div>

        {/* Zone 3: Actions, Google Sheet, Upload, and User Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Admin: Register Folder Links per OPD (Requested by user) */}
          {!isDinas && (
            <button
              onClick={onOpenAdminFolderRegistration}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Daftarkan & Kelola Tautan Folder Google Drive Tiap Dinas (Admin)"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline font-mono">Daftar Folder Dinas</span>
            </button>
          )}

          {/* Direct Drive Folder Explorer Button (Requested by user) */}
          <button
            onClick={onOpenDriveExplorer}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-300 hover:text-blue-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Buka Data Folder Google Drive Langsung dari Web Aplikasi"
          >
            <FolderTree className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="hidden sm:inline font-mono">Folder Drive</span>
          </button>

          {/* Google Sheets Webhook Sync Button */}
          <button
            onClick={onOpenGoogleSheetModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            title="Pengaturan Webhook Google Sheets & Drive Induk"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden lg:inline font-mono">Google Sheet</span>
          </button>

          {/* New Document Button (Only if Dinas or Verifikator) */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
            title="Tambah Berkas Dokumen ke Google Drive"
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Upload Dokumen</span>
          </button>

          {/* User Profile & Password Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen((v) => !v);
                setIsOpdDropdownOpen(false);
              }}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800/80 transition-colors text-xs cursor-pointer"
              title="Profil Pengguna & Password"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                {currentUser.nama.charAt(0)}
              </div>
              <div className="hidden xl:block text-left text-xs max-w-[120px]">
                <div className="font-semibold text-slate-200 truncate">{currentUser.nama}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{currentUser.username}</div>
              </div>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 z-50 text-xs text-slate-300 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800 mb-3">
                  <UserCheck className="w-6 h-6 text-emerald-400" />
                  <div>
                    <div className="font-bold text-slate-100">{currentUser.nama}</div>
                    <div className="text-[11px] text-slate-400 font-mono">@{currentUser.username}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] pb-3 border-b border-slate-800 mb-3">
                  <div>
                    <span className="text-slate-500">Peran Akun:</span>
                    <div className="text-emerald-400 font-semibold">
                      {currentUser.role === 'VERIFIKATOR' ? 'Petugas Verifikator' : 'Dinas Pemohon'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">OPD:</span>
                    <div className="text-slate-200 font-medium">{currentUser.opdName}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">NIP:</span>
                    <div className="font-mono text-slate-300">{currentUser.nip}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Password Terakhir Diubah:</span>
                    <div className="font-mono text-slate-400 text-[10px]">
                      {currentUser.lastPasswordChangedAt}
                    </div>
                  </div>
                </div>

                {/* Account Action Buttons */}
                <div className="space-y-1.5">
                  {!isDinas ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenAdminFolderRegistration();
                      }}
                      className="w-full py-2 px-2.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/20 text-emerald-300 flex items-center gap-2 font-medium transition-colors cursor-pointer text-xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Daftarkan Folder Tiap Dinas</span>
                    </button>
                  ) : (
                    <a
                      href={currentUser.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-2.5 rounded-lg bg-blue-950/30 hover:bg-blue-900/40 border border-blue-500/20 text-blue-300 flex items-center justify-between font-medium transition-colors text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                        <span>Folder Resmi di Drive</span>
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onOpenChangePasswordModal();
                    }}
                    className="w-full py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 font-medium transition-colors cursor-pointer text-xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ubah Password Akun</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/20 text-rose-300 flex items-center gap-2 font-medium transition-colors cursor-pointer text-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
