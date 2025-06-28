import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 1337, // This forces the Hardhat Network to use a specific chainId

    },
    calibration: {
      url: "https://api.calibration.node.glif.io/rpc/v1", // Public RPC endpoint
      chainId: 314159,
      accounts: [process.env.PRIVATE_KEY!], // Reads private key from .env file
    },
    // you might add other networks like 'sepolia' here later
  },
};

export default config;