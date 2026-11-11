Guia Paso a Paso para Ejecutar el Proyecto
El proyecto esta dividido en dos modulos: server (Backend Node.js + SQLite) y sqlite-browser-ts (Frontend Vite + TypeScript). Necesitara abrir dos terminales para ejecutarlos simultaneamente.

Paso 1: Levantar el Servidor Backend (Terminal 1)
Abra una terminal (PowerShell, CMD o la terminal de VS Code) en la carpeta raiz del proyecto.

Entre a la carpeta del servidor, instale sus dependencias e iniciarlo:

Bash
cd server
npm install

npm run dev
El servidor API se ejecutara en http://localhost:3000 y montara automaticamente el archivo database.sqlite.

Paso 2: Levantar la Aplicacion Frontend (Terminal 2)
Abra una segunda terminal en la carpeta raiz del proyecto.

Entre a la carpeta del cliente web, instale las dependencias y arranque el entorno de desarrollo:

Bash

sqlite-browser-ts
npm install
npm run dev

Abra su navegador en la direccion que indica la consola:http://localhost:5173