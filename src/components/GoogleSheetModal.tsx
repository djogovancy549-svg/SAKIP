import { useState, useEffect } from 'react';
import {
  Database,
  X,
  Copy,
  Check,
  Send,
  ExternalLink,
  Code,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  HardDrive,
  FolderTree,
  Folder,
  FileCheck,
  FolderCheck,
  Activity,
  Play,
  ArrowRight,
  ShieldCheck,
  Mail,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getGoogleSheetsWebhookUrl,
  saveGoogleSheetsWebhookUrl,
  resetGoogleSheetsWebhookUrl,
  DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL,
  getGoogleDriveFolderId,
  saveGoogleDriveFolderId,
  DEFAULT_GOOGLE_DRIVE_FOLDER_ID,
  getGoogleDriveFolderUrl,
  DEFAULT_GOOGLE_DRIVE_MASTER_NAME,
  getGoogleSpreadsheetUrl,
  saveGoogleSpreadsheetUrl,
  getSyncLogs,
  sendTestPingToWebhook,
  sendSampleTestDocument,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
} from '../services/googleSheetsWebhook';
import { WebhookSyncLog } from '../types';
import { OPD_LIST } from '../data/opdData';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleSheetModal({ isOpen, onClose }: GoogleSheetModalProps) {
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [driveFolderId, setDriveFolderId] = useState<string>('');
  const [sheetUrl, setSheetUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'SELF_CHECK' | 'DRIVE' | 'ENDPOINT' | 'SCRIPT' | 'LOGS'>('SELF_CHECK');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  
  // Test states
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [isSendingTestDoc, setIsSendingTestDoc] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp: string;
    details?: string;
  } | null>(null);
  const [sampleDocSent, setSampleDocSent] = useState<{
    success: boolean;
    docNumber: string;
    message: string;
    timestamp: string;
  } | null>(null);

  const [syncLogs, setSyncLogs] = useState<WebhookSyncLog[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getGoogleSheetsWebhookUrl());
      setDriveFolderId(getGoogleDriveFolderId());
      setSheetUrl(getGoogleSpreadsheetUrl());
      setSyncLogs(getSyncLogs());
      setTestResult(null);
      setSampleDocSent(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAll = async () => {
    let cleanedDriveId = driveFolderId.trim();
    if (cleanedDriveId.includes('drive.google.com')) {
      const match = cleanedDriveId.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        cleanedDriveId = match[1];
      }
    }

    saveGoogleSheetsWebhookUrl(webhookUrl);
    saveGoogleDriveFolderId(cleanedDriveId);
    saveGoogleSpreadsheetUrl(sheetUrl);
    setDriveFolderId(cleanedDriveId);

    setTestResult({
      success: true,
      message: 'Konfigurasi Webhook, Google Drive, & Spreadsheet berhasil disimpan!',
      timestamp: new Date().toLocaleTimeString('id-ID'),
    });
  };

  const handleResetDefault = () => {
    resetGoogleSheetsWebhookUrl();
    setWebhookUrl(DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL);
    setDriveFolderId(DEFAULT_GOOGLE_DRIVE_FOLDER_ID);
    setSheetUrl('https://docs.google.com/spreadsheets/');
    saveGoogleSpreadsheetUrl('https://docs.google.com/spreadsheets/');
    setTestResult({
      success: true,
      message: 'Konfigurasi dikembalikan ke bawaan sistem.',
      timestamp: new Date().toLocaleTimeString('id-ID'),
    });
  };

  const handleTestPing = async () => {
    setIsTestingPing(true);
    setTestResult(null);
    try {
      const startTime = Date.now();
      const res = await sendTestPingToWebhook(webhookUrl);
      const latency = Date.now() - startTime;
      setTestResult({
        ...res,
        details: `Waktu respon server: ${latency}ms | Endpoint: ${webhookUrl.slice(0, 50)}...`,
      });
      setSyncLogs(getSyncLogs());
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleSendSampleDoc = async () => {
    setIsSendingTestDoc(true);
    setSampleDocSent(null);
    try {
      const res = await sendSampleTestDocument();
      setSampleDocSent(res);
      setSyncLogs(getSyncLogs());
    } finally {
      setIsSendingTestDoc(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-blue-950/50 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200/90 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-white/15 border border-white/20 rounded-2xl text-white shadow-xs">
              <Activity className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-white drop-shadow-xs">
                  Pusat Pemeriksaan &amp; Verifikasi Mandiri
                </h2>
                <span className="text-[10px] font-mono bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-full shadow-xs">
                  STATUS AKTIF
                </span>
              </div>
              <p className="text-[11px] text-blue-100">
                Periksa langsung aliran data berkas, email akun dinas, Google Sheet, dan folder Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-blue-100 hover:text-white rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 gap-2 sm:gap-4 text-xs font-semibold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('SELF_CHECK')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'SELF_CHECK'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Pemeriksaan Mandiri</span>
          </button>

          <button
            onClick={() => setActiveTab('DRIVE')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'DRIVE'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Folder Google Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('ENDPOINT')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'ENDPOINT'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Konfigurasi &amp; URL</span>
          </button>

          <button
            onClick={() => setActiveTab('SCRIPT')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'SCRIPT'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Kode Apps Script (.gs)</span>
          </button>

          <button
            onClick={() => setActiveTab('LOGS')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'LOGS'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Log Riwayat ({syncLogs.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 bg-white">
          {/* TAB 1: SELF CHECK & DIAGNOSTICS */}
          {activeTab === 'SELF_CHECK' && (
            <div className="space-y-4">
              {/* Core Verification Banner */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-blue-950 text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Pusat Uji Coba: Pastikan Data Masuk ke Sheet &amp; Drive</span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    Pengecekan Transparan
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Gunakan tombol di bawah ini untuk menguji secara langsung apakah sistem webhook Anda menerima data dan mencatatnya ke baris Google Sheet serta folder Google Drive. Anda dapat membuka Sheet dan Drive untuk membuktikannya sendiri!
                </p>
              </div>

              {/* Direct Inspection Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Action 1: Ping Test */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>1. Uji Ping Webhook</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mengirim sinyal cepat untuk memastikan Google Apps Script siap menerima data.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isTestingPing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-500/20"
                  >
                    <Play className={`w-3.5 h-3.5 ${isTestingPing ? 'animate-spin' : ''}`} />
                    <span>{isTestingPing ? 'Menguji Koneksi...' : 'Uji Ping Webhook Sekarang'}</span>
                  </button>
                </div>

                {/* Action 2: Send Sample Document Row */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>2. Kirim Dokumen Uji Coba</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Kirim 1 baris berkas sampel ke sheet <strong>DATA_VERIFIKASI_DOKUMEN</strong> agar Anda bisa melihat baris baru muncul di Google Sheet.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendSampleDoc}
                    disabled={isSendingTestDoc}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-500/20"
                  >
                    <FileSpreadsheet className={`w-3.5 h-3.5 ${isSendingTestDoc ? 'animate-pulse' : ''}`} />
                    <span>{isSendingTestDoc ? 'Mengirim Data Sampel...' : 'Kirim 1 Baris Sampel ke Sheet'}</span>
                  </button>
                </div>
              </div>

              {/* Ping Result Notification */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 text-xs animate-in fade-in duration-200 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                  <div className="flex-1 space-y-1">
                    <div className="font-bold">{testResult.message}</div>
                    {testResult.details && (
                      <div className="text-[10px] opacity-80 font-mono">
                        {testResult.details} · {testResult.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sample Document Sent Result Notification with direct jump link */}
              {sampleDocSent && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2 text-xs text-emerald-950 animate-in zoom-in-95 duration-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Data Uji "{sampleDocSent.docNumber}" Berhasil Terkirim!</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      {sampleDocSent.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900">
                    Sistem telah mengirimkan baris berkas ini ke sheet <strong>DATA_VERIFIKASI_DOKUMEN</strong>. Silakan periksa Google Sheet sekarang untuk memastikannya sendiri:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={getGoogleSpreadsheetUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Google Sheet Sekarang</span>
                    </a>
                    <a
                      href={getGoogleDriveFolderUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Buka Folder Google Drive</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Quick Direct Links Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                  <span>Tautan Langsung untuk Memeriksa Sendiri :</span>
                  <span className="text-[10px] text-slate-500 font-mono">Buka di Tab Baru</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href={getGoogleSpreadsheetUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">Google Spreadsheet Utama</div>
                        <div className="text-[10px] text-slate-500 font-mono">DATA_VERIFIKASI &amp; AKUN</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                  </a>

                  <a
                    href={getGoogleDriveFolderUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-lg group-hover:scale-105 transition-transform">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">Folder Google Drive Induk</div>
                        <div className="text-[10px] text-slate-500 font-mono">Penyimpanan Berkas Asli</div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                  </a>
                </div>
              </div>

              {/* 3 Worksheets Architecture Status */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Struktur 3 Worksheet Otomatis di Google Spreadsheet Anda :</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] font-mono">DATA_VERIFIKASI_DOKUMEN</div>
                        <div className="text-[10px] text-slate-500">Menyimpan berkas pengajuan, nomor berkas, status verifikasi, dan email pemohon.</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full font-mono">
                      Otomatis
                    </span>
                  </div>

                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] font-mono">DATABASE_PENGGUNA</div>
                        <div className="text-[10px] text-slate-500">Menyimpan daftar akun login dinas lengkap dengan Email Kedinasan (@nagekeokab.go.id).</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                      Otomatis
                    </span>
                  </div>

                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <div>
                        <div className="font-bold text-slate-900 text-[11px] font-mono">MAPPING_FOLDER_OPD</div>
                        <div className="text-[10px] text-slate-500">Menyimpan pemetaan tautan Google Drive khusus untuk masing-masing Dinas / OPD.</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full font-mono">
                      Otomatis
                    </span>
                  </div>
                </div>
              </div>

              {/* Troubleshooting note for "Data only appears on web" */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 space-y-1.5 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Mengapa Sebelumnya Data Hanya Muncul di Web &amp; Tidak Masuk ke Sheet?</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Pada Google Apps Script, jika saat klik <strong>Deploy &gt; Web app</strong> pilihan <strong>Who has access</strong> diatur ke <em>"Only myself"</em>, maka Google akan memblokir kiriman data dari web. Pastikan pilihan diatur ke <strong>"Anyone"</strong> agar Google mengizinkan aplikasi web menyimpan berkas dan mencatat baris data ke spreadsheet Anda!
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE FOLDER */}
          {activeTab === 'DRIVE' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/80 border border-blue-200/90 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
                  <HardDrive className="w-4 h-4 text-blue-600" />
                  <span>Arsitektur Penyimpanan: Google Drive Induk Server</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Semua dokumen fisik (PDF, Word, Excel, Gambar) yang diupload oleh dinas secara otomatis disimpan ke <strong>Google Drive Induk yang berfungsi sebagai Server Penyimpanan Terpusat</strong>. Sistem otomatis mengelompokkan berkas ke dalam subfolder dinas terkait.
                </p>
              </div>

              {/* Master Folder Configuration */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-blue-600" />
                    <span>URL atau ID Folder Google Drive Anda :</span>
                  </label>
                  <span className="text-[10px] text-blue-600 font-mono font-bold">
                    *Tempel URL/ID Drive Anda
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                    placeholder="Contoh: https://drive.google.com/drive/folders/1a2b3c4d5e..."
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <a
                    href={getGoogleDriveFolderUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shadow-xs"
                  >
                    <span>Uji Buka Folder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Subfolder list */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-amber-600" />
                  <span>Struktur Subfolder Otomatis per Dinas di Google Drive Induk :</span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                  <div className="text-blue-700 font-bold flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-blue-600" />
                    <span>📁 [GOOGLE DRIVE INDUK SERVER PEMDA]</span>
                  </div>
                  {OPD_LIST.slice(0, 5).map((opd) => (
                    <div key={opd.id} className="pl-6 text-slate-700 flex items-center gap-1.5">
                      <span className="text-slate-400">├──</span>
                      <Folder className="w-3 h-3 text-amber-500" />
                      <span>📁 {opd.name} /</span>
                      <span className="text-[10px] text-slate-500 font-sans">
                        (Semua berkas & revisi {opd.shortName})
                      </span>
                    </div>
                  ))}
                  <div className="pl-6 text-slate-500 flex items-center gap-1.5">
                    <span className="text-slate-400">└──</span>
                    <Folder className="w-3 h-3 text-amber-500" />
                    <span>📁 ... (dan dinas-dinas lainnya)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ENDPOINT & SPREADSHEET URL CONFIG */}
          {activeTab === 'ENDPOINT' && (
            <div className="space-y-4">
              {/* Google Spreadsheet URL */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Tautan URL Google Spreadsheet Anda :</span>
                  </label>
                  <a
                    href={sheetUrl || 'https://docs.google.com/spreadsheets/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Buka Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1A2B3C.../edit"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500">
                  Tempel URL Google Spreadsheet tempat Anda memasang skrip. Ini memudahkan Anda membuka sheet dengan 1 klik dari aplikasi.
                </p>
              </div>

              {/* Webhook URL */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>URL Endpoint Webhook Google Apps Script :</span>
                  </label>
                  <span className="text-[10px] text-blue-600 font-mono font-bold">
                    *Harus berakhiran /exec
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    title="Salin URL Webhook"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer font-medium"
                  title="Kembalikan ke konfigurasi default sistem"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ke Bawaan</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
                >
                  Simpan Semua Pengaturan
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SCRIPT CODE */}
          {activeTab === 'SCRIPT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Kode Script Google Drive Server + Spreadsheet (.gs):
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-xs cursor-pointer shadow-xs"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Semua Kode'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 max-h-[300px] overflow-y-auto whitespace-pre leading-relaxed select-all">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </div>

              <div className="text-[11px] text-slate-700 bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 space-y-1.5">
                <div className="font-bold text-blue-950">Langkah Pasang &amp; Deploy Skrip:</div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                  <li>Buka Google Spreadsheet Anda di <strong>sheets.new</strong>.</li>
                  <li>Klik menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Hapus kode bawaan, lalu tempel kode di atas (gunakan tombol <strong>Salin Semua Kode</strong>).</li>
                  <li>
                    Klik <strong>Deploy &gt; New deployment</strong>, pilih jenis <strong>Web app</strong>:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5 text-blue-900 font-medium">
                      <li>Execute as: <strong>Me (email Google Anda)</strong></li>
                      <li>Who has access: <strong>Anyone</strong> (Wajib agar form web bisa mengirim data!)</li>
                    </ul>
                  </li>
                  <li>Salin URL Web App yang dihasilkan dan tempelkan di tab <strong>Konfigurasi &amp; URL</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 5: SYNC LOGS */}
          {activeTab === 'LOGS' && (
            <div className="space-y-3">
              {syncLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Database className="w-8 h-8 mx-auto opacity-30" />
                  <div className="font-medium">Belum ada transaksi pengiriman data.</div>
                  <p className="text-[11px] text-slate-500">
                    Gunakan tab "Pemeriksaan Mandiri" untuk menguji kirim data uji coba.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">
                          {log.docNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {log.timestamp}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-600">{log.opd}</span>
                        <span>·</span>
                        <span
                          className={`font-semibold ${
                            log.status === 'APPROVED'
                              ? 'text-emerald-600'
                              : log.status === 'REVISION'
                              ? 'text-orange-600'
                              : log.status === 'REJECTED'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 font-mono truncate">
                        {log.responseMessage}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Sistem SAKIP Terintegrasi &bull; Google Drive &amp; Sheets
          </div>
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
