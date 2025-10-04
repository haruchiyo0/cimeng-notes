// Import custom elements
import './components/note-item.js';
import './components/note-modal.js';  // Untuk popup view note
import './components/note-form.js';   // Untuk form tambah/edit (updated)
import './components/loading-indicator.js';  // Untuk spinner loading

// Global state
let db = null;
let notes = [];  // Array notes dari DB
let currentFilter = 'all';  // Filter state: 'all', 'active', 'archived'
let searchTerm = '';  // Search state

// DOM Elements
const appBar = document.querySelector('app-bar');  // Optional, jika ada app-bar component
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const notesContainer = document.getElementById('notesContainer');
const notesCount = document.getElementById('notesCount');
const addNoteFAB = document.getElementById('addNoteFAB');
const addNoteForm = document.getElementById('addNoteForm');
const closeFormBtn = document.getElementById('closeFormBtn');
const loadingIndicator = document.getElementById('loadingIndicator');

// Disable FAB awal sampai DB siap (prevent submit sebelum init)
if (addNoteFAB) {
  addNoteFAB.disabled = true;
  addNoteFAB.style.opacity = '0.5';  // Visual feedback
  addNoteFAB.title = 'Loading...';  // Tooltip
}

// Buat modal element (append ke body sekali, hidden awal)
const noteModal = document.createElement('note-modal');
noteModal.id = 'noteModal';
noteModal.style.display = 'none';
document.body.appendChild(noteModal);

// IndexedDB Setup
const DB_NAME = 'CimengNotesDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (e) => {
      db = e.target.result;
      console.log('IndexedDB upgrade needed');
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('archived', 'archived', { unique: false });
        store.createIndex('title', 'title', { unique: false });
        console.log('Object store created');
      }
    };
  });
}

// CRUD Functions (semua dengan timeout & force showLoading(false))
async function getNotes() {
  showLoading(true);
  console.log('getNotes: Starting...');
  
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: Gagal load notes')), 5000)
  );
  
  return Promise.race([
    new Promise((resolve, reject) => {
      if (!db) {
        console.error('getNotes: DB not initialized');
        showLoading(false);
        return reject('DB not initialized');
      }
      
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        notes = request.result.map(note => ({
          ...note,
          createdAt: note.createdAt || new Date().toISOString()
        }));
        console.log('getNotes: Loaded', notes.length, 'notes');
        showLoading(false);
        resolve(notes);
      };

      request.onerror = () => {
        console.error('getNotes: Request error:', request.error);
        showLoading(false);
        reject(request.error);
      };
    }),
    timeout
  ]);
}

async function addNote(noteData) {
  showLoading(true);
  console.log('addNote: Starting with data:', noteData);
  
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: Gagal simpan, coba lagi')), 10000)
  );
  
  return Promise.race([
    new Promise((resolve, reject) => {
      if (!db) {
        console.error('addNote: DB not initialized');
        showLoading(false);
        return reject('DB not initialized');
      }
      
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const note = {
        ...noteData,
        createdAt: new Date().toISOString(),
        archived: false
      };
      console.log('addNote: Adding note to store:', note);
      
      const request = store.add(note);
      request.onsuccess = () => {
        console.log('addNote: Success, ID:', request.result);
        showLoading(false);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('addNote: Request error:', request.error);
        showLoading(false);
        reject(request.error);
      };
      
      transaction.onerror = () => {
        console.error('addNote: Transaction error:', transaction.error);
        showLoading(false);
        reject(transaction.error);
      };
    }),
    timeout
  ]);
}

async function updateNote(id, updates) {
  showLoading(true);
  console.log('updateNote: Starting ID:', id, 'updates:', updates);
  
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: Gagal update, coba lagi')), 10000)
  );
  
  return Promise.race([
    new Promise((resolve, reject) => {
      if (!db) {
        console.error('updateNote: DB not initialized');
        showLoading(false);
        return reject('DB not initialized');
      }
      
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        if (!getRequest.result) {
          showLoading(false);
          return reject('Note not found');
        }
        const note = { ...getRequest.result, ...updates };
        const putRequest = store.put(note);
        
        putRequest.onsuccess = () => {
          console.log('updateNote: Success');
          showLoading(false);
          resolve(note);
        };
        putRequest.onerror = () => {
          console.error('updateNote: Put error:', putRequest.error);
          showLoading(false);
          reject(putRequest.error);
        };
      };
      getRequest.onerror = () => {
        console.error('updateNote: Get error:', getRequest.error);
        showLoading(false);
        reject(getRequest.error);
      };
      
      transaction.onerror = () => {
        console.error('updateNote: Transaction error:', transaction.error);
        showLoading(false);
        reject(transaction.error);
      };
    }),
    timeout
  ]);
}

async function deleteNote(id) {
  showLoading(true);
  console.log('deleteNote: Starting ID:', id);
  
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: Gagal hapus, coba lagi')), 5000)
  );
  
  return Promise.race([
    new Promise((resolve, reject) => {
      if (!db) {
        console.error('deleteNote: DB not initialized');
        showLoading(false);
        return reject('DB not initialized');
      }
      
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('deleteNote: Success');
        showLoading(false);
        resolve();
      };
      request.onerror = () => {
        console.error('deleteNote: Error:', request.error);
        showLoading(false);
        reject(request.error);
      };
    }),
    timeout
  ]);
}

// UI Functions
function showLoading(show) {
  console.log('showLoading:', show);  // Debug
  if (loadingIndicator) {
    loadingIndicator.classList.toggle('active', show);
  } else {
    console.warn('Loading indicator not found!');
  }
}

function updateNotesCount(count) {
  if (notesCount) {
    notesCount.textContent = `${count} notes`;
  }
}

function getFilteredNotes() {
  let filtered = [...notes];

  // Filter by archived
  if (currentFilter === 'active') {
    filtered = filtered.filter(note => !note.archived);
  } else if (currentFilter === 'archived') {
    filtered = filtered.filter(note => note.archived);
  }

  // Filter by search
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(note =>
      note.title.toLowerCase().includes(term) ||
      note.body.toLowerCase().includes(term)
    );
  }

  return filtered;
}

function renderNotes(filteredNotes = getFilteredNotes()) {
  if (!notesContainer) return;  // Safety check

  notesContainer.innerHTML = '';  // Clear

  if (filteredNotes.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = currentFilter === 'archived' ? 'Belum ada notes arsip' :
                          searchTerm ? `Tidak ditemukan "${searchTerm}"` : 'Belum ada notes';
    emptyMsg.style.gridColumn = '1 / -1';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.color = 'var(--text-light, #666)';
    emptyMsg.style.fontSize = '1.1rem';
    emptyMsg.style.padding = '2rem';
    notesContainer.appendChild(emptyMsg);
    updateNotesCount(0);
    return;
  }

  filteredNotes.forEach((note, index) => {
    const noteItem = document.createElement('note-item');
    noteItem.note = note;
    noteItem.style.animationDelay = `${index * 0.1}s`;  // Stagger animasi
    notesContainer.appendChild(noteItem);
  });

  updateNotesCount(filteredNotes.length);
  console.log(`Index: Rendered ${filteredNotes.length} notes (filter: ${currentFilter}, search: "${searchTerm}")`);
}

// Form Functions (updated: resetForm() untuk re-enable button)
function showForm(note = null) {
  if (!addNoteForm) return;
  addNoteForm.classList.remove('hidden');
  const noteForm = addNoteForm.querySelector('note-form');
  if (noteForm) {
    noteForm.note = note;  // Pass note untuk edit mode (match setter di note-form)
  }
  document.body.classList.add('modal-open');  // Lock scroll
  console.log('Index: Showing form (edit mode:', !!note, ')');
}

function hideForm() {
  if (!addNoteForm) return;
  addNoteForm.classList.add('hidden');
  const noteForm = addNoteForm.querySelector('note-form');
  if (noteForm && typeof noteForm.resetForm === 'function') {
    noteForm.resetForm();  // Full reset: clear + re-enable button + add mode
  }
  showLoading(false);  // Force hide loading jika ada
  document.body.classList.remove('modal-open');
  console.log('Index: Hiding form & resetting');
}

// Event Listeners
// FAB: Show add form (tapi FAB disabled sampai init selesai)
if (addNoteFAB) {
  addNoteFAB.addEventListener('click', () => {
    if (!db) {
      alert('Database belum siap, tunggu sebentar.');
      return;
    }
    showForm();
    console.log('Index: FAB clicked - Show add form');
  });
}

// Close form (button & outside click)
if (closeFormBtn) {
  closeFormBtn.addEventListener('click', hideForm);
}
if (addNoteForm) {
  addNoteForm.addEventListener('click', (e) => {
    if (e.target === addNoteForm) hideForm();  // Click outside to close
  });
}

// Form submit (unified listener untuk add/edit dari note-form, dengan cek DB)
document.addEventListener('noteFormSubmit', async (e) => {
  console.log('Index: noteFormSubmit received, detail:', e.detail);  // Debug: Cek data
  console.log('noteFormSubmit event received, DB ready:', !!db);  // Debug: Status DB
  
  const noteForm = addNoteForm ? addNoteForm.querySelector('note-form') : null;  // Akses form untuk reset button
  
  // Cek DB siap (fix utama untuk error "DB not initialized")
  if (!db) {
    console.error('Index: DB not ready - aborting submit');
    if (noteForm && typeof noteForm.resetAfterSubmit === 'function') {
      noteForm.resetAfterSubmit(false);  // Re-enable button tanpa clear
    }
    showLoading(false);
    alert('Database belum siap, coba beberapa saat lagi atau reload halaman.');
    return;
  }
  
  if (!e.detail || !e.detail.title || !e.detail.body) {
    console.error('Index: Invalid form data');
    if (noteForm && typeof noteForm.resetAfterSubmit === 'function') {
      noteForm.resetAfterSubmit(false);  // Re-enable button tanpa clear (biar user edit ulang)
    }
    showLoading(false);
    alert('Form tidak lengkap! Pastikan judul dan isi diisi.');
    return;
  }
  
  try {
    const { id, ...noteData } = e.detail;
    let result;
    if (id) {
      // Edit mode
      result = await updateNote(id, noteData);
      console.log('Index: Note updated, ID:', id);
    } else {
      // Add mode
      result = await addNote(noteData);
      console.log('Index: Note added, ID:', result);
    }
    
    await getNotes();  // Refresh full data dari DB
    renderNotes();
    if (noteForm && typeof noteForm.resetAfterSubmit === 'function') {
      noteForm.resetAfterSubmit(true);  // Re-enable button setelah success
    }
    hideForm();  // Ini akan panggil resetForm() untuk full clear
  } catch (error) {
    console.error('Index: noteFormSubmit error:', error);
    if (noteForm && typeof noteForm.resetAfterSubmit === 'function') {
      noteForm.resetAfterSubmit(false);  // Re-enable button pada error
    }
    showLoading(false);  // Force hide loading
    alert('Gagal simpan note: ' + (error.message || 'Coba lagi nanti'));
  }
});

// Search: Real-time
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderNotes();
    console.log('Index: Search updated:', searchTerm);
  });
}

// Filters: Switch active class & re-render
if (filterBtns.length > 0) {
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderNotes();
      console.log('Index: Filter changed to:', currentFilter);
    });
  });
}

// Event Delegation untuk note-item actions (asumsi components dispatch ini)
document.addEventListener('viewNote', (e) => {
  console.log('Index: viewNote received, ID:', e.detail?.id);
  const note = notes.find(n => n.id === e.detail.id);
  if (note) {
    noteModal.note = note;  // Set ke modal → auto open & render
    noteModal.style.display = 'block';
    document.body.classList.add('modal-open');  // Lock scroll
  }
});

document.addEventListener('editNote', (e) => {
  console.log('Index: editNote received, ID:', e.detail?.id);
  const note = notes.find(n => n.id === e.detail.id);
  if (note) {
    showForm(note);  // Buka form dengan note data
  }
  if (noteModal) {
    noteModal.note = null;  // Close modal jika open
    noteModal.style.display = 'none';
  }
  document.body.classList.remove('modal-open');
});

document.addEventListener('noteDeleted', async (e) => {
  console.log('Index: noteDeleted received, ID:', e.detail.id);
  if (!confirm('Hapus note ini?')) return;
  
  try {
    await deleteNote(e.detail.id);
    await getNotes();  // Refresh
    renderNotes();
    if (noteModal) {
      noteModal.note = null;  // Close modal
      noteModal.style.display = 'none';
    }
    document.body.classList.remove('modal-open');
  } catch (error) {
    console.error('Index: Delete error:', error);
    showLoading(false);
    alert('Gagal hapus note: ' + error.message);
  }
});

document.addEventListener('noteArchived', async (e) => {
  console.log('Index: noteArchived received, ID:', e.detail.id, 'archived:', e.detail.archived);
  try {
    await updateNote(e.detail.id, { archived: e.detail.archived });
    await getNotes();  // Refresh
    renderNotes();
    if (noteModal) noteModal.note = null;  // Close modal
    document.body.classList.remove('modal-open');
  } catch (error) {
    console.error('Index: Archive error:', error);
    showLoading(false);
    alert('Gagal update arsip: ' + error.message);
  }
});

// Modal close (custom event dari note-modal)
document.addEventListener('modalClosed', () => {
  console.log('Index: Modal closed');
  if (noteModal) noteModal.note = null;
  document.body.classList.remove('modal-open');
});

// Init App (handle DOM ready)
// Fungsi inisialisasi aplikasi
async function initApp() {
  try {
    showLoading(true);
    await initDB();
    await getNotes();
    renderNotes();

    // Enable FAB setelah DB siap
    if (addNoteFAB) {
      addNoteFAB.disabled = false;
      addNoteFAB.style.opacity = '1';
      addNoteFAB.title = 'Tambah Note';
    }

    console.log('App initialized successfully');
  } catch (error) {
    console.error('App initialization failed:', error);
    alert('Gagal inisialisasi aplikasi. Coba reload halaman.');
  } finally {
    showLoading(false);
  }
}

// Jalankan initApp saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});