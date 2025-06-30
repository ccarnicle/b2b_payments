# Frontend (`next-app` package)

This package contains the Next.js frontend for the **Smart Vaults** project.

## 🛠️ Tech Stack
- **Next.js 14+:** React framework (using App Router).
- **Privy:** For authentication and wallet management (embedded + external).
- **Pinata:** For decentralized storage of vault agreements on IPFS.
- **Tailwind CSS v3:** For styling.
- **ethers.js v6:** For smart contract interaction.
- **TypeScript:** For type safety.

## ✅ Current Status: Foundation Complete

The frontend foundation is established and ready for integration with the deployed smart contracts. The core setup tasks are complete.

- **Secure IPFS Uploads:** A secure backend API route (`/api/generate-upload-url`) has been built. It uses the modern **Signed URL pattern** to allow the client to safely upload vault agreement files to Pinata without exposing secret keys.
- **Authentication Ready:** Privy is integrated for a seamless login experience, providing access to user wallets and state.
- **Environment Configured:** The application is configured via environment variables to connect to the live `VaultFactory` contract deployed on the Filecoin Calibration testnet.
- **Component Stubbing:** A placeholder `CreateVaultForm.tsx` component has been created, containing the client-side logic for the IPFS upload flow.

## 📈 Project Roadmap

For the overall project status and high-level goals, please see the main **[`README.md`](../README.md)** file in the root of the repository.

## ⚙️ Getting Started

1.  **Navigate to this directory:**
    ```bash
    cd next-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Before running the app, you must create a `.env.local` file in this directory (`next-app/.env.local`). Copy the contents of `.env.example` (if present) or create it from scratch with the following variables:

    ```
    # The App ID from your Privy dashboard
    NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id

    # The JWT from your Pinata API Keys page
    PINATA_JWT=your_pinata_jwt

    # Your Pinata Gateway URL
    NEXT_PUBLIC_GATEWAY_URL=your-gateway-url.mypinata.cloud

    # The address of the VaultFactory contract deployed on the testnet
    NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=the_contract_address_from_day_2
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### 🎨 Branding & Color Palette

The application uses a modern, clean **light theme** designed for clarity and a professional feel. The color system is built into `globals.css` using CSS variables and is fully integrated with Tailwind CSS.

The core palette is based on a warm off-white background, high-contrast dark text, and vibrant action colors.

| Role / Tailwind Class      | Description                                | Hex Code                                                  |
| -------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| `bg-background`            | The main background color of the app.      | `#fef5ef` |
| `text-foreground`          | The default text color.                    | `#0f4c5c` |
| `bg-primary`               | Main buttons and primary interactive elements. | `#0f4c5c` |
| `text-primary-foreground`  | Text used on top of primary elements.      | `#fef5ef` |
| `bg-secondary`             | Secondary buttons or informational highlights. | `#69a2b0` |
| `bg-accent`                | Strong call-to-action buttons (e.g., "Create"). | `#e36414` |
| `bg-card`                  | Background for forms, cards, and containers. | `#ffffff` (Pure White) |
| `border-muted`             | Borders for inputs and dividers.           | `#e0e7f5` (Light Gray) |
| `text-muted-foreground`    | Placeholder text in forms.                 | `#9aa5b5` (Medium Gray) |

## 🎨 Next Steps: Feature Implementation (Days 3-6)

The next phase is to build the UI and connect it to our live smart contract.

- [ ] **Branding & UI Re-skin:** Update the color palette, typography, and layout in `tailwind.config.ts` and `globals.css` to match the "Smart Vaults" brand identity.
- [ ] **Build "Create Vault" Page:**
    -   Flesh out the `CreateVaultForm.tsx` to include fields for both Time-Locked and Milestone vaults.
    -   Connect the form submission to the `createTimeLockedVault` and `createMilestoneVault` functions on the smart contract, using the IPFS CID from the upload step.
- [ ] **Build Homepage:** Create a view that fetches and displays a list of all existing vaults from the blockchain.
- [ ] **Build Vault Detail Page:**
    -   Create a dynamic page at `/vault/[id]`.
    -   Fetch and display detailed on-chain data for a specific vault.
    -   Fetch and display the vault terms from IPFS using the stored CID.
- [ ] **Implement "Release Funds" UI:**
    -   On the detail page, conditionally render a "Release Funds" button based on the user's role and vault status.
    -   Connect the UI to the `releaseTimeLockedFunds` (for beneficiaries) and `releaseNextMilestone` (for funders) contract functions.