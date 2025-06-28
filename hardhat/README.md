# Smart Contracts (`hardhat` package)

This package contains all Solidity smart contracts, tests, and deployment scripts for the Escrow Prize Pool project.

## 🛠️ Tech Stack
- **Solidity:** v0.8.28
- **Hardhat:** Development and testing framework
- **Ethers.js:** Blockchain interaction library
- **OpenZeppelin Contracts:** For standard and secure base contracts like `IERC20` and `ERC20`.
- **Chai:** Assertion library for tests.

## 📝 Contracts
### `contracts/EscrowFactory.sol`
- **Purpose:** The core contract for the v0.1 MVP. It acts as a factory for creating and managing multiple prize pool escrows.
- **Status:** ✅ COMPLETE & FULLY TESTED
- **Key Features:**
  - Organizers can create prize pools for any ERC20 token.
  - Pools can have fixed dues or allow variable contributions.
  - Pools can have optional `startTime` and required `endTime` to control the entry period.
  - Organizers can optionally join their own pool upon creation.
  - Secure payout mechanism allows the organizer to distribute the entire prize pool to one or more participants.

### `contracts/MockToken.sol`
- **Purpose:** A simple ERC20 token used exclusively for development and testing.
- **Status:** ✅ COMPLETE

### `contracts/Greeter.sol`
- **Purpose:** A simple contract used for initial end-to-end integration testing.
- **Status:** Deprecated. Can be removed.

## 🧪 Testing
- **Location:** `test/EscrowFactory.ts`
- **Status:** ✅ COMPLETE
- **Coverage:** 11 passing tests providing comprehensive coverage for all functions and security conditions in `EscrowFactory.sol`.

## 🚀 Deployment
- **System:** Classic Hardhat Script
- **Script:** `scripts/deploy.ts`
- **Status:** ✅ COMPLETE
- **Details:** The script deploys both the `MockToken` and `EscrowFactory` contracts to the specified network and logs their addresses to the console.

## ⚙️ Workflow Commands
Run these commands from this directory (`packages/hardhat`).

- `npm run compile`: Compiles all contracts.
- `npm run test`: Runs the full Hardhat test suite.
- `npm run node`: Starts the local Hardhat node on `chainId: 1337`.
- `npm run deploy:localhost`: Deploys the `EscrowFactory` and `MockToken` contracts to the local Hardhat node using the `scripts/deploy.ts` script.