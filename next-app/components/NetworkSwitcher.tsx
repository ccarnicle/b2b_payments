'use client';

import { useState, useRef, useEffect } from 'react';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { useWallets } from '@privy-io/react-auth';
import Image from 'next/image';

// A simple chevron down icon component
const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default function NetworkSwitcher() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { activeChainConfig, supportedChains } = useWeb3();
  const { wallets } = useWallets();

  const handleSwitchNetwork = async (chainId: string) => {
    if (wallets && wallets.length > 0) {
      try {
        await wallets[0].switchChain(parseInt(chainId, 16));
        setShowDropdown(false);
      } catch (error) {
        console.error("Failed to switch network:", error);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeChainConfig) {
    return (
      <div className="bg-secondary px-4 py-2 rounded-full text-sm font-medium">
        Unsupported Network
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-card hover:bg-secondary/50 text-foreground px-3 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors"
      >
        {activeChainConfig.logo && (
          <Image src={activeChainConfig.logo} alt={`${activeChainConfig.name} logo`} width={20} height={20} className="rounded-full" />
        )}
        <span>{activeChainConfig.name}</span>
        <ChevronDown />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-muted rounded-md shadow-lg z-20">
          <div className="p-2">
            <p className="text-xs text-muted-foreground px-2 pb-1">Switch Network</p>
            {supportedChains.map((chain) => (
              <button
                key={chain.chainId}
                onClick={() => handleSwitchNetwork(chain.chainId)}
                className="w-full text-left px-3 py-2 text-foreground hover:bg-secondary/50 rounded-md flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={chain.chainId === activeChainConfig.chainId}
              >
                 {chain.logo && (
                    <Image src={chain.logo} alt={`${chain.name} logo`} width={20} height={20} className="rounded-full" />
                 )}
                <span>{chain.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 