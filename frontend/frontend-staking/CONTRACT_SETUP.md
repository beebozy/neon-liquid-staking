# Contract Integration Setup Guide

This frontend has been integrated with the LiquidStaking smart contract. Follow these steps to set it up:

## 1. Update Contract Configuration

Edit `src/contracts/config.js` and replace the placeholder addresses:

```javascript
LIQUID_STAKING_ADDRESS: "YOUR_DEPLOYED_CONTRACT_ADDRESS"
WSOL_TOKEN_ADDRESS: "YOUR_WSOL_TOKEN_ADDRESS"  
USDT_TOKEN_ADDRESS: "YOUR_USDT_TOKEN_ADDRESS"
```

## 2. Required Wallets

Users need:
- **Solana Wallet** (Phantom/Solflare) for initial connection
- **MetaMask** for Neon EVM contract interactions

## 3. Features Implemented

### Staking
- Stake 0.1 to 1.0 WSOL in 0.1 increments
- Receive vested USDT tokens (0.1 USDT per 0.1 WSOL)
- 30-minute vesting period with 7-minute cliff

### Unstaking
- Unstake WSOL anytime
- Keep vested tokens after unstaking

### Claiming
- Claim vested tokens after cliff period
- Real-time vesting progress tracking

## 4. Usage Flow

1. Connect Solana wallet
2. Connect MetaMask for Neon EVM
3. Stake WSOL tokens
4. Monitor vesting progress
5. Claim tokens as they vest
6. Unstake when needed

## 5. Files Added/Modified

- `src/contracts/LiquidStakingABI.js` - Contract ABI
- `src/contracts/config.js` - Configuration and helpers
- `src/contracts/useStakingContract.js` - Contract interaction hook
- `src/components/ContractProvider.jsx` - Contract context provider
- `src/pages/Stake.jsx` - Updated with contract integration
- `src/pages/Unstake.jsx` - Updated with contract integration
- `src/pages/Withdraw.jsx` - Updated with contract integration
- `src/App.jsx` - Wrapped with ContractProvider

## 6. Testing

After configuration:
1. Run `yarn dev`
2. Connect wallets
3. Test stake/unstake/claim functionality

Make sure to update the contract addresses before using! 