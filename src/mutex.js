"use strict";

const logToken ='bitfinex:mutex'

class Mutex {
    lockedClients = new Set();

    constructor() {}
    lockClient(clientId) {
        this.lockedClients.add(clientId);
        console.info(`${logToken} -> Client locked => Locked Clients ->`, this.lockedClients);
    }
    unlockClient(clientId) {
        this.lockedClients.delete(clientId);
        console.info(`${logToken} -> Client unlocked => Locked Clients`, this.lockedClients);
    }

    isAnyClientLocked() {
        console.info(`${logToken} -> Locked Clients -> `, this.lockedClients);
        return this.lockedClients.size > 0;
    }
}

module.exports = Mutex;