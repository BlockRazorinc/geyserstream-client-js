# GeyserStream-client-js
example for Geyser Stream in Javascript

# Document
see [document](https://blockrazor.gitbook.io/blockrazor/solana/geyser-stream/js)

# Quickstart

1. **Download git repository**

   `git clone https://github.com/BlockRazorinc/geyserstream-client-js.git`

2. **Change directory**

   `cd geyserstream-client-js`

3. **Download dependencies**

   `npm install`

4. **Edit example.js**

	```
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
	```

- To subscribe to block information, set subscribeBlocks to true.

- To subscribe to account information, set subscribeAccounts to true.

- To subscribe to transaction information, set subscribeTransactions to true.
  
5. **Run example**
   
   `node example.js`
