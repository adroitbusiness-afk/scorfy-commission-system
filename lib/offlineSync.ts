// lib/offlineQueue.ts
class OfflineQueue {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'app_offline';
  private readonly STORE_NAME = 'events';

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { autoIncrement: true });
        }
      };
    });
  }

  async addEvent(event: any): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    store.add(event);
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  }

  async getEvents(): Promise<any[]> {
    if (!this.db) await this.init();
    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearEvents(): Promise<void> {
    if (!this.db) await this.init();
    const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
    const store = tx.objectStore(this.STORE_NAME);
    store.clear();
    return new Promise((resolve) => { tx.oncomplete = () => resolve(); });
  }
}

export const offlineQueue = new OfflineQueue();