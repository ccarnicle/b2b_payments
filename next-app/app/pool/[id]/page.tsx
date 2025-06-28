'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ethers, Contract } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { ESCROW_FACTORY_ADDRESS, ESCROW_FACTORY_ABI } from '@/lib/contracts';
import JoinPoolForm from '@/components/JoinPoolForm';
// ADDED: Import the new component
import DistributeWinningsForm from '@/components/DistributeWinningsForm';

interface PoolDetails {
  organizer: string;
  tokenContract: string;
  dues: string;
  endTime: string;
  endTimestamp: number;
  totalAmount: string;
  finalized: boolean;
}

function DetailItem({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-accent">
      <dt className="text-sm font-medium text-foreground/70">{label}</dt>
      <dd className="mt-1 text-sm text-foreground sm:mt-0 break-words">{value}</dd>
    </div>
  );
}

export default function PoolDetailPage() {
  const params = useParams();
  const poolId = params.id as string;

  // ADDED: Get account to check if the user is the organizer
  const { contract: web3Contract, account } = useWeb3();
  const [details, setDetails] = useState<PoolDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPoolDetails = useCallback(async () => {
    if (!poolId) return;
    
    setError('');

    try {
      let contract: Contract | null = web3Contract;

      if (!contract) {
          const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545/');
          contract = new ethers.Contract(ESCROW_FACTORY_ADDRESS, ESCROW_FACTORY_ABI, provider);
      }

      const data = await contract.getEscrowDetails(poolId);
      
      setDetails({
        organizer: data.organizer,
        tokenContract: data.tokenContract,
        dues: ethers.formatUnits(data.dues, 18),
        endTime: new Date(Number(data.endTime) * 1000).toLocaleString(),
        endTimestamp: Number(data.endTime),
        totalAmount: ethers.formatUnits(data.totalAmount, 18),
        finalized: data.finalized,
      });

    } catch (err: unknown) {
      console.error("Failed to fetch pool details:", err);
      let message = "Could not fetch pool details. Please check the pool ID or try again later.";
      if (typeof err === 'object' && err !== null && 'reason' in err) {
           message = (err as { reason: string }).reason;
      } else if (err instanceof Error) {
          message = err.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [poolId, web3Contract]);

  useEffect(() => {
    setIsLoading(true);
    fetchPoolDetails();
  }, [fetchPoolDetails]);

  if (isLoading) {
    return <div className="text-center py-10">Loading pool details...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  if (!details) {
    return <div className="text-center py-10">No pool details found.</div>;
  }

  // Conditions for rendering the different forms
  const isPoolOpenForJoining = !details.finalized && details.endTimestamp * 1000 > Date.now();
  const isReadyForDistribution = !details.finalized && details.endTimestamp * 1000 <= Date.now();
  const isOrganizer = account && details.organizer.toLowerCase() === account.toLowerCase();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-4xl font-bold">Pool #{poolId}</h1>
        <p className={`mt-2 text-sm font-semibold ${details.finalized ? 'text-red-400' : 'text-green-400'}`}>
            {details.finalized ? 'Status: Closed' : 'Status: Open'}
        </p>
      </div>

      <div className="bg-card p-8 rounded-lg border border-accent">
        <h2 className="text-xl font-semibold mb-4">Pool Information</h2>
        <dl>
            <DetailItem label="Organizer" value={details.organizer} />
            <DetailItem label="Total Prize Pot" value={`${details.totalAmount} MTK`} />
            <DetailItem label="Entry Dues" value={Number(details.dues) > 0 ? `${details.dues} MTK` : 'Open Contribution'} />
            <DetailItem label="Closes On" value={details.endTime} />
            <DetailItem label="Token Contract" value={details.tokenContract} />
        </dl>
      </div>
      
      {/* --- Conditional Rendering Logic --- */}

      {/* 1. Show Join Form if pool is open */}
      {isPoolOpenForJoining && (
        <JoinPoolForm 
          poolId={poolId} 
          dues={details.dues} 
          onJoinSuccess={fetchPoolDetails}
        />
      )}

      {/* 2. Show a "waiting" message if the pool has ended but user is not the organizer */}
      {isReadyForDistribution && !isOrganizer && (
        <div className="text-center bg-secondary mt-8 p-4 rounded-md text-secondary-foreground">
          This pool has ended. Awaiting distribution by the organizer.
        </div>
      )}

      {/* 3. Show Distribution Form if all conditions are met */}
      {isReadyForDistribution && isOrganizer && (
        <DistributeWinningsForm
          poolId={poolId}
          totalAmountInPot={details.totalAmount}
          onDistributeSuccess={fetchPoolDetails}
        />
      )}

      {/* 4. Show a final "closed" message if the pool is finalized */}
      {details.finalized && (
         <div className="text-center bg-secondary mt-8 p-4 rounded-md text-secondary-foreground">
          This pool has been closed and winnings have been distributed.
        </div>
      )}
    </div>
  );
}