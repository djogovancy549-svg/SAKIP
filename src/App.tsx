import { useState, useEffect } from 'react';
import {
  FileText,
  FileCheck,
  Building2,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  UploadCloud,
  History,
  Lock,
  Maximize2,
  Columns,
  Square,
  ArrowRight,
  ArrowLeft,
  Eye,
  CheckCircle2,
  LayoutGrid,
} from 'lucide-react';
import {
  DocumentItem,
  OPD,
  VerifierProfile,
  AppRole,
  DocumentVersion,
  UserAccount,
  OpdFolderRegistration,
} from './types';
import { INITIAL_DOCUMENTS } from './data/mockDocuments';
import { OPD_LIST, DEFAULT_VERIFIERS } from './data/opdData';
import { INITIAL_USER_ACCOUNTS } from './data/userData';
import { INITIAL_OPD_FOLDER_REGISTRATIONS } from './data/initialFolderRegistrations';
import { Header } from './components/Header';
import { RunningTicker } from './components/RunningTicker';
import { DocumentList } from './components/DocumentList';
import { DocumentViewer } from './components/DocumentViewer';
import { VerificationForm } from './components/VerificationForm';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { UploadDocumentModal } from './components/UploadDocumentModal';
import { UploadRevisionModal } from './components/UploadRevisionModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DriveFolderExplorerModal } from './components/DriveFolderExplorerModal';
import { AdminFolderRegistrationModal } from './components/AdminFolderRegistrationModal';
import { LoginScreen } from './components/LoginScreen';
import databaseBg from './assets/images/digital_database_modern_bg_1790734176384.jpg';
import {
  sendVerificationToGoogleSheet,
  sendUploadToGoogleDriveAndSheet,
} from './services/googleSheetsWebhook';
import { calculateRetention, formatArchiveSubfolder } from './utils/retentionUtils';

const STORAGE_KEY_DOCS = 'simverif_clean_docs_v5';
const STORAGE_KEY_USERS = 'simverif_clean_users_v5';
const STORAGE_KEY_CURRENT_USER = 'simverif_clean_session_v5';
const STORAGE_KEY_FOLDER_REGISTRATIONS = 'simverif_clean_folder_registrations_v5';
const STORAGE_KEY_LAYOUT_MODE = 'simverif_layout_mode_v2';

export default function App() {
  // Folder Registrations State (Registered and managed by Admin for each Dinas)
  const [folderRegistrations, setFolderRegistrations] = useState<Record<string, OpdFolderRegistration>>(() => {
    if (typeof window === 'undefined') return INITIAL_OPD_FOLDER_REGISTRATIONS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FOLDER_REGISTRATIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading folder registrations', e);
    }
    return INITIAL_OPD_FOLDER_REGISTRATIONS;
  });

  // User Accounts State (Stored in localStorage, with passwords that can be changed)
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    if (typeof window === 'undefined') return INITIAL_USER_ACCOUNTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading users', e);
    }
    return INITIAL_USER_ACCOUNTS;
  });

  // Current Logged In User Session (Defaults to Master Admin)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window === 'undefined') return INITIAL_USER_ACCOUNTS[0];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading session', e);
    }
    return INITIAL_USER_ACCOUNTS[0];
  });

  // Load persisted documents or fallback to empty array
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    if (typeof window === 'undefined') return INITIAL_DOCUMENTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DOCS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading documents from storage', e);
    }
    return INITIAL_DOCUMENTS;
  });

  // Active OPD State
  const [activeOpd, setActiveOpd] = useState<OPD>(() => {
    const initialOpdId = currentUser?.opdId || 'DISKOMINFO';
    const found = OPD_LIST.find((o) => o.id === initialOpdId);
    return found || OPD_LIST[0];
  });

  // Active Verifier Profile
  const verifier: VerifierProfile =
    DEFAULT_VERIFIERS[activeOpd.id] || DEFAULT_VERIFIERS.DISKOMINFO;

  // Selected Document for Verification Workbench (Starts as null in clean state)
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

  // Layout Display Mode: 'SINGLE' (Satu per satu - Jauh Lebih Besar) vs 'SPLIT' (3 Kolom Sekaligus)
  const [layoutMode, setLayoutMode] = useState<'SINGLE' | 'SPLIT'>(() => {
    if (typeof window === 'undefined') return 'SINGLE';
    const saved = localStorage.getItem(STORAGE_KEY_LAYOUT_MODE);
    return saved === 'SPLIT' ? 'SPLIT' : 'SINGLE';
  });

  // Active View Tab when in 'SINGLE' mode: 'LIST' | 'VIEWER' | 'FORM'
  const [activeView, setActiveView] = useState<'LIST' | 'VIEWER' | 'FORM'>('LIST');

  // Modals
  const [isGoogleSheetOpen, setIsGoogleSheetOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState<boolean>(false);
  const [isFolderRegistrationOpen, setIsFolderRegistrationOpen] = useState<boolean>(false);

  // Persist layout mode
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LAYOUT_MODE, layoutMode);
    } catch (e) {
      console.error('Failed to save layout mode', e);
    }
  }, [layoutMode]);

  // Persist folder registrations
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDER_REGISTRATIONS, JSON.stringify(folderRegistrations));
    } catch (e) {
      console.error('Failed to save folder registrations', e);
    }
  }, [folderRegistrations]);

  // Persist documents
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save documents', e);
    }
  }, [documents]);

  // Persist users
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(userAccounts));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  }, [userAccounts]);

  // Persist current session
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      }
    } catch (e) {
      console.error('Failed to save session', e);
    }
  }, [currentUser]);

  // Handle Login
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    const userOpd = OPD_LIST.find((o) => o.id === user.opdId) || OPD_LIST[0];
    setActiveOpd(userOpd);

    // Pick first document: if Verifier, pick any available document, else pick OPD-specific document
    if (user.role === 'VERIFIKATOR') {
      if (documents.length > 0) {
        setSelectedDocument(documents[0]);
      } else {
        setSelectedDocument(null);
      }
    } else {
      const opdDocs = documents.filter((d) => d.opdId === userOpd.id);
      if (opdDocs.length > 0) {
        setSelectedDocument(opdDocs[0]);
      } else {
        setSelectedDocument(null);
      }
    }
    setActiveView('LIST');
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedDocument(null);
  };

  // Handle OPD Selection by Verifier
  const handleSelectOpd = (opd: OPD) => {
    setActiveOpd(opd);
    // Find documents belonging to selected OPD
    const opdDocs = documents.filter((doc) => doc.opdId === opd.id);
    if (opdDocs.length > 0) {
      setSelectedDocument(opdDocs[0]);
    } else {
      setSelectedDocument(null);
    }
  };

  // Handle Document Selection
  const handleSelectDocument = (doc: DocumentItem) => {
    setSelectedDocument(doc);
    // Auto switch to Viewer when selecting a document in Single View mode
    if (layoutMode === 'SINGLE') {
      setActiveView('VIEWER');
    }
  };

  // Handle Document Update from Verification Form
  const handleUpdateDocument = (updatedDoc: DocumentItem) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
    );
    setSelectedDocument(updatedDoc);
  };

  // Handle New Document Upload by Dinas
  const handleAddDocument = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocument(newDoc);
    if (layoutMode === 'SINGLE') {
      setActiveView('VIEWER');
    }
  };

  // Handle Dinas re-uploading revised document
  const handleUploadRevision = async (docId: string, newVersion: DocumentVersion) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;

    const updatedDoc: DocumentItem = {
      ...targetDoc,
      currentVersion: newVersion.versionNumber,
      fileName: newVersion.fileName,
      status: 'PENDING',
      versions: [...targetDoc.versions, newVersion],
    };

    setDocuments((prev) => prev.map((d) => (d.id === docId ? updatedDoc : d)));
    setSelectedDocument(updatedDoc);

    try {
      await sendUploadToGoogleDriveAndSheet(updatedDoc, newVersion, 'UPLOAD_REVISION');
    } catch (e) {
      console.warn('Webhook logging note for revision upload', e);
    }
  };

  // Handle password updated
  const handlePasswordUpdated = (updatedUser: UserAccount) => {
    setUserAccounts((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    setCurrentUser(updatedUser);
  };

  // Handle adding a new Dinas user account by Admin
  const handleAddUserAccount = (newUser: UserAccount) => {
    setUserAccounts((prev) => {
      const filtered = prev.filter((u) => u.username.toLowerCase() !== newUser.username.toLowerCase());
      return [...filtered, newUser];
    });
  };

  // Handle purging drafts older than 3 months (90 days)
  const handlePurgeOldDrafts = (purgedVersionKeys: string[]) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) => {
        const remainingVersions = doc.versions.filter(
          (ver) => !purgedVersionKeys.includes(`${doc.id}-v${ver.versionNumber}`)
        );
        return {
          ...doc,
          versions: remainingVersions.length > 0 ? remainingVersions : doc.versions,
        };
      })
    );
  };

  // Handle saving registered folder link for an OPD by Admin
  const handleSaveRegistration = (reg: OpdFolderRegistration) => {
    setFolderRegistrations((prev) => ({
      ...prev,
      [reg.opdId]: reg,
    }));

    // Update user accounts belonging to this OPD with the registered folder info
    setUserAccounts((prevUsers) =>
      prevUsers.map((u) => {
        if (u.opdId === reg.opdId) {
          return {
            ...u,
            driveFolderUrl: reg.driveFolderUrl,
            driveFolderId: reg.driveFolderId,
            driveFolderName: reg.driveFolderName,
          };
        }
        return u;
      })
    );

    // If current logged-in user is from this OPD, update active session immediately
    if (currentUser && currentUser.opdId === reg.opdId) {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              driveFolderUrl: reg.driveFolderUrl,
              driveFolderId: reg.driveFolderId,
              driveFolderName: reg.driveFolderName,
            }
          : null
      );
    }
  };

  // Handle saving all folder registrations at once by Admin
  const handleSaveAllRegistrations = (allRegs: Record<string, OpdFolderRegistration>) => {
    setFolderRegistrations(allRegs);

    setUserAccounts((prevUsers) =>
      prevUsers.map((u) => {
        const reg = allRegs[u.opdId];
        if (reg) {
          return {
            ...u,
            driveFolderUrl: reg.driveFolderUrl,
            driveFolderId: reg.driveFolderId,
            driveFolderName: reg.driveFolderName,
          };
        }
        return u;
      })
    );

    if (currentUser && allRegs[currentUser.opdId]) {
      const reg = allRegs[currentUser.opdId];
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              driveFolderUrl: reg.driveFolderUrl,
              driveFolderId: reg.driveFolderId,
              driveFolderName: reg.driveFolderName,
            }
          : null
      );
    }
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return (
      <LoginScreen
        userAccounts={userAccounts}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Filter documents shown in running ticker:
  const tickerDocuments =
    currentUser.role === 'DINAS_PEMOHON'
      ? documents.filter((d) => d.opdId === currentUser.opdId)
      : documents;

  const currentOpdDocsCount = documents.filter((d) => d.opdId === activeOpd.id).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-blue-500/20 relative">
      {/* Clean Solid Subtle Gradient Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-slate-50 via-slate-100 to-blue-50/40" aria-hidden="true" />

      {/* Top Bar with User Info, Password Trigger, and Logout */}
      <Header
        activeOpd={activeOpd}
        onSelectOpd={handleSelectOpd}
        currentUser={currentUser}
        onOpenGoogleSheetModal={() => setIsGoogleSheetOpen(true)}
        onOpenUploadModal={() => setIsUploadOpen(true)}
        onOpenChangePasswordModal={() => setIsChangePasswordOpen(true)}
        onOpenDriveExplorer={() => setIsDriveExplorerOpen(true)}
        onOpenAdminFolderRegistration={() => setIsFolderRegistrationOpen(true)}
        onLogout={handleLogout}
      />

      {/* Running Data Ticker ("Data Berjalan") */}
      <RunningTicker
        documents={tickerDocuments}
        onSelectDocument={handleSelectDocument}
      />

      {/* Role Notice & Security Banner */}
      <div className="bg-white border-b border-slate-300 px-4 py-1.5 text-xs text-slate-900 shadow-xs relative z-10 font-bold">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">Pengguna Aktif:</span>
            <span className="font-black text-blue-950">{currentUser.nama}</span>
            <span className="font-mono text-blue-700 font-bold">(@{currentUser.username})</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-950 font-bold">{currentUser.opdName}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            {currentUser.role === 'DINAS_PEMOHON' ? (
              <span className="text-blue-950 bg-blue-50 border border-blue-300 px-2.5 py-0.5 rounded flex items-center gap-1 font-bold">
                <Lock className="w-3 h-3 text-blue-700" />
                Akses Terisolasi: Dokumen {currentUser.opdName}
              </span>
            ) : (
              <span className="text-emerald-950 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Akses Admin Verifikator: Seluruh Antrean Berkas OPD
              </span>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-slate-800 font-bold">
              Folder Drive: {currentUser.driveFolderName}
            </span>
          </div>
        </div>
      </div>

      {/* Top View Navigation & Layout Mode Switcher Bar */}
      <div className="bg-white border-b-2 border-slate-300 sticky top-16 z-30 px-3 sm:px-6 py-2 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Main 3 Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {/* Tab 1: Daftar Berkas */}
            <button
              onClick={() => setActiveView('LIST')}
              className={`py-2 px-3 sm:px-4 rounded-xl flex items-center gap-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeView === 'LIST'
                  ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-500/40'
                  : 'text-slate-900 hover:bg-slate-100 bg-slate-50 border border-slate-300 shadow-2xs'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>1. Daftar Berkas OPD</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                  activeView === 'LIST' ? 'bg-white text-blue-800' : 'bg-blue-100 text-blue-900 border border-blue-200'
                }`}
              >
                {currentOpdDocsCount}
              </span>
            </button>

            {/* Tab 2: Pratinjau Dokumen (Penampil Besar) */}
            <button
              onClick={() => setActiveView('VIEWER')}
              className={`py-2 px-3 sm:px-4 rounded-xl flex items-center gap-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeView === 'VIEWER'
                  ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-500/40'
                  : 'text-slate-900 hover:bg-slate-100 bg-slate-50 border border-slate-300 shadow-2xs'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>2. Penampil Dokumen (Lebar &amp; Jelas)</span>
              {selectedDocument && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono truncate max-w-[100px] hidden md:inline font-bold ${
                    activeView === 'VIEWER' ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-900'
                  }`}
                >
                  v{selectedDocument.currentVersion}
                </span>
              )}
            </button>

            {/* Tab 3: Formulir & Lembar Verifikasi */}
            <button
              onClick={() => setActiveView('FORM')}
              className={`py-2 px-3 sm:px-4 rounded-xl flex items-center gap-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeView === 'FORM'
                  ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-500/40'
                  : 'text-slate-900 hover:bg-slate-100 bg-slate-50 border border-slate-300 shadow-2xs'
              }`}
            >
              <FileCheck className="w-4 h-4 shrink-0" />
              <span>
                {currentUser.role === 'VERIFIKATOR'
                  ? '3. Lembar Verifikasi & Pengesahan (Admin)'
                  : '3. Informasi Status & Catatan Verifikasi'}
              </span>
              {selectedDocument && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-mono font-bold ${
                    selectedDocument.status === 'APPROVED'
                      ? 'bg-emerald-600 text-white'
                      : selectedDocument.status === 'REVISION'
                      ? 'bg-amber-600 text-white'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {selectedDocument.status === 'APPROVED' ? 'SAH' : selectedDocument.status === 'REVISION' ? 'REVISI' : 'PERIKSA'}
                </span>
              )}
            </button>
          </div>

          {/* Mode Tampilan Switcher (Satu per satu vs 3 Kolom) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-white/50 backdrop-blur-md p-1 rounded-xl border border-white/60 text-xs font-medium">
            <span className="text-[11px] text-slate-700 font-semibold px-2">Mode Tampilan:</span>
            <button
              onClick={() => setLayoutMode('SINGLE')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                layoutMode === 'SINGLE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
              }`}
              title="Tampilkan Satu per Satu (Layar Penuh, Dokumen & Formulir Jauh Lebih Besar)"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Satu per Satu (Besar)</span>
            </button>
            <button
              onClick={() => setLayoutMode('SPLIT')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                layoutMode === 'SPLIT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
              }`}
              title="Tampilkan 3 Kolom Sekaligus Berdampingan"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>3 Kolom (Split)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-4">
        {/* MODE 1: SINGLE VIEW (SATU PER SATU - LEBIH BESAR & LEGA) */}
        {layoutMode === 'SINGLE' ? (
          <div className="w-full flex-1 flex flex-col">
            {/* VIEW 1: DAFTAR BERKAS */}
            {activeView === 'LIST' && (
              <div className="w-full min-h-[650px] h-[calc(100vh-210px)] flex flex-col animate-in fade-in duration-150">
                <DocumentList
                  documents={documents}
                  selectedDocument={selectedDocument}
                  onSelectDocument={handleSelectDocument}
                  activeOpd={activeOpd}
                  appRole={currentUser.role}
                  onOpenRevisionModalForDoc={() => setIsRevisionOpen(true)}
                  onSelectOpd={handleSelectOpd}
                  onOpenUploadModal={() => setIsUploadOpen(true)}
                />
              </div>
            )}

            {/* VIEW 2: PENAMPIL DOKUMEN (BESAR & LEBAR) */}
            {activeView === 'VIEWER' && (
              <div className="w-full min-h-[650px] h-[calc(100vh-210px)] flex flex-col animate-in fade-in duration-150 space-y-2">
                {selectedDocument ? (
                  <>
                    <div className="flex-1 min-h-0">
                      <DocumentViewer document={selectedDocument} />
                    </div>

                    {/* Quick View Step Navigation Bar */}
                    <div className="bg-white/85 backdrop-blur-md border border-white/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
                      <button
                        onClick={() => setActiveView('LIST')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100/90 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                        <span>Kembali ke Daftar Berkas</span>
                      </button>

                      <div className="text-xs text-center hidden md:block">
                        <span className="text-slate-500">Sedang melihat: </span>
                        <strong className="text-blue-950 font-bold">{selectedDocument.fileName}</strong>
                        <span className="text-slate-400 ml-1">({selectedDocument.nomorBerkas})</span>
                      </div>

                      <button
                        onClick={() => setActiveView('FORM')}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                      >
                        <span>Lanjut ke Formulir Pemeriksaan &amp; Verifikasi</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-white/85 backdrop-blur-xl border border-white/80 rounded-2xl p-8 text-center text-slate-500 shadow-lg min-h-[450px]">
                    <FileText className="w-14 h-14 mb-3 text-blue-500/50" />
                    <h3 className="text-base font-bold text-slate-800 mb-1">
                      Tidak Ada Dokumen Dipilih
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                      Silakan pilih dokumen dari antrean {activeOpd.name} pada tab Daftar Berkas.
                    </p>
                    <button
                      onClick={() => setActiveView('LIST')}
                      className="px-5 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                    >
                      Buka Daftar Berkas
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 3: FORMULIR & LEMBAR KERJA VERIFIKASI (UKURAN PENUH) */}
            {activeView === 'FORM' && (
              <div className="w-full min-h-[650px] h-[calc(100vh-210px)] flex flex-col animate-in fade-in duration-150 space-y-2">
                {selectedDocument ? (
                  <>
                    <div className="flex-1 min-h-0">
                      <VerificationForm
                        document={selectedDocument}
                        verifier={verifier}
                        appRole={currentUser.role}
                        onUpdateDocument={handleUpdateDocument}
                        onOpenGoogleSheetModal={() => setIsGoogleSheetOpen(true)}
                        onOpenRevisionModal={() => setIsRevisionOpen(true)}
                      />
                    </div>

                    {/* Navigation Bar at Bottom */}
                    <div className="bg-white/95 border border-blue-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                      <button
                        onClick={() => setActiveView('VIEWER')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-blue-200"
                      >
                        <ArrowLeft className="w-4 h-4 text-blue-600" />
                        <span>Lihat Penampil Dokumen (Viewer Besar)</span>
                      </button>

                      <button
                        onClick={() => setActiveView('LIST')}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <Layers className="w-4 h-4 text-slate-500" />
                        <span>Ke Daftar Berkas</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-white border border-blue-200/80 rounded-2xl p-8 text-center text-slate-500 shadow-sm min-h-[450px]">
                    <FileCheck className="w-14 h-14 mb-3 text-blue-500/40" />
                    <h3 className="text-base font-bold text-slate-800 mb-1">
                      Formulir Pemeriksaan Siap
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                      Pilih berkas dari tab Daftar Berkas untuk memulai proses checklist dan verifikasi resmi.
                    </p>
                    <button
                      onClick={() => setActiveView('LIST')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
                    >
                      Buka Daftar Berkas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* MODE 2: SPLIT VIEW (3 KOLOM BERDAMPINGAN) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
            {/* COLUMN 1: OPD Documents List */}
            <div className="lg:col-span-3 h-[calc(100vh-190px)] sticky top-28 flex flex-col">
              <DocumentList
                documents={documents}
                selectedDocument={selectedDocument}
                onSelectDocument={handleSelectDocument}
                activeOpd={activeOpd}
                appRole={currentUser.role}
                onOpenRevisionModalForDoc={() => setIsRevisionOpen(true)}
                onSelectOpd={handleSelectOpd}
                onOpenUploadModal={() => setIsUploadOpen(true)}
              />
            </div>

            {/* COLUMN 2: Multi-format Document Viewer */}
            <div className="lg:col-span-5 h-[calc(100vh-190px)] flex flex-col">
              {selectedDocument ? (
                <DocumentViewer document={selectedDocument} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-white border border-blue-200/80 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
                  <FileText className="w-12 h-12 mb-3 opacity-40 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    Tidak Ada Dokumen Dipilih
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Pilih dokumen dari antrean {activeOpd.name} di panel kiri atau unggah berkas baru.
                  </p>
                </div>
              )}
            </div>

            {/* COLUMN 3: Dedicated Examination & Verification Form */}
            <div className="lg:col-span-4 h-[calc(100vh-190px)] flex flex-col">
              {selectedDocument ? (
                <VerificationForm
                  document={selectedDocument}
                  verifier={verifier}
                  appRole={currentUser.role}
                  onUpdateDocument={handleUpdateDocument}
                  onOpenGoogleSheetModal={() => setIsGoogleSheetOpen(true)}
                  onOpenRevisionModal={() => setIsRevisionOpen(true)}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-white border border-blue-200/80 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
                  <FileCheck className="w-12 h-12 mb-3 opacity-40 text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    Formulir Pemeriksaan Siap
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Pilih salah satu berkas dokumen untuk memulai checklist pemeriksaan dan verifikasi resmi.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <GoogleSheetModal
        isOpen={isGoogleSheetOpen}
        onClose={() => setIsGoogleSheetOpen(false)}
      />

      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        activeOpd={activeOpd}
        onAddDocument={handleAddDocument}
      />

      <UploadRevisionModal
        isOpen={isRevisionOpen}
        onClose={() => setIsRevisionOpen(false)}
        document={selectedDocument}
        onUploadRevision={handleUploadRevision}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentUser={currentUser}
        onPasswordUpdated={handlePasswordUpdated}
      />

      <DriveFolderExplorerModal
        isOpen={isDriveExplorerOpen}
        onClose={() => setIsDriveExplorerOpen(false)}
        documents={documents}
        currentUser={currentUser}
        folderRegistrations={folderRegistrations}
        onSelectDocument={handleSelectDocument}
        onPurgeOldDrafts={handlePurgeOldDrafts}
        onOpenAdminFolderRegistration={() => setIsFolderRegistrationOpen(true)}
      />

      <AdminFolderRegistrationModal
        isOpen={isFolderRegistrationOpen}
        onClose={() => setIsFolderRegistrationOpen(false)}
        opdList={OPD_LIST}
        folderRegistrations={folderRegistrations}
        userAccounts={userAccounts}
        currentUser={currentUser}
        onSaveRegistration={handleSaveRegistration}
        onSaveAllRegistrations={handleSaveAllRegistrations}
        onAddUserAccount={handleAddUserAccount}
      />
    </div>
  );
}
