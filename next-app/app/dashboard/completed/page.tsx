// next-app/app/dashboard/completed/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { VaultCard } from '@/components/VaultCard';
import Link from 'next/link';
import { type EventLog } from 'ethers';

// Define an updated type for our vault data, reflecting the contract's 'finalized' status
interface Vault {
  id: string;
  funder: string;
  beneficiary: string;
  vaultType: number;
  totalAmount: string;
  finalized: boolean; // Directly corresponds to the contract's 'finalized' state
  // Add other fields from your contract's Vault struct if you plan to use them here later
  // such as releaseTime, milestonePayouts, etc.
}

export default function CompletedPactsPage() {
  const { vaultFactoryContract, provider } = useWeb3();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedVaults = async () => {
      if (!vaultFactoryContract || !provider) return;

      setIsLoading(true);
      try {
        const currentBlock = await provider.getBlockNumber();
        const chunkRange = 1800; // Safe query range for Filecoin Calibration
        const totalLookbackRange = 100000; // How far back to search

        const filter = vaultFactoryContract.filters.VaultCreated();
        const collectedLogs: EventLog[] = [];

        for (let i = currentBlock; i > currentBlock - totalLookbackRange; i -= chunkRange) {
          const fromBlock = Math.max(0, i - chunkRange + 1);
          const toBlock = i;
          
          try {
            const logs = await vaultFactoryContract.queryFilter(filter, fromBlock, toBlock);
            collectedLogs.push(...(logs as EventLog[]));
          } catch (error) {
              console.warn(`Could not fetch logs for range ${fromBlock}-${toBlock}.`, error);
          }
        }
        
        // Map the event logs to a basic format first
        const fetchedVaultsFromLogs: Vault[] = collectedLogs
          .filter((log): log is EventLog => 'args' in log)
          .map(log => ({
            id: log.args.vaultId.toString(),
            funder: log.args.funder,
            beneficiary: log.args.beneficiary,
            vaultType: Number(log.args.vaultType),       
            totalAmount: log.args.totalAmount.toString(),
            finalized: false, // Default to false, will be updated by getVaultDetails
          }));
        
        // Now, fetch the 'finalized' status for each vault by calling getVaultDetails
        const vaultsWithStatus = await Promise.all(
          fetchedVaultsFromLogs.map(async (vault) => {
            try {
              const contractVaultDetails = await vaultFactoryContract.getVaultDetails(vault.id);
              return { ...vault, finalized: contractVaultDetails.finalized };
            } catch (detailError) {
              console.error(`Failed to get details for vault ${vault.id}:`, detailError);
              return vault; // Return vault as is if detail fetch fails
            }
          })
        );
        
        // Filter for completed (finalized) vaults
        const completedVaults = vaultsWithStatus.filter(vault => vault.finalized); 
        
        // Reverse the array to show the newest completed vaults first
        setVaults(completedVaults.reverse());

      } catch (error) {
        console.error("Failed to fetch vaults or details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletedVaults();
  }, [vaultFactoryContract, provider]); // Rerun when the contract is available

  return (
    <>
      <div className="text-center my-8">
        <h1 className="text-4xl font-bold font-display">Completed Smart Pacts</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          A record of all successfully completed and paid-out agreements.
        </p>
      </div>

      {isLoading ? (
        <p className="text-center">Loading completed pacts from the blockchain...</p>
      ) : vaults.length === 0 ? (
        <div className="text-center p-8 bg-background rounded-lg border border-muted">
          <p className="mb-4">No completed pacts found yet.</p>
          <Link href="/dashboard/active" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold">
            View Active Pacts
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vaults.map((vault) => (
            <VaultCard key={vault.id} vault={vault} />
          ))}
        </div>
      )}
    </>
  );
}