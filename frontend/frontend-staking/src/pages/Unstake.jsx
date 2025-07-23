import { useState, useEffect } from 'react'
import { useContract } from '../components/ContractProvider'
import { formatUsdtAmount } from '../contracts/config'

export default function Unstake() {
  const {
    unstake,
    loading,
    error,
    userStake,
    isConnected,
    neonWalletAddress,
    refreshUserStake,
    connectMetaMask,
    solanaWallet
  } = useContract()

  const [isUnstaking, setIsUnstaking] = useState(false)

  useEffect(() => {
    if (isConnected && neonWalletAddress) {
      refreshUserStake()
    }
  }, [isConnected, neonWalletAddress])

  const handleUnstake = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!userStake || userStake.wsolAmount === "0") {
      alert("No active stake found")
      return
    }

    if (userStake.unstaked) {
      alert("You have already unstaked")
      return
    }

    setIsUnstaking(true)
    try {
      const success = await unstake()
      if (success) {
        alert("Unstake successful!")
        await refreshUserStake()
      }
    } catch (err) {
      console.error("Unstake error:", err)
    } finally {
      setIsUnstaking(false)
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
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  }

  const titleStyle = {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '20px',
  }

  const sectionStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '30px',
    marginTop: '30px',
    flexWrap: 'wrap',
  }

  const boxStyle = {
    background: '#ede9fe',
    borderRadius: '10px',
    padding: '16px',
    flex: 1,
    textAlign: 'left',
  }

  const connectButtonStyle = {
    background: '#a855f7',
    border: 'none',
    padding: '14px 30px',
    borderRadius: '30px',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px',
    marginTop: '20px',
    cursor: 'pointer',
    width: '100%',
    opacity: loading || isUnstaking ? 0.7 : 1,
  }

  const rightBoxStyle = {
    flex: 1,
    background: '#fff',
    padding: '20px',
    borderRadius: '12px',
    fontSize: '14px',
    color: '#333',
    lineHeight: '1.6',
  }

  const hasStake = userStake && userStake.wsolAmount !== "0"
  const wsolAmount = hasStake ? (parseInt(userStake.wsolAmount) / 1e9).toFixed(1) : "0"

  return (
    <div style={{ marginTop: '40px' }}>
      <div style={titleStyle}>Unstake Your WSOL</div>

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
                ...connectButtonStyle,
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

      {/* No Stake Message */}
      {isConnected && (!hasStake || userStake.unstaked) && (
        <div style={{
          padding: '16px',
          background: '#f3f4f6',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #d1d5db'
        }}>
          <p style={{ color: '#6b7280', fontWeight: 'bold' }}>
            {userStake?.unstaked ? "You have already unstaked your WSOL" : "No active stake found. Please stake first."}
          </p>
        </div>
      )}

      <div style={sectionStyle}>
        {/* Left */}
        <div style={{ flex: 1 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>WSOL</div>

            <div style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '16px' }}>
              {wsolAmount}
            </div>
            <div style={{ fontSize: '14px', color: '#888' }}>
              {hasStake ? `Staked Amount` : "No stake"}
            </div>
          </div>

          {hasStake && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={boxStyle}>
                <div style={{ fontWeight: 'bold' }}>USDT Granted</div>
                <div style={{ fontSize: '12px', color: '#555' }}>Total vested amount</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '8px' }}>
                  {formatUsdtAmount(userStake.usdtTokensGranted)} USDT
                </div>
              </div>
              <div style={boxStyle}>
                <div style={{ fontWeight: 'bold' }}>USDT Claimed</div>
                <div style={{ fontSize: '12px', color: '#555' }}>Already claimed</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '8px' }}>
                  {formatUsdtAmount(userStake.usdtTokensClaimed)} USDT
                </div>
              </div>
            </div>
          )}

          <button
            style={connectButtonStyle}
            onClick={handleUnstake}
            disabled={loading || isUnstaking || !isConnected || !hasStake || userStake?.unstaked}
          >
            {isUnstaking ? "Unstaking..." :
              !isConnected ? "Connect Wallet" :
                !hasStake ? "No Stake Found" :
                  userStake?.unstaked ? "Already Unstaked" : "Unstake WSOL"}
          </button>
        </div>

        {/* Right */}
        <div style={rightBoxStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Unstaking Process</h2>
          <ol>
            <li>
              <strong>Instant Unstaking</strong><br />
              You can unstake your WSOL at any time without waiting periods.
            </li>
            <li style={{ marginTop: '12px' }}>
              <strong>Keep Your Vested Tokens</strong><br />
              Unstaking doesn't affect your vested USDT tokens. You can still claim them based on the vesting schedule.
            </li>
            <li style={{ marginTop: '12px' }}>
              <strong>Receive WSOL Back</strong><br />
              Once unstaked, your WSOL will be returned to your wallet immediately.
            </li>
          </ol>

          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #fbbf24'
          }}>
            <p style={{ fontSize: '12px', color: '#92400e', fontWeight: 'bold' }}>
              NOTE: After unstaking, you won't earn any new USDT tokens, but you can still claim your vested tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
