import React, { useState, useEffect } from 'react';
import { useSolanaNative } from '../components/SolanaNativeProvider';
import { getContractAddress, formatTokenAmount } from '../config/neonConfig';

export default function SolanaUnstake() {
    const {
        connected,
        neonAddress,
        unstake,
        getUserStake,
        connect,
        isDemoMode
    } = useSolanaNative();

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
            console.log('📊 Loaded user stake data:', stakeData);
        } catch (error) {
            console.error('Failed to load user stake:', error);
        }
    };

    const handleUnstake = async () => {
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

        // For demo purposes, check if there's any stake data to unstake
        if (!userStake || (userStake.wsolAmount === '0' && !isDemoMode)) {
            setError('No active stake found to unstake');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            console.log('🔄 Starting unstake process...');
            console.log('Neon Address:', neonAddress);
            console.log('Current stake:', userStake);

            // Execute unstake through Solana Native SDK
            const result = await unstake(contractAddress);

            if (result.success) {
                if (result.isReal) {
                    setSuccess(`✅ Successfully unstaked! Transaction: ${result.signature}`);
                } else {
                    setSuccess(`✅ Unstake completed! Your WSOL will be returned. Reference: ${result.signature}`);
                }

                // Reload user stake data after successful unstake
                setTimeout(loadUserStake, 2000);
            } else {
                setError('❌ Unstake transaction failed');
            }

        } catch (error) {
            console.error('Unstake error:', error);
            setError(`❌ Failed to unstake: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Styles
    const cardStyle = {
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px'
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
        background: loading ? '#ccc' : '#f59e0b',
        color: 'white'
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

    const infoCardStyle = {
        background: '#f8fafc',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px'
    };

    if (!connected) {
        return (
            <div style={cardStyle}>
                <h2>Connect Wallet to Unstake</h2>
                <p>Please connect your Solana wallet to manage your stake.</p>
            </div>
        );
    }

    if (!userStake) {
        return (
            <div style={cardStyle}>
                <h2>🔄 Loading Stake Information...</h2>
                <div style={infoCardStyle}>
                    <p>Querying your stake data from Neon EVM contract...</p>
                    <p><strong>Contract:</strong> {contractAddress}</p>
                    <p><strong>Your Address:</strong> {neonAddress}</p>
                </div>
            </div>
        );
    }

    // Show different message in demo mode
    const hasActiveStake = userStake.wsolAmount !== '0' || isDemoMode;

    if (!hasActiveStake && !isDemoMode) {
        return (
            <div style={cardStyle}>
                <h2>❌ No Active Stake Found</h2>
                <p>You don't have any active stake to unstake.</p>
                <div style={infoCardStyle}>
                    <strong>💡 Want to stake?</strong><br />
                    Go to the Stake tab to start earning rewards!
                </div>
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
                        This is a demonstration of the unstake functionality. In production, this would execute real blockchain transactions.
                    </p>
                </div>
            )}

            {/* Current Stake Display */}
            <div style={cardStyle}>
                <h3>📊 Your Current Stake</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div>
                        <strong>WSOL Staked:</strong><br />
                        {isDemoMode ? '0.1000' : formatTokenAmount(userStake.wsolAmount)} WSOL
                    </div>
                    <div>
                        <strong>USDT Granted:</strong><br />
                        {isDemoMode ? '0.1000' : formatTokenAmount(userStake.usdtTokensGranted, 6)} USDT
                    </div>
                    <div>
                        <strong>USDT Claimed:</strong><br />
                        {isDemoMode ? '0.0000' : formatTokenAmount(userStake.usdtTokensClaimed, 6)} USDT
                    </div>
                    <div>
                        <strong>Status:</strong><br />
                        {userStake.unstaked ? '🔴 Unstaked' : '🟢 Active'}
                    </div>
                </div>

                <div style={infoCardStyle}>
                    <strong>📅 Stake Started:</strong> {
                        isDemoMode ?
                            new Date().toLocaleString() :
                            userStake.startTime !== '0' ?
                                new Date(parseInt(userStake.startTime) * 1000).toLocaleString() :
                                'Not available'
                    }
                </div>
            </div>

            {/* Unstake Form */}
            <div style={cardStyle}>
                <h2>🔄 Unstake WSOL</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    Unstaking will return your WSOL and end the vesting period for your USDT rewards.
                </p>

                {error && <div style={alertStyle('error')}>{error}</div>}
                {success && <div style={alertStyle('success')}>{success}</div>}

                {/* Warning Box */}
                <div style={{
                    background: '#fef3c7',
                    border: '1px solid #f59e0b',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#92400e' }}>⚠️ Important Notice:</h4>
                    <div style={{ color: '#92400e' }}>
                        <div>• Unstaking will return <strong>{isDemoMode ? '0.1000' : formatTokenAmount(userStake.wsolAmount)} WSOL</strong> to your wallet</div>
                        <div>• Any unclaimed USDT rewards will remain available for claiming</div>
                        <div>• You can claim vested rewards before or after unstaking</div>
                        <div>• This action cannot be undone</div>
                        {isDemoMode && <div style={{ marginTop: '10px' }}>• <strong>Demo Mode:</strong> No real blockchain transactions will occur</div>}
                    </div>
                </div>

                {/* Unstake Summary */}
                <div style={infoCardStyle}>
                    <h4 style={{ margin: '0 0 10px 0' }}>📋 Unstake Summary:</h4>
                    <div style={{ display: 'grid', gap: '5px' }}>
                        <div>• Amount to receive: <strong>{isDemoMode ? '0.1000' : formatTokenAmount(userStake.wsolAmount)} WSOL</strong></div>
                        <div>• Network: <strong>Neon EVM → Solana</strong></div>
                        <div>• Transaction fee: <strong>~0.001 SOL</strong></div>
                        {isDemoMode && <div style={{ color: '#f59e0b' }}>• Mode: <strong>Demo/Simulation</strong></div>}
                    </div>
                </div>

                <button
                    style={primaryButtonStyle}
                    onClick={handleUnstake}
                    disabled={loading}
                    onMouseOver={(e) => !loading && (e.target.style.background = '#d97706')}
                    onMouseOut={(e) => !loading && (e.target.style.background = '#f59e0b')}
                >
                    {loading ?
                        (connected ? '⏳ Processing Unstake...' : '🔗 Connecting Wallet...') :
                        !connected ?
                            '🔗 Connect & Unstake WSOL' :
                            '🔄 Unstake WSOL'
                    }
                </button>

                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    background: '#e0f2fe',
                    borderRadius: '6px',
                    fontSize: '12px'
                }}>
                    <div><strong>Your Neon EVM Address:</strong> {neonAddress}</div>
                </div>
            </div>
        </div>
    );
} 