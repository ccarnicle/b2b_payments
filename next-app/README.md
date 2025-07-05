# Frontend (`next-app` package)

This package contains the Next.js frontend for the **Pact** project.

## 🛠️ Tech Stack
- **Next.js 14+:** React framework (using App Router).
- **Privy:** For authentication and wallet management.
- **Pinata:** For decentralized storage of pact agreements on IPFS.
- **Tailwind CSS v3:** For styling.
- **ethers.js v6:** For smart contract interaction.
- **TypeScript:** For type safety.

## ✅ Current Status: Multi-Chain MVP Complete

The frontend is feature-complete for the MVP. The entire user journey—from creating a pact to distributing funds—is fully implemented and tested on both the **Filecoin Calibration** and **Flow EVM** testnets.

- **Pact Creation:** A unified form at `/dashboard/create` allows users to create and fund both **Prize Pool** and **Milestone** pacts, including the secure upload of terms to IPFS.
- **Pact Browsing:** The homepage (`/`) displays all created pacts by fetching on-chain event data.
- **Pact Detailing:** The dynamic detail page (`/dashboard/pact/[id]`) shows comprehensive on-chain data and the full agreement terms from IPFS.
- **Fund Distribution:** The UI provides conditional actions, allowing funders to release milestone payments or distribute prize pool funds to multiple recipients after the time lock has expired.
- **Chain-Aware UI:** The entire application is now multi-chain aware. The `Web3Context` provides network-specific details (contract addresses, token symbols, decimals), and all components—from the creation form to the pact cards and detail pages—dynamically update to show the correct information for the connected network.
- **Dashboard Layout:** The application has been migrated to a robust dashboard structure. A persistent sidebar provides clear navigation, and a global layout enforces user authentication and connection to a supported network before rendering any sensitive content.

## 📈 Next Steps: Final Polish & Submission Prep

With the core multi-chain functionality complete, the next steps are focused on preparing for submission.

- [x] **UI/Layout Refactor:** Re-architect the UI into a dashboard layout with a dedicated sidebar for navigation.
- [x] **Create New App Pages:** Build out pages for `/dashboard/active`, `/dashboard/completed`, and a placeholder for `/dashboard/invoices`.
- [x] **Multi-Chain Integration:** Implemented a robust `Web3Context` to manage chain-specific details (RPC URLs, contract addresses, token info) and integrated it across the entire application. The UI now fully supports both Filecoin Calibration and Flow EVM testnets.
- [ ] **Finalize Documentation & Record Demo:** Prepare all written materials and record the final demo video.

### 🔮 Future Enhancements
-   **Multi-Token Support:** Evolve the `Web3Context` to support creating pacts with multiple ERC20 tokens on a single network. This would involve changing the `primaryCoin` configuration to a `supportedTokens` dictionary and adding a token selector dropdown to the creation form, allowing users to choose from a list of supported tokens (e.g., USDFC, DAI, etc.) for their pact.

### 🎨 Branding & Color Palette
The application uses a modern, clean **light theme**. The color system is built into `globals.css` using CSS variables and is fully integrated with Tailwind CSS.

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