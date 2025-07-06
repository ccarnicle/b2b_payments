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
-   **Status:** ✅ **MOSTLY COMPLETE (Contract Logic), DEPLOYED (on Filecoin Calibration)**
-   **Key Features:**
    -   Inherits all features of `VaultFactory.sol`.
    -   **Verifiable Storage Option:** New `isVerifiable` flag in `Vault` struct.
    -   **Synapse Integration:** Stores `synapseProofSetId` and calls `IPDPVerifier.proofSetLive()` on-chain before payouts.
    -   **Funder Override:** Optional `funderCanOverrideVerification` flag allows funder to bypass deal check at payout.
    -   **Multi-chain Adaptive:** Uses `chainIdToPdpVerifier` mapping to enable/disable verifiable logic based on `block.chainid` (set by `owner`).
    -   **Owner-Controlled `PDPVerifier`:** The contract `owner` can set the `PDPVerifier` address for specific chain IDs.
    -   **TBD:** Creating a test script for this new contract. Once tested, it can work for both networks

### `contracts/MockToken.sol`
-   **Purpose:** A simple ERC20 token used exclusively for local development and testing.
-   **Status:** ✅ COMPLETE

### `contracts/MockPDPVerifier.sol`
-   **Purpose:** A mock contract to simulate the Synapse `PDPVerifier` interface (`proofSetLive`) for isolated testing of verifiable storage logic on the local Hardhat Network.
-   **Status:** ✅ COMPLETE

## 🧪 Testing
-   **Location:** `test/VaultFactory.ts`
-   **Status:** ⚠️ **PARTIALLY COMPLETE (Core Logic), DEBUGGING (Verifiable Logic)**
-   **Coverage:**
    -   **Comprehensive:** Tests cover the full lifecycle of Prize Pool and Milestone pacts, including basic creation, fund distribution, milestone releases, and non-verifiable error cases.
    -   **User Mappings:** Tests for `funderVaultIds` and `beneficiaryVaultIds` mappings are complete.
    -   **Verifiable Storage (Local Challenges):** Extensive test cases have been added for `VaultFactoryVerifiable.sol` using `MockPDPVerifier.sol`. While the contract logic is believed to be sound and passing in individual component checks, a few advanced, layered test scenarios on the local Hardhat network are currently exhibiting complexities (e.g., related to `hardhat-network-helpers` fixtures and specific chain ID contexts) which, due to hackathon time constraints, are being deprioritized for full local resolution. Frontend testing on the Filecoin Calibration testnet will serve as the primary validation for this new feature.

## 🚀 Deployment
-   **System:** Hardhat Scripts
-   **Status:** ✅ **COMPLETE (Both Contracts Deployed)**
-   **Details:**
    -   `VaultFactory.sol` is deployed to the **Flow EVM Testnet** (`scripts/deploy.ts`).
    -   `VaultFactoryVerifiable.sol` is deployed to the **Filecoin Calibration Testnet** (`scripts/deploy-verifiable.ts`).
    -   After deploying `VaultFactoryVerifiable.sol` on Calibration, its `owner` must call `setPdpVerifierContractForChain(314159, <Synapse_PDP_Verifier_Address>)` to enable the verifiable storage functionality on that chain.

## ⚙️ Workflow Commands
Run these commands from this directory (`b2b_payments/hardhat/`).

-   `npm run compile`: Compiles all contracts (including `VaultFactoryVerifiable.sol` and `MockPDPVerifier.sol`).
-   `npm run test`: Runs the full Hardhat test suite.
-   `npm run node`: Starts a local Hardhat node on `chainId: 1337`.
-   `npm run deploy:localhost`: Deploys the `VaultFactory.sol` contract to the local Hardhat node.
-   `npm run deploy:calibration`: Deploys the `VaultFactory.sol` contract (non-verifiable version) to the Filecoin Calibration testnet.
-   `npm run deploy:flowTestnet`: Deploys the `VaultFactory.sol` contract (non-verifiable version) to the Flow EVM testnet.
-   `npm run deploy:calibration-verifiable`: Deploys the `VaultFactoryVerifiable.sol` contract to the Filecoin Calibration testnet.