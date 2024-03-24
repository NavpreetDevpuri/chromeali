chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    FormDataList: [],
    settings: { fixedPeriod: 1, randomMin: 0, randomMax: 0 },
    isProcessing: false,
  });

  // Example usage
  await switchToTabByUrl('https://www.example.com/');
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'background:addFormData':
        await addFormData(message);
        await sendMessage('popup:updateFormDataList');
        break;
      case 'background:toggleProcessing':
        await toggleProcessing();
        await sendMessage('popup:updateToggleProcessingButton');
      case 'background:recalculateTimes':
        await recalculateTimes();
        await sendMessage('popup:updateFormDataList');
        break;
      case 'background:updateSetting':
        await updateSetting(message.settingName, message.value);
        break;
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
  // For synchronous responses or if no response needed, return false.
  return false;
});

async function addFormData(formData) {
  const { formDataList, settings } = await chrome.storage.local.get([
    'FormDataList',
    'settings',
  ]);
  let executionTime =
    new Date().getTime() + calculateExecutionTimeDelta(settings);
  if (formDataList.length) {
    executionTime =
      Math.max(...formDataList.map((t) => t.executionTime)) +
      calculateExecutionTimeDelta(settings);
  }
  const newFormData = {
    formData,
    executionTime,
    status: 'pending',
  };
  await chrome.storage.local.set({ formDataList: [...formDataList, newFormData] });
}

async function toggleProcessing() {
  const { isProcessing } = await chrome.storage.local.get(['isProcessing']);
  const newProcessingState = !isProcessing;
  await chrome.storage.local.set({ isProcessing: newProcessingState });
  if (newProcessingState) {
    processFormDatas();
  }
}

async function recalculateTimes() {
  const { formDataList, settings } = await chrome.storage.local.get([
    'FormDataList',
    'settings',
  ]);
  let preTime = new Date().getTime();
  formDataList.forEach((FormData) => {
    const executionTime = preTime + calculateExecutionTimeDelta(settings);
    preTime = executionTime;
    FormData.executionTime = executionTime;
  });
  await chrome.storage.local.set({ formDataList });
}

async function processFormDatas() {
  const { formDataList, isProcessing } = await chrome.storage.local.get([
    'FormDataList',
    'isProcessing',
  ]);
  if (!isProcessing) return;

  for (let formData of formDataList) {
    if (formData.status === 'pending') {
      await sleepTill(formData.executionTime);
      console.log(`Processing formData: ${JSON.stringify(formData)}`);
      formData.status = 'processed';
      await chrome.storage.local.set({ formDataList });
      await sendMessage('popup:updateFormDataList');
      if (!(await chrome.storage.local.get(['isProcessing'])).isProcessing)
        break; // Stop processing if toggled off
    }
  }
}

function calculateExecutionTimeDelta(settings) {
  const { fixedPeriod, randomMin, randomMax } = settings;
  const randomAdjustment =
    Math.floor(Math.random() * (randomMax - randomMin + 1)) + randomMin;
  return (fixedPeriod + randomAdjustment) * 60000; // Convert minutes to milliseconds
}

async function updateSetting(settingName, value) {
  const { settings } = await chrome.storage.local.get(['settings']);
  settings[settingName] = Number(value);
  await chrome.storage.local.set({ settings });
}

function sleepTill(executionTime) {
  const now = Date.now();
  const delay = executionTime - now;
  return delay > 0
    ? new Promise((resolve) => setTimeout(resolve, delay))
    : Promise.resolve();
}

async function sendMessage(action, data = {}) {
  return await chrome.runtime.sendMessage({ action, ...data });
}

async function switchToTabByUrl(url) {
  const tabs = await chrome.tabs.query({ url: url });
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
    console.log(`Switched to tab with URL: ${url}`);
  } else {
    console.log('No tab with the specified URL was found.');
  }
}