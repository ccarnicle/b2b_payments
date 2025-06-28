import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 1337, // This forces the Hardhat Network to use a specific chainId

    },
    // you might add other networks like 'sepolia' here later
  },
};

export default config;