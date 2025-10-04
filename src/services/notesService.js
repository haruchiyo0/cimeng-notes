// src/services/notesService.js
let db;
let dbReadyResolve;
let dbReadyReject;
const dbReady = new Promise((resolve, reject) => {
  dbReadyResolve = resolve;
  dbReadyReject = reject;
});

const request = indexedDB.open('notesDB', 1);

request.onerror = (e) => {
  console.error('Database failed to open:', e.target.error);
  dbReadyReject(new Error('Gagal buka database'));
};

request.onsuccess = (e) => {
  db = e.target.result;
  console.log('DB opened successfully');
  dbReadyResolve(db);  // Resolve promise setelah DB ready
};

request.onupgradeneeded = (e) => {
  db = e.target.result;
  console.log('DB upgrading...');
  if (!db.objectStoreNames.contains('notes')) {
    const store = db.createObjectStore('notes', { keyPath: 'id' });
    // Index untuk search/filter (opsional, untuk performa)
    store.createIndex('createdAt', 'createdAt', { unique: false });
    store.createIndex('archived', 'archived', { unique: false });
  }
  dbReadyResolve(db);  // Resolve juga di upgrade
};

// Helper: Tunggu DB ready di setiap fungsi
async function waitForDB() {
  if (!db) {
    await dbReady;
  }
  if (!db) {
    throw new Error('DB still not ready after wait');
  }
}

export async function getFilteredNotes(filter = 'all', search = '') {
  await waitForDB();  // Tunggu DB ready
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');
    const req = store.getAll();
    req.onsuccess = () => {
      let notes = req.result || [];
      console.log('Service: Raw notes from DB:', notes.length);  // Log sementara
      // Filter archived
      if (filter === 'active') notes = notes.filter(n => !n.archived);
      if (filter === 'archived') notes = notes.filter(n => n.archived);
      // Search title/body (case-insensitive)
      if (search.trim()) {
        const lowerSearch = search.toLowerCase();
        notes = notes.filter(n =>
          n.title.toLowerCase().includes(lowerSearch) ||
          n.body.toLowerCase().includes(lowerSearch)
        );
      }
      console.log('Service: Filtered notes:', notes.length);  // Log
      resolve(notes);
    };
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function addNote({ title, body }) {
  await waitForDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    const note = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: title.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString(),
      archived: false
    };
    console.log('Service: Adding note:', note.id);  // Log sementara
    const req = store.add(note);
    req.onsuccess = () => {
      console.log('Service: Note added, ID:', note.id);
      resolve(note);
    };
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateNote({ id, title, body }) {
  await waitForDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (!getReq.result) return reject(new Error('Note not found'));
      const note = getReq.result;
      note.title = title.trim();
      note.body = body.trim();
      const updateReq = store.put(note);
      updateReq.onsuccess = () => {
        console.log('Service: Note updated, ID:', id);
        resolve(note);
      };
      updateReq.onerror = () => reject(updateReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteNote(id) {
  await waitForDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    const req = store.delete(id);
    req.onsuccess = () => {
      console.log('Service: Note deleted, ID:', id);
      resolve();
    };
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function toggleArchive(id, currentArchived) {
  await waitForDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (!getReq.result) return reject(new Error('Note not found'));
      const note = getReq.result;
      note.archived = !currentArchived;
      const updateReq = store.put(note);
      updateReq.onsuccess = () => {
        console.log('Service: Archive toggled for ID:', id, 'new state:', note.archived);
        resolve(note);
      };
      updateReq.onerror = () => reject(updateReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.onerror = () => reject(tx.error);
  });
}

// Export notes (current filter/search - tapi butuh pass params)
export async function exportNotes(filter = 'all', search = '') {
  const notes = await getFilteredNotes(filter, search);
  const dataStr = JSON.stringify(notes, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `notes-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('Service: Notes exported:', notes.length);
}

// Export dbReady untuk initial load (opsional, jika index.js butuh)
export { dbReady };