chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'annotate') {
    const { apiToken, url } = request;
    try {
      const { imageUrl, originalSize } = await fetchImageUrl(apiToken, url);
      chrome.runtime.sendMessage({ action: 'imageURL', imageUrl, originalSize });
      sendResponse({ success: true }); 
    } catch (error) {
      console.error('Error fetching image URL:', error);
      chrome.runtime.sendMessage({ type: 'ANNOTATION_RESULT', data: `An error occurred: ${error.message}` });
      sendResponse({ success: false, error: error.message }); 
    }
  }
  return true; 
});


async function fetchImageUrl(apiToken, url) {
  const regex = /^(?<domain>https?:\/\/[^\/]+)\/document(?:s?)\/(?<document>\d+)\/parts?\/(?<page>\d+)\/edit\/?$/;
  const match = regex.exec(url);

  if (!match) throw new Error('Invalid URL format.');

  const { domain, document, page } = match.groups;
  const uri = `${domain}/api/documents/${document}/parts/${page}/`;

  const response = await fetch(uri, {
    method: 'GET',
    headers: { Authorization: `Token ${apiToken}` }
  });

  if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  const data = await response.json();
  
  // extract the image URL and original size
  const imageUrl = domain + data.image.uri;
  const originalSize = data.image.size;
  console.log('Image URL:', imageUrl);
  console.log('Original size:', originalSize);
  return { imageUrl, originalSize };
}