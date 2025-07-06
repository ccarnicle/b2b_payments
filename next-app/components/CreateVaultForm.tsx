'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { Synapse, CONTRACT_ADDRESSES } from '@filoz/synapse-sdk';
import { useTokenBalances } from '@/lib/hooks/useTokenBalances';
import { PinataSDK } from 'pinata';
import Erc20Abi from '@/lib/abi/Erc20.json';
// Using console.log/error instead of toast since react-toastify isn't installed

const pinata = new PinataSDK({});

// UPDATED: VaultType now reflects the contract's enum
type VaultType = "PrizePool" | "Milestone";

export default function CreateVaultForm() {
    const router = useRouter();
    const {
        vaultFactoryContract,
        activeChainConfig,
        signer, // Necessary for Synapse SDK initialization
        provider // Also necessary for Synapse SDK initialization
    } = useWeb3();
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

    // Synapse integration states
    const [useVerifiableStorage, setUseVerifiableStorage] = useState(false);
    const [synapseProofSetId, setSynapseProofSetId] = useState<string | null>(null);
    const [funderCanOverrideVerification, setFunderCanOverrideVerification] = useState(false); // Default to false
    const [isSynapseSetupComplete, setIsSynapseSetupComplete] = useState(false);
    const [synapseLoading, setSynapseLoading] = useState(false);
    const [synapseProgressMessage, setSynapseProgressMessage] = useState('');
    // This will hold the raw file content as a Uint8Array, suitable for Synapse upload
    const [uploadedIpfsContent, setUploadedIpfsContent] = useState<Uint8Array | null>(null);
    // State to hold the File object for Synapse upload
    const [pactContentFile, setPactContentFile] = useState<File | null>(null);
    // State to hold the Synapse SDK instance
    const [synapseSdk, setSynapseSdk] = useState<Synapse | null>(null);

    // Determine if the current chain is Filecoin Calibration Testnet
    const isOnCalibrationTestnet = useMemo(() => {
        // Chain ID for Filecoin Calibration is "0x4cb2f" (314159 in decimal)
        return activeChainConfig?.chainId === "0x4cb2f";
    }, [activeChainConfig]);

    // Async Initialization Pattern: Use useEffect to await Synapse.create()
    useEffect(() => {
        async function initSynapseSdk() {


            if (isOnCalibrationTestnet && signer && provider) {
                try {
                    // Pass only provider for browser/MetaMask usage (not both signer and provider)
                    const sdk = await Synapse.create({ provider });
                    setSynapseSdk(sdk);
                } catch (error) {
                    console.error("❌ Failed to initialize Synapse SDK:", error);
                    setSynapseSdk(null); // Ensure state is null on error
                }
                            } else {
                setSynapseSdk(null); // Clear Synapse SDK if not on Calibration or if signer/provider are not ready
            }
        }
        initSynapseSdk();
    }, [isOnCalibrationTestnet, signer, provider]); // Re-run when these dependencies change

    useEffect(() => {
        if (activeChainConfig) {
            setTokenAddress(activeChainConfig.primaryCoin.address);
            setIsApproved(false); // Reset approval when network changes
        }
    }, [activeChainConfig]);

    // This useEffect is crucial for getting the raw content of the file
    // that the user selects for IPFS and making it available for Synapse upload.
    useEffect(() => {
        if (pactContentFile instanceof File) { 
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    // Read the file as an ArrayBuffer and convert to Uint8Array
                    setUploadedIpfsContent(new Uint8Array(e.target.result as ArrayBuffer));
                }
            };
            reader.readAsArrayBuffer(pactContentFile); // Read the file's content
        } else {
            setUploadedIpfsContent(null); // Clear if no file is selected
        }
    }, [pactContentFile]); // Depend on pactContentFile changing

    // Create content for Synapse upload (from either PDF or terms text)
    const synapseUploadContent = useMemo(() => {
        if (uploadedIpfsContent) {
            // Use uploaded PDF content
            return uploadedIpfsContent;
        } else if (terms.trim()) {
            // Use terms text as content
            return new TextEncoder().encode(terms);
        }
        return null;
    }, [uploadedIpfsContent, terms]);

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

    // Helper function to safely access properties from unknown objects
    const safeAccess = (obj: unknown, prop: string): string => {
        if (obj && typeof obj === 'object' && prop in obj) {
            const value = (obj as Record<string, unknown>)[prop];
            return value !== null && value !== undefined ? String(value) : 'unknown';
        }
        return 'unknown';
    };

    // Function to check if Synapse setup is complete
    const checkSynapseSetupStatus = useCallback(async () => {
        if (!synapseSdk || !isOnCalibrationTestnet) {
            return false;
        }

        setSynapseLoading(true);
        setSynapseProgressMessage("Checking Synapse setup status...");

        try {
            // Check if we have sufficient funds deposited
            const accountInfo = await synapseSdk.payments.accountInfo();
            const minRequiredBalance = ethers.parseUnits("1", 6); // 1 USDFC minimum
            
            if (accountInfo.availableFunds < minRequiredBalance) {
                return false;
            }

            // Check if Pandora service is approved
            const currentNetwork = synapseSdk.getNetwork() as keyof typeof CONTRACT_ADDRESSES.PANDORA_SERVICE;
            const pandoraAddress = CONTRACT_ADDRESSES.PANDORA_SERVICE[currentNetwork];
            
            const serviceApprovalStatus = await synapseSdk.payments.serviceApproval(pandoraAddress);
            
            if (!serviceApprovalStatus.isApproved) {
                return false;
            }

            // If we get here, setup is complete
            setIsSynapseSetupComplete(true);
            return true;

        } catch (error) {
            console.error("❌ Error checking Synapse setup:", error);
            return false;
        } finally {
            setSynapseLoading(false);
            setSynapseProgressMessage('');
        }
    }, [synapseSdk, isOnCalibrationTestnet]);

    // Auto-check Synapse setup status when conditions are met
    useEffect(() => {
        if (useVerifiableStorage && synapseSdk && isOnCalibrationTestnet && !isSynapseSetupComplete) {
            checkSynapseSetupStatus();
        }
    }, [useVerifiableStorage, synapseSdk, isOnCalibrationTestnet, isSynapseSetupComplete, checkSynapseSetupStatus]);

    // Function to handle Synapse payment setup (redirect to external setup)
    const handleSynapsePaymentSetup = useCallback(() => {
        if (!isOnCalibrationTestnet) {
            setError("Synapse setup is only available on Filecoin Calibration Testnet.");
            return;
        }

        // Open the external Synapse setup URL in a new tab
        window.open('https://fs-upload-dapp.netlify.app/', '_blank', 'noopener,noreferrer');
    }, [isOnCalibrationTestnet]); // Dependencies for useCallback

    // Function to handle content upload to Filecoin via Synapse
    const handleSynapseContentUpload = useCallback(async () => {
        // Ensure Synapse SDK is ready, we have content, and we are on Calibration
        if (!synapseSdk || !synapseUploadContent || !isOnCalibrationTestnet) {
            console.error("Synapse SDK not ready, no content available for upload, or not on Filecoin Calibration.");
            return;
        }
        // Ensure Synapse setup is complete before attempting upload
        if (!isSynapseSetupComplete) {
            console.error("Please complete the Synapse payment setup first.");
            return;
        }

        setSynapseLoading(true);
        setSynapseProgressMessage("Uploading content to Filecoin via Synapse...");
        setSynapseProofSetId(null); // Clear any previous proofSetId

        try {
            // Create a storage service instance. This handles provider selection and proof set management.
            const storage = await synapseSdk.createStorage({
                callbacks: {
                    onProviderSelected: (provider: unknown) => setSynapseProgressMessage(`Selected storage provider: ${safeAccess(provider, 'owner')}`),
                    onProofSetResolved: (info: unknown) => setSynapseProgressMessage(`Proof set resolved: ${safeAccess(info, 'proofSetId')} (Existing: ${safeAccess(info, 'isExisting') === 'true' ? 'Yes' : 'No'})`),
                    onProofSetCreationStarted: (tx: unknown) => setSynapseProgressMessage(`Proof set creation initiated. Tx Hash: ${safeAccess(tx, 'hash')}`),
                    onProofSetCreationProgress: (status: unknown) => setSynapseProgressMessage(`Proof set creation progress: Mined: ${safeAccess(status, 'transactionMined') === 'true' ? 'Yes' : 'No'}, Live: ${safeAccess(status, 'proofSetLive') === 'true' ? 'Yes' : 'No'}`),
                }
            });

            // Upload the raw content (Uint8Array) to the storage service.
            // The Synapse SDK handles underlying Filecoin Piece Commitment (CommP) and size constraints.
            await storage.upload(synapseUploadContent, {
                onUploadComplete: (commp: unknown) => setSynapseProgressMessage(`Content uploaded! CommP: ${commp}`),
                onRootAdded: (tx: unknown) => tx && setSynapseProgressMessage(`Root added to proof set. Tx Hash: ${safeAccess(tx, 'hash')}`),
                onRootConfirmed: (rootIds: unknown) => setSynapseProgressMessage(`Root IDs confirmed: ${Array.isArray(rootIds) ? rootIds.join(', ') : 'unknown'}`),
            });

            // The proofSetId from the storage service is what we need to store on-chain.
            if (storage.proofSetId !== undefined) {
                setSynapseProofSetId(storage.proofSetId); // Store the proof set ID
            } else {
                // This case should ideally not happen if upload is successful
                throw new Error("Synapse upload successful but proofSetId was not returned from storage service.");
            }

        } catch (error: unknown) {
            console.error("Synapse content upload failed:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setError(`Synapse content upload failed: ${errorMessage}`);
            setSynapseProofSetId(null); // Clear proofSetId on failure
        } finally {
            setSynapseLoading(false);
            setSynapseProgressMessage('');
        }
    }, [synapseSdk, synapseUploadContent, isOnCalibrationTestnet, isSynapseSetupComplete]); // Dependencies for useCallback

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
            setPactContentFile(file); // Set the File object for Synapse useEffect
            handlePdfUpload(file);
        } else {
            setPactContentFile(null);
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

    // Helper function to execute transaction with retry logic
    const executeTransactionWithRetry = async <T extends { wait(): Promise<unknown>; hash?: string }>(
        method: string,
        args: unknown[], 
        maxRetries = 3
    ): Promise<T> => {
        let lastError: unknown;
        const MAX_RETRIES = maxRetries;
        let attempts = 0;
        
        while (attempts < MAX_RETRIES) {
            attempts++;
            try {
                if (!vaultFactoryContract) {
                    throw new Error("Vault factory contract not available");
                }
                
                // Get the contract method and send the transaction
                const contractMethod = (vaultFactoryContract as Record<string, (...args: unknown[]) => Promise<T>>)[method];
                if (!contractMethod) {
                    throw new Error(`Method ${method} not found on contract`);
                }
                
                setStatusMessage(attempts > 1 ? `Sending transaction (attempt ${attempts}/${MAX_RETRIES})...` : "Sending transaction...");
                const tx = await contractMethod(...args);
                
                return tx; // Success, return the transaction
                
            } catch (error: unknown) {
                lastError = error;
                console.error(`Transaction attempt ${attempts} failed:`, error);
                
                // Check if it's a retryable network error
                const isRetryableError = (
                    (error && typeof error === 'object' && 'code' in error && (
                        (error as { code: string | number }).code === 'UNKNOWN_ERROR' || 
                        (error as { code: string | number }).code === -32603
                    )) ||
                    (error && typeof error === 'object' && 'message' in error && (
                        (error as { message: string }).message?.includes('Internal JSON-RPC error') ||
                        (error as { message: string }).message?.includes('network error') ||
                        (error as { message: string }).message?.includes('timeout') ||
                        (error as { message: string }).message?.includes('could not coalesce error')
                    ))
                );
                
                // If it's the last attempt or not a retryable error, break the loop
                if (attempts >= MAX_RETRIES || !isRetryableError) {
                    break;
                }
                
                // Wait before retrying (exponential backoff: 2s, 4s, 6s)
                const delay = 2000 * attempts;
                setStatusMessage(`Network error detected. Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError; // Throw the last error if all attempts failed
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
            // Pre-submission check for verifiable vaults on Calibration
            if (isOnCalibrationTestnet && useVerifiableStorage) {
                if (!isSynapseSetupComplete) {
                    setError("Please complete the Synapse payment setup before creating a verifiable vault.");
                    setIsCreating(false);
                    return;
                }
                if (synapseProofSetId === null) {
                    setError("Please upload your content to Filecoin via Synapse before creating a verifiable vault.");
                    setIsCreating(false);
                    return;
                }
            }

            // IPFS upload logic
            setStatusMessage("Uploading agreement to IPFS...");
            const ipfsData = vaultType === 'Milestone' 
                ? { beneficiary, tokenAddress, terms, vaultType, pdfCid, useVerifiableStorage, synapseProofSetId, funderCanOverrideVerification }
                : { tokenAddress, terms, vaultType, pdfCid, useVerifiableStorage, synapseProofSetId, funderCanOverrideVerification };
            const jsonFile = new File([JSON.stringify(ipfsData)], "vault-terms.json", { type: "application/json" });
            
            const urlRequest = await fetch("/api/upload");
            const { url: signedUrl } = await urlRequest.json();
            const uploadResult = await pinata.upload.public.file(jsonFile).url(signedUrl);
            const termsCID = uploadResult.cid;
            setStatusMessage(`Agreement stored. Preparing transaction...`);

            const releaseTimestamp = Math.floor(new Date(`${releaseDate}T${releaseTime}`).getTime() / 1000);
            
            let tx;
            if (vaultType === "PrizePool") {
                // Check if using verifiable storage and we have VaultFactoryVerifiable contract
                if (isOnCalibrationTestnet && useVerifiableStorage) {
                    
                    // For verifiable vaults on Filecoin Calibration - assuming VaultFactoryVerifiable contract
                    tx = await executeTransactionWithRetry(
                        "createPrizePoolVault",
                        [
                            tokenAddress, 
                            amountToApprove, 
                            releaseTimestamp, 
                            termsCID,
                            true, // isVerifiable: true
                            synapseProofSetId!, // synapseProofSetId: guaranteed non-null by check above
                            funderCanOverrideVerification // funderCanOverrideVerification
                        ]
                    );
                } else {
                    
                    // For Flow EVM (always non-verifiable) or non-verifiable vaults on Calibration
                    tx = await executeTransactionWithRetry(
                        "createPrizePoolVault",
                        [
                            tokenAddress, 
                            amountToApprove, 
                            releaseTimestamp, 
                            termsCID,
                            false, // isVerifiable: false
                            0,     // synapseProofSetId: 0 (or any default number for a non-verifiable vault)
                            false  // funderCanOverrideVerification: false (as it's not applicable)
                        ]
                    );
                }
            } else {
                if (!ethers.isAddress(beneficiary)) {
                    setError("A valid beneficiary address is required for Milestone vaults.");
                    setIsCreating(false);
                    return;
                }
                const payouts = milestoneAmounts.split(',').map(amt => ethers.parseUnits(amt.trim(), activeChainConfig.primaryCoin.decimals));
                
                // Check if using verifiable storage and we have VaultFactoryVerifiable contract
                if (isOnCalibrationTestnet && useVerifiableStorage) {
                    // For verifiable vaults on Filecoin Calibration - assuming VaultFactoryVerifiable contract
                    tx = await executeTransactionWithRetry(
                        "createMilestoneVault",
                        [
                            beneficiary, 
                            tokenAddress, 
                            payouts, 
                            termsCID,
                            true, // isVerifiable: true
                            synapseProofSetId!, // synapseProofSetId: guaranteed non-null by check above
                            funderCanOverrideVerification // funderCanOverrideVerification
                        ]
                    );
                } else {
                    // For Flow EVM (always non-verifiable) or non-verifiable vaults on Calibration
                    tx = await executeTransactionWithRetry(
                        "createMilestoneVault",
                        [
                            beneficiary, 
                            tokenAddress, 
                            payouts, 
                            termsCID,
                            false, // isVerifiable: false
                            0,     // synapseProofSetId: 0 (or any default number for a non-verifiable vault)
                            false  // funderCanOverrideVerification: false (as it's not applicable)
                        ]
                    );
                }
            }

            await tx.wait();
            setStatusMessage('✅ Vault created successfully! Redirecting...');
            setTimeout(() => router.push('/dashboard/active'), 3000);

        } catch (err: unknown) {
            console.error("Error creating vault:", err);
            
            // Check for specific verifiable storage error
            if (err && typeof err === 'object' && 'data' in err && (err as { data: string }).data === '0x4850d37b') {
                setError("Verifiable storage is not yet configured on this chain. The contract owner needs to set the PDPVerifier address first.");
            } else if (err && typeof err === 'object') {
                // Handle different types of errors more gracefully
                const errorObj = err as { 
                    code?: string | number; 
                    message?: string; 
                    reason?: string; 
                };
                
                // Network/RPC related errors that are often retryable
                if (errorObj.code === 'UNKNOWN_ERROR' || 
                    errorObj.code === -32603 || 
                    errorObj.message?.includes('Internal JSON-RPC error') ||
                    errorObj.message?.includes('network error') ||
                    errorObj.message?.includes('timeout')) {
                    setError("Network error occurred. This is often temporary on testnets. Please try again in a few moments.");
                } 
                // Gas estimation errors
                else if (errorObj.code === 'UNPREDICTABLE_GAS_LIMIT' || 
                         errorObj.message?.includes('gas') ||
                         errorObj.message?.includes('Gas')) {
                    setError("Gas estimation failed. Please check your token balances and try again. If the issue persists, try increasing your gas limit manually.");
                }
                // User rejected transaction
                else if (errorObj.code === 4001 || errorObj.code === 'ACTION_REJECTED') {
                    setError("Transaction was rejected. Please try again and confirm the transaction in your wallet.");
                }
                // Contract execution errors
                else if (errorObj.reason) {
                    setError(`Contract error: ${errorObj.reason}`);
                }
                // Generic error with message
                else if (errorObj.message) {
                    setError(`Transaction failed: ${errorObj.message}. If this is a network error, please try again.`);
                }
                // Fallback
                else {
                    setError("An error occurred creating the vault. If this appears to be a network issue, please try again.");
                }
            } else {
                setError("An error occurred creating the vault. Please try again.");
            }
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

            {/* Conditional section for Synapse Verifiable Storage, only visible on Filecoin Calibration */}
            {isOnCalibrationTestnet && (
                <div className="space-y-4 p-4 border border-muted rounded-md bg-background/50">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                            checked={useVerifiableStorage}
                            onChange={(e) => {
                                setUseVerifiableStorage(e.target.checked);
                                // Reset Synapse-related states if the checkbox is unchecked
                                if (!e.target.checked) {
                                    setIsSynapseSetupComplete(false);
                                    setSynapseProofSetId(null);
                                    setSynapseProgressMessage('');
                                    setFunderCanOverrideVerification(false);
                                }
                            }}
                        />
                        <span className="text-lg font-semibold text-foreground">
                            Use Verifiable Storage (Filecoin via Synapse)
                        </span>
                    </label>

                    {useVerifiableStorage && (
                        <div className="space-y-4 mt-4">
                            <p className="text-sm text-muted-foreground">
                                This option requires your vault content to be verifiably stored on Filecoin via Synapse.
                                Payouts will be conditional on the proof set being &quot;live&quot; unless overridden.
                            </p>

                            {/* Synapse Payment Setup Button */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    type="button"
                                    onClick={handleSynapsePaymentSetup}
                                    disabled={synapseLoading || isSynapseSetupComplete}
                                    className={`${buttonStyles} ${
                                        isSynapseSetupComplete
                                            ? 'bg-green-600 text-white cursor-not-allowed'
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    } ${disabledStyles}`}
                                >
                                    {isSynapseSetupComplete ? 'Synapse Setup Complete' : 'Setup Synapse Payments'}
                                </button>
                                {!isSynapseSetupComplete && (
                                    <button
                                        type="button"
                                        onClick={checkSynapseSetupStatus}
                                        disabled={synapseLoading || !synapseSdk}
                                        className={`${buttonStyles} bg-blue-600 text-white hover:bg-blue-700 ${disabledStyles}`}
                                    >
                                        {synapseLoading ? 'Checking...' : 'Check Setup Status'}
                                    </button>
                                )}
                                {isSynapseSetupComplete && <span className="text-green-500">✅ Synapse payments are configured!</span>}
                            </div>

                            {/* Synapse Content Upload Button */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                                <button
                                    type="button"
                                    onClick={handleSynapseContentUpload}
                                    disabled={synapseLoading || !isSynapseSetupComplete || !synapseUploadContent || synapseProofSetId !== null}
                                    className={`${buttonStyles} ${
                                        synapseProofSetId !== null
                                            ? 'bg-green-600 text-white cursor-not-allowed'
                                            : 'bg-accent text-accent-foreground hover:bg-accent/80'
                                    } ${disabledStyles}`}
                                >
                                    {synapseProofSetId !== null ? 'Content Uploaded to Filecoin' : 'Upload Content to Filecoin'}
                                </button>
                                {synapseProofSetId !== null && (
                                    <span className="text-green-500">
                                        ✅ Proof Set ID: <span className="font-mono bg-muted px-2 py-1 rounded text-sm">{synapseProofSetId}</span>
                                    </span>
                                )}
                                {!synapseUploadContent && isSynapseSetupComplete && (
                                    <span className="text-sm text-muted-foreground">
                                        Please fill in the Terms field or upload a PDF to enable content upload.
                                    </span>
                                )}
                            </div>

                            {synapseLoading && (
                                <p className="text-yellow-500 animate-pulse text-sm">
                                    {synapseProgressMessage || 'Processing Synapse operation...'}
                                </p>
                            )}

                            {/* Status message when setup is incomplete */}
                            {!isSynapseSetupComplete && !synapseLoading && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    If you&apos;ve already completed setup at <a href="https://fs-upload-dapp.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline">fs-upload-dapp.netlify.app</a>, click &quot;Check Setup Status&quot; to verify.
                                </p>
                            )}

                            {/* Funder Override Option (only shown after content is uploaded) */}
                            {synapseProofSetId !== null && (
                                <label className="flex items-center space-x-2 cursor-pointer mt-4">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                                        checked={funderCanOverrideVerification}
                                        onChange={(e) => setFunderCanOverrideVerification(e.target.checked)}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        Allow Funder to Override Verification (Payouts possible even if Filecoin proof is not live)
                                    </span>
                                </label>
                            )}
                        </div>
                    )}
                </div>
            )}

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
           
            <button type="submit" disabled={isCreating || isApproving || (needsApproval && !isApproved) || isUploadingPdf || !hasSufficientBalances || (isOnCalibrationTestnet && useVerifiableStorage && (synapseProofSetId === null || !isSynapseSetupComplete))} className={`${buttonStyles} w-full bg-primary text-primary-foreground ${disabledStyles}`}>
                {isCreating ? 'Creating Vault...' : 'Create Vault'}
            </button>

            {/* Debug: Show why Create Vault button is disabled - Hidden for chains that prefer sleeker UI */}
            {(isCreating || isApproving || (needsApproval && !isApproved) || isUploadingPdf || !hasSufficientBalances || (isOnCalibrationTestnet && useVerifiableStorage && (synapseProofSetId === null || !isSynapseSetupComplete))) && activeChainConfig?.showDetailedErrors && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm font-medium text-yellow-700">Create Vault button is disabled because:</p>
                    <ul className="mt-1 text-sm text-yellow-600">
                        {isCreating && <li>• Vault creation is in progress</li>}
                        {isApproving && <li>• Token approval is in progress</li>}
                        {needsApproval && !isApproved && !isApproving && <li>• Token approval is required but not completed</li>}
                        {isUploadingPdf && <li>• PDF upload is in progress</li>}
                        {!hasSufficientBalances && <li>• Insufficient token balances</li>}
                        {isOnCalibrationTestnet && useVerifiableStorage && synapseProofSetId === null && <li>• Content must be uploaded to Filecoin first {synapseLoading ? '(Content Upload in Progress)' : '(synapseProofSetId is null)'}</li>}
                        {isOnCalibrationTestnet && useVerifiableStorage && !isSynapseSetupComplete && <li>• Synapse setup is not complete</li>}
                    </ul>
                </div>
            )}

            {statusMessage && <p className="text-center text-sm text-green-400">{statusMessage}</p>}
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
        </form>
    );
}