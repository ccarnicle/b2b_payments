'use client'; // This component now uses hooks, so it must be a client component

import Link from "next/link";
import { useWeb3 } from "@/lib/contexts/Web3Context"; // <-- IMPORT our hook

export default function Header() {
  const { login, logout, account, authenticated } = useWeb3(); // <-- USE our hook

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <header className="border-b border-secondary">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary">
          🏆 PrizePool
        </Link>
        <nav className="flex items-center space-x-4">
          <Link href="/create" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium">
            Create Pool
          </Link>
          
          {authenticated && account ? (
            <div className="flex items-center space-x-2">
              <div className="bg-secondary px-4 py-2 rounded-md text-sm font-mono">
                {truncateAddress(account)}
              </div>
              <button
                onClick={logout}
                className="bg-secondary hover:bg-accent text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="bg-secondary hover:bg-accent text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium"
            >
              Connect Wallet
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}