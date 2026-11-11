declare global {
  interface Window {
    initSqlJs: (config?: { locateFile?: (file: string) => string }) => Promise<any>;
  }
}

const DB_NAME = 'SqliteBrowserIDB';
const STORE_NAME = 'database_store';
const RECORD_KEY = 'sqlite_file';

function getIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  const idb = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(RECORD_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  const idb = await getIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(data, RECORD_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export class DatabaseService {
  private static db: any = null;

  static async init(): Promise<any> {
    if (this.db) return this.db;

    const initSql = (window as any).initSqlJs;
    if (typeof initSql !== 'function') {
      throw new Error('SQL.js no se cargó correctamente desde el CDN.');
    }

    const SQL = await initSql({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
    });

    const savedBinary = await loadFromIndexedDB();
    if (savedBinary) {
      this.db = new SQL.Database(savedBinary);
    } else {
      this.db = new SQL.Database();
    }

    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
    `);

    return this.db;
  }

  static async save(): Promise<void> {
    if (!this.db) return;
    const data = this.db.export();
    await saveToIndexedDB(data);
  }

  static getDb(): any {
    if (!this.db) throw new Error('Base de datos no inicializada');
    return this.db;
  }
}