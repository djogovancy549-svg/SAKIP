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
  RotateCcw,
  HardDrive,
  FolderTree,
  Folder,
  FileCheck,
  FolderCheck,
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
  getSyncLogs,
  sendTestPingToWebhook,
  GOOGLE_APPS_SCRIPT_TEMPLATE,
} from '../services/googleSheetsWebhook';
import { saveGoogleSettingsToFirestore } from '../services/firestoreSync';
import { WebhookSyncLog } from '../types';
import { OPD_LIST } from '../data/opdData';

interface GoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleSheetModal({ isOpen, onClose }: GoogleSheetModalProps) {
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [driveFolderId, setDriveFolderId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'DRIVE' | 'ENDPOINT' | 'SCRIPT' | 'LOGS'>('DRIVE');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    timestamp: string;
  } | null>(null);
  const [syncLogs, setSyncLogs] = useState<WebhookSyncLog[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWebhookUrl(getGoogleSheetsWebhookUrl());
      setDriveFolderId(getGoogleDriveFolderId());
      setSyncLogs(getSyncLogs());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAll = async () => {
    // Extract real ID if full URL was pasted
    let cleanedDriveId = driveFolderId.trim();
    if (cleanedDriveId.includes('drive.google.com')) {
      const match = cleanedDriveId.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        cleanedDriveId = match[1];
      }
    }

    saveGoogleSheetsWebhookUrl(webhookUrl);
    saveGoogleDriveFolderId(cleanedDriveId);
    setDriveFolderId(cleanedDriveId);

    // Save to global shared Firestore database so all other devices auto-sync to this Webhook and Folder
    await saveGoogleSettingsToFirestore({
      webhookUrl: webhookUrl.trim(),
      driveFolderId: cleanedDriveId,
    });

    setTestResult({
      success: true,
      message: 'Pengaturan Google Drive Server & Webhook berhasil disimpan!',
      timestamp: new Date().toLocaleTimeString('id-ID'),
    });
  };

  const handleResetDefault = () => {
    resetGoogleSheetsWebhookUrl();
    setWebhookUrl(DEFAULT_GOOGLE_SHEETS_WEBHOOK_URL);
    setDriveFolderId(DEFAULT_GOOGLE_DRIVE_FOLDER_ID);
    setTestResult({
      success: true,
      message: 'Konfigurasi dikembalikan ke bawaan sistem.',
      timestamp: new Date().toLocaleTimeString('id-ID'),
    });
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await sendTestPingToWebhook(webhookUrl);
      setTestResult(res);
      setSyncLogs(getSyncLogs());
    } finally {
      setIsTesting(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white border border-blue-200/90 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 border-b border-blue-500 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 border border-white/20 rounded-xl text-white">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white drop-shadow-xs">
                Pusat Penyimpanan: Google Drive Induk & Spreadsheet
              </h2>
              <p className="text-[11px] text-blue-100">
                Dokumen yang diunggah disimpan di Google Drive Induk server dan dicatat di Google Sheets
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

        {/* Tab Navigation */}
        <div className="flex border-b border-blue-100 bg-blue-50/70 px-5 gap-4 text-xs font-medium overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('DRIVE')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'DRIVE'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Drive Induk (Server)</span>
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
            <span>Endpoint Webhook</span>
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
            <span>Riwayat Pengiriman ({syncLogs.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs text-slate-700 bg-white">
          {/* TAB 1: GOOGLE DRIVE INDUK SERVER */}
          {activeTab === 'DRIVE' && (
            <div className="space-y-4">
              {/* Architecture Explanation Card */}
              <div className="p-4 bg-blue-50/80 border border-blue-200/90 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-xs">
                  <HardDrive className="w-4 h-4 text-blue-600" />
                  <span>Arsitektur Server Penyimpanan: Google Drive Induk</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Menjawab pertanyaan: <em>"dokumen yang diupload ditaruh di mana?"</em>
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Semua dokumen fisik (PDF, Word, Excel, Gambar pindaian) yang diupload oleh dinas disimpan langsung di <strong>Google Drive Induk yang berfungsi sebagai Server Penyimpanan Terpusat</strong>. Sistem secara otomatis mengelompokkan berkas ke dalam subfolder masing-masing Dinas / OPD agar arsip tertata rapi dan aman.
                </p>
              </div>

              {/* Step-by-Step Guide for Google Drive Folder ID */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2 text-xs">
                <div className="font-bold text-amber-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  <span>Cara Menghubungkan Folder Google Drive Anda :</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-900 leading-relaxed pl-1">
                  <li>
                    Buka{' '}
                    <a
                      href="https://drive.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold text-blue-700 hover:text-blue-900"
                    >
                      Google Drive Anda (drive.google.com)
                    </a>
                    .
                  </li>
                  <li>
                    Buat atau Buka folder tempat penyimpanan berkas (misal:{' '}
                    <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">
                      Folder SAKIP Pemkab
                    </code>
                    ).
                  </li>
                  <li>Salin (*copy*) seluruh URL dari address bar browser Anda.</li>
                  <li>
                    Tempelkan (*paste*) URL/ID tersebut pada kolom di bawah ini, lalu klik tombol{' '}
                    <strong>Simpan Pengaturan Server</strong>.
                  </li>
                </ol>
              </div>

              {/* Master Folder ID Configuration */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
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
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shadow-xs"
                  >
                    <span>Uji Buka Folder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Visual Folder Structure by OPD */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
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
                        (Semua berkas v1, v2, & revisi {opd.shortName})
                      </span>
                    </div>
                  ))}
                  <div className="pl-6 text-slate-500 flex items-center gap-1.5">
                    <span className="text-slate-400">└──</span>
                    <Folder className="w-3 h-3 text-amber-500" />
                    <span>📁 ... (dan dinas-dinas lainnya)</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5 text-[11px] text-slate-700">
                  <div className="font-bold text-blue-800 flex items-center gap-1.5">
                    <FolderCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pendaftaran Link Folder Tiap Dinas oleh Admin:</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Setiap dinas memiliki tautan folder Google Drive yang didaftarkan langsung oleh Admin/Verifikator. Data pendaftaran dicatat pada worksheet <strong>MAPPING_FOLDER_OPD</strong> sehingga setiap dinas hanya dapat mengakses dan mengunggah dokumen ke foldernya sendiri.
                  </p>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed">
                  Tautan resmi file Google Drive (URL Pratinjau & URL Unduh Langsung) otomatis dicatat pada baris Google Sheets setiap kali berkas diupload atau diverifikasi.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENDPOINT CONFIG */}
          {activeTab === 'ENDPOINT' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs">
                    URL Endpoint Webhook Google Sheets & Drive
                  </label>
                  <span className="text-[10px] text-blue-600 font-mono font-bold">
                    *Tertanam Langsung di Coding
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
                    title="Salin URL"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
                    <span>{isTesting ? 'Menguji...' : 'Uji Koneksi (Ping)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer font-medium"
                    title="Kembalikan ke URL default coding"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Bawaan</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  Simpan Pengaturan
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold">{testResult.message}</div>
                    <div className="text-[10px] opacity-75 font-mono mt-0.5">
                      Waktu Pengujian: {testResult.timestamp}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GOOGLE APPS SCRIPT CODE */}
          {activeTab === 'SCRIPT' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Kode Script Google Drive Server + Spreadsheet (.gs):
                </span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-xs cursor-pointer shadow-xs"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Semua Kode'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 max-h-[300px] overflow-y-auto whitespace-pre leading-relaxed select-all">
                {GOOGLE_APPS_SCRIPT_TEMPLATE}
              </div>

              <div className="text-[11px] text-slate-600 bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-1">
                <div className="font-bold text-slate-800">Cara Memasang Script Server:</div>
                <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                  <li>Buat Folder di Google Drive sebagai <strong>Google Drive Induk Server</strong> dan salin Folder ID-nya.</li>
                  <li>Buka Google Sheets di <strong>sheets.new</strong> &gt; menu <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Tempel kode di atas dan masukkan Folder ID Google Drive Induk pada variabel <code>MASTER_FOLDER_ID</code>.</li>
                  <li>Klik <strong>Deploy &gt; New deployment &gt; Web app</strong> (Access: Anyone).</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: SYNC LOGS */}
          {activeTab === 'LOGS' && (
            <div className="space-y-3">
              {syncLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-1">
                  <Database className="w-8 h-8 mx-auto opacity-30" />
                  <div>Belum ada data transaksi yang dikirimkan.</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto">
                  {syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
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
                      <div className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 font-mono truncate">
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
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
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
