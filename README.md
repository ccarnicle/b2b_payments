# Smart Vaults: A B2B Payments & Escrow Solution

This project is a B2B payments and escrow platform built for the PL_Genesis Hackathon. It is designed to streamline payments for independent creators, freelancers, and grantees.

## 🎯 High-Level Goal

For independent creators, freelancers, and grantees, getting paid is often tedious, uncertain, and slow. Most B2B payments and grant workflows still rely on manual processes, leading to delays and disputes.

Our solution is **Smart Escrow Vaults** — a modular system for milestone-based payments. Organizations can deploy a vault, fund it, and define deliverables stored on Filecoin/IPFS. Payouts are released trustlessly once milestones are met, creating a fast, transparent, and programmable alternative to traditional grant and invoice-based work.

## 🛠️ Core Tech Stack

-   **Frontend:** Next.js (App Router), Tailwind CSS, ethers.js
-   **Smart Contracts:** Solidity, Hardhat
-   **Blockchain:** Filecoin Calibration & Flow EVM Testnet
-   **Token:** USDFC (Filecoin) & WFLOW (Flow)
-   **Storage:** IPFS via Pinata (using the Signed URL pattern)
-   **Verifiable Storage:** Synapse SDK for Filecoin storage deal verification
-   **Authentication:** Privy (for walletless UX)

## 📂 Repository Structure

This repository contains two main packages. It is **not** a monorepo, but rather two independent projects co-located for simplicity.

-   **`hardhat/`**: Contains all Solidity smart contracts, tests, and deployment scripts.
-   **`next-app/`**: Contains the Next.js frontend application.

## 📁 Project File Structure

```text
b2b_payments/
├── hardhat/
│   ├── contracts/
│   │   └── VaultFactory.sol
│   ├── scripts/
│   │   └── deploy.ts
│   ├── test/
│   │   └── VaultFactory.ts
│   ├── hardhat.config.ts    # Configured for FVM Calibration & Flow Testnet
│   └── package.json
│
└── next-app/
    ├── app/
    │   ├── api/
    │   │   └── upload/
    │   │       └── route.ts         # Secure API route for Pinata signed URLs
    │   ├── dashboard/
    │   │   ├── active/
    │   │   │   └── page.tsx         # Active pacts dashboard
    │   ├── create/
    │   │   │   └── page.tsx         # Create new pact
    │   ├── pact/
    │   │   └── [id]/
    │   │       └── page.tsx     # Pact detail page
    │   └── page.tsx                 # Homepage
    ├── components/
    │   └── CreateVaultForm.tsx     # Component with IPFS upload logic
    ├── lib/
    │   ├── abi/
    │   │   └── VaultFactory.json   # Contract ABI (copied from hardhat/artifacts)
    │   └── contracts.ts            # Contract imports and addresses
    ├── scripts/
    │   └── update-artifacts.sh     # Script to copy artifacts from hardhat
    ├── utils/
    │   └── pinata.ts               # Server-only Pinata SDK config
    └── package.json
```

## ✅ Current Status: Phase 2 Complete - Verifiable Storage & Multi-Chain MVP Live
The core functionality of the application is feature-complete and has been tested end-to-end on both the **Filecoin Calibration** and **Flow EVM** testnets.

- **Dual Pact System:** The smart contract supports two distinct use cases: **1-to-many Prize Pools** for hackathons and **1-to-1 Milestone grants** for freelance work.
- **End-to-End Flow:** Users can successfully create a pact, fund it, have the terms stored on IPFS, view all pacts on a homepage, see detailed information on a dedicated page, and distribute funds as the funder.
- **Multi-Chain Support:** The application now seamlessly supports both the **Filecoin Calibration** and **Flow EVM** testnets. The UI is chain-aware, dynamically updating token symbols (USDFC/WFLOW), decimals, and contract addresses based on the connected network.
- **Verifiable Storage Integration:** Successfully integrated Synapse SDK for Filecoin storage deal verification. On Filecoin Calibration, users can create verifiable pacts that require active storage deals for payouts, with optional funder override capabilities.
- **Enhanced Contract Architecture:** Deployed `VaultFactoryVerifiable.sol` with conditional verification logic, gas-optimized storage packing, and chain-specific PDPVerifier configuration.
- **Polished Frontend Foundation:** The application features a custom color palette, typography, and robust state management for all user interactions.
- **Dashboard & Authentication:** The application has been refactored into a secure dashboard layout. All sensitive pages now require wallet authentication and enforce connection to a supported blockchain network.
- **Deployment Ready:** The application is configured for Vercel deployment with contract artifacts properly copied to the `next-app/lib/abi/` directory to resolve cross-directory import issues.

## 🛠️ Development & Deployment Workflow

### Contract Artifacts Management

The frontend imports contract ABIs from `next-app/lib/abi/` rather than directly from `hardhat/artifacts/`. This approach solves Vercel deployment issues where the deployment root (`next-app/`) cannot access files outside its directory.

**After making changes to smart contracts:**

1. **Compile contracts** (from `hardhat/` directory):
   ```bash
   npm run compile
   ```

2. **Update frontend artifacts** (from `next-app/` directory):
   ```bash
   ./scripts/update-artifacts.sh
   ```

The `update-artifacts.sh` script automatically copies the latest contract artifacts from `hardhat/artifacts/` to `next-app/lib/abi/`.

### Vercel Deployment

The application is configured for Vercel deployment with `next-app/` as the root directory. The contract artifacts are self-contained within the Next.js application, eliminating cross-directory import issues.

## 🚀 Hackathon Roadmap

### **Phase 4 (Day 9) - Submission**
- [ ] Record the final demo video showcasing both use cases and multi-chain functionality.
- [ ] Finalize all documentation.
- [ ] Triple-check all submission requirements and submit the project.