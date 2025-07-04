// next-app/components/VaultCard.tsx
import Link from 'next/link';
import { ethers } from 'ethers';

interface Vault {
    id: string;
    funder: string;
    beneficiary: string;
    vaultType: number; // This will now correctly be a number
    totalAmount: bigint | string;
    releaseTime?: bigint; // Add releaseTime for Prize Pool vaults
}

interface VaultCardProps {
    vault: Vault;
    tokenSymbol: string;
    tokenDecimals: number;
}

const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

const formatUnlockDate = (releaseTime: bigint) => {
    const date = new Date(Number(releaseTime) * 1000);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
};

export function VaultCard({ vault, tokenSymbol, tokenDecimals }: VaultCardProps) {
    // --- UPDATED LOGIC ---
    const isPrizePool = vault.vaultType === 0;
    const vaultTypeString = isPrizePool ? "Prize Pool" : "Milestone";
    const formattedAmount = vault.totalAmount ? ethers.formatUnits(vault.totalAmount, tokenDecimals) : "0";

    return (
        <div className="bg-card p-5 md:p-6 lg:p-7 rounded-lg border border-muted flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow min-h-[220px] md:min-h-[240px] max-w-md mx-auto w-full">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-display text-xl md:text-2xl font-bold">Pact #{vault.id}</h3>
                    {/* UPDATED: Simplified the class name logic */}
                    <span className={`px-3 py-1 text-xs md:text-sm font-bold rounded-full whitespace-nowrap ${isPrizePool ? 'bg-secondary/20 text-secondary-foreground' : 'bg-primary/20 text-primary-foreground'}`}>
                        {vaultTypeString}
                    </span>
                </div>
                <p className="text-3xl md:text-4xl lg:text-5xl font-bold my-4 md:my-5">{formattedAmount} <span className="text-xl md:text-2xl lg:text-3xl text-muted-foreground">{tokenSymbol}</span></p>
                <div className="space-y-2 text-sm md:text-base text-muted-foreground">
                    <p><strong>Funder:</strong> {formatAddress(vault.funder)}</p>
                    {/* Logic for beneficiary is already correct, showing only for non-prize-pools */}
                    {!isPrizePool && vault.beneficiary !== ethers.ZeroAddress && (
                         <p><strong>Beneficiary:</strong> {formatAddress(vault.beneficiary)}</p>
                    )}
                    {/* Show unlock date for Prize Pool vaults */}
                    {isPrizePool && vault.releaseTime && (
                        <p><strong>Unlocks:</strong> {formatUnlockDate(vault.releaseTime)}</p>
                    )}
                </div>
            </div>
            <Link href={`/dashboard/pact/${vault.id}`} className="mt-5 md:mt-6 block text-center w-full bg-accent text-accent-foreground font-bold py-3 md:py-4 text-base md:text-lg rounded-md hover:bg-accent/90 transition-colors">
                View Details
            </Link>
        </div>
    );
}