"use strict";

const { setTimeout } = require('timers/promises');
const { PeerRPCServer, PeerRPCClient } = require("grenache-nodejs-http");
const Link = require('grenache-nodejs-link');
const OrderBook = require('./orderBook');
const Mutex = require('./mutex');

const logToken ='bitfinex:client'

const orderBook = new OrderBook();
const mutex = new Mutex();


const link = new Link({
    grape: 'http://127.0.0.1:30001'
});
link.start();

const peerServer = new PeerRPCServer(link, { timeout: 300000 });
peerServer.init();

const peerClient = new PeerRPCClient(link, {});
peerClient.init();


const randomPort = 1024 + Math.floor(Math.random() * 1000);
const clientId = `127.0.0.1:${randomPort}`;

const service = peerServer.transport("server");
service.listen(randomPort);

console.info(`${logToken} -> Client is listening on port ${randomPort}`);

service.on("request", (rid, key, payload, handler) => {
    switch (key) {
        case "mutex:lock":
            mutex.lockClient(payload);
            handler.reply(null, { success: true });
            break;
        case "mutex:unlock":
            mutex.unlockClient(payload);
            handler.reply(null, { success: true });
            break;
        case "book:sync":
            handler.reply(null, { orderBook: orderBook.getAllOrders() });
            break;
        case "new:order":
            console.info("Received a new order:", payload.price, payload.amount);
            const order = {
                ...payload,
                id: rid
            };
            const isFulfilled = orderBook.placeMarketOrder(order);
            console.info(`Order book length: ${orderBook.getOrderBookLength()}`);
            handler.reply(null, { success: true, isFulfilled, nbOrders: orderBook.getOrderBookLength() });
            break;
        default:
            console.info(`Unknown request type: ${key}`);
    }
});

const requestMutexLock = async (clientId) => {
    return new Promise((resolve, reject) => {
        console.info(`${logToken} -> Requesting a mutex lock from all connected nodes`);
        peerClient.map("mutex:lock", clientId, { timeout: 10000 }, (err, data) => {
            if (err) {
                if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
                    resolve();
                } else {
                    console.error("Failed to request mutex lock:", err.message);
                    reject(err);
                }
            } else {
                console.info(`${logToken} -> Mutex lock response -> `, data);
                resolve();
            }
        });
    });
};

const waitForClientRegistration = async (clientId) => {
    let isClientRegistered = false;
    let tries = 0;
    const maxTries = 100;

    while (!isClientRegistered && tries < maxTries) {
        try {
            console.info(`${logToken} -> Checking client registration attempt -> ${tries}`);
            const data = await new Promise((resolve, reject) => {
                link.lookup("new:order", { timeout: 10000 }, (err, data) => {
                    if (err) {
                        console.error("Lookup error:", err.message);
                        reject(err);
                    } else {
                        console.info(`${logToken} -> Lookup response ->`, data);
                        resolve(data);
                    }
                });
            });

            isClientRegistered = data.includes(clientId);
        } catch (error) {
            console.error("Error in lookup:", error.message);
        }

        tries++;
        await setTimeout(10000);
    }

    if (!isClientRegistered) {
        throw new Error("Unable to find the client registered on the Grape");
    }
};

const syncOrderBook = async () => {
    return new Promise((resolve, reject) => {
        console.info("Synchronizing the order book");
        peerClient.request("book:sync", {}, { timeout: 10000 }, (err, data) => {
            if (err) {
                if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
                    // This node is the first node in the network, no orders to sync
                    resolve();
                    return;
                } else {
                    console.error("book:sync error:", err.message);
                    reject(err);
                    return;
                }
            }
            orderBook.init(data.orderBook);
            resolve();
        });
    });
};

const releaseMutexLock = async (clientId) => {
    try {
        console.info("Releasing the mutex lock for all connected nodes");
        await new Promise((resolve, reject) => {
            peerClient.map("mutex:unlock", clientId, { timeout: 10000 }, (err, data) => {
                if (err) {
                    console.error("Failed to release mutex lock:", err.message);
                    if (err.message !== "ERR_GRAPE_LOOKUP_EMPTY") {
                        reject(err);
                        return;
                    }
                } else {
                    console.info("Mutex unlock response:", data);
                }
                resolve();
            });
        });
    } catch (error) {
        console.error("Error while releasing mutex lock:", error.message);
        throw error;
    }
};

// start client
(async () => {
    try {
        await requestMutexLock(clientId);

        // make the client avalable to all services
        link.startAnnouncing("new:order", service.port, {});
        link.startAnnouncing("mutex:lock", service.port, {});
        link.startAnnouncing("mutex:unlock", service.port, {});

        await waitForClientRegistration(clientId);

        // Sync the order book from another node on startup
        await syncOrderBook();
        console.info(`${logToken} -> Initial order book length: ${orderBook.getOrderBookLength()}`);

        // Release the lock as the client is fully connected and synced
        await releaseMutexLock(clientId);

        link.startAnnouncing("book:sync", service.port);

        await startTrading();
    } catch (error) {
        console.error("Failed to start the trading client:", error);
        process.exit(1);
    }
})();

const startTrading = async () => {
    try {
        const random = Math.random();
        const delay = 1000 + Math.floor(random * 9000);
        const price = parseFloat((10000 + random * 100).toFixed(4));
        const amount = parseFloat((random < 0.5 ? -random : random / 2).toFixed(4));

        await setTimeout(delay);
        await submitNewOrder(price, amount);

        await startTrading(); // Recursive call for continuous trading
    } catch (error) {
        console.error("Failed to submit new order:", error.message);
    }
};

const submitNewOrder = async (price, amount) => {
    // Wait for all locks to be released
    while (mutex.isAnyClientLocked()) {
        await setTimeout(100);
    }

    return new Promise((resolve, reject) => {
        peerClient.map("new:order", { price, amount }, { timeout: 10000 }, (err, data) => {
            if (err) {
                console.error("Failed to submit new order:", err.message);
                reject(err);
            } else {
                console.info(`${logToken} -> new:order ->`, data);
                resolve();
            }
        });
    });
};

process.on("SIGINT", async () => {
    console.info("Stopping the client...");
    link.stopAnnouncing("new:order", service.port);
    link.stopAnnouncing("book:sync", service.port);
    link.stop();

    await setTimeout(2000);
    process.exit(0);
});