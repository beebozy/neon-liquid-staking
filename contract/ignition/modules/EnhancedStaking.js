const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("EnhancedLiquidStakingModule", (m) => {
    // Deploy parameters - replace with actual token addresses
    const wsolTokenAddress = m.getParameter("wsolToken", "0x"); // Replace with actual WSOL token address
    const usdtTokenAddress = m.getParameter("usdtToken", "0x"); // Replace with actual USDT token address

    console.log("Deploying Enhanced Liquid Staking Contract...");
    console.log("WSOL Token:", wsolTokenAddress);
    console.log("USDT Token:", usdtTokenAddress);

    // Deploy the Enhanced Liquid Staking Contract
    const enhancedLiquidStaking = m.contract("EnhancedLiquidStaking", [
        wsolTokenAddress,
        usdtTokenAddress
    ]);

    console.log("Enhanced Liquid Staking deployed with advanced Solana integrations");

    return {
        enhancedLiquidStaking,
        wsolToken: wsolTokenAddress,
        usdtToken: usdtTokenAddress
    };
});

// Example deployment configuration
module.exports.tags = ["EnhancedStaking"];

/*
Deployment Instructions:

1. Update token addresses in the parameters above
2. Run deployment:
   npx hardhat ignition deploy ./ignition/modules/EnhancedStaking.js --network neon-devnet

3. Verify the deployment:
   npx hardhat verify --network neon-devnet DEPLOYED_CONTRACT_ADDRESS "WSOL_ADDRESS" "USDT_ADDRESS"

Network Configuration (add to hardhat.config.js):

networks: {
  "neon-devnet": {
    url: "https://devnet.neonevm.org",
    accounts: [process.env.PRIVATE_KEY], // Your private key
    chainId: 245022926,
    gas: 3000000,
    gasPrice: 1000000000
  },
  "neon-mainnet": {
    url: "https://neon-proxy-mainnet.solana.p2p.org",
    accounts: [process.env.PRIVATE_KEY],
    chainId: 245022934,
    gas: 3000000,
    gasPrice: 1000000000
  }
}

Environment Variables (.env):
PRIVATE_KEY=your_private_key_here
WSOL_TOKEN_ADDRESS=0x...
USDT_TOKEN_ADDRESS=0x...
*/ 