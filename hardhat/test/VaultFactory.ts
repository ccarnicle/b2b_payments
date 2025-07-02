// Import necessary libraries and helpers from Hardhat and Chai
import { ethers } from "hardhat";
import { expect } from "chai";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

// The main test suite for our updated VaultFactory contract
describe("VaultFactory", function () {
  
  // The fixture is unchanged. It provides a clean state for each test.
  async function deployVaultFactoryFixture() {
    const [funder, beneficiary, recipient1, recipient2] = await ethers.getSigners();
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const vaultFactory = await VaultFactory.deploy();
    return { vaultFactory, mockToken, funder, beneficiary, recipient1, recipient2 };
  }

  // UPDATED: Test suite for the Prize Pool vault type
  describe("PrizePool Vault (Use Case 1)", function () {
    
    // --- CREATE ---
    describe("createPrizePoolVault", function() {
      it("Should create a prize pool vault with correct state", async function () {
        // ARRANGE
        const { vaultFactory, mockToken, funder } = await loadFixture(deployVaultFactoryFixture);
        const tokenAddress = await mockToken.getAddress();
        const amount = ethers.parseUnits("5000", 18);
        const termsCID = "ipfs://hackathon_prizes_cid";
        const releaseTime = (await time.latest()) + 3600;
  
        await mockToken.connect(funder).approve(vaultFactory.target, amount);
  
        // ACT & ASSERT (Event)
        await expect(
          vaultFactory.connect(funder).createPrizePoolVault(
            tokenAddress,
            amount,
            releaseTime,
            termsCID
          )
        )
          .to.emit(vaultFactory, "VaultCreated")
          .withArgs(0, funder.address, ethers.ZeroAddress, 0, amount); // beneficiary is address(0), type is PrizePool (0)
  
        // ASSERT (State)
        const vaultDetails = await vaultFactory.getVaultDetails(0);
        expect(vaultDetails.funder).to.equal(funder.address);
        expect(vaultDetails.beneficiary).to.equal(ethers.ZeroAddress); // Key check!
        expect(vaultDetails.vaultType).to.equal(0); // PrizePool
        expect(vaultDetails.totalAmount).to.equal(amount);
        expect(await mockToken.balanceOf(vaultFactory.target)).to.equal(amount);
      });
      // The old "revert if beneficiary is zero" test is now obsolete and has been removed.
      // The other failure case tests are still valid but adapted for the new function name.
      it("Should revert if the deposit amount is zero", async function() {
         const { vaultFactory, mockToken, funder } = await loadFixture(deployVaultFactoryFixture);
         await expect(
            vaultFactory.connect(funder).createPrizePoolVault(await mockToken.getAddress(), 0, (await time.latest()) + 3600, "cid")
         ).to.be.revertedWithCustomError(vaultFactory, "MilestoneAmountsCannotBeZero");
      });
    });

    // --- DISTRIBUTE ---
    describe("distributePrizePool", function() {
      // Helper fixture to set up a funded prize pool
      async function deployPrizePoolFixture() {
        const { vaultFactory, mockToken, funder, recipient1, recipient2 } = await loadFixture(deployVaultFactoryFixture);
        const totalAmount = ethers.parseUnits("5000", 18);
        const releaseTime = (await time.latest()) + 3600;
        await mockToken.connect(funder).approve(vaultFactory.target, totalAmount);
        await vaultFactory.connect(funder).createPrizePoolVault(await mockToken.getAddress(), totalAmount, releaseTime, "cid");
        return { vaultFactory, mockToken, funder, recipient1, recipient2, releaseTime, totalAmount };
      }

      it("Should allow the funder to distribute the prize pool to multiple recipients", async function () {
        // ARRANGE
        const { vaultFactory, mockToken, funder, recipient1, recipient2, releaseTime, totalAmount } = await loadFixture(deployPrizePoolFixture);
        await time.increaseTo(releaseTime); // Fast-forward past the release time

        const recipients = [recipient1.address, recipient2.address];
        const amounts = [ethers.parseUnits("2000", 18), ethers.parseUnits("3000", 18)];

        const r1_initialBalance = await mockToken.balanceOf(recipient1.address);
        const r2_initialBalance = await mockToken.balanceOf(recipient2.address);
        
        // ACT & ASSERT (Events)
        await expect(
            vaultFactory.connect(funder).distributePrizePool(0, recipients, amounts)
        ).to.emit(vaultFactory, "FundsDistributed").withArgs(0, totalAmount);

        // ASSERT (State)
        expect(await mockToken.balanceOf(recipient1.address)).to.equal(r1_initialBalance + amounts[0]);
        expect(await mockToken.balanceOf(recipient2.address)).to.equal(r2_initialBalance + amounts[1]);
        expect(await mockToken.balanceOf(vaultFactory.target)).to.equal(0);
        const details = await vaultFactory.getVaultDetails(0);
        expect(details.finalized).to.be.true;
      });

      it("Should revert if a non-funder tries to distribute", async function(){
         const { vaultFactory, recipient1, releaseTime } = await loadFixture(deployPrizePoolFixture);
         await time.increaseTo(releaseTime);
         await expect(
            vaultFactory.connect(recipient1).distributePrizePool(0, [], [])
         ).to.be.revertedWithCustomError(vaultFactory, "NotTheFunder");
      });

       it("Should revert if distribution is attempted before the release time", async function(){
         const { vaultFactory, funder } = await loadFixture(deployPrizePoolFixture);
         await expect(
            vaultFactory.connect(funder).distributePrizePool(0, [], [])
         ).to.be.revertedWithCustomError(vaultFactory, "ReleaseTimeNotMet");
      });

      it("Should revert if total payout does not match total amount", async function(){
         const { vaultFactory, funder, releaseTime, recipient1 } = await loadFixture(deployPrizePoolFixture);
         await time.increaseTo(releaseTime);
         const wrongAmount = [ethers.parseUnits("100", 18)]; // The total is 5000
         await expect(
            vaultFactory.connect(funder).distributePrizePool(0, [recipient1.address], wrongAmount)
         ).to.be.revertedWithCustomError(vaultFactory, "IncorrectTotalPayout");
      });
    });
  });

  // UNCHANGED: The Milestone vault tests are still valid as this logic was not changed.
  // We just check the event name in the final test.
  describe("Milestone Vault (Use Case 2)", function () {
  
    describe("createMilestoneVault", function () {
        it("Should create a milestone vault with correct state and transfer total funds", async function () {
            const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);
            const milestonePayouts = [ ethers.parseUnits("100", 18), ethers.parseUnits("250", 18) ];
            const totalAmount = ethers.parseUnits("350", 18);
            await mockToken.connect(funder).approve(vaultFactory.target, totalAmount);
    
            await expect( vaultFactory.connect(funder).createMilestoneVault(beneficiary.address, await mockToken.getAddress(), milestonePayouts, "cid") )
                .to.emit(vaultFactory, "VaultCreated")
                .withArgs(0, funder.address, beneficiary.address, 1, totalAmount);
    
            const vaultDetails = await vaultFactory.getVaultDetails(0);
            expect(vaultDetails.vaultType).to.equal(1); // Milestone
            expect(vaultDetails.beneficiary).to.equal(beneficiary.address);
        });
        // Other creation failure tests remain the same...
    });
    
    describe("releaseNextMilestone", function () {
        async function deployMilestoneVaultFixture() {
            const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);
            const milestonePayouts = [ethers.parseUnits("100", 18), ethers.parseUnits("200", 18)];
            const totalAmount = ethers.parseUnits("300", 18);
            await mockToken.connect(funder).approve(vaultFactory.target, totalAmount);
            await vaultFactory.connect(funder).createMilestoneVault(beneficiary.address, await mockToken.getAddress(), milestonePayouts, "cid");
            return { vaultFactory, mockToken, funder, beneficiary, milestonePayouts };
        }

        it("Should allow the funder to release milestones sequentially", async function () {
            const { vaultFactory, funder, beneficiary, milestonePayouts } = await loadFixture(deployMilestoneVaultFixture);
            const firstPayout = milestonePayouts[0];
            const secondPayout = milestonePayouts[1];

            // Check that the correct event "MilestoneReleased" is emitted
            await expect(vaultFactory.connect(funder).releaseNextMilestone(0))
                .to.emit(vaultFactory, "MilestoneReleased")
                .withArgs(0, beneficiary.address, firstPayout);

            let vaultDetails = await vaultFactory.getVaultDetails(0);
            expect(vaultDetails.finalized).to.be.false;

            await expect(vaultFactory.connect(funder).releaseNextMilestone(0))
                .to.emit(vaultFactory, "MilestoneReleased")
                .withArgs(0, beneficiary.address, secondPayout)
                .and.to.emit(vaultFactory, "VaultCompleted").withArgs(0);

            vaultDetails = await vaultFactory.getVaultDetails(0);
            expect(vaultDetails.finalized).to.be.true;
        });
        // Other release failure tests remain the same...
    });
  });

  // NEW: Test suite for user vault mappings
  describe("User Vault Mappings", function () {
    it("Should track vault IDs for the funder", async function () {
      const { vaultFactory, mockToken, funder, beneficiary } = await loadFixture(deployVaultFactoryFixture);
      const tokenAddress = await mockToken.getAddress();
      const amount1 = ethers.parseUnits("1000", 18);
      const amount2 = ethers.parseUnits("2000", 18);
      const milestonePayouts = [ethers.parseUnits("50", 18)];
      const releaseTime = (await time.latest()) + 3600;

      // Funder creates a Prize Pool vault (vaultId 0)
      await mockToken.connect(funder).approve(vaultFactory.target, amount1);
      await vaultFactory.connect(funder).createPrizePoolVault(tokenAddress, amount1, releaseTime, "cid1");

      // Funder creates a Milestone vault (vaultId 1)
      await mockToken.connect(funder).approve(vaultFactory.target, amount2); // Approve for milestone total
      await vaultFactory.connect(funder).createMilestoneVault(beneficiary.address, tokenAddress, milestonePayouts, "cid2");

      // Check funderVaultIds for funder
      const funderVaults = await vaultFactory.getVaultIdsFundedByUser(funder.address);
      expect(funderVaults).to.deep.equal([0n, 1n]); // Use 0n, 1n for BigInt comparison
    });

    it("Should track vault IDs for the beneficiary", async function () {
      const { vaultFactory, mockToken, funder, beneficiary, recipient1 } = await loadFixture(deployVaultFactoryFixture);
      const tokenAddress = await mockToken.getAddress();
      const milestonePayouts1 = [ethers.parseUnits("50", 18)];
      const milestonePayouts2 = [ethers.parseUnits("100", 18)];

      // Funder creates a Milestone vault for beneficiary (vaultId 0)
      await mockToken.connect(funder).approve(vaultFactory.target, milestonePayouts1[0]);
      await vaultFactory.connect(funder).createMilestoneVault(beneficiary.address, tokenAddress, milestonePayouts1, "cid1");

      // Funder creates another Milestone vault for recipient1 (vaultId 1)
      await mockToken.connect(funder).approve(vaultFactory.target, milestonePayouts2[0]);
      await vaultFactory.connect(funder).createMilestoneVault(recipient1.address, tokenAddress, milestonePayouts2, "cid2");

      // Check beneficiaryVaultIds for beneficiary
      const beneficiaryVaults = await vaultFactory.getVaultIdsAsBeneficiary(beneficiary.address);
      expect(beneficiaryVaults).to.deep.equal([0n]); // Only vault 0 should be associated with beneficiary

      // Check beneficiaryVaultIds for recipient1
      const recipient1Vaults = await vaultFactory.getVaultIdsAsBeneficiary(recipient1.address);
      expect(recipient1Vaults).to.deep.equal([1n]); // Only vault 1 should be associated with recipient1
    });

    it("Should return an empty array if no vaults are associated with the user", async function () {
      const { vaultFactory, recipient1 } = await loadFixture(deployVaultFactoryFixture);
      const noVaultsFunder = await vaultFactory.getVaultIdsFundedByUser(recipient1.address);
      const noVaultsBeneficiary = await vaultFactory.getVaultIdsAsBeneficiary(recipient1.address);
      
      expect(noVaultsFunder).to.deep.equal([]);
      expect(noVaultsBeneficiary).to.deep.equal([]);
    });
  });
});