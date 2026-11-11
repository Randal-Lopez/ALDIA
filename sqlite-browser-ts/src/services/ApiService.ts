import { DatabaseService } from './Database';
import { UserModel } from '../models/UserModel';

const API_URL = 'http://localhost:3000/api';

export class ApiService {
  static isBackendOnline: boolean = true;

  private static getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  static setToken(token: string): void {
    localStorage.setItem('jwt_token', token);
  }

  static clearToken(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('auth_user');
  }

  static isAuthenticated(): boolean {
    return !!this.getToken() && !!localStorage.getItem('auth_user');
  }

  // Asegura que exista la tabla de cuentas también en IndexedDB
  private static ensureLocalAccountsTable(): any {
    const db = DatabaseService.getDb();
    db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `);
    return db;
  }

  // --- REGISTRO ESTRICTO DE CUENTA ---
  static async register(username: string, password: string): Promise<void> {
    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      throw new Error('El nombre de usuario debe tener al menos 3 caracteres.');
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'El nombre de usuario ya está registrado.');
      this.isBackendOnline = true;
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        this.isBackendOnline = false;
        const db = this.ensureLocalAccountsTable();
        const check = db.prepare('SELECT id FROM accounts WHERE LOWER(username) = LOWER(?)');
        check.bind([cleanUser]);
        const exists = check.step();
        check.free();

        if (exists) {
          throw new Error('El nombre de usuario ya existe. Elige otro o inicia sesión.');
        }

        db.run('INSERT INTO accounts (username, password) VALUES (?, ?)', [cleanUser, password]);
        await DatabaseService.save();
        return;
      }
      throw err;
    }
  }

  // --- INICIO DE SESIÓN ESTRICTO (Exige haberse registrado antes) ---
  static async login(username: string, password: string): Promise<string> {
    const cleanUser = username.trim();
    if (!cleanUser) {
      throw new Error('Debes ingresar un nombre de usuario.');
    }

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error('Usuario no registrado o contraseña incorrecta. Regístrate primero.');
      }

      this.isBackendOnline = true;
      this.setToken(data.token);
      localStorage.setItem('auth_user', cleanUser);
      return data.token;
    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
        this.isBackendOnline = false;
        const db = this.ensureLocalAccountsTable();
        const stmt = db.prepare('SELECT * FROM accounts WHERE LOWER(username) = LOWER(?)');
        stmt.bind([cleanUser]);

        if (!stmt.step()) {
          stmt.free();
          throw new Error('El usuario no existe. Debes crear una cuenta en "Regístrate aquí".');
        }

        const account = stmt.getAsObject() as { id: number; username: string; password: string };
        stmt.free();

        if (account.password !== password) {
          throw new Error('Contraseña incorrecta.');
        }

        const token = `jwt_idb_${btoa(account.username)}_${Date.now()}`;
        this.setToken(token);
        localStorage.setItem('auth_user', account.username);
        return token;
      }
      throw err;
    }
  }

  // --- OPERACIONES CRUD ---
  static async getUsers(query: string = ''): Promise<any[]> {
    if (!this.isBackendOnline) return UserModel.readAll(query);

    try {
      const url = query ? `${API_URL}/users?q=${encodeURIComponent(query)}` : `${API_URL}/users`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      if (!res.ok) throw new Error('Fallback local');
      return await res.json();
    } catch {
      this.isBackendOnline = false;
      return UserModel.readAll(query);
    }
  }

  static async createUser(name: string, email: string): Promise<void> {
    if (!this.isBackendOnline) {
      await UserModel.create(name, email);
      return;
    }

    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ name, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear usuario');
  }

  static async updateUser(id: number, name: string, email: string): Promise<void> {
    if (!this.isBackendOnline) {
      await UserModel.update(id, name, email);
      return;
    }

    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({ name, email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar');
  }

  static async deleteUser(id: number): Promise<void> {
    if (!this.isBackendOnline) {
      await UserModel.delete(id);
      return;
    }

    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar');
  }
}