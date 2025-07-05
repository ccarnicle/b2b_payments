
// Import from local copy in lib/abi directory
import VaultFactoryAbi from './abi/VaultFactory.json';

// Export the address from your .env.local file
export const VAULT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS!;

// Export the ABI itself
export const VAULT_FACTORY_ABI = VaultFactoryAbi.abi;