import { useState, useEffect } from 'react'
import { useContract } from '../components/ContractProvider'
import { formatUsdtAmount, CONTRACT_CONFIG } from '../contracts/config'

export default function Withdraw() {
  const {
    claim,
    loading,
    error,
    userStake,
    isConnected,
    neonWalletAddress,
    refreshUserStake,
    calculateVestedAmount,
    connectMetaMask,
    solanaWallet
  } = useContract()

  const [isClaiming, setIsClaiming] = useState(false)
  const [vestedAmount, setVestedAmount] = useState('0')
  const [claimableAmount, setClaimableAmount] = useState('0')
  const [vestingProgress, setVestingProgress] = useState(0)

  useEffect(() => {
    if (isConnected && neonWalletAddress) {
      refreshUserStake()
    }
  }, [isConnected, neonWalletAddress])

  useEffect(() => {
    if (userStake && userStake.wsolAmount !== "0") {
      const vested = calculateVestedAmount(userStake)
      const claimable = BigInt(vested) - BigInt(userStake.usdtTokensClaimed)

      setVestedAmount(vested)
      setClaimableAmount(claimable.toString())

      // Calculate vesting progress
      const now = Math.floor(Date.now() / 1000)
      const startTime = parseInt(userStake.startTime)
      const vestingCliff = CONTRACT_CONFIG.VESTING_CLIFF
      const vestingPeriod = CONTRACT_CONFIG.VESTING_PERIOD

      if (now < startTime + vestingCliff) {
        setVestingProgress(0)
      } else {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / vestingPeriod, 1) * 100
        setVestingProgress(progress)
      }
    } else {
      setVestedAmount('0')
      setClaimableAmount('0')
      setVestingProgress(0)
    }
  }, [userStake, calculateVestedAmount])

  const handleClaim = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!userStake || userStake.wsolAmount === "0") {
      alert("No active stake found")
      return
    }

    if (claimableAmount === "0") {
      alert("No tokens available to claim")
      return
    }

    setIsClaiming(true)
    try {
      const success = await claim()
      if (success) {
        alert("Claim successful!")
        await refreshUserStake()
      }
    } catch (err) {
      console.error("Claim error:", err)
    } finally {
      setIsClaiming(false)
    }
  }

  const handleConnectWallet = async () => {
    if (!solanaWallet.connected) {
      alert("Please connect your Solana wallet first")
      return
    }

    await connectMetaMask()
  }

  const cardStyle = {
    padding: '20px',
    borderRadius: '12px',
    background: '#fff',
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
    boxShadow: '0 0 10px rgba(0,0,0,0.05)',
  }

  const buttonStyle = {
    marginTop: '16px',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#10b981',
    color: 'white',
    cursor: 'pointer',
    width: '100%',
    opacity: loading || isClaiming ? 0.7 : 1,
  }

  const progressBarStyle = {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '10px',
  }

  const progressFillStyle = {
    height: '100%',
    backgroundColor: '#10b981',
    width: `${vestingProgress}%`,
    transition: 'width 0.3s ease',
  }

  const hasStake = userStake && userStake.wsolAmount !== "0"
  const canClaim = claimableAmount !== "0" && BigInt(claimableAmount) > 0

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Claim Vested Tokens</h2>

      {/* Connection Status */}
      {!isConnected && (
        <div style={{
          padding: '12px',
          background: '#fef3c7',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #fbbf24'
        }}>
          <p style={{ color: '#92400e', fontSize: '14px', fontWeight: 'bold' }}>
            {!solanaWallet.connected
              ? "Please connect your Solana wallet first"
              : "MetaMask connection required"}
          </p>
          {solanaWallet.connected && (
            <button
              onClick={handleConnectWallet}
              style={{
                ...buttonStyle,
                marginTop: '8px',
                backgroundColor: '#f59e0b'
              }}
            >
              Connect MetaMask
            </button>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          background: '#fef2f2',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #fca5a5'
        }}>
          <p style={{ color: '#dc2626', fontSize: '14px', fontWeight: 'bold' }}>{error}</p>
        </div>
      )}

      {/* No Stake Message */}
      {isConnected && !hasStake && (
        <div style={{
          padding: '12px',
          background: '#f3f4f6',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #d1d5db'
        }}>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            No active stake found. Please stake first to earn tokens.
          </p>
        </div>
      )}

      {/* Vesting Information */}
      {hasStake && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#555' }}>Total Granted:</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {formatUsdtAmount(userStake.usdtTokensGranted)} USDT
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#555' }}>Already Claimed:</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {formatUsdtAmount(userStake.usdtTokensClaimed)} USDT
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#555' }}>Vested Amount:</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
              {formatUsdtAmount(vestedAmount)} USDT
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#555' }}>Claimable Now:</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: canClaim ? '#10b981' : '#6b7280' }}>
              {formatUsdtAmount(claimableAmount)} USDT
            </span>
          </div>

          {/* Vesting Progress */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#555' }}>Vesting Progress</span>
              <span style={{ fontSize: '12px', color: '#555' }}>{vestingProgress.toFixed(1)}%</span>
            </div>
            <div style={progressBarStyle}>
              <div style={progressFillStyle}></div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Status */}
      {hasStake && (
        <p style={{ color: '#555', fontSize: '14px', marginBottom: '16px' }}>
          {userStake.unstaked
            ? "You have unstaked but can still claim your vested tokens."
            : vestingProgress < 100
              ? "Tokens are vesting linearly over 30 minutes with a 7-minute cliff."
              : "Your tokens are fully vested. You can claim them now."}
        </p>
      )}

      <button
        style={buttonStyle}
        onClick={handleClaim}
        disabled={loading || isClaiming || !isConnected || !hasStake || !canClaim}
      >
        {isClaiming ? "Claiming..." :
          !isConnected ? "Connect Wallet" :
            !hasStake ? "No Stake Found" :
              !canClaim ? "No Tokens to Claim" :
                `Claim ${formatUsdtAmount(claimableAmount)} USDT`}
      </button>
    </div>
  )
}
