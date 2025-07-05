'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import Erc20Abi from '@/lib/abi/Erc20.json';

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
  hasMinBalance: boolean;
  minBalance: string;
  faucetUrl: string;
  faucetInstructions: string;
}

interface BalanceCheckResult {
  nativeToken: TokenBalance | null;
  escrowToken: TokenBalance | null;
  isLoading: boolean;
  error: string | null;
  hasSufficientBalances: boolean;
  refreshBalances: () => void;
}

export function useTokenBalances(): BalanceCheckResult {
  const { provider, account, activeChainConfig } = useWeb3();
  const [nativeTokenBalance, setNativeTokenBalance] = useState<TokenBalance | null>(null);
  const [escrowTokenBalance, setEscrowTokenBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkBalances = async () => {
    if (!provider || !account || !activeChainConfig) {
      setNativeTokenBalance(null);
      setEscrowTokenBalance(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check native token balance
      const nativeBalanceWei = await provider.getBalance(account);
      const nativeBalanceFormatted = ethers.formatUnits(nativeBalanceWei, activeChainConfig.balanceRequirements.nativeToken.decimals);
      const nativeMinBalance = activeChainConfig.balanceRequirements.nativeToken.minBalance;
      const nativeHasMinBalance = parseFloat(nativeBalanceFormatted) >= parseFloat(nativeMinBalance);

      const nativeTokenData: TokenBalance = {
        address: activeChainConfig.balanceRequirements.nativeToken.address,
        symbol: activeChainConfig.balanceRequirements.nativeToken.symbol,
        balance: nativeBalanceFormatted,
        decimals: activeChainConfig.balanceRequirements.nativeToken.decimals,
        hasMinBalance: nativeHasMinBalance,
        minBalance: nativeMinBalance,
        faucetUrl: activeChainConfig.balanceRequirements.nativeToken.faucetUrl,
        faucetInstructions: activeChainConfig.balanceRequirements.nativeToken.faucetInstructions
      };

      // Check escrow token balance (ERC-20)
      const escrowTokenContract = new ethers.Contract(
        activeChainConfig.balanceRequirements.escrowToken.address,
        Erc20Abi,
        provider
      );
      
      const escrowBalanceWei = await escrowTokenContract.balanceOf(account);
      const escrowBalanceFormatted = ethers.formatUnits(escrowBalanceWei, activeChainConfig.balanceRequirements.escrowToken.decimals);
      const escrowMinBalance = activeChainConfig.balanceRequirements.escrowToken.minBalance;
      const escrowHasMinBalance = parseFloat(escrowBalanceFormatted) >= parseFloat(escrowMinBalance);

      const escrowTokenData: TokenBalance = {
        address: activeChainConfig.balanceRequirements.escrowToken.address,
        symbol: activeChainConfig.balanceRequirements.escrowToken.symbol,
        balance: escrowBalanceFormatted,
        decimals: activeChainConfig.balanceRequirements.escrowToken.decimals,
        hasMinBalance: escrowHasMinBalance,
        minBalance: escrowMinBalance,
        faucetUrl: activeChainConfig.balanceRequirements.escrowToken.faucetUrl,
        faucetInstructions: activeChainConfig.balanceRequirements.escrowToken.faucetInstructions
      };

      setNativeTokenBalance(nativeTokenData);
      setEscrowTokenBalance(escrowTokenData);
    } catch (err) {
      console.error('Error checking token balances:', err);
      setError('Failed to check token balances. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkBalances();
  }, [provider, account, activeChainConfig]);

  const hasSufficientBalances = 
    nativeTokenBalance?.hasMinBalance === true && 
    escrowTokenBalance?.hasMinBalance === true;

  return {
    nativeToken: nativeTokenBalance,
    escrowToken: escrowTokenBalance,
    isLoading,
    error,
    hasSufficientBalances,
    refreshBalances: checkBalances,
  };
} 