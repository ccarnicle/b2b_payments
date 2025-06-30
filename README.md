# Smart Vaults: A B2B Payments & Escrow Solution

This project is a B2B payments and escrow platform built for the PL_Genesis Hackathon. It is designed to streamline payments for independent creators, freelancers, and grantees.

## 🎯 High-Level Goal

For independent creators, freelancers, and grantees, getting paid is often tedious, uncertain, and slow. Most B2B payments and grant workflows still rely on manual processes, leading to delays and disputes.

Our solution is **Smart Escrow Vaults** — a modular system for milestone-based payments. Organizations can deploy a vault, fund it with USDFC, and define deliverables stored on Filecoin. Payouts are released trustlessly once milestones are met, creating a fast, transparent, and programmable alternative to traditional grant and invoice-based work.

## 🛠️ Core Tech Stack

-   **Frontend:** Next.js (App Router), Tailwind CSS, ethers.js
-   **Smart Contracts:** Solidity, Hardhat
-   **Blockchain:** Filecoin Virtual Machine (FVM) - Calibration Testnet
-   **Token:** USDFC (a FIL-backed stablecoin)
-   **Storage:** IPFS via Pinata (using the Signed URL pattern)
-   **Authentication:** Privy (for walletless UX)

## 📂 Repository Structure

This repository contains two main packages. It is **not** a monorepo, but rather two independent projects co-located for simplicity.

-   **`hardhat/`**: Contains all Solidity smart contracts, tests, and deployment scripts for the FVM.
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
│   ├── hardhat.config.ts    # Configured for FVM Calibration Testnet
│   └── package.json
│
└── next-app/
    ├── app/
    │   ├── api/
    │   │   └── generate-upload-url/
    │   │       └── route.ts         # Secure API route for Pinata signed URLs
    │   ├── create/
    │   ├── vault/
    │   │   └── [id]/
    │   └── page.tsx                 # Homepage
    ├── components/
    │   └── CreateVaultForm.tsx     # Component with IPFS upload logic
    ├── utils/
    │   └── pinata.ts               # Server-only Pinata SDK config
    └── package.json
```

## ✅ Current Status: Phase 1 Complete - Smart Contract Live!

The backend foundation of the project is complete, tested, and live on the testnet.

-   **✅ Smart Contract Refactored & Complete:** The new `VaultFactory.sol` contract has been written. It supports two distinct payout models: `TimeLocked` vaults that unlock at a specific time, and `Milestone` vaults where the funder can release payments sequentially.
-   **✅ Comprehensive Test Suite:** A full test suite (`VaultFactory.ts`) with **14 passing tests** has been developed, ensuring all logic for creating vaults, handling funds, and processing payouts is secure and correct.
-   **✅ Deployed to Filecoin Calibration Testnet:** The `VaultFactory` contract is **live on the Filecoin Calibration testnet**. The frontend environment has been configured with the contract's address, ready for integration.

## 🚀 Hackathon Roadmap

### **Next Up: Days 3-6 - Frontend Development**
-   Re-skin the UI to match the "Smart Vaults" branding.
-   Integrate the `CreateVaultForm` to interact with the new `createTimeLockedVault` and `createMilestoneVault` functions on our live smart contract.
-   Build the Vault Detail page to display on-chain data and the associated milestone agreement from IPFS.
-   Implement the frontend logic for the `releaseTimeLockedFunds` (for the beneficiary) and `releaseNextMilestone` (for the funder) functions.

### **Later: Days 7-9 - Submission Prep**
-   Record the demo video.
-   Finalize the project summary and documentation.
-   Deploy the live application to Vercel/Netlify.
-   Submit!