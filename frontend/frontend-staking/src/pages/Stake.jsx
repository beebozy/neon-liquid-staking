import { useState, useEffect } from 'react'
import { useContract } from '../components/ContractProvider'
import { AVAILABLE_STAKE_AMOUNTS, isValidStakeAmount, formatUsdtAmount } from '../contracts/config'

export default function Stake() {
  const {
    stake,
    loading,
    error,
    userStake,
    isConnected,
    neonWalletAddress,
    refreshUserStake,
    connectMetaMask,
    solanaWallet
  } = useContract()

  const [stakeAmount, setStakeAmount] = useState(0.1)
  const [isStaking, setIsStaking] = useState(false)

  useEffect(() => {
    if (isConnected && neonWalletAddress) {
      refreshUserStake()
    }
  }, [isConnected, neonWalletAddress])

  const handleStakeTransaction = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!isValidStakeAmount(stakeAmount)) {
      alert("Invalid stake amount. Please select a valid amount (0.1 to 1.0 WSOL in 0.1 increments)")
      return
    }

    if (userStake && userStake.wsolAmount !== "0") {
      alert("You have already staked. Please unstake first before staking again.")
      return
    }

    setIsStaking(true)
    try {
      const success = await stake(stakeAmount)
      if (success) {
        alert("Stake successful!")
        await refreshUserStake()
      }
    } catch (err) {
      console.error("Stake error:", err)
    } finally {
      setIsStaking(false)
    }
  }

  const handleConnectWallet = async () => {
    if (!solanaWallet.connected) {
      alert("Please connect your Solana wallet first")
      return
    }

    await connectMetaMask()
  }

  const calculateUsdtReward = (amount) => {
    // 0.1 WSOL = 0.1 USDT (0.1 * 1e6 = 100,000 units with 6 decimals)
    const usdtAmount = amount * 1e6
    return formatUsdtAmount(usdtAmount)
  }

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '20px',
    borderRadius: '12px',
    background: '#fff',
    width: '45%',
  }

  const sectionStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: '20px',
    flexWrap: 'wrap',
    gap: '20px',
  }

  const connectBtnStyle = {
    marginTop: '16px',
    padding: '14px',
    width: '100%',
    border: 'none',
    borderRadius: '30px',
    fontSize: '16px',
    fontWeight: 'bold',
    backgroundColor: '#a855f7',
    color: 'white',
    cursor: 'pointer',
    opacity: loading || isStaking ? 0.7 : 1,
  }

  const selectStyle = {
    marginTop: '10px',
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    borderRadius: '8px',
    border: '1px solid #ddd',
  }

  return (
    <div style={{ marginTop: '40px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Stake WSOL for USDT</h1>

      {/* Connection Status */}
      {!isConnected && (
        <div style={{
          padding: '16px',
          background: '#fef3c7',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fbbf24'
        }}>
          <p style={{ color: '#92400e', fontWeight: 'bold' }}>
            {!solanaWallet.connected
              ? "Please connect your Solana wallet first"
              : "MetaMask connection required for contract interaction"}
          </p>
          {solanaWallet.connected && (
            <button
              onClick={handleConnectWallet}
              style={{
                ...connectBtnStyle,
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
          padding: '16px',
          background: '#fef2f2',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fca5a5'
        }}>
          <p style={{ color: '#dc2626', fontWeight: 'bold' }}>{error}</p>
        </div>
      )}

      {/* User Stake Info */}
      {userStake && userStake.wsolAmount !== "0" && (
        <div style={{
          padding: '16px',
          background: '#ecfdf5',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #10b981'
        }}>
          <h3 style={{ color: '#065f46', marginBottom: '8px' }}>Current Stake</h3>
          <p style={{ color: '#047857' }}>
            WSOL Staked: {(parseInt(userStake.wsolAmount) / 1e9).toFixed(1)} WSOL
          </p>
          <p style={{ color: '#047857' }}>
            USDT Granted: {formatUsdtAmount(userStake.usdtTokensGranted)} USDT
          </p>
          <p style={{ color: '#047857' }}>
            USDT Claimed: {formatUsdtAmount(userStake.usdtTokensClaimed)} USDT
          </p>
          <p style={{ color: '#047857' }}>
            Status: {userStake.unstaked ? "Unstaked" : "Active"}
          </p>
        </div>
      )}

      {/* Main Card Row */}
      <div style={sectionStyle}>
        {/* Left Card */}
        <div style={cardStyle}>
          <div>
            <p style={{ marginBottom: '10px', color: '#555' }}>You're staking</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>WSOL</span>
            </div>
            <select
              value={stakeAmount}
              onChange={(e) => setStakeAmount(parseFloat(e.target.value))}
              style={selectStyle}
              disabled={loading || isStaking || !isConnected}
            >
              {AVAILABLE_STAKE_AMOUNTS.map(amount => (
                <option key={amount} value={amount}>
                  {amount} WSOL
                </option>
              ))}
            </select>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              Valid amounts: 0.1 to 1.0 WSOL (0.1 increments)
            </p>
          </div>
        </div>

        {/* Right Card */}
        <div style={cardStyle}>
          <div>
            <p style={{ marginBottom: '10px', color: '#555' }}>To receive (vested)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold' }}>USDT</span>
            </div>
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: '#f3f4f6',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold'
            }}>
              {calculateUsdtReward(stakeAmount)} USDT
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
              Vesting: 30 minutes total, 7 minute cliff
            </div>
          </div>

          <button
            style={connectBtnStyle}
            onClick={handleStakeTransaction}
            disabled={loading || isStaking || !isConnected || (userStake && userStake.wsolAmount !== "0")}
          >
            {isStaking ? "Staking..." : "Stake WSOL"}
          </button>
        </div>
      </div>

      {/* Information */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ marginBottom: '12px', color: '#1f2937' }}>How it works:</h3>
        <ul style={{ color: '#4b5563', lineHeight: '1.6' }}>
          <li>Stake 0.1 to 1.0 WSOL in 0.1 increments</li>
          <li>Receive 0.1 USDT tokens for every 0.1 WSOL staked</li>
          <li>Tokens are vested over 30 minutes with a 7-minute cliff</li>
          <li>You can unstake your WSOL at any time</li>
          <li>Only one stake per address at a time</li>
        </ul>
      </div>
    </div>
  )
}
