import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function Header() {
  const menuStyle = {
    marginLeft: '20px',
    fontSize: '14px',
    color: '#ccc',
    cursor: 'pointer',
  }

  const buttonStyle = {
    background: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '30px',
    padding: '10px 20px',
    fontWeight: 'bold',
    fontSize: '14px',
    cursor: 'pointer',
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #333',
        paddingBottom: '16px',
      }}
    >
      {/* Left: Logo + Nav */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', fontSize: '20px', color: '' }}>MeonStake</div>
        <div style={menuStyle}>Stats</div>
        <div style={menuStyle}>Blog</div>
        <div style={menuStyle}>DeFi</div>
        <div style={menuStyle}>Restaking</div>
        <div style={menuStyle}>Institutions</div>
      </div>

      {/* Right: Connect Button */}
      <WalletMultiButton />
    </div>
  )
}
