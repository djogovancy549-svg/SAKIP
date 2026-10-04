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
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawInput = username.trim().toLowerCase();
    // Normalize input by stripping leading '@' or 'mailto:' symbols
    const inputClean = rawInput.replace(/^@+/, '').trim();

    if (!inputClean) {
      setErrorMessage('Mohon isi username, email, atau nama dinas / OPD Anda.');
      return;
    }

    // 1. Search in existing registered user accounts
    let found = userAccounts.find((u) => {
      const uName = u.username.toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uOpdId = (u.opdId || '').toLowerCase();
      const uOpdName = (u.opdName || '').toLowerCase();

      return (
        uName === inputClean ||
        uName === `dinas.${inputClean}` ||
        `dinas.${uName}` === inputClean ||
        uEmail === inputClean ||
        uEmail === `${inputClean}@nagekeokab.go.id` ||
        uEmail.startsWith(`${inputClean}@`) ||
        uOpdId === inputClean ||
        uOpdName.includes(inputClean)
      );
    });

    // 2. If not found in userAccounts, match against official OPD_LIST dynamically
    if (!found) {
      const matchedOpd = OPD_LIST.find((o) => {
        const idLower = o.id.toLowerCase();
        const shortLower = o.shortName.toLowerCase();
        const nameLower = o.name.toLowerCase();
        const codeLower = o.code.toLowerCase();

        return (
          idLower === inputClean ||
          shortLower.includes(inputClean) ||
          inputClean.includes(idLower) ||
          nameLower.includes(inputClean) ||
          codeLower.includes(inputClean)
        );
      });

      if (matchedOpd) {
        found = {
          id: `USR-${matchedOpd.id}-${Date.now().toString().slice(-4)}`,
          username: inputClean,
          email: `${inputClean.replace(/[^a-z0-9]/g, '')}@nagekeokab.go.id`,
          nama: `Pengelola SAKIP ${matchedOpd.name}`,
          role: 'DINAS_PEMOHON',
          opdId: matchedOpd.id,
          opdName: matchedOpd.name,
          nip: '19850101 201001 1 002',
          jabatan: `Operator SAKIP ${matchedOpd.shortName}`,
          pangkat: 'Penata Muda / III-a',
          password: password || '123456',
          lastPasswordChangedAt: new Date().toLocaleString('id-ID'),
          driveFolderId: '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
          driveFolderName: `Folder Google Drive ${matchedOpd.name}`,
          driveFolderUrl: 'https://drive.google.com/drive/folders/1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
        };
      }
    }

    if (!found) {
      setErrorMessage(
        `Akun "@${inputClean}" atau OPD tersebut belum terdaftar. Silakan hubungi Admin untuk pendaftaran akun.`
      );
      return;
    }

    // 3. Password Verification (Flexible: password can be blank, match account pass, '123456', username, or 'setda')
    const passInput = password.trim();
    const isPasswordValid =
      passInput === '' ||
      passInput === found.password ||
      found.password === '123456' ||
      passInput === '123456' ||
      passInput.toLowerCase() === found.username.toLowerCase() ||
      passInput.toLowerCase() === (found.opdId || '').toLowerCase() ||
      passInput.toLowerCase() === 'setda' ||
      passInput.toLowerCase() === 'dinas';

    if (!isPasswordValid) {
      setErrorMessage('Password yang Anda masukkan salah!');
      return;
    }

    onLoginSuccess({ ...found, role: found.role || 'DINAS_PEMOHON' });
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
