// Using .ts file for constants to get full TypeScript support
import EscrowFactoryAbi from '@escrow-monorepo/hardhat/artifacts/contracts/EscrowFactory.sol/EscrowFactory.json';

import MockTokenAbi from '@escrow-monorepo/hardhat/artifacts/contracts/MockToken.sol/MockToken.json'; //used for testing

// Paste the deployed contract address here
export const ESCROW_FACTORY_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
export const MOCK_TOKEN_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; 

export const ESCROW_FACTORY_ABI = EscrowFactoryAbi.abi;
export const MOCK_TOKEN_ABI = MockTokenAbi.abi; //used for testing