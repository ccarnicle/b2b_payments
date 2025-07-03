// next-app/lib/contexts/Web3Context.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ethers, BrowserProvider, Signer } from 'ethers';
import { usePrivy, useWallets } from '@privy-io/react-auth';
// Only import the ABI, as contract addresses will be dynamic
import { VAULT_FACTORY_ABI } from '@/lib/contracts'; 

// Define interface for a single chain configuration
interface ChainConfig {
  chainId: string; // Chain ID as a hex string (e.g., "0x1337" for localhost, "0x4e45415f" for Filecoin Calibration)
  name: string;
  contractAddress: string; // The VaultFactory address for this specific chain
  explorerUrl: string; // Base URL for the block explorer
  nativeCurrency: { // Details about the native currency of the chain
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string; // RPC URL for this chain (used for Privy config, not directly by ethers in this context)
  // NEW: Add primaryCoin/ERC20 token specific to this chain
  primaryCoin: {
    address: string;
    symbol: string;
    decimals: number;
  };
}

// Define all supported blockchain networks and their configurations
const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: "0x4cb2f", // Filecoin Calibration Testnet (314159 in decimal)
    name: "Filecoin Calibration Testnet",
    contractAddress: process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS_CALIBRATION as string,
    explorerUrl: "https://calibration.filfox.info/en",
    nativeCurrency: {
      name: "tFIL",
      symbol: "tFIL",
      decimals: 18,
    },
    rpcUrl: "https://api.calibration.node.glif.io/rpc/v1",
    primaryCoin: { // USDFC details for Filecoin Calibration
      address: process.env.NEXT_PUBLIC_USDFC_ADDRESS_CALIBRATION as string, // Get this from your .env
      symbol: "USDFC",
      decimals: 6, // Assuming USDFC has 6 decimals, common for USDC variants
    },
  },
  {
    chainId: "0x221", // Flow EVM Testnet (545 in decimal)
    name: "Flow EVM Testnet",
    contractAddress: process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS_FLOW as string,
    explorerUrl: "https://evm-testnet.flowscan.io",
    nativeCurrency: {
      name: "FLOW",
      symbol: "FLOW",
      decimals: 18,
    },
    rpcUrl: "https://testnet.evm.nodes.onflow.org",
    primaryCoin: { // WFLOW or other primaryCoin details for Flow EVM
      address: process.env.NEXT_PUBLIC_WFLOW_ADDRESS_FLOW as string, // Get this from your .env
      symbol: "WFLOW", // Or USDC/USDT if that's the primaryCoin on Flow EVM you're using
      decimals: 18, // Assuming WFLOW has 18 decimals
    },
  },
  // Add other networks here as needed in the future
];

// Define the shape of the context data
interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: Signer | null;
  vaultFactoryContract: ethers.Contract | null;
  account: string | null;
  login: () => void;
  logout: () => void;
  isReady: boolean;
  authenticated: boolean;
  chainId: string | null; // The connected chainId (hex string from Privy)
  supportedChains: ChainConfig[]; // List of all supported chain configurations
  activeChainConfig: ChainConfig | null; // The configuration of the currently connected chain
}

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: { children: ReactNode }) {
  const { ready: isReady, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [vaultFactoryContract, setVaultFactoryContract] = useState<ethers.Contract | null>(null);
  const [currentChainId, setCurrentChainId] = useState<string | null>(null);
  const [activeChainConfig, setActiveChainConfig] = useState<ChainConfig | null>(null);

  useEffect(() => {
    const setupEthers = async () => {
      // Clear state if not ready, not authenticated, or no wallets connected
      if (!isReady || !authenticated || wallets.length === 0) {
        setProvider(null);
        setSigner(null);
        setVaultFactoryContract(null);
        setCurrentChainId(null);
        setActiveChainConfig(null);
        return;
      }

      const wallet = wallets[0]; // Assume the first wallet is the active one
      const connectedChainId = wallet.chainId; // A string like "eip155:314159" or just "0x221"
      setCurrentChainId(connectedChainId);

      let hexChainId: string;
      if (connectedChainId.includes(':')) {
        const numericChainId = connectedChainId.split(':')[1];
        hexChainId = '0x' + parseInt(numericChainId, 10).toString(16);
      } else {
        hexChainId = connectedChainId;
      }

      // Find the configuration for the currently connected chain by comparing hex values
      const currentConfig = SUPPORTED_CHAINS.find(chain => chain.chainId.toLowerCase() === hexChainId.toLowerCase());
      setActiveChainConfig(currentConfig || null);

      if (currentConfig) {
        try {
          const eip1193provider = await wallet.getEthereumProvider();
          const ethersProvider = new ethers.BrowserProvider(eip1193provider);
          const ethersSigner = await ethersProvider.getSigner();
          
          // Instantiate the contract using the address from the current chain's config
          const factoryContract = new ethers.Contract(currentConfig.contractAddress, VAULT_FACTORY_ABI, ethersSigner);
          setVaultFactoryContract(factoryContract);
          setProvider(ethersProvider);
          setSigner(ethersSigner);
        } catch (error) {
          console.error("Error setting up ethers for current chain:", error);
          // Clear contract/provider/signer if setup fails for a supported chain
          setProvider(null);
          setSigner(null);
          setVaultFactoryContract(null);
        }
      } else {
        // Connected to an unsupported chain - clear contract, provider, signer
        console.warn(`Connected to unsupported chain: ${connectedChainId}. Please switch to a supported network.`);
        setProvider(null);
        setSigner(null);
        setVaultFactoryContract(null);
      }
    };

    setupEthers();
  }, [isReady, authenticated, wallets]); // Re-run effect when these dependencies change

  const account = user?.wallet?.address || null;

  const value = {
    provider,
    signer,
    vaultFactoryContract,
    account,
    login,
    logout,
    isReady,
    authenticated,
    chainId: currentChainId,
    supportedChains: SUPPORTED_CHAINS,
    activeChainConfig,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

// Custom hook to consume the Web3 context
export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    // This error indicates useWeb3 was called outside of Web3Provider
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}