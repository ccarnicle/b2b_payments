// next-app/app/vault/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { DistributePrizePoolForm } from '@/components/DistributePrizePoolForm'; // Import the new form

// The VaultDetails interface is unchanged
interface VaultDetails {
  funder: string;
  beneficiary: string;
  token: string;
  vaultType: number; // 0 for PrizePool, 1 for Milestone
  totalAmount: string;
  amountWithdrawn: string;
  termsCID: string;
  finalized: boolean;
  releaseTime?: number;
  milestonePayouts?: string[];
  milestonesPaid?: boolean[];
  nextMilestoneToPay?: number;
  termsContent?: { name: string; terms: string; };
}

function DetailItem({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-3 border-b border-muted">
      <dt className="text-sm font-bold text-foreground/70">{label}</dt>
      <dd className="mt-1 text-sm text-foreground sm:mt-0 break-words text-right">{value}</dd>
    </div>
  );
}

export default function VaultDetailPage() {
  const params = useParams();
  const vaultId = params.id as string;

  const { vaultFactoryContract, account } = useWeb3();
  const [details, setDetails] = useState<VaultDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // The fetch logic is unchanged
  const fetchVaultDetails = useCallback(async () => {
    if (!vaultId || !vaultFactoryContract) return;
    setError('');
    setStatus('');
    try {
      const data = await vaultFactoryContract.getVaultDetails(vaultId);
      let termsData = null;
      if (data.termsCID) {
        const ipfsUrl = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${data.termsCID}`;
        const response = await fetch(ipfsUrl);
        if(response.ok) termsData = await response.json();
      }
      setDetails({
        funder: data.funder,
        beneficiary: data.beneficiary,
        token: data.token,
        vaultType: Number(data.vaultType),
        totalAmount: ethers.formatUnits(data.totalAmount, 6),
        amountWithdrawn: ethers.formatUnits(data.amountWithdrawn, 6),
        termsCID: data.termsCID,
        finalized: data.finalized,
        releaseTime: Number(data.releaseTime),
        milestonePayouts: data.milestonePayouts.map((p: bigint) => ethers.formatUnits(p, 6)),
        milestonesPaid: data.milestonesPaid,
        nextMilestoneToPay: Number(data.nextMilestoneToPay),
        termsContent: termsData,
      });
    } catch (err) {
      console.error("Failed to fetch vault details:", err);
      setError("Could not fetch vault details.");
    } finally {
      setIsLoading(false);
    }
  }, [vaultId, vaultFactoryContract]);

  useEffect(() => {
    setIsLoading(true);
    fetchVaultDetails();
  }, [fetchVaultDetails]);

  // handleReleaseTimeLock is REMOVED
  // handleReleaseMilestone is UNCHANGED
  const handleReleaseMilestone = async () => {
    if (!vaultFactoryContract) return;
    setIsActionLoading(true);
    setStatus('Sending transaction...');
    try {
      const tx = await vaultFactoryContract.releaseNextMilestone(vaultId);
      await tx.wait();
      setStatus('✅ Milestone released successfully!');
      fetchVaultDetails();
    } catch (err: unknown) {
      console.error(err);
      setError((err as { reason: string }).reason || 'Failed to release milestone.');
    } finally {
      setIsActionLoading(false);
    }
  };


  if (isLoading) return <div className="text-center py-10">Loading Vault Details...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!details) return <div className="text-center py-10">No vault details found.</div>;

  // --- UPDATED: New conditional rendering logic ---
  const isFunder = account && details.funder.toLowerCase() === account.toLowerCase();
  const isPrizePool = details.vaultType === 0;
  const isMilestone = details.vaultType === 1;
  
  const canDistributePrizePool = isFunder && isPrizePool && !details.finalized && details.releaseTime! * 1000 <= Date.now();
  const canReleaseMilestone = isFunder && isMilestone && !details.finalized;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold font-display">Pact #{vaultId}</h1>
        <p className={`mt-2 text-sm font-semibold ${details.finalized ? 'text-red-500' : 'text-green-500'}`}>
          {details.finalized ? 'Status: Completed' : 'Status: Active'}
        </p>
      </div>

      {/* --- UPDATED: ACTION BOX --- */}
      {/* Show Prize Pool distribution form for the funder */}
      {canDistributePrizePool && (
          <DistributePrizePoolForm 
              vaultId={vaultId}
              totalAmount={details.totalAmount}
              onDistributeSuccess={fetchVaultDetails}
          />
      )}
      {/* Show Milestone release button for the funder */}
      {canReleaseMilestone && (
          <div className="bg-card p-6 rounded-lg border border-muted">
              <button onClick={handleReleaseMilestone} disabled={isActionLoading} className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-md disabled:opacity-50">
                  {isActionLoading ? 'Processing...' : `Release Milestone #${details.nextMilestoneToPay! + 1}`}
              </button>
          </div>
      )}
      {/* Show a status message if no actions are available */}
      {!canDistributePrizePool && !canReleaseMilestone && (
        <div className="bg-card p-6 rounded-lg border border-muted text-center text-muted-foreground">
           {details.finalized ? "This pact has been completed." : "Awaiting next action..."}
        </div>
      )}
      {status && <p className="text-green-600 text-sm text-center pt-4">{status}</p>}


      {/* --- UPDATED: DETAILS SECTION --- */}
      <div className="bg-card p-8 rounded-lg border border-muted">
        <h2 className="text-xl font-bold font-display mb-4">Vault Information</h2>
        <dl>
          <DetailItem label="Funder" value={details.funder} />
          {/* Only show beneficiary for Milestone vaults */}
          {isMilestone && <DetailItem label="Beneficiary" value={details.beneficiary} />}
          <DetailItem label="Total Value" value={`${details.totalAmount} USDFC`} />
          <DetailItem label="Amount Withdrawn" value={`${details.amountWithdrawn} USDFC`} />
          {/* Show Prize Pool as the type */}
          <DetailItem label="Vault Type" value={isPrizePool ? "Prize Pool" : "Milestone-Based"} />
          {/* Show unlock time for Prize Pool vaults */}
          {isPrizePool && details.releaseTime && (
            <DetailItem 
              label="Unlock Time" 
              value={
                <div className="text-right">
                  <div>{new Date(details.releaseTime * 1000).toLocaleString()}</div>
                  <div className={`text-xs mt-1 ${details.releaseTime * 1000 <= Date.now() ? 'text-green-600' : 'text-orange-600'}`}>
                    {details.releaseTime * 1000 <= Date.now() ? '✅ Unlocked' : '🔒 Locked'}
                  </div>
                </div>
              } 
            />
          )}
          <DetailItem label="Token Contract" value={details.token} />
        </dl>
      </div>

      {/* Terms and Milestone sections are mostly unchanged */}
      <div className="bg-card p-8 rounded-lg border border-muted">
         <h2 className="text-xl font-bold font-display mb-4">Agreement Terms</h2>
         {/* ... IPFS terms rendering ... */}
         {details.termsContent ? (
            <pre className="text-sm whitespace-pre-wrap bg-background p-4 rounded-md">{details.termsContent.terms}</pre>
         ) : (
            <p className="text-muted-foreground">Fetching terms from IPFS...</p>
         )}

         {isMilestone && (
            <div className="mt-6">
                 {/* ... Milestone list rendering ... */}
                 <h3 className="text-lg font-bold font-display mb-2">Milestones</h3>
                 <ul className="space-y-2">
                    {details.milestonePayouts?.map((payout, index) => (
                        <li key={index} className={`flex justify-between p-2 rounded-md ${details.milestonesPaid![index] ? 'bg-green-500/20' : 'bg-background'}`}>
                            <span>Milestone {index + 1}: {payout} USDFC</span>
                            <span>{details.milestonesPaid![index] ? '✅ Paid' : '⏳ Pending'}</span>
                        </li>
                    ))}
                 </ul>
            </div>
         )}
      </div>
    </div>
  );
}