'use client';

import { useState, useMemo } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import FormInput from '@/components/ui/FormInput';

interface Winner {
  address: string;
  amount: string;
}

interface DistributeWinningsFormProps {
  poolId: string;
  totalAmountInPot: string;
  onDistributeSuccess: () => void;
}

export default function DistributeWinningsForm({ poolId, totalAmountInPot, onDistributeSuccess }: DistributeWinningsFormProps) {
  const { contract } = useWeb3();
  const [winners, setWinners] = useState<Winner[]>([{ address: '', amount: '' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handler to update a specific winner's details
  const handleWinnerChange = (index: number, field: keyof Winner, value: string) => {
    const newWinners = [...winners];
    newWinners[index][field] = value;
    setWinners(newWinners);
  };

  // Handler to add a new winner input row
  const addWinner = () => {
    setWinners([...winners, { address: '', amount: '' }]);
  };

  // Handler to remove a winner input row
  const removeWinner = (index: number) => {
    const newWinners = winners.filter((_, i) => i !== index);
    setWinners(newWinners);
  };

  // Calculate the total amount specified in the input fields
  const totalToDistribute = useMemo(() => {
    return winners.reduce((sum, winner) => {
      const amount = parseFloat(winner.amount);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }, [winners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) {
      setError('Wallet not connected or contract not found.');
      return;
    }

    const recipientAddresses = winners.map(w => w.address);
    const amountsInWei = winners.map(w => ethers.parseUnits(w.amount, 18));
    
    // Check for duplicate addresses
    const uniqueAddresses = new Set(recipientAddresses);
    if (uniqueAddresses.size !== recipientAddresses.length) {
      setError("Duplicate winner addresses are not allowed. Each address can only receive one payout.");
      return;
    }

    // Check if total payout matches the pot
    if (parseFloat(totalToDistribute.toFixed(5)) !== parseFloat(parseFloat(totalAmountInPot).toFixed(5))) {
        setError(`Total payout (${totalToDistribute} MTK) must exactly match the total pot (${totalAmountInPot} MTK).`);
        return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const tx = await contract.distributeWinnings(poolId, recipientAddresses, amountsInWei);
      setSuccess('Distribution transaction sent! Waiting for confirmation...');
      
      await tx.wait();
      
      setSuccess('Winnings distributed successfully! The pool is now closed.');
      onDistributeSuccess();
    } catch (err: unknown) {
      console.error("Error distributing winnings:", err);
      let errorMessage = "An error occurred during distribution.";
      if (typeof err === 'object' && err !== null && 'reason' in err) {
        errorMessage = (err as { reason: string }).reason;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card p-8 rounded-lg border border-accent mt-8 space-y-6">
      <h2 className="text-xl font-semibold">Distribute Winnings</h2>
      
      {winners.map((winner, index) => (
        <div key={index} className="flex items-end space-x-4">
          <div className="flex-grow">
            <FormInput
              label={`Winner ${index + 1} Address`}
              id={`winner-address-${index}`}
              value={winner.address}
              onChange={(e) => handleWinnerChange(index, 'address', e.target.value)}
              placeholder="0x..."
            />
          </div>
          <div className="w-1/3">
            <FormInput
              label="Amount (MTK)"
              id={`winner-amount-${index}`}
              type="number"
              value={winner.amount}
              onChange={(e) => handleWinnerChange(index, 'amount', e.target.value)}
              placeholder="e.g., 100"
            />
          </div>
          <button type="button" onClick={() => removeWinner(index)} className="h-12 px-4 rounded-md bg-red-800/50 hover:bg-red-800/80 text-white font-bold" disabled={winners.length <= 1}>
            X
          </button>
        </div>
      ))}

      <button type="button" onClick={addWinner} className="w-full bg-secondary text-secondary-foreground font-bold py-2 rounded-md hover:bg-accent">
        + Add Another Winner
      </button>

      <div className="text-center bg-secondary p-4 rounded-md">
        <p className="text-foreground/80">Total in Pot: <span className="font-bold text-primary">{totalAmountInPot} MTK</span></p>
        <p className="text-foreground/80">Total to Distribute: <span className="font-bold text-primary">{totalToDistribute.toFixed(4)} MTK</span></p>
      </div>

      <button type="submit" disabled={isLoading} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
        {isLoading ? 'Distributing...' : 'Distribute & Close Pool'}
      </button>

      {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
      {success && <p className="text-green-500 text-sm text-center pt-2">{success}</p>}
    </form>
  );
}