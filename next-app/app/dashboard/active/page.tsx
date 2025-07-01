'use client';

import { useEffect, useState } from 'react';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { VaultCard } from '@/components/VaultCard';
import Link from 'next/link';
import { type EventLog } from 'ethers';

// Define a type for our vault data to use in the frontend
interface Vault {
  id: string;
  funder: string;
  beneficiary: string;
  vaultType: number;
  totalAmount: string;
}

export default function Home() {
  const { vaultFactoryContract, provider } = useWeb3();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVaults = async () => {
      if (!vaultFactoryContract || !provider) return;

      setIsLoading(true);
      try {
        // On networks like Filecoin Calibration, querying logs from the genesis block
        // is not allowed. We need to query in smaller chunks over a recent period.
        const currentBlock = await provider.getBlockNumber();
        const chunkRange = 1800; // The query range, safely below the node's limit of ~2000 blocks.
        const totalLookbackRange = 100000; // How far back to search in total (~1 month).

        const filter = vaultFactoryContract.filters.VaultCreated();
        const collectedLogs: (EventLog)[] = [];

        // We iterate backwards from the current block in chunks.
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
        
        // Map the event logs to a more usable format
        const fetchedVaults = collectedLogs
          .filter((log): log is EventLog => 'args' in log)
          .map(log => ({
          id: log.args.vaultId.toString(),
          funder: log.args.funder,
          beneficiary: log.args.beneficiary,
          vaultType: Number(log.args.vaultType),       
          totalAmount: log.args.totalAmount.toString(),
        }));
        
        // Reverse the array to show the newest vaults first
        setVaults(fetchedVaults.reverse());
      } catch (error) {
        console.error("Failed to fetch vaults:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaults();
  }, [vaultFactoryContract, provider]); // Rerun when the contract is available

  return (
    <>
      <div className="text-center my-8">
        <h1 className="text-4xl font-bold font-display">Active Smart Pacts</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          A transparent, on-chain record of all created payment vaults.
        </p>
      </div>

      {isLoading ? (
        <p className="text-center">Loading vaults from the blockchain...</p>
      ) : vaults.length === 0 ? (
        <div className="text-center p-8 bg-background rounded-lg border border-muted">
          <p className="mb-4">No vaults found. Be the first to create one!</p>
          <Link href="/dashboard/create" className="bg-accent text-accent-foreground px-6 py-3 rounded-md font-bold">
            Create a Vault
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