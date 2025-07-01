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

## ✅ Current Status: Phase 2 Complete - MVP Functionally Live
The core functionality of the application is complete and has been tested end-to-end on the Filecoin Calibration testnet.

- **Dual Pact System:** The smart contract supports two distinct use cases: **1-to-many Prize Pools** for hackathons and **1-to-1 Milestone grants** for freelance work.
- **End-to-End Flow:** Users can successfully create a pact, fund it, have the terms stored on IPFS, view all pacts on a homepage, see detailed information on a dedicated page, and distribute funds as the funder.
- **Polished Frontend Foundation:** The application features a custom color palette, typography, and robust state management for all user interactions.

## 🚀 Hackathon Roadmap

### **Next Up: Phase 3 (Days 7-8) - Polish & Expansion**
- [ ] **UI Overhaul:** Refactor the application into a dashboard layout with a dedicated landing page.
- [ ] **Flow EVM Deployment:** Deploy the `VaultFactory` contract to the Flow EVM Testnet.
- [ ] **Multi-Chain Integration:** Implement a network context and UI switcher to allow users to toggle between Filecoin and Flow networks.

### **Finally: Phase 4 (Day 9) - Submission**
- [ ] Record the final demo video showcasing both use cases and multi-chain functionality.
- [ ] Finalize all documentation.
- [ ] Triple-check all submission requirements and submit the project.