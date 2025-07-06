// b2b_payments/hardhat/scripts/deploy-verifiable.ts
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying VaultFactoryVerifiable contract...");

  // Deploy VaultFactoryVerifiable
  // Ensure your contract is compiled before running this script
  const VaultFactoryVerifiable = await ethers.deployContract("VaultFactoryVerifiable");
  await VaultFactoryVerifiable.waitForDeployment();
  console.log(`VaultFactoryVerifiable deployed to: ${VaultFactoryVerifiable.target}`);

  console.log("\nDeployment of Verifiable contract complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});