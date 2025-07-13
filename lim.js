require('dotenv').config();
const { ethers, JsonRpcProvider } = require('ethers');
const axios = require('axios');
const moment = require('moment-timezone');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(` 🍉 19Seniman From  Insider 🍉 `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  },
};

const UCS03_ABI = [
  {
    inputs: [
      { internalType: 'uint32', name: 'channelId', type: 'uint32' },
      { internalType: 'uint64', name: 'timeoutHeight', type: 'uint64' },
      { internalType: 'uint64', name: 'timeoutTimestamp', type: 'uint64' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      {
        components: [
          { internalType: 'uint8', name: 'version', type: 'uint8' },
          { internalType: 'uint8', name: 'opcode', type: 'uint8' },
          { internalType: 'bytes', name: 'operand', type: 'bytes' },
        ],
        internalType: 'struct Instruction',
        name: 'instruction',
        type: 'tuple',
      },
    ],
    name: 'send',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

const TOKEN_ABI = [
  {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: false,
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
    stateMutability: 'nonpayable',
  },
];

const CONFIG = {
  SEPOLIA: {
    RPC_URLS: ['https://1rpc.io/sepolia', 'https://rpc-sepolia.eth.limo'],
    TOKEN_ADDRESS: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 
    EXPLORER_URL: 'https://sepolia.etherscan.io',
    CHANNEL_ID: 8, 
    BASE_TOKEN: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    BASE_TOKEN_NAME: 'USDC',
    BASE_TOKEN_SYMBOL: 'USDC',
    QUOTE_TOKEN: '0x57978Bfe465ad9B1C0bf80f6C1539D300705ea50',
    DECIMALS: 6,
    IS_NATIVE: false,
  },
  HOLESKY: {
    RPC_URLS: ['https://ethereum-holesky-rpc.publicnode.com', 'https://holesky.rpc.thirdweb.com'],
    TOKEN_ADDRESS: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
    EXPLORER_URL: 'https://holesky.etherscan.io',
    CHANNEL_ID: 2, 
    BASE_TOKEN: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    BASE_TOKEN_NAME: 'ETH',
    BASE_TOKEN_SYMBOL: 'Ether',
    QUOTE_TOKEN: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', 
    DECIMALS: 18,
    IS_NATIVE: true,
  },
  CORN: {
    RPC_URLS: ['https://21000001.rpc.thirdweb.com', 'https://rpc.testnet.corn.network'],
    TOKEN_ADDRESS: '0x92b3bc0bc3ac0ee60b04a0bbc4a09deb3914c886', 
    EXPLORER_URL: 'https://testnet.cornscan.io',
    CHANNEL_ID_CORN_TO_SEI: 3,
    BASE_TOKEN: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    BASE_TOKEN_NAME: 'BTCN',
    BASE_TOKEN_SYMBOL: 'Bitcorn',
    QUOTE_TOKEN: '0x92b3bc0bc3ac0ee60b04a0bbc4a09deb3914c886',
    DECIMALS: 6,
    IS_NATIVE: false,
  },
  BSC: {
    RPC_URLS: [
      'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
      'https://bsc-testnet-rpc.publicnode.com',
      'https://bsc-testnet.bnbchain.org',
    ],
    TOKEN_ADDRESS: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 
    EXPLORER_URL: 'https://testnet.bscscan.com',
    CHANNEL_ID_BSC_TO_SEI: 3,
    BASE_TOKEN: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    BASE_TOKEN_NAME: 'BNB',
    BASE_TOKEN_SYMBOL: 'BNB',
    QUOTE_TOKEN: '0x4caf05080814e6ef3ee625fa664014309ba3327c',
    DECIMALS: 18,
    IS_NATIVE: true,
  },
  CONTRACT_ADDRESS: '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03',
  GRAPHQL_ENDPOINT: 'https://graphql.union.build/v1/graphql',
  UNION_URL: 'https://app.union.build/explorer',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise((resolve) => rl.question(`${colors.cyan}[?] ${query}${colors.reset}`, resolve));
}

const explorer = {
  tx: (txHash, chain) => `${CONFIG[chain].EXPLORER_URL}/tx/${txHash}`,
  address: (address, chain) => `${CONFIG[chain].EXPLORER_URL}/address/${address}`,
};

const union = {
  tx: (txHash) => `${CONFIG.UNION_URL}/transfers/${txHash}`,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function timelog() {
  return moment().tz('Asia/Jakarta').format('HH:mm:ss | DD-MM-YYYY');
}

function header() {
  process.stdout.write('\x1Bc');
  logger.banner();
}

function getProvider(chain) {
  const rpcUrls = CONFIG[chain].RPC_URLS;
  let currentRpcIndex = 0;

  function provider() {
    const rpcUrl = rpcUrls[currentRpcIndex];
    return new JsonRpcProvider(rpcUrl, undefined, {
      pollingInterval: 1000,
      requestTimeout: 30000,
    });
  }

  provider.next = () => {
    currentRpcIndex = (currentRpcIndex + 1) % rpcUrls.length;
    logger.info(`Switched to RPC: ${rpcUrls[currentRpcIndex]}`);
    return provider();
  };

  return provider;
}

async function pollPacketHash(txHash, retries = 50, intervalMs = 5000) {
  const headers = {
    accept: 'application/graphql-response+json, application/json',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9,id;q=0.8',
    'content-type': 'application/json',
    origin: 'https://app.union.build',
    referer: 'https://app.union.build/',
    'user-agent': 'Mozilla/5.0',
  };
  const data = {
    query: `
      query ($submission_tx_hash: String!) {
        v2_transfers(args: {p_transaction_hash: $submission_tx_hash}) {
          packet_hash
        }
      }
    `,
    variables: {
      submission_tx_hash: txHash.startsWith('0x') ? txHash : `0x${txHash}`,
    },
  };

  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post(CONFIG.GRAPHQL_ENDPOINT, data, { headers });
      const result = res.data?.data?.v2_transfers;
      if (result && result.length > 0 && result[0].packet_hash) {
        return result[0].packet_hash;
      }
    } catch (e) {
      logger.error(`Packet error: ${e.message}`);
    }
    await delay(intervalMs);
  }
}

function padHex(value, length = 64) {
  let cleanValue;
  if (typeof value === 'number' || typeof value === 'bigint') {
    cleanValue = value.toString(16);
  } else if (typeof value === 'string') {
    cleanValue = value.replace(/^0x/, '');
  } else {
    cleanValue = ethers.toBeHex(value).replace(/^0x/, '');
  }
  const padded = cleanValue.padStart(length, '0');
  return `0x${padded}`;
}

function encodeHexString(string, length) {
  const cleaned = string.toLowerCase().replace(/^0x/, '');
  return cleaned.padEnd(length * 2, '0');
}

function encodeStringAsBytes(string, length) {
  const hex = Buffer.from(string, 'utf8').toString('hex');
  return hex.padEnd(length * 2, '0');
}

function generateInstructionData(address, amount, chain, pair) {
  const config = CONFIG[chain];
  const amountBigInt = BigInt(amount.toString());
  const amountHex = amountBigInt.toString(16);

  let nameLength, symbolLength;
  if (pair === 'HOLESKY_TO_SEPOLIA') {
    nameLength = 3; 
    symbolLength = 5; 
  } else if (pair === 'CORN_TO_SEI') {
    nameLength = 4; 
    symbolLength = 7; 
  } else if (pair === 'BSC_TO_SEI') {
    nameLength = 3; 
    symbolLength = 3; 
  } else {
    nameLength = config.BASE_TOKEN_NAME.length;
    symbolLength = config.BASE_TOKEN_SYMBOL.length;
  }

  const parts = [
    padHex(32, 64),
    padHex(1, 64),
    padHex(32, 64),
    padHex(1, 64),
    padHex(3, 64),
    padHex(96, 64),
    padHex(704, 64),
    padHex(320, 64),
    padHex(384, 64),
    padHex(448, 64),
    padHex(amountHex, 64),
    padHex(512, 64),
    padHex(576, 64),
    padHex(config.DECIMALS, 64),
    padHex(0, 64),
    padHex(640, 64),
    padHex(amountHex, 64),
    padHex(20, 64),
    encodeHexString(address, 32),
    padHex(20, 64),
    encodeHexString(address, 32),
    padHex(20, 64),
    encodeHexString(config.TOKEN_ADDRESS, 32),
    padHex(nameLength, 64),
    encodeStringAsBytes(config.BASE_TOKEN_NAME, 32),
    padHex(symbolLength, 64),
    encodeStringAsBytes(config.BASE_TOKEN_SYMBOL, 32),
    padHex(20, 64),
    encodeHexString(config.QUOTE_TOKEN, 32),
  ];
  const joinedParts = parts.map((part) => part.replace(/^0x/, '')).join('');
  return {
    version: 0,
    opcode: 2,
    operand: `0x${joinedParts}`,
  };
}

async function checkBalanceAndApprove(wallet, chain, amount, pair) {
  const config = CONFIG[chain];
  const provider = getProvider(chain)();
  const amountWei = ethers.parseUnits(amount.toString(), config.DECIMALS);

  const nativeBalance = await provider.getBalance(wallet.address);
  if (nativeBalance < ethers.parseUnits('0.001', 18)) {
    logger.error(`${wallet.address} does not have enough native balance for gas: ${ethers.formatEther(nativeBalance)}`);
    return false;
  }

  if (config.IS_NATIVE) {
    if (nativeBalance < amountWei) {
      logger.error(`${wallet.address} does not have enough ${config.BASE_TOKEN_NAME} balance: ${ethers.formatUnits(nativeBalance, config.DECIMALS)}`);
      return false;
    }
  } else {
    const tokenContract = new ethers.Contract(config.TOKEN_ADDRESS, TOKEN_ABI, wallet);
    const tokenBalance = await tokenContract.balanceOf(wallet.address);
    if (tokenBalance < amountWei) {
      logger.error(`${wallet.address} does not have enough ${config.BASE_TOKEN_NAME} balance: ${ethers.formatUnits(tokenBalance, config.DECIMALS)}`);
      return false;
    }
    const allowance = await tokenContract.allowance(wallet.address, CONFIG.CONTRACT_ADDRESS);
    if (allowance < amountWei) {
      logger.loading(`${config.BASE_TOKEN_NAME} is not approved. Sending approve transaction...`);
      try {
        const tx = await tokenContract.approve(CONFIG.CONTRACT_ADDRESS, ethers.MaxUint256);
        const receipt = await tx.wait();
        logger.success(`Approve confirmed: ${explorer.tx(receipt.hash, chain)}`);
        await delay(3000);
      } catch (err) {
        logger.error(`Approve failed: ${err.message}`);
        return false;
      }
    }
  }
  return true;
}

async function sendFromWallet(walletInfo, maxTransaction, chain, privateKey, amount, pair) {
  try {
    const provider = getProvider(chain)();
    const wallet = new ethers.Wallet(privateKey, provider);
    logger.loading(`Sending from ${wallet.address} (Wallet ${walletInfo.index}) on ${pair}`);

    const shouldProceed = await checkBalanceAndApprove(wallet, chain, amount, pair);
    if (!shouldProceed) return;

    const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, UCS03_ABI, wallet);
    const channelId = pair === 'SEPOLIA_TO_HOLESKY' ? CONFIG.SEPOLIA.CHANNEL_ID :
                     pair === 'HOLESKY_TO_SEPOLIA' ? CONFIG.HOLESKY.CHANNEL_ID :
                     pair === 'CORN_TO_SEI' ? CONFIG.CORN.CHANNEL_ID_CORN_TO_SEI :
                     CONFIG.BSC.CHANNEL_ID_BSC_TO_SEI;
    const timeoutHeight = 0;

    for (let i = 1; i <= maxTransaction; i++) {
      logger.step(`Wallet ${walletInfo.index} | Transaction ${i}/${maxTransaction} on ${pair}`);

      const now = BigInt(Date.now()) * 1_000_000n;
      const oneDayNs = 86_400_000_000_000n;
      const timeoutTimestamp = now + oneDayNs;
      const timestampNow = Math.floor(Date.now() / 1000);
      const salt = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [wallet.address, timestampNow]));
      const instruction = generateInstructionData(wallet.address, ethers.parseUnits(amount.toString(), CONFIG[chain].DECIMALS), chain, pair);


      try {
        const gasEstimate = await contract.send.estimateGas(channelId, timeoutHeight, timeoutTimestamp, salt, instruction, {
          value: CONFIG[chain].IS_NATIVE ? ethers.parseUnits(amount.toString(), CONFIG[chain].DECIMALS) : 0,
        });
        const gasLimit = (gasEstimate * 120n) / 100n;
        const latestBlock = await provider.getBlock('latest');
        const baseFee = latestBlock.baseFeePerGas || ethers.parseUnits('1', 'gwei');
        const maxPriorityFee = ethers.parseUnits(chain === 'BSC' ? '1' : '0.001', 'gwei');
        const maxFee = baseFee + maxPriorityFee;

        const txOptions = {
          gasLimit,
          maxFeePerGas: maxFee,
          maxPriorityFeePerGas: maxPriorityFee,
          nonce: await provider.getTransactionCount(wallet.address, 'latest'),
          value: CONFIG[chain].IS_NATIVE ? ethers.parseUnits(amount.toString(), CONFIG[chain].DECIMALS) : 0,
        };

        logger.info(`Transaction options: ${JSON.stringify(txOptions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))}`);
        logger.loading('Sending transaction...');

        const tx = await contract.send(channelId, timeoutHeight, timeoutTimestamp, salt, instruction, txOptions);
        logger.info(`Transaction sent: ${tx.hash}`);

        let receipt;
        try {
          receipt = await Promise.race([
            tx.wait(1),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)),
          ]);
          logger.success(`${timelog()} | Wallet ${walletInfo.index} | Transaction Confirmed: ${explorer.tx(receipt.hash, chain)}`);
        } catch (err) {
          logger.error(`Transaction confirmation failed: ${err.message}`);
          const txResponse = await provider.getTransaction(tx.hash);
          if (txResponse && !txResponse.blockNumber) {
            logger.warn(`Transaction ${tx.hash} is still pending in mempool`);
          }
          continue;
        }

        const packetHash = await pollPacketHash(tx.hash);
        if (packetHash) {
          logger.success(`${timelog()} | Wallet ${walletInfo.index} | Packet Submitted: ${union.tx(packetHash)}`);
        }
        console.log('');
      } catch (err) {
        logger.error(`Failed for ${wallet.address}: ${err.message}`);
        if (err.data) logger.error(`Revert data: ${err.data}`);
        console.log('');
      }

      if (i < maxTransaction) {
        await delay(1000);
      }
    }
  } catch (err) {
    logger.error(`Error in sendFromWallet for Wallet ${walletInfo.index}: ${err.message}`);
  }
}

async function main() {
  header();

  const privateKeys = [];
  let index = 1;
  while (process.env[`PRIVATE_KEY_${index}`]) {
    const privateKey = process.env[`PRIVATE_KEY_${index}`].trim();
    if (!privateKey.startsWith('0x')) {
      logger.warn(`Skipping PRIVATE_KEY_${index}: Private key must start with '0x'.`);
    } else if (!/^(0x)[0-9a-fA-F]{64}$/.test(privateKey)) {
      logger.warn(`Skipping PRIVATE_KEY_${index}: Private key is not a valid 64-character hexadecimal string.`);
    } else {
      privateKeys.push({ index, privateKey });
    }
    index++;
  }

  if (privateKeys.length === 0) {
    logger.error('No valid private keys found in .env file.');
    process.exit(1);
  }

  let pair, chain;
  while (true) {
    console.log(`${colors.green}Select Pair:${colors.reset}`);
    console.log(`${colors.white}1. Sepolia to Holesky${colors.reset}`);
    console.log(`${colors.white}2. Holesky to Sepolia${colors.reset}`);
    console.log(`${colors.white}3. Corn to Sei${colors.reset}`);
    console.log(`${colors.white}4. BSC to Sei${colors.reset}`);
    const option = parseInt(await askQuestion('Choose [1/2/3/4] -> '));
    if ([1, 2, 3, 4].includes(option)) {
      pair = option === 1 ? 'SEPOLIA_TO_HOLESKY' :
             option === 2 ? 'HOLESKY_TO_SEPOLIA' :
             option === 3 ? 'CORN_TO_SEI' :
             'BSC_TO_SEI';
      chain = option === 1 ? 'SEPOLIA' :
              option === 2 ? 'HOLESKY' :
              option === 3 ? 'CORN' :
              'BSC';
      break;
    }
    logger.error('Please enter 1, 2, 3, or 4.');
  }

  let maxTransaction;
  while (true) {
    const maxTransactionInput = await askQuestion('Enter the number of transactions per wallet: ');
    maxTransaction = parseInt(maxTransactionInput.trim());
    if (!isNaN(maxTransaction) && maxTransaction > 0) break;
    logger.error('Invalid number. Please enter a positive number.');
  }

  let amount;
  const ticker = CONFIG[chain].BASE_TOKEN_NAME;
  while (true) {
    const amountInput = await askQuestion(`Enter ${ticker} amount (e.g., 0.001): `);
    amount = parseFloat(amountInput.trim());
    if (!isNaN(amount) && amount > 0) break;
    logger.error('Amount must be greater than 0.');
  }

  for (const walletInfo of privateKeys) {
    logger.loading(`Sending ${maxTransaction} Transaction ${pair} from Wallet ${walletInfo.index}`);
    await sendFromWallet(walletInfo, maxTransaction, chain, walletInfo.privateKey, amount, pair);
  }

  logger.success('All wallets processed.');
  rl.close();
}

main().catch((err) => {
  logger.error(`Main error: ${err.message}`);
  process.exit(1);
});
