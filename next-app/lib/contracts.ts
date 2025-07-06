// next-app/lib/contracts.ts

// Import the ABI for the VaultFactoryVerifiable contract.
// This assumes you have copied the ABI for VaultFactoryVerifiable.sol to './abi/VaultFactoryVerifiable.json'.
import VaultFactoryVerifiableAbi from './abi/VaultFactoryVerifiable.json';

// Export the ABI for the verifiable contract. This ABI will now be used consistently across all chains.
export const VAULT_FACTORY_ABI = VaultFactoryVerifiableAbi.abi;

// The VAULT_FACTORY_ADDRESS export is no longer directly used in Web3Context
// as contract addresses are now managed per-chain within the SUPPORTED_CHAINS array.
// You can remove or comment it out if it's not used elsewhere in your application.
// export const VAULT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS!;