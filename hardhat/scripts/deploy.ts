import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  // Deploy VaultFactory
  const VaultFactory = await ethers.deployContract("VaultFactory");
  await VaultFactory.waitForDeployment();
  console.log(`VaultFactory deployed to: ${VaultFactory.target}`);

  console.log("\nDeployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});