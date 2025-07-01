# Frontend (`next-app` package)

This package contains the Next.js frontend for the **Smart Pacts** project.

## 🛠️ Tech Stack
- **Next.js 14+:** React framework (using App Router).
- **Privy:** For authentication and wallet management.
- **Pinata:** For decentralized storage of pact agreements on IPFS.
- **Tailwind CSS v3:** For styling.
- **ethers.js v6:** For smart contract interaction.
- **TypeScript:** For type safety.

## ✅ Current Status: MVP Functionality Complete

The frontend is feature-complete for the MVP. The entire user journey—from creating a pact to distributing funds—is fully implemented and tested on the Filecoin Calibration testnet.

- **Pact Creation:** A unified form at `/create` allows users to create and fund both **Prize Pool** and **Milestone** pacts, including the secure upload of terms to IPFS.
- **Pact Browsing:** The homepage (`/`) displays all created pacts by fetching on-chain event data.
- **Pact Detailing:** The dynamic detail page (`/vault/[id]`) shows comprehensive on-chain data and the full agreement terms from IPFS.
- **Fund Distribution:** The UI provides conditional actions, allowing funders to release milestone payments or distribute prize pool funds to multiple recipients after the time lock has expired.

## 📈 Next Steps: Polish & Multi-Chain Support

The next phase is focused on refining the user experience and expanding the project's reach.

- [ ] **UI/Layout Refactor:** Re-architect the UI into a dashboard layout with a dedicated sidebar for navigation.
- [ ] **Create New App Pages:** Build out pages for `/app/active`, `/app/completed`, and a placeholder for `/app/invoicing`.
- [ ] **Multi-Chain Context:** Implement a network context to manage chain-specific details (RPC URLs, contract addresses).
- [ ] **Flow EVM Integration:** Deploy the contract to the Flow EVM testnet and add it to the network context, enabling a network switcher in the UI.

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