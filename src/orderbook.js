"use strict";

const logToken ='bitfinex:orderBook'

class OrderBook {
    buys = [];
    sells = [];
    constructor() {}

    init(book) {
        book.forEach((order) => this.addOrder(order));
    }

    binarySearch(array, order, direction = 1) {
        const targetPrice = direction * order.price;
        let low = 0;
        let high = array.length - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);

            if (array[mid].price * direction === targetPrice) {
                if (array[mid].id < order.id) {
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            } else if (array[mid].price * direction < targetPrice) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return low;
    }

    addOrder(order) {
        if (order.amount > 0) {
            // Add buy orders (negative direction for sorting)
            const index = this.binarySearch(this.buys, order, -1);
            this.buys.splice(index, 0, order);
        } else {
            // Add sell orders (positive direction for sorting)
            const index = this.binarySearch(this.sells, order, 1);
            this.sells.splice(index, 0, order);
        }
        console.info("Buy orders", this.buys);
        console.info("Sell orders", this.sells);
    }

    fulfillOrder(order) {
        const matchedOrders = [];
        let remainingAmountToMatch = order.amount;

        if (remainingAmountToMatch > 0) {
            // Buy order fulfillment
            console.log(`${logToken} -> Buy lookup for ${remainingAmountToMatch} at ${order.price}`);
            console.info(`${logToken}  -> First Selling order -> `, this.sells[0]);

            while (remainingAmountToMatch > 0 && this.sells.length > 0 && order.price >= this.sells[0].price) {
                const matchedOrder = this.sells.shift();
                console.info(`${logToken} -> Matching order -> `, matchedOrder);

                if (remainingAmountToMatch === -matchedOrder.amount) {
                    matchedOrders.push(matchedOrder);
                    remainingAmountToMatch = 0;
                } else if (remainingAmountToMatch < -matchedOrder.amount) {
                    // Partial match, reduce the remaining part of the sell order
                    matchedOrder.amount += remainingAmountToMatch;
                    this.sells.unshift(matchedOrder);
                    remainingAmountToMatch = 0;
                } else {
                    // Partial match, deduct the matched order's amount
                    remainingAmountToMatch += matchedOrder.amount;
                    matchedOrders.push(matchedOrder);
                }
                console.info(`${logToken} -> Amount remaining to match`, remainingAmountToMatch);
            }

            if (remainingAmountToMatch === 0) {
                matchedOrders.push(order);
            }
        } else {
            // Sell order fulfillment
            console.info(`${logToken} -> Sell lookup for ${remainingAmountToMatch} at ${order.price}`);
            console.info(`${logToken} -> First Buying order -> `, this.buys[0]);

            while (remainingAmountToMatch < 0 && this.buys.length > 0 && order.price <= this.buys[0].price) {
                const matchedOrder = this.buys.shift();
                console.info(`${logToken} Matching order ->`, matchedOrder);

                if (remainingAmountToMatch === -matchedOrder.amount) {
                    matchedOrders.push(matchedOrder);
                    remainingAmountToMatch = 0;
                } else if (remainingAmountToMatch > -matchedOrder.amount) {
                    matchedOrder.amount += remainingAmountToMatch;
                    this.buys.unshift(matchedOrder);
                    remainingAmountToMatch = 0;
                } else {
                    remainingAmountToMatch += matchedOrder.amount;
                    matchedOrders.push(matchedOrder);
                }
                console.info(`${logToken} -> Amount remaining to match`, remainingAmountToMatch);
            }

            if (remainingAmountToMatch === 0) {
                matchedOrders.push(order);
            }
        }

        return { matchedOrders, remainingAmountToMatch };
    }

    placeMarketOrder(order) {
        const { matchedOrders, remainingAmountToMatch } = this.fulfillOrder(order);
        console.info(`${logToken} -> Matched orders -> `, matchedOrders);

        if (remainingAmountToMatch !== 0) {
            // Place the remaining part of the order in the order book
            order.amount = remainingAmountToMatch;
            this.addOrder(order);
        }

        // Return true if any orders were matched, otherwise false
        return matchedOrders.length > 0;
    }

    getOrderBookLength() {
        return this.buys.length + this.sells.length;
    }

    getAllOrders() {
        return [...this.buys, ...this.sells];
    }
}

module.exports = OrderBook;