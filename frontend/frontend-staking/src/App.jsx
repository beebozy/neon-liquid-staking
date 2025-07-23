import { useState } from 'react'
import { SolanaNativeProvider } from './components/SolanaNativeProvider'
import SolanaHeader from './components/SolanaHeader'
import SolanaStake from './pages/SolanaStake'
import SolanaUnstake from './pages/SolanaUnstake'
import SolanaWithdraw from './pages/SolanaWithdraw'

export default function App() {
  const [tab, setTab] = useState('stake')

  const appStyle = {
    fontFamily: 'sans-serif',
    background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
    minHeight: '100vh',
    padding: '20px'
  }

  const tabContainerStyle = {
    display: 'flex',
    borderBottom: '2px solid #e1e5e9',
    marginTop: '20px',
    marginBottom: '30px',
    background: 'white',
    borderRadius: '8px 8px 0 0',
    overflow: 'hidden'
  }

  const getTabStyle = (tabName) => ({
    padding: '15px 25px',
    cursor: 'pointer',
    background: tab === tabName ? '#A855F7' : 'transparent',
    color: tab === tabName ? 'white' : '#6b7280',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    borderBottom: tab === tabName ? 'none' : '2px solid transparent',
    flex: 1,
    textAlign: 'center'
  })

  const contentStyle = {
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '0 0 12px 12px',
    padding: '0',
    minHeight: '400px'
  }

  const bannerStyle = {
    background: 'linear-gradient(135deg, #A855F7, #7c3aed)',
    color: 'white',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  }

  return (
    <SolanaNativeProvider>
      <div style={appStyle}>
        <SolanaHeader />

        {/* Info Banner */}
        <div style={bannerStyle}>
          <h3 style={{ margin: '0 0 8px 0' }}>🚀 Solana Native SDK + Neon EVM</h3>
          <p style={{ margin: '0', fontSize: '14px', opacity: '0.9' }}>
            Use your Solana wallet (Phantom, Solflare) to sign real transactions • No MetaMask required
          </p>
        </div>

        {/* Navigation Tabs */}
        <div style={tabContainerStyle}>
          <button
            style={getTabStyle('stake')}
            onClick={() => setTab('stake')}
            onMouseOver={(e) => tab !== 'stake' && (e.target.style.background = '#f3f4f6')}
            onMouseOut={(e) => tab !== 'stake' && (e.target.style.background = 'transparent')}
          >
            💰 Stake
          </button>

          <button
            style={getTabStyle('unstake')}
            onClick={() => setTab('unstake')}
            onMouseOver={(e) => tab !== 'unstake' && (e.target.style.background = '#f3f4f6')}
            onMouseOut={(e) => tab !== 'unstake' && (e.target.style.background = 'transparent')}
          >
            🔄 Unstake
          </button>

          <button
            style={getTabStyle('withdraw')}
            onClick={() => setTab('withdraw')}
            onMouseOver={(e) => tab !== 'withdraw' && (e.target.style.background = '#f3f4f6')}
            onMouseOut={(e) => tab !== 'withdraw' && (e.target.style.background = 'transparent')}
          >
            🎁 Claim Rewards
          </button>
        </div>

        {/* Main Content */}
        <div style={contentStyle}>
          {tab === 'stake' && <SolanaStake />}
          {tab === 'unstake' && <SolanaUnstake />}
          {tab === 'withdraw' && <SolanaWithdraw />}
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: 'rgba(255, 255, 255, 0.6)',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>🔗 How it works:</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', maxWidth: '800px', margin: '0 auto' }}>
            <div>
              <strong>1. Connect Solana Wallet</strong><br />
              Use Phantom or Solflare - no MetaMask needed
            </div>
            <div>
              <strong>2. Scheduled Transactions</strong><br />
              Your Solana wallet signs transactions that execute on Neon EVM
            </div>
            <div>
              <strong>3. Cross-Chain Magic</strong><br />
              Enjoy Ethereum-compatible contracts with Solana UX
            </div>
          </div>

          <div style={{ marginTop: '15px', fontSize: '12px' }}>
            <a
              href="https://neonevm.org/docs/composability/sdk_solana_native"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#A855F7', textDecoration: 'none' }}
            >
              📚 Learn more about Solana Native SDK
            </a>
          </div>
        </div>
      </div>
    </SolanaNativeProvider>
  )
}
