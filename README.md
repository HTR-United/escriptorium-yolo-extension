

# YOLO Image Annotator for escriptorium

The YOLO Image Annotator is a Chrome extension designed for annotating images using  YOLOv8 model. It loads an image / page from eScriptorium document, processes i, and provides object detection capabilities.

## Features
- Load images from supported websites.
- Annotate images using a YOLO model (must be provided as `model.json` and `.bin` files).
- Automatically saves API token for quicker access.


## Loading the Extension in Chrome
1. Go to `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist` folder.

## Usage
1. Enter your API token and load the model files by selecting a folder containing `model.json` and `.bin` files.
2. Click the **Annotate** button to fetch the current image and begin annotation.

