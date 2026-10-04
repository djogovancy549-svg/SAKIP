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
  LayoutDashboard,
  Users,
  Lock,
  Globe,
  FileCode,
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
} from '../services/googleSheetsWebhook';
import { APPS_SCRIPT_CODE_GS, APPS_SCRIPT_INDEX_HTML } from '../services/googleAppsScriptFiles';
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
  const [activeTab, setActiveTab] = useState<'SCRIPT_FILES' | 'SELF_CHECK' | 'ADMIN_DASHBOARD' | 'DRIVE' | 'ENDPOINT' | 'LOGS'>('SCRIPT_FILES');
  const [activeCodeFile, setActiveCodeFile] = useState<'CODE_GS' | 'INDEX_HTML' | 'GUIDE'>('CODE_GS');
  const [copiedCodeGs, setCopiedCodeGs] = useState<boolean>(false);
  const [copiedIndexHtml, setCopiedIndexHtml] = useState<boolean>(false);
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

  const handleSaveAll = () => {
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

  const handleCopyCodeGs = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE_GS);
    setCopiedCodeGs(true);
    setTimeout(() => setCopiedCodeGs(false), 2500);
  };

  const handleCopyIndexHtml = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_INDEX_HTML);
    setCopiedIndexHtml(true);
    setTimeout(() => setCopiedIndexHtml(false), 2500);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-blue-950/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200/90 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-white/15 border border-white/20 rounded-2xl text-white shadow-xs">
              <FileCode className="w-5 h-5 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-white drop-shadow-xs">
                  Coding Apps Script: Code.gs &amp; Index.html
                </h2>
                <span className="text-[10px] font-mono bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded-full shadow-xs">
                  TINGGAL SALIN
                </span>
              </div>
              <p className="text-[11px] text-blue-100">
                Salin file Code.gs &amp; Index.html ke Google Apps Script Spreadsheet untuk membuat Dashboard Admin Verifikasi yang terhubung ke User Dinas
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
            onClick={() => setActiveTab('SCRIPT_FILES')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'SCRIPT_FILES'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-blue-600" />
            <span>1. Salin Code.gs &amp; Index.html</span>
          </button>

          <button
            onClick={() => setActiveTab('ADMIN_DASHBOARD')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'ADMIN_DASHBOARD'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Buka Dashboard Admin Apps Script</span>
          </button>

          <button
            onClick={() => setActiveTab('SELF_CHECK')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'SELF_CHECK'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-purple-600" />
            <span>3. Uji Koneksi &amp; Ping</span>
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
            <span>URL Webhook &amp; Drive</span>
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
          
          {/* TAB 1: KODE FILE APPS SCRIPT (CODE.GS & INDEX.HTML) */}
          {activeTab === 'SCRIPT_FILES' && (
            <div className="space-y-4">
              
              {/* Instruksi Singkat */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 max-w-xl">
                  <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span>Cara Pasang di Google Spreadsheet (2 File Saja):</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Buka Google Spreadsheet &gt; <strong>Ekstensi &gt; Apps Script</strong>. Buat file <strong>Code.gs</strong> dan file <strong>Index.html</strong> dengan menyalin kode di bawah, lalu Deploy sebagai <strong>Web app (Anyone)</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={getGoogleSpreadsheetUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Spreadsheet ↗</span>
                  </a>
                </div>
              </div>

              {/* File Switcher Tabs */}
              <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveCodeFile('CODE_GS')}
                  className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-2 cursor-pointer ${
                    activeCodeFile === 'CODE_GS'
                      ? 'bg-slate-900 text-white border-slate-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <FileCode className="w-4 h-4 text-sky-400" />
                  <span>File 1: Code.gs (Backend &amp; doGet)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCodeFile('INDEX_HTML')}
                  className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-2 cursor-pointer ${
                    activeCodeFile === 'INDEX_HTML'
                      ? 'bg-slate-900 text-white border-slate-800'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>File 2: Index.html (Tampilan Dashboard Admin)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCodeFile('GUIDE')}
                  className={`px-4 py-2.5 rounded-t-xl border-t border-x transition-colors flex items-center gap-2 cursor-pointer ${
                    activeCodeFile === 'GUIDE'
                      ? 'bg-blue-50 text-blue-900 border-blue-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Panduan Langkah Demi Langkah (1 Menit)</span>
                </button>
              </div>

              {/* FILE 1: CODE.GS */}
              {activeCodeFile === 'CODE_GS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Kode untuk file:</span>
                      <code className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-blue-700">Code.gs</code>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCodeGs}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-md shadow-blue-500/20"
                    >
                      {copiedCodeGs ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedCodeGs ? 'Tersalin ke Clipboard!' : 'Salin Kode Code.gs'}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-sky-300 max-h-[380px] overflow-y-auto whitespace-pre leading-relaxed select-all">
                    {APPS_SCRIPT_CODE_GS}
                  </div>
                </div>
              )}

              {/* FILE 2: INDEX.HTML */}
              {activeCodeFile === 'INDEX_HTML' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>Kode untuk file:</span>
                      <code className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-emerald-700">Index.html</code>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyIndexHtml}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      {copiedIndexHtml ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedIndexHtml ? 'Tersalin ke Clipboard!' : 'Salin Kode Index.html'}</span>
                    </button>
                  </div>

                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-[11px] font-mono text-emerald-300 max-h-[380px] overflow-y-auto whitespace-pre leading-relaxed select-all">
                    {APPS_SCRIPT_INDEX_HTML}
                  </div>
                </div>
              )}

              {/* PANDUAN DEPLOY */}
              {activeCodeFile === 'GUIDE' && (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs leading-relaxed text-slate-700">
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Langkah Memasang Dashboard Admin di Apps Script (1 Menit):</span>
                  </div>

                  <ol className="list-decimal pl-5 space-y-2.5 text-slate-700">
                    <li>
                      <strong>Buka Spreadsheet:</strong> Buka Google Spreadsheet database Anda di peramban.
                    </li>
                    <li>
                      <strong>Buka Editor Apps Script:</strong> Klik menu <strong>Ekstensi &gt; Apps Script</strong>.
                    </li>
                    <li>
                      <strong>Tempel File 1 (Code.gs):</strong> Di file <code>Code.gs</code> yang sudah ada, hapus semua kode bawaan lalu tempel kode dari tab <strong>File 1: Code.gs</strong>.
                    </li>
                    <li>
                      <strong>Buat File 2 (Index.html):</strong> Di sebelah kiri editor Apps Script, klik ikon <strong>+ (Tambah file)</strong> &gt; pilih <strong>HTML</strong> &gt; beri nama <code>Index</code> (tanpa .html). Hapus isinya lalu tempel kode dari tab <strong>File 2: Index.html</strong>.
                    </li>
                    <li>
                      <strong>Deploy Web App:</strong> Klik tombol biru <strong>Deploy &gt; New deployment</strong> di pojok kanan atas:
                      <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-800 font-medium">
                        <li>Pilih tipe: <strong>Web app</strong> (klik ikon gerigi &gt; Web app)</li>
                        <li>Description: <strong>Dashboard Admin SAKIP</strong></li>
                        <li>Execute as: <strong>Me (email Google Anda)</strong></li>
                        <li>Who has access: <strong>Anyone</strong> (Wajib agar form User Dinas bisa mengirim berkas)</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Salin URL Web App:</strong> Salin URL Web App (berakhiran <code>/exec</code>) dan tempelkan ke tab <strong>URL Webhook &amp; Drive</strong> di aplikasi ini!
                    </li>
                  </ol>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: APPS SCRIPT ADMIN DASHBOARD */}
          {activeTab === 'ADMIN_DASHBOARD' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-300 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                    <span>Dashboard Admin Google Apps Script (Web App)</span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                    TERHUBUNG PENUH
                  </span>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Ketika Admin membuka URL Web App Apps Script di browser, sistem secara otomatis merender <strong>Dashboard Admin Profesional</strong> (melalui fungsi <code>doGet</code> dan file <code>Index.html</code>). Seluruh tindakan verifikasi, nomor BAV, catatan, atau pengembalian revisi yang dilakukan Admin akan langsung masuk ke Google Sheet dan otomatis dilihat oleh User Dinas di halaman berkas mereka!
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <a
                    href={webhookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-700/20 active:scale-95 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Buka Dashboard Admin Apps Script di Tab Baru ↗</span>
                  </a>

                  <a
                    href={getGoogleSpreadsheetUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-300 transition-colors shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Buka Google Spreadsheet</span>
                  </a>
                </div>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>1. Verifikasi Admin</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Admin menyetujui (Sah), meminta revisi, atau menolak berkas lengkap dengan nomor BAV dan catatan evaluasi.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-sky-600" />
                    <span>2. User Dinas Upload &amp; Revisi</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    User Dinas hanya fokus mengupload dokumen baru dan mengupload berkas perbaikan jika statusnya 'Perlu Revisi'.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-amber-600" />
                    <span>3. Google Drive Terpusat</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Dokumen PDF fisik otomatis tersimpan di folder Google Drive Induk Server dan dapat dibuka sekali klik.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SELF CHECK */}
          {activeTab === 'SELF_CHECK' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-blue-950 text-xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Pusat Pemeriksaan Mandiri Koneksi Webhook</span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    Uji Transparan
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Uji apakah URL Webhook Apps Script Anda siap menerima data dari User Dinas dan mencatatnya ke baris Google Sheet.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>1. Uji Ping Webhook</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Kirim sinyal uji coba untuk memastikan Apps Script aktif dan merespon.
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

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>2. Kirim Dokumen Uji Coba</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Kirim 1 baris sampel ke sheet DATA_VERIFIKASI_DOKUMEN untuk melihat baris baru muncul di Google Sheet.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendSampleDoc}
                    disabled={isSendingTestDoc}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-500/20"
                  >
                    <FileSpreadsheet className={`w-3.5 h-3.5 ${isSendingTestDoc ? 'animate-pulse' : ''}`} />
                    <span>{isSendingTestDoc ? 'Mengirim Data...' : 'Kirim 1 Baris Sampel ke Sheet'}</span>
                  </button>
                </div>
              </div>

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

              {sampleDocSent && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2 text-xs text-emerald-950 animate-in zoom-in-95 duration-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Data Uji "{sampleDocSent.docNumber}" Berhasil Masuk ke Google Sheet!</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      {sampleDocSent.timestamp}
                    </span>
                  </div>
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
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ENDPOINT & URL */}
          {activeTab === 'ENDPOINT' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-blue-600" />
                    <span>URL Webhook Google Apps Script (Web App) :</span>
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

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Tautan Google Spreadsheet Database Anda :</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-amber-600" />
                    <span>ID / URL Folder Google Drive Induk Server :</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  placeholder="ID Folder Drive Induk..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer font-medium"
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

          {/* TAB 5: LOGS */}
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
                      <p className="text-[11px] text-slate-600">{log.responseMessage}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
