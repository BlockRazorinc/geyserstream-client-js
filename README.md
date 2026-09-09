# BlockRazor Solana Geyser Stream JavaScript Client

`geyserstream-client-js` is a JavaScript example for connecting to the BlockRazor Solana Geyser Stream over gRPC. It demonstrates how to authenticate with an `x-token`, configure Geyser subscription filters, and receive account, transaction, and block updates in Node.js.

The repository includes the JavaScript client example together with the Geyser and Solana storage Protocol Buffers definitions loaded at runtime by `@grpc/proto-loader`.

## Supported subscriptions

The example in `example.js` supports these Geyser Stream subscriptions:

| Subscription | Configuration | Example output |
|---|---|---|
| Accounts | `subscribeAccounts`, `accountParams` | Slot, account public key, owner, and lamports |
| Transactions | `subscribeTransactions`, `transactionParams` | Slot, signature, and vote status |
| Blocks | `subscribeBlocks`, `blockParams` | Slot, blockhash, and transaction count |

The default configuration enables transaction subscriptions. Account and block subscriptions are disabled by default.

## Requirements

- Node.js
- npm
- A BlockRazor authentication token
- Access to the BlockRazor Geyser Stream service

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/BlockRazorinc/geyserstream-client-js.git
cd geyserstream-client-js
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the client

Open `example.js` and update the client configuration:

```javascript
const clientConfig = {
  host: 'geyserstream-tokyo.blockrazor.xyz:443',
  token: ''
};
```

Replace the empty `token` value with your BlockRazor authentication token.

### 4. Configure subscriptions

Choose a commitment level and enable the subscriptions you want to receive:

```javascript
const subscribeConfig = {
  commitment: 'CONFIRMED',
  subscribeAccounts: false,
  subscribeBlocks: false,
  subscribeTransactions: true,
  // Filter configuration continues below in example.js
};
```

The supported commitment values defined by the Proto file are:

```text
PROCESSED
CONFIRMED
FINALIZED
```

### 5. Run the example

```bash
node example.js
```

The program prints the subscription request before sending it and logs each recognized update received from the stream.

## Subscribe to Solana accounts

Enable account updates with:

```javascript
subscribeAccounts: true
```

Configure the account subscription through `accountParams`:

```javascript
accountParams: {
  filterKey: 'account-filter-1',
  owners: ['11111111111111111111111111111111'],
  accounts: [],
  filters: [],
  nonemptyTxnSignature: false
}
```

The example maps these fields to `SubscribeRequestFilterAccounts`:

| JavaScript field | Proto field |
|---|---|
| `owners` | `owner` |
| `accounts` | `account` |
| `filters` | `filters` |
| `nonemptyTxnSignature` | `nonempty_txn_signature` |

The default owner value is the Solana System Program address included in the source code.

For each account update, the example prints:

- Slot
- Account public key encoded with `bs58`
- Account owner encoded with `bs58`
- Lamport balance

## Subscribe to Solana transactions

Transaction subscriptions are enabled by default:

```javascript
subscribeTransactions: true
```

The transaction filter is configured through `transactionParams`:

```javascript
transactionParams: {
  filterKey: 'tx-filter-1',
  vote: false,
  failed: false,
  accountInclude: [],
  accountExclude: [],
  accountRequired: [],
  signature: null
}
```

The example maps these values to `SubscribeRequestFilterTransactions`:

| JavaScript field | Proto field |
|---|---|
| `vote` | `vote` |
| `failed` | `failed` |
| `accountInclude` | `account_include` |
| `accountExclude` | `account_exclude` |
| `accountRequired` | `account_required` |
| `signature` | `signature` |

For each transaction update, the example prints:

- Slot
- Transaction signature encoded with `bs58`
- Whether the transaction is a vote transaction

## Subscribe to Solana blocks

Enable block updates with:

```javascript
subscribeBlocks: true
```

Configure the block subscription through `blockParams`:

```javascript
blockParams: {
  filterKey: 'block-filter-1',
  accountInclude: [],
  includeTransactions: true,
  includeAccounts: false,
  includeEntries: false
}
```

The example maps these fields to `SubscribeRequestFilterBlocks`:

| JavaScript field | Proto field |
|---|---|
| `accountInclude` | `account_include` |
| `includeTransactions` | `include_transactions` |
| `includeAccounts` | `include_accounts` |
| `includeEntries` | `include_entries` |

For each block update, the example prints:

- Slot
- Blockhash
- Number of transactions in the block update

## Authentication

`createGeyserClient` adds the configured token to the gRPC metadata as `x-token`:

```javascript
const metadata = new grpc.Metadata();
metadata.add('x-token', token);
```

The metadata is passed when the client opens the `Subscribe` stream:

```javascript
const stream = client.Subscribe(metadata);
```

## TLS connection

The client creates SSL credentials using the system root certificates:

```javascript
const sslCreds = grpc.credentials.createSsl();
```

It then creates the generated Geyser client with the configured host and credentials:

```javascript
new geyserProto.Geyser(host, sslCreds)
```

## Protocol Buffer loading

The example loads `proto/geyser.proto` at runtime:

```javascript
const PROTO_PATH = __dirname + '/proto/geyser.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
```

The loaded `geyser` package is then used to construct the gRPC client.

## How the client works

The main flow in `example.js` is:

1. Load the Geyser Proto definition.
2. Define the commitment level and subscription filters.
3. Define the gRPC host and authentication token.
4. Create SSL credentials and `x-token` metadata.
5. Build a Geyser `SubscribeRequest` from the enabled filters.
6. Open the bidirectional gRPC `Subscribe` stream.
7. Send the subscription request with `stream.write`.
8. Handle account, transaction, and block updates.
9. Log stream errors and stream completion events.
10. End the stream when the process receives `SIGINT`.

Updates other than Account, Transaction, and Block are reported as unknown update types by the current handler.

## Stream events

The example registers handlers for the gRPC response stream:

```javascript
stream.on('data', (update) => handleUpdate(update));
stream.on('error', (err) => console.error('Stream error:', err));
stream.on('end', () => console.log('Stream ended'));
```

Pressing `Ctrl+C` triggers the `SIGINT` handler, ends the stream, and exits the process:

```javascript
process.on('SIGINT', () => {
  console.log('Closing subscription...');
  stream.end();
  process.exit(0);
});
```

The current example does not implement automatic reconnection after a stream error or end event.

## Geyser API definitions

The `Geyser` service in `proto/geyser.proto` defines these RPC methods:

```protobuf
service Geyser {
  rpc Subscribe(stream SubscribeRequest)
      returns (stream SubscribeUpdate) {}
  rpc SubscribeReplayInfo(SubscribeReplayInfoRequest)
      returns (SubscribeReplayInfoResponse) {}
  rpc Ping(PingRequest)
      returns (PongResponse) {}
  rpc GetLatestBlockhash(GetLatestBlockhashRequest)
      returns (GetLatestBlockhashResponse) {}
  rpc GetBlockHeight(GetBlockHeightRequest)
      returns (GetBlockHeightResponse) {}
  rpc GetSlot(GetSlotRequest)
      returns (GetSlotResponse) {}
  rpc IsBlockhashValid(IsBlockhashValidRequest)
      returns (IsBlockhashValidResponse) {}
  rpc GetVersion(GetVersionRequest)
      returns (GetVersionResponse) {}
}
```

The included JavaScript example calls `Subscribe`. The other methods are defined in the Proto file and loaded client, but they are not called by `example.js`.

## Repository structure

```text
.
├── README.md
├── example.js                 # JavaScript Geyser Stream example
├── package.json
├── package-lock.json
└── proto/
    ├── geyser.proto           # Geyser service and subscription definitions
    └── solana-storage.proto   # Solana block and transaction definitions
```

## Dependencies

The repository declares these dependencies in `package.json`:

| Dependency | Usage in the repository |
|---|---|
| `@grpc/grpc-js` | gRPC client, credentials, metadata, and stream |
| `@grpc/proto-loader` | Runtime loading of the Geyser Proto definition |
| `@solana/web3.js` | Declared project dependency |

`example.js` also imports `bs58` to encode account public keys, owners, and transaction signatures. In the current lockfile, `bs58` is installed through the declared dependency tree rather than listed directly in `package.json`.

## Documentation

See the [BlockRazor Geyser Stream JavaScript documentation](https://docs.blockrazor.io/streams/block-stream/solana/geyser-stream/js) for additional service information.

## Frequently asked questions

### What is `geyserstream-client-js`?

`geyserstream-client-js` is a Node.js example for connecting to the BlockRazor Solana Geyser Stream over gRPC and receiving filtered subscription updates.

### Which Solana updates does the example support?

The example builds subscriptions for accounts, transactions, and blocks. Its update handler prints selected fields from those three update types.

### Which subscription is enabled by default?

The transaction subscription is enabled by default. Account and block subscriptions remain disabled until their Boolean configuration values are changed to `true`.

### How does the client authenticate?

The client sends the configured BlockRazor token in the `x-token` gRPC metadata field when it opens the subscription stream.

### Does the JavaScript client use TLS?

Yes. It creates SSL credentials with `grpc.credentials.createSsl()` and uses them when constructing the Geyser client.

### Which commitment levels are available?

The included Proto definition supports `PROCESSED`, `CONFIRMED`, and `FINALIZED`. The example uses `CONFIRMED` by default.

### Does the example reconnect automatically?

No. The current code logs stream errors and end events but does not open a replacement connection.
