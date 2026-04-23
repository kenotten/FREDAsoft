import { 
  collection, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  QueryConstraint,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let sessionReads = 0;
let sessionWrites = 0;
const readListeners: ((count: number) => void)[] = [];
const writeListeners: ((count: number) => void)[] = [];

function notifyReadListeners() {
  readListeners.forEach(cb => cb(sessionReads));
}

function notifyWriteListeners() {
  writeListeners.forEach(cb => cb(sessionWrites));
}

const validCollections = ['glossary', 'recommendations', 'categories', 'projects', 'tas_standards', 'inspectors', 'clients', 'facilities', 'items', 'findings', 'unitTypes', 'projectData', 'locations', 'documents'];

export const firestoreService = {
  getSessionReads() {
    return sessionReads;
  },

  getSessionWrites() {
    return sessionWrites;
  },

  subscribeToReads(callback: (count: number) => void) {
    readListeners.push(callback);
    callback(sessionReads);
    return () => {
      const index = readListeners.indexOf(callback);
      if (index > -1) readListeners.splice(index, 1);
    };
  },

  subscribeToWrites(callback: (count: number) => void) {
    writeListeners.push(callback);
    callback(sessionWrites);
    return () => {
      const index = writeListeners.indexOf(callback);
      if (index > -1) writeListeners.splice(index, 1);
    };
  },

  incrementReads(count: number) {
    sessionReads += count;
    notifyReadListeners();
  },

  incrementWrites(count: number) {
    sessionWrites += count;
    notifyWriteListeners();
  },

  /**
   * Helper to sanitize data for Firestore
   */
  sanitize(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    const sanitized = { ...data };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        sanitized[key] = null;
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    });
    return sanitized;
  },

  /**
   * Save a document (Create or Update)
   */
  async save(collectionName: string, data: any, id?: string, includeTimestamps = true) {
    try {
      // 🛡️ TASK 110: ID STAMP HARDENING
      // Use provided ID or generate a new one if missing
      const finalId = id || data.fldPDataID || (collectionName === 'projectData' ? uuidv4() : id);
      
      const timestampData = includeTimestamps ? {
        fldLastModified: serverTimestamp(),
        ...(finalId && id ? {} : { fldCreatedAt: serverTimestamp() })
      } : {};

      // If it's projectData, ensure the internal ID matches the document ID
      const enrichedData = { ...data };
      if (collectionName === 'projectData' && finalId) {
        enrichedData.fldPDataID = finalId;
      }

      const finalData = this.sanitize({ ...enrichedData, ...timestampData });

      if (finalId) {
        const docRef = doc(db, collectionName, finalId);
        await setDoc(docRef, finalData, { merge: true });
        firestoreService.incrementWrites(1);
        return finalId;
      } else {
        // Fallback for other collections that might not use manual IDs
        const docRef = await addDoc(collection(db, collectionName), finalData);
        firestoreService.incrementWrites(1);
        return docRef.id;
      }
    } catch (error) {
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, collectionName);
    }
  },

  /**
   * Delete a document (Hard Delete)
   */
  async delete(collectionName: string, id: string) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      firestoreService.incrementWrites(1);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  },

  /**
   * Soft delete a document
   */
  async softDelete(collectionName: string, id: string, deletedBy?: string) {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, { 
        fldIsDeleted: true, 
        fldDeletedAt: serverTimestamp(),
        fldDeletedBy: deletedBy || 'system'
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  },

  /**
   * Restore a soft-deleted document
   */
  async restore(collectionName: string, id: string) {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, { 
        fldIsDeleted: false, 
        fldDeletedAt: null,
        fldDeletedBy: null
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  },

  /**
   * Batch update multiple documents in the same collection
   */
  async batchUpdate(collectionName: string, updates: { id: string, data: any }[], includeTimestamps = true) {
    try {
      const batch = writeBatch(db);
      updates.forEach(({ id, data }) => {
        const docRef = doc(db, collectionName, id);
        const timestampData = includeTimestamps ? { fldLastModified: serverTimestamp() } : {};
        batch.set(docRef, this.sanitize({ ...data, ...timestampData }), { merge: true });
      });
      await batch.commit();
      firestoreService.incrementWrites(updates.length);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  },

  /**
   * Batch update multiple documents across different collections
   */
  async multiBatchUpdate(changes: Record<string, Record<string, any>>, includeTimestamps = true) {
    try {
      const batch = writeBatch(db);
      let count = 0;
      for (const [collectionName, docs] of Object.entries(changes)) {
        if (!docs || typeof docs !== 'object') continue;
        for (const [id, updates] of Object.entries(docs)) {
          if (!updates || typeof updates !== 'object' || !id) continue;
          const docRef = doc(db, collectionName, id);
          const timestampData = includeTimestamps ? { fldLastModified: serverTimestamp() } : {};
          batch.set(docRef, this.sanitize({ ...updates, ...timestampData }), { merge: true });
          count++;
        }
      }
      if (count > 0) await batch.commit();
      return count;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'multi-collection-batch');
    }
  },

  /**
   * Batch delete multiple documents in the same collection
   */
  async batchDelete(collectionName: string, ids: string[]) {
    try {
      let batch = writeBatch(db);
      let count = 0;
      for (const id of ids) {
        batch.delete(doc(db, collectionName, id));
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, collectionName);
    }
  },

  /**
   * Fetch documents from a collection with optional constraints
   */
  async list(collectionName: string) {
    if (!validCollections.includes(collectionName)) {
      console.error("⛔ SENTRY BLOCK: Hallucinated path attempted:", collectionName);
      return [];
    }
    const q = query(collection(db, collectionName));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
  },

  /**
   * Listen for real-time updates from a collection
   */
  onSnapshot(collectionName: string, callback: (data: any[]) => void) {
    if (!validCollections.includes(collectionName)) {
      console.error("⛔ SENTRY BLOCK: Hallucinated snapshot attempted:", collectionName);
      return () => {};
    }
    const q = query(collection(db, collectionName));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });
  },

  /**
   * Glossary specific operations
   */
  glossary: {
    save: (data: any, id?: string) => firestoreService.save('glossary', data, id),
    delete: (id: string) => firestoreService.delete('glossary', id),
    list: () => firestoreService.list('glossary'),
    onSnapshot: (callback: (data: any[]) => void) => firestoreService.onSnapshot('glossary', callback)
  },

  /**
   * ProjectData (data) specific operations
   */
  data: {
    save: (data: any, id?: string) => firestoreService.save('projectData', data, id),
    delete: (id: string) => firestoreService.delete('projectData', id),
    list: () => firestoreService.list('projectData'),
    onSnapshot: (callback: (data: any[]) => void) => firestoreService.onSnapshot('projectData', callback)
  },

  /**
   * MasterRecommendations specific operations
   */
  masterRecommendations: {
    save: (data: any, id?: string) => firestoreService.save('recommendations', data, id),
    delete: (id: string) => firestoreService.delete('recommendations', id),
    list: () => firestoreService.list('recommendations'),
    onSnapshot: (callback: (data: any[]) => void) => firestoreService.onSnapshot('recommendations', callback)
  }
};
