'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { PinataSDK } from 'pinata';
import Erc20Abi from '@/lib/abi/Erc20.json';

const pinata = new PinataSDK({});

// UPDATED: VaultType now reflects the contract's enum
type VaultType = "PrizePool" | "Milestone";

export default function CreateVaultForm() {
    const router = useRouter();
    const { signer, vaultFactoryContract, activeChainConfig } = useWeb3(); 

    // UPDATED: Initial state is now "PrizePool"
    const [vaultType, setVaultType] = useState<VaultType>("PrizePool");
    const [beneficiary, setBeneficiary] = useState("");
    const [tokenAddress, setTokenAddress] = useState("");
    const [terms, setTerms] = useState("");

    // A single, consistent date object for initialization.
    const getInitialFutureDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d;
    };

    // Correctly initialize date and time from the same source.
    const [releaseDate, setReleaseDate] = useState(() => {
        const d = getInitialFutureDate();
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [releaseTime, setReleaseTime] = useState(() => {
        const d = getInitialFutureDate();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    });

    const [totalAmount, setTotalAmount] = useState("");
    const [milestoneAmounts, setMilestoneAmounts] = useState("");

    const [isApproving, setIsApproving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (activeChainConfig) {
            setTokenAddress(activeChainConfig.primaryCoin.address);
            setIsApproved(false); // Reset approval when network changes
        }
    }, [activeChainConfig]);

    const amountToApprove = useMemo(() => {
        if (!activeChainConfig) return 0n;
        try {
            const decimals = activeChainConfig.primaryCoin.decimals;
            if (vaultType === 'PrizePool') {
                return ethers.parseUnits(totalAmount || '0', decimals);
            } else {
                const payouts = milestoneAmounts.split(',').map(amt => ethers.parseUnits(amt.trim() || '0', decimals));
                return payouts.reduce((acc, val) => acc + val, 0n);
            }
        } catch { return 0n; }
    }, [vaultType, totalAmount, milestoneAmounts, activeChainConfig]);

    const needsApproval = amountToApprove > 0n;

    const handleApprove = async () => {
        if (!signer || !tokenAddress || !activeChainConfig?.contractAddress) {
            setError("Cannot approve: Wallet not connected or network configuration is missing.");
            return;
        }
        setError('');
        setStatusMessage('Requesting approval from your wallet...');
        setIsApproving(true);
        try {
            const tokenContract = new ethers.Contract(tokenAddress, Erc20Abi, signer);
            const tx = await tokenContract.approve(activeChainConfig.contractAddress, amountToApprove);
            setStatusMessage("Approval transaction sent... waiting for confirmation.");
            await tx.wait();
            setIsApproved(true);
            setStatusMessage("✓ Approved! You can now create the vault.");
        } catch (err) {
            console.error("Error approving tokens:", err);
            setError("An error occurred during approval.");
            setStatusMessage('');
        } finally {
            setIsApproving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vaultFactoryContract || !activeChainConfig) { 
            setError('Wallet not connected or contract not initialized.');
            return;
        }

        setError('');
        setIsCreating(true);

        try {
            // IPFS upload logic
            setStatusMessage("Uploading agreement to IPFS...");
            const ipfsData = vaultType === 'Milestone' 
                ? { beneficiary, tokenAddress, terms, vaultType }
                : { tokenAddress, terms, vaultType };
            const jsonFile = new File([JSON.stringify(ipfsData)], "vault-terms.json", { type: "application/json" });
            
            const urlRequest = await fetch("/api/upload");
            const { url: signedUrl } = await urlRequest.json();
            const uploadResult = await pinata.upload.public.file(jsonFile).url(signedUrl);
            const termsCID = uploadResult.cid;
            setStatusMessage(`Agreement stored. Preparing transaction...`);

            const releaseTimestamp = Math.floor(new Date(`${releaseDate}T${releaseTime}`).getTime() / 1000);
            
            let tx;
            if (vaultType === "PrizePool") {
                setStatusMessage("Sending transaction to create Prize Pool Vault...");
                tx = await vaultFactoryContract.createPrizePoolVault(tokenAddress, amountToApprove, releaseTimestamp, termsCID);
            } else {
                if (!ethers.isAddress(beneficiary)) {
                    setError("A valid beneficiary address is required for Milestone vaults.");
                    setIsCreating(false);
                    return;
                }
                const payouts = milestoneAmounts.split(',').map(amt => ethers.parseUnits(amt.trim(), activeChainConfig.primaryCoin.decimals));
                setStatusMessage("Sending transaction to create Milestone Vault...");
                tx = await vaultFactoryContract.createMilestoneVault(beneficiary, tokenAddress, payouts, termsCID);
            }

            await tx.wait();
            setStatusMessage('✅ Vault created successfully! Redirecting...');
            setTimeout(() => router.push('/dashboard/active'), 3000);

        } catch (err: unknown) {
            console.error("Error creating vault:", err);
            setError((err as { reason: string }).reason || "An error occurred creating the vault.");
            setStatusMessage('');
        } finally {
            setIsCreating(false);
        }
    };

    // --- JSX (UI) part with updated logic ---
    const inputStyles = "w-full p-2 bg-background border border-muted rounded-md focus:ring-2 focus:ring-primary text-foreground";
    const labelStyles = "font-bold text-foreground/90";
    const buttonStyles = "px-4 py-3 rounded-md font-bold text-sm transition-opacity";
    const disabledStyles = "disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-card p-6 sm:p-8 rounded-lg border border-muted space-y-6">
            <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-md">
                {/* UPDATED: Button text */}
                <button type="button" onClick={() => setVaultType("PrizePool")} className={`${buttonStyles} ${vaultType === 'PrizePool' ? 'bg-primary text-primary-foreground' : 'hover:bg-background'}`}>Prize Pool</button>
                <button type="button" onClick={() => setVaultType("Milestone")} className={`${buttonStyles} ${vaultType === 'Milestone' ? 'bg-primary text-primary-foreground' : 'hover:bg-background'}`}>Milestone</button>
            </div>
            
            {/* UPDATED: Conditionally render beneficiary input */}
            {vaultType === "Milestone" && (
                <div className="space-y-2">
                    <label htmlFor="beneficiary" className={labelStyles}>Beneficiary Address</label>
                    <input id="beneficiary" type="text" value={beneficiary} onChange={e => setBeneficiary(e.target.value)} className={inputStyles} placeholder="0x..." required={vaultType === "Milestone"} />
                </div>
            )}

            <div className="space-y-2">
                <label htmlFor="tokenAddress" className={labelStyles}>
                    Escrow Token ({activeChainConfig?.primaryCoin.symbol || '...'})
                </label>
                <input id="tokenAddress" type="text" value={tokenAddress} readOnly className={`${inputStyles} bg-muted/50`} placeholder="Auto-filled by network..." />
            </div>
            <div className="space-y-2">
                <label htmlFor="terms" className={labelStyles}>Terms & Deliverables</label>
                <textarea id="terms" value={terms} onChange={e => setTerms(e.target.value)} className={inputStyles} rows={4} placeholder="e.g., Hackathon rules, project grant scope..." required />
            </div>

            {/* UPDATED: Renamed to PrizePool */}
            {vaultType === "PrizePool" ? (
                <div className="space-y-4 p-4 border border-muted rounded-md bg-background/50">
                    <h3 className="font-display font-bold text-lg">Prize Pool Details</h3>
                    <input type="text" value={totalAmount} onChange={e => { setTotalAmount(e.target.value); setIsApproved(false); }} className={inputStyles} placeholder="Total Prize Pool Amount" required />
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className={inputStyles} required />
                        <input type="time" value={releaseTime} onChange={e => setReleaseTime(e.target.value)} className={inputStyles} required />
                    </div>
                </div>
            ) : (
                <div className="space-y-4 p-4 border border-muted rounded-md bg-background/50">
                    <h3 className="font-display font-bold text-lg">Milestone Details</h3>
                    <input type="text" value={milestoneAmounts} onChange={e => { setMilestoneAmounts(e.target.value); setIsApproved(false); }} className={inputStyles} placeholder="e.g., 100, 250, 150" required />
                    <p className="text-sm text-muted-foreground">Enter amounts separated by commas.</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                {needsApproval && (
                    <button type="button" onClick={handleApprove} disabled={isApproving || isApproved} className={`${buttonStyles} w-full sm:w-1/2 bg-secondary text-secondary-foreground hover:bg-secondary/90 ${disabledStyles}`}>
                        {isApproving ? 'Approving...' : (isApproved ? '✓ Approved' : '1. Approve Funds')}
                    </button>
                )}
                <button type="submit" disabled={isCreating || isApproving || (needsApproval && !isApproved)} className={`${buttonStyles} ${needsApproval ? 'w-full sm:w-1/2' : 'w-full'} bg-accent text-accent-foreground hover:bg-accent/90 ${disabledStyles}`}>
                    {isCreating ? 'Creating...' : (needsApproval ? '2. Create Vault' : 'Create Vault')}
                </button>
            </div>

            {statusMessage && <p className="text-green-600 text-sm text-center pt-2">{statusMessage}</p>}
            {error && <p className="text-red-600 text-sm text-center pt-2">{error}</p>}
        </form>
    );
}