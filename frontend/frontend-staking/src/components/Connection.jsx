import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { solanaTransactionLog } from '@neonevm/token-transfer-core';
import { delay, log, logJson, NeonProxyRpcApi } from '@neonevm/solana-sign';
import { JsonRpcProvider } from 'ethers';
import { NEON_CORE_API_RPC_URL, PROXY_ENV, SOLANA_URL } from '../environments';
import { simulateTransaction } from '../utils/solana';
import { getTokensList } from '../api/tokens';
import { tokens } from '../data/tokens';

export const ProxyConnectionContext = createContext({});

export const ProxyConnectionProvider = ({ children }) => {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();

  const [neonEvmProgram, setEvmProgramAddress] = useState();
  const [proxyApi, setProxyApi] = useState();
  const [tokenMint, setTokenMint] = useState();
  const [chainId, setChainId] = useState();
  const [solanaUser, setSolanaUser] = useState();
  const [provider, setProvider] = useState();
  const [walletBalance, setWalletBalance] = useState(0);
  const [addresses, setAddresses] = useState(tokens(PROXY_ENV));
  let watchAccountId;

  const getWalletBalance = async () => {
    try {
      if (publicKey && connection) {
        const b = await connection.getBalance(publicKey);
        setWalletBalance(b || 0);
      } else {
        setWalletBalance(0);
      }
    } catch (e) {
      log(e);
      setWalletBalance(0);
    }
  };

  const sendTransaction = async (transaction, commitment = 'confirmed', options) => {
    if (signTransaction && solanaUser) {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);

      transaction.recentBlockhash = transaction.recentBlockhash || blockhash;
      transaction.lastValidBlockHeight = transaction.lastValidBlockHeight || lastValidBlockHeight;
      transaction.feePayer = solanaUser.publicKey;

      const { value } = await simulateTransaction(connection, transaction, commitment);
      logJson(value?.err);
      logJson(value?.logs);

      const signedTransaction = await signTransaction(transaction);
      solanaTransactionLog(transaction);

      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), options);

      if (PROXY_ENV === 'devnet') {
        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, commitment);
      } else {
        await delay(5000);
      }

      log(`https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${SOLANA_URL}`);
      return signature;
    }
  };

  useEffect(() => {
    (async () => {
      if (!publicKey) return;

      const proxyApiInstance = new NeonProxyRpcApi(`${NEON_CORE_API_RPC_URL}/sol`);
      setProxyApi(proxyApiInstance);

      const {
        provider,
        chainId,
        solanaUser,
        tokenMintAddress,
        programAddress
      } = await proxyApiInstance.init(publicKey);

      setChainId(chainId);
      setProvider(provider);
      setSolanaUser(solanaUser);
      setEvmProgramAddress(programAddress);
      setTokenMint(tokenMintAddress);
    })();
  }, [publicKey]);

  useEffect(() => {
    getWalletBalance();

    if (publicKey) {
      watchAccountId = connection.onAccountChange(
        publicKey,
        (updatedAccountInfo) => {
          setWalletBalance(updatedAccountInfo.lamports);
        },
        { commitment: 'confirmed', encoding: 'jsonParsed' }
      );
    }

    return () => {
      if (watchAccountId) {
        connection.removeAccountChangeListener(watchAccountId).catch(() => {});
      }
    };
  }, [publicKey, connection]);

  useEffect(() => {
    const getAddresses = async () => {
      try {
        const list = await getTokensList(PROXY_ENV);
        setAddresses(list);
      } catch (_) {
        setAddresses(tokens(PROXY_ENV));
      }
    };

    getAddresses();
  }, []);

  return (
    <ProxyConnectionContext.Provider value={{
      chainId,
      tokenMint,
      neonEvmProgram,
      solanaUser,
      proxyApi,
      provider,
      walletBalance,
      addresses,
      sendTransaction,
      getWalletBalance
    }}>
      {children}
    </ProxyConnectionContext.Provider>
  );
};

export const useProxyConnection = () => useContext(ProxyConnectionContext);
