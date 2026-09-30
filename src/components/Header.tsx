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
    <header className="bg-white/95 backdrop-blur-md border-b border-blue-200/80 shadow-xs sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Wordmark & Emblem */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="leading-tight">
            <span className="text-base font-black tracking-tight text-blue-950 block">
              SIMVERIF OPD
            </span>
            <span className="text-[10px] font-mono text-blue-600 tracking-wider uppercase font-semibold">
              Pemeriksaan & Verifikasi Dokumen
            </span>
          </div>
        </div>

        {/* Zone 2: Active OPD / Designated Google Drive Folder */}
        <div className="flex items-center gap-2">
          {/* OPD Selector or Locked Dinas Banner */}
          {isDinas ? (
            // Dinas mode: locked to their own OPD
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs shadow-xs">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] text-blue-600/80 block uppercase font-mono font-semibold">Dinas Anda (Terkunci):</span>
                <span className="font-bold text-blue-950 text-xs">
                  {currentUser.opdName}
                </span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono ml-1 font-semibold">
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
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                title="Pilih Antrean Dinas / OPD"
              >
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-left hidden sm:block max-w-[160px] md:max-w-[200px]">
                  <span className="text-[9px] text-blue-600/80 block uppercase font-mono font-semibold">Antrean Dinas:</span>
                  <span className="font-bold text-blue-950 truncate block text-xs">
                    {activeOpd.shortName}
                  </span>
                </div>
                <span className="sm:hidden font-bold text-blue-950 text-xs truncate max-w-[90px]">
                  {activeOpd.id}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              </button>

              {isOpdDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white border border-blue-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 bg-blue-50/70 border-b border-blue-100 text-xs">
                    <div className="font-bold text-blue-950">Pilih Antrean Dinas / OPD</div>
                    <div className="text-[11px] text-slate-500">
                      Sebagai Verifikator, Anda dapat memeriksa berkas seluruh dinas
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-blue-50 p-1">
                    {OPD_LIST.map((opd) => {
                      const isCurrent = opd.id === activeOpd.id;
                      return (
                        <button
                          key={opd.id}
                          onClick={() => {
                            onSelectOpd(opd);
                            setIsOpdDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="font-semibold text-xs text-slate-900">{opd.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {opd.category} · {opd.code}
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono shrink-0 font-bold">
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
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50/60 hover:bg-blue-100/70 border border-blue-200 text-blue-800 rounded-xl text-xs transition-colors cursor-pointer"
            title="Buka Penjelajah Folder Google Drive Server Langsung di Web"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-600" />
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
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              title="Daftarkan & Kelola Tautan Folder Google Drive Tiap Dinas (Admin)"
            >
              <FolderPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="hidden sm:inline font-mono">Daftar Folder Dinas</span>
            </button>
          )}

          {/* Direct Drive Folder Explorer Button (Requested by user) */}
          <button
            onClick={onOpenDriveExplorer}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Buka Data Folder Google Drive Langsung dari Web Aplikasi"
          >
            <FolderTree className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline font-mono">Folder Drive</span>
          </button>

          {/* Google Sheets Webhook Sync Button */}
          <button
            onClick={onOpenGoogleSheetModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-blue-50 border border-blue-200 text-slate-700 hover:text-blue-900 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Pengaturan Webhook Google Sheets & Drive Induk"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden lg:inline font-mono">Google Sheet</span>
          </button>

          {/* New Document Button (Only if Dinas or Verifikator) */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm active:scale-95"
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
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors text-xs cursor-pointer shadow-xs"
              title="Profil Pengguna & Password"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.nama.charAt(0)}
              </div>
              <div className="hidden xl:block text-left text-xs max-w-[120px]">
                <div className="font-semibold text-slate-900 truncate">{currentUser.nama}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">{currentUser.username}</div>
              </div>
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-blue-200 rounded-2xl shadow-xl p-4 z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-3">
                  <UserCheck className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="font-bold text-slate-900">{currentUser.nama}</div>
                    <div className="text-[11px] text-slate-500 font-mono">@{currentUser.username}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <span className="text-slate-400">Peran Akun:</span>
                    <div className="text-blue-700 font-bold">
                      {currentUser.role === 'VERIFIKATOR' ? 'Petugas Verifikator' : 'Dinas Pemohon'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">OPD:</span>
                    <div className="text-slate-800 font-medium">{currentUser.opdName}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">NIP:</span>
                    <div className="font-mono text-slate-700">{currentUser.nip}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Password Terakhir Diubah:</span>
                    <div className="font-mono text-slate-500 text-[10px]">
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
                      className="w-full py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 flex items-center gap-2 font-medium transition-colors cursor-pointer text-xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Daftarkan Folder Tiap Dinas</span>
                    </button>
                  ) : (
                    <a
                      href={currentUser.driveFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 flex items-center justify-between font-medium transition-colors text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                        <span>Folder Resmi di Drive</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-blue-600" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onOpenChangePasswordModal();
                    }}
                    className="w-full py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-2 font-medium transition-colors cursor-pointer text-xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ubah Password Akun</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onLogout();
                    }}
                    className="w-full py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 flex items-center gap-2 font-medium transition-colors cursor-pointer text-xs"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
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
