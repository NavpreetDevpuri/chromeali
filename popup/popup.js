let isPolling = false; // This flag should ideally come from the background script (e.g., via a query)

document.getElementById('togglePollingBtn').addEventListener('click', () => {
    const action = isPolling ? "stop" : "start";
    chrome.runtime.sendMessage({action: action}, function(response) {
        console.log(response);
        isPolling = !isPolling; // Toggle the local flag
        document.getElementById('togglePollingBtn').textContent = isPolling ? "Stop Polling" : "Start Polling";
    });
});

document.getElementById('toggleWakeLockBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: "toggleWakeLock"}, (response) => {
        isPolling = response.wakeLockEnabled;
        document.getElementById('toggleWakeLockBtn').textContent = isPolling ? "Disable Wake Lock" : "Enable Wake Lock";
    });
});
