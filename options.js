// import * as tf from '@tensorflow/tfjs';
// import '@tensorflow/tfjs-backend-webgl';
// import '@tensorflow/tfjs-backend-cpu';

document.getElementById('model-files').addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);
  console.log('Files selected:', files);
    if (files.length > 0) {
      await loadModelFromFiles(files);
    }
  });
  
  async function loadModelFromFiles(files) {
    const modelFile = files.find(file => file.name.endsWith('model.json'));
    const weightFiles = files.filter(file => file.name.endsWith('.bin'));
  
    if (!modelFile || weightFiles.length === 0) {
      document.getElementById('status-message').textContent = 'Model file or weight files are missing';
      return;
    }
  
    try {
      //const model = await tf.loadGraphModel(tf.io.browserFiles([modelFile, ...weightFiles]));
      //console.log('Model loaded:', model);
      document.getElementById('status-message').textContent = 'Model successfully loaded. Saving to IndexedDB...';
      
      await saveModelToIndexedDB(files);
      console.log('Model saved in IndexedDB');
      document.getElementById('status-message').textContent = 'Model saved in IndexedDB. You can now use it in the popup.';
    } catch (error) {
      console.error('Error loading model:', error);
      document.getElementById('status-message').textContent = `Error loading model: ${error.message}`;
    }
  }
  
  // Save the model to IndexedDB
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
  
  