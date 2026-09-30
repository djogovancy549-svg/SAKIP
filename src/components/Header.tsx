import { useState, useRef, useEffect } from 'react';
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
  Settings2,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import { OPD, UserAccount } from '../types';
import { OPD_LIST } from '../data/opdData';
import { initDriveAuth, googleSignIn, googleSignOut } from '../services/googleDriveAuth';

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
  const [isServerMenuOpen, setIsServerMenuOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  const isDinas = currentUser.role === 'DINAS_PEMOHON';

  const [googleDriveUser, setGoogleDriveUser] = useState<any>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  useEffect(() => {
    const unsubscribe = initDriveAuth((user) => {
      setGoogleDriveUser(user);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleDriveUser(res.user);
      }
    } catch (e) {
      console.error('Failed to sign in with Google Drive', e);
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Close menus on outside click
  const opdRef = useRef<HTMLDivElement>(null);
  const serverRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (opdRef.current && !opdRef.current.contains(e.target as Node)) {
        setIsOpdDropdownOpen(false);
      }
      if (serverRef.current && !serverRef.current.contains(e.target as Node)) {
        setIsServerMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-slate-300 shadow-sm sticky top-0 z-40 select-none text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Zone 1: Logo & Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="leading-tight">
            <span className="text-base font-black tracking-tight text-blue-950 block">
              SAKIP NAGEKEO
            </span>
            <span className="text-[10px] font-mono text-blue-700 tracking-wider uppercase font-bold">
              Administrasi &amp; Pengawasan SAKIP
            </span>
          </div>
        </div>

        {/* Zone 2: Antrean Dinas Selector (Clean & Minimalist) */}
        <div className="flex items-center gap-2">
          {isDinas ? (
            // Dinas Mode: Clean locked badge
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs shadow-xs">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-left">
                <span className="text-[9px] text-slate-600 block uppercase font-mono font-bold">Instansi OPD:</span>
                <span className="font-bold text-blue-950 text-xs">
                  {currentUser.opdName}
                </span>
              </div>
            </div>
          ) : (
            // Verifikator Mode: Single clean dropdown for choosing OPD queue
            <div className="relative" ref={opdRef}>
              <button
                onClick={() => {
                  setIsOpdDropdownOpen((v) => !v);
                  setIsServerMenuOpen(false);
                  setIsProfileOpen(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs transition-colors cursor-pointer shadow-xs font-bold"
                title="Pilih Antrean Dinas / OPD"
              >
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-left">
                  <span className="text-[9px] text-blue-700 block uppercase font-mono font-bold">Antrean Dinas:</span>
                  <span className="font-bold text-blue-950 truncate block text-xs max-w-[140px] sm:max-w-[200px]">
                    {activeOpd.name}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              </button>

              {isOpdDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 bg-blue-50 border-b border-blue-200 text-xs">
                    <div className="font-bold text-blue-950">Pilih Antrean Dinas / OPD</div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      Pilih instansi untuk memeriksa antrean berkas
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1">
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
                              ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                              : 'text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="font-bold text-xs text-slate-900">{opd.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono font-medium">
                              {opd.category} · {opd.code}
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono shrink-0 font-bold">
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
        </div>

        {/* Zone 3: Clean Actions (Consolidated into 3 items: Upload, Server Integrasi, Profil) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Google Drive Direct OAuth Connect Status */}
          {googleDriveUser ? (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 shadow-2xs"
              title={`Terhubung ke Google Drive: ${googleDriveUser.email}`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[130px] font-mono text-[11px]">{googleDriveUser.email}</span>
            </div>
          ) : (
            <button
              onClick={handleConnectGoogle}
              disabled={isConnectingGoogle}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              title="Hubungkan akun Google Drive untuk pengunggahan berkas langsung"
            >
              <HardDrive className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="hidden lg:inline">{isConnectingGoogle ? 'Menghubungkan...' : 'Hubungkan Drive'}</span>
            </button>
          )}

          {/* 1. Main Action Button: Upload Dokumen */}
          <button
            onClick={onOpenUploadModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
            title="Upload Dokumen Baru"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Upload Dokumen</span>
          </button>

          {/* 2. Consolidated Server & Storage Menu Dropdown */}
          <div className="relative" ref={serverRef}>
            <button
              onClick={() => {
                setIsServerMenuOpen((v) => !v);
                setIsOpdDropdownOpen(false);
                setIsProfileOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                isServerMenuOpen
                  ? 'bg-blue-100 text-blue-900 border-blue-400'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
              }`}
              title="Menu Server, Google Drive, dan Integrasi Spreadsheet"
            >
              <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="hidden md:inline">Server &amp; Integrasi</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            </button>

            {/* Server Menu Dropdown Content */}
            {isServerMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border-2 border-slate-300 rounded-2xl shadow-xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="font-bold text-blue-950 text-xs">Pusat Server &amp; Integrasi</div>
                  <div className="text-[10px] text-slate-600 font-medium">Akses penyimpanan Google Drive &amp; Webhook</div>
                </div>

                <div className="space-y-1">
                  {/* Option 1: Drive Folder Explorer */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsServerMenuOpen(false);
                      onOpenDriveExplorer();
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <FolderTree className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900">Penjelajah Google Drive</div>
                      <div className="text-[10px] text-slate-600 font-medium">Lihat arsip berkas di server Google Drive</div>
                    </div>
                  </button>

                  {/* Option 2: Admin Folder & Account Registration (Admin only) */}
                  {!isDinas && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsServerMenuOpen(false);
                          onOpenAdminFolderRegistration();
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 flex items-start gap-2.5 transition-colors cursor-pointer"
                      >
                        <FolderPlus className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900">Pendaftaran Akun &amp; Folder Dinas</div>
                          <div className="text-[10px] text-slate-600 font-medium">Daftarkan akun login &amp; mapping folder OPD</div>
                        </div>
                      </button>

                      {/* Option 3: Google Sheets & Webhook (Admin only) */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsServerMenuOpen(false);
                          onOpenGoogleSheetModal();
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 flex items-start gap-2.5 transition-colors cursor-pointer"
                      >
                        <Database className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900">Google Spreadsheet &amp; Webhook</div>
                          <div className="text-[10px] text-slate-600 font-medium">Konfigurasi endpoint webhook &amp; script sync</div>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. User Profile Button */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileOpen((v) => !v);
                setIsServerMenuOpen(false);
                setIsOpdDropdownOpen(false);
              }}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors text-xs cursor-pointer shadow-xs"
              title="Profil Pengguna & Password"
            >
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.nama.charAt(0)}
              </div>
              <div className="hidden lg:block text-left text-xs max-w-[120px]">
                <div className="font-bold text-blue-950 truncate">{currentUser.nama}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">@{currentUser.username}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown Content */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-blue-200 rounded-2xl shadow-xl p-4 z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {currentUser.nama.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate">{currentUser.nama}</div>
                    <div className="text-[11px] text-blue-600 font-mono">@{currentUser.username}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] pb-3 border-b border-slate-100 mb-3">
                  <div>
                    <span className="text-slate-400">Peran Akun:</span>
                    <div className="text-blue-700 font-bold">
                      {currentUser.role === 'VERIFIKATOR' ? 'Petugas Verifikator / Admin' : 'Dinas Pemohon'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Instansi:</span>
                    <div className="text-slate-800 font-semibold truncate">{currentUser.opdName}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">NIP:</span>
                    <div className="font-mono text-slate-700">{currentUser.nip}</div>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="space-y-1.5">
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
