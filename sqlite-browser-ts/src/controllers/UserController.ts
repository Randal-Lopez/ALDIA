import { ApiService } from '../services/ApiService';
import { UserModel, User } from '../models/UserModel';

export class UserController {
  private users: User[] = [];
  private currentPage: number = 1;
  private rowsPerPage: number = 5;
  private editingId: number | null = null;

  constructor() {
    this.initAuthEvents();
    this.initCrudEvents();
    this.checkInitialState();
  }

  private checkInitialState(): void {
    if (ApiService.isAuthenticated()) {
      this.showDashboard();
    } else {
      this.showAuth();
    }
  }

  private initAuthEvents(): void {
    const authForm = document.getElementById('authForm') as HTMLFormElement;
    const authToggleLink = document.getElementById('authToggleLink') as HTMLAnchorElement;
    const btnLogout = document.getElementById('btnLogout') as HTMLButtonElement;
    const msg = document.getElementById('authMessage')!;

    let isRegisterMode = false;

    const updateAuthView = () => {
      document.getElementById('authTitle')!.textContent = isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesión';
      document.getElementById('btnAuthSubmit')!.textContent = isRegisterMode ? 'Registrar Usuario' : 'Ingresar';
      document.getElementById('authToggleText')!.textContent = isRegisterMode ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
      authToggleLink.textContent = isRegisterMode ? 'Inicia sesión aquí' : 'Regístrate aquí';
    };

    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      isRegisterMode = !isRegisterMode;
      msg.style.display = 'none';
      updateAuthView();
    });

    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userInput = document.getElementById('authUsername') as HTMLInputElement;
      const passInput = document.getElementById('authPassword') as HTMLInputElement;
      const user = userInput.value.trim();
      const pass = passInput.value.trim();

      if (user.length < 3) {
        msg.textContent = 'El nombre de usuario es obligatorio (mínimo 3 caracteres).';
        msg.className = 'message error';
        msg.style.display = 'block';
        return;
      }

      try {
        if (isRegisterMode) {
          await ApiService.register(user, pass);
          isRegisterMode = false;
          updateAuthView();
          passInput.value = '';
          msg.textContent = `✅ Usuario "${user}" registrado. Ahora inicia sesión con tu contraseña.`;
          msg.className = 'message success';
          msg.style.display = 'block';
        } else {
          await ApiService.login(user, pass);
          msg.style.display = 'none';
          userInput.value = '';
          passInput.value = '';
          await this.showDashboard();
        }
      } catch (err: any) {
        msg.textContent = err.message;
        msg.className = 'message error';
        msg.style.display = 'block';
      }
    });

    btnLogout.addEventListener('click', () => {
      ApiService.clearToken();
      this.showAuth();
    });
  }

  private showAuth(): void {
    document.getElementById('authContainer')!.style.display = 'block';
    document.getElementById('appContainer')!.style.display = 'none';
  }

  private async showDashboard(): Promise<void> {
    const activeUser = localStorage.getItem('auth_user');
    if (!activeUser) {
      this.showAuth();
      return;
    }

    document.getElementById('authContainer')!.style.display = 'none';
    document.getElementById('appContainer')!.style.display = 'flex';

    await this.loadUsers();

    const badge = document.getElementById('connectionBadge')!;
    const userDisplay = document.getElementById('userSessionDisplay')!;

    userDisplay.textContent = `👤 Usuario: ${activeUser}`;

    if (ApiService.isBackendOnline) {
      badge.textContent = ' Conectado a: Node.js y SQLite';
    } else {
      badge.textContent = '🟢 Conectado a: SQLite y IndexedDB';
    }
  }

  private initCrudEvents(): void {
    const userForm = document.getElementById('userForm') as HTMLFormElement;
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const btnExport = document.getElementById('btnExport') as HTMLButtonElement;
    const btnPrev = document.getElementById('btnPrev') as HTMLButtonElement;
    const btnNext = document.getElementById('btnNext') as HTMLButtonElement;

    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('name') as HTMLInputElement;
      const emailInput = document.getElementById('email') as HTMLInputElement;

      try {
        if (this.editingId) {
          await ApiService.updateUser(this.editingId, nameInput.value, emailInput.value);
          this.editingId = null;
          document.getElementById('btnSaveUser')!.textContent = '➕ Agregar Usuario';
        } else {
          await ApiService.createUser(nameInput.value, emailInput.value);
        }
        nameInput.value = '';
        emailInput.value = '';
        this.showMessage('Registro guardado correctamente', 'success');
        await this.loadUsers();
      } catch (err: any) {
        this.showMessage(err.message || 'El correo ya existe o los datos son inválidos', 'error');
      }
    });

    searchInput.addEventListener('input', () => {
      this.currentPage = 1;
      this.loadUsers(searchInput.value);
    });

    btnExport.addEventListener('click', () => {
      try {
        UserModel.exportToCSV();
      } catch (err: any) {
        this.showMessage(err.message, 'error');
      }
    });

    btnPrev.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderTable();
      }
    });

    btnNext.addEventListener('click', () => {
      if (this.currentPage * this.rowsPerPage < this.users.length) {
        this.currentPage++;
        this.renderTable();
      }
    });
  }

  private async loadUsers(search: string = ''): Promise<void> {
    try {
      this.users = await ApiService.getUsers(search);
      this.renderTable();
    } catch (err: any) {
      this.showMessage(err.message, 'error');
    }
  }

  private renderTable(): void {
    const tbody = document.getElementById('userTableBody')!;
    tbody.innerHTML = '';

    const start = (this.currentPage - 1) * this.rowsPerPage;
    const pagedUsers = this.users.slice(start, start + this.rowsPerPage);

    if (pagedUsers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty">No hay registros que coincidan con la búsqueda</td></tr>`;
    } else {
      pagedUsers.forEach((user) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${user.id}</td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>
            <button type="button" class="btn-edit" data-id="${user.id}">✏️ Editar</button>
            <button type="button" class="btn-delete" data-id="${user.id}">🗑️ Eliminar</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      tbody.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = Number((e.currentTarget as HTMLElement).getAttribute('data-id'));
          const item = this.users.find((u) => u.id === id);
          if (item) {
            (document.getElementById('name') as HTMLInputElement).value = item.name;
            (document.getElementById('email') as HTMLInputElement).value = item.email;
            this.editingId = id;
            document.getElementById('btnSaveUser')!.textContent = '💾 Actualizar';
          }
        });
      });

      tbody.querySelectorAll('.btn-delete').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const id = Number((e.currentTarget as HTMLElement).getAttribute('data-id'));
          if (confirm('¿Desea eliminar este registro?')) {
            await ApiService.deleteUser(id);
            await this.loadUsers();
          }
        });
      });
    }

    const totalPages = Math.ceil(this.users.length / this.rowsPerPage) || 1;
    document.getElementById('pageInfo')!.textContent = `Página ${this.currentPage} de ${totalPages} (${this.users.length} registros)`;
    (document.getElementById('btnPrev') as HTMLButtonElement).disabled = this.currentPage === 1;
    (document.getElementById('btnNext') as HTMLButtonElement).disabled = this.currentPage >= totalPages;
  }

  private showMessage(text: string, type: 'success' | 'error'): void {
    const el = document.getElementById('message')!;
    el.textContent = text;
    el.className = `message ${type}`;
    el.style.display = 'block';
    setTimeout(() => {
      el.style.display = 'none';
    }, 3500);
  }
}