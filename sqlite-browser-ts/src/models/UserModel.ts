import { DatabaseService } from '../services/Database';

export interface User {
  id?: number;
  name: string;
  email: string;
}

export class UserModel {
  static async create(name: string, email: string): Promise<void> {
    const db = DatabaseService.getDb();
    db.run('INSERT INTO users (name, email) VALUES (?, ?)', [name, email]);
    await DatabaseService.save();
  }

  static readAll(searchQuery: string = ''): User[] {
    const db = DatabaseService.getDb();
    let sql = 'SELECT * FROM users';
    const params: (string | number)[] = [];

    if (searchQuery.trim() !== '') {
      sql += ' WHERE name LIKE ? OR email LIKE ?';
      const term = `%${searchQuery.trim()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY id DESC';

    const stmt = db.prepare(sql);
    stmt.bind(params);

    const users: User[] = [];
    while (stmt.step()) {
      users.push(stmt.getAsObject() as { id: number; name: string; email: string });
    }
    stmt.free();

    return users;
  }

  static async update(id: number, name: string, email: string): Promise<void> {
    const db = DatabaseService.getDb();
    db.run('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id]);
    await DatabaseService.save();
  }

  static async delete(id: number): Promise<void> {
    const db = DatabaseService.getDb();
    db.run('DELETE FROM users WHERE id = ?', [id]);
    await DatabaseService.save();
  }

  static exportToCSV(): void {
    const users = this.readAll();
    if (users.length === 0) throw new Error('No hay datos para exportar');

    const headers = ['ID', 'Nombre', 'Email'];
    const rows = users.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}