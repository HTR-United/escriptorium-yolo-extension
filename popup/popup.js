import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

let model = null;
const inputSize = 960; // adjusted based on modle's expected input size

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
  try {
    model = await tf.loadGraphModel(tf.io.browserFiles([modelFile, ...weightFiles]));
    console.log('Model loaded successfully');
    if (model) {
      document.getElementById('annotate-button').disabled = false;
    } else {
      console.error('Model is null after loading');
    }
  } catch (error) {
    console.error('Error loading model:', error);
  }
}

document.getElementById('model-files').addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  loadModelFromFiles(files);
});

document.getElementById('image-upload').addEventListener('change', function (event) {
  const file = event.target.files[0];
  const img = document.getElementById('selected-image');
  img.src = URL.createObjectURL(file);
  img.onload = () => URL.revokeObjectURL(img.src);
  img.style.display = 'block';
});

document.getElementById('annotate-button').addEventListener('click', async () => {
  if (!model) {
    console.error('Model not loaded, cannot annotate');
    return;
  }

  const img = document.getElementById('selected-image');
  if (img) {
    const imgTensor = tf.browser.fromPixels(img).toFloat();
    const resizedImgTensor = tf.image.resizeBilinear(imgTensor, [inputSize, inputSize]);
    const expandedImgTensor = resizedImgTensor.expandDims(0);

    try {
      const predictions = await model.executeAsync(expandedImgTensor);
      console.log('Predictions:', predictions);
    } catch (error) {
      console.error('Error during model execution:', error);
    }

    imgTensor.dispose();
    resizedImgTensor.dispose();
    expandedImgTensor.dispose();
  }
});

initializeBackend();
