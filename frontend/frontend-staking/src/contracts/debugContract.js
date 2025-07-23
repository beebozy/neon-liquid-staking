import { ethers } from 'ethers'
import { CONTRACT_CONFIG } from './config'

// Common contract error signatures and their meanings
const COMMON_ERRORS = {
    '0x4e487b71': 'Panic: Arithmetic overflow/underflow',
    '0x08c379a0': 'Error: String revert reason',
    '0xe450d38c': 'Insufficient balance',
    '0xa2a7201c': 'Insufficient allowance',
    '0x9996b315': 'ERC20: transfer amount exceeds balance',
    '0xf4d678b8': 'ERC20: transfer amount exceeds allowance',
}

// Decode contract errors to human-readable messages
export const decodeContractError = (error) => {
    try {
        // Check if it's a revert with reason
        if (error.reason) {
            return error.reason
        }

        // Check if it's a custom error with data
        if (error.data) {
            const errorData = error.data

            // Check for common error signatures
            if (typeof errorData === 'string' && errorData.length >= 10) {
                const signature = errorData.slice(0, 10).toLowerCase()
                if (COMMON_ERRORS[signature]) {
                    return COMMON_ERRORS[signature]
                }
            }

            // Try to decode string errors
            if (errorData.startsWith('0x08c379a0')) {
                try {
                    const abiCoder = new ethers.AbiCoder()
                    const decodedError = abiCoder.decode(['string'], '0x' + errorData.slice(10))
                    return decodedError[0]
                } catch (decodeErr) {
                    console.warn('Failed to decode string error:', decodeErr)
                }
            }
        }

        // Check for specific staking contract errors
        if (error.message) {
            const message = error.message.toLowerCase()

            if (message.includes('insufficient funds')) {
                return 'Insufficient funds for transaction'
            }
            if (message.includes('user rejected') || message.includes('user denied')) {
                return 'Transaction cancelled by user'
            }
            if (message.includes('gas required exceeds allowance')) {
                return 'Gas limit too low'
            }
            if (message.includes('already staked')) {
                return 'User has already staked'
            }
            if (message.includes('no stake found')) {
                return 'No active stake found'
            }
            if (message.includes('stake is locked')) {
                return 'Stake is still in vesting period'
            }
            if (message.includes('amount below minimum')) {
                return 'Stake amount below minimum required'
            }
            if (message.includes('amount above maximum')) {
                return 'Stake amount exceeds maximum allowed'
            }
            if (message.includes('invalid amount')) {
                return 'Invalid stake amount'
            }
        }

        // Return generic error message if we can't decode it
        return error.message || 'Unknown contract error'
    } catch (err) {
        console.error('Error decoding contract error:', err)
        return 'Unknown contract error'
    }
}

// Debug contract functionality
export const debugContract = {
    // Run comprehensive diagnostic checks before staking
    fullDiagnostic: async (provider, userAddress, lamports) => {
        const issues = []

        try {
            console.log('🔍 Running full diagnostic...')
            console.log('User:', userAddress)
            console.log('Amount:', lamports, 'lamports')

            // Check 1: Verify user balance
            try {
                const balance = await provider.getBalance(userAddress)
                console.log('ETH Balance:', ethers.formatEther(balance), 'ETH')

                // Check if user has enough ETH for gas
                if (balance < ethers.parseEther('0.001')) {
                    issues.push('Insufficient ETH balance for transaction fees')
                }
            } catch (err) {
                console.error('Failed to check ETH balance:', err)
                issues.push('Unable to verify ETH balance')
            }

            // Check 2: Verify network connection
            try {
                const network = await provider.getNetwork()
                console.log('Network:', network.name, 'ChainId:', network.chainId)
            } catch (err) {
                console.error('Failed to get network info:', err)
                issues.push('Network connection issue')
            }

            // Check 3: Validate stake amount
            if (!lamports || lamports <= 0) {
                issues.push('Invalid stake amount')
            } else {
                // Check minimum and maximum stake amounts if available
                try {
                    const minStake = CONTRACT_CONFIG.MIN_STAKE_LAMPORTS || 0
                    const maxStake = CONTRACT_CONFIG.MAX_STAKE_LAMPORTS || Number.MAX_SAFE_INTEGER

                    if (lamports < minStake) {
                        issues.push(`Stake amount below minimum (${minStake} lamports)`)
                    }
                    if (lamports > maxStake) {
                        issues.push(`Stake amount exceeds maximum (${maxStake} lamports)`)
                    }
                } catch (err) {
                    console.warn('Could not validate stake limits:', err)
                }
            }

            console.log('Diagnostic complete. Issues found:', issues.length)

            return {
                issues,
                passed: issues.length === 0,
                timestamp: new Date().toISOString()
            }

        } catch (err) {
            console.error('Diagnostic failed:', err)
            return {
                issues: ['Diagnostic check failed: ' + err.message],
                passed: false,
                timestamp: new Date().toISOString()
            }
        }
    },

    // Log contract state for debugging
    logContractState: async (contract, userAddress) => {
        try {
            console.log('📊 Contract State Debug:')

            if (contract && userAddress) {
                const stake = await contract.stakes(userAddress)
                console.log('User Stake:', {
                    wsolAmount: stake.wsolAmount.toString(),
                    usdtTokensGranted: stake.usdtTokensGranted.toString(),
                    usdtTokensClaimed: stake.usdtTokensClaimed.toString(),
                    startTime: stake.startTime.toString(),
                    unstaked: stake.unstaked
                })
            }
        } catch (err) {
            console.error('Failed to log contract state:', err)
        }
    }
} 