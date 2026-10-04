import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  FileCheck,
  Building2,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronDown,
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
  Database,
  ExternalLink,
  HardDrive,
  X,
  Activity,
  PlusCircle,
} from 'lucide-react';
import {
  DocumentItem,
  OPD,
  VerifierProfile,
  AppRole,
  DocumentVersion,
  UserAccount,
  OpdFolderRegistration,
  NotificationItem,
  NotificationType,
} from './types';
import { INITIAL_DOCUMENTS } from './data/mockDocuments';
import { OPD_LIST, DEFAULT_VERIFIERS } from './data/opdData';
import { INITIAL_USER_ACCOUNTS } from './data/userData';
import { INITIAL_OPD_FOLDER_REGISTRATIONS } from './data/initialFolderRegistrations';
import { INITIAL_NOTIFICATIONS } from './data/initialNotifications';
import { Header } from './components/Header';
import { RunningTicker } from './components/RunningTicker';
import { DocumentList } from './components/DocumentList';
import { DocumentViewer } from './components/DocumentViewer';
import { GoogleSheetModal } from './components/GoogleSheetModal';
import { UploadDocumentModal } from './components/UploadDocumentModal';
import { UploadRevisionModal } from './components/UploadRevisionModal';
import { EditDocumentModal } from './components/EditDocumentModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { DriveFolderExplorerModal } from './components/DriveFolderExplorerModal';
import { AdminFolderRegistrationModal } from './components/AdminFolderRegistrationModal';
import { NotificationModal, NotificationToast } from './components/NotificationModal';
import { LoginScreen } from './components/LoginScreen';
import databaseBg from './assets/images/digital_database_modern_bg_1790734176384.jpg';
import {
  sendVerificationToGoogleSheet,
  sendUploadToGoogleDriveAndSheet,
  fetchDatabaseFromGoogleSheet,
  setGlobalWebhookUrl,
  setGlobalDriveFolderId,
  getGoogleSheetsWebhookUrl,
  saveGoogleSheetsWebhookUrl,
  getGoogleDriveFolderId,
  getGoogleDriveFolderUrl,
  getGoogleSpreadsheetUrl,
  sendFolderRegistrationToGoogleSheet,
  sendAllFolderRegistrationsToGoogleSheet,
  sendUserRegistrationToGoogleSheet,
} from './services/googleSheetsWebhook';
import { calculateRetention, formatArchiveSubfolder } from './utils/retentionUtils';

const STORAGE_KEY_DOCS = 'simverif_clean_docs_v5';
const STORAGE_KEY_USERS = 'simverif_clean_users_v5';
const STORAGE_KEY_CURRENT_USER = 'simverif_clean_session_v5';
const STORAGE_KEY_FOLDER_REGISTRATIONS = 'simverif_clean_folder_registrations_v5';
const STORAGE_KEY_NOTIFICATIONS = 'simverif_notifications_v1';
const STORAGE_KEY_LAYOUT_MODE = 'simverif_layout_mode_v2';

export default function App() {
  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (typeof window === 'undefined') return INITIAL_NOTIFICATIONS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading notifications', e);
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  // Helper to trigger a new notification for OPD or Admin
  const addNotification = (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotif: NotificationItem = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast(newNotif);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleSelectDocumentById = (docId: string) => {
    const found = documents.find((d) => d.id === docId);
    if (found) {
      setSelectedDocument(found);
      setActiveView('VIEWER');
    }
  };
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

  // Auto-sync folder registrations to user accounts & current user session
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDER_REGISTRATIONS, JSON.stringify(folderRegistrations));
      setUserAccounts((prevUsers) =>
        prevUsers.map((u) => {
          const reg = folderRegistrations[u.opdId];
          if (reg && reg.driveFolderUrl) {
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
      if (currentUser) {
        const reg = folderRegistrations[currentUser.opdId];
        if (reg && reg.driveFolderUrl) {
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
      }
    } catch (e) {
      console.error('Failed to sync folder registrations', e);
    }
  }, [folderRegistrations]);

  // User Accounts State (Stored in localStorage, with passwords that can be changed)
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    if (typeof window === 'undefined') return INITIAL_USER_ACCOUNTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        const filtered = parsed.filter((u: UserAccount) => u.username.toLowerCase() !== 'deni');
        return filtered;
      }
    } catch (e) {
      console.error('Error loading users', e);
    }
    return INITIAL_USER_ACCOUNTS;
  });

  // Current Logged In User Session (Always starts at Login Screen)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      } catch (e) {}
    }
    return null;
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
  const [isViewDropdownOpen, setIsViewDropdownOpen] = useState<boolean>(false);
  const viewDropdownRef = useRef<HTMLDivElement>(null);

  // Close view dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target as Node)) {
        setIsViewDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals
  const [isGoogleSheetOpen, setIsGoogleSheetOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isRevisionOpen, setIsRevisionOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editingDocument, setEditingDocument] = useState<DocumentItem | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isDriveExplorerOpen, setIsDriveExplorerOpen] = useState<boolean>(false);
  const [isFolderRegistrationOpen, setIsFolderRegistrationOpen] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    docNumber: string;
    title: string;
    opdName: string;
    timestamp: string;
    sheetUrl: string;
    driveFolderUrl: string;
  } | null>(null);

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

  // Real-time synchronization across browser tabs and windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_DOCS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDocuments(parsed);
        } catch (err) {
          console.error('Failed to parse updated documents from storage', err);
        }
      }
      if (e.key === STORAGE_KEY_USERS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setUserAccounts(parsed);
        } catch (err) {
          console.error('Failed to parse updated users from storage', err);
        }
      }
      if (e.key === STORAGE_KEY_FOLDER_REGISTRATIONS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setFolderRegistrations(parsed);
        } catch (err) {
          console.error('Failed to parse updated folder registrations', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Directly synchronize with Google Sheet & Google Drive Database
  const syncWithGoogleSheet = async () => {
    setIsSyncing(true);
    try {
      const data = await fetchDatabaseFromGoogleSheet();
      if (data) {
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
          setSelectedDocument((prev) => {
            if (prev) {
              const updated = data.documents.find((docItem) => docItem.id === prev.id);
              return updated || data.documents[0];
            }
            return data.documents[0];
          });
        }
        if (data.users && data.users.length > 0) {
          setUserAccounts((prev) => {
            const merged = [...prev];
            data.users.forEach((nu) => {
              const idx = merged.findIndex((u) => u.username === nu.username);
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...nu };
              } else {
                merged.push(nu);
              }
            });
            return merged;
          });
        }
        if (data.folders && data.folders.length > 0) {
          const record: Record<string, OpdFolderRegistration> = {};
          data.folders.forEach((reg) => {
            if (reg.opdId) {
              record[reg.opdId] = reg;
            }
          });
          setFolderRegistrations(record);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat sinkronisasi database dari Google Sheet:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Run initial sync on mount and set up periodic auto-sync
  useEffect(() => {
    syncWithGoogleSheet();

    // Periodic auto-sync every 20 seconds so user and admin dashboards stay connected
    const interval = setInterval(() => {
      syncWithGoogleSheet();
    }, 20000);

    // Sync immediately when user refocuses or switches back to the tab
    const handleFocus = () => {
      syncWithGoogleSheet();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

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

    // Notify the OPD regarding the verification status decision
    let notifType: NotificationType = 'SYSTEM';
    let title = '📋 Pembaruan Status Verifikasi';
    let message = `Dokumen "${updatedDoc.judul}" telah diperbarui oleh Admin Verifikator.`;

    if (updatedDoc.status === 'APPROVED') {
      notifType = 'VERIFICATION_APPROVED';
      title = '✅ Dokumen Disetujui & Disahkan';
      message = `Dokumen "${updatedDoc.judul}" telah disetujui dan disahkan secara resmi oleh Admin Verifikator.`;
    } else if (updatedDoc.status === 'REJECTED') {
      notifType = 'VERIFICATION_REJECTED';
      title = '❌ Dokumen Ditolak';
      message = `Dokumen "${updatedDoc.judul}" telah ditolak. Mohon periksa lembar catatan verifikasi.`;
    } else if (updatedDoc.status === 'REVISION') {
      notifType = 'VERIFICATION_REVISION_NEEDED';
      title = '⚠️ Perlu Perbaikan Berkas';
      message = `Dokumen "${updatedDoc.judul}" memerlukan perbaikan/revisi dari dinas Anda.`;
    }

    addNotification({
      title,
      message,
      type: notifType,
      targetRole: 'DINAS_PEMOHON',
      targetOpdId: updatedDoc.opdId,
      docId: updatedDoc.id,
      docNumber: updatedDoc.nomorBerkas,
      senderName: currentUser?.nama || 'Admin Verifikator',
      senderOpd: 'Sekretariat Daerah / Admin',
    });
  };

  // Handle New Document Upload by Dinas
  const handleAddDocument = async (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocument(newDoc);
    if (layoutMode === 'SINGLE') {
      setActiveView('VIEWER');
    }

    // Notify Admin / Verifikator regarding new document submission
    addNotification({
      title: '📄 Pengajuan Dokumen Baru',
      message: `${newDoc.opdName} telah mengunggah berkas baru "${newDoc.judul}".`,
      type: 'NEW_UPLOAD',
      targetRole: 'VERIFIKATOR',
      docId: newDoc.id,
      docNumber: newDoc.nomorBerkas,
      senderName: newDoc.pemohon.nama,
      senderOpd: newDoc.opdName,
    });

    // Instantly transmit uploaded document file base64 & metadata to Google Drive Folder & Sheet Webhook
    const firstVer = newDoc.versions[0];
    if (firstVer) {
      try {
        const opdFolderReg = folderRegistrations[newDoc.opdId]?.driveFolderId || currentUser?.driveFolderId;
        await sendUploadToGoogleDriveAndSheet(
          newDoc,
          firstVer,
          'UPLOAD_DOCUMENT',
          opdFolderReg
        );
      } catch (e) {
        console.warn('Google Drive transmission log note:', e);
      }
    }

    setUploadFeedback({
      docNumber: newDoc.nomorBerkas,
      title: newDoc.judul,
      opdName: newDoc.opdName,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      sheetUrl: getGoogleSpreadsheetUrl(),
      driveFolderUrl: getGoogleDriveFolderUrl(),
    });
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

    // Notify Admin regarding revision upload
    addNotification({
      title: `🔄 Pengajuan Revisi v${newVersion.versionNumber}`,
      message: `${updatedDoc.opdName} telah mengunggah revisi v${newVersion.versionNumber} untuk "${updatedDoc.judul}".`,
      type: 'REVISION_UPLOAD',
      targetRole: 'VERIFIKATOR',
      docId: updatedDoc.id,
      docNumber: updatedDoc.nomorBerkas,
      senderName: newVersion.uploadedBy,
      senderOpd: updatedDoc.opdName,
    });

    try {
      const opdFolderReg = folderRegistrations[updatedDoc.opdId]?.driveFolderId || currentUser?.driveFolderId;
      await sendUploadToGoogleDriveAndSheet(
        updatedDoc,
        newVersion,
        'UPLOAD_REVISION',
        opdFolderReg
      );
    } catch (e) {
      console.warn('Webhook logging note for revision upload', e);
    }

    setUploadFeedback({
      docNumber: updatedDoc.nomorBerkas,
      title: `Revisi v${newVersion.versionNumber} - ${updatedDoc.judul}`,
      opdName: updatedDoc.opdName,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      sheetUrl: getGoogleSpreadsheetUrl(),
      driveFolderUrl: getGoogleDriveFolderUrl(),
    });
  };

  // Handle Edit Document Open
  const handleOpenEditModal = (doc: DocumentItem) => {
    setEditingDocument(doc);
    setIsEditOpen(true);
  };

  // Handle Save Edit Document
  const handleSaveEditDocument = async (updatedDoc: DocumentItem) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
    );
    if (selectedDocument?.id === updatedDoc.id) {
      setSelectedDocument(updatedDoc);
    }
    addNotification({
      title: '✏️ Berkas Diperbarui',
      message: `Data berkas "${updatedDoc.nomorBerkas} - ${updatedDoc.judul}" berhasil diperbarui.`,
      type: 'SYSTEM',
      targetRole: 'DINAS_PEMOHON',
      targetOpdId: updatedDoc.opdId,
      docId: updatedDoc.id,
      docNumber: updatedDoc.nomorBerkas,
      senderName: currentUser?.nama || 'Pengguna',
      senderOpd: activeOpd.name,
    });
  };

  // Handle Delete Document
  const handleDeleteDocument = async (docId: string) => {
    const target = documents.find((d) => d.id === docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (selectedDocument?.id === docId) {
      const remaining = documents.filter((d) => d.id !== docId);
      setSelectedDocument(remaining.length > 0 ? remaining[0] : null);
    }
    if (target) {
      addNotification({
        title: '🗑️ Berkas Dihapus',
        message: `Berkas "${target.nomorBerkas} - ${target.judul}" telah dihapus dari sistem.`,
        type: 'SYSTEM',
        targetRole: 'VERIFIKATOR',
        docId,
        docNumber: target.nomorBerkas,
        senderName: currentUser?.nama || 'Pengguna',
        senderOpd: activeOpd.name,
      });
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
  const handleAddUserAccount = async (newUser: UserAccount) => {
    if (!currentUser) return;
    setUserAccounts((prev) => {
      const filtered = prev.filter((u) => u.username.toLowerCase() !== newUser.username.toLowerCase());
      return [...filtered, newUser];
    });

    // Directly Transmit to Google Sheet (DATABASE_PENGGUNA)
    try {
      await sendUserRegistrationToGoogleSheet(newUser, currentUser);
    } catch (e) {
      console.warn('Google Sheet user registration sync note:', e);
    }
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
  const handleSaveRegistration = async (reg: OpdFolderRegistration) => {
    if (!currentUser) return;
    setFolderRegistrations((prev) => ({
      ...prev,
      [reg.opdId]: reg,
    }));

    // Directly Transmit to Google Sheet Webhook (MAPPING_FOLDER_OPD)
    try {
      await sendFolderRegistrationToGoogleSheet(reg, currentUser);
    } catch (e) {
      console.warn('Google Sheet folder registration sync note:', e);
    }

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
  const handleSaveAllRegistrations = async (allRegs: Record<string, OpdFolderRegistration>) => {
    if (!currentUser) return;
    setFolderRegistrations(allRegs);

    // Directly Transmit to Google Sheet Webhook (MAPPING_FOLDER_OPD)
    try {
      const regArray = Object.values(allRegs);
      await sendAllFolderRegistrationsToGoogleSheet(regArray, currentUser);
    } catch (e) {
      console.warn('Google Sheet batch folder registration sync note:', e);
    }

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

  // Dynamic ticker documents (show all SAKIP documents across Pemkab Nagekeo):
  const tickerDocuments = documents;

  const currentOpdDocsCount = documents.filter((d) => d.opdId === activeOpd.id).length;

  const isDinas = currentUser.role === 'DINAS_PEMOHON';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 flex flex-col font-sans selection:bg-blue-500/20 font-medium">
      {/* Top Bar with User Info, Password Trigger, and Logout */}
      <Header
        activeOpd={activeOpd}
        onSelectOpd={handleSelectOpd}
        currentUser={currentUser}
        unreadNotificationCount={notifications.filter((item) => {
          if (item.isRead) return false;
          if (item.targetRole === 'ALL') return true;
          if (currentUser.role === 'DINAS_PEMOHON') {
            if (item.targetRole !== 'DINAS_PEMOHON') return false;
            if (item.targetOpdId && item.targetOpdId !== currentUser.opdId) return false;
            return true;
          } else {
            return item.targetRole === 'VERIFIKATOR';
          }
        }).length}
        onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
        onOpenGoogleSheetModal={() => setIsGoogleSheetOpen(true)}
        onOpenUploadModal={() => setIsUploadOpen(true)}
        onOpenChangePasswordModal={() => setIsChangePasswordOpen(true)}
        onOpenDriveExplorer={() => setIsDriveExplorerOpen(true)}
        onOpenAdminFolderRegistration={() => setIsFolderRegistrationOpen(true)}
        onLogout={handleLogout}
        onSync={syncWithGoogleSheet}
        isSyncing={isSyncing}
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
          {/* View Dropdown Selector */}
          <div className="relative" ref={viewDropdownRef}>
            <button
              onClick={() => setIsViewDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-blue-700 to-sky-600 hover:from-blue-800 hover:to-sky-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all border border-blue-500"
              title="Pilih Mode Tampilan Halaman"
            >
              {activeView === 'LIST' && <Layers className="w-4 h-4 text-sky-200 shrink-0" />}
              {activeView === 'VIEWER' && <FileText className="w-4 h-4 text-sky-200 shrink-0" />}
              {activeView === 'FORM' && <FileCheck className="w-4 h-4 text-sky-200 shrink-0" />}

              <div className="text-left">
                <span className="text-[9px] text-sky-200 block uppercase font-mono font-bold leading-none">
                  Mode Tampilan:
                </span>
                <span className="font-bold text-white text-xs truncate block mt-0.5">
                  {activeView === 'LIST' && `1. Daftar Berkas OPD (${currentOpdDocsCount})`}
                  {activeView === 'VIEWER' && `2. Penampil Dokumen (Lebar & Jelas)`}
                  {activeView === 'FORM' &&
                    (currentUser.role === 'VERIFIKATOR'
                      ? '3. Lembar Verifikasi & Pengesahan (Admin)'
                      : '3. Informasi Status & Catatan Verifikasi')}
                </span>
              </div>

              <ChevronDown className="w-4 h-4 text-white shrink-0 ml-1" />
            </button>

            {isViewDropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white border-2 border-slate-300 rounded-2xl shadow-2xl overflow-hidden z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-xs mb-1">
                  <div className="font-black text-blue-950">Navigasi Halaman Dokumen</div>
                  <div className="text-[10px] text-slate-700 font-bold">
                    Pilih salah satu tampilan untuk membuka lembar kerja
                  </div>
                </div>

                {/* Option 1: Daftar Berkas */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('LIST');
                    setIsViewDropdownOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                    activeView === 'LIST'
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'text-slate-900 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className={`w-4 h-4 shrink-0 ${activeView === 'LIST' ? 'text-white' : 'text-blue-600'}`} />
                    <span className="truncate">1. Daftar Berkas OPD</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                      activeView === 'LIST' ? 'bg-white text-blue-900' : 'bg-blue-100 text-blue-900 border border-blue-200'
                    }`}
                  >
                    {currentOpdDocsCount} Berkas
                  </span>
                </button>

                {/* Option 2: Penampil Dokumen */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('VIEWER');
                    setIsViewDropdownOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                    activeView === 'VIEWER'
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'text-slate-900 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className={`w-4 h-4 shrink-0 ${activeView === 'VIEWER' ? 'text-white' : 'text-blue-600'}`} />
                    <span className="truncate">2. Penampil Dokumen (Lebar &amp; Jelas)</span>
                  </div>
                  {selectedDocument && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                        activeView === 'VIEWER' ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-900'
                      }`}
                    >
                      v{selectedDocument.currentVersion}
                    </span>
                  )}
                </button>

                {/* Option 3: Formulir & Lembar Verifikasi */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('FORM');
                    setIsViewDropdownOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                    activeView === 'FORM'
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'text-slate-900 hover:bg-slate-100 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck className={`w-4 h-4 shrink-0 ${activeView === 'FORM' ? 'text-white' : 'text-blue-600'}`} />
                    <span className="truncate">
                      {currentUser.role === 'VERIFIKATOR'
                        ? '3. Lembar Verifikasi & Pengesahan'
                        : '3. Informasi Status & Catatan'}
                    </span>
                  </div>
                  {selectedDocument && (
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-mono font-bold shrink-0 ${
                        selectedDocument.status === 'APPROVED'
                          ? 'bg-emerald-600 text-white'
                          : selectedDocument.status === 'REVISION'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {selectedDocument.status === 'APPROVED'
                        ? 'SAH'
                        : selectedDocument.status === 'REVISION'
                        ? 'REVISI'
                        : 'PERIKSA'}
                    </span>
                  )}
                </button>
              </div>
            )}
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
        {/* Instant Upload Feedback Banner with Direct Verification Links */}
        {uploadFeedback && (
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border-2 border-emerald-300 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-md animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-emerald-950 text-xs flex flex-wrap items-center gap-1.5">
                  <span className="truncate">Berkas "{uploadFeedback.docNumber} - {uploadFeedback.title}" Berhasil Dikirim!</span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-emerald-700 font-mono border border-emerald-200 font-bold shrink-0">
                    Tersinkronisasi Otomatis
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 truncate mt-0.5">
                  Tersimpan di Google Drive Induk Server &amp; dicatat di Google Sheet <strong>DATA_VERIFIKASI_DOKUMEN</strong> ({uploadFeedback.opdName})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={uploadFeedback.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Periksa di Sheet</span>
              </a>

              <a
                href={uploadFeedback.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs text-xs"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Buka Drive Dinas</span>
              </a>

              <button
                type="button"
                onClick={() => setUploadFeedback(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/60 cursor-pointer transition-colors"
                title="Tutup Pemberitahuan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

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
                  onOpenEditModal={handleOpenEditModal}
                  onDeleteDocument={handleDeleteDocument}
                />
              </div>
            )}

            {/* VIEW 2: PENAMPIL DOKUMEN & DETAIL STATUS (BESAR & LEBAR) */}
            {activeView === 'VIEWER' && (
              <div className="w-full min-h-[650px] h-[calc(100vh-210px)] flex flex-col animate-in fade-in duration-150 space-y-2">
                {selectedDocument ? (
                  <>
                    <div className="flex-1 min-h-0">
                      <DocumentViewer document={selectedDocument} />
                    </div>

                    {/* Quick Navigation Bar */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                      <button
                        onClick={() => setActiveView('LIST')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-500" />
                        <span>Kembali ke Daftar Berkas &amp; Status</span>
                      </button>

                      <div className="text-xs text-center hidden md:block">
                        <span className="text-slate-500">Berkas: </span>
                        <strong className="text-slate-900 font-bold">{selectedDocument.fileName}</strong>
                        <span className="text-slate-400 ml-1">({selectedDocument.nomorBerkas})</span>
                      </div>

                      {selectedDocument.status === 'REVISION' && (
                        <button
                          onClick={() => setIsRevisionOpen(true)}
                          className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Upload Berkas Perbaikan (Revisi)</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm min-h-[450px]">
                    <FileText className="w-14 h-14 mb-3 text-blue-500/50" />
                    <h3 className="text-base font-bold text-slate-800 mb-1">
                      Tidak Ada Dokumen Dipilih
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mb-4">
                      Silakan pilih dokumen dari antrean {activeOpd.name} pada tab Daftar Berkas.
                    </p>
                    <button
                      onClick={() => setActiveView('LIST')}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                    >
                      Buka Daftar Berkas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* MODE 2: SPLIT VIEW (2 KOLOM: DAFTAR BERKAS & PENAMPIL DETAIL) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-start">
            {/* COLUMN 1: OPD Documents List */}
            <div className="lg:col-span-5 h-[calc(100vh-190px)] sticky top-28 flex flex-col">
              <DocumentList
                documents={documents}
                selectedDocument={selectedDocument}
                onSelectDocument={handleSelectDocument}
                activeOpd={activeOpd}
                appRole={currentUser.role}
                onOpenRevisionModalForDoc={() => setIsRevisionOpen(true)}
                onSelectOpd={handleSelectOpd}
                onOpenUploadModal={() => setIsUploadOpen(true)}
                onOpenEditModal={handleOpenEditModal}
                onDeleteDocument={handleDeleteDocument}
              />
            </div>

            {/* COLUMN 2: Multi-format Document Viewer & Status Details */}
            <div className="lg:col-span-7 h-[calc(100vh-190px)] flex flex-col">
              {selectedDocument ? (
                <DocumentViewer document={selectedDocument} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
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
          </div>
        )}
      </main>

      {/* Modals */}
      {!isDinas && (
        <GoogleSheetModal
          isOpen={isGoogleSheetOpen}
          onClose={() => setIsGoogleSheetOpen(false)}
        />
      )}

      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        activeOpd={activeOpd}
        currentUser={currentUser}
        folderRegistrations={folderRegistrations}
        onAddDocument={handleAddDocument}
      />

      <UploadRevisionModal
        isOpen={isRevisionOpen}
        onClose={() => setIsRevisionOpen(false)}
        document={selectedDocument}
        folderRegistrations={folderRegistrations}
        onUploadRevision={handleUploadRevision}
      />

      <EditDocumentModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setEditingDocument(null);
        }}
        document={editingDocument}
        onSaveEdit={handleSaveEditDocument}
        onDeleteDocument={handleDeleteDocument}
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

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        currentUser={currentUser}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onSelectDocumentById={handleSelectDocumentById}
      />

      <NotificationToast
        notification={activeToast}
        onDismiss={() => setActiveToast(null)}
        onClick={() => {
          if (activeToast?.docId) {
            handleSelectDocumentById(activeToast.docId);
          }
        }}
      />
    </div>
  );
}
