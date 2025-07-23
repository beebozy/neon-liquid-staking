import { ethers } from 'ethers'
import { CONTRACT_CONFIG } from './config'

// WSOL Token ABI for approval
const WSOL_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function transferSolana(bytes32 recipient, uint64 amount) returns (bool)"
]

export const handleWSOLApproval = async (signer, amount) => {
    try {
        console.log('🔑 Checking WSOL approval...')

        const userAddress = await signer.getAddress()
        const wsolContract = new ethers.Contract(
            CONTRACT_CONFIG.WSOL_TOKEN_ADDRESS,
            WSOL_ABI,
            signer
        )

        // Check current allowance
        const currentAllowance = await wsolContract.allowance(
            userAddress,
            CONTRACT_CONFIG.LIQUID_STAKING_ADDRESS
        )

        console.log('Current allowance:', currentAllowance.toString())
        console.log('Required amount:', amount.toString())

        // If allowance is insufficient, request approval
        if (BigInt(currentAllowance.toString()) < BigInt(amount.toString())) {
            console.log('💰 Requesting WSOL approval...')

            // Request approval for a large amount to avoid frequent approvals
            const approvalAmount = ethers.MaxUint256 // Max approval

            const approveTx = await wsolContract.approve(
                CONTRACT_CONFIG.LIQUID_STAKING_ADDRESS,
                approvalAmount
            )

            console.log('⏳ Approval transaction sent:', approveTx.hash)
            await approveTx.wait()
            console.log('✅ WSOL approval confirmed')

            return true
        } else {
            console.log('✅ Sufficient allowance already exists')
            return true
        }

    } catch (error) {
        console.error('❌ WSOL approval failed:', error)
        throw new Error(`WSOL approval failed: ${error.message}`)
    }
}

export const checkWSOLBalance = async (provider, userAddress) => {
    try {
        const wsolContract = new ethers.Contract(
            CONTRACT_CONFIG.WSOL_TOKEN_ADDRESS,
            WSOL_ABI,
            provider
        )

        const balance = await wsolContract.balanceOf(userAddress)
        return balance.toString()
    } catch (error) {
        console.error('Failed to check WSOL balance:', error)
        return '0'
    }
} 