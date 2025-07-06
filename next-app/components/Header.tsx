'use client'; // This component now uses hooks, so it must be a client component

import { useState, useRef, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useWeb3 } from "@/lib/contexts/Web3Context"; // <-- IMPORT our hook
import NetworkSwitcher from '@/components/NetworkSwitcher';

// A good practice is to define a component for the logo
const Logo = () => (
  <Link href="/" className="flex items-center pr-2 sm:pr-0">
    <Image
      src="/smart_pacts_logo_landscape.png"
      alt="Pact Landscape Logo"
      width={200}
      height={100}
    />
  </Link>
);

const ChevronDown = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );

export default function Header() {
  const { login, logout, account, authenticated } = useWeb3(); // <-- USE our hook
  const pathname = usePathname();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  const isOnDashboard = pathname.startsWith('/dashboard');

  const toggleProfileDropdown = () => setShowProfileDropdown(!showProfileDropdown);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const truncateAddress = (address: string, isSmallScreen: boolean = false) => {
    if (isSmallScreen) {
      return `${address.slice(0, 4)}..${address.slice(-2)}`;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <header className="bg-card">
      <div className="container mx-auto px-4 py-1 flex justify-between items-center">
        <Logo />
        <nav className="flex items-center space-x-2">
          <Link 
            href={isOnDashboard ? "/" : "/dashboard/create"} 
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-md text-xs md:text-sm font-medium"
          >
            {isOnDashboard ? "Home" : (
              <>
                <span className="sm:hidden">Launch</span>
                <span className="hidden sm:inline">Launch App</span>
              </>
            )}
          </Link>
          
          {authenticated && account ? (
            <>
              <NetworkSwitcher />
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={toggleProfileDropdown}
                  className="bg-secondary hover:bg-secondary/50 text-foreground px-2 md:px-3 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-mono flex items-center gap-1 md:gap-2 transition-colors"
                >
                  <span className="md:hidden">{truncateAddress(account, true)}</span>
                  <span className="hidden md:inline">{truncateAddress(account)}</span>
                  <ChevronDown />
                </button>
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-muted rounded-md shadow-lg z-20">
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary/50 rounded-md"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
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