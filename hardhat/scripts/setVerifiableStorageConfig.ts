// hardhat/scripts/setVerifiableStorageConfig.ts

import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.local" }); // Ensure your .env.local is loaded

// --- FIX START ---
// Import the generated contract type and its factory
// Typechain generates types inside .sol subdirectories
import { VaultFactoryVerifiable } from "../typechain-types/contracts/VaultFactoryVerifiable.sol/VaultFactoryVerifiable";
import { VaultFactoryVerifiable__factory } from "../typechain-types/factories/contracts/VaultFactoryVerifiable.sol/VaultFactoryVerifiable__factory";
// --- FIX END ---

async function main() {
  // Ensure the private key is loaded for the contract owner
  const deployerPrivateKey = process.env.PRIVATE_KEY;
  if (!deployerPrivateKey) {
    throw new Error("PRIVATE_KEY not set in .env.local");
  }

  // Chain ID for Filecoin Calibration Testnet (314159 decimal)
  const calibrationChainId = 314159;
  
  // The address of your deployed VaultFactoryVerifiable contract on Calibration
  const vaultFactoryVerifiableAddressCalibration = process.env.NEXT_PUBLIC_VERIFIABLE_VAULT_FACTORY_ADDRESS_CALIBRATION;
  if (!vaultFactoryVerifiableAddressCalibration) {
    throw new Error("NEXT_PUBLIC_VERIFIABLE_VAULT_FACTORY_ADDRESS_CALIBRATION not set in .env.local");
  }

  // The official Synapse PDPVerifier contract address on Filecoin Calibration Testnet.
  // --- CORRECTED ADDRESS BELOW ---
  const rawPdpVerifierAddressCalibration = "0x5A23b7df87f59A291C26A2A1d684AD03Ce9B68DC";
  // --- END CORRECTED ADDRESS ---

  // --- REINFORCED FIX START ---
  // 1. Convert the address to lowercase first.
  // 2. Then, use ethers.getAddress to apply the EIP-55 checksum.
  const pdpVerifierAddressCalibration = ethers.getAddress(rawPdpVerifierAddressCalibration.toLowerCase());
  // --- REINFORCED FIX END ---


  console.log("Configuring VaultFactoryVerifiable on Filecoin Calibration...");
  console.log(`VaultFactoryVerifiable Address: ${vaultFactoryVerifiableAddressCalibration}`);
  console.log(`Original PDPVerifier Address (as provided): ${rawPdpVerifierAddressCalibration}`);
  console.log(`Checksummed PDPVerifier Address (after ethers.getAddress): ${pdpVerifierAddressCalibration}`); // Log the normalized version
  console.log(`Chain ID: ${calibrationChainId}`);

  // Get signer from Hardhat config (ensure it's configured for 'calibration')
  const [owner] = await ethers.getSigners();
  console.log(`Using owner account: ${owner.address}`);

  // Use the generated factory to connect to the deployed contract with the owner's signer
  const vaultFactory: VaultFactoryVerifiable = VaultFactoryVerifiable__factory.connect(
    vaultFactoryVerifiableAddressCalibration,
    owner
  );

  try {
    // Call the setPdpVerifierContractForChain function - now TypeScript knows it exists!
    const tx = await vaultFactory.setPdpVerifierContractForChain(
      calibrationChainId,
      pdpVerifierAddressCalibration // This is now the checksum-normalized address
    );
    console.log(`Transaction sent: ${tx.hash}`);
    await tx.wait(); // Wait for the transaction to be mined
    console.log("✅ setPdpVerifierContractForChain call successful!");

    // Optional: Verify the setting by reading it back
    const storedPdpVerifierAddress = await vaultFactory.chainIdToPdpVerifier(calibrationChainId);
    console.log(`Verified stored PDPVerifier address: ${storedPdpVerifierAddress}`);

  } catch (error) {
    console.error("❌ Failed to set PDPVerifier contract address:", error);
    // Log the full error object for more detail if needed
    console.error(error); 
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});