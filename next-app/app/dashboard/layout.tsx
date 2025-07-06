// next-app/app/dashboard/layout.tsx
'use client';

import Sidebar from "@/components/Sidebar";
import { useWeb3 } from "@/lib/contexts/Web3Context";
import { useWallets } from '@privy-io/react-auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { login, authenticated, activeChainConfig, isReady } = useWeb3();
  const { wallets } = useWallets();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="text-center bg-card p-8 rounded-lg border border-muted shadow-sm max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">Welcome to Pact</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to manage your agreements.
          </p>
          <button
            onClick={login}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
          >
            Sign In with Privy
          </button>
        </div>
      </div>
    );
  }

  const isCorrectNetwork = activeChainConfig !== null;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Dashboard Container with white background and rounded borders */}
      <div className="bg-card rounded-lg border border-muted shadow-sm overflow-hidden min-h-[700px]">
        <div className="flex min-h-full">
          {/* Sidebar */}
          <Sidebar />

          {/* Divider */}
          <div className="w-px bg-muted"></div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Page Content - rendered by Next.js */}
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto">
                {isCorrectNetwork ? (
                  children
                ) : (
                  <div className="text-center p-8">
                    <h2 className="text-2xl font-bold mb-4">Network Switch Required</h2>
                    <p className="text-muted-foreground mb-6">
                      Please switch to the Filecoin Calibration or Flow-EVM testnet to continue.
                    </p>
                    <button
                      onClick={async () => {
                        // Flow EVM Testnet chainId
                        const flowEVMChainId = "0x221";
                        if (wallets && wallets.length > 0) {
                          try {
                            await wallets[0].switchChain(parseInt(flowEVMChainId, 16));
                          } catch (error) {
                            console.error("Failed to switch to Flow EVM Testnet:", error);
                          }
                        }
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
                    >
                      Switch Network
                    </button>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}