# Smart Contracts (`hardhat` package)

This package contains all Solidity smart contracts, tests, and deployment scripts for the **Smart Pacts** project.

## 🛠️ Tech Stack
- **Solidity:** v0.8.24
- **Hardhat:** Development and testing framework
- **Ethers.js:** Blockchain interaction library
- **OpenZeppelin Contracts:** For standard and secure base contracts like `IERC20` and `ReentrancyGuard`.
- **Chai:** Assertion library for tests.

## 📝 Contracts
### `contracts/VaultFactory.sol`
- **Purpose:** The core contract for the project. It acts as a factory for creating and managing secure payment pacts on EVM-compatible chains.
- **Status:** ✅ **COMPLETE, TESTED, and DEPLOYED**
- **Key Features:**
  - **Dual Pact System:** Supports two distinct use cases:
    1.  **Prize Pool:** A 1-to-many pact. A funder deposits a bulk amount that is time-locked. After the lock expires, the funder can distribute the funds to multiple recipients (e.g., hackathon winners).
    2.  **Milestone Grant:** A 1-to-1 pact. A funder deposits funds for a single beneficiary. The funder can then release payments in sequential stages (milestones) at their discretion.
  - **IPFS Integration:** Stores an immutable IPFS CID for the off-chain agreement terms associated with each pact.
  - **Secure & Upfront Funding:** Requires the full pact amount to be deposited upon creation.
  - **Optimized & Secure:** Uses custom errors and OpenZeppelin's `ReentrancyGuard`.

### `contracts/MockToken.sol`
- **Purpose:** A simple ERC20 token used exclusively for local development and testing.
- **Status:** ✅ COMPLETE

## 🧪 Testing
- **Location:** `test/VaultFactory.ts`
- **Status:** ✅ COMPLETE
- **Coverage:** A comprehensive test suite has been developed to validate the full lifecycle of both **Prize Pool** and **Milestone** pacts. Tests cover successful creation, fund distribution, milestone releases, and all critical failure cases and security checks.

## 🚀 Deployment
- **System:** Classic Hardhat Script (`scripts/deploy.ts`)
- **Status:** ✅ COMPLETE
- **Details:** The script deploys the `VaultFactory` contract. It has been successfully deployed to the **Filecoin Calibration Testnet** and is ready for deployment to other EVM-compatible networks like the **Flow EVM Testnet**.

## ⚙️ Workflow Commands
Run these commands from this directory (`b2b_payments/hardhat/`).

- `npm run compile`: Compiles all contracts.
- `npm run test`: Runs the full Hardhat test suite against a local in-memory node.
- `npm run node`: Starts a local Hardhat node on `chainId: 1337`.
- `npm run deploy:localhost`: Deploys the `VaultFactory` contract to the local Hardhat node.
- `npm run deploy:calibration`: Deploys the `VaultFactory` contract to the Filecoin Calibration testnet.