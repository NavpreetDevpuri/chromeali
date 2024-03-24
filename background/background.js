chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({
    tickets: [],
    settings: { fixedPeriod: 1, randomMin: 0, randomMax: 0 },
    isProcessing: false,
  });

  // Example usage
  await switchToTabByUrl('https://www.example.com/');
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'background:addTicket':
        await addTicket(message);
        await sendMessage('popup:updateTicketList');
        break;
      case 'background:toggleProcessing':
        await toggleProcessing();
        await sendMessage('popup:updateToggleProcessingButton');
      case 'background:recalculateTimes':
        await recalculateTimes();
        await sendMessage('popup:updateTicketList');
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

async function addTicket({ ticketNumber, ticketType }) {
  const { tickets, settings } = await chrome.storage.local.get([
    'tickets',
    'settings',
  ]);
  let executionTime =
    new Date().getTime() + calculateExecutionTimeDelta(settings);
  if (tickets.length) {
    executionTime =
      Math.max(...tickets.map((t) => t.executionTime)) +
      calculateExecutionTimeDelta(settings);
  }
  const newTicket = {
    ticketNumber,
    ticketType,
    executionTime,
    status: 'pending',
  };
  await chrome.storage.local.set({ tickets: [...tickets, newTicket] });
}

async function toggleProcessing() {
  const { isProcessing } = await chrome.storage.local.get(['isProcessing']);
  const newProcessingState = !isProcessing;
  await chrome.storage.local.set({ isProcessing: newProcessingState });
  if (newProcessingState) {
    processTickets(); // Note: This starts processing tickets but doesn't await it to allow the service worker to sleep.
  }
}

async function recalculateTimes() {
  const { tickets, settings } = await chrome.storage.local.get([
    'tickets',
    'settings',
  ]);
  let preTime = new Date().getTime();
  const updatedTickets = tickets.map((ticket) => {
    const executionTime = preTime + calculateExecutionTimeDelta(settings);
    preTime = executionTime;
    return {
      ...ticket,
      executionTime,
    };
  });
  await chrome.storage.local.set({ tickets: updatedTickets });
}

async function processTickets() {
  const { tickets, isProcessing } = await chrome.storage.local.get([
    'tickets',
    'isProcessing',
  ]);
  if (!isProcessing) return;

  for (let ticket of tickets) {
    if (ticket.status === 'pending') {
      await sleepTill(ticket.executionTime);
      console.log(`Processing ticket: ${ticket.ticketNumber}`);
      ticket.status = 'processed';
      await chrome.storage.local.set({ tickets });
      await sendMessage('popup:updateTicketList');
      if (!(await chrome.storage.local.get(['isProcessing'])).isProcessing)
        break; // Stop processing if toggled off
    }
  }
  await chrome.storage.local.set({ tickets });
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
