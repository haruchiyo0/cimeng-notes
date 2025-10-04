class NoteModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._note = null;  // Note data
    this._isOpen = false;

    // Template dengan animasi styles
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1000;  /* Di atas semuanya */
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        :host(.open) {
          opacity: 1;
          visibility: visible;
        }

        .backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.3s ease;
          cursor: pointer;  /* Close on click */
        }

        :host(.open) .backdrop {
          opacity: 1;
        }

        .modal-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0.8);
          background: var(--yellow, #f8f7ba);
          padding: 2.5rem;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);  /* Deep shadow */
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          opacity: 0;
          transition: transform 0.3s ease, opacity 0.3s ease;
          border: 1px solid rgba(163, 204, 218, 0.3);
        }

        :host(.open) .modal-content {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(163, 204, 218, 0.2);
        }

        h2 {
          font-size: 1.5rem;
          color: var(--text-dark, #333);
          margin: 0;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--text-light, #555);
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.3s ease;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: rgba(220, 53, 69, 0.1);
          color: #dc3545;
          transform: scale(1.1);
        }

        .body {
          font-size: 1.1rem;
          color: var(--text-light, #555);
          line-height: 1.7;
          white-space: pre-line;
          margin-bottom: 1.5rem;
          padding-right: 1rem;  /* Space untuk scroll */
        }

        .date {
          font-size: 0.9rem;
          color: var(--text-light, #555);
          font-style: italic;
          margin-bottom: 1.5rem;
          display: block;
        }

        .buttons {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.3s ease;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 100px;
        }

        .edit { background: var(--green, #bde3c3); color: #fff; }
        .delete { background: #dc3545; color: #fff; }
        .archive { background: var(--blue, #a3ccda); color: #fff; }

        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        /* Mobile: Full width */
        @media (max-width: 768px) {
          .modal-content {
            width: 95%;
            padding: 1.5rem;
            max-height: 90vh;
          }

          .buttons {
            flex-direction: column;
          }

          button {
            width: 100%;
          }
        }

        /* Scrollbar Custom (opsional smooth) */
        .modal-content::-webkit-scrollbar {
          width: 6px;
        }

        .modal-content::-webkit-scrollbar-track {
          background: rgba(163, 204, 218, 0.1);
          border-radius: 10px;
        }

        .modal-content::-webkit-scrollbar-thumb {
          background: var(--blue, #a3ccda);
          border-radius: 10px;
        }
      </style>

      <div class="backdrop"></div>
      <div class="modal-content" role="dialog" aria-labelledby="modal-title">
        <div class="header">
          <h2 id="modal-title">Note Detail</h2>
          <button class="close-btn" aria-label="Tutup">&times;</button>
        </div>
        <p class="body" id="modal-body"></p>
        <small class="date" id="modal-date"></small>
        <div class="buttons">
          <button class="edit">Edit</button>
          <button class="delete">Hapus</button>
          <button class="archive">Arsip</button>
        </div>
      </div>
    `;

    console.log('NoteModal: Constructor - Shadow created');
  }

  connectedCallback() {
    console.log('NoteModal: connectedCallback');

    const backdrop = this.shadowRoot.querySelector('.backdrop');
    const closeBtn = this.shadowRoot.querySelector('.close-btn');
    const editBtn = this.shadowRoot.querySelector('.edit');
    const deleteBtn = this.shadowRoot.querySelector('.delete');
    const archiveBtn = this.shadowRoot.querySelector('.archive');
    const bodyEl = this.shadowRoot.querySelector('#modal-body');
    const dateEl = this.shadowRoot.querySelector('#modal-date');
    const titleEl = this.shadowRoot.querySelector('h2');

    if (!backdrop || !closeBtn) {
      console.error('NoteModal: Elements missing');
      return;
    }

    // Close events
    const closeModal = () => {
      this._isOpen = false;
      this.classList.remove('open');
      this._note = null;  // Clear data
      console.log('NoteModal: Closed');
    };

    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // ESC key close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isOpen) {
        closeModal();
      }
    });

    // Button events (dispatch ke parent)
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._note) {
          this.dispatchEvent(new CustomEvent('editNote', {
            detail: this._note,
            bubbles: true,
            composed: true
          }));
        }
        closeModal();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._note && confirm('Yakin hapus note ini?')) {
          this.dispatchEvent(new CustomEvent('noteDeleted', {
            detail: { id: this._note.id },
            bubbles: true,
            composed: true
          }));
        }
        closeModal();
      });
    }

    if (archiveBtn) {
      archiveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._note) {
          this.dispatchEvent(new CustomEvent('noteArchived', {
            detail: { id: this._note.id, archived: !this._note.archived },
            bubbles: true,
            composed: true
          }));
        }
        closeModal();
      });
    }

    // Render jika note ada
    if (this._note) {
      this.render();
      this.open();
    }
  }

  // Setter
  set note(newNote) {
    this._note = newNote;
    console.log('NoteModal: Setter - Note set, ID:', newNote?.id);
    if (this.isConnected && this.shadowRoot) {
      this.render();
      this.open();
    }
  }

  // Open modal
  open() {
    this._isOpen = true;
    this.classList.add('open');
  }

  // Render content
  render() {
    if (!this._note) return;

    const titleEl = this.shadowRoot.querySelector('h2');
    const bodyEl = this.shadowRoot.querySelector('#modal-body');
    const dateEl = this.shadowRoot.querySelector('#modal-date');
    const archiveBtn = this.shadowRoot.querySelector('.archive');

    if (titleEl) titleEl.textContent = this._note.title || 'Untitled';
    if (bodyEl) bodyEl.textContent = this._note.body || '';
    if (dateEl) {
      dateEl.textContent = `Dibuat: ${new Date(this._note.createdAt).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })}`;
    }
    if (archiveBtn) {
      archiveBtn.textContent = this._note.archived ? 'Unarsip' : 'Arsip';
    }

    console.log('NoteModal: Render success');
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._escHandler);  // Cleanup
  }
}

customElements.define('note-modal', NoteModal);