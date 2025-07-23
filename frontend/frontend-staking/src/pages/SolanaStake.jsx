import React, { useState, useEffect } from 'react';
import { useSolanaNative } from '../components/SolanaNativeProvider';
import { getContractAddress, validateStakeAmount, parseTokenAmount, formatTokenAmount } from '../config/neonConfig';

export default function SolanaStake() {
    const {
        connected,
        solanaPublicKey,
        neonAddress,
        stake,
        getUserStake,
        connect,
        isDemoMode
    } = useSolanaNative();

    const [amount, setAmount] = useState('0.1');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [userStake, setUserStake] = useState(null);

    const contractAddress = getContractAddress('LIQUID_STAKING');

    // Load user stake data
    useEffect(() => {
        if (connected && neonAddress) {
            loadUserStake();
        }
    }, [connected, neonAddress]);

    const loadUserStake = async () => {
        try {
            const stakeData = await getUserStake(contractAddress, neonAddress);
            setUserStake(stakeData);
        } catch (error) {
            console.error('Failed to load user stake:', error);
        }
    };

    const handleStake = async () => {
        // If not connected, prompt for wallet connection first
        if (!connected) {
            setLoading(true);
            setError('');
            setSuccess('');

            try {
                console.log('🔗 Wallet not connected, prompting for connection...');
                await connect();

                // Check if connection was successful
                if (!connected) {
                    setError('Wallet connection failed. Please try again.');
                    setLoading(false);
                    return;
                }
            } catch (error) {
                console.error('Failed to connect wallet:', error);
                setError('Failed to connect wallet. Please try again.');
                setLoading(false);
                return;
            }
        }

        // Validate amount
        const validation = validateStakeAmount(parseFloat(amount));
        if (!validation.valid) {
            setError(validation.error);
            if (!connected) setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            console.log('🚀 Starting stake process...');
            console.log('Amount:', amount, 'WSOL');
            console.log('Solana Address:', solanaPublicKey.toString());
            console.log('Neon Address:', neonAddress);

            // Convert amount to wei (18 decimals for WSOL on Neon EVM)
            const amountWei = parseTokenAmount(amount, 9); // WSOL has 9 decimals

            // Execute stake through Solana Native SDK
            const result = await stake(contractAddress, amountWei);

            if (result.success) {
                if (result.isReal) {
                    setSuccess(`✅ Successfully staked ${amount} WSOL! Transaction: ${result.signature}`);
                } else {
                    setSuccess(`✅ Stake completed! Amount: ${amount} WSOL | Reference: ${result.signature}`);
                }

                // Reload user stake data after successful stake
                setTimeout(loadUserStake, 2000);

                // Reset form
                setAmount('0.1');
            } else {
                setError('❌ Stake transaction failed');
            }

        } catch (error) {
            console.error('Stake error:', error);
            setError(`❌ Failed to stake: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const quickAmounts = ['0.1', '0.2', '0.5', '1.0'];

    // Styles
    const cardStyle = {
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: '2px solid #e1e5e9',
        fontSize: '16px',
        marginBottom: '10px'
    };

    const buttonStyle = {
        width: '100%',
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease'
    };

    const primaryButtonStyle = {
        ...buttonStyle,
        background: loading ? '#ccc' : '#A855F7',
        color: 'white'
    };

    const quickButtonStyle = {
        padding: '8px 16px',
        borderRadius: '6px',
        border: '2px solid #A855F7',
        background: 'transparent',
        color: '#A855F7',
        cursor: 'pointer',
        margin: '0 5px',
        transition: 'all 0.3s ease'
    };

    const alertStyle = (type) => ({
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '15px',
        fontSize: '14px',
        background: type === 'error' ? '#fee2e2' : '#d1fae5',
        color: type === 'error' ? '#dc2626' : '#059669',
        border: `1px solid ${type === 'error' ? '#fca5a5' : '#6ee7b7'}`
    });

    if (!connected) {
        return (
            <div style={cardStyle}>
                <h2>Connect Wallet to Stake</h2>
                <p>Please connect your Solana wallet to start staking.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Demo Notice */}
            {isDemoMode && (
                <div style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center'
                }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>🚧 Demo Mode Active</h4>
                    <p style={{ margin: '0', fontSize: '14px' }}>
                        This is a demonstration implementation. Transactions are simulated for testing purposes.
                        In production, this would use Neon EVM's Scheduled Transactions via Solana Native SDK.
                    </p>
                </div>
            )}

            {/* Current Stake Display */}
            {userStake && (
                <div style={cardStyle}>
                    <h3>📊 Your Current Stake</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <strong>WSOL Staked:</strong><br />
                            {formatTokenAmount(userStake.wsolAmount)} WSOL
                        </div>
                        <div>
                            <strong>USDT Granted:</strong><br />
                            {formatTokenAmount(userStake.usdtTokensGranted, 6)} USDT
                        </div>
                        <div>
                            <strong>USDT Claimed:</strong><br />
                            {formatTokenAmount(userStake.usdtTokensClaimed, 6)} USDT
                        </div>
                        <div>
                            <strong>Status:</strong><br />
                            {userStake.unstaked ? '🔴 Unstaked' : '🟢 Active'}
                        </div>
                    </div>
                </div>
            )}

            {/* Stake Form */}
            <div style={cardStyle}>
                <h2>💰 Stake WSOL</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    Stake 0.1 to 1.0 WSOL (multiples of 0.1) to earn USDT rewards with vesting.
                </p>

                {error && <div style={alertStyle('error')}>{error}</div>}
                {success && <div style={alertStyle('success')}>{success}</div>}

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Amount (WSOL):
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={inputStyle}
                        step="0.1"
                        min="0.1"
                        max="1.0"
                        disabled={loading}
                        placeholder="Enter amount to stake"
                    />
                </div>

                {/* Quick Amount Buttons */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        Quick Amounts:
                    </label>
                    {quickAmounts.map((amt) => (
                        <button
                            key={amt}
                            style={{
                                ...quickButtonStyle,
                                background: amount === amt ? '#A855F7' : 'transparent',
                                color: amount === amt ? 'white' : '#A855F7'
                            }}
                            onClick={() => setAmount(amt)}
                            disabled={loading}
                        >
                            {amt} WSOL
                        </button>
                    ))}
                </div>

                {/* Stake Info */}
                <div style={{
                    background: '#f8fafc',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>📋 Stake Details:</h4>
                    <div style={{ display: 'grid', gap: '5px' }}>
                        <div>• You will stake: <strong>{amount} WSOL</strong></div>
                        <div>• You will receive: <strong>{(parseFloat(amount) * 1).toFixed(1)} USDT</strong> (vested)</div>
                        <div>• Vesting cliff: <strong>7 minutes</strong></div>
                        <div>• Full vesting: <strong>30 minutes</strong></div>
                        <div>• Network: <strong>Solana → Neon EVM</strong></div>
                        {isDemoMode && <div style={{ color: '#f59e0b' }}>• Mode: <strong>Demo/Simulation</strong></div>}
                    </div>
                </div>

                {/* Wallet Info */}
                <div style={{
                    background: '#e0f2fe',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '20px',
                    fontSize: '12px'
                }}>
                    <div><strong>Solana Address:</strong> {solanaPublicKey?.toString()}</div>
                    <div><strong>Neon EVM Address:</strong> {neonAddress}</div>
                </div>

                <button
                    style={primaryButtonStyle}
                    onClick={handleStake}
                    disabled={loading || !contractAddress || contractAddress === '0x0000000000000000000000000000000000000000'}
                    onMouseOver={(e) => !loading && (e.target.style.background = '#9333ea')}
                    onMouseOut={(e) => !loading && (e.target.style.background = '#A855F7')}
                >
                    {loading ?
                        (connected ? '⏳ Processing Stake...' : '🔗 Connecting Wallet...') :
                        !connected ?
                            '🔗 Connect & Stake WSOL' :
                            '🚀 Stake WSOL'
                    }
                </button>

                {(!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') && (
                    <div style={{ ...alertStyle('error'), marginTop: '10px' }}>
                        ⚠️ Contract not configured. Please update neonConfig.js with the deployed contract address.
                    </div>
                )}
            </div>
        </div>
    );
} 