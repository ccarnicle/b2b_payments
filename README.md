# Pact: Decentralized Payments Layer for the Creator Economy

**Programmable payment vaults that turn payment friction into creative flow.**

## 🎯 The Problem

As builders and creators, we've all felt the pain of broken payment systems - endless invoice chasing, vague promises, and overdue money. At this moment, thousands of creators, freelancers, and emerging DeSci projects are awaiting payments, struggling to collaborate in an increasingly global economy.

## 💡 The Solution

**Pact** is a decentralized coordination layer that solves this through smart payment vaults - programmable agreements that lock tokens (primarily USDFC) and release funds based on milestones, approvals, or time-based triggers. It's like "Upwork meets QuickBooks," reimagined for the onchain world.

Our dual-chain architecture delivers both speed and security:
- **Flow EVM** for fast, user-friendly transactions - positioning it well for mainstream creator adoption
- **Filecoin Calibration** for high-stakes agreements requiring durable proof and verifiable integrity

## 🚀 Live Demo

**[Live Demo](https://www.youtube.com/watch?v=yg_1n4yHOx4)**

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS, ethers.js
- **Smart Contracts:** Solidity, Hardhat
- **Blockchain:** Filecoin Calibration & Flow EVM Testnet
- **Tokens:** USDFC (Filecoin) & WFLOW (Flow)
- **Storage:** IPFS via Pinata, Filecoin via Synapse SDK
- **Authentication:** Privy (walletless UX)

## 🏆 Bounty Integrations

### Main Track: Decentralized Economies, Governance & Science
Pact unlocks coordination at the speed of the internet by replacing slow grants and siloed institutions with programmable payment vaults, creating economic engines that reward open collaboration.

### Filecoin Foundation
Deep FVM integration using the **Synapse SDK** to verify pact terms and proof set liveness before funds are released. Our `VaultFactoryVerifiable.sol` contract checks Filecoin storage deal verification, combining automation with trust for high-stakes agreements.

### Secured Finance
**USDFC** serves as the core stablecoin powering all escrow logic, creating verifiable, trustless payment flows. Every pact operates on USDFC, forming the financial primitive of our trustless escrow layer.

### Flow Blockchain
Seamless **Flow EVM** integration showcasing the low-friction, fast UX necessary for real-world adoption. Flow's speed and user-friendly experience make Pact accessible to mainstream creators while maintaining blockchain security.

## 🔧 Features

- **Dual Pact System:** Prize pools for hackathons and milestone grants for freelance work
- **Multi-Chain Support:** Seamless operation on both Filecoin Calibration and Flow EVM testnets
- **Verifiable Storage:** Optional Filecoin storage deal verification for critical agreements
- **Walletless UX:** Privy integration for frictionless creator onboarding
- **IPFS Integration:** Secure document storage with Pinata signed URLs
- **Dashboard Interface:** Comprehensive pact management with wallet authentication

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/b2b_payments.git
   cd b2b_payments
   ```

2. **Install smart contract dependencies:**
   ```bash
   cd hardhat
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../next-app
   npm install
   ```

4. **Set up environment variables:**
   ```bash
   # In next-app directory
   cp .env.example .env.local
   # Add your Pinata API keys and other required variables
   ```

5. **Compile and deploy contracts** (optional, contracts are already deployed):
   ```bash
   cd ../hardhat
   npm run compile
   npm run deploy:calibration  # For Filecoin Calibration
   npm run deploy:flow        # For Flow EVM
   ```

6. **Start the development server:**
   ```bash
   cd ../next-app
   npm run dev
   ```

7. **Open your browser:**
   Navigate to `http://localhost:3000`

### Using the Application

1. **Connect your wallet** or create a new one via Privy
2. **Switch to a supported network** (Filecoin Calibration or Flow EVM)
3. **Create a pact** by defining terms, funding amount, and uploading documents
4. **Fund the pact** with USDFC or WFLOW tokens
5. **Manage pacts** through the dashboard interface
6. **Distribute funds** when milestones are met

## 📁 Project Structure

```text
b2b_payments/
├── hardhat/                    # Smart contracts
│   ├── contracts/
│   │   ├── VaultFactory.sol           # Standard pact factory
│   │   └── VaultFactoryVerifiable.sol # Filecoin-verified factory
│   └── scripts/deploy.ts
│
└── next-app/                   # Frontend application
    ├── app/
    │   ├── dashboard/          # Authenticated dashboard
    │   └── api/upload/         # Secure IPFS upload endpoint
    ├── components/
    │   └── CreateVaultForm.tsx # Core pact creation logic
    └── lib/
        ├── abi/                # Contract ABIs
        └── contracts.ts        # Contract addresses
```

## 🎯 Vision

Pact isn't just solving payments - it's creating economic infrastructure for open collaboration. By replacing opaque, manual workflows with transparent, programmable agreements, Pact directly addresses the goals of decentralized economies: programmable treasuries, real-time reputation systems, and tooling that rewards contribution.

This is a part of the **Fresh Code Track**, built during and inspired by the **PL_Genesis Hackathon**.

---

*Built with ❤️ for creators, by creators*