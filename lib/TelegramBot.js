
const fetch = require('node-fetch');

class TelegramBot {
    constructor(token, allowedClientIds) {
        this.botToken = token;
        this.allowedClientIds = allowedClientIds;
        this.lastUpdateId = 0;
    }

    async pollUpdates() {
        const telegramApi = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=10`;
        try {
            const response = await fetch(telegramApi);
            const data = await response.json();
            console.log(data);

            if (data.result && data.result.length > 0) {
                for (const update of data.result) {
                    // Check if the update is from the allowed client
                    if (update.message && this.allowedClientIds.includes(update.message.from.id)) {
                        const chatId = update.message.chat.id;
                        const text = "Hello from Chrome Extension";
                        await this.sendMessage(chatId, text);
                    }
                    this.lastUpdateId = update.update_id;
                }
            }
        } catch (error) {
            console.error('Error polling Telegram:', error);
        }
    }

    async sendMessage(chatId, text) {
        const sendMessageUrl = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
        const params = new URLSearchParams({ chat_id: chatId, text: text });

        try {
            const response = await fetch(sendMessageUrl, {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }
}

module.exports = TelegramBot;