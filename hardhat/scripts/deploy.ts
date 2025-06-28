import { ethers } from "hardhat";

async function main() {
  console.log("Deploying contracts...");

  // Deploy MockToken
  const mockToken = await ethers.deployContract("MockToken");
  await mockToken.waitForDeployment();
  console.log(`MockToken deployed to: ${mockToken.target}`);

  // Deploy EscrowFactory
  const escrowFactory = await ethers.deployContract("EscrowFactory");
  await escrowFactory.waitForDeployment();
  console.log(`EscrowFactory deployed to: ${escrowFactory.target}`);

  console.log("\nDeployment complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});