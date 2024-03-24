document.addEventListener('DOMContentLoaded', async () => {
  await loadInitialUIState();
  document.getElementById('addFormDataButton').addEventListener('click', async () => await addFormData());
  document.getElementById('toggleProcessingButton').addEventListener('click', async () => await toggleProcessing());
  document.getElementById('recalculateButton').addEventListener('click', async () => await sendMessage('background:recalculateTimes'));
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



async function addFormData() {
  // const ticketNumber = document.getElementById('ticketNumber').value;
  // const ticketType = document.getElementById('ticketType').value;
  // if (ticketNumber && ticketType) {
  //     await sendMessage('background:addFormData', { ticketNumber, ticketType });
  //     document.getElementById('ticketNumber').value = '';
  //     document.getElementById('ticketType').value = '';
  // }
}

async function toggleProcessing() {
  await sendMessage('background:toggleProcessing');
}

async function updateSetting(settingName) {
  const value = document.getElementById(settingName).value;
  await sendMessage('background:updateSetting', { settingName, value });
}

async function loadInitialUIState() {
  try {
    const formData = await getFormDataFromActiveTab();
    const formattedData = formData?.map(input => {
      return `name: ${input.name}\n` +
              `id: ${input.id}\n` +
              `value: ${input.value}\n`;
    }).join("\n");

    document.getElementById("formData").innerText = formattedData;
  } catch (error) {
    console.error('Error fetching input values:', error);
  }
  const { settings, isProcessing } = await chrome.storage.local.get(['isProcessing', 'settings']);
  document.getElementById('toggleProcessingButton').textContent = isProcessing ? 'Stop Processing' : 'Start Processing';
  document.getElementById('fixedPeriod').value = settings.fixedPeriod;
  document.getElementById('randomMin').value = settings.randomMin;
  document.getElementById('randomMax').value = settings.randomMax;
  await updateFormDataList();
}

async function getFormDataFromActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const { formData } = await sendMessageToContentScript(tabs[0].id, { action: "contentScript:getFormData" }) || { formData: [] };
  return formData;
}

async function updateFormDataList() {
  const { formDataList } = await chrome.storage.local.get(['formDataList']);
  const formDataListElement = document.getElementById('formDataList');
  formDataListElement.innerHTML = '';

  // formDataList.forEach(ticket => {
  //     const ticketElement = document.createElement('li');
  //     const executionTime = new Date(ticket.executionTime).toLocaleTimeString();    
  //     ticketElement.textContent = `FormData: ${ticket.ticketNumber}, Type: ${ticket.ticketType}, Status: ${ticket.status}, Execution Time: ${executionTime}`;
  //     formDataListElement.appendChild(ticketElement);
  // });
}

async function updateToggleProcessingButton() {
  const { isProcessing } = await chrome.storage.local.get(['isProcessing', 'settings']);
  document.getElementById('toggleProcessingButton').textContent = isProcessing ? 'Stop Processing' : 'Start Processing';
}

async function sendMessage(action, data = {}) {
  return await chrome.runtime.sendMessage({ action, ...data });
}


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'popup:updateFormDataList':
        await updateFormDataList();
        break;
      case 'popup:updateToggleProcessingButton':
        await updateToggleProcessingButton();
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
  // For synchronous responses or if no response needed, return false.
  return false;
});
