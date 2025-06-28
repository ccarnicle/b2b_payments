'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { MOCK_TOKEN_ADDRESS, ESCROW_FACTORY_ADDRESS, MOCK_TOKEN_ABI } from '@/lib/contracts';
import FormInput from '@/components/ui/FormInput';

interface JoinPoolFormProps {
  poolId: string;
  dues: string;
  onJoinSuccess: () => void; // Callback to refresh data on parent page
}

export default function JoinPoolForm({ poolId, dues, onJoinSuccess }: JoinPoolFormProps) {
  const { signer, contract: factoryContract, account } = useWeb3();

  // Determine if dues are fixed or open contribution
  const isFixedDues = Number(dues) > 0;
  
  // Manage form state
  const [amount, setAmount] = useState(isFixedDues ? dues : '');
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!account) {
    return <div className="text-center bg-secondary p-4 rounded-md text-secondary-foreground">Please connect your wallet to join the pool.</div>
  }

  const handleApprove = async () => {
    if (!signer || !amount) {
      setError("Please ensure an amount is entered and your wallet is connected.");
      return;
    }
    setError('');
    setSuccess('');
    setIsApproving(true);
    try {
      const tokenContract = new ethers.Contract(MOCK_TOKEN_ADDRESS, MOCK_TOKEN_ABI, signer);
      const amountInWei = ethers.parseUnits(amount, 18);

      const tx = await tokenContract.approve(ESCROW_FACTORY_ADDRESS, amountInWei);
      setSuccess("Approval transaction sent... waiting for confirmation.");
      await tx.wait();

      setIsApproved(true);
      setSuccess("Successfully approved! You can now join the pool.");
    } catch (err: unknown) {
      console.error("Error approving tokens:", err);
      let errorMessage = "An error occurred during approval.";
      if (typeof err === 'object' && err !== null && 'reason' in err) {
        errorMessage = (err as { reason: string }).reason;
      }
      setError(errorMessage);
    } finally {
      setIsApproving(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoryContract || !amount) {
      setError('Contract not ready or amount not set.');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const amountInWei = ethers.parseUnits(amount, 18);
      const tx = await factoryContract.joinEscrow(poolId, amountInWei);
      
      setSuccess('Join transaction sent! Waiting for confirmation...');
      await tx.wait();

      setSuccess('Successfully joined the pool!');
      onJoinSuccess(); // Trigger data refresh on the parent page
      setIsApproved(false); // Reset approval state
      if (!isFixedDues) setAmount(''); // Clear amount for open contribution pools

    } catch (err: unknown) {
      console.error("Error joining pool:", err);
      let errorMessage = "An error occurred while joining the pool.";
      if (typeof err === 'object' && err !== null && 'reason' in err) {
         errorMessage = (err as { reason: string }).reason;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleJoin} className="bg-card p-8 rounded-lg border border-accent mt-8 space-y-6">
      <h2 className="text-xl font-semibold">Join This Pool</h2>
      <FormInput
        label={isFixedDues ? "Required Dues (MTK)" : "Contribution Amount (MTK)"}
        id="joinAmount"
        type="number"
        value={amount}
        onChange={(e) => { setAmount(e.target.value); setIsApproved(false); }}
        placeholder="e.g., 50"
        readOnly={isFixedDues}
      />
      
      <div className="flex space-x-4">
        <button type="button" onClick={handleApprove} disabled={isApproving || isApproved} className="w-1/2 bg-secondary text-secondary-foreground font-bold py-3 rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
          {isApproving ? 'Approving...' : (isApproved ? '✓ Approved' : '1. Approve')}
        </button>
        <button type="submit" disabled={isLoading || !isApproved} className="w-1/2 bg-primary text-primary-foreground font-bold py-3 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? 'Joining...' : '2. Join Pool'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
      {success && <p className="text-green-500 text-sm text-center pt-2">{success}</p>}
    </form>
  );
}