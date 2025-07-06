# Smart Contracts (`hardhat` package)

This package contains all Solidity smart contracts, tests, and deployment scripts for the **Smart Pacts** project.

## 🛠️ Tech Stack
-   **Solidity:** v0.8.24 (compiled with optimizer and `viaIR`)
-   **Hardhat:** Development and testing framework
-   **Ethers.js:** Blockchain interaction library
-   **OpenZeppelin Contracts:** For standard and secure base contracts like `IERC20` and `ReentrancyGuard`.
-   **Chai:** Assertion library for tests.
-   **dotenv:** For environment variable management.

## 📝 Contracts

### `contracts/VaultFactory.sol`
-   **Purpose:** The core contract for creating and managing standard payment pacts on EVM-compatible chains.
-   **Status:** ✅ **COMPLETE, TESTED, and DEPLOYED**
-   **Key Features:**
    -   **Dual Pact System:** Supports 1-to-many Prize Pools and 1-to-1 Milestone grants.
    -   **IPFS Integration:** Stores immutable `termsCID` for off-chain agreement terms.
    -   **Secure & Upfront Funding:** Requires full amount deposit upon creation.
    -   **Optimized & Secure:** Uses custom errors and OpenZeppelin's `ReentrancyGuard`.
    -   **User Vault Mappings:** Tracks vaults by `funder` and `beneficiary` on-chain for efficient retrieval.

### `contracts/VaultFactoryVerifiable.sol`
-   **Purpose:** An enhanced version of `VaultFactory` that **requires active Filecoin storage deal verification via Synapse** for payouts on supported networks (e.g., Filecoin Calibration).
-   **Status:** ✅ **COMPLETE (Contract Logic & Frontend Integration), DEPLOYED & CONFIGURED**
-   **Key Features:**
    -   Inherits all features of `VaultFactory.sol`.
    -   **Verifiable Storage Option:** New `isVerifiable` flag in `Vault` struct.
    -   **Synapse Integration:** Stores `synapseProofSetId` and calls `IPDPVerifier.proofSetLive()` on-chain before payouts.
    -   **Funder Override:** Optional `funderCanOverrideVerification` flag allows funder to bypass deal check at payout.
    -   **Multi-chain Adaptive:** Uses `chainIdToPdpVerifier` mapping to enable/disable verifiable logic based on `block.chainid` (set by `owner`).
    -   **Owner-Controlled `PDPVerifier`:** The contract `owner` can set the `PDPVerifier` address for specific chain IDs.
    -   **Gas Optimizations:** Reordered Vault struct elements for better storage packing, reducing gas costs.
    -   **Fully Integrated:** Complete frontend integration with Synapse SDK for verifiable pact creation and real-time verification status.

### `contracts/MockToken.sol`
-   **Purpose:** A simple ERC20 token used exclusively for local development and testing.
-   **Status:** ✅ COMPLETE

### `contracts/MockPDPVerifier.sol`
-   **Purpose:** A mock contract to simulate the Synapse `PDPVerifier` interface (`proofSetLive`) for isolated testing of verifiable storage logic on the local Hardhat Network.
-   **Status:** ✅ COMPLETE

## 🧪 Testing
-   **Location:** `test/VaultFactory.ts`
-   **Status:** ✅ **COMPREHENSIVE (Core Logic), TESTED IN PRODUCTION (Verifiable Logic)**
-   **Coverage:**
    -   **Comprehensive:** Tests cover the full lifecycle of Prize Pool and Milestone pacts, including basic creation, fund distribution, milestone releases, and non-verifiable error cases.
    -   **User Mappings:** Tests for `funderVaultIds` and `beneficiaryVaultIds` mappings are complete.
    -   **Verifiable Storage:** Core verifiable storage functionality has been thoroughly tested on Filecoin Calibration Testnet through frontend integration and real-world usage. Contract logic for storage deal verification, funder override capabilities, and chain-specific PDPVerifier configuration has been validated in production.

## 🚀 Deployment
-   **System:** Hardhat Scripts
-   **Status:** ✅ **COMPLETE (Both Contracts Deployed & Configured)**
-   **Details:**
    -   `VaultFactory.sol` is deployed to the **Flow EVM Testnet** (`scripts/deploy.ts`).
    -   `VaultFactoryVerifiable.sol` is deployed to **both** the **Filecoin Calibration Testnet** and **Flow EVM Testnet** (`scripts/deploy-verifiable.ts`).
    -   **Filecoin Calibration Configuration:** The deployed `VaultFactoryVerifiable.sol` contract on Filecoin Calibration has been configured with the official Synapse PDPVerifier address via the `setPdpVerifierContractForChain(314159, <Synapse_PDP_Verifier_Address>)` owner call, enabling full verifiable storage functionality.
    -   **Multi-Network Support:** The verifiable contract is deployed on both networks but only activates storage verification on Filecoin Calibration where PDPVerifier is configured.

## ⚙️ Workflow Commands
Run these commands from this directory (`b2b_payments/hardhat/`).

-   `npm run compile`: Compiles all contracts (including `VaultFactoryVerifiable.sol` and `MockPDPVerifier.sol`).
-   `npm run test`: Runs the full Hardhat test suite.
-   `npm run node`: Starts a local Hardhat node on `chainId: 1337`.
-   `npm run deploy:localhost`: Deploys the `VaultFactory.sol` contract to the local Hardhat node.
-   `npm run deploy:calibration`: Deploys the `VaultFactory.sol` contract (non-verifiable version) to the Filecoin Calibration testnet.
-   `npm run deploy:flowTestnet`: Deploys the `VaultFactory.sol` contract (non-verifiable version) to the Flow EVM testnet.
-   `npm run deploy:calibration-verifiable`: Deploys the `VaultFactoryVerifiable.sol` contract to the Filecoin Calibration testnet.

## 📋 Next Steps

### **Enhanced Test Suite for VaultFactoryVerifiable.sol**
- [ ] **Comprehensive Unit Tests:** Create a dedicated test suite for `VaultFactoryVerifiable.sol` that covers all verifiable storage scenarios, including:
  - Verifiable vault creation with valid/invalid proof set IDs
  - Storage deal verification during payouts with mock PDPVerifier
  - Funder override functionality testing
  - Chain-specific PDPVerifier configuration and multi-chain behavior
  - Gas optimization validation for the reordered Vault struct
  - Error handling for all verifiable storage edge cases
- [ ] **Local Testing Infrastructure:** Enhance the existing `MockPDPVerifier.sol` and test fixtures to support comprehensive isolated testing of verifiable storage logic on the local Hardhat network.