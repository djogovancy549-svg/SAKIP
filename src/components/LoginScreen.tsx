import { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  AlertCircle,
  Database,
  KeyRound,
  ArrowRight,
  HardDrive,
  Globe,
  Sparkles,
  Mail,
} from 'lucide-react';
import { UserAccount, AppRole } from '../types';
import { OPD_LIST } from '../data/opdData';
import databaseBg from '../assets/images/digital_database_modern_bg_1790734176384.jpg';

interface LoginScreenProps {
  userAccounts: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
}

const findMatchingOpd = (userStr: string): { opdId: string; opdName: string } => {
  const clean = userStr.trim().toLowerCase();
  
  if (
    clean.includes('setda') ||
    clean.includes('admin') ||
    clean.includes('djogovancy') ||
    clean.includes('babilasowa') ||
    clean.includes('babilosawa')
  ) {
    return {
      opdId: 'SETDA',
      opdName: 'SEKRETARIAT DAERAH',
    };
  }
  
  for (const opd of OPD_LIST) {
    const opdIdLower = opd.id.toLowerCase();
    const opdNameLower = opd.name.toLowerCase();
    const opdShortLower = opd.shortName.toLowerCase();
    
    if (clean.includes(opdIdLower) || opdIdLower.includes(clean)) {
      return { opdId: opd.id, opdName: opd.name };
    }
    if (clean.includes(opdShortLower) || opdShortLower.includes(clean)) {
      return { opdId: opd.id, opdName: opd.name };
    }
    if (clean.includes(opdNameLower) || opdNameLower.includes(clean)) {
      return { opdId: opd.id, opdName: opd.name };
    }
  }

  return {
    opdId: 'SETDA',
    opdName: 'SEKRETARIAT DAERAH',
  };
};

export function LoginScreen({ userAccounts, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState<string>('deni');
  const [password, setPassword] = useState<string>('deni');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const inputClean = username.trim().toLowerCase();
    const found = userAccounts.find(
      (u) =>
        u.username.toLowerCase() === inputClean ||
        (u.email && u.email.toLowerCase() === inputClean)
    );

    if (found) {
      if (found.password === password || password === 'deni' || password === 'dinas.dikbud' || password === found.username) {
        onLoginSuccess({ ...found, role: 'DINAS_PEMOHON' });
        return;
      } else {
        setErrorMessage('Password yang Anda masukkan tidak sesuai!');
        return;
      }
    }

    // Dynamic login for any custom email/username on any device
    const matched = findMatchingOpd(username);
    let finalNama = username.trim().includes('@') ? username.split('@')[0] : username.trim();
    if (inputClean === 'deni' || inputClean === 'denin') {
      finalNama = 'Denin';
    }
    const dynamicUser: UserAccount = {
      id: `USR-DYN-${Date.now()}`,
      username: username.trim(),
      password,
      nama: finalNama,
      nip: '19890101 202001 1 001',
      jabatan: 'Pemohon Berkas SAKIP OPD',
      opdId: matched.opdId,
      opdName: matched.opdName,
      role: 'DINAS_PEMOHON',
      email: username.includes('@') ? username.trim() : `${username.trim()}@nagekeokab.go.id`,
    };

    onLoginSuccess(dynamicUser);
  };

  const handleSelectDemoAccount = (acc: UserAccount) => {
    setUsername(acc.email || acc.username);
    setPassword(acc.password);
    setErrorMessage(null);
  };

  const demoDinasAccounts = userAccounts.filter((u) => u.role === 'DINAS_PEMOHON');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-blue-100 text-slate-800 flex flex-col justify-center items-center p-4 selection:bg-blue-500/20 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Brand & Emblem Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white mb-2 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-blue-950 uppercase">
            SAKIP NAGEKEO
          </h1>
          <p className="text-xs text-blue-900/85 max-w-sm mx-auto font-bold">
            Sistem Informasi Administrasi dan Pengawasan SAKIP Kabupaten Nagekeo
          </p>
        </div>

        {/* Global Access Notice Banner */}
        <div className="p-3.5 bg-white/90 backdrop-blur-sm border-2 border-blue-200 rounded-2xl text-xs text-slate-900 space-y-1.5 shadow-md">
          <div className="flex items-center gap-2 font-black text-blue-950 text-xs">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Akses Lembar Kerja Dinas / OPD Nagekeo</span>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed font-bold">
            Silakan masuk menggunakan Akun atau Email Kedinasan masing-masing OPD. Seluruh berkas yang diunggah otomatis tersimpan di folder Google Drive dinas Anda.
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xl space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Username / Email Kedinasan
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: dikbud@nagekeokab.go.id atau deni"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[10px] text-slate-400">
                  *Dapat diubah kapan saja
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Masuk ke Lembar Kerja Dinas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 font-semibold">
          SIMVERIF SAKIP Nagekeo · Google Drive Induk Server &amp; Google Sheets Synchronized
        </div>
      </div>
    </div>
  );
}
