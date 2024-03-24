// Content script logic here
console.log('ChromeAli content script loaded');

// You can listen for messages from the background script or the popup and act on them.
// contentScript.js
function getFormData() {
  const inputs = document.querySelectorAll('input');
  return Array.from(inputs).map(input => ({
    name: input.name,
    id: input.id,
    value: input.value
  }));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "contentScript:getFormData") {
    const formData = getFormData();
    sendResponse({ formData });
    return true; // Indicates you wish to send a response asynchronously (this is crucial)
  }
});
