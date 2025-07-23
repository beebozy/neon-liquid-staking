import React, { useState, useEffect } from 'react';
import { useSolanaNative } from '../components/SolanaNativeProvider';
import { getContractAddress, formatTokenAmount } from '../config/neonConfig';

export default function SolanaWithdraw() {
    const {
        connected,
        neonAddress,
        claim,
        getUserStake,
        connect,
        isDemoMode
    } = useSolanaNative();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [userStake, setUserStake] = useState(null);
    const [vestedAmount, setVestedAmount] = useState('0');
    const [claimableAmount, setClaimableAmount] = useState('0');

    const contractAddress = getContractAddress('LIQUID_STAKING');

    // Load user stake data and calculate vested amounts
    useEffect(() => {
        if (connected && neonAddress) {
            loadUserStake();
        }
    }, [connected, neonAddress]);

    const loadUserStake = async () => {
        try {
            const stakeData = await getUserStake(contractAddress, neonAddress);
            setUserStake(stakeData);
            console.log('📊 Loaded user stake data for claims:', stakeData);

            if (stakeData || isDemoMode) {
                const vested = calculateVestedAmount(stakeData);
                const alreadyClaimed = isDemoMode ? 0 : parseFloat(formatTokenAmount(stakeData?.usdtTokensClaimed || '0', 6));
                const claimable = Math.max(0, vested - alreadyClaimed);

                setVestedAmount(vested.toString());
                setClaimableAmount(claimable.toString());

                console.log('💎 Vesting calculation:', {
                    vested,
                    alreadyClaimed,
                    claimable,
                    isDemoMode
                });
            }
        } catch (error) {
            console.error('Failed to load user stake:', error);
        }
    };

    const calculateVestedAmount = (stake) => {
        if (isDemoMode) {
            // For demo, simulate some vested rewards
            const now = Date.now() / 1000;
            const demoStartTime = now - (10 * 60); // Simulate 10 minutes ago
            const vestingCliff = 7 * 60; // 7 minutes
            const vestingPeriod = 30 * 60; // 30 minutes

            if (now < demoStartTime + vestingCliff) {
                return 0;
            }

            const elapsed = now - demoStartTime;
            const totalGranted = 0.1; // Demo: 0.1 USDT granted

            if (elapsed >= vestingPeriod) {
                return totalGranted;
            }

            return (totalGranted * elapsed) / vestingPeriod;
        }

        if (!stake || stake.unstaked) {
            return parseFloat(formatTokenAmount(stake?.usdtTokensGranted || '0', 6));
        }

        const now = Math.floor(Date.now() / 1000);
        const startTime = parseInt(stake.startTime);
        const vestingCliff = 7 * 60; // 7 minutes
        const vestingPeriod = 30 * 60; // 30 minutes

        if (now < startTime + vestingCliff) {
            return 0;
        }

        const elapsed = now - startTime;
        const totalGranted = parseFloat(formatTokenAmount(stake.usdtTokensGranted, 6));

        if (elapsed >= vestingPeriod) {
            return totalGranted;
        }

        return (totalGranted * elapsed) / vestingPeriod;
    };

    const handleClaim = async () => {
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

        if (!userStake && !isDemoMode) {
            setError('No stake found');
            return;
        }

        if (!isDemoMode && parseFloat(claimableAmount) <= 0) {
            setError('No claimable rewards available');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            console.log('🎁 Starting claim process...');
            console.log('Claimable amount:', claimableAmount, 'USDT');
            console.log('Neon Address:', neonAddress);

            // Execute claim through Solana Native SDK
            const result = await claim(contractAddress);

            if (result.success) {
                const claimedAmount = isDemoMode ? parseFloat(claimableAmount).toFixed(4) : parseFloat(claimableAmount).toFixed(4);

                if (result.isReal) {
                    setSuccess(`✅ Successfully claimed ${claimedAmount} USDT! Transaction: ${result.signature}`);
                } else {
                    setSuccess(`✅ Claim completed! Amount: ${claimedAmount} USDT | Reference: ${result.signature}`);
                }

                // Reload user stake data after successful claim
                setTimeout(loadUserStake, 2000);
            } else {
                setError('❌ Claim transaction failed');
            }

        } catch (error) {
            console.error('Claim error:', error);
            setError(`❌ Failed to claim: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate vesting progress
    const getVestingProgress = () => {
        if (isDemoMode) {
            // For demo, show some progress
            const now = Date.now() / 1000;
            const demoStartTime = now - (10 * 60); // 10 minutes ago
            const vestingPeriod = 30 * 60;
            const elapsed = now - demoStartTime;
            return Math.min(100, (elapsed / vestingPeriod) * 100);
        }

        if (!userStake) return 0;

        const now = Math.floor(Date.now() / 1000);
        const startTime = parseInt(userStake.startTime);
        const vestingCliff = 7 * 60;
        const vestingPeriod = 30 * 60;

        if (now < startTime + vestingCliff) return 0;
        if (now >= startTime + vestingPeriod || userStake.unstaked) return 100;

        const elapsed = now - startTime;
        return Math.min(100, (elapsed / vestingPeriod) * 100);
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
        background: loading || (parseFloat(claimableAmount) <= 0 && !isDemoMode) ? '#ccc' : '#10b981',
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

    const progressBarStyle = {
        width: '100%',
        height: '8px',
        background: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '10px'
    };

    const progressFillStyle = {
        height: '100%',
        background: 'linear-gradient(90deg, #10b981, #059669)',
        width: `${getVestingProgress()}%`,
        transition: 'width 0.3s ease'
    };

    if (!connected) {
        return (
            <div style={cardStyle}>
                <h2>Connect Wallet to Claim Rewards</h2>
                <p>Please connect your Solana wallet to claim your rewards.</p>
            </div>
        );
    }

    if (!userStake && !isDemoMode) {
        return (
            <div style={cardStyle}>
                <h2>🔄 Loading Reward Information...</h2>
                <div style={{
                    background: '#f8fafc',
                    padding: '15px',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    <p>Querying your reward data from Neon EVM contract...</p>
                    <p><strong>Contract:</strong> {contractAddress}</p>
                    <p><strong>Your Address:</strong> {neonAddress}</p>
                </div>
            </div>
        );
    }

    if (!isDemoMode && (!userStake || userStake.wsolAmount === '0')) {
        return (
            <div style={cardStyle}>
                <h2>❌ No Stake Found</h2>
                <p>You need to stake first to earn rewards.</p>
                <div style={{
                    background: '#f8fafc',
                    padding: '15px',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    <strong>💡 Want to start earning?</strong><br />
                    Go to the Stake tab to stake WSOL and earn USDT rewards!
                </div>
            </div>
        );
    }

    const vestingProgress = getVestingProgress();
    const isCliffReached = vestingProgress > 0;

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
                        This demonstrates the reward claiming functionality with simulated vesting calculations.
                    </p>
                </div>
            )}

            {/* Rewards Overview */}
            <div style={cardStyle}>
                <h3>💎 Your Rewards Overview</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div>
                        <strong>Total Granted:</strong><br />
                        {isDemoMode ? '0.1000' : formatTokenAmount(userStake?.usdtTokensGranted || '0', 6)} USDT
                    </div>
                    <div>
                        <strong>Vested So Far:</strong><br />
                        {parseFloat(vestedAmount).toFixed(4)} USDT
                    </div>
                    <div>
                        <strong>Already Claimed:</strong><br />
                        {isDemoMode ? '0.0000' : formatTokenAmount(userStake?.usdtTokensClaimed || '0', 6)} USDT
                    </div>
                </div>

                {/* Vesting Progress */}
                <div style={{ marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span><strong>Vesting Progress:</strong></span>
                        <span>{vestingProgress.toFixed(1)}%</span>
                    </div>
                    <div style={progressBarStyle}>
                        <div style={progressFillStyle}></div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        {!isCliffReached ? '⏰ Vesting cliff period (7 minutes)' :
                            vestingProgress === 100 ? '✅ Fully vested' :
                                isDemoMode ? `⏳ Demo: ${Math.floor((30 - 10))} minutes remaining` :
                                    `⏳ ${Math.floor((30 - (Date.now() / 1000 - parseInt(userStake.startTime)) / 60))} minutes remaining`}
                    </div>
                </div>

                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #10b981',
                    padding: '15px',
                    borderRadius: '8px',
                    fontSize: '14px'
                }}>
                    <strong>📅 Stake Started:</strong> {
                        isDemoMode ?
                            new Date(Date.now() - (10 * 60 * 1000)).toLocaleString() :
                            userStake?.startTime !== '0' ?
                                new Date(parseInt(userStake.startTime) * 1000).toLocaleString() :
                                'Not available'
                    }
                </div>
            </div>

            {/* Claim Form */}
            <div style={cardStyle}>
                <h2>🎁 Claim Vested Rewards</h2>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    Claim your vested USDT rewards. You can claim multiple times as rewards vest.
                </p>

                {error && <div style={alertStyle('error')}>{error}</div>}
                {success && <div style={alertStyle('success')}>{success}</div>}

                {/* Claimable Amount Card */}
                <div style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ margin: '0 0 5px 0' }}>Available to Claim</h3>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                        {parseFloat(claimableAmount).toFixed(4)} USDT
                    </div>
                    {isDemoMode && (
                        <div style={{ fontSize: '12px', opacity: '0.8', marginTop: '5px' }}>
                            Demo: Simulated vesting calculation
                        </div>
                    )}
                </div>

                {!isCliffReached && !isDemoMode && (
                    <div style={{
                        background: '#fef3c7',
                        border: '1px solid #f59e0b',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '14px'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#92400e' }}>⏰ Vesting Cliff Period</h4>
                        <div style={{ color: '#92400e' }}>
                            You need to wait 7 minutes from your stake start time before you can claim any rewards.
                            This is the vesting cliff period.
                        </div>
                    </div>
                )}

                {/* Claim Details */}
                <div style={{
                    background: '#f8fafc',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>📋 Claim Details:</h4>
                    <div style={{ display: 'grid', gap: '5px' }}>
                        <div>• Claimable now: <strong>{parseFloat(claimableAmount).toFixed(4)} USDT</strong></div>
                        <div>• Network: <strong>Neon EVM</strong></div>
                        <div>• Transaction fee: <strong>~0.001 SOL</strong></div>
                        <div>• Gas fee: <strong>~0.0001 NEON</strong></div>
                        {isDemoMode && <div style={{ color: '#f59e0b' }}>• Mode: <strong>Demo/Simulation</strong></div>}
                    </div>
                </div>

                <button
                    style={primaryButtonStyle}
                    onClick={handleClaim}
                    disabled={loading || (!isDemoMode && parseFloat(claimableAmount) <= 0)}
                    onMouseOver={(e) => !loading && (isDemoMode || parseFloat(claimableAmount) > 0) && (e.target.style.background = '#059669')}
                    onMouseOut={(e) => !loading && (isDemoMode || parseFloat(claimableAmount) > 0) && (e.target.style.background = '#10b981')}
                >
                    {loading ?
                        (connected ? '⏳ Processing Claim...' : '🔗 Connecting Wallet...') :
                        (!isDemoMode && parseFloat(claimableAmount) <= 0) ? '❌ No Rewards to Claim' :
                            !connected ?
                                '🔗 Connect & Claim Rewards' :
                                '🎁 Claim Rewards'
                    }
                </button>

                {!isDemoMode && parseFloat(claimableAmount) <= 0 && isCliffReached && (
                    <div style={{
                        marginTop: '15px',
                        padding: '12px',
                        background: '#f3f4f6',
                        borderRadius: '6px',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        💡 All vested rewards have been claimed! Come back later as more rewards vest.
                    </div>
                )}

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