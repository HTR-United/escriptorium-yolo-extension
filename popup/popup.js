import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

let model = null;
const inputSize = 960;
let ImageOriginalWidth = 0;
let ImageOriginalHeight = 0;

function displayMessage(message) {
  const statusMessages = document.getElementById('status-messages');
  statusMessages.innerHTML += `<p>${message} <span class="checkmark">&#10003;</span></p>`;
  statusMessages.scrollTop = statusMessages.scrollHeight;
}

async function initializeBackend() {
  try {
    await tf.setBackend('webgl');
    console.log('WebGL backend initialized');
  } catch (error) {
    await tf.setBackend('cpu');
    console.log('CPU backend initialized');
  }
  await tf.ready();
}

async function loadModelFromFiles(files) {
  const modelFile = files.find(file => file.name.endsWith('model.json'));
  const weightFiles = files.filter(file => file.name.endsWith('.bin'));

  if (!modelFile || weightFiles.length === 0) {
    console.error('Model file or weight files are missing');
    return null;
  }

  console.log('Loading model from selected files...');
  model = await tf.loadGraphModel(tf.io.browserFiles([modelFile, ...weightFiles]));
  console.log('Model loaded successfully');
  displayMessage('Model loaded successfully');
  document.getElementById('annotate-button').disabled = false;
}

document.getElementById('model-files').addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  loadModelFromFiles(files);
});

document.getElementById('get-current-image').addEventListener('click', () => {
  const apiToken = document.getElementById('api-token').value;
  if (!apiToken) {
    alert("Please enter your API token.");
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'annotate',
      apiToken,
      url: tabs[0].url
    });
  });
});

chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'ANNOTATION_RESULT') {
      displayMessage(request.data);
    } else if (request.action === 'imageURL') {
      const img = document.getElementById('selected-image');
      img.src = request.imageUrl;

      ImageOriginalWidth = request.originalSize[0];
      ImageOriginalHeight = request.originalSize[1];
      console.log('Original image size:', ImageOriginalWidth, ImageOriginalHeight); 
      console.log('Original image size:', request.originalSize[0], request.originalSize[1]); 
      img.onload = () => {
        displayMessage('Image loaded successfully');
        document.getElementById('toggle-image').style.display = 'inline';
        if (toggleButton.style.display === 'none' || toggleButton.style.display === '') {
            toggleButton.style.display = 'inline'; 
            toggleButton.textContent = 'Show Image'; 
        }

      };
    }
  });

  document.getElementById('toggle-image').addEventListener('click', (e) => {
    e.stopPropagation();    // Prevents parent handlers from executing
    e.preventDefault();     // Prevents any default action{
  const container = document.getElementById('expandable-image-container');
  const button = document.getElementById('toggle-image');
  
  if (container.style.display === 'none' || container.style.display === '') {
    container.style.display = 'block';
    button.textContent = 'Hide Image';
    //console.log("container.style.display", container.style.display);
  } else {
    container.style.display = 'none';
    button.textContent = 'Show Image';
    //console.log("container.style.display", container.style.display);
  }
});

document.getElementById('annotate-button').addEventListener('click', async () => {
    const img = document.getElementById('selected-image');
    if (img && model) {
      const imgTensor = tf.browser.fromPixels(img).toFloat();
      const resizedImgTensor = tf.image.resizeBilinear(imgTensor, [inputSize, inputSize]);
      const expandedImgTensor = resizedImgTensor.expandDims(0);
      console.log('Image tensor:', imgTensor);
      console.log('Resized image tensor:', resizedImgTensor);
      console.log('Expanded image tensor:', expandedImgTensor);
      console.log("originalWidth",ImageOriginalWidth,"originalHeight",ImageOriginalHeight);
      console.log("image",img);
      try {
        const predictions = await model.executeAsync(expandedImgTensor);
        console.log('Predictions:', predictions); 
        //exportPredictions(predictions);
        console.log("originalWidth",ImageOriginalWidth,"originalHeight",ImageOriginalHeight);
        const blocks = extractBoundingBoxes(predictions, 0.5,ImageOriginalWidth, ImageOriginalHeight); // Use original dimensions here
        
        const apiToken = document.getElementById('api-token').value;
        const { pageId, blocksUrl } = await getBlocksUrl();
        
        await createBlocks(apiToken, blocksUrl, pageId, blocks);
        displayMessage('Blocks added successfully!');
        
      } catch (error) {
        console.error('Error during model execution:', error);
        displayMessage(`Error during annotation: ${error.message}`);
      }
  
      imgTensor.dispose();
      resizedImgTensor.dispose();
      expandedImgTensor.dispose();
    }
  });

async function getBlocksUrl() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      const regex = /^(?<domain>https?:\/\/[^\/]+)\/document(?:s?)\/(?<document>\d+)\/parts?\/(?<page>\d+)\/edit\/?$/;
      const match = regex.exec(url);

      if (!match) {
        throw new Error('Invalid URL format.');
      }

      const { domain, document, page } = match.groups;
      resolve({ 
        pageId: page, 
        blocksUrl: `${domain}/api/documents/${document}/parts/${page}/blocks/` 
      });
    });
  });
}

function extractBoundingBoxes(predictions, confidenceThreshold = 0.5, originalWidth, originalHeight) {
  const boxes = [];
  const data = predictions.dataSync(); // Extract raw data as a flattened array
  const numDetections = predictions.shape[2]; // Number of detections (18900)
  const numClasses = predictions.shape[1] - 4; // Subtract 4 for the bounding box attributes

  // Offsets for bounding box attributes in the flattened array
  const x_center_offset = 0;
  const y_center_offset = numDetections;
  const width_offset = 2 * numDetections;
  const height_offset = 3 * numDetections;
  
  // Start class probabilities after bounding box attributes
  const class_probs_offset = 4 * numDetections;

  for (let i = 0; i < numDetections; i++) {
    // Extract bounding box values


    // Calculate confidence and class ID
    let maxProb = -Infinity;
    let classId = -1;

    for (let j = 0; j < numClasses; j++) {
      const prob = data[numDetections*i+j+4];
      if (prob > maxProb) {
        maxProb = prob;
        classId = j;
      }
    }

    // Only process detections with confidence above threshold
    if (maxProb > confidenceThreshold) {
       const x_center = data[numDetections*i] * (originalWidth / inputSize);
       const y_center = data[numDetections*i+1] * (originalWidth / inputSize);
       const width = data[numDetections*i+2] * (originalHeight / inputSize);
       const height = data[numDetections*i+3] * (originalHeight / inputSize);

      console.log("originalWidth",originalWidth,"originalHeight",originalHeight,"inputSize",inputSize);
      const x_min = x_center - width / 2;
      const y_min = y_center - height / 2;
      const x_max = x_center + width / 2;
      const y_max = y_center + height / 2;
      console.log(`Detection ${i}: x_center=${x_center}, y_center=${y_center}, width=${width}, height=${height}`);
      console.log('position in array',numDetections*i,"value",data[numDetections*i]);
      boxes.push({
        box: [[x_min, y_min], [x_min, y_max], [x_max, y_max], [x_max, y_min]],
        typology: null,
        class: classId,
        confidence: maxProb
      });
    }
  }

  console.log('Extracted boxes:', boxes);
  return boxes;
}




function exportRawData(data,name='Predictions') {

    // generate a timestamp 
    const now = new Date();
    const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
  
  const filename = name+timestamp+'.json';
  const jsonData = JSON.stringify(Array.from(data));
  const blob = new Blob([jsonData], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function exportPredictions2(predictions) {
  const rawData = await predictions.dataSync(); //  dataSync() if synchronous extraction is preferred , data() if not
  exportRawData(rawData);
}
  
async function exportPredictions(predictions) {
  const [batchSize, numAttributes, numDetections] = predictions.shape;

  // export each detection 
  for (let i = 0; i < numDetections; i++) {
    const detection = predictions.slice([0, 0, i], [1, numAttributes, 1]);
    const detectionData = await detection.data();  //  dataSync() if synchronous extraction is preferred , data() if not
    exportRawData(detectionData, `Detection_${i + 1}_`); // export each detection individually
    detection.dispose(); // dispose to free memory
  }

  // export all detections along the numAttributes dimension in one file
  const allAttributesData = await predictions.slice([0, 0, 0], [1, numAttributes, numDetections]).data();
  exportRawData(allAttributesData, `AllAttributes_`);
}  

async function createBlocks(apiToken, uri, pageId, blocks) {
  for (const block of blocks) {
    block.document_part = pageId;
    
    const response = await fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiToken}`
      },
      body: JSON.stringify(block)
    });

    if (!response.ok) {
      throw new Error(`Failed to add block: ${response.statusText}`);
    }
  }
}

initializeBackend();