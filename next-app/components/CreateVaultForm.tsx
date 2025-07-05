'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { useTokenBalances } from '@/lib/hooks/useTokenBalances';
import { PinataSDK } from 'pinata';
import Erc20Abi from '@/lib/abi/Erc20.json';

const pinata = new PinataSDK({});

// UPDATED: VaultType now reflects the contract's enum
type VaultType = "PrizePool" | "Milestone";

export default function CreateVaultForm() {
    const router = useRouter();
    const { signer, vaultFactoryContract, activeChainConfig } = useWeb3();
    const { nativeToken, escrowToken, isLoading: isLoadingBalances, error: balanceError, hasSufficientBalances, refreshBalances } = useTokenBalances(); 

    // UPDATED: Initial state is now "PrizePool"
    const [vaultType, setVaultType] = useState<VaultType>("PrizePool");
    const [beneficiary, setBeneficiary] = useState("");
    const [tokenAddress, setTokenAddress] = useState("");
    const [terms, setTerms] = useState("");
    const [pdfCid, setPdfCid] = useState<string | null>(null);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handlePdfUpload(file);
        }
    };

    const handlePdfUpload = async (file: File) => {
        if (!file) return;

        setIsUploadingPdf(true);
        setUploadStatus('Getting upload URL...');
        setError('');
        try {
            const urlRequest = await fetch("/api/upload");
            const { url: signedUrl, error } = await urlRequest.json();

            if (error || !signedUrl) {
                throw new Error(error || "Could not get a signed URL for upload.");
            }

            setUploadStatus('Uploading PDF to IPFS...');
            const pinata = new PinataSDK({});
            const uploadResult = await pinata.upload.public.file(file).url(signedUrl);
            const cid = uploadResult.cid;
            
            console.log("PDF uploaded with CID:", cid);
            setPdfCid(cid);
            setUploadStatus(`✓ PDF uploaded!`);
        } catch (err) {
            console.error("Error uploading PDF:", err);
            const errorMessage = err instanceof Error ? err.message : 'Could not upload the PDF file. Please try again.';
            setUploadStatus(`Error: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            setIsUploadingPdf(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vaultFactoryContract || !activeChainConfig) { 
            setError('Wallet not connected or contract not initialized.');
            return;
        }

        if (!terms && !pdfCid) {
            setError('Please provide terms or upload a PDF.');
            return;
        }

        setError('');
        setIsCreating(true);

        try {
            // IPFS upload logic
            setStatusMessage("Uploading agreement to IPFS...");
            const ipfsData = vaultType === 'Milestone' 
                ? { beneficiary, tokenAddress, terms, vaultType, pdfCid }
                : { tokenAddress, terms, vaultType, pdfCid };
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
                <label className={labelStyles}>
                    Funding Token: {activeChainConfig && (
                        <a 
                            href={activeChainConfig.name === 'Flow-EVM' ? 'https://faucet.flow.com/fund-account' : 'https://calibration.filfox.info/en/address/0xb3042734b608a1B16e9e86B374A3f3e389B4cDf0'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 hover:underline"
                        >
                            {activeChainConfig.primaryCoin.symbol}
                        </a>
                    )}
                </label>
            </div>
            <div className="space-y-2">
                <label htmlFor="terms" className={labelStyles}>Terms & Deliverables</label>
                <textarea id="terms" value={terms} onChange={e => setTerms(e.target.value)} className={inputStyles} rows={4} placeholder="e.g., Hackathon rules, project grant scope..." required={!pdfCid} />
                <div className="mt-2 text-sm text-center">
                    <label htmlFor="pdf-upload" className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer font-medium">
                        {pdfCid ? 'Replace PDF' : 'or Upload a PDF'}
                    </label>
                    <input id="pdf-upload" type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" disabled={isUploadingPdf} />
                    {uploadStatus && <p className="mt-1 text-foreground/80">{uploadStatus}</p>}
                </div>
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

            <div className="h-px bg-muted w-full my-6"></div>
            
            {needsApproval && (
                 <div className="space-y-4">
                    <p className="text-sm text-center text-foreground/80">
                        To create this vault, you must first grant the factory contract permission to transfer the required amount of {activeChainConfig?.primaryCoin.symbol || 'tokens'}.
                    </p>
                    <button type="button" onClick={handleApprove} disabled={isApproving || isApproved} className={`${buttonStyles} w-full bg-secondary text-secondary-foreground ${disabledStyles}`}>
                        {isApproving ? 'Approving...' : (isApproved ? '✓ Approved' : `Approve ${ethers.formatUnits(amountToApprove, activeChainConfig?.primaryCoin.decimals)} ${activeChainConfig?.primaryCoin.symbol}`)}
                    </button>
                </div>
            )}

            {/* Balance Check Section - Only show when insufficient balances */}
            {activeChainConfig && !hasSufficientBalances && (
                <div className="space-y-4 p-4 border border-muted rounded-md bg-background/50">
                    <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-lg">Token Balance Check</h3>
                        <button
                            type="button"
                            onClick={refreshBalances}
                            disabled={isLoadingBalances}
                            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                            title="Refresh balances"
                        >
                            <svg className={`h-4 w-4 ${isLoadingBalances ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                    {isLoadingBalances ? (
                        <div className="flex items-center justify-center p-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="ml-2 text-sm text-muted-foreground">Checking balances...</span>
                        </div>
                    ) : balanceError ? (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{balanceError}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Native Token Balance */}
                            {nativeToken && (
                                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${nativeToken.hasMinBalance ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className="font-medium">{nativeToken.symbol}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">
                                            {parseFloat(nativeToken.balance).toFixed(4)} / {nativeToken.minBalance} required
                                        </p>
                                        {!nativeToken.hasMinBalance && (
                                            <a 
                                                href={nativeToken.faucetUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                                            >
                                                Get more →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Escrow Token Balance */}
                            {escrowToken && (
                                <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-3 h-3 rounded-full ${escrowToken.hasMinBalance ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className="font-medium">{escrowToken.symbol}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">
                                            {parseFloat(escrowToken.balance).toFixed(4)} / {escrowToken.minBalance} required
                                        </p>
                                        {!escrowToken.hasMinBalance && (
                                            <a 
                                                href={escrowToken.faucetUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-500 hover:text-blue-600 hover:underline"
                                            >
                                                Get more →
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Insufficient Balance Warning */}
                            {!hasSufficientBalances && !isLoadingBalances && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-yellow-700">
                                                <strong>Insufficient Balance:</strong> You need minimum balances to create a vault and pay gas fees.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
           
            <button type="submit" disabled={isCreating || isApproving || (needsApproval && !isApproved) || isUploadingPdf || !hasSufficientBalances} className={`${buttonStyles} w-full bg-primary text-primary-foreground ${disabledStyles}`}>
                {isCreating ? 'Creating Vault...' : 'Create Vault'}
            </button>

            {statusMessage && <p className="text-center text-sm text-green-400">{statusMessage}</p>}
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
        </form>
    );
}