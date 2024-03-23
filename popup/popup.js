document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialUIState();
    document.getElementById('addTicketButton').addEventListener('click', async () => await addTicket());
    document.getElementById('toggleProcessingButton').addEventListener('click', async () => await toggleProcessing());
    document.getElementById('recalculateButton').addEventListener('click', async () => await sendMessage('background:recalculateTimes'));
    document.getElementById('fixedPeriod').addEventListener('change', async () => await updateSetting('fixedPeriod'));
    document.getElementById('randomMin').addEventListener('change', async () => await updateSetting('randomMin'));
    document.getElementById('randomMax').addEventListener('change', async () => await updateSetting('randomMax'));
});

async function addTicket() {
    const ticketNumber = document.getElementById('ticketNumber').value;
    const ticketType = document.getElementById('ticketType').value;
    if (ticketNumber && ticketType) {
        await sendMessage('background:addTicket', { ticketNumber, ticketType });
        document.getElementById('ticketNumber').value = '';
        document.getElementById('ticketType').value = '';
    }
}

async function toggleProcessing() {
    await sendMessage('background:toggleProcessing');
}

async function updateSetting(settingName) {
    const value = document.getElementById(settingName).value;
    await sendMessage('background:updateSetting', { settingName, value });
}

async function loadInitialUIState() {
    const { settings, isProcessing } =  await chrome.storage.local.get(['isProcessing', 'settings']);
    document.getElementById('toggleProcessingButton').textContent = isProcessing ? 'Stop Processing' : 'Start Processing';
    document.getElementById('fixedPeriod').value = settings.fixedPeriod;
    document.getElementById('randomMin').value = settings.randomMin;
    document.getElementById('randomMax').value = settings.randomMax;
    await updateTicketList();
}

async function updateTicketList() {
    const { tickets } = await chrome.storage.local.get(['tickets']);
    const ticketListElement = document.getElementById('ticketList');
    ticketListElement.innerHTML = ''; // Clear existing ticket list
    
    tickets.forEach(ticket => {
        const ticketElement = document.createElement('li');
        const executionTime = new Date(ticket.executionTime).toLocaleTimeString();    
        ticketElement.textContent = `Ticket: ${ticket.ticketNumber}, Type: ${ticket.ticketType}, Status: ${ticket.status}, Execution Time: ${executionTime}`;
        ticketListElement.appendChild(ticketElement);
    });
}

async function updateToggleProcessingButton() {
    const { isProcessing } =  await chrome.storage.local.get(['isProcessing', 'settings']);
    document.getElementById('toggleProcessingButton').textContent = isProcessing ? 'Stop Processing' : 'Start Processing';
}

async function sendMessage(action, data = {}) {
    return await chrome.runtime.sendMessage({ action, ...data });
}


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
        switch (message.action) {
            case 'popup:updateTicketList':
                await updateTicketList();
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