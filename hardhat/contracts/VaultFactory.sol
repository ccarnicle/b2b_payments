// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VaultFactory
 * @dev A factory for creating and managing secure, milestone-based B2B payment vaults.
 * Supports both time-locked and manually-released milestone-based payouts.
 */
 
contract VaultFactory is ReentrancyGuard {
    // --- Enums and Structs ---

    enum VaultType { TimeLocked, Milestone }

    /**
     * @dev Represents a single payment vault.
     * @param funder The address that created and funded the vault.
     * @param beneficiary The address that will receive the funds.
     * @param token The address of the ERC20 token used for payments.
     * @param vaultType The type of vault (TimeLocked or Milestone).
     * @param totalAmount The total amount of tokens deposited into the vault.
     * @param amountWithdrawn The amount of tokens already paid out from the vault.
     * @param termsCID The IPFS CID of the milestone agreement document.
     * @param finalized A flag indicating if all funds have been paid out.
     *
     * --- TimeLocked Specific Fields ---
     * @param releaseTime The unix timestamp after which funds can be released.
     *
     * --- Milestone Specific Fields ---
     * @param milestonePayouts An array of payment amounts for each milestone.
     * @param milestonesPaid An array of booleans tracking which milestones have been paid.
     * @param nextMilestoneToPay The index of the next milestone to be released.
     */
    struct Vault {
        address funder;
        address beneficiary;
        IERC20 token;
        VaultType vaultType;
        uint256 totalAmount;
        uint256 amountWithdrawn;
        string termsCID;
        bool finalized;
        // TimeLocked fields
        uint256 releaseTime;
        // Milestone fields
        uint256[] milestonePayouts;
        bool[] milestonesPaid;
        uint256 nextMilestoneToPay;
    }

    // --- State Variables ---

    Vault[] public vaults;

    // --- Events ---

    event VaultCreated(
        uint256 indexed vaultId,
        address indexed funder,
        address indexed beneficiary,
        VaultType vaultType,
        uint256 totalAmount
    );

    event FundsReleased(uint256 indexed vaultId, address indexed beneficiary, uint256 amount);
    event VaultCompleted(uint256 indexed vaultId);

    // --- Errors ---

    error InvalidVaultId();
    error NotTheFunder();
    error NotTheBeneficiary();
    error VaultIsFinalized();
    error ReleaseTimeNotMet();
    error NoMilestonesToPay();
    error MilestoneAmountsCannotBeZero();
    error ZeroAddress();

    // --- Functions ---

    /**
     * @dev Creates a new Time-Locked vault.
     * Funds are transferred immediately and locked until a specified time.
     * @param _beneficiary The recipient of the funds.
     * @param _token The contract address of the ERC20 token.
     * @param _amount The total amount to lock in the vault.
     * @param _releaseTime The Unix timestamp when funds become available.
     * @param _termsCID The IPFS CID of the agreement.
     */
    function createTimeLockedVault(
        address _beneficiary,
        address _token,
        uint256 _amount,
        uint256 _releaseTime,
        string calldata _termsCID
    ) public {
        if (_beneficiary == address(0)) revert ZeroAddress();
        if (_amount == 0) revert MilestoneAmountsCannotBeZero();
        if (_releaseTime <= block.timestamp) revert ReleaseTimeNotMet();

        uint256 vaultId = vaults.length;
        Vault storage newVault = vaults.push();

        newVault.funder = msg.sender;
        newVault.beneficiary = _beneficiary;
        newVault.token = IERC20(_token);
        newVault.totalAmount = _amount;
        newVault.vaultType = VaultType.TimeLocked;
        newVault.releaseTime = _releaseTime;
        newVault.termsCID = _termsCID;
        // finalized and amountWithdrawn default to false/0

        // Transfer funds into the vault
        newVault.token.transferFrom(msg.sender, address(this), _amount);

        emit VaultCreated(vaultId, msg.sender, _beneficiary, VaultType.TimeLocked, _amount);
    }

    /**
     * @dev Creates a new Milestone-based vault.
     * Funds are transferred immediately, to be released in stages by the funder.
     * @param _beneficiary The recipient of the funds.
     * @param _token The contract address of the ERC20 token.
     * @param _milestonePayouts An array of amounts for each milestone.
     * @param _termsCID The IPFS CID of the agreement.
     */
    function createMilestoneVault(
        address _beneficiary,
        address _token,
        uint256[] calldata _milestonePayouts,
        string calldata _termsCID
    ) public {
        if (_beneficiary == address(0)) revert ZeroAddress();
        if (_milestonePayouts.length == 0) revert NoMilestonesToPay();

        uint256 totalDeposit;
        for (uint i = 0; i < _milestonePayouts.length; i++) {
            if (_milestonePayouts[i] == 0) revert MilestoneAmountsCannotBeZero();
            totalDeposit += _milestonePayouts[i];
        }

        uint256 vaultId = vaults.length;
        Vault storage newVault = vaults.push();

        newVault.funder = msg.sender;
        newVault.beneficiary = _beneficiary;
        newVault.token = IERC20(_token);
        newVault.totalAmount = totalDeposit;
        newVault.vaultType = VaultType.Milestone;
        newVault.termsCID = _termsCID;
        newVault.milestonePayouts = _milestonePayouts;
        newVault.milestonesPaid = new bool[](_milestonePayouts.length);
        // nextMilestoneToPay, finalized, and amountWithdrawn default to 0/false

        // Transfer funds into the vault
        newVault.token.transferFrom(msg.sender, address(this), totalDeposit);

        emit VaultCreated(vaultId, msg.sender, _beneficiary, VaultType.Milestone, totalDeposit);
    }

    /**
     * @dev Releases the funds from a Time-Locked vault.
     * Can be called by the beneficiary after the release time has passed.
     * @param _vaultId The ID of the vault to release funds from.
     */
    function releaseTimeLockedFunds(uint256 _vaultId) public nonReentrant {
        if (_vaultId >= vaults.length) revert InvalidVaultId();
        Vault storage vault = vaults[_vaultId];

        // --- CHECKS ---
        if (msg.sender != vault.beneficiary) revert NotTheBeneficiary();
        if (vault.finalized) revert VaultIsFinalized();
        if (block.timestamp < vault.releaseTime) revert ReleaseTimeNotMet();

        // --- EFFECTS ---
        vault.finalized = true;
        vault.amountWithdrawn = vault.totalAmount;

        // --- INTERACTIONS ---
        vault.token.transfer(vault.beneficiary, vault.totalAmount);

        emit FundsReleased(_vaultId, vault.beneficiary, vault.totalAmount);
        emit VaultCompleted(_vaultId);
    }

    /**
     * @dev Releases the next milestone payment for a Milestone vault.
     * Can only be called by the funder.
     * @param _vaultId The ID of the vault.
     */
    function releaseNextMilestone(uint256 _vaultId) public nonReentrant {
        if (_vaultId >= vaults.length) revert InvalidVaultId();
        Vault storage vault = vaults[_vaultId];
        
        // --- CHECKS ---
        if (msg.sender != vault.funder) revert NotTheFunder();
        if (vault.finalized) revert VaultIsFinalized();
        if (vault.nextMilestoneToPay >= vault.milestonePayouts.length) revert NoMilestonesToPay();

        // --- EFFECTS ---
        uint256 milestoneIndex = vault.nextMilestoneToPay;
        uint256 payoutAmount = vault.milestonePayouts[milestoneIndex];

        vault.milestonesPaid[milestoneIndex] = true;
        vault.nextMilestoneToPay++;
        vault.amountWithdrawn += payoutAmount;

        // If this was the last milestone, mark the vault as finalized.
        if (vault.nextMilestoneToPay == vault.milestonePayouts.length) {
            vault.finalized = true;
        }

        // --- INTERACTIONS ---
        vault.token.transfer(vault.beneficiary, payoutAmount);

        emit FundsReleased(_vaultId, vault.beneficiary, payoutAmount);
        if(vault.finalized) {
            emit VaultCompleted(_vaultId);
        }
    }

    /**
     * @dev Returns the core details of a specific vault.
     */
    function getVaultDetails(uint256 _vaultId)
        public view
        returns (Vault memory)
    {
        if (_vaultId >= vaults.length) revert InvalidVaultId();
        return vaults[_vaultId];
    }
}