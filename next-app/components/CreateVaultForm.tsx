'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context'; // Import your custom hook
import { PinataSDK } from 'pinata';
import Erc20Abi from '@/lib/abi/Erc20.json'; // The ERC20 ABI is still needed for the 'approve' function
import { VAULT_FACTORY_ADDRESS } from '@/lib/contracts';

// Initialize Pinata SDK for client-side use
const pinata = new PinataSDK({});

type VaultType = "TimeLocked" | "Milestone";

export default function CreateVaultForm() {
    const router = useRouter();
    // Use the context to get the signer and the pre-configured VaultFactory contract
    const { signer, vaultFactoryContract } = useWeb3(); 

    // --- FORM STATE (remains the same) ---
    const [vaultType, setVaultType] = useState<VaultType>("TimeLocked");
    const [beneficiary, setBeneficiary] = useState("");
    const [tokenAddress, setTokenAddress] = useState(""); // USDFC Address
    const [terms, setTerms] = useState("");
    const [releaseDate, setReleaseDate] = useState("");
    const [releaseTime, setReleaseTime] = useState("");
    const [totalAmount, setTotalAmount] = useState("");
    const [milestoneAmounts, setMilestoneAmounts] = useState("");

    // --- UI & TRANSACTION STATE (remains the same) ---
    const [isApproving, setIsApproving] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState('');

    const amountToApprove = useMemo(() => {
        try {
            if (vaultType === 'TimeLocked') {
                return ethers.parseUnits(totalAmount || '0', 6);
            } else {
                const payouts = milestoneAmounts.split(',').map(amt => ethers.parseUnits(amt.trim() || '0', 6));
                return payouts.reduce((acc, val) => acc + val, 0n);
            }
        } catch { return 0n; }
    }, [vaultType, totalAmount, milestoneAmounts]);

    const needsApproval = amountToApprove > 0n;

    const handleApprove = async () => {
        if (!signer || !tokenAddress) {
            setError("Please connect your wallet and provide a token address.");
            return;
        }
        // ... (rest of handleApprove logic is the same, as it creates a *token* contract)
        setError('');
        setStatusMessage('Requesting approval from your wallet...');
        setIsApproving(true);
        try {
            const tokenContract = new ethers.Contract(tokenAddress, Erc20Abi, signer);
            const tx = await tokenContract.approve(VAULT_FACTORY_ADDRESS, amountToApprove);
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
        // Check for the contract instance from the context
        if (!vaultFactoryContract) { 
            setError('Wallet not connected or contract not initialized.');
            return;
        }

        setError('');
        setIsCreating(true);

        try {
            // Step 1: IPFS Upload (same as before)
            setStatusMessage("Uploading agreement to IPFS...");
            const vaultData = { beneficiary, tokenAddress, terms, vaultType };
            const jsonFile = new File([JSON.stringify(vaultData)], "vault-terms.json", { type: "application/json" });
            const urlRequest = await fetch("/api/upload");
            const { url: signedUrl } = await urlRequest.json();
            const uploadResult = await pinata.upload.public.file(jsonFile).url(signedUrl);
            const termsCID = uploadResult.cid;
            setStatusMessage(`Agreement stored. Preparing transaction...`);

            // Step 2: Smart Contract Interaction - Now using the contract from context
            let tx;
            if (vaultType === "TimeLocked") {
                const releaseTimestamp = Math.floor(new Date(`${releaseDate}T${releaseTime}`).getTime() / 1000);
                setStatusMessage("Sending transaction to create Time-Locked Vault...");
                tx = await vaultFactoryContract.createTimeLockedVault(beneficiary, tokenAddress, amountToApprove, releaseTimestamp, termsCID);
            } else {
                const payouts = milestoneAmounts.split(',').map(amt => ethers.parseUnits(amt.trim(), 6));
                setStatusMessage("Sending transaction to create Milestone Vault...");
                tx = await vaultFactoryContract.createMilestoneVault(beneficiary, tokenAddress, payouts, termsCID);
            }

            await tx.wait();
            setStatusMessage('✅ Vault created successfully! Redirecting...');
            setTimeout(() => router.push('/'), 3000);

        } catch (err) {
            console.error("Error creating vault:", err);
            setError("An error occurred creating the vault.");
            setStatusMessage('');
        } finally {
            setIsCreating(false);
        }
    };

    // --- JSX (UI) part remains exactly the same ---
    const inputStyles = "w-full p-2 bg-background border border-muted rounded-md focus:ring-2 focus:ring-primary text-foreground";
    const labelStyles = "font-bold text-foreground/90";
    const buttonStyles = "px-4 py-3 rounded-md font-bold text-sm transition-opacity";
    const disabledStyles = "disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-card p-6 sm:p-8 rounded-lg border border-muted space-y-6">
            <div className="grid grid-cols-2 gap-2 p-1 bg-background rounded-md">
                <button type="button" onClick={() => setVaultType("TimeLocked")} className={`${buttonStyles} ${vaultType === 'TimeLocked' ? 'bg-primary text-primary-foreground' : 'hover:bg-background'}`}>Time-Locked</button>
                <button type="button" onClick={() => setVaultType("Milestone")} className={`${buttonStyles} ${vaultType === 'Milestone' ? 'bg-primary text-primary-foreground' : 'hover:bg-background'}`}>Milestone-Based</button>
            </div>
            {/* ... all your other input fields ... */}
             <div className="space-y-2">
                <label htmlFor="beneficiary" className={labelStyles}>Beneficiary Address</label>
                <input id="beneficiary" type="text" value={beneficiary} onChange={e => setBeneficiary(e.target.value)} className={inputStyles} placeholder="0x..." required />
            </div>
            <div className="space-y-2">
                <label htmlFor="tokenAddress" className={labelStyles}>Token Address (USDFC)</label>
                <input id="tokenAddress" type="text" value={tokenAddress} onChange={e => { setTokenAddress(e.target.value); setIsApproved(false); }} className={inputStyles} placeholder="0x..." required />
            </div>
            <div className="space-y-2">
                <label htmlFor="terms" className={labelStyles}>Terms & Deliverables</label>
                <textarea id="terms" value={terms} onChange={e => setTerms(e.target.value)} className={inputStyles} rows={4} placeholder="Define the scope of work, milestones, or grant agreement..." required />
            </div>

            {vaultType === "TimeLocked" ? (
                <div className="space-y-4 p-4 border border-muted rounded-md bg-background/50">
                    <h3 className="font-display font-bold text-lg">Time-Lock Details</h3>
                    <input type="text" value={totalAmount} onChange={e => { setTotalAmount(e.target.value); setIsApproved(false); }} className={inputStyles} placeholder="Total Amount to Lock" required />
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} className={inputStyles} required />
                        <input type="time" value={releaseTime} onChange={e => setReleaseTime(e.target.value)} className={inputStyles} required />
                    </div>
                </div>
            ) : (
                <div className="space-y-4 p-4 border border-muted rounded-md bg-background/50">
                    <h3 className="font-display font-bold text-lg">Milestone Details</h3>
                    <input type="text" value={milestoneAmounts} onChange={e => { setMilestoneAmounts(e.target.value); setIsApproved(false); }} className={inputStyles} placeholder="e.g., 100, 250, 150" required />
                    <p className="text-sm text-muted-foreground">Enter amounts separated by commas. The total will be calculated and deposited upfront.</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                {needsApproval && (
                    <button type="button" onClick={handleApprove} disabled={isApproving || isApproved} className={`${buttonStyles} w-full sm:w-1/2 bg-secondary text-secondary-foreground hover:bg-secondary/90 ${disabledStyles}`}>
                        {isApproving ? 'Approving...' : (isApproved ? '✓ Approved' : '1. Approve Funds')}
                    </button>
                )}
                <button type="submit" disabled={isCreating || isApproving || (needsApproval && !isApproved)} className={`${buttonStyles} ${needsApproval ? 'w-full sm:w-1/2' : 'w-full'} bg-accent text-accent-foreground hover:bg-accent/90 ${disabledStyles}`}>
                    {isCreating ? 'Creating Vault...' : (needsApproval ? '2. Create & Fund Vault' : 'Create & Fund Vault')}
                </button>
            </div>

            {statusMessage && <p className="text-green-600 text-sm text-center pt-2">{statusMessage}</p>}
            {error && <p className="text-red-600 text-sm text-center pt-2">{error}</p>}
        </form>
    );
}