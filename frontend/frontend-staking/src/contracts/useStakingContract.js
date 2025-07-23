import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { LIQUID_STAKING_ABI } from './LiquidStakingABI'
import { CONTRACT_CONFIG, wsolToLamports } from './config'
import { debugContract, decodeContractError } from './debugContract'
import { handleWSOLApproval } from './wsol-approval'

export const useStakingContract = () => {
    const [contract, setContract] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [userStake, setUserStake] = useState(null)

    // Initialize contract
    const initContract = async (signer) => {
        try {
            if (!signer) {
                setError('No signer provided')
                return
            }

            const contractInstance = new ethers.Contract(
                CONTRACT_CONFIG.LIQUID_STAKING_ADDRESS,
                LIQUID_STAKING_ABI,
                signer
            )

            setContract(contractInstance)
            setError(null)
            return contractInstance
        } catch (err) {
            setError(`Failed to initialize contract: ${err.message}`)
            console.error('Contract initialization error:', err)
        }
    }

    // Get user's stake information
    const getUserStake = async (userAddress) => {
        if (!contract || !userAddress) return null

        try {
            setLoading(true)
            const stake = await contract.stakes(userAddress)

            const stakeData = {
                wsolAmount: stake.wsolAmount.toString(),
                usdtTokensGranted: stake.usdtTokensGranted.toString(),
                usdtTokensClaimed: stake.usdtTokensClaimed.toString(),
                startTime: stake.startTime.toString(),
                unstaked: stake.unstaked
            }

            setUserStake(stakeData)
            return stakeData
        } catch (err) {
            setError(`Failed to get user stake: ${err.message}`)
            console.error('Get user stake error:', err)
            return null
        } finally {
            setLoading(false)
        }
    }

    // Run diagnostic before staking
    const runDiagnostic = async (provider, userAddress, amount) => {
        const lamports = wsolToLamports(amount)
        const diagnostic = await debugContract.fullDiagnostic(provider, userAddress, lamports)
        return diagnostic
    }

    // Stake function with enhanced debugging and WSOL approval
    const stake = async (amount) => {
        if (!contract) {
            setError('Contract not initialized')
            return false
        }

        try {
            setLoading(true)
            setError(null)

            const lamports = wsolToLamports(amount)
            const provider = contract.runner.provider
            const userAddress = await contract.runner.getAddress()
            const signer = contract.runner

            console.log('🚀 Starting stake process...')
            console.log('Amount:', amount, 'WSOL =', lamports, 'lamports')
            console.log('User address:', userAddress)

            // Step 1: Handle WSOL approval
            console.log('🔑 Step 1: Handling WSOL approval...')
            try {
                await handleWSOLApproval(signer, lamports)
            } catch (approvalError) {
                console.error('❌ WSOL approval failed:', approvalError)
                setError(`WSOL approval failed: ${approvalError.message}`)
                return false
            }

            // Step 2: Run comprehensive diagnostic
            console.log('🔍 Step 2: Running pre-stake diagnostic...')
            const diagnostic = await runDiagnostic(provider, userAddress, amount)

            if (diagnostic.issues.length > 0) {
                const issueMessage = `Pre-stake check failed:\n${diagnostic.issues.join('\n')}`
                console.error('❌ Pre-stake issues found:', diagnostic.issues)
                setError(issueMessage)
                return false
            }

            console.log('✅ Pre-stake checks passed')

            // Step 3: Execute stake transaction
            console.log('📤 Step 3: Sending stake transaction...')
            const tx = await contract.stake(lamports)

            console.log('⏳ Transaction sent:', tx.hash)

            // Wait for confirmation
            const receipt = await tx.wait()

            console.log('✅ Transaction confirmed:', receipt)

            return true
        } catch (err) {
            console.error('❌ Stake transaction failed:', err)

            let errorMessage = 'Failed to stake'

            // Try to decode the contract error
            const decodedError = decodeContractError(err)
            if (decodedError !== 'Unknown contract error') {
                errorMessage = decodedError
            } else if (err.reason) {
                errorMessage = err.reason
            } else if (err.data?.message) {
                errorMessage = err.data.message
            } else if (err.message) {
                errorMessage = err.message
            }

            // Log detailed error info for debugging
            console.error('Detailed error info:', {
                message: err.message,
                code: err.code,
                data: err.data,
                reason: err.reason
            })

            setError(errorMessage)
            return false
        } finally {
            setLoading(false)
        }
    }

    // Unstake function
    const unstake = async () => {
        if (!contract) {
            setError('Contract not initialized')
            return false
        }

        try {
            setLoading(true)
            setError(null)

            const tx = await contract.unstake()

            console.log('Unstake transaction sent:', tx.hash)

            const receipt = await tx.wait()

            console.log('Unstake transaction confirmed:', receipt)

            return true
        } catch (err) {
            let errorMessage = 'Failed to unstake'

            const decodedError = decodeContractError(err)
            if (decodedError !== 'Unknown contract error') {
                errorMessage = decodedError
            } else if (err.reason) {
                errorMessage = err.reason
            } else if (err.data?.message) {
                errorMessage = err.data.message
            } else if (err.message) {
                errorMessage = err.message
            }

            setError(errorMessage)
            console.error('Unstake error:', err)
            return false
        } finally {
            setLoading(false)
        }
    }

    // Claim function
    const claim = async () => {
        if (!contract) {
            setError('Contract not initialized')
            return false
        }

        try {
            setLoading(true)
            setError(null)

            const tx = await contract.claim()

            console.log('Claim transaction sent:', tx.hash)

            const receipt = await tx.wait()

            console.log('Claim transaction confirmed:', receipt)

            return true
        } catch (err) {
            let errorMessage = 'Failed to claim'

            const decodedError = decodeContractError(err)
            if (decodedError !== 'Unknown contract error') {
                errorMessage = decodedError
            } else if (err.reason) {
                errorMessage = err.reason
            } else if (err.data?.message) {
                errorMessage = err.data.message
            } else if (err.message) {
                errorMessage = err.message
            }

            setError(errorMessage)
            console.error('Claim error:', err)
            return false
        } finally {
            setLoading(false)
        }
    }

    // Get contract constants
    const getContractConstants = async () => {
        if (!contract) return null

        try {
            const [minStake, maxStake, stakeMultiple, tokensPerStake, vestingPeriod, vestingCliff] = await Promise.all([
                contract.MIN_STAKE(),
                contract.MAX_STAKE(),
                contract.STAKE_MULTIPLE(),
                contract.TOKENS_PER_STAKE(),
                contract.VESTING_PERIOD(),
                contract.VESTING_CLIFF()
            ])

            return {
                minStake: minStake.toString(),
                maxStake: maxStake.toString(),
                stakeMultiple: stakeMultiple.toString(),
                tokensPerStake: tokensPerStake.toString(),
                vestingPeriod: vestingPeriod.toString(),
                vestingCliff: vestingCliff.toString()
            }
        } catch (err) {
            console.error('Failed to get contract constants:', err)
            return null
        }
    }

    // Calculate vested amount
    const calculateVestedAmount = (stake) => {
        if (!stake || stake.unstaked) return stake?.usdtTokensGranted || 0

        const now = Math.floor(Date.now() / 1000)
        const startTime = parseInt(stake.startTime)
        const vestingCliff = CONTRACT_CONFIG.VESTING_CLIFF
        const vestingPeriod = CONTRACT_CONFIG.VESTING_PERIOD

        if (now < startTime + vestingCliff) {
            return 0
        }

        const elapsed = now - startTime
        if (elapsed >= vestingPeriod) {
            return stake.usdtTokensGranted
        }

        const vestedAmount = (BigInt(stake.usdtTokensGranted) * BigInt(elapsed)) / BigInt(vestingPeriod)
        return vestedAmount.toString()
    }

    return {
        contract,
        loading,
        error,
        userStake,
        initContract,
        getUserStake,
        stake,
        unstake,
        claim,
        getContractConstants,
        calculateVestedAmount,
        runDiagnostic,
        setError
    }
} 