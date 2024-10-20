
document.getElementById('model-files').addEventListener('change', async (event) => {
  const files = Array.from(event.target.files);
  console.log('Files selected:', files);
  
  const statusMessage = document.getElementById('status-message');
  
  if (files.length > 0) {
    showStatusMessage(statusMessage, 'info', 'Files selected, attempting to load the model...');
    await loadModelFromFiles(files);
  }
});

function showStatusMessage(element, type, message) {
  element.style.display = 'block';
  element.className = `alert alert-${type}`;
  element.textContent = message;
}

async function loadModelFromFiles(files) {
  const modelFile = files.find(file => file.name.endsWith('model.json'));
  const weightFiles = files.filter(file => file.name.endsWith('.bin'));

  const statusMessage = document.getElementById('status-message');

  if (!modelFile || weightFiles.length === 0) {
    showStatusMessage(statusMessage, 'danger', 'Model file or weight files are missing.');
    return;
  }

  try {
    
    console.log('Model loaded:', modelFile);

    showStatusMessage(statusMessage, 'success', 'Model successfully loaded. Saving to IndexedDB...');
    
    await saveModelToIndexedDB(files);
    showStatusMessage(statusMessage, 'success', 'Model saved in IndexedDB. You can now use it in the popup.');
  } catch (error) {
    console.error('Error loading model:', error);
    showStatusMessage(statusMessage, 'danger', `Error loading model: ${error.message}`);
  }
}


async function saveModelToIndexedDB(files) {
  try {
    const db = await initializeIndexedDB();

    if (!db.objectStoreNames.contains('modelFilesStore')) {
      console.error('Object store not found.');
      return;
    }

    const transaction = db.transaction('modelFilesStore', 'readwrite');
    const store = transaction.objectStore('modelFilesStore');
    
    console.log('Saving files to IndexedDB:', files);

    files.forEach(file => {
      const fileData = {
        name: file.name,
        content: file
      };
      store.put(fileData);
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('Transaction complete, files saved.');
        resolve();
      };
      transaction.onerror = () => {
        console.error('Transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Error in saveModelToIndexedDB:', error);
  }
}

function initializeIndexedDB() {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open('modelFilesDB', 2); // Increment version to 2 or higher

    openRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('modelFilesStore')) {
        db.createObjectStore('modelFilesStore', { keyPath: 'name' });
        console.log('Object store "modelFilesStore" created.');
      }
    };

    openRequest.onsuccess = (event) => {
      const db = event.target.result;
      console.log('IndexedDB opened successfully');
      resolve(db);
    };

    openRequest.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}
