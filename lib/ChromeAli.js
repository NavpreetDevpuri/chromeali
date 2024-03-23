const TelegramBot = require("./TelegramBot");

class ChromeAli {
    constructor(botToken, allowedClientIds) {
        this.bot = new TelegramBot(botToken, allowedClientIds);
        this.isPolling = false;
        this.shouldPolling = false; // New flag to manage desired polling state
        this.wakeLock = null;
    }

    start() {
        // Start any initial setup or functionalities
        // this.startPolling();
          
        // Potentially start any default scheduled tasks here
        console.log("ChromeAli started");
    }

    startPolling() {
        this.shouldPolling = true; // Indicate that polling should continue
        const poll = () => {
            if (!this.isPolling && this.shouldPolling) {
                this.isPolling = true;
                this.bot.pollUpdates().then(() => {
                    this.isPolling = false;
                    if (this.shouldPolling) setTimeout(poll, 5000); // Continue polling if desired
                }).catch((error) => {
                    console.error('Polling error:', error);
                    this.isPolling = false;
                    if (this.shouldPolling) setTimeout(poll, 5000); // Continue polling if desired
                });
            }
        };
        poll();
    }

    stop() {
        this.shouldPolling = false; // Stop polling
        // Release wake lock if active
        if (this.wakeLock) {
            this.wakeLock.release().then(() => {
                this.wakeLock = null;
                console.log('Wake Lock released on stop.');
            });
        }

        console.log("ChromeAli stopped");
    }

    toggleWakeLock(chatId) {
        // Placeholder for wake lock toggling logic
        // Assume this toggles a wake lock and notifies the user
        console.log("Toggling wake lock");
        // this.bot.sendMessage(chatId, "Toggled the wake lock.");
    }

    scheduleTask(callback, minDelay, maxDelay) {
        const scheduleNextTask = () => {
            const delay = minDelay + Math.random() * (maxDelay - minDelay);
            setTimeout(() => {
                callback();
                scheduleNextTask(); // Schedule next execution
            }, delay);
        };
        scheduleNextTask();
    }

    scheduleDailyTask(callback, targetHour, targetMinute, randomnessMinutes) {
        const scheduleNextTask = () => {
            const now = new Date();
            let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHour, targetMinute, 0, 0);
            // Add a day if the target time has already passed
            if (target <= now) {
                target.setDate(target.getDate() + 1);
            }
            // Add randomness
            const randomOffset = (Math.random() - 0.5) * 2 * randomnessMinutes * 60000; // Randomness in milliseconds
            const delay = target.getTime() - now.getTime() + randomOffset;

            setTimeout(() => {
                callback();
                scheduleNextTask(); // Schedule for the next day
            }, delay);
        };
        scheduleNextTask();
    }
}

module.exports = ChromeAli;
