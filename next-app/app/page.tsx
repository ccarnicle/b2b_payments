'use client';

import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import PoolCard from "@/components/PoolCard";
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { ESCROW_FACTORY_ADDRESS, ESCROW_FACTORY_ABI } from '@/lib/contracts';

// The shape of our pool data, mirroring the PoolCard component's needs
interface Pool {
  id: number;
  name: string; // We'll use the ID as a placeholder for now
  organizer: string;
  tokenSymbol: string; // We'll use the contract address as a placeholder
  dues: string;
  totalPot: string;
  endsIn: string; // We'll calculate this
}

export default function Home() {
  const { contract } = useWeb3();
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPools = async () => {
      // We don't need to connect wallet to view pools, so we can create a read-only provider
      // if the contract instance (with a signer) isn't ready yet.
      let readOnlyContract = contract;
      if (!readOnlyContract) {
        try {
            const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545/');
            readOnlyContract = new ethers.Contract(ESCROW_FACTORY_ADDRESS, ESCROW_FACTORY_ABI, provider);
        } catch (e) {
            console.error("Could not create a read-only provider.", e);
            setIsLoading(false);
            return;
        }
      }
      
      setIsLoading(true);
      try {
        const createdFilter = readOnlyContract.filters.EscrowCreated();
        const events = await readOnlyContract.queryFilter(createdFilter);
        
        const poolPromises = events.map(async (event) => {
          // This is the type guard. We check if 'args' exists on the event object.
          if (!('args' in event)) {
            console.warn("Found a log that could not be parsed:", event);
            return null;
          }

          // From here on, TypeScript knows that event is an EventLog with an 'args' property.
          const escrowId = event.args.escrowId;
          
          const details = await readOnlyContract!.getEscrowDetails(escrowId);
          
          const endsInMs = Number(details.endTime) * 1000 - Date.now();
          // Handle pools that have already ended
          const endsInDays = endsInMs > 0 ? Math.ceil(endsInMs / (1000 * 60 * 60 * 24)) : 0;

          return {
            id: Number(escrowId),
            name: `Pool #${escrowId}`,
            organizer: details.organizer,
            tokenSymbol: 'Tokens', // Generic placeholder
            dues: ethers.formatUnits(details.dues, 18), // Use formatUnits for flexibility
            totalPot: ethers.formatUnits(details.totalAmount, 18), // Assuming 18 decimals for now
            endsIn: endsInDays > 0 ? `${endsInDays} day(s)` : 'Ended',
          };
        });

        const resolvedPools = (await Promise.all(poolPromises)).filter(p => p !== null) as Pool[];
        setPools(resolvedPools.reverse());
      } catch (error) {
        console.error("Failed to fetch pools:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPools();
  }, [contract]); // This dependency array is correct.

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Active Prize Pools</h1>
        <p className="text-foreground/80 mt-2">
          Join an existing pool or create your own.
        </p>
      </div>

      {isLoading ? (
        <p>Loading pools...</p>
      ) : pools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      ) : (
        <p>No active pools found. Why not create one?</p>
      )}
    </div>
  );
}