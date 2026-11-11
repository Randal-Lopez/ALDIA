import type { User } from '../models/UserModel';

export class UserView {
  private form: HTMLFormElement;
  private nameInput: HTMLInputElement;
  private emailInput: HTMLInputElement;
  private searchInput: HTMLInputElement;
  private tableBody: HTMLTableSectionElement;
  private message: HTMLDivElement;
  private btnExport: HTMLButtonElement;
  private btnPrev: HTMLButtonElement;
  private btnNext: HTMLButtonElement;
  private pageInfo: HTMLSpanElement;
  private editingId: number | null = null;

  constructor() {
    this.form = document.getElementById('userForm') as HTMLFormElement;
    this.nameInput = document.getElementById('name') as HTMLInputElement;
    this.emailInput = document.getElementById('email') as HTMLInputElement;
    this.searchInput = document.getElementById('searchInput') as HTMLInputElement;
    this.tableBody = document.getElementById('userTableBody') as HTMLTableSectionElement;
    this.message = document.getElementById('message') as HTMLDivElement;
    this.btnExport = document.getElementById('btnExport') as HTMLButtonElement;
    this.btnPrev = document.getElementById('btnPrev') as HTMLButtonElement;
    this.btnNext = document.getElementById('btnNext') as HTMLButtonElement;
    this.pageInfo = document.getElementById('pageInfo') as HTMLSpanElement;
  }

  getFormData(): { name: string; email: string } {
    return {
      name: this.nameInput.value.trim(),
      email: this.emailInput.value.trim()
    };
  }

  renderTable(users: User[], totalUsers: number, currentPage: number, totalPages: number): void {
    if (totalUsers === 0) {
      this.tableBody.innerHTML = `
        <tr><td colspan="4" class="empty">No hay registros que coincidan con la búsqueda</td></tr>
      `;
      this.pageInfo.textContent = 'Página 0 de 0';
      this.btnPrev.disabled = true;
      this.btnNext.disabled = true;
      return;
    }

    this.tableBody.innerHTML = users.map((user) => `
      <tr>
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>
          <button class="btn-edit" data-id="${user.id}" data-action="edit">✏️ Editar</button>
          <button class="btn-delete" data-id="${user.id}" data-action="delete">🗑️ Eliminar</button>
        </td>
      </tr>
    `).join('');

    this.pageInfo.textContent = `Página ${currentPage} de ${totalPages} (${totalUsers} registros)`;
    this.btnPrev.disabled = currentPage <= 1;
    this.btnNext.disabled = currentPage >= totalPages;
  }

  showMessage(text: string, type: 'success' | 'error'): void {
    this.message.textContent = text;
    this.message.className = `message ${type}`;
    setTimeout(() => {
      this.message.textContent = '';
      this.message.className = 'message';
    }, 3000);
  }

  loadUserForEdit(user: User): void {
    this.nameInput.value = user.name;
    this.emailInput.value = user.email;
    this.editingId = user.id!;
    const submitBtn = this.form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitBtn.textContent = '💾 Actualizar';
  }

  resetForm(): void {
    this.form.reset();
    this.editingId = null;
    const submitBtn = this.form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitBtn.textContent = '➕ Agregar Usuario';
  }

  bindSubmit(handler: (name: string, email: string) => void): void {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const { name, email } = this.getFormData();
      handler(name, email);
    });
  }

  bindSearch(handler: (term: string) => void): void {
    this.searchInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      handler(val);
    });
  }

  bindPagination(onPrev: () => void, onNext: () => void): void {
    this.btnPrev.addEventListener('click', onPrev);
    this.btnNext.addEventListener('click', onNext);
  }

  bindExport(handler: () => void): void {
    this.btnExport.addEventListener('click', handler);
  }

  bindTableActions(onEdit: (id: number) => void, onDelete: (id: number) => void): void {
    this.tableBody.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('button');
      if (!target) return;

      const action = target.dataset.action;
      const id = Number(target.dataset.id);

      if (action === 'edit') onEdit(id);
      else if (action === 'delete') onDelete(id);
    });
  }

  getEditingId(): number | null {
    return this.editingId;
  }
}