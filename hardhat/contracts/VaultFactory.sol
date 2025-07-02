// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VaultFactory
 * @dev A factory for creating and managing secure payment vaults.
 * Supports 1-to-many Prize Pool distributions and 1-to-1 Milestone-based grants.
 */
contract VaultFactory is ReentrancyGuard {
    // --- Enums and Structs ---

    // VaultType is now clearer: PrizePool for hackathons, Milestone for grants.
    enum VaultType { PrizePool, Milestone }

    struct Vault {
        address funder;
        // NOTE: Beneficiary is ONLY for Milestone vaults. It will be address(0) for PrizePools.
        address beneficiary;
        IERC20 token;
        VaultType vaultType;
        uint256 totalAmount;
        uint256 amountWithdrawn;
        string termsCID;
        bool finalized;
        // PrizePool-specific fields
        uint256 releaseTime;
        // Milestone-specific fields
        uint256[] milestonePayouts;
        bool[] milestonesPaid;
        uint256 nextMilestoneToPay;
    }

    // --- State Variables ---
    Vault[] public vaults;

    // Mappings to track vaults by funder and beneficiary
    mapping(address => uint256[]) public funderVaultIds;
    mapping(address => uint256[]) public beneficiaryVaultIds;


    // --- Events ---
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed funder,
        address beneficiary, // Not indexed as it can be address(0)
        VaultType vaultType,
        uint256 totalAmount
    );
    event FundsDistributed(uint256 indexed vaultId, uint256 totalAmount);
    event MilestoneReleased(uint256 indexed vaultId, address indexed beneficiary, uint256 amount);
    event VaultCompleted(uint256 indexed vaultId);

    // --- Errors ---
    error InvalidVaultId();
    error NotTheFunder();
    error VaultIsFinalized();
    error ReleaseTimeNotMet();
    error NoMilestonesToPay();
    error MilestoneAmountsCannotBeZero();
    error ZeroAddress();
    error MismatchedArrays();
    error IncorrectTotalPayout();

    // --- Use Case 1: Prize Pool Creation ---
    function createPrizePoolVault(
        address _token,
        uint256 _amount,
        uint256 _releaseTime,
        string calldata _termsCID
    ) public {
        if (_amount == 0) revert MilestoneAmountsCannotBeZero();
        if (_releaseTime <= block.timestamp) revert ReleaseTimeNotMet();

        uint256 vaultId = vaults.length;
        Vault storage newVault = vaults.push();

        newVault.funder = msg.sender;
        newVault.beneficiary = address(0); // No single beneficiary for a prize pool
        newVault.token = IERC20(_token);
        newVault.totalAmount = _amount;
        newVault.vaultType = VaultType.PrizePool;
        newVault.releaseTime = _releaseTime;
        newVault.termsCID = _termsCID;

        newVault.token.transferFrom(msg.sender, address(this), _amount);
        
        // NEW: Track vault for the funder
        funderVaultIds[msg.sender].push(vaultId);

        emit VaultCreated(vaultId, msg.sender, address(0), VaultType.PrizePool, _amount);
    }

    // --- Use Case 2: Milestone Grant Creation  ---
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

        newVault.token.transferFrom(msg.sender, address(this), totalDeposit);

        // NEW: Track vault for both funder and beneficiary
        funderVaultIds[msg.sender].push(vaultId);
        beneficiaryVaultIds[_beneficiary].push(vaultId);

        emit VaultCreated(vaultId, msg.sender, _beneficiary, VaultType.Milestone, totalDeposit);
    }

    // --- Use Case 1: Prize Pool Payout ---
    // This new function allows the funder to distribute the entire prize pool to many recipients.
    function distributePrizePool(
        uint256 _vaultId,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) public nonReentrant {
        if (_vaultId >= vaults.length) revert InvalidVaultId();
        Vault storage vault = vaults[_vaultId];

        if (msg.sender != vault.funder) revert NotTheFunder();
        if (block.timestamp < vault.releaseTime) revert ReleaseTimeNotMet();
        if (vault.finalized) revert VaultIsFinalized();
        if (_recipients.length != _amounts.length) revert MismatchedArrays();

        uint256 totalPayout;
        for (uint i = 0; i < _amounts.length; i++) {
            totalPayout += _amounts[i];
        }
        if (totalPayout != vault.totalAmount) revert IncorrectTotalPayout();

        vault.finalized = true;
        vault.amountWithdrawn = totalPayout;

        for (uint i = 0; i < _recipients.length; i++) {
            if (_amounts[i] > 0) {
                vault.token.transfer(_recipients[i], _amounts[i]);
            }
        }

        emit FundsDistributed(_vaultId, totalPayout);
        emit VaultCompleted(_vaultId);
    }

    // --- Use Case 2: Milestone Payout (Unchanged, but event renamed for clarity) ---
    function releaseNextMilestone(uint256 _vaultId) public nonReentrant {
        if (_vaultId >= vaults.length) revert InvalidVaultId();
        Vault storage vault = vaults[_vaultId];
        
        if (msg.sender != vault.funder) revert NotTheFunder();
        if (vault.finalized) revert VaultIsFinalized();
        if (vault.nextMilestoneToPay >= vault.milestonePayouts.length) revert NoMilestonesToPay();

        uint256 milestoneIndex = vault.nextMilestoneToPay;
        uint256 payoutAmount = vault.milestonePayouts[milestoneIndex];

        vault.milestonesPaid[milestoneIndex] = true;
        vault.nextMilestoneToPay++;
        vault.amountWithdrawn += payoutAmount;

        if (vault.nextMilestoneToPay == vault.milestonePayouts.length) {
            vault.finalized = true;
        }

        vault.token.transfer(vault.beneficiary, payoutAmount);
        emit MilestoneReleased(_vaultId, vault.beneficiary, payoutAmount);
        if(vault.finalized) {
            emit VaultCompleted(_vaultId);
        }
    }

    // --- Getter Functions ---
    function getVaultDetails(uint256 _vaultId) public view returns (Vault memory) {
        if (_vaultId >= vaults.length) revert InvalidVaultId();
        return vaults[_vaultId];
    }

    // NEW: Getter function for vaults where a user is the funder
    function getVaultIdsFundedByUser(address _funder) public view returns (uint256[] memory) {
        return funderVaultIds[_funder];
    }

    // NEW: Getter function for vaults where a user is the beneficiary
    function getVaultIdsAsBeneficiary(address _beneficiary) public view returns (uint256[] memory) {
        return beneficiaryVaultIds[_beneficiary];
    }
}