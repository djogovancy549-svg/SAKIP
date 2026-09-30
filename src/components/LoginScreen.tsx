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

interface LoginScreenProps {
  userAccounts: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
}

export function LoginScreen({ userAccounts, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState<string>('dinas.pendidikan');
  const [password, setPassword] = useState<string>('Disdik@Password2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<AppRole>('DINAS_PEMOHON');

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500/30">
      {/* Background Decorative Mesh */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 30%, #10b981 0%, transparent 60%)`,
        }}
      />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand & Emblem Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600/20 border-2 border-emerald-500/40 text-emerald-400 mb-2 shadow-xl shadow-emerald-950/50">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white uppercase">
            SIMVERIF OPD PEMDA
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Sistem Autentikasi Mandiri Pemeriksaan & Verifikasi Dokumen Terpadu
          </p>
        </div>

        {/* Security & Isolation Notice Banner */}
        <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1 shadow-lg">
          <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs">
            <Lock className="w-4 h-4" />
            <span>Isolasi Akses & Keamanan Dokumen</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Setiap Dinas memiliki akun dan password sendiri sehingga <strong>hanya dapat membuka dan mengupload dokumen miliknya</strong> tanpa dapat melihat milik dinas lain.
          </p>
          <div className="text-[10px] text-slate-500 font-mono pt-0.5 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Akun & Password tersimpan di Google Sheet: <strong>DATABASE_PENGGUNA</strong></span>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          {/* Role Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
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
              className={`py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                roleFilter === 'DINAS_PEMOHON'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
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
              className={`py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                roleFilter === 'VERIFIKATOR'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Tim Verifikator</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1.5">
                Username Akun
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username dinas/verifikator"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-slate-300">
                  Password
                </label>
                <span className="text-[10px] text-slate-500">
                  *Dapat diubah setelah login
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Masuk ke SIMVERIF OPD</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Pilih Cepat Akun Demo:</span>
              <span className="text-[10px] text-slate-500">Klik untuk isi otomatis</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {demoDinasAccounts.slice(0, 4).map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleSelectDemoAccount(acc)}
                  className={`p-2 rounded-lg border text-left text-[11px] transition-colors ${
                    username === acc.username
                      ? 'bg-blue-950/40 border-blue-500/40 text-blue-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="truncate font-semibold">{acc.opdName.split(' ')[0]} {acc.opdName.split(' ')[1] || ''}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{acc.username}</div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSelectDemoAccount(demoVerifAccounts[0])}
              className={`w-full p-2 rounded-lg border text-left text-[11px] transition-colors flex items-center justify-between ${
                username === demoVerifAccounts[0]?.username
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Akun Tim Verifikator Pusat ({demoVerifAccounts[0]?.username})</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Verifikator</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500">
          SIMVERIF OPD · Google Drive Induk Server & Google Sheets Integrated
        </div>
      </div>
    </div>
  );
}
