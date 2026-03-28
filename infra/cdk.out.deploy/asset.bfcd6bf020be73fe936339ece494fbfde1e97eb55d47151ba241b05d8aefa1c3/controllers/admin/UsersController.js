import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { Table } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { usersApi } from '../../api/users.js';
import { formatDate } from '../../utils/format.js';
import { navigate } from '../../router.js';

export default async function UsersController(params) {
  const el = await loadTemplate('/templates/admin/users.html', 'users');

  let users = [];

  const actionsEl = el.querySelector('[data-bind="actions"]');
  actionsEl.appendChild(
    Button({ text: '+ Create User', variant: 'p', onClick: () => showCreateModal() })
  );

  async function loadUsers() {
    const tableContainer = el.querySelector('[data-bind="usersTable"]');

    // Show loading
    tableContainer.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading users...</div>
      </div>
    `;

    try {
      const response = await usersApi.list();
      users = response.data?.users || [];
      renderTable(users);
    } catch (err) {
      tableContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load users</div>
          <div class="empty-desc">${err.message}</div>
        </div>
      `;
    }
  }

  function renderTable(data) {
    const tableContainer = el.querySelector('[data-bind="usersTable"]');
    tableContainer.innerHTML = '';

    if (data.length === 0) {
      tableContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">👥</div>
          <div class="empty-title">No users found</div>
          <div class="empty-desc">Create your first user to get started</div>
        </div>
      `;
      return;
    }

    const columns = [
      { key: 'username', label: 'Username' },
      { key: 'email', label: 'Email' },
      { key: 'created_by', label: 'Created By' },
      {
        key: 'created_at',
        label: 'Created At',
        render: (row) => formatDate(row.created_at)
      },
      {
        key: 'actions',
        label: 'Actions',
        width: '120px',
        render: (row) => {
          const div = document.createElement('div');
          div.className = 'tbl-row-actions';

          const deleteBtn = Button({
            text: 'Delete',
            variant: 'd',
            size: 'sm',
            onClick: (e) => {
              e.stopPropagation();
              showDeleteConfirm(row);
            }
          });

          div.appendChild(deleteBtn);
          return div;
        }
      }
    ];

    const table = Table({ columns, data });
    tableContainer.appendChild(table);
  }

  function showCreateModal() {
    const body = document.createElement('div');
    body.innerHTML = `
      <form id="create-user-form">
        <div class="form-g">
          <label class="form-l">Email <span class="req">*</span></label>
          <input type="email" name="email" class="form-i" placeholder="user@example.com" required>
          <div class="form-h">Password will be sent to this email</div>
        </div>
        <div class="modal-error" id="modal-error" style="display:none;"></div>
      </form>
    `;

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '12px';
    footer.style.justifyContent = 'flex-end';

    let modal;

    const cancelBtn = Button({
      text: 'Cancel',
      variant: 's',
      onClick: () => modal.close()
    });

    const submitBtn = Button({
      text: 'Create User',
      variant: 'p',
      onClick: async () => {
        const form = body.querySelector('#create-user-form');
        const email = form.querySelector('input[name="email"]').value;
        const errorEl = body.querySelector('#modal-error');

        if (!email) {
          errorEl.textContent = 'Email is required';
          errorEl.style.display = 'block';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        try {
          await usersApi.create(email);
          modal.close();
          loadUsers();
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create User';
        }
      }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);

    modal = Modal({
      title: 'Create New User',
      body,
      footer
    });
  }

  function showDeleteConfirm(user) {
    const body = document.createElement('div');
    body.innerHTML = `
      <p>Are you sure you want to delete user <strong>${user.email}</strong>?</p>
      <p style="color: var(--err-600); font-size: 13px; margin-top: 12px;">This action cannot be undone.</p>
    `;

    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '12px';
    footer.style.justifyContent = 'flex-end';

    let modal;

    const cancelBtn = Button({
      text: 'Cancel',
      variant: 's',
      onClick: () => modal.close()
    });

    const deleteBtn = Button({
      text: 'Delete',
      variant: 'd',
      onClick: async () => {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';

        try {
          await usersApi.delete(user.user_id);
          modal.close();
          loadUsers();
        } catch (err) {
          alert(err.message);
        } finally {
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete';
        }
      }
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(deleteBtn);

    modal = Modal({
      title: 'Delete User',
      body,
      footer
    });
  }

  // Search functionality
  const searchInput = el.querySelector('[data-bind="searchInput"]');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = users.filter(u =>
      u.email?.toLowerCase().includes(query) ||
      u.username?.toLowerCase().includes(query)
    );
    renderTable(filtered);
  });

  loadUsers();

  return el;
}
