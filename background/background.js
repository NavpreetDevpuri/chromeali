const ChromeAli = require('../lib/ChromeAli.js');
const { botToken } = require('../config.js');

const allowedClientIds = [5740179940];
const chromeAli = new ChromeAli(botToken, allowedClientIds);

// Example of integrating ChromeAli functionalities with wake lock
// Adjust based on your specific ChromeAli class methods and how you want to trigger them
chromeAli.start(); // Assuming ChromeAli has an initialize method to start its functionalities

chrome.runtime.onMessage.addListener(handleMessage);

function handleMessage(request, sender, sendResponse) {
  const action = request.action.toLowerCase();


}
