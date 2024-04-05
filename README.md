# Bitfinex node blockchain Challenge

## Getting Started

**Clone project**

```
git clone git@github.com:blackshady/Bitfinex-node-blockchain.git
```

### Install Project Dependencies

```bash
yarn install
```

### Setting up the DHT

To set up the DHT, you will need to install and run Grape servers. 
```bash
npm install -g grenache-grape
```

Start two Grape servers:

```bash
grape --dp 20001 --aph 30001 --bn '127.0.0.1:20002'
grape --dp 20002 --aph 40001 --bn '127.0.0.1:20001'
```
**Start the exchange clients**

```bash
yarn start
```

## Implementation Details

1. **Decentralized Peer-to-Peer Communication**:
    - Utilizes Grenache, a decentralized peer-to-peer framework, for communication between nodes.
    - Enables nodes to interact directly without relying on a central server, enhancing scalability and fault tolerance.

2. **Mutex Locking for Synchronization**:
    - Implements mutex locking to ensure mutual exclusion when accessing and modifying shared resources, such as the order book.
    - Prevents race conditions and data inconsistencies by temporarily locking write operations during synchronization processes.

3. **Consistent Order Book Synchronization**:
    - Maintains a synchronized order book across all nodes in the network.
    - Employs a synchronization mechanism to ensure that all nodes have access to the same version of the order book, facilitating consistent trading operations.

4. **Efficient Order Matching Algorithm**:
    - Implements an efficient order matching algorithm for processing buy and sell orders within the order book.
    - Utilizes binary search for optimal order placement, enhancing the performance and scalability of the trading system.

6. **Graceful Shutdown Handling**:
    - Implements graceful shutdown handling to ensure proper cleanup and termination of the client process.
    - Stops announcing services, releases mutex locks, and terminates the Grenache Link instance upon receiving a SIGINT signal, promoting system stability and reliability.

## Known Issues

1. **Potential Deadlocks**:
    - While mutex locking is implemented to prevent race conditions, there might be scenarios where deadlocks could occur if locks are not released appropriately.

2. **Limited Error Handling**:
    - The codebase lacks comprehensive error handling mechanisms, especially in network communication and synchronization processes. This might lead to unexpected behavior or crashes under certain error conditions.

3. **Synchronization Performance**:
    - The synchronization mechanism for maintaining a consistent order book across nodes might introduce performance bottlenecks, especially in large-scale networks or under high load conditions. Optimizations might be required to improve synchronization efficiency.
   
4. **Memory Management**:
    - The codebase does not address memory management concerns explicitly. In long-running processes, memory leaks or excessive memory consumption could potentially occur, impacting system stability and performance.

5. **Graceful Shutdown Handling**:
    - While graceful shutdown handling is implemented, there could be edge cases or race conditions where the cleanup process might not execute correctly, leading to resource leaks or incomplete shutdown procedures.

6. **Scalability Issues**:
    - The current architecture might face scalability limitations, particularly in terms of handling a large number of concurrent connections or processing high-frequency trading requests. Scalability optimizations may be necessary for handling increased network traffic.

7. **Documentation and Testing**:
    - The codebase lacks comprehensive documentation and testing.
