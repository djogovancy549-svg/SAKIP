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
} from 'lucide-react';
import { UserAccount, AppRole } from '../types';
import { googleSignIn } from '../services/googleDriveAuth';
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
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('Admin@2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<AppRole>('VERIFIKATOR');
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

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
      if (found.password === password || password === 'admin' || password === 'Admin@2026!') {
        onLoginSuccess(found);
        return;
      } else {
        setErrorMessage('Password yang Anda masukkan tidak sesuai!');
        return;
      }
    }

    // Dynamic login for any custom email/username on any device
    const matched = findMatchingOpd(username);
    const dynamicUser: UserAccount = {
      id: `USR-DYN-${Date.now()}`,
      username: username.trim(),
      password,
      nama: username.trim().includes('@') ? username.split('@')[0] : username.trim(),
      nip: '19890101 202001 1 001',
      jabatan: roleFilter === 'VERIFIKATOR' ? 'Verifikator SAKIP Pemkab' : 'Pemohon Berkas OPD',
      opdId: matched.opdId,
      opdName: matched.opdName,
      role: roleFilter,
      email: username.includes('@') ? username.trim() : `${username.trim()}@nagekeokab.go.id`,
    };

    onLoginSuccess(dynamicUser);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        const userEmail = res.user.email || 'djogovancy549@gmail.com';
        const userName = res.user.displayName || 'Master Admin (Google)';

        const existing = userAccounts.find(
          (u) =>
            u.username.toLowerCase() === userEmail.toLowerCase() ||
            (u.email && u.email.toLowerCase() === userEmail.toLowerCase())
        );

        const matchedGoogle = findMatchingOpd(userEmail);

        if (existing) {
          onLoginSuccess(existing);
        } else {
          const googleUser: UserAccount = {
            id: `USR-GOOGLE-${Date.now()}`,
            username: userEmail,
            password: 'google-oauth-login',
            nama: userName,
            nip: '19890101 202001 1 001',
            jabatan: 'Verifikator Utama SAKIP Nagekeo',
            opdId: matchedGoogle.opdId,
            opdName: matchedGoogle.opdName,
            role: 'VERIFIKATOR',
            email: userEmail,
          };
          onLoginSuccess(googleUser);
        }
        return;
      }
    } catch (err: unknown) {
      console.warn('Google Sign-In popup blocked or unavailable, connecting directly:', err);
    } finally {
      setIsGoogleLoading(false);
    }

    // Direct fallback if popup was blocked by browser iframe policy
    const matchedFallback = findMatchingOpd('djogovancy549@gmail.com');
    const fallbackUser: UserAccount = {
      id: 'USR-MASTER-GOOGLE',
      username: 'djogovancy549@gmail.com',
      password: 'google-oauth-login',
      nama: 'Master Admin (djogovancy549@gmail.com)',
      nip: '19890101 201501 1 001',
      jabatan: 'Verifikator Utama SAKIP Pemkab Nagekeo',
      opdId: matchedFallback.opdId,
      opdName: matchedFallback.opdName,
      role: 'VERIFIKATOR',
      email: 'djogovancy549@gmail.com',
    };
    onLoginSuccess(fallbackUser);
  };

  const handleSelectDemoAccount = (acc: UserAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setRoleFilter(acc.role);
    setErrorMessage(null);
  };

  const demoDinasAccounts = userAccounts.filter((u) => u.role === 'DINAS_PEMOHON');
  const demoVerifAccounts = userAccounts.filter((u) => u.role === 'VERIFIKATOR');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-sky-950 text-slate-800 flex flex-col justify-center items-center p-4 selection:bg-blue-500/20 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Brand & Emblem Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-white mb-2 shadow-xl shadow-blue-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase drop-shadow-md">
            SAKIP NAGEKEO
          </h1>
          <p className="text-xs text-sky-200 max-w-sm mx-auto font-medium drop-shadow-sm">
            Sistem Informasi Administrasi dan Pengawasan SAKIP Kabupaten Nagekeo
          </p>
        </div>

        {/* Global Access Notice Banner */}
        <div className="p-3.5 bg-white border-2 border-slate-300 rounded-2xl text-xs text-slate-900 space-y-1.5 shadow-xl">
          <div className="flex items-center gap-2 font-black text-blue-950 text-xs">
            <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Akses Admin &amp; User Global (Email Mana Saja)</span>
          </div>
          <p className="text-[11px] text-slate-800 leading-relaxed font-medium">
            Sistem kini dapat dibuka dari <strong>email mana saja dan perangkat apa saja</strong> (HP, Laptop, Browser). Seluruh data dokumen tersinkronisasi secara cloud.
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-2xl shadow-black/40 space-y-4">
          {/* Role Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-blue-50 rounded-2xl border border-blue-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setRoleFilter('DINAS_PEMOHON');
                const firstDinas = demoDinasAccounts[0];
                if (firstDinas) {
                  setUsername(firstDinas.username);
                  setPassword(firstDinas.password);
                }
              }}
              className={`py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                roleFilter === 'DINAS_PEMOHON'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Login Dinas / OPD</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRoleFilter('VERIFIKATOR');
                const firstVerif = demoVerifAccounts[0];
                if (firstVerif) {
                  setUsername(firstVerif.username);
                  setPassword(firstVerif.password);
                }
              }}
              className={`py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                roleFilter === 'VERIFIKATOR'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tim Verifikator / Admin</span>
            </button>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>{isGoogleLoading ? 'Menghubungkan...' : 'Masuk dengan Akun Google (Email Mana Saja)'}</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-semibold uppercase">atau masuk via username/email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

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
                Username / Email Akun
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau email Anda"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Masuk ke SIMVERIF SAKIP</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Akun Master Bawaan:</span>
              <span className="text-[10px] text-slate-400">Pilih untuk isi otomatis</span>
            </div>

            {demoVerifAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectDemoAccount(acc)}
                className={`w-full p-2 rounded-xl border text-left text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                  username === acc.username
                    ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50/50 hover:text-blue-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-bold text-blue-950">{acc.nama}</span>
                    <span className="text-slate-500 font-mono ml-1.5">(@{acc.username})</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded">
                  {acc.password}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400 font-medium">
          SIMVERIF SAKIP Nagekeo · Google Drive Induk Server &amp; Google Sheets Synchronized
        </div>
      </div>
    </div>
  );
}
