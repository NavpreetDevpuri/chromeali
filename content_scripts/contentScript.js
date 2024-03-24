// Content script logic here
console.log('ChromeAli content script loaded');

// You can listen for messages from the background script or the popup and act on them.
// contentScript.js
function getInputsData() {
  const inputs = document.querySelectorAll('input');
  inputFieldsData = Array.from(inputs).map(input => ({
    name: input.name,
    id: input.id,
    value: input.value
  }));
  url = document.URL;
  return { inputFieldsData, url }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "contentScript:getInputsData") {
    const inputsData = getInputsData();
    sendResponse(inputsData);
  }
});
