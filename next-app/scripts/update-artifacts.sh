#!/bin/bash

# Script to copy contract artifacts from hardhat to next-app
# Run this after compiling contracts with: npm run compile (in hardhat directory)

echo "Copying contract artifacts from hardhat to next-app..."

# Copy VaultFactory artifact
cp ../hardhat/artifacts/contracts/VaultFactory.sol/VaultFactory.json ./lib/abi/
cp ../hardhat/artifacts/contracts/VaultFactoryVerifiable.sol/VaultFactoryVerifiable.json ./lib/abi/


echo "✅ Artifacts updated successfully!"
echo "📁 VaultFactory.json & VaultFactoryVerifiable.json copied to lib/abi/" 