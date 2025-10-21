const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const bs58 = require('bs58');

// Load proto file
const PROTO_PATH = __dirname + '/proto/geyser.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const geyserProto = grpc.loadPackageDefinition(packageDefinition).geyser;

// Create gRPC client with SSL credentials and metadata
function createGeyserClient(host, token) {
  // Use system's root certificates for SSL verification
  // No need to specify certificate paths explicitly
  const sslCreds = grpc.credentials.createSsl();

  // Create metadata with x-token
  const metadata = new grpc.Metadata();
  metadata.add('x-token', token);

  return {
    client: new geyserProto.Geyser(host, sslCreds),
    metadata
  };
}

// Abstract method to build subscription request
function buildSubscribeRequest(config) {
  const request = {};

  // Add account subscription if enabled
  if (config.subscribeAccounts) {
    const { filterKey, owners, accounts, filters, nonemptyTxnSignature } = config.accountParams;
    request.accounts = {
      [filterKey]: {
        owner: owners,
        account: accounts,
        filters: filters,
        nonempty_txn_signature: nonemptyTxnSignature
      }
    };
  }

  // Add block subscription if enabled
  if (config.subscribeBlocks) {
    const { filterKey, includeTransactions, includeAccounts, includeEntries, accountInclude } = config.blockParams;
    request.blocks = {
      [filterKey]: {
        account_include: accountInclude,
        include_transactions: includeTransactions,
        include_accounts: includeAccounts,
        include_entries: includeEntries
      }
    };
  }

  // Add transaction subscription if enabled
  if (config.subscribeTransactions) {
    const { filterKey, vote, failed, accountInclude, accountExclude, accountRequired, signature } = config.transactionParams;
    request.transactions = {
      [filterKey]: {
        vote: vote,
        failed: failed,
        account_include: accountInclude,
        account_exclude: accountExclude,
        account_required: accountRequired,
        signature: signature
      }
    };
  }

  // Add common parameters
  request.commitment = config.commitment;

  return request;
}

// Handle incoming updates
function handleUpdate(update) {
  switch (update.update_oneof) {
    case 'account':
      console.log(`\nAccount update (slot: ${update.account.slot})`);
      console.log(`Account pubkey: ${bs58.encode(update.account.account.pubkey)}`);
      console.log(`Owner: ${bs58.encode(update.account.account.owner)}`);
      console.log(`Lamports: ${update.account.account.lamports}`);
      break;

    case 'block':
      console.log(`\nBlock update (slot: ${update.block.slot})`);
      console.log(`Blockhash: ${update.block.blockhash}`);
      console.log(`Transaction count: ${update.block.transactions.length}`);
      break;

    case 'transaction':
      console.log(`\nTransaction update (slot: ${update.transaction.slot})`);
      console.log(`Signature: ${bs58.encode(update.transaction.transaction.signature)}`);
      console.log(`Is vote: ${update.transaction.transaction.is_vote}`);
      break;

    default:
      console.log('\nUnknown update type');
  }
}

// Main subscription logic
async function subscribeToGeyser() {
  // Subscription configuration
  const subscribeConfig = {
    // Common configuration
    commitment: 'CONFIRMED', // Commitment level: PROCESSED/CONFIRMED/FINALIZED

    // Account subscription configuration
    subscribeAccounts: false, // Whether to subscribe to accounts
    accountParams: {
      filterKey: 'account-filter-1',
      owners: ['11111111111111111111111111111111'], // System program owner
      accounts: [], // Specific accounts to subscribe to (empty for all matching)
      filters: [], // Additional filters (e.g., memcmp, datasize)
      nonemptyTxnSignature: false // Whether to include only updates with transaction signatures
    },

    // Block subscription configuration
    subscribeBlocks: false, // Whether to subscribe to blocks
    blockParams: {
      filterKey: 'block-filter-1',
      accountInclude: [], // Include blocks involving these accounts (empty for all)
      includeTransactions: true, // Whether to include transactions in blocks
      includeAccounts: false, // Whether to include account updates in blocks
      includeEntries: false // Whether to include entries in blocks
    },

    // Transaction subscription configuration
    subscribeTransactions: true, // Whether to subscribe to transactions
    transactionParams: {
      filterKey: 'tx-filter-1',
      vote: false, // Whether to include only vote transactions
      failed: false, // Whether to include only failed transactions
      accountInclude: [], // Include transactions involving these accounts
      accountExclude: [], // Exclude transactions involving these accounts
      accountRequired: [], // Transactions must involve these accounts
      signature: null // Specific transaction signature (empty for all matching)
    }
  };

  // Client configuration
  const clientConfig = {
    host: 'geyserstream-tokyo.blockrazor.xyz:443', // gRPC server address
    token: '' // auth token
  };

  // Create client with SSL credentials
  const { client, metadata } = createGeyserClient(
    clientConfig.host,
    clientConfig.token
  );

  // Build subscription request
  const subscribeRequest = buildSubscribeRequest(subscribeConfig);
  console.log('Sending subscription request:', JSON.stringify(subscribeRequest, null, 2));

  // Establish stream and send request
  const stream = client.Subscribe(metadata);

  stream.on('data', (update) => handleUpdate(update));
  stream.on('error', (err) => console.error('Stream error:', err));
  stream.on('end', () => console.log('Stream ended'));

  stream.write(subscribeRequest);

  // Handle process exit
  process.on('SIGINT', () => {
    console.log('Closing subscription...');
    stream.end();
    process.exit(0);
  });
}

// Start subscription
subscribeToGeyser().catch(console.error);