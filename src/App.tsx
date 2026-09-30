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
import {
  sendVerificationToGoogleSheet,
  sendUploadToGoogleDriveAndSheet,
} from './services/googleSheetsWebhook';
import { calculateRetention, formatArchiveSubfolder } from './utils/retentionUtils';

const STORAGE_KEY_DOCS = 'simverif_documents_db_v3';
const STORAGE_KEY_USERS = 'simverif_users_db_v3';
const STORAGE_KEY_CURRENT_USER = 'simverif_current_user_v3';
const STORAGE_KEY_FOLDER_REGISTRATIONS = 'simverif_folder_registrations_v1';

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

  // Current Logged In User Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window === 'undefined') return INITIAL_USER_ACCOUNTS[1]; // default to Dinas Pendidikan
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading session', e);
    }
    return INITIAL_USER_ACCOUNTS[1];
  });

  // Load persisted documents or fallback
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

  // Active OPD State (If Dinas, fixed to their OPD; if Verifikator, selectable)
  const [activeOpd, setActiveOpd] = useState<OPD>(() => {
    const initialOpdId = currentUser?.opdId || 'DISDIK';
    const found = OPD_LIST.find((o) => o.id === initialOpdId);
    return found || OPD_LIST[0];
  });

  // Active Verifier Profile
  const verifier: VerifierProfile =
    DEFAULT_VERIFIERS[activeOpd.id] || DEFAULT_VERIFIERS.DISKOMINFO;

  // Selected Document for Verification Workbench
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);

  // Responsive Mobile View Mode: 'VIEWER' | 'FORM' | 'LIST'
  const [mobileView, setMobileView] = useState<'VIEWER' | 'FORM' | 'LIST'>('VIEWER');

  // Modals
  const [isGoogleSheetOpen, setIsGoogleSheetOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState<boolean>(false);
  const [isFolderRegistrationOpen, setIsFolderRegistrationOpen] = useState<boolean>(false);

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

  // Synchronize Active OPD when User Logs in
  useEffect(() => {
    if (currentUser) {
      const userOpd = OPD_LIST.find((o) => o.id === currentUser.opdId);
      if (userOpd) {
        setActiveOpd(userOpd);
      }
    }
  }, [currentUser]);

  // Strict Document Isolation based on Active OPD
  useEffect(() => {
    const opdDocs = documents.filter((d) => d.opdId === activeOpd.id);
    if (opdDocs.length > 0) {
      if (!selectedDocument || selectedDocument.opdId !== activeOpd.id) {
        setSelectedDocument(opdDocs[0]);
      }
    } else {
      setSelectedDocument(null);
    }
  }, [activeOpd, documents]);

  // Login handler
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    const targetOpd = OPD_LIST.find((o) => o.id === user.opdId) || OPD_LIST[0];
    setActiveOpd(targetOpd);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Handle OPD Selection (Only allowed for Verifikator)
  const handleSelectOpd = (opd: OPD) => {
    if (currentUser?.role === 'DINAS_PEMOHON') return; // Strict lock for Dinas
    setActiveOpd(opd);
    const docsInOpd = documents.filter((d) => d.opdId === opd.id);
    if (docsInOpd.length > 0) {
      setSelectedDocument(docsInOpd[0]);
    } else {
      setSelectedDocument(null);
    }
  };

  // Handle document selection from list or ticker
  const handleSelectDocument = (doc: DocumentItem) => {
    // If Dinas, can only select their own documents
    if (currentUser?.role === 'DINAS_PEMOHON' && doc.opdId !== currentUser.opdId) {
      return;
    }

    if (doc.opdId !== activeOpd.id) {
      const targetOpd = OPD_LIST.find((o) => o.id === doc.opdId);
      if (targetOpd) {
        setActiveOpd(targetOpd);
      }
    }
    setSelectedDocument(doc);
    setMobileView('VIEWER');
  };

  // Handle document update from verification form
  const handleUpdateDocument = (updatedDoc: DocumentItem) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
    );
    setSelectedDocument(updatedDoc);
  };

  // Handle initial new document uploaded by Dinas
  const handleAddDocument = async (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocument(newDoc);
    setMobileView('VIEWER');

    // Automatically send to Google Drive Induk server & Google Sheet
    try {
      if (newDoc.versions[0]) {
        await sendUploadToGoogleDriveAndSheet(newDoc, newDoc.versions[0], 'UPLOAD_DOCUMENT');
      }
    } catch (e) {
      console.warn('Sync to Google Drive server note', e);
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
  // If Dinas: only ticker of their own documents
  // If Verifikator: all OPD documents
  const tickerDocuments =
    currentUser.role === 'DINAS_PEMOHON'
      ? documents.filter((d) => d.opdId === currentUser.opdId)
      : documents;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-blue-100 text-slate-800 flex flex-col font-sans selection:bg-blue-500/20">
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
      <div className="bg-white/90 backdrop-blur-md border-b border-blue-200/80 px-4 py-1.5 text-xs text-slate-600 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Pengguna Aktif:</span>
            <span className="font-bold text-blue-950">{currentUser.nama}</span>
            <span className="font-mono text-blue-600">(@{currentUser.username})</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-700 font-medium">{currentUser.opdName}</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            {currentUser.role === 'DINAS_PEMOHON' ? (
              <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-3 h-3 text-blue-600" />
                Akses Terisolasi: Hanya Dokumen {currentUser.opdName}
              </span>
            ) : (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Akses Verifikator: Seluruh Antrean Berkas OPD
              </span>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              Penyimpanan: {currentUser.driveFolderName}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet View Segmented Navigation */}
      <div className="lg:hidden bg-white/90 border-b border-blue-100 px-4 py-2 flex items-center justify-between gap-2 text-xs font-semibold shadow-xs">
        <div className="grid grid-cols-3 gap-1.5 w-full">
          <button
            onClick={() => setMobileView('LIST')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              mobileView === 'LIST'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-blue-50/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="truncate">Daftar Berkas</span>
          </button>

          <button
            onClick={() => setMobileView('VIEWER')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              mobileView === 'VIEWER'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-blue-50/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate">Pratinjau Dokumen</span>
          </button>

          <button
            onClick={() => setMobileView('FORM')}
            className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
              mobileView === 'FORM'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50/60'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span className="truncate">Form Pemeriksaan</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
          {/* COLUMN 1: OPD Documents List */}
          <div
            className={`lg:col-span-3 h-[calc(100vh-165px)] sticky top-20 flex-col ${
              mobileView === 'LIST' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <DocumentList
              documents={documents}
              selectedDocument={selectedDocument}
              onSelectDocument={handleSelectDocument}
              activeOpd={activeOpd}
              appRole={currentUser.role}
              onOpenRevisionModalForDoc={() => setIsRevisionOpen(true)}
            />
          </div>

          {/* COLUMN 2: Multi-format Document Viewer */}
          <div
            className={`lg:col-span-5 h-[calc(100vh-165px)] flex-col ${
              mobileView === 'VIEWER' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {selectedDocument ? (
              <DocumentViewer document={selectedDocument} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white/90 border border-blue-200/80 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
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
          <div
            className={`lg:col-span-4 h-[calc(100vh-165px)] flex-col ${
              mobileView === 'FORM' ? 'flex' : 'hidden lg:flex'
            }`}
          >
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
              <div className="h-full flex flex-col items-center justify-center bg-white/90 border border-blue-200/80 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
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
      </main>

      {/* Floating Action Button for Mobile/Tablet */}
      {selectedDocument && (
        <div className="lg:hidden fixed bottom-4 right-4 z-40">
          {mobileView === 'VIEWER' && (
            <button
              onClick={() => setMobileView('FORM')}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow-2xl text-xs transition-transform active:scale-95"
            >
              <FileCheck className="w-4 h-4" />
              <span>Buka Formulir</span>
            </button>
          )}
          {mobileView === 'FORM' && (
            <button
              onClick={() => setMobileView('VIEWER')}
              className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-full shadow-2xl text-xs border border-slate-700 transition-transform active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Lihat Dokumen</span>
            </button>
          )}
        </div>
      )}

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
        currentUser={currentUser}
        onSaveRegistration={handleSaveRegistration}
        onSaveAllRegistrations={handleSaveAllRegistrations}
      />
    </div>
  );
}
