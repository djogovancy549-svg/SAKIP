import { useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  Lock,
} from 'lucide-react';
import { UserAccount } from '../types';
import { sendPasswordUpdateToGoogleSheet } from '../services/googleSheetsWebhook';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onPasswordUpdated: (updatedUser: UserAccount) => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  currentUser,
  onPasswordUpdated,
}: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOld, setShowOld] = useState<boolean>(false);
  const [showNew, setShowNew] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    timestamp: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessResult(null);

    // Validation
    if (oldPassword !== currentUser.password) {
      setErrorMessage('Password lama yang Anda masukkan tidak sesuai!');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password baru minimal harus terdiri dari 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok!');
      return;
    }

    setIsSubmitting(true);

    try {
      const timestampNow = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'medium',
        timeStyle: 'short',
      });

      // 1. Send update to Google Sheets (specifically to worksheet DATABASE_PENGGUNA)
      const res = await sendPasswordUpdateToGoogleSheet(currentUser, newPassword);

      // 2. Update user account state
      const updatedUser: UserAccount = {
        ...currentUser,
        password: newPassword,
        lastPasswordChangedAt: timestampNow,
      };

      onPasswordUpdated(updatedUser);
      setSuccessResult({
        message: 'Password berhasil diubah dan dicatat di worksheet DATABASE_PENGGUNA Google Sheet!',
        timestamp: timestampNow,
      });

      // Clear form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setErrorMessage('Gagal memperbarui password ke server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200/90 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header - Elegant Bright Blue */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 border border-white/20 rounded-xl text-white">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white drop-shadow-xs">
                Ubah Password Akun
              </h2>
              <p className="text-[11px] text-blue-100">
                {currentUser.opdName} (@{currentUser.username})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-100 hover:text-white rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs text-slate-700 bg-white">
          {/* Storage Sheet Notice */}
          <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center gap-2.5 text-[11px] text-slate-600">
            <Database className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Password tersimpan di worksheet terpisah: <strong className="text-blue-900 font-mono font-bold">DATABASE_PENGGUNA</strong> (tidak tercampur dengan data dokumen).
            </span>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <div className="flex-1">
                <div>{successResult.message}</div>
                <div className="text-[10px] opacity-75 font-mono mt-0.5">
                  Waktu: {successResult.timestamp}
                </div>
              </div>
            </div>
          )}

          {/* Password Lama */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Password Saat Ini *
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password lama"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-10 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowOld((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Baru */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Password Baru *
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-10 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password Baru */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Konfirmasi Password Baru *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500 font-mono shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Password Baru'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
