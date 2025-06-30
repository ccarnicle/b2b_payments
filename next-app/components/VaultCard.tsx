import Link from 'next/link';
import { ethers } from 'ethers';

// This is the same interface from the homepage
interface Vault {
    id: string;
    funder: string;
    beneficiary: string;
    vaultType: number;
    totalAmount: string;
}

// A helper function to format addresses nicely
const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export function VaultCard({ vault }: { vault: Vault }) {
    const vaultTypeString = vault.vaultType === 0 ? "Time-Locked" : "Milestone";
    const formattedAmount = ethers.formatUnits(vault.totalAmount, 6); // Assuming 6 decimals for USDFC

    return (
        <div className="bg-card p-6 rounded-lg border border-muted flex flex-col justify-between shadow-md hover:shadow-lg transition-shadow">
            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-display text-xl font-bold">Vault #{vault.id}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${vault.vaultType === 0 ? 'bg-secondary/20 text-secondary-foreground' : 'bg-primary/20 text-primary-foreground'}`}>
                        {vaultTypeString}
                    </span>
                </div>
                <p className="text-4xl font-bold my-4">{formattedAmount} <span className="text-2xl text-muted-foreground">USDFC</span></p>
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Funder:</strong> {formatAddress(vault.funder)}</p>
                    <p><strong>Beneficiary:</strong> {formatAddress(vault.beneficiary)}</p>
                </div>
            </div>
            <Link href={`/vault/${vault.id}`} className="mt-6 block text-center w-full bg-primary text-primary-foreground font-bold py-2 rounded-md hover:bg-primary/90">
                View Details
            </Link>
        </div>
    );
} 