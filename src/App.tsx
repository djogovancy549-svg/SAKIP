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
import { VerificationForm } from './components/VerificationForm';
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
  sendFolderRegistrationToGoogleSheet,
  sendAllFolderRegistrationsToGoogleSheet,
  sendUserRegistrationToGoogleSheet,
} from './services/googleSheetsWebhook';
import {
  listenToDocuments,
  listenToSettings,
  listenToFolders,
  listenToUsers,
  saveDocumentToFirestore,
  deleteDocumentFromFirestore,
  saveUserToFirestore,
  saveFolderToFirestore,
  saveGoogleSettingsToFirestore,
} from './services/firestoreSync';
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

  // Subscribe to real-time shared Firestore state
  useEffect(() => {
    // 1. Listen to global documents
    const unsubDocs = listenToDocuments((docsList) => {
      if (docsList && docsList.length > 0) {
        setDocuments(docsList);
      }
    });

    // 2. Listen to custom Google Drive/Sheets webhook settings
    const unsubSettings = listenToSettings((settings) => {
      if (settings) {
        setGlobalWebhookUrl(settings.webhookUrl);
        setGlobalDriveFolderId(settings.driveFolderId);
      }
    });

    // 3. Listen to OPD folder registrations
    const unsubFolders = listenToFolders((foldersList) => {
      if (foldersList && foldersList.length > 0) {
        const record: Record<string, OpdFolderRegistration> = {};
        foldersList.forEach((reg) => {
          if (reg.opdId) record[reg.opdId] = reg;
        });
        setFolderRegistrations(record);
      }
    });

    // 4. Listen to user accounts
    const unsubUsers = listenToUsers((usersList) => {
      if (usersList && usersList.length > 0) {
        setUserAccounts((prev) => {
          const merged = [...prev];
          usersList.forEach((nu) => {
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
    });

    return () => {
      unsubDocs();
      unsubSettings();
      unsubFolders();
      unsubUsers();
    };
  }, []);

  // Automatic Firestore data seeder & migration on first install
  useEffect(() => {
    const seedAndMigrate = async () => {
      // 1. Migrate local localStorage data to shared Cloud Firestore
      try {
        const localDocs = localStorage.getItem(STORAGE_KEY_DOCS);
        if (localDocs) {
          const parsedDocs: DocumentItem[] = JSON.parse(localDocs);
          if (parsedDocs && parsedDocs.length > 0) {
            console.log('⚡ Migrating local documents to shared Cloud Firestore...');
            for (const docItem of parsedDocs) {
              await saveDocumentToFirestore(docItem);
            }
          }
        }

        const localFolders = localStorage.getItem(STORAGE_KEY_FOLDER_REGISTRATIONS);
        if (localFolders) {
          const parsedFolders: Record<string, OpdFolderRegistration> = JSON.parse(localFolders);
          if (parsedFolders) {
            console.log('⚡ Migrating local folders to shared Cloud Firestore...');
            for (const key of Object.keys(parsedFolders)) {
              await saveFolderToFirestore(parsedFolders[key]);
            }
          }
        }

        const savedWebhook = localStorage.getItem('simverif_google_sheets_webhook_url');
        const savedDriveId = localStorage.getItem('simverif_google_drive_folder_id');
        if (savedWebhook || savedDriveId) {
          console.log('⚡ Migrating Google settings to shared Cloud Firestore...');
          await saveGoogleSettingsToFirestore({
            webhookUrl: savedWebhook ? savedWebhook.trim() : 'https://script.google.com/macros/s/AKfycbx_94SKv35eQGy1srb7xCC8uGiSTRnvFnHmBMW5PiRRaN0ImN05QsXVe4-rQpRAKWEl7w/exec',
            driveFolderId: savedDriveId ? savedDriveId.trim() : '1oeL5XXQlgo6GNyoEeXl804UMMGwHARl7',
          });
        }
      } catch (e) {
        console.warn('Migration to cloud error:', e);
      }

      // 2. Fallback Seeder if Firestore is empty
      const unsub = listenToDocuments(async (liveDocs) => {
        if (liveDocs.length === 0) {
          console.log('🌱 Seeding initial documents to Firestore...');
          for (const docItem of INITIAL_DOCUMENTS) {
            await saveDocumentToFirestore(docItem);
          }
        }
        unsub();
      });
    };
    seedAndMigrate();
  }, []);

  const syncWithGoogleSheet = async () => {
    setIsSyncing(true);
    try {
      const data = await fetchDatabaseFromGoogleSheet();
      if (data) {
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
          // Persist all retrieved documents to Firestore so all other devices see them
          for (const d of data.documents) {
            await saveDocumentToFirestore(d);
          }
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
          for (const u of data.users) {
            await saveUserToFirestore(u);
          }
        }
        if (data.folders && data.folders.length > 0) {
          const record: Record<string, OpdFolderRegistration> = {};
          data.folders.forEach((reg) => {
            if (reg.opdId) {
              record[reg.opdId] = reg;
            }
          });
          setFolderRegistrations(record);
          for (const f of data.folders) {
            await saveFolderToFirestore(f);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to sync database with Google Sheet', err);
      // Fallback gracefully without locking the UI, notifying the user with a helpful instruction
      alert(
        '⚠️ Sinkronisasi Langsung ke Google Sheet Terhambat!\n\n' +
        'Sistem tetap berjalan normal menggunakan database awan Firestore.\n\n' +
        'Agar sinkronisasi tombol "Sinkron Sheet" instan tanpa loading lama:\n' +
        '1. Buka Google Apps Script Anda.\n' +
        '2. Klik "Terapkan" (Deploy) -> "Kelola Penerapan" (Manage Deployments).\n' +
        '3. Klik ikon Pensil (Edit) pada baris Web App.\n' +
        '4. Ganti kolom "Yang memiliki akses" (Who has access) menjadi "Siapa saja" (Anyone) - jangan pilih "Hanya saya".\n' +
        '5. Klik "Terapkan" (Deploy) kembali.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Run on mount
  useEffect(() => {
    syncWithGoogleSheet();
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
    saveDocumentToFirestore(updatedDoc);

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
    await saveDocumentToFirestore(newDoc);
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
    await saveDocumentToFirestore(updatedDoc);

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
    await saveDocumentToFirestore(updatedDoc);
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
    await deleteDocumentFromFirestore(docId);
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

    // 1. Save new user account to shared Firestore
    await saveUserToFirestore(newUser);

    // 2. Transmit to Google Sheet (DATABASE_PENGGUNA)
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

    // 1. Persist folder mapping to Cloud Firestore
    await saveFolderToFirestore(reg);

    // 2. Transmit to Google Sheet Webhook (MAPPING_FOLDER_OPD)
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

    // 1. Persist all folder mappings to Firestore & Google Sheet Webhook
    try {
      const regArray = Object.values(allRegs);
      for (const r of regArray) {
        await saveFolderToFirestore(r);
      }
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

      {/* Quick Webhook Setup Alert Box if they haven't saved any custom webhook yet */}
      {getGoogleSheetsWebhookUrl() === 'https://script.google.com/macros/s/AKfycbx_94SKv35eQGy1srb7xCC8uGiSTRnvFnHmBMW5PiRRaN0ImN05QsXVe4-rQpRAKWEl7w/exec' && (
        <div className="bg-amber-50 border-y sm:border-2 border-amber-300 sm:rounded-2xl p-4 shadow-sm max-w-7xl w-full mx-auto mt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <span className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 self-start">
                <Database className="w-5 h-5 animate-bounce" />
              </span>
              <div className="space-y-1">
                <h4 className="font-extrabold text-amber-950 text-sm">Hubungkan Google Sheet Utama SAKIP Nagekeo Anda</h4>
                <p className="text-xs text-amber-900 leading-relaxed font-bold">
                  Sistem saat ini mendeteksi Anda menggunakan spreadsheet bawaan sistem (kosong). Silakan tempel tautan Webhook Google Apps Script Anda di bawah ini agar seluruh data dokumen, dinas, dan akun pengguna (seperti <b>Denin/deni</b>) yang sudah ada di Google Sheet Anda langsung terhubung secara real-time!
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <input
                id="dashboard-webhook-input"
                type="text"
                placeholder="https://script.google.com/macros/s/.../exec"
                className="bg-white border-2 border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono w-full sm:w-64 focus:outline-none focus:border-blue-500 font-bold"
              />
              <button
                onClick={async () => {
                  const val = (document.getElementById('dashboard-webhook-input') as HTMLInputElement)?.value;
                  if (val && val.trim().startsWith('https://script.google.com')) {
                    saveGoogleSheetsWebhookUrl(val.trim());
                    setGlobalWebhookUrl(val.trim());
                    await saveGoogleSettingsToFirestore({
                      webhookUrl: val.trim(),
                      driveFolderId: getGoogleDriveFolderId(),
                    });
                    alert('Google Sheet utama Anda berhasil dihubungkan secara global ke seluruh perangkat!');
                    window.location.reload();
                  } else {
                    alert('Mohon tempelkan alamat URL Webhook Google Apps Script (script.google.com) yang valid!');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
              >
                Hubungkan
              </button>
            </div>
          </div>
        </div>
      )}

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
                  onOpenEditModal={handleOpenEditModal}
                  onDeleteDocument={handleDeleteDocument}
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
                onOpenEditModal={handleOpenEditModal}
                onDeleteDocument={handleDeleteDocument}
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
