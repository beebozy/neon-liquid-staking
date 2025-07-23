// Neon EVM Configuration for Solana Native SDK

export const NEON_CONFIG = {
    // Network Configuration
    NETWORKS: {
        DEVNET: {
            name: 'Neon Devnet',
            neonRpcUrl: 'https://devnet.neonevm.org',
            solanaRpcUrl: 'https://api.devnet.solana.com',
            chainId: 245022926,
            explorer: 'https://neonscan.org',
            solanaExplorer: 'https://explorer.solana.com'
        },
        MAINNET: {
            name: 'Neon Mainnet',
            neonRpcUrl: 'https://neon-proxy-mainnet.solana.p2p.org',
            solanaRpcUrl: 'https://api.mainnet-beta.solana.com',
            chainId: 245022934,
            explorer: 'https://neonscan.org',
            solanaExplorer: 'https://explorer.solana.com'
        }
    },

    // Current network (switch to MAINNET for production)
    CURRENT_NETWORK: 'DEVNET',

    // Contract Addresses (UPDATE THESE WITH YOUR DEPLOYED CONTRACTS)
    CONTRACTS: {
        // Your deployed LiquidStaking contract address on Neon EVM
        LIQUID_STAKING: '0xf91590aBfF74B67Ea8350870A5C1B71b6e927cA8', // REPLACE WITH ACTUAL ADDRESS

        // Token addresses on Neon EVM (these are wrapped Solana tokens)
        WSOL_TOKEN: '0xc7Fc9b46e479c5Cb42f6C458D1881e55E6B7986c', // REPLACE WITH ACTUAL WSOL ADDRESS
        USDT_TOKEN: '0xeF435b46900707b883C15b71B53f34957ce85acD'  // REPLACE WITH ACTUAL USDT ADDRESS
    },

    // Staking Parameters (should match your contract)
    STAKING: {
        MIN_STAKE: 0.1, // 0.1 WSOL
        MAX_STAKE: 1.0, // 1.0 WSOL
        STAKE_MULTIPLE: 0.1, // Must be multiple of 0.1 WSOL
        TOKENS_PER_STAKE: 0.1, // 0.1 USDT per 0.1 WSOL
        VESTING_PERIOD: 30 * 60, // 30 minutes in seconds
        VESTING_CLIFF: 7 * 60    // 7 minutes in seconds
    },

    // Transaction Parameters
    TRANSACTION: {
        GAS_LIMIT: 300000,
        GAS_PRICE: '1000000000', // 1 gwei in wei
        CONFIRMATION_BLOCKS: 1
    }
};

// Helper functions
export const getCurrentNetwork = () => {
    return NEON_CONFIG.NETWORKS[NEON_CONFIG.CURRENT_NETWORK];
};

export const getContractAddress = (contractName) => {
    const address = NEON_CONFIG.CONTRACTS[contractName];
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        console.warn(`⚠️ Contract ${contractName} not configured. Please update neonConfig.js`);
    }
    return address;
};

export const validateStakeAmount = (amount) => {
    const { MIN_STAKE, MAX_STAKE, STAKE_MULTIPLE } = NEON_CONFIG.STAKING;

    if (amount < MIN_STAKE) {
        return { valid: false, error: `Minimum stake is ${MIN_STAKE} WSOL` };
    }

    if (amount > MAX_STAKE) {
        return { valid: false, error: `Maximum stake is ${MAX_STAKE} WSOL` };
    }

    if (amount % STAKE_MULTIPLE !== 0) {
        return { valid: false, error: `Amount must be a multiple of ${STAKE_MULTIPLE} WSOL` };
    }

    return { valid: true };
};

export const formatTokenAmount = (amount, decimals = 9) => {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toFixed(4);
};

export const parseTokenAmount = (amount, decimals = 9) => {
    return Math.floor(parseFloat(amount) * Math.pow(10, decimals)).toString();
};

// Contract ABIs (minimal interfaces for the functions we need)
export const CONTRACT_ABIS = {
    LIQUID_STAKING: [
        'function stake(uint256 amount)',
        'function unstake()',
        'function claim()',
        'function stakes(address user) view returns (uint256 wsolAmount, uint256 usdtTokensGranted, uint256 usdtTokensClaimed, uint256 startTime, bool unstaked)',
        'function calculateVestedAmount(address user) view returns (uint256)',
        'function MIN_STAKE() view returns (uint256)',
        'function MAX_STAKE() view returns (uint256)',
        'function VESTING_PERIOD() view returns (uint256)',
        'function VESTING_CLIFF() view returns (uint256)'
    ],

    ERC20: [
        'function balanceOf(address account) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
    ]
}; 