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
} from 'lucide-react';
import { UserAccount, AppRole } from '../types';
import databaseBg from '../assets/images/digital_database_modern_bg_1790734176384.jpg';

interface LoginScreenProps {
  userAccounts: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
}

export function LoginScreen({ userAccounts, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('Admin@2026!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<AppRole>('VERIFIKATOR');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const found = userAccounts.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password
    );

    if (!found) {
      setErrorMessage('Username atau Password yang Anda masukkan tidak sesuai!');
      return;
    }

    onLoginSuccess(found);
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

        {/* Security & Isolation Notice Banner */}
        <div className="p-3.5 bg-white border-2 border-slate-300 rounded-2xl text-xs text-slate-900 space-y-1.5 shadow-xl">
          <div className="flex items-center gap-2 font-black text-blue-950 text-xs">
            <Lock className="w-4 h-4 text-blue-700" />
            <span>Isolasi Akses &amp; Keamanan Dokumen</span>
          </div>
          <p className="text-[11px] text-slate-800 leading-relaxed font-bold">
            Setiap Dinas memiliki akun dan password sendiri sehingga <strong>hanya dapat membuka dan mengupload dokumen miliknya</strong> tanpa dapat melihat milik dinas lain.
          </p>
          <div className="text-[10px] text-slate-700 font-mono pt-0.5 flex items-center gap-1.5 font-bold">
            <Database className="w-3.5 h-3.5 text-blue-700" />
            <span>Akun &amp; Password tersimpan di Google Sheet: <strong>DATABASE_PENGGUNA</strong></span>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-2xl shadow-black/40 space-y-5">
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
              <span>Tim Verifikator</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Username Akun
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username dinas/verifikator"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[10px] text-slate-400">
                  *Dapat diubah setelah login
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2 active:scale-98"
            >
              <span>Masuk ke SIMVERIF OPD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Akun Master Bawaan:</span>
              <span className="text-[10px] text-slate-400">Klik untuk isi otomatis</span>
            </div>

            {demoVerifAccounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectDemoAccount(acc)}
                className={`w-full p-2.5 rounded-xl border text-left text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
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

            {demoDinasAccounts.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] text-slate-500 font-semibold mb-1">Akun Dinas Terdaftar:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {demoDinasAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSelectDemoAccount(acc)}
                      className={`p-2 rounded-xl border text-left text-[11px] transition-colors cursor-pointer ${
                        username === acc.username
                          ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50/50 hover:text-blue-900'
                      }`}
                    >
                      <div className="truncate font-semibold">{acc.opdName}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">@{acc.username}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500 font-medium">
          SIMVERIF OPD · Google Drive Induk Server & Google Sheets Integrated
        </div>
      </div>
    </div>
  );
}
