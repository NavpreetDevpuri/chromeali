chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    inputsDataList: [],
    settings: { fixedPeriod: 1, randomMin: 0, randomMax: 0 },
    isProcessing: false,
  });

  // Example usage
  // await switchToTabByUrl('https://www.example.com/');
});

async function handleBackgroundMessage(message) {
  switch (message.action) {
    case 'background:addInputsData':
      await addInputsData(message);
      break;
    case 'background:toggleProcessing':
      await toggleProcessing();
    case 'background:recalculateTimes':
      await recalculateTimes();
      break;
    case 'background:updateSetting':
      await updateSetting(message.settingName, message.value);
      break;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleBackgroundMessage(message, sendResponse).then(result => {
    sendResponse({ data: result });
  }).catch(error => {
    sendResponse({ error: error.message });
  });
  return true; // Explicitly keep the message channel open
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
  await sendMessage('popup:updateToggleProcessingButton');
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

  const tab = await chrome.tabs.create({ url: inputsData.url, active: true });

  // TODO: Find better to wait, like wait for some perticular element to appear
  await new Promise(resolve => setTimeout(resolve, 10000));

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: fillForm,
    args: [inputsData.inputFieldsData],
  });

  // TODO: Find better to wait, like wait for network calls to finish
  await new Promise(resolve => setTimeout(resolve, 10000));
  chrome.tabs.remove(tab.id);
}

function fillForm(inputFieldsData) {
  inputFieldsData.forEach(field => {
    const selector = field.id ? `#${field.id}` : `input[name='${field.name}']`;
    const inputElement = document.querySelector(selector);
    if (inputElement) {
      inputElement.value = field.value;
    }
  });

  // TODO: Find better to submit, avoid hard coded selector
  const submitButton = document.querySelector("body > xoc-root > xoc-global-main > div > div.body-wrapper.ng-tns-c499-0.ng-trigger.ng-trigger-routeAnimations > xoc-profile > div > div > xoc-profile-questions > form > xoc-submit-questions > div > button.\\!tw-text-sm.k-button.k-button-md.k-rounded-sm.k-button-solid-primary.k-button-solid");
  if (submitButton) {
    submitButton.click();
  }
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
  await toggleProcessing();
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

async function switchToTabByUrl(url) {
  const tabs = await chrome.tabs.query({ url: url });
  if (tabs.length > 0) {
    chrome.tabs.update(tabs[0].id, { active: true });
    console.log(`Switched to tab with URL: ${url}`);
  } else {
    console.log('No tab with the specified URL was found.');
  }
}