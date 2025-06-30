// next-app/lib/contexts/Web3Context.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ethers, BrowserProvider, Signer } from 'ethers';
import { usePrivy, useWallets } from '@privy-io/react-auth';
// Import our new, correct contract info
import { VAULT_FACTORY_ADDRESS, VAULT_FACTORY_ABI } from '@/lib/contracts';

// Define the shape of the context data with a more specific name
interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: Signer | null;
  vaultFactoryContract: ethers.Contract | null; // Renamed for clarity
  account: string | null;
  login: () => void;
  logout: () => void;
  ready: boolean;
  authenticated: boolean;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [vaultFactoryContract, setVaultFactoryContract] = useState<ethers.Contract | null>(null); // Renamed state

  useEffect(() => {
    const setupEthers = async () => {
      // Ensure we have a connected wallet
      if (ready && authenticated && wallets.length > 0) {
        const wallet = wallets[0];
        const eip1193provider = await wallet.getEthereumProvider();
        const ethersProvider = new ethers.BrowserProvider(eip1193provider);
        const ethersSigner = await ethersProvider.getSigner();

        // Use the new VaultFactory address and ABI
        if (VAULT_FACTORY_ADDRESS && VAULT_FACTORY_ABI) {
          const factoryContract = new ethers.Contract(VAULT_FACTORY_ADDRESS, VAULT_FACTORY_ABI, ethersSigner);
          setVaultFactoryContract(factoryContract); // Set the new contract instance
        }
        
        setProvider(ethersProvider);
        setSigner(ethersSigner);
      } else {
        // Clear everything if not connected
        setProvider(null);
        setSigner(null);
        setVaultFactoryContract(null);
      }
    };

    setupEthers();
  }, [ready, authenticated, wallets]);

  const account = user?.wallet?.address || null;

  const value = {
    provider,
    signer,
    vaultFactoryContract, // Pass the renamed contract instance
    account,
    login,
    logout,
    ready,
    authenticated,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// Custom hook remains the same, but now provides the updated context
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}