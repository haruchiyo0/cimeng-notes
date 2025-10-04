class NoteForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._note = null;  // Internal state untuk note (add/edit)
    
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        h2 {
          margin: 0 0 1.5rem 0;
          color: var(--text-dark, #333);
          font-size: 1.5rem;
          font-weight: 600;
          text-align: center;
        }
        
        form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        input, textarea {
          padding: 1rem 1.25rem;
          border: 2px solid var(--blue, #2196F3);
          border-radius: var(--border-radius, 8px);
          font-size: 1rem;
          background: var(--white, #fff);
          transition: all 0.3s ease;
          font-family: inherit;
        }
        
        input:focus, textarea:focus {
          border-color: var(--green, #4CAF50);
          box-shadow: 0 0 8px rgba(189, 227, 195, 0.3);
          outline: none;
        }
        
        textarea {
          resize: vertical;
          min-height: 120px;
        }
        
        button[type="submit"] {
          background: var(--green, #4CAF50);
          color: var(--white, #fff);
          border: none;
          padding: 1rem 1.5rem;
          border-radius: var(--border-radius, 8px);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-light, 0 2px 4px rgba(0,0,0,0.1));
        }
        
        button[type="submit"]:hover:not(:disabled) {
          background: color-mix(in srgb, var(--green, #4CAF50) 80%, #000);
          transform: scale(1.02);
        }
        
        button[type="submit"]:disabled {
          background: var(--text-light, #ccc);
          cursor: not-allowed;
          transform: none;
        }

        .error {
          color: #f44336;
          font-size: 0.9rem;
          margin-top: 0.25rem;
          display: none;
        }
      </style>
      
      <h2 id="formTitle">Tambah Note Baru</h2>
      <form id="form">
        <input type="text" id="titleInput" placeholder="Judul note" required maxlength="100" />
        <div class="error" id="titleError">Judul harus diisi!</div>
        
        <textarea id="bodyInput" placeholder="Isi note..." rows="4" maxlength="1000"></textarea>
        <div class="error" id="bodyError">Isi note harus diisi!</div>
        
        <button type="submit" id="submitBtn">Tambah Note</button>
      </form>
    `;

    // Query elements
    this.form = this.shadowRoot.querySelector('#form');
    this.titleInput = this.shadowRoot.querySelector('#titleInput');
    this.bodyInput = this.shadowRoot.querySelector('#bodyInput');
    this.submitBtn = this.shadowRoot.querySelector('#submitBtn');
    this.formTitle = this.shadowRoot.querySelector('#formTitle');
    this.titleError = this.shadowRoot.querySelector('#titleError');
    this.bodyError = this.shadowRoot.querySelector('#bodyError');

    // Event listener untuk submit
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Auto-focus title saat load
    this.titleInput.focus();
  }

  handleSubmit(e) {
    e.preventDefault();
    const title = this.titleInput.value.trim();
    const body = this.bodyInput.value.trim();

    // Validasi
    this.clearErrors();
    let valid = true;

    if (!title) {
      this.showError(this.titleError, 'Judul harus diisi!');
      this.titleInput.focus();
      valid = false;
    } else if (title.length < 3) {
      this.showError(this.titleError, 'Judul minimal 3 karakter!');
      valid = false;
    }

    if (!body) {
      this.showError(this.bodyError, 'Isi note harus diisi!');
      valid = false;
    } else if (body.length < 5) {
      this.showError(this.bodyError, 'Isi note minimal 5 karakter!');
      valid = false;
    }

    if (!valid) return;

    // Disable button & change text
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = this._note ? 'Menyimpan Perubahan...' : 'Menyimpan Note...';

    // Prepare data
    const noteData = { title, body };
    if (this._note && this._note.id) {
      noteData.id = this._note.id;  // Untuk edit
    }

    console.log('Form: Dispatching noteFormSubmit with:', noteData);  // Unified event name

    // Dispatch unified event ke parent (index.js)
    this.dispatchEvent(new CustomEvent('noteFormSubmit', {  // <-- Ganti ke unified 'noteFormSubmit'
      detail: noteData,
      bubbles: true,
      composed: true
    }));

    // JANGAN reset di sini - tunggu parent konfirmasi success via event atau direct
  }

  showError(errorEl, message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  clearErrors() {
    [this.titleError, this.bodyError].forEach(el => {
      el.style.display = 'none';
    });
  }

  // Setter: Ganti ke 'note' (match index.js)
  set note(note) {
    this._note = note;
    if (note && note.id) {
      // Edit mode
      this.formTitle.textContent = 'Edit Note';
      this.submitBtn.textContent = 'Simpan Perubahan';
      this.titleInput.value = note.title || '';
      this.bodyInput.value = note.body || '';
      this.clearErrors();
      console.log('Form: Set to edit mode for note ID:', note.id);
    } else {
      // Add mode
      this.resetForm();
    }
    this.titleInput.focus();  // Auto-focus
  }

  get note() {
    return this._note;
  }

  // Reset method: Fix ID query
  reset() {
    console.log('Form: Reset called (basic clear)');
    this.clearErrors();
    this.titleInput.value = '';
    this.bodyInput.value = '';
    this._note = null;
  }

  // Full reset to add mode (re-enable button, etc.)
  resetForm() {
    this.reset();  // Clear inputs
    this.formTitle.textContent = 'Tambah Note Baru';
    this.submitBtn.textContent = 'Tambah Note';
    this.submitBtn.disabled = false;
    this.clearErrors();
    console.log('Form: Reset to add mode');
  }

  // Method baru: Reset button setelah success (dipanggil dari parent via event)
  resetAfterSubmit(success = true) {
    this.submitBtn.disabled = false;
    if (success) {
      this.submitBtn.textContent = this._note ? 'Simpan Perubahan' : 'Tambah Note';
    } else {
      this.submitBtn.textContent = this._note ? 'Simpan Perubahan' : 'Tambah Note';
    }
    console.log('Form: Reset after submit (success:', success, ')');
  }
}

customElements.define('note-form', NoteForm);