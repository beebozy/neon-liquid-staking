// Contract Configuration
export const CONTRACT_CONFIG = {
    // Replace with your deployed contract address
    LIQUID_STAKING_ADDRESS: "0xf91590aBfF74B67Ea8350870A5C1B71b6e927cA8",

    // Replace with your token addresses
    WSOL_TOKEN_ADDRESS: "0xc7Fc9b46e479c5Cb42f6C458D1881e55E6B7986c",
    USDT_TOKEN_ADDRESS: "0xeF435b46900707b883C15b71B53f34957ce85acD",

    // Network configuration (Neon EVM)
    NEON_RPC_URL: "https://devnet.neonevm.org",
    NEON_CHAIN_ID:  245022926, // Neon Mainnet

    // Constants from the contract
    MIN_STAKE: 100000000, // 0.1 WSOL in lamports
    MAX_STAKE: 1000000000, // 1 WSOL in lamports
    STAKE_MULTIPLE: 100000000, // 0.1 WSOL
    TOKENS_PER_STAKE: 100000, // 0.1 USDT (6 decimals)
    VESTING_PERIOD: 30 * 60, // 30 minutes
    VESTING_CLIFF: 7 * 60, // 7 minutes
}

// Helper function to convert WSOL to lamports
export const wsolToLamports = (wsol) => {
    return Math.floor(wsol * 1e9)
}

// Helper function to convert lamports to WSOL
export const lamportsToWsol = (lamports) => {
    return lamports / 1e9
}

// Helper function to format USDT amount
export const formatUsdtAmount = (amount) => {
    return (amount / 1e6).toFixed(6)
}

// Helper function to validate stake amount
export const isValidStakeAmount = (amount) => {
    const lamports = wsolToLamports(amount)
    return (
        lamports >= CONTRACT_CONFIG.MIN_STAKE &&
        lamports <= CONTRACT_CONFIG.MAX_STAKE &&
        lamports % CONTRACT_CONFIG.STAKE_MULTIPLE === 0
    )
}

// Available stake amounts
export const AVAILABLE_STAKE_AMOUNTS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] 