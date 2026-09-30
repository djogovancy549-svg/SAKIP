import { db } from './googleDriveAuth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { DocumentItem, OpdFolderRegistration, UserAccount } from '../types';

// Constants for collections
const COLL_SETTINGS = 'settings';
const COLL_DOCUMENTS = 'documents';
const COLL_USERS = 'users';
const COLL_FOLDERS = 'folders';

export interface AppSettings {
  webhookUrl: string;
  driveFolderId: string;
}

// Save Google Settings to Firestore
export async function saveGoogleSettingsToFirestore(settings: AppSettings): Promise<void> {
  try {
    await setDoc(doc(db, COLL_SETTINGS, 'google'), settings);
    console.log('✅ Settings saved to Firestore successfully.');
  } catch (err) {
    console.error('Failed to save settings to Firestore', err);
  }
}

// Get Google Settings from Firestore
export async function getGoogleSettingsFromFirestore(): Promise<AppSettings | null> {
  try {
    const snap = await getDoc(doc(db, COLL_SETTINGS, 'google'));
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
  } catch (err) {
    console.error('Failed to get settings from Firestore', err);
  }
  return null;
}

// Save all documents to Firestore
export async function saveDocumentToFirestore(document: DocumentItem): Promise<void> {
  try {
    await setDoc(doc(db, COLL_DOCUMENTS, document.id), document);
  } catch (err) {
    console.error(`Failed to save document ${document.id} to Firestore`, err);
  }
}

// Delete document from Firestore
export async function deleteDocumentFromFirestore(docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLL_DOCUMENTS, docId));
  } catch (err) {
    console.error(`Failed to delete document ${docId} from Firestore`, err);
  }
}

// Real-time listener for Documents
export function listenToDocuments(callback: (docs: DocumentItem[]) => void) {
  return onSnapshot(collection(db, COLL_DOCUMENTS), (snap) => {
    const docs: DocumentItem[] = [];
    snap.forEach((doc) => {
      docs.push(doc.data() as DocumentItem);
    });
    // Sort by tanggalMasuk descending or ID
    docs.sort((a, b) => {
      return new Date(b.tanggalMasuk).getTime() - new Date(a.tanggalMasuk).getTime();
    });
    callback(docs);
  });
}

// Real-time listener for Settings
export function listenToSettings(callback: (settings: AppSettings) => void) {
  return onSnapshot(doc(db, COLL_SETTINGS, 'google'), (snap) => {
    if (snap.exists()) {
      callback(snap.data() as AppSettings);
    }
  });
}

// Real-time listener for Users
export function listenToUsers(callback: (users: UserAccount[]) => void) {
  return onSnapshot(collection(db, COLL_USERS), (snap) => {
    const users: UserAccount[] = [];
    snap.forEach((doc) => {
      users.push(doc.data() as UserAccount);
    });
    callback(users);
  });
}

// Save User to Firestore
export async function saveUserToFirestore(user: UserAccount): Promise<void> {
  try {
    await setDoc(doc(db, COLL_USERS, user.id), user);
  } catch (err) {
    console.error(`Failed to save user ${user.id} to Firestore`, err);
  }
}

// Real-time listener for Folders
export function listenToFolders(callback: (folders: OpdFolderRegistration[]) => void) {
  return onSnapshot(collection(db, COLL_FOLDERS), (snap) => {
    const folders: OpdFolderRegistration[] = [];
    snap.forEach((doc) => {
      folders.push(doc.data() as OpdFolderRegistration);
    });
    callback(folders);
  });
}

// Save Folder registration to Firestore
export async function saveFolderToFirestore(folder: OpdFolderRegistration): Promise<void> {
  try {
    await setDoc(doc(db, COLL_FOLDERS, folder.opdId), folder);
  } catch (err) {
    console.error(`Failed to save folder mapping for ${folder.opdId} to Firestore`, err);
  }
}
