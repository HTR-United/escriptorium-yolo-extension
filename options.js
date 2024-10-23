document.getElementById('model-files').addEventListener('change', async (event) => {
  const files = Array.from(event.target.files);
  console.log('Files selected:', files);
  
  const statusMessage = document.getElementById('status-message');
  
  if (files.length > 0) {
    showStatusMessage(statusMessage, 'info', 'Files selected, attempting to load the model...');
    const modelName = prompt("Please enter a name for this model:", files[0].webkitRelativePath.split('/')[0]);
    if (modelName) {
      await loadModelFromFiles(files, modelName);
      //update the displayed list after saving
      await displaySavedModels();  
    } else {
      showStatusMessage(statusMessage, 'danger', 'Model name is required to save.');
    }
  }
});

function showStatusMessage(element, type, message) {
  element.style.display = 'block';
  element.className = `alert alert-${type}`;
  element.textContent = message;
}

async function loadModelFromFiles(files, modelName) {
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
    
    await saveModelToIndexedDB(files, modelName);
    showStatusMessage(statusMessage, 'success', 'Model saved in IndexedDB. You can now use it in the popup.');
  } catch (error) {
    console.error('Error loading model:', error);
    showStatusMessage(statusMessage, 'danger', `Error loading model: ${error.message}`);
  }
}

async function saveModelToIndexedDB(files, modelName) {
  try {
    const db = await initializeIndexedDB();

    if (!db.objectStoreNames.contains('modelFilesStore')) {
      console.error('Object store not found.');
      return;
    }

    const transaction = db.transaction('modelFilesStore', 'readwrite');
    const store = transaction.objectStore('modelFilesStore');
    
    console.log('Saving files to IndexedDB:', files);
    // added the modelname as attribute to files in indexedDB
    files.forEach(file => {
      const fileData = {
        name: file.name,
        content: file,
        modelName 
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


async function displaySavedModels() {
  const modelList = document.getElementById('model-list');
   // clear list before displaying
  modelList.innerHTML = ''; 
  
  const db = await initializeIndexedDB();
  const transaction = db.transaction('modelFilesStore', 'readonly');
  const store = transaction.objectStore('modelFilesStore');
  const request = store.getAll();

  request.onsuccess = () => {
    // get unique model names
    const models = [...new Set(request.result.map(file => file.modelName))];  
    models.forEach(model => {
      const listItem = document.createElement('li');
      
      const modelInput = document.createElement('input');
      modelInput.type = 'text';
      modelInput.value = model;
      modelInput.classList.add('form-control', 'd-inline');
      modelInput.style.width = '200px';
      
      // save button
      const saveButton = document.createElement('button');
      saveButton.textContent = 'Save';
      saveButton.classList.add('btn', 'btn-sm', 'btn-primary', 'mx-2');
      saveButton.onclick = async () => {
        const newName = modelInput.value;
        await updateModelName(model, newName);
        await displaySavedModels();  // refresh list after delete
      };

      // delete button
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.classList.add('btn', 'btn-sm', 'btn-danger');
      deleteButton.onclick = async () => {
        await deleteModel(model);
        await displaySavedModels();  // refresh after delete
      };

      listItem.appendChild(modelInput);
      listItem.appendChild(saveButton);
      listItem.appendChild(deleteButton);
      modelList.appendChild(listItem);
    });
  };
}

async function updateModelName(oldName, newName) {
  const db = await initializeIndexedDB();
  const transaction = db.transaction('modelFilesStore', 'readwrite');
  const store = transaction.objectStore('modelFilesStore');
  
  const files = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(file => file.modelName === oldName));
    request.onerror = () => reject(request.error);
  });

  files.forEach(file => {
    store.put({ ...file, modelName: newName });
  });
  
  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  console.log(`Model name updated from "${oldName}" to "${newName}"`);
}

async function deleteModel(modelName) {
  const db = await initializeIndexedDB();
  const transaction = db.transaction('modelFilesStore', 'readwrite');
  const store = transaction.objectStore('modelFilesStore');
  
  const files = await new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(file => file.modelName === modelName));
    request.onerror = () => reject(request.error);
  });

  files.forEach(file => store.delete(file.name));

  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  console.log(`Model "${modelName}" deleted from IndexedDB`);
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


document.addEventListener('DOMContentLoaded', async () => {
  await displaySavedModels();
});
