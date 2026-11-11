import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { verifyToken, JWT_SECRET } from './middleware/auth.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());



// Registro de cuenta
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const stmt = db.prepare('INSERT INTO accounts (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, hash);

    const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ message: 'Usuario registrado exitosamente', token });
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
    res.status(500).json({ error: 'Error al registrar cuenta' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const account = db.prepare('SELECT * FROM accounts WHERE username = ?').get(username) as any;
  if (!account) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const valid = bcrypt.compareSync(password, account.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ userId: account.id }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ message: 'Inicio de sesión correcto', token });
});


// Listar y Buscar usuarios
app.get('/api/users', verifyToken, (req, res) => {
  const q = req.query.q as string || '';
  let query = 'SELECT * FROM users';
  const params: any[] = [];

  if (q.trim() !== '') {
    query += ' WHERE name LIKE ? OR email LIKE ?';
    params.push(`%${q}%`, `%${q}%`);
  }

  query += ' ORDER BY id DESC';
  const users = db.prepare(query).all(...params);
  res.json(users);
});

// Crear usuario
app.post('/api/users', verifyToken, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Campos obligatorios' });

  try {
    const stmt = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const info = stmt.run(name, email);
    res.status(201).json({ id: info.lastInsertRowid, name, email });
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El correo electrónico ya existe' });
    }
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// Actualizar usuario
app.put('/api/users/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    const stmt = db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?');
    const result = stmt.run(name, email, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ id, name, email });
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El correo electrónico ya existe' });
    }
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// Eliminar usuario
app.delete('/api/users/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);

  if (result.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ message: 'Usuario eliminado correctamente' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en http://localhost:${PORT}`);
});