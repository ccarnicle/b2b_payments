// next-app/app/dashboard/pact/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ethers, TransactionResponse } from 'ethers'; // Import TransactionResponse
import { useWeb3 } from '@/lib/contexts/Web3Context';
import { DistributePrizePoolForm } from '@/components/DistributePrizePoolForm';

// --- SYNAPSE IMPORTS ---
import { Synapse, CONTRACT_ADDRESSES } from '@filoz/synapse-sdk';
// --- END SYNAPSE IMPORTS ---

// --- VAULTDETAILS INTERFACE ---
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
  termsContent?: { 
    terms?: string; 
    pdfCid?: string; 
    vaultType?: string;
    tokenAddress?: string;
    beneficiary?: string;
    isVerifiable?: boolean; // Ensure these are correctly typed if parsed from IPFS JSON
    synapseProofSetId?: string; // Ensure these are correctly typed if parsed from IPFS JSON
    funderCanOverrideVerification?: boolean; // Ensure these are correctly typed if parsed from IPFS JSON
  };
  // NEW: Fields for Synapse Filecoin verification, directly from contract
  isVerifiable: boolean;
  synapseProofSetId: bigint; // Contract returns uint256 which maps to bigint in ethers v6
  funderCanOverrideVerification: boolean;
}
// --- END VAULTDETAILS INTERFACE ---

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

  // --- USEWEB3 DESTRUCTURING (ensure signer and provider are here) ---
  const { vaultFactoryContract, account, activeChainConfig, signer, provider } = useWeb3();
  // --- END USEWEB3 DESTRUCTURING ---

  // --- STATE DECLARATIONS ---
  const [details, setDetails] = useState<VaultDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  // Synapse integration states
  const [synapseSdk, setSynapseSdk] = useState<Synapse | null>(null);
  const [isProofSetLive, setIsProofSetLive] = useState<boolean | null>(null);
  const [proofSetLiveLoading, setProofSetLiveLoading] = useState(false);
  // This state controls the bypass checkbox for *this* detail page's payouts
  const [funderBypassVerification, setFunderBypassVerification] = useState(false);
  // --- END STATE DECLARATIONS ---

  const isOnCalibrationTestnet = useMemo(() => {
    return activeChainConfig?.chainId === "0x4cb2f"; // Chain ID for Filecoin Calibration
  }, [activeChainConfig]);

  // --- SYNAPSE SDK INITIALIZATION EFFECT ---
  useEffect(() => {
    async function initSynapseSdk() {
      if (isOnCalibrationTestnet && signer && provider) {
        try {
          // Pass only provider for browser/MetaMask usage as per Synapse SDK docs
          const sdk = await Synapse.create({ provider: provider as ethers.BrowserProvider });
          setSynapseSdk(sdk);
        } catch (err) {
          console.error("Failed to initialize Synapse SDK:", err);
          setSynapseSdk(null);
        }
      } else {
        setSynapseSdk(null); // Clear SDK if not on Calibration or if signer/provider are unavailable
      }
    }
    initSynapseSdk();
  }, [isOnCalibrationTestnet, signer, provider]);
  // --- END SYNAPSE SDK INITIALIZATION EFFECT ---

  // --- FETCH VAULT DETAILS ---
  const fetchVaultDetails = useCallback(async () => {
    if (!vaultId || !vaultFactoryContract || !activeChainConfig) return;
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
      
      const tokenDecimals = activeChainConfig.primaryCoin.decimals;
      
      setDetails({
        funder: data.funder,
        beneficiary: data.beneficiary,
        token: data.token,
        vaultType: Number(data.vaultType),
        totalAmount: ethers.formatUnits(data.totalAmount, tokenDecimals),
        amountWithdrawn: ethers.formatUnits(data.amountWithdrawn, tokenDecimals),
        termsCID: data.termsCID,
        finalized: data.finalized,
        releaseTime: Number(data.releaseTime),
        milestonePayouts: data.milestonePayouts.map((p: bigint) => ethers.formatUnits(p, tokenDecimals)),
        milestonesPaid: data.milestonesPaid,
        nextMilestoneToPay: Number(data.nextMilestoneToPay),
        termsContent: termsData,
        // NEW: Populate new fields from contract data
        isVerifiable: data.isVerifiable,
        synapseProofSetId: data.synapseProofSetId,
        funderCanOverrideVerification: data.funderCanOverrideVerification,
      });
    } catch (err) {
      console.error("Failed to fetch pact details:", err);
      setError("Could not fetch pact details.");
    } finally {
      setIsLoading(false);
    }
  }, [vaultId, vaultFactoryContract, activeChainConfig]);
  // --- END FETCH VAULT DETAILS ---

  // --- PROOF SET LIVE STATUS POLLING EFFECT ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined; // Make it possibly undefined

    const checkProofSetLiveStatus = async () => {
      // Ensure details are loaded, it's a verifiable vault, on Calibration, and SDK is initialized
      if (details?.isVerifiable && details.synapseProofSetId !== undefined && isOnCalibrationTestnet && synapseSdk) {
        setProofSetLiveLoading(true);
        try {
          const currentNetwork = synapseSdk.getNetwork() as keyof typeof CONTRACT_ADDRESSES.PDP_VERIFIER;
          const pdpVerifierAddress = CONTRACT_ADDRESSES.PDP_VERIFIER[currentNetwork];

          if (pdpVerifierAddress && pdpVerifierAddress !== ethers.ZeroAddress) {
            // Instantiate PDPVerifier using ethers
            // Use the specific ABI for the `proofSetLive` function
            const pdpVerifierContract = new ethers.Contract(
              pdpVerifierAddress,
              ['function proofSetLive(uint256 proofSetId) public view returns (bool)'],
              provider // Use the provider here for view calls
            );
            
            // Check the status, pass bigint directly
            const isLive = await pdpVerifierContract.proofSetLive(details.synapseProofSetId);
            setIsProofSetLive(isLive);
          } else {
            console.warn("PDPVerifier address not found or is zero for current network. Cannot check proof status.");
            setIsProofSetLive(false); // Treat as not live if verifier isn't configured
          }
        } catch (err) {
          console.error("Error checking proof set live status:", err);
          setIsProofSetLive(false); // Assume not live on error
          // setError("Failed to check Filecoin storage status."); // Uncomment if you want this error to be user-facing
        } finally {
          setProofSetLiveLoading(false);
        }
      } else {
        setIsProofSetLive(null); // Clear status if not verifiable or not on Calibration
        if (intervalId) { // Also clear interval if conditions for checking are no longer met
          clearInterval(intervalId);
          intervalId = undefined;
        }
      }
    };

    // Only set up interval if it's a verifiable vault and SDK is ready
    if (details?.isVerifiable && isOnCalibrationTestnet && synapseSdk) {
      checkProofSetLiveStatus(); // Initial check
      intervalId = setInterval(checkProofSetLiveStatus, 30000); // Poll every 30 seconds
    }

    return () => {
      // Cleanup interval on component unmount or dependencies change
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [details, isOnCalibrationTestnet, synapseSdk, provider]);
  // --- END PROOF SET LIVE STATUS POLLING EFFECT ---

  // Initial fetch on component mount
  useEffect(() => {
    setIsLoading(true);
    fetchVaultDetails();
  }, [fetchVaultDetails]);

  // --- HANDLE RELEASE MILESTONE ---
  const handleReleaseMilestone = async () => {
    // funderBypassVerification is now a top-level state, used directly.
    if (!vaultFactoryContract || !details || !account) return; // Add account check

    setIsActionLoading(true);
    setStatus('Sending transaction...');
    setError(''); // Clear previous errors

    try {
      const tx: TransactionResponse = await vaultFactoryContract.releaseNextMilestone(
        vaultId, 
        funderBypassVerification // Pass the top-level state
      );
      await tx.wait();
      setStatus('✅ Milestone released successfully!');
      fetchVaultDetails(); // Refresh details to update UI
    } catch (err: unknown) {
      console.error(err);
      setError((err as { reason: string }).reason || (err as Error).message || 'Failed to release milestone.');
    } finally {
      setIsActionLoading(false);
    }
  };
  // --- END HANDLE RELEASE MILESTONE ---

  // --- CONDITIONAL RENDERING LOGIC ---
  if (isLoading) return <div className="text-center py-10 text-muted-foreground">Loading Pact Details...</div>;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!details) return <div className="text-center py-10 text-muted-foreground">No pact details found.</div>;

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
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>} {/* Display error near the top */}
      </div>

      {/* --- UPDATED: ACTION BOX --- */}
      {/* Show Prize Pool distribution form for the funder */}
      {canDistributePrizePool && (
          <DistributePrizePoolForm 
              vaultId={vaultId}
              totalAmount={details.totalAmount}
              tokenSymbol={activeChainConfig?.primaryCoin.symbol || ''}
              onDistributeSuccess={fetchVaultDetails}
              // NEW PROPS FOR VERIFIABLE VAULTS
              isVerifiable={details.isVerifiable} 
              synapseProofSetId={details.synapseProofSetId.toString()} // Convert bigint to string for child component
              funderCanOverrideVerification={details.funderCanOverrideVerification}
          />
      )}
      {/* Show Milestone release button for the funder */}
      {canReleaseMilestone && (
          <div className="bg-card p-6 rounded-lg border border-muted space-y-4">
              <h2 className="text-xl font-bold font-display mb-4">Milestone Actions</h2> {/* Added section title */}
              {details.isVerifiable && details.funderCanOverrideVerification && (
                  <div className="flex items-center space-x-2">
                      <input
                          type="checkbox"
                          id="funderBypassMilestone"
                          checked={funderBypassVerification}
                          onChange={(e) => setFunderBypassVerification(e.target.checked)}
                          disabled={isActionLoading}
                          className="w-4 h-4 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <label htmlFor="funderBypassMilestone" className="text-sm text-muted-foreground cursor-pointer">
                          Bypass Filecoin Verification (if proof not live)
                      </label>
                  </div>
              )}
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

      {/* --- NEW SECTION FOR VERIFIABLE STORAGE STATUS --- */}
      {details.isVerifiable && (
          <div className="bg-card p-8 rounded-lg border border-muted space-y-4">
              <h2 className="text-xl font-bold font-display mb-4">Verifiable Storage Status</h2>
              <dl>
                  <DetailItem 
                      label="Verifiable Vault" 
                      value={<span className="font-semibold text-green-500">Yes</span>} 
                  />
                  <DetailItem 
                      label="Synapse Proof Set ID" 
                      value={<span className="font-mono bg-muted px-2 py-1 rounded text-sm">{details.synapseProofSetId.toString()}</span>} 
                  />
                  <DetailItem 
                      label="Funder Can Override Verification" 
                      value={details.funderCanOverrideVerification ? "Yes" : "No"} 
                  />
                  <DetailItem 
                      label="Filecoin Proof Status" 
                      value={
                          proofSetLiveLoading ? (
                              <span className="text-yellow-500 flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Checking live status...
                              </span>
                          ) : (
                              isProofSetLive === true ? (
                                  <span className="font-semibold text-green-500">✅ Live and Verified</span>
                              ) : isProofSetLive === false ? (
                                  <span className="font-semibold text-red-500">❌ Not Live</span>
                              ) : (
                                  <span className="text-muted-foreground">Status unknown (refresh to check)</span>
                              )
                          )
                      } 
                  />
              </dl>
          </div>
      )}
      {/* --- END NEW SECTION --- */}

      {/* Agreement Terms section */}
      <div className="bg-card p-8 rounded-lg border border-muted">
         <h2 className="text-xl font-bold font-display mb-4">Agreement Terms</h2>
         {details.termsContent ? (
            <div className="space-y-4">
              {/* Show PDF download button if available */}
              {details.termsContent.pdfCid && (
                <div className="flex items-center justify-between p-4 bg-background rounded-md border border-muted">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium">Agreement PDF</span>
                  </div>
                  <a 
                    href={`https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${details.termsContent.pdfCid}`}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    <span>Download PDF</span>
                  </a>
                </div>
              )}
              
              {/* Show text terms if available */}
              {details.termsContent.terms && (
                <div>
                  {details.termsContent.pdfCid && (
                    <h3 className="text-lg font-semibold mb-2">Additional Terms</h3>
                  )}
                  <pre className="text-sm whitespace-pre-wrap bg-background p-4 rounded-md">{details.termsContent.terms}</pre>
                </div>
              )}
              
              {/* Show message if no terms or PDF */}
              {!details.termsContent.terms && !details.termsContent.pdfCid && (
                <p className="text-muted-foreground italic">No terms available</p>
              )}
            </div>
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
                            <span>Milestone {index + 1}: {payout} ${activeChainConfig?.primaryCoin.symbol || ''}</span>
                            <span>{details.milestonesPaid![index] ? '✅ Paid' : '⏳ Pending'}</span>
                        </li>
                    ))}
                 </ul>
            </div>
         )}
      </div>

      {/* --- UPDATED: DETAILS SECTION --- */}
      <div className="bg-card p-8 rounded-lg border border-muted">
        <h2 className="text-xl font-bold font-display mb-4">Pact Information</h2>
        <dl>
          <DetailItem label="Funder" value={details.funder} />
          {/* Only show beneficiary for Milestone vaults */}
          {isMilestone && <DetailItem label="Beneficiary" value={details.beneficiary} />}
          <DetailItem label="Total Value" value={`${details.totalAmount} ${activeChainConfig?.primaryCoin.symbol || ''}`} />
          <DetailItem label="Amount Withdrawn" value={`${details.amountWithdrawn} ${activeChainConfig?.primaryCoin.symbol || ''}`} />
          {/* Show Prize Pool as the type */}
          <DetailItem label="Pact Type" value={isPrizePool ? "Prize Pool" : "Milestone-Based"} />
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
    </div>
  );
}