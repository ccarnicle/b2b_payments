
// This path is correct and is the best way to get the ABI without manual copying.
import VaultFactoryAbi from '../../hardhat/artifacts/contracts/VaultFactory.sol/VaultFactory.json';

// Export the address from your .env.local file
export const VAULT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS!;

// Export the ABI itself
export const VAULT_FACTORY_ABI = VaultFactoryAbi.abi;