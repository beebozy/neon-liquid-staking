import React, { useState, useEffect } from 'react';
import { useSolanaNative } from './SolanaNativeProvider';

export default function SolanaHeader() {
    const {
        connected,
        solanaPublicKey,
        neonAddress,
        connect,
        disconnect,
        getSolBalance
    } = useSolanaNative();

    const [solBalance, setSolBalance] = useState(0);

    useEffect(() => {
        if (connected) {
            updateBalance();
            // Update balance every 30 seconds
            const interval = setInterval(updateBalance, 30000);
            return () => clearInterval(interval);
        }
    }, [connected]);

    const updateBalance = async () => {
        try {
            const balance = await getSolBalance();
            setSolBalance(balance);
        } catch (error) {
            console.error('Failed to update balance:', error);
        }
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const containerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '10px',
        marginBottom: '20px'
    };

    const titleStyle = {
        fontSize: '24px',
        fontWeight: 'bold',
        margin: '0'
    };

    const walletInfoStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    };

    const buttonStyle = {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'all 0.3s ease'
    };

    const connectButtonStyle = {
        ...buttonStyle,
        background: '#4CAF50',
        color: 'white'
    };

    const disconnectButtonStyle = {
        ...buttonStyle,
        background: '#f44336',
        color: 'white'
    };

    const addressCardStyle = {
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        backdropFilter: 'blur(10px)'
    };

    return (
        <div style={containerStyle}>
            <div>
                <h1 style={titleStyle}>🌟 Liquid Staking</h1>
                <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '14px' }}>
                    Powered by Solana Native SDK + Neon EVM
                </p>
            </div>

            <div style={walletInfoStyle}>
                {connected ? (
                    <>
                        <div style={addressCardStyle}>
                            <div><strong>Solana:</strong> {formatAddress(solanaPublicKey?.toString())}</div>
                            <div><strong>Neon:</strong> {formatAddress(neonAddress)}</div>
                            <div><strong>SOL:</strong> {solBalance.toFixed(4)} SOL</div>
                        </div>
                        <button
                            style={disconnectButtonStyle}
                            onClick={disconnect}
                            onMouseOver={(e) => e.target.style.background = '#da190b'}
                            onMouseOut={(e) => e.target.style.background = '#f44336'}
                        >
                            Disconnect
                        </button>
                    </>
                ) : (
                    <button
                        style={connectButtonStyle}
                        onClick={connect}
                        onMouseOver={(e) => e.target.style.background = '#45a049'}
                        onMouseOut={(e) => e.target.style.background = '#4CAF50'}
                    >
                        Connect Solana Wallet
                    </button>
                )}
            </div>
        </div>
    );
} 