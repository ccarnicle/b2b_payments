'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { MOCK_TOKEN_ADDRESS, ESCROW_FACTORY_ADDRESS, MOCK_TOKEN_ABI } from '@/lib/contracts';
import FormInput from '@/components/ui/FormInput';

export default function CreatePoolForm() {
    const { contract, signer } = useWeb3(); // We need the signer for the approve tx
    const router = useRouter();
    
    const [dues, setDues] = useState('');
    const [endTime, setEndTime] = useState('');
    const [joinAsOrganizer, setJoinAsOrganizer] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false); // NEW: State for approve button loading
    const [isApproved, setIsApproved] = useState(false); // NEW: State to track approval success

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // NEW: Handler for the "Approve" button
    const handleApprove = async () => {
        if (!signer || !dues) {
            setError("Please fill in the dues amount and connect your wallet.");
            return;
        }
        setError('');
        setSuccess('');
        setIsApproving(true);
        try {
            const tokenContract = new ethers.Contract(MOCK_TOKEN_ADDRESS, MOCK_TOKEN_ABI, signer);
            const duesInWei = ethers.parseUnits(dues, 18);

            const tx = await tokenContract.approve(ESCROW_FACTORY_ADDRESS, duesInWei);
            setSuccess("Approval transaction sent... waiting for confirmation.");
            await tx.wait();

            setIsApproved(true);
            setSuccess("Successfully approved! You can now create the pool.");
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contract) {
            setError('Please connect your wallet first.');
            return;
        }

        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const duesInWei = ethers.parseUnits(dues || '0', 18);
            const endTimeInSeconds = Math.floor(new Date(endTime).getTime() / 1000);
            
            const tx = await contract.createEscrow(MOCK_TOKEN_ADDRESS, duesInWei, 0, endTimeInSeconds, joinAsOrganizer);
            
            setSuccess('Creation transaction sent! Waiting for confirmation...');
            await tx.wait();

            setSuccess('Pool created successfully! Redirecting...');
            setTimeout(() => router.push('/'), 2000);

        } catch (err: unknown) {
            console.error("Error creating pool:", err);
            let errorMessage = "An error occurred while creating the pool.";
             if (typeof err === 'object' && err !== null && 'reason' in err) {
                errorMessage = (err as { reason: string }).reason;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Determine if the approve button should be shown
    const needsApproval = joinAsOrganizer && Number(dues) > 0;

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-card p-8 rounded-lg border border-accent space-y-6">
            {/* ... FormInputs are unchanged ... */}
            <FormInput label="Token Contract Address (MTK)" id="tokenAddress" value={MOCK_TOKEN_ADDRESS} readOnly />
            <FormInput label="Dues Amount (in MTK)" id="dues" type="number" value={dues} onChange={(e) => { setDues(e.target.value); setIsApproved(false); }} placeholder="e.g., 100" />
            <FormInput label="End Time" id="endTime" type="datetime-local" value={endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)} />
            <div className="flex items-center space-x-3">
              <input id="joinAsOrganizer" type="checkbox" checked={joinAsOrganizer} onChange={(e) => setJoinAsOrganizer(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              <label htmlFor="joinAsOrganizer" className="text-sm text-foreground/80">Join the pool immediately as the organizer?</label>
            </div>
            
            <div className="flex space-x-4">
                {needsApproval && (
                    <button type="button" onClick={handleApprove} disabled={isApproving || isApproved} className="w-1/2 bg-secondary text-secondary-foreground font-bold py-3 rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed">
                        {isApproving ? 'Approving...' : (isApproved ? '✓ Approved' : '1. Approve')}
                    </button>
                )}
                <button type="submit" disabled={isLoading || (needsApproval && !isApproved)} className={`w-full ${needsApproval ? 'w-1/2' : 'w-full'} bg-primary text-primary-foreground font-bold py-3 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed`}>
                    {isLoading ? 'Creating...' : (needsApproval ? '2. Create Pool' : 'Create Pool')}
                </button>
            </div>

            {error && <p className="text-red-500 text-sm text-center pt-2">{error}</p>}
            {success && <p className="text-green-500 text-sm text-center pt-2">{success}</p>}
        </form>
    );
}