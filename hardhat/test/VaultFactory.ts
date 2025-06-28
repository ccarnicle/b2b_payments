// Import necessary libraries and helpers from Hardhat and Chai
import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

// The main test suite for our new VaultFactory contract
describe("VaultFactory", function () {
  
  // This is a Hardhat Fixture. It sets up a consistent, clean state for each test.
  // It's the equivalent of your old `deployEscrowFactoryFixture`.
  async function deployVaultFactoryFixture() {
    // Get signers (accounts) that we can use to interact with the contracts.
    // We'll give them more descriptive names for our use case.
    const [funder, beneficiary, otherAccount] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing purposes.
    // This is the same pattern as your old test file.
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    
    // Deploy our main VaultFactory contract.
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const vaultFactory = await VaultFactory.deploy();

    // Return all the deployed contracts and signers so they can be used in our tests.
    return { vaultFactory, mockToken, funder, beneficiary, otherAccount };
  }

  // A new test suite specifically for the `createTimeLockedVault` function
  describe("createTimeLockedVault", function () {

    // This is our first test case. It checks the "happy path" - when everything works as expected.
    it("Should create a time-locked vault with correct state and transfer funds", async function () {
      // --- 1. ARRANGE (SETUP) ---
      // Load the fixture to get a clean set of contracts and accounts for this test.
      const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);

      // Define the parameters for the vault we're about to create.
      const beneficiaryAddress = beneficiary.address;
      const tokenAddress = await mockToken.getAddress();
      const amount = ethers.parseUnits("1000", 18); // We'll lock 1000 tokens
      const termsCID = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
      
      // Set the release time to be 1 hour in the future from the latest block time.
      const latestBlockTime = await time.latest();
      const releaseTime = latestBlockTime + 3600;

      // The funder must first APPROVE the VaultFactory contract to spend their tokens.
      // This is a mandatory step for any `transferFrom` call in ERC20.
      await mockToken.connect(funder).approve(vaultFactory.target, amount);

      // --- 2. ACT (EXECUTION) & ASSERT (EVENTS) ---
      // We call the `createTimeLockedVault` function and simultaneously check that it
      // emits the `VaultCreated` event with the correct arguments.
      await expect(
        vaultFactory.connect(funder).createTimeLockedVault(
          beneficiaryAddress,
          tokenAddress,
          amount,
          releaseTime,
          termsCID
        )
      )
        .to.emit(vaultFactory, "VaultCreated")
        .withArgs(
          0, // The first vault created will have vaultId 0
          funder.address,
          beneficiaryAddress,
          0, // The enum value for VaultType.TimeLocked is 0
          amount
        );

      // --- 3. ASSERT (STATE) ---
      // Check that the funds were correctly transferred from the funder to the contract.
      const contractBalance = await mockToken.balanceOf(vaultFactory.target);
      expect(contractBalance).to.equal(amount);

      // Retrieve the details of the newly created vault using the view function.
      const vaultDetails = await vaultFactory.getVaultDetails(0);

      // Verify that every single piece of data was stored correctly on-chain.
      expect(vaultDetails.funder).to.equal(funder.address);
      expect(vaultDetails.beneficiary).to.equal(beneficiaryAddress);
      expect(vaultDetails.token).to.equal(tokenAddress);
      expect(vaultDetails.vaultType).to.equal(0); // Asserting the enum value for TimeLocked
      expect(vaultDetails.totalAmount).to.equal(amount);
      expect(vaultDetails.amountWithdrawn).to.equal(0);
      expect(vaultDetails.termsCID).to.equal(termsCID);
      expect(vaultDetails.finalized).to.be.false;
      expect(vaultDetails.releaseTime).to.equal(releaseTime);
    });
    it("Should revert if the beneficiary is the zero address", async function () {
      // ARRANGE
      const { vaultFactory, mockToken, funder } = await loadFixture(deployVaultFactoryFixture);
      const amount = ethers.parseUnits("100", 18);
      const releaseTime = (await time.latest()) + 3600;

      // ACT & ASSERT
      // We expect this call to fail because the beneficiary cannot be address(0).
      // We use `revertedWithCustomError` to check for our specific Solidity custom error.
      await expect(
        vaultFactory.connect(funder).createTimeLockedVault(
          ethers.ZeroAddress, // Using the zero address
          await mockToken.getAddress(),
          amount,
          releaseTime,
          "ipfs://cid"
        )
      ).to.be.revertedWithCustomError(vaultFactory, "ZeroAddress");
    });

    it("Should revert if the deposit amount is zero", async function () {
      // ARRANGE
      const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);
      const releaseTime = (await time.latest()) + 3600;

      // ACT & ASSERT
      // We expect this to fail because a vault cannot be created with no funds.
      await expect(
        vaultFactory.connect(funder).createTimeLockedVault(
          beneficiary.address,
          await mockToken.getAddress(),
          0, // Amount is zero
          releaseTime,
          "ipfs://cid"
        )
      ).to.be.revertedWithCustomError(vaultFactory, "MilestoneAmountsCannotBeZero");
    });

    it("Should revert if the release time is in the past", async function () {
      // ARRANGE
      const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);
      const amount = ethers.parseUnits("100", 18);
      
      // Set the release time to the current block's timestamp, which is <= block.timestamp
      const pastReleaseTime = await time.latest(); 

      // ACT & ASSERT
      // We expect this to fail as the release time must be in the future.
      await expect(
        vaultFactory.connect(funder).createTimeLockedVault(
          beneficiary.address,
          await mockToken.getAddress(),
          amount,
          pastReleaseTime, // Using a time in the past
          "ipfs://cid"
        )
      ).to.be.revertedWithCustomError(vaultFactory, "ReleaseTimeNotMet");
    });
    
  });

  // A new test suite specifically for the `createMilestoneVault` function
  describe("createMilestoneVault", function () {
  
    it("Should create a milestone vault with correct state and transfer total funds", async function () {
      // --- 1. ARRANGE (SETUP) ---
      const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);

      // Define parameters, including an array of milestone payments
      const beneficiaryAddress = beneficiary.address;
      const tokenAddress = await mockToken.getAddress();
      const termsCID = "ipfs://bafybeidatabaseociatedwithmilestonevault";
      const milestonePayouts = [
        ethers.parseUnits("100", 18), // Milestone 1: 100 tokens
        ethers.parseUnits("250", 18), // Milestone 2: 250 tokens
        ethers.parseUnits("150", 18)  // Milestone 3: 150 tokens
      ];

      // Calculate the total amount that needs to be deposited
      const totalAmount = milestonePayouts.reduce((acc, amount) => acc + amount, 0n);

      // The funder must approve the total amount to be transferred
      await mockToken.connect(funder).approve(vaultFactory.target, totalAmount);

      // --- 2. ACT (EXECUTION) & ASSERT (EVENTS) ---
      // Call the function and check for the correct `VaultCreated` event
      await expect(
        vaultFactory.connect(funder).createMilestoneVault(
          beneficiaryAddress,
          tokenAddress,
          milestonePayouts,
          termsCID
        )
      )
        .to.emit(vaultFactory, "VaultCreated")
        .withArgs(
          0, // vaultId
          funder.address,
          beneficiaryAddress,
          1, // The enum value for VaultType.Milestone is 1
          totalAmount
        );

      // --- 3. ASSERT (STATE) ---
      // Check that the full sum of milestones was transferred to the contract
      const contractBalance = await mockToken.balanceOf(vaultFactory.target);
      expect(contractBalance).to.equal(totalAmount);

      // Retrieve the vault details and verify them
      const vaultDetails = await vaultFactory.getVaultDetails(0);
      
      expect(vaultDetails.funder).to.equal(funder.address);
      expect(vaultDetails.beneficiary).to.equal(beneficiaryAddress);
      expect(vaultDetails.token).to.equal(tokenAddress);
      expect(vaultDetails.vaultType).to.equal(1); // Asserting enum value for Milestone
      expect(vaultDetails.totalAmount).to.equal(totalAmount);
      expect(vaultDetails.termsCID).to.equal(termsCID);
      expect(vaultDetails.finalized).to.be.false;

      // Verify the milestone-specific data
      expect(vaultDetails.nextMilestoneToPay).to.equal(0);
      // Use `deep.equal` to compare the contents of arrays
      expect(vaultDetails.milestonePayouts).to.deep.equal(milestonePayouts);
      expect(vaultDetails.milestonesPaid).to.deep.equal([false, false, false]);
    });
    it("Should revert if the milestone payouts array is empty", async function () {
      // ARRANGE
      const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);
      const emptyPayouts: any[] = []; // Using an empty array

      // ACT & ASSERT
      await expect(
        vaultFactory.connect(funder).createMilestoneVault(
          beneficiary.address,
          await mockToken.getAddress(),
          emptyPayouts,
          "ipfs://cid"
        )
      ).to.be.revertedWithCustomError(vaultFactory, "NoMilestonesToPay");
    });

    it("Should revert if any milestone payout amount is zero", async function () {
      // ARRANGE
      const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);
      const payoutsWithZero = [
        ethers.parseUnits("100", 18), 
        0, // A zero amount milestone
        ethers.parseUnits("150", 18)
      ];
      
      // ACT & ASSERT
      await expect(
        vaultFactory.connect(funder).createMilestoneVault(
          beneficiary.address,
          await mockToken.getAddress(),
          payoutsWithZero,
          "ipfs://cid"
        )
      ).to.be.revertedWithCustomError(vaultFactory, "MilestoneAmountsCannotBeZero");
    });

  });

  // Test suite for the `releaseTimeLockedFunds` function
  describe("releaseTimeLockedFunds", function () {
    
    // We'll create a helper fixture inside this describe block to set up a
    // pre-created time-locked vault for each test in this suite.
    async function deployTimeLockedVaultFixture() {
      const { vaultFactory, mockToken, funder, beneficiary, otherAccount } = await loadFixture(deployVaultFactoryFixture);

      const amount = ethers.parseUnits("1000", 18);
      const releaseTime = (await time.latest()) + 3600; // 1 hour from now

      await mockToken.connect(funder).approve(vaultFactory.target, amount);
      await vaultFactory.connect(funder).createTimeLockedVault(
        beneficiary.address,
        await mockToken.getAddress(),
        amount,
        releaseTime,
        "ipfs://cid"
      );
      
      // Return the setup so our tests can use it
      return { vaultFactory, mockToken, funder, beneficiary, otherAccount, releaseTime, amount };
    }

    it("Should allow the beneficiary to release funds after the release time", async function () {
      // ARRANGE
      const { vaultFactory, mockToken, beneficiary, releaseTime, amount } = await loadFixture(deployTimeLockedVaultFixture);
      
      // Fast-forward the blockchain time to just after the release time
      await time.increaseTo(releaseTime);
      
      const initialBeneficiaryBalance = await mockToken.balanceOf(beneficiary.address);

      // ACT & ASSERT (EVENTS)
      await expect(
        vaultFactory.connect(beneficiary).releaseTimeLockedFunds(0)
      )
        .to.emit(vaultFactory, "FundsReleased")
        .withArgs(0, beneficiary.address, amount);
      
      // ASSERT (STATE)
      // The beneficiary's balance should have increased by the vault amount
      const finalBeneficiaryBalance = await mockToken.balanceOf(beneficiary.address);
      expect(finalBeneficiaryBalance).to.equal(initialBeneficiaryBalance + amount);

      // The contract's balance should now be zero
      expect(await mockToken.balanceOf(vaultFactory.target)).to.equal(0);

      // The vault should be marked as finalized
      const vaultDetails = await vaultFactory.getVaultDetails(0);
      expect(vaultDetails.finalized).to.be.true;
    });

    it("Should revert if release is attempted before the release time", async function () {
      // ARRANGE
      const { vaultFactory, beneficiary } = await loadFixture(deployTimeLockedVaultFixture);
      // NOTE: We do NOT fast-forward time in this test.

      // ACT & ASSERT
      await expect(
        vaultFactory.connect(beneficiary).releaseTimeLockedFunds(0)
      ).to.be.revertedWithCustomError(vaultFactory, "ReleaseTimeNotMet");
    });

    it("Should revert if a non-beneficiary attempts to release funds", async function () {
      // ARRANGE
      const { vaultFactory, otherAccount, releaseTime } = await loadFixture(deployTimeLockedVaultFixture);
      await time.increaseTo(releaseTime); // Time is valid

      // ACT & ASSERT
      // The `otherAccount` is not the beneficiary and should be rejected.
      await expect(
        vaultFactory.connect(otherAccount).releaseTimeLockedFunds(0)
      ).to.be.revertedWithCustomError(vaultFactory, "NotTheBeneficiary");
    });

    it("Should revert if release is attempted on a vault that is already finalized", async function () {
      // ARRANGE
      const { vaultFactory, beneficiary, releaseTime } = await loadFixture(deployTimeLockedVaultFixture);
      await time.increaseTo(releaseTime);

      // First release is successful
      await vaultFactory.connect(beneficiary).releaseTimeLockedFunds(0);

      // ACT & ASSERT
      // Trying to release a second time should fail.
      await expect(
        vaultFactory.connect(beneficiary).releaseTimeLockedFunds(0)
      ).to.be.revertedWithCustomError(vaultFactory, "VaultIsFinalized");
    });
  });
  
  describe("releaseNextMilestone", function () {

    // Helper fixture to deploy a milestone vault for this test suite
    async function deployMilestoneVaultFixture() {
      const { vaultFactory, mockToken, funder, beneficiary, otherAccount } = await loadFixture(deployVaultFactoryFixture);
      const milestonePayouts = [ethers.parseUnits("100", 18), ethers.parseUnits("200", 18)];
      const totalAmount = ethers.parseUnits("300", 18);

      await mockToken.connect(funder).approve(vaultFactory.target, totalAmount);
      await vaultFactory.connect(funder).createMilestoneVault(
        beneficiary.address,
        await mockToken.getAddress(),
        milestonePayouts,
        "ipfs://cid_milestone"
      );

      return { vaultFactory, mockToken, funder, beneficiary, otherAccount, milestonePayouts };
    }

    it("Should allow the funder to release milestones sequentially", async function () {
      // ARRANGE
      const { vaultFactory, mockToken, funder, beneficiary, milestonePayouts } = await loadFixture(deployMilestoneVaultFixture);
      const firstPayout = milestonePayouts[0];
      const secondPayout = milestonePayouts[1];

      // --- Release First Milestone ---
      // ACT
      await expect(vaultFactory.connect(funder).releaseNextMilestone(0))
        .to.emit(vaultFactory, "FundsReleased")
        .withArgs(0, beneficiary.address, firstPayout);

      // ASSERT
      let vaultDetails = await vaultFactory.getVaultDetails(0);
      expect(vaultDetails.nextMilestoneToPay).to.equal(1);
      expect(vaultDetails.amountWithdrawn).to.equal(firstPayout);
      expect(vaultDetails.milestonesPaid[0]).to.be.true;
      expect(vaultDetails.milestonesPaid[1]).to.be.false;
      expect(vaultDetails.finalized).to.be.false;
      expect(await mockToken.balanceOf(beneficiary.address)).to.equal(firstPayout);

      // --- Release Second (and Final) Milestone ---
      // ACT
      await expect(vaultFactory.connect(funder).releaseNextMilestone(0))
        .to.emit(vaultFactory, "FundsReleased")
        .withArgs(0, beneficiary.address, secondPayout)
        .and.to.emit(vaultFactory, "VaultCompleted") // Should also emit VaultCompleted
        .withArgs(0);

      // ASSERT
      vaultDetails = await vaultFactory.getVaultDetails(0);
      expect(vaultDetails.nextMilestoneToPay).to.equal(2);
      expect(vaultDetails.amountWithdrawn).to.equal(firstPayout + secondPayout);
      expect(vaultDetails.milestonesPaid[1]).to.be.true;
      expect(vaultDetails.finalized).to.be.true; // Now it should be finalized
      expect(await mockToken.balanceOf(beneficiary.address)).to.equal(firstPayout + secondPayout);
    });

    it("Should revert if a non-funder attempts to release a milestone", async function () {
      // ARRANGE
      const { vaultFactory, beneficiary } = await loadFixture(deployMilestoneVaultFixture);
      
      // ACT & ASSERT
      await expect(
        vaultFactory.connect(beneficiary).releaseNextMilestone(0)
      ).to.be.revertedWithCustomError(vaultFactory, "NotTheFunder");
    });

    it("Should revert if all milestones have already been paid", async function () {
      // ARRANGE
      const { vaultFactory, funder } = await loadFixture(deployMilestoneVaultFixture);
      // Pay out all milestones
      await vaultFactory.connect(funder).releaseNextMilestone(0);
      await vaultFactory.connect(funder).releaseNextMilestone(0);

      // ACT & ASSERT
      // The vault is now finalized, so this should fail.
      await expect(
        vaultFactory.connect(funder).releaseNextMilestone(0)
      ).to.be.revertedWithCustomError(vaultFactory, "VaultIsFinalized");
    });
  });
});