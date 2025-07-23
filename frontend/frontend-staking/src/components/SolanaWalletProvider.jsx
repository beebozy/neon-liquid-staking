import React, { createContext, useContext, useState, useEffect } from 'react'

const SolanaWalletContext = createContext()

export const useSolanaWallet = () => {
    const context = useContext(SolanaWalletContext)
    if (!context) {
        throw new Error('useSolanaWallet must be used within SolanaWalletProvider')
    }
    return context
}

export const SolanaWalletProvider = ({ children }) => {
    const [wallet, setWallet] = useState(null)
    const [publicKey, setPublicKey] = useState(null)
    const [connected, setConnected] = useState(false)
    const [connecting, setConnecting] = useState(false)

    // Check if Phantom is installed
    const getProvider = () => {
        if (typeof window !== 'undefined' && window.solana) {
            const provider = window.solana
            if (provider.isPhantom) {
                return provider
            }
        }
        // Also check for Solflare
        if (typeof window !== 'undefined' && window.solflare) {
            return window.solflare
        }
        return null
    }

    // Connect to wallet
    const connect = async () => {
        const provider = getProvider()
        if (!provider) {
            alert('Please install Phantom wallet from https://phantom.app/')
            return
        }

        try {
            setConnecting(true)
            const response = await provider.connect()
            setWallet(provider)
            setPublicKey(response.publicKey)
            setConnected(true)

            console.log('Connected to Solana wallet:', response.publicKey.toString())
        } catch (error) {
            console.error('Failed to connect wallet:', error)
        } finally {
            setConnecting(false)
        }
    }

    // Disconnect wallet
    const disconnect = async () => {
        if (wallet) {
            try {
                await wallet.disconnect()
            } catch (error) {
                console.error('Error disconnecting:', error)
            }
        }
        setWallet(null)
        setPublicKey(null)
        setConnected(false)
    }

    // Sign transaction
    const signTransaction = async (transaction) => {
        if (!wallet) throw new Error('Wallet not connected')
        return await wallet.signTransaction(transaction)
    }

    // Sign and send transaction
    const signAndSendTransaction = async (transaction) => {
        if (!wallet) throw new Error('Wallet not connected')
        return await wallet.signAndSendTransaction(transaction)
    }

    // Auto-connect on page load if previously connected
    useEffect(() => {
        const provider = getProvider()
        if (provider) {
            provider.on('connect', (publicKey) => {
                setWallet(provider)
                setPublicKey(publicKey)
                setConnected(true)
            })

            provider.on('disconnect', () => {
                setWallet(null)
                setPublicKey(null)
                setConnected(false)
            })

            // Try to eagerly connect
            if (provider.isConnected) {
                setWallet(provider)
                setPublicKey(provider.publicKey)
                setConnected(true)
            }
        }

        return () => {
            if (provider) {
                provider.removeAllListeners()
            }
        }
    }, [])

    const value = {
        wallet,
        publicKey,
        connected,
        connecting,
        connect,
        disconnect,
        signTransaction,
        signAndSendTransaction
    }

    return (
        <SolanaWalletContext.Provider value={value}>
            {children}
        </SolanaWalletContext.Provider>
    )
} 