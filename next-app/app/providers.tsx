'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        // Create embedded wallets for users who don't have a wallet
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        appearance: {
          theme: 'dark', // Or 'light' if you prefer for consistency with your app's light theme
          accentColor: '#0f4c5c', // Use your app's primary color as Privy's accent
          logo: '/smart_pacts_logo_landscape.png', // Updated to your new landscape logo
        },
        // NEW: Configure supported chains for network detection and switching
        supportedChains: [
          {
            id: 314159, // Filecoin Calibration Testnet (decimal)
            rpcUrls: {
              default: { http: ['https://api.calibration.node.glif.io/rpc/v1'] },
            },
            name: 'Filecoin Calibration Testnet',
            nativeCurrency: {
              name: 'tFIL',
              symbol: 'tFIL',
              decimals: 18,
            },
            blockExplorers: {
              default: {
                name: 'Filfox',
                url: 'https://calibration.filfox.info/en',
              },
            },
          },
          {
            id: 545, // Flow EVM Testnet (decimal)
            rpcUrls: {
              default: { http: ['https://testnet.evm.nodes.onflow.org'] },
            },
            name: 'Flow EVM Testnet',
            nativeCurrency: {
              name: 'FLOW',
              symbol: 'FLOW',
              decimals: 18,
            },
            blockExplorers: {
              default: {
                name: 'Flowscan',
                url: 'https://evm-testnet.flowscan.io',
              },
            },
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}