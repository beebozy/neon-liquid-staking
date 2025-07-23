import React, { createContext, useContext, useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { ethers } from 'ethers'
import { useStakingContract } from '../contracts/useStakingContract'
import { CONTRACT_CONFIG } from '../contracts/config'

const ContractContext = createContext()

export const useContract = () => {
    const context = useContext(ContractContext)
    if (!context) {
        throw new Error('useContract must be used within a ContractProvider')
    }
    return context
}

export const ContractProvider = ({ children }) => {
    const { publicKey, connected } = useWallet()
    const [provider, setProvider] = useState(null)
    const [signer, setSigner] = useState(null)
    const [neonWalletAddress, setNeonWalletAddress] = useState(null)
    const [isConnected, setIsConnected] = useState(false)

    const stakingContract = useStakingContract()

    // Initialize Neon EVM provider and signer
    const initializeNeonProvider = async () => {
        try {
            if (!connected || !publicKey) {
                setIsConnected(false)
                return
            }

            // Check if MetaMask or other EVM wallet is available
            if (typeof window.ethereum !== 'undefined') {
                const ethProvider = new ethers.BrowserProvider(window.ethereum)

                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' })

                // Switch to Neon network if not already connected
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: `0x${CONTRACT_CONFIG.NEON_CHAIN_ID.toString(16)}` }],
                    })
                } catch (switchError) {
                    // If the network doesn't exist, add it
                    if (switchError.code === 4902) {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: `0x${CONTRACT_CONFIG.NEON_CHAIN_ID.toString(16)}`,
                                chainName: 'Neon EVM MainNet',
                                nativeCurrency: {
                                    name: 'NEON',
                                    symbol: 'NEON',
                                    decimals: 18
                                },
                                rpcUrls: [CONTRACT_CONFIG.NEON_RPC_URL],
                                blockExplorerUrls: ['https://neonscan.org/']
                            }]
                        })
                    }
                }

                const ethSigner = await ethProvider.getSigner()
                const address = await ethSigner.getAddress()

                setProvider(ethProvider)
                setSigner(ethSigner)
                setNeonWalletAddress(address)
                setIsConnected(true)

                // Initialize contract
                await stakingContract.initContract(ethSigner)

                // Get user stake info
                await stakingContract.getUserStake(address)

            } else {
                stakingContract.setError('MetaMask or compatible wallet not found. Please install MetaMask to interact with the contract.')
            }
        } catch (error) {
            console.error('Failed to initialize Neon provider:', error)
            stakingContract.setError(`Failed to connect to Neon EVM: ${error.message}`)
            setIsConnected(false)
        }
    }

    // Initialize when wallet connects
    useEffect(() => {
        if (connected && publicKey) {
            initializeNeonProvider()
        } else {
            setIsConnected(false)
            setProvider(null)
            setSigner(null)
            setNeonWalletAddress(null)
        }
    }, [connected, publicKey])

    // Refresh user stake data
    const refreshUserStake = async () => {
        if (neonWalletAddress) {
            await stakingContract.getUserStake(neonWalletAddress)
        }
    }

    // Connect to MetaMask
    const connectMetaMask = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                await window.ethereum.request({ method: 'eth_requestAccounts' })
                await initializeNeonProvider()
                return true
            } catch (error) {
                console.error('MetaMask connection error:', error)
                stakingContract.setError(`Failed to connect MetaMask: ${error.message}`)
                return false
            }
        } else {
            stakingContract.setError('MetaMask not found. Please install MetaMask.')
            return false
        }
    }

    // Handle account changes
    useEffect(() => {
        if (typeof window.ethereum !== 'undefined') {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length === 0) {
                    setIsConnected(false)
                    setNeonWalletAddress(null)
                } else {
                    initializeNeonProvider()
                }
            }

            const handleChainChanged = () => {
                window.location.reload()
            }

            window.ethereum.on('accountsChanged', handleAccountsChanged)
            window.ethereum.on('chainChanged', handleChainChanged)

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
                window.ethereum.removeListener('chainChanged', handleChainChanged)
            }
        }
    }, [])

    const value = {
        // Provider info
        provider,
        signer,
        neonWalletAddress,
        isConnected,

        // Contract functions
        ...stakingContract,

        // Additional functions
        refreshUserStake,
        connectMetaMask,

        // Solana wallet info
        solanaWallet: {
            publicKey,
            connected
        }
    }

    return (
        <ContractContext.Provider value={value}>
            {children}
        </ContractContext.Provider>
    )
} 