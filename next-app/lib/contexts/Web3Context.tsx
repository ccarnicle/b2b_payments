// next-app/lib/contexts/Web3Context.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ethers, BrowserProvider, Signer } from 'ethers';
import { usePrivy, useWallets } from '@privy-io/react-auth';
// This import now refers to the VaultFactoryVerifiable ABI, as updated in contracts.ts
import { VAULT_FACTORY_ABI } from '@/lib/contracts'; 

// Define interfaces for blockchain configuration
interface TokenRequirement {
  address: string;
  symbol: string;
  decimals: number;
  minBalance: string;
  faucetUrl: string;
  faucetInstructions: string;
}

interface ChainConfig {
  chainId: string;
  name: string;
  logo: string;
  contractAddress: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl: string;
  primaryCoin: {
    address: string;
    symbol: string;
    decimals: number;
  };
  balanceRequirements: {
    nativeToken: TokenRequirement;
    escrowToken: TokenRequirement;
  };
  showDetailedErrors: boolean; // Whether to show detailed error messages in forms
}

// Define all supported blockchain networks and their configurations
const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: "0x4cb2f", // Filecoin Calibration Testnet (314159 in decimal)
    name: "Filecoin Calibration",
    logo: "/filecoin_logo.png",
    // *** UPDATED: Use the verifiable contract address for Filecoin Calibration ***
    contractAddress: process.env.NEXT_PUBLIC_VERIFIABLE_VAULT_FACTORY_ADDRESS_CALIBRATION as string,
    explorerUrl: "https://calibration.filfox.info/en",
    nativeCurrency: {
      name: "tFIL",
      symbol: "tFIL",
      decimals: 18,
    },
    rpcUrl: "https://api.calibration.node.glif.io/rpc/v1",
    primaryCoin: { // USDFC details for Filecoin Calibration
      address: process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS_CALIBRATION as string,
      symbol: "USDFC",
      decimals: 6,
    },
    balanceRequirements: {
      nativeToken: {
        address: "0x0000000000000000000000000000000000000000", // Native token placeholder
        symbol: "tFIL",
        decimals: 18,
        minBalance: "0.01",
        faucetUrl: "https://faucet.calibnet.chainsafe-fil.io/funds.html",
        faucetInstructions: "Get test FIL from the Calibration faucet"
      },
      escrowToken: {
        address: process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS_CALIBRATION as string,
        symbol: "USDFC",
        decimals: 6,
        minBalance: "0.1",
        faucetUrl: "https://docs.secured.finance/usdfc-stablecoin/getting-started/getting-test-usdfc-on-testnet",
        faucetInstructions: "Follow the guide to mint USDFC using tFIL"
      }
    },
    showDetailedErrors: true
  },
  {
    chainId: "0x221", // Flow EVM Testnet (545 in decimal)
    name: "Flow EVM Testnet",
    logo: "/flow_logo.png",
    // *** UPDATED: Use the verifiable contract address for Flow EVM ***
    contractAddress: process.env.NEXT_PUBLIC_VERIFIABLE_VAULT_FACTORY_ADDRESS_FLOW as string,
    explorerUrl: "https://evm-testnet.flowscan.io",
    nativeCurrency: {
      name: "FLOW",
      symbol: "FLOW",
      decimals: 18,
    },
    rpcUrl: "https://testnet.evm.nodes.onflow.org",
    primaryCoin: { // WFLOW or other primaryCoin details for Flow EVM
      address: process.env.NEXT_PUBLIC_WFLOW_ADDRESS_FLOW as string,
      symbol: "WFLOW",
      decimals: 18,
    },
    balanceRequirements: {
      nativeToken: {
        address: "0x0000000000000000000000000000000000000000", // Native token placeholder
        symbol: "FLOW",
        decimals: 18,
        minBalance: "0.1",
        faucetUrl: "https://faucet.flow.com/fund-account",
        faucetInstructions: "Get test FLOW from the Flow faucet"
      },
      escrowToken: {
        address: process.env.NEXT_PUBLIC_WFLOW_ADDRESS_FLOW as string,
        symbol: "WFLOW",
        decimals: 18,
        minBalance: "0.1",
        faucetUrl: "https://evm-testnet.flowscan.io/token/0xd3bF53DAC106A0290B0483EcBC89d40FcC961f3e?tab=write_contract",
        faucetInstructions: "Use the deposit function to wrap FLOW into WFLOW"
      }
    },
    showDetailedErrors: false
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

// Internal component that uses Privy hooks
function Web3ProviderInner({ children }: { children: ReactNode }) {
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

// Main Web3Provider component that conditionally renders based on Privy availability
export function Web3Provider({ children }: { children: ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  // If no Privy app ID, provide a fallback context
  if (!privyAppId) {
    const fallbackValue: Web3ContextType = {
      provider: null,
      signer: null,
      vaultFactoryContract: null,
      account: null,
      login: () => {},
      logout: () => {},
      isReady: false,
      authenticated: false,
      chainId: null,
      supportedChains: SUPPORTED_CHAINS,
      activeChainConfig: null,
    };
    
    return <Web3Context.Provider value={fallbackValue}>{children}</Web3Context.Provider>;
  }

  // If Privy is available, use the inner component with hooks
  return <Web3ProviderInner>{children}</Web3ProviderInner>;
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