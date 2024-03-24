document.addEventListener('DOMContentLoaded', async () => {
  await loadInitialUIState();
  document.getElementById('addInputsDataButton').addEventListener('click', async () => await addInputsData());
  document.getElementById('toggleProcessingButton').addEventListener('click', async () => await toggleProcessing());
  document.getElementById('recalculateButton').addEventListener('click', async () => await recalculateTimes());
  document.getElementById('fixedPeriod').addEventListener('change', async () => await updateSetting('fixedPeriod'));
  document.getElementById('randomMin').addEventListener('change', async () => await updateSetting('randomMin'));
  document.getElementById('randomMax').addEventListener('change', async () => await updateSetting('randomMax'));

});



async function sendMessageToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, function (response) {
      // if (chrome.runtime.lastError) {
      //   reject(new Error(chrome.runtime.lastError.message));
      // } else {
      resolve(response);
      // }
    });
  });
}

async function recalculateTimes() {
  await sendMessage('background:recalculateTimes');
  await updateInputsDataList();
}

async function addInputsData() {
  const inputsData = await getInputsDataFromActiveTab();
  if (inputsData.inputFieldsData?.length) {
    await sendMessage('background:addInputsData', inputsData);
  }
  await updateInputsDataList();
}

async function toggleProcessing() {
  await sendMessage('background:toggleProcessing');
}

async function updateSetting(settingName) {
  const value = document.getElementById(settingName).value;
  await sendMessage('background:updateSetting', { settingName, value });
}

function formatInputsData(inputsData) {
  const formattedInputFieldsData = inputsData?.inputFieldsData?.map(input => {
    return `${input.name ? `name: ${input.name}\n` : ''}` +
      `${input.id ? `id: ${input.id}\n` : ''}` +
      `value: ${input.value}\n`;
  }).join("\n");
  return `${inputsData.url ? `URL: ${inputsData.url}\n` : ''}` +
    `${inputsData.executionTime ? `Execution time: ${new Date(inputsData.executionTime).toLocaleTimeString()}\n` : ''}` +
    `${inputsData.status ? `Status: ${inputsData.status}\n` : ''}` +
    `\n` +
    `${formattedInputFieldsData ? `${formattedInputFieldsData}` : ''}`;
}

async function loadInitialUIState() {
  const { settings, isProcessing } = await chrome.storage.local.get(['isProcessing', 'settings']);
  document.getElementById('toggleProcessingButton').textContent = isProcessing ? 'Stop Processing' : 'Start Processing';
  document.getElementById('fixedPeriod').value = settings.fixedPeriod;
  document.getElementById('randomMin').value = settings.randomMin;
  document.getElementById('randomMax').value = settings.randomMax;
  const inputsData = await getInputsDataFromActiveTab();
  document.getElementById("inputsData").innerText = formatInputsData(inputsData);
  await updateInputsDataList();
}

async function getInputsDataFromActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const inputsData = await sendMessageToContentScript(tabs[0].id, { action: "contentScript:getInputsData" }) || {};
  return inputsData;
}

async function updateInputsDataList() {
  const { inputsDataList } = await chrome.storage.local.get(['inputsDataList']);
  const inputsDataListElement = document.getElementById('inputsDataList');
  inputsDataListElement.innerHTML = '';

  inputsDataList.forEach(inputsData => {
    const liElement = document.createElement('li');
    liElement.className = `card ${inputsData.status == "processed" ? "light-green" : ""}`;
    const preElement = document.createElement('pre');
    liElement.appendChild(preElement);
    preElement.innerText = formatInputsData(inputsData);
    inputsDataListElement.appendChild(liElement);
  });
}

async function updateToggleProcessingButton() {
  const { isProcessing } = await chrome.storage.local.get(['isProcessing', 'settings']);
  document.getElementById('toggleProcessingButton').textContent = isProcessing ? 'Stop Processing' : 'Start Processing';
}


async function sendMessage(action, data = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, ...data }, function (response) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

async function handlePopupMessage(message) {
  switch (message.action) {
    case 'popup:updateInputsDataList':
      await updateInputsDataList();
      break;
    case 'popup:updateToggleProcessingButton':
      await updateToggleProcessingButton();
      break;
  }
}
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  handlePopupMessage(message, sendResponse).then(result => {
    sendResponse({ data: result });
  }).catch(error => {
    sendResponse({ error: error.message });
  });
  return true; // Explicitly keep the message channel open
});
