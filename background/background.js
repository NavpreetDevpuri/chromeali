chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    inputsDataList: [],
    settings: { fixedPeriod: 1, randomMin: 0, randomMax: 0 },
    isProcessing: false,
  });

  // Example usage
  await switchToTabByUrl('https://www.example.com/');
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'background:addInputsData':
        await addInputsData(message);
        await sendMessage('popup:updateInputsDataList');
        break;
      case 'background:toggleProcessing':
        await toggleProcessing();
        await sendMessage('popup:updateToggleProcessingButton');
      case 'background:recalculateTimes':
        await recalculateTimes();
        await sendMessage('popup:updateInputsDataList');
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

async function addInputsData(inputsData) {
  const { inputsDataList, settings } = await chrome.storage.local.get([
    'inputsDataList',
    'settings',
  ]);
  let executionTime =
    new Date().getTime() + calculateExecutionTimeDelta(settings);
  if (inputsDataList.length) {
    executionTime =
      Math.max(...inputsDataList.map((t) => t.executionTime)) +
      calculateExecutionTimeDelta(settings);
  }
  const newInputsData = {
    ...inputsData,
    executionTime,
    status: 'pending',
  };
  await chrome.storage.local.set({ inputsDataList: [...inputsDataList, newInputsData] });
}

async function toggleProcessing() {
  const { isProcessing } = await chrome.storage.local.get(['isProcessing']);
  const newProcessingState = !isProcessing;
  await chrome.storage.local.set({ isProcessing: newProcessingState });
  if (newProcessingState) {
    processInputsDatas();
  }
}

async function recalculateTimes() {
  const { inputsDataList, settings } = await chrome.storage.local.get([
    'inputsDataList',
    'settings',
  ]);
  let preTime = new Date().getTime();
  inputsDataList.filter((d) => d.status == "pending").forEach((InputsData) => {
    const executionTime = preTime + calculateExecutionTimeDelta(settings);
    preTime = executionTime;
    InputsData.executionTime = executionTime;
  });
  await chrome.storage.local.set({ inputsDataList });
}

async function processInputsData(inputsData) {
  console.log(`Processing inputsData: ${JSON.stringify(inputsData)}`);
}

async function processInputsDatas() {
  const { inputsDataList, isProcessing } = await chrome.storage.local.get([
    'inputsDataList',
    'isProcessing',
  ]);
  if (!isProcessing) return;

  for (let inputsData of inputsDataList) {
    if (inputsData.status === 'pending') {
      await sleepTill(inputsData.executionTime);
      await processInputsData(inputsData);
      inputsData.status = 'processed';
      await chrome.storage.local.set({ inputsDataList });
      await sendMessage('popup:updateInputsDataList');
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