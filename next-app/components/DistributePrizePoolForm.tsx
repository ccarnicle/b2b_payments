// next-app/components/DistributePrizePoolForm.tsx
'use client';

import { useState } from 'react';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { ethers } from 'ethers';

interface DistributeFormProps {
    vaultId: string;
    totalAmount: string;
    tokenSymbol: string;
    onDistributeSuccess: () => void;
    // Optional props for verifiable vaults
    isVerifiable?: boolean;
    funderCanOverrideVerification?: boolean;
}

export function DistributePrizePoolForm({ 
    vaultId, 
    totalAmount, 
    tokenSymbol, 
    onDistributeSuccess,
    isVerifiable,
    funderCanOverrideVerification
}: DistributeFormProps) {
    const { vaultFactoryContract, activeChainConfig } = useWeb3();
    const [recipients, setRecipients] = useState('');
    const [amounts, setAmounts] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [funderBypassVerification, setFunderBypassVerification] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vaultFactoryContract || !activeChainConfig) return;

        setIsLoading(true);
        setError('');
        setStatus('Preparing distribution transaction...');

        try {
            const recipientsArray = recipients.split(',').map(r => r.trim());
            const amountsArray = amounts.split(',').map(a => ethers.parseUnits(a.trim(), activeChainConfig?.primaryCoin.decimals || 18));

            const tx = await vaultFactoryContract.distributePrizePool(vaultId, recipientsArray, amountsArray, funderBypassVerification);
            setStatus('Submitting distribution to the blockchain...');
            await tx.wait();
            
            setStatus('✅ Distribution successful!');
            onDistributeSuccess(); // This will tell the parent page to refresh
        } catch (err: unknown) {
            console.error(err);
            setError((err as { reason: string }).reason || 'An error occurred during distribution.');
            setStatus('');
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyles = "w-full p-2 bg-background border border-muted rounded-md focus:ring-2 focus:ring-primary text-foreground";
    const labelStyles = "font-bold text-foreground/90";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-card p-6 rounded-lg border-muted mt-8">
            <h3 className="font-display text-xl font-bold">Distribute Prize Pool</h3>
            <p className="text-muted-foreground">Total to Distribute: <span className="font-bold text-foreground">{totalAmount} {tokenSymbol}</span></p>
            
            {/* Verifiable Storage Info */}
            {isVerifiable && funderCanOverrideVerification && (
                <div className="bg-background p-4 rounded-md border border-muted">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="funderBypassDistribution"
                            checked={funderBypassVerification}
                            onChange={(e) => setFunderBypassVerification(e.target.checked)}
                            disabled={isLoading}
                            className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                        />
                        <label htmlFor="funderBypassDistribution" className="text-sm text-muted-foreground cursor-pointer">
                            Bypass Filecoin Verification (if proof not live)
                        </label>
                    </div>
                </div>
            )}
            <div>
                <label htmlFor="recipients" className={labelStyles}>Recipient Addresses (comma-separated)</label>
                <textarea id="recipients" value={recipients} onChange={e => setRecipients(e.target.value)} className={inputStyles} rows={3} placeholder="0x..., 0x..., 0x..."/>
            </div>
            <div>
                <label htmlFor="amounts" className={labelStyles}>Amounts (comma-separated)</label>
                <textarea id="amounts" value={amounts} onChange={e => setAmounts(e.target.value)} className={inputStyles} rows={3} placeholder="1000, 500, 250..."/>
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-accent text-accent-foreground font-bold py-3 rounded-md disabled:opacity-50">
                {isLoading ? 'Distributing...' : 'Distribute Funds'}
            </button>
            {status && <p className="text-green-600 text-sm text-center pt-2">{status}</p>}
            {error && <p className="text-red-600 text-sm text-center pt-2">{error}</p>}
        </form>
    );
}