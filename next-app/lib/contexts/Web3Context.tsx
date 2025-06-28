'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ethers, BrowserProvider, Signer } from 'ethers';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ESCROW_FACTORY_ADDRESS, ESCROW_FACTORY_ABI } from '@/lib/contracts';

// Define the shape of the context data
interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: Signer | null;
  contract: ethers.Contract | null;
  account: string | null;
  login: () => void;
  logout: () => void;
  ready: boolean;
  authenticated: boolean;
}

// Create the context with a default null value
const Web3Context = createContext<Web3ContextType | null>(null);

// Create the provider component
export function Web3Provider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    const setupEthers = async () => {
      if (ready && authenticated && wallets.length > 0) {
        // Use the first wallet from the wallets array
        const wallet = wallets[0];
        const eip1193provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(eip1193provider);
        const signer = await ethersProvider.getSigner();
        const factoryContract = new ethers.Contract(ESCROW_FACTORY_ADDRESS, ESCROW_FACTORY_ABI, signer);

        setProvider(ethersProvider);
        setSigner(signer);
        setContract(factoryContract);
      } else {
        setProvider(null);
        setSigner(null);
        setContract(null);
      }
    };

    setupEthers();
  }, [ready, authenticated, wallets]);

  const account = user?.wallet?.address || null;

  const value = {
    provider,
    signer,
    contract,
    account,
    login,
    logout,
    ready,
    authenticated,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// Create a custom hook for easy consumption of the context
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}