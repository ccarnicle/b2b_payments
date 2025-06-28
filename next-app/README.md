# Frontend (`next-app` package)

This package contains the Next.js frontend for the Escrow Prize Pool project.

## 🛠️ Tech Stack
- **Next.js 14+:** React framework (using App Router)
- **Privy:** For authentication and wallet management (embedded + external)
- **Tailwind CSS v3:** For styling
- **ethers.js v6:** For smart contract interaction
- **TypeScript:** For type safety
- **React Context:** For global state management, integrated with Privy hooks

## ✅ v0.1 Features

The frontend is feature-complete for the v0.1 MVP, providing a full end-to-end user experience for interacting with the escrow prize pool smart contracts.

- **Homepage (`/`):** Displays a grid of all created prize pools by fetching live event data from the `EscrowFactory` contract.
- **Create Pool Page (`/create`):** A dedicated form for creating new prize pools. It implements the two-step `approve` and `createEscrow` transaction flow for depositing dues upon creation.
- **Dynamic Pool Detail Page (`/pool/[id]`):** A dynamic page that serves as the main hub for a single pool. It:
    - Fetches and displays detailed on-chain data for the specific pool.
    - Conditionally renders different forms based on the pool's state and the user's role (organizer vs. participant).
- **Join Pool Form:** A component on the detail page that allows any user to join an open pool. It handles the `approve` and `joinEscrow` flow for both fixed-dues and open-contribution pools.
- **Distribute Winnings Form:** A secure component that is **only visible to the pool's organizer** after the pool's end time has passed. It allows the organizer to specify winner addresses and amounts, validating the data before sending the `distributeWinnings` transaction.
- **Global Web3 Context with Privy:** Authentication and wallet management are now powered by Privy. The global `Web3Context` has been refactored to use Privy's hooks, providing a seamless login experience with both embedded and external wallets and making the user's state (provider, signer, account) easily accessible to all components.

## 📈 Project Status & Roadmap

For the overall project status, high-level goals, and the roadmap for v0.2 and beyond, please see the main **[`PROJECT_PLAN.md`](../../PROJECT_PLAN.md)** file in the root of the monorepo.

## ⚙️ Getting Started

1.  **Navigate to this directory:**
    ```bash
    cd packages/next-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Contract Addresses:**
    Before running the app, you must deploy the smart contracts and add their addresses to the configuration file.
    - First, run the deployment script in the `hardhat` package.
    - Then, open `lib/contracts.ts` and paste the deployed `EscrowFactory` and `MockToken` addresses into the respective constants.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## 🎨 Next Steps (UI Polish)

The core functionality is complete. The immediate next steps are focused on branding and visual refinement.

- [ ] **Update Tailwind Theme:** Customize the color palette in `tailwind.config.ts` and `globals.css` to match a specific brand identity.
- [ ] **Add Logo:** Incorporate a project logo into the `Header` component.