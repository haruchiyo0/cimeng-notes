class NoteItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._note = null;

    // Template (hilangkan expand CSS, keep truncate preview)
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block !important;
          background: var(--white, #fff);
          padding: 1.75rem;
          border-radius: 24px;
          border: 1px solid rgba(163, 204, 218, 0.2);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          opacity: 1 !important;
          transform: none !important;
          visibility: visible !important;
          min-height: 200px;
          transition: all 0.3s ease, transform 0.3s ease;  /* Smooth hover */
          word-wrap: break-word;
          position: relative;
          overflow: hidden;
          margin: 0;
          cursor: pointer;  /* Hint klik untuk view */
        }

        :host::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(to bottom, #a3ccda, #bde3c3);
          transition: background 0.3s ease;
        }

        :host:hover {
          transform: translateY(-4px) scale(1.02);  /* Smooth lift + slight scale */
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.10);
          border-color: #a3ccda;
        }

        :host:hover::before {
          width: 6px;  /* Accent line lebih tebal on hover */
        }

        /* Force inner visible */
        h3, p, small, .buttons {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }

        h3#title {
          margin: 0 0 1rem 0;
          font-size: 1.2rem;
          font-weight: 600;
          color: #333;
          cursor: default;
          transition: color 0.3s ease;
        }

        :host:hover h3#title {
          color: #a3ccda;  /* Blue tint on hover */
        }

        /* PREVIEW: Truncate 3 baris (tetap) */
        p#body {
          font-size: 1rem;
          color: #555;
          margin-bottom: 1.25rem;
          line-height: 1.6;
          white-space: pre-line;
          max-height: 4.8em;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          transition: color 0.3s ease;
          cursor: pointer !important;
        }

        :host:hover p#body {
          color: #333;  /* Darker on hover */
        }

        p#body::after {
          content: ' ...lihat detail';  /* Hint lebih jelas */
          color: #a3ccda;
          font-style: italic;
          font-size: 0.9rem;
        }

        small#date {
          font-size: 0.85rem;
          color: #555;
          display: block;
          margin-bottom: 1.25rem;
          cursor: default;
          transition: color 0.3s ease;
        }

        :host:hover small#date {
          color: #a3ccda;
        }

        .buttons {
          display: flex !important;
          gap: 0.75rem;
          margin-top: auto;
          opacity: 1 !important;
          transition: opacity 0.3s ease;
        }

        button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          font-weight: 500;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          opacity: 1 !important;
          visibility: visible !important;
        }

        .edit { background: #bde3c3; color: #fff; }
        .delete { background: #dc3545; color: #fff; }
        .archive { background: #f8f7ba; color: #333; }

        button:hover {
          transform: scale(1.05) translateY(-2px);  /* Glow lift */
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Archived */
        :host(.archived) {
          opacity: 0.7;
          background: color-mix(in srgb, #fff 90%, #f8f7ba);
        }

        :host(.archived)::before {
          background: linear-gradient(to bottom, #f8f7ba, #f0c14b);
        }

        /* Animasi entry */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        :host {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      </style>

      <h3 id="title">Untitled</h3>
      <p id="body"></p>
      <small id="date"></small>
      <div class="buttons">
        <button class="edit">Edit</button>
        <button class="delete">Hapus</button>
        <button class="archive">Arsip</button>
      </div>
    `;

    console.log('NoteItem: Constructor - Shadow created with preview styles');
  }

  connectedCallback() {
    console.log('NoteItem: connectedCallback - DOM ready');

    // Query elements
    const editBtn = this.shadowRoot.querySelector('.edit');
    const deleteBtn = this.shadowRoot.querySelector('.delete');
    const archiveBtn = this.shadowRoot.querySelector('.archive');
    const titleEl = this.shadowRoot.querySelector('#title');
    const bodyEl = this.shadowRoot.querySelector('#body');
    const dateEl = this.shadowRoot.querySelector('#date');

    console.log('NoteItem: Elements found?', { editBtn: !!editBtn, bodyEl: !!bodyEl });

    if (!editBtn || !bodyEl) {
      console.error('NoteItem: Critical elements missing!');
      return;
    }

    // Event listeners untuk buttons (stopPropagation untuk ga trigger view)
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('NoteItem: Edit clicked for ID:', this._note?.id);
      this.dispatchEvent(new CustomEvent('editNote', {
        detail: this._note,
        bubbles: true,
        composed: true
      }));
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Yakin hapus note ini?')) {
        console.log('NoteItem: Delete clicked for ID:', this._note?.id);
        this.dispatchEvent(new CustomEvent('noteDeleted', {
          detail: { id: this._note.id },
          bubbles: true,
          composed: true
        }));
      }
    });

    archiveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('NoteItem: Archive clicked for ID:', this._note?.id);
      this.dispatchEvent(new CustomEvent('noteArchived', {
        detail: { id: this._note.id, archived: !this._note?.archived },
        bubbles: true,
        composed: true
      }));
    });

    // VIEW: Click body atau seluruh host untuk buka modal
    const openModal = (e) => {
      e.stopPropagation();  // Jika dari child
      console.log('NoteItem: View clicked for ID:', this._note?.id);
      this.dispatchEvent(new CustomEvent('viewNote', {
        detail: this._note,
        bubbles: true,
        composed: true
      }));
    };

    // Attach ke body (utama) & host (fallback)
    if (bodyEl) {
      bodyEl.addEventListener('click', openModal);
    }
    this.addEventListener('click', openModal);  // Seluruh card clickable

    // Render jika note ada
    if (this._note) {
      this.render();
      console.log('NoteItem: Render triggered in connectedCallback for ID:', this._note.id);
    }
  }

  // Setter
  set note(newNote) {
    this._note = newNote;
    console.log('NoteItem: Setter called with note ID:', newNote?.id);
    if (this.isConnected && this.shadowRoot) {
      this.render();
    }
  }

  get note() {
    return this._note;
  }

  // Render
  render() {
    if (!this._note) {
      console.warn('NoteItem: Render called without note');
      return;
    }

    const titleEl = this.shadowRoot.querySelector('#title');
    const bodyEl = this.shadowRoot.querySelector('#body');
    const dateEl = this.shadowRoot.querySelector('#date');
    const archiveBtn = this.shadowRoot.querySelector('.archive');

    if (!titleEl || !bodyEl || !dateEl) {
      console.error('NoteItem: Render elements missing!');
      return;
    }

    // Update content
    titleEl.textContent = this._note.title || 'Untitled';
    bodyEl.textContent = this._note.body || '';
    dateEl.textContent = new Date(this._note.createdAt).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'short', day: 'numeric'
    });

    // Toggle archived
    if (this._note.archived) {
      this.classList.add('archived');
      if (archiveBtn) archiveBtn.textContent = 'Unarsip';
    } else {
      this.classList.remove('archived');
      if (archiveBtn) archiveBtn.textContent = 'Arsip';
    }

    console.log('NoteItem: Render success - Title:', titleEl.textContent, 'Body length:', bodyEl.textContent.length);
  }

  disconnectedCallback() {
    console.log('NoteItem: Disconnected');
  }
}

customElements.define('note-item', NoteItem);