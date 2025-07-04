'use client';

import { useEffect, useState } from 'react';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { VaultCard } from '@/components/VaultCard';
import Link from 'next/link';

// Define the interface that directly mirrors the Solidity 'Vault' struct
// as returned by ethers.js from getVaultDetails
interface ContractVaultDetails {
  funder: string; // address
  beneficiary: string; // address
  token: string; // address of the IERC20 token
  vaultType: number; // 0 for PrizePool, 1 for Milestone
  totalAmount: bigint; // uint256
  amountWithdrawn: bigint; // uint256
  termsCID: string; // string
  finalized: boolean; // bool
  releaseTime: bigint; // uint256 (PrizePool specific)
  milestonePayouts: bigint[]; // uint256[] (Milestone specific)
  milestonesPaid: boolean[]; // bool[] (Milestone specific)
  nextMilestoneToPay: bigint; // uint256 (Milestone specific)
}

// Type for the array response from the contract
type ContractVaultDetailsArray = [
  string, // funder
  string, // beneficiary
  string, // token
  bigint, // vaultType
  bigint, // totalAmount
  bigint, // amountWithdrawn
  string, // termsCID
  boolean, // finalized
  bigint, // releaseTime
  bigint[], // milestonePayouts
  boolean[], // milestonesPaid
  bigint // nextMilestoneToPay
];

// Our unified Vault interface for the frontend components, adding the client-side 'id'
interface Vault extends ContractVaultDetails {
  id: string; // The vault ID (BigInt from contract, converted to string for keying)
}

export default function ActivePactsPage() {
  const { vaultFactoryContract, account, activeChainConfig } = useWeb3();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVaults = async () => {
      if (!vaultFactoryContract || !account) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch vault IDs where the user is a funder or beneficiary
        const fundedVaultIds: bigint[] = await vaultFactoryContract.getVaultIdsFundedByUser(account);
        const beneficiaryVaultIds: bigint[] = await vaultFactoryContract.getVaultIdsAsBeneficiary(account);
        
        // Combine and deduplicate IDs using a Set
        const allVaultIds = [...fundedVaultIds, ...beneficiaryVaultIds];
        const uniqueVaultIds = Array.from(new Set(allVaultIds.map(id => id.toString()))).map(id => BigInt(id));

        // Fetch details for each unique vault
        const vaultDetailsPromises = uniqueVaultIds.map(id => 
          vaultFactoryContract.getVaultDetails(id).then((details: ContractVaultDetailsArray) => {
            console.log(`Vault ${id} details:`, details);
            // Contract returns an array, so we need to destructure it properly
            const [
              funder,
              beneficiary, 
              token,
              vaultType,
              totalAmount,
              amountWithdrawn,
              termsCID,
              finalized,
              releaseTime,
              milestonePayouts,
              milestonesPaid,
              nextMilestoneToPay
            ] = details;
            
            return {
              funder,
              beneficiary,
              token,
              vaultType: Number(vaultType),
              totalAmount,
              amountWithdrawn,
              termsCID,
              finalized,
              releaseTime,
              milestonePayouts,
              milestonesPaid,
              nextMilestoneToPay,
              id: id.toString(), // Add the vault ID to the object
            };
          }).catch(error => {
            console.error(`Failed to fetch details for vault ${id}:`, error);
            return null;
          })
        );
        
        const allVaultDetails: (Vault | null)[] = await Promise.all(vaultDetailsPromises);
        
        // Filter out null values and then filter for active vaults
        const validVaultDetails = allVaultDetails.filter((vault): vault is Vault => vault !== null);
        const activeVaults = validVaultDetails.filter(vault => !vault.finalized);

        // Reverse to show newest first, assuming IDs are sequential
        setVaults(activeVaults.reverse());
      } catch (error) {
        console.error("Failed to fetch vaults:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaults();
  }, [vaultFactoryContract, account]); // Rerun when the contract or account changes

  return (
    <>
      <div className="text-center my-6 md:my-8">
        <h1 className="text-2xl md:text-4xl font-bold font-display">Active Pacts</h1>
        <p className="mt-2 text-sm md:text-lg text-muted-foreground">
          A transparent, on-chain record of your active agreements.
        </p>
      </div>

      {isLoading ? (
        <p className="text-center">Loading your active pacts from the blockchain...</p>
      ) : vaults.length === 0 ? (
        <div className="text-center p-8 bg-background rounded-lg border border-muted">
          <p className="mb-4">No active pacts found. Be the first to create one!</p>
          <Link href="/dashboard/create" className="bg-accent text-accent-foreground px-6 py-3 rounded-md font-bold">
            Create a Pact
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {vaults.map((vault) => (
            <VaultCard 
              key={vault.id} 
              vault={vault}
              tokenSymbol={activeChainConfig?.primaryCoin.symbol || ''}
              tokenDecimals={activeChainConfig?.primaryCoin.decimals || 18}
            />
          ))}
        </div>
      )}
    </>
  );
}