# Smart Contracts (`hardhat` package)

This package contains all Solidity smart contracts, tests, and deployment scripts for the **Smart Vaults** project.

## 🛠️ Tech Stack
- **Solidity:** v0.8.24
- **Hardhat:** Development and testing framework
- **Ethers.js:** Blockchain interaction library
- **OpenZeppelin Contracts:** For standard and secure base contracts like `IERC20` and `ReentrancyGuard`.
- **Chai:** Assertion library for tests.

## 📝 Contracts
### `contracts/VaultFactory.sol`
- **Purpose:** The core contract for the project. It acts as a factory for creating and managing secure B2B payment vaults on the Filecoin Virtual Machine (FVM).
- **Status:** ✅ **COMPLETE, TESTED, and DEPLOYED**
- **Key Features:**
  - **Dual Payout Models:** Supports two types of vaults:
    1.  **Time-Locked:** Funds are released to a beneficiary after a specific timestamp.
    2.  **Milestone-Based:** The funder releases payments to a beneficiary in sequential stages.
  - **IPFS Integration:** Stores a reference (IPFS CID) to the off-chain agreement or terms for each vault.
  - **Secure & Upfront Funding:** Requires the full vault amount to be deposited upon creation, ensuring funds are locked and available.
  - **Custom Errors & Reentrancy Guard:** Gas-efficient and secure.

### `contracts/MockToken.sol`
- **Purpose:** A simple ERC20 token used exclusively for local development and testing.
- **Status:** ✅ COMPLETE

## 🧪 Testing
- **Location:** `test/VaultFactory.ts`
- **Status:** ✅ COMPLETE
- **Coverage:** **14 passing tests** providing comprehensive coverage for all functions, vault types, and security conditions in `VaultFactory.sol`. The suite covers creation, successful fund release, and all failure cases (e.g., wrong user, wrong time, invalid inputs).

## 🚀 Deployment
- **System:** Classic Hardhat Script
- **Script:** `scripts/deploy.ts`
- **Status:** ✅ COMPLETE
- **Details:** The script deploys the `VaultFactory` contract to the specified network (local or testnet) and logs its address to the console. It has been successfully deployed to the **Filecoin Calibration Testnet**.

## ⚙️ Workflow Commands
Run these commands from this directory (`b2b_payments/hardhat/`).

- `npm run compile`: Compiles all contracts.
- `npm run test`: Runs the full Hardhat test suite against a local in-memory node.
- `npm run node`: Starts a local Hardhat node on `chainId: 1337`.
- `npm run deploy:localhost`: Deploys the `VaultFactory` contract to the local Hardhat node.
- `npm run deploy:calibration`: Deploys the `VaultFactory` contract to the Filecoin Calibration testnet.