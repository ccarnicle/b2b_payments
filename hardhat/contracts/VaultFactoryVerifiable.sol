// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Interface for the Synapse PDPVerifier contract
interface IPDPVerifier {
    function proofSetLive(uint256 proofSetId) external view returns (bool);
}

/**
 * @title VaultFactoryVerifiable
 * @dev A factory for creating and managing secure payment vaults.
 * Supports 1-to-many Prize Pool distributions and 1-to-1 Milestone-based grants.
 * Now includes optional Filecoin Synapse deal verification for payouts.
 */
contract VaultFactoryVerifiable is ReentrancyGuard {
    // --- Enums and Structs ---

    enum VaultType { PrizePool, Milestone }

    // --- OPTIMIZED VAULT STRUCT FOR STORAGE PACKING ---
    struct Vault {
        // Group 1: uint256 fields (each takes one full 32-byte slot)
        uint256 totalAmount;
        uint256 amountWithdrawn;
        uint256 releaseTime;        // For PrizePools
        uint256 nextMilestoneToPay; // For Milestones
        uint256 synapseProofSetId;  // Synapse Proof Set ID

        // Group 2: Addresses (3 x 20 bytes = 60 bytes total, will span two 32-byte slots)
        address funder;
        address beneficiary;
        address tokenAddress;       // Changed from IERC20 to address for better packing

        // Group 3: Dynamic arrays (each gets its own dedicated 32-byte slot pointer/length)
        string termsCID;
        uint256[] milestonePayouts;
        bool[] milestonesPaid;

        // Group 4: Booleans and Enum (these will pack together into remaining space or a new slot)
        bool finalized;
        bool isVerifiable;
        bool funderCanOverrideVerification;
        VaultType vaultType; // Enum, takes up 1 byte
    }
    // --- END OPTIMIZED VAULT STRUCT ---

    // --- State Variables ---
    Vault[] public vaults;

    // Mappings to track vaults by funder and beneficiary
    mapping(address => uint224[]) public funderVaultIds;
    mapping(address => uint224[]) public beneficiaryVaultIds;

    // NEW: Mapping to store PDPVerifier contract address per chain ID
    mapping(uint256 => address) public chainIdToPdpVerifier;
    address public owner; // Owner can set PDPVerifier addresses

    // --- Events ---
    event VaultCreated(
        uint256 indexed vaultId,
        address indexed funder,
        address beneficiary,
        VaultType vaultType,
        uint256 totalAmount,
        bool isVerifiable
    );
    event FundsDistributed(uint256 indexed vaultId, uint256 totalAmount);
    event MilestoneReleased(uint256 indexed vaultId, address indexed beneficiary, uint256 amount);
    event VaultCompleted(uint256 indexed vaultId);
    event FunderVerificationOverridden(uint256 indexed vaultId);

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
    error VerifiableStorageNotSupportedOnChain();
    error ProofSetIdCannotBeZeroForVerifiableVault();
    error ProofSetIdMustBeZeroForNonVerifiableVault();
    error FunderOverrideOnlyForVerifiableVaults();
    error ProofSetNotLive();


    // --- Constructor ---
    constructor() {
        owner = msg.sender;
    }

    // --- Owner Functions ---
    function setPdpVerifierContractForChain(uint256 _chainId, address _pdpVerifierAddress) public onlyOwner {
        chainIdToPdpVerifier[_chainId] = _pdpVerifierAddress;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }


    // --- Use Case 1: Prize Pool Creation ---
    function createPrizePoolVault(
        address _token,
        uint256 _amount,
        uint256 _releaseTime,
        string calldata _termsCID,
        bool _isVerifiable,
        uint256 _synapseProofSetId,
        bool _funderCanOverrideVerification
    ) public {
        if (_amount == 0) revert MilestoneAmountsCannotBeZero();
        if (_releaseTime <= block.timestamp) revert ReleaseTimeNotMet();

        // Verifiable storage specific checks
        if (_isVerifiable) {
            if (chainIdToPdpVerifier[block.chainid] == address(0)) {
                revert VerifiableStorageNotSupportedOnChain();
            }
            if (_synapseProofSetId == 0) {
                revert ProofSetIdCannotBeZeroForVerifiableVault();
            }
        } else { // Not verifiable
            if (_synapseProofSetId != 0) {
                revert ProofSetIdMustBeZeroForNonVerifiableVault();
            }
            if (_funderCanOverrideVerification) {
                revert FunderOverrideOnlyForVerifiableVaults();
            }
        }

        uint256 vaultId = vaults.length;
        Vault storage newVault = vaults.push();

        newVault.funder = msg.sender;
        newVault.beneficiary = address(0);
        newVault.tokenAddress = _token; // Updated field name
        newVault.totalAmount = _amount;
        newVault.vaultType = VaultType.PrizePool;
        newVault.releaseTime = _releaseTime;
        newVault.termsCID = _termsCID;
        newVault.finalized = false; // Explicitly set for clarity
        newVault.isVerifiable = _isVerifiable;
        newVault.synapseProofSetId = _synapseProofSetId;
        newVault.funderCanOverrideVerification = _funderCanOverrideVerification;
        
        // Initialize milestone-specific fields to their default empty/zero values for PrizePool
        // Dynamic arrays (milestonePayouts, milestonesPaid) are already empty by default push()
        newVault.nextMilestoneToPay = 0; 

        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        
        funderVaultIds[msg.sender].push(uint224(vaultId));
        emit VaultCreated(vaultId, msg.sender, address(0), VaultType.PrizePool, _amount, _isVerifiable);
    }

    // --- Use Case 2: Milestone Grant Creation  ---
    function createMilestoneVault(
        address _beneficiary,
        address _token,
        uint256[] calldata _milestonePayouts,
        string calldata _termsCID,
        bool _isVerifiable,
        uint256 _synapseProofSetId,
        bool _funderCanOverrideVerification
    ) public {
        if (_beneficiary == address(0)) revert ZeroAddress();
        if (_milestonePayouts.length == 0) revert NoMilestonesToPay();
        
        // Verifiable storage specific checks
        if (_isVerifiable) {
            if (chainIdToPdpVerifier[block.chainid] == address(0)) {
                revert VerifiableStorageNotSupportedOnChain();
            }
            if (_synapseProofSetId == 0) {
                revert ProofSetIdCannotBeZeroForVerifiableVault();
            }
        } else { // Not verifiable
            if (_synapseProofSetId != 0) {
                revert ProofSetIdMustBeZeroForNonVerifiableVault();
            }
            if (_funderCanOverrideVerification) {
                revert FunderOverrideOnlyForVerifiableVaults();
            }
        }

        uint256 totalDeposit;
        for (uint i = 0; i < _milestonePayouts.length; i++) {
            if (_milestonePayouts[i] == 0) revert MilestoneAmountsCannotBeZero();
            totalDeposit += _milestonePayouts[i];
        }

        uint256 vaultId = vaults.length;
        Vault storage newVault = vaults.push();
        newVault.funder = msg.sender;
        newVault.beneficiary = _beneficiary;
        newVault.tokenAddress = _token; // Updated field name
        newVault.totalAmount = totalDeposit;
        newVault.vaultType = VaultType.Milestone;
        newVault.termsCID = _termsCID;
        newVault.milestonePayouts = _milestonePayouts;
        newVault.milestonesPaid = new bool[](_milestonePayouts.length); // This line is expensive for many milestones
        newVault.nextMilestoneToPay = 0; // Initialize to first milestone (index 0)
        newVault.finalized = false; // Explicitly set for clarity
        newVault.isVerifiable = _isVerifiable;
        newVault.synapseProofSetId = _synapseProofSetId;
        newVault.funderCanOverrideVerification = _funderCanOverrideVerification;

        IERC20(_token).transferFrom(msg.sender, address(this), totalDeposit);

        funderVaultIds[msg.sender].push(uint224(vaultId));
        beneficiaryVaultIds[_beneficiary].push(uint224(vaultId));

        emit VaultCreated(vaultId, msg.sender, _beneficiary, VaultType.Milestone, totalDeposit, _isVerifiable);
    }

    // --- Use Case 1: Prize Pool Payout ---
    function distributePrizePool(
        uint256 _vaultId,
        address[] calldata _recipients,
        uint256[] calldata _amounts,
        bool _funderBypassVerification
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

        // NEW: Verify Synapse Proof Set if required for this vault
        if (vault.isVerifiable) {
            address pdpVerifierAddress = chainIdToPdpVerifier[block.chainid];
            if (pdpVerifierAddress == address(0)) {
                revert VerifiableStorageNotSupportedOnChain();
            }

            if (!vault.funderCanOverrideVerification || !_funderBypassVerification) {
                if (!IPDPVerifier(pdpVerifierAddress).proofSetLive(vault.synapseProofSetId)) {
                    revert ProofSetNotLive();
                }
            } else {
                emit FunderVerificationOverridden(_vaultId);
            }
        }

        vault.finalized = true;
        vault.amountWithdrawn = totalPayout;

        for (uint i = 0; i < _recipients.length; i++) {
            if (_amounts[i] > 0) {
                IERC20(vault.tokenAddress).transfer(_recipients[i], _amounts[i]); // Updated field name
            }
        }

        emit FundsDistributed(_vaultId, totalPayout);
        emit VaultCompleted(_vaultId);
    }

    // --- Use Case 2: Milestone Payout ---
    function releaseNextMilestone(
        uint256 _vaultId,
        bool _funderBypassVerification
    ) public nonReentrant {
        if (_vaultId >= vaults.length) revert InvalidVaultId();
        Vault storage vault = vaults[_vaultId];
        
        if (msg.sender != vault.funder) revert NotTheFunder();
        if (vault.finalized) revert VaultIsFinalized();
        if (vault.nextMilestoneToPay >= vault.milestonePayouts.length) revert NoMilestonesToPay();

        // NEW: Verify Synapse Proof Set if required for this vault
        if (vault.isVerifiable) {
            address pdpVerifierAddress = chainIdToPdpVerifier[block.chainid];
            if (pdpVerifierAddress == address(0)) {
                revert VerifiableStorageNotSupportedOnChain();
            }

            if (!vault.funderCanOverrideVerification || !_funderBypassVerification) {
                if (!IPDPVerifier(pdpVerifierAddress).proofSetLive(vault.synapseProofSetId)) {
                    revert ProofSetNotLive();
                }
            } else {
                emit FunderVerificationOverridden(_vaultId);
            }
        }

        uint256 milestoneIndex = vault.nextMilestoneToPay;
        uint256 payoutAmount = vault.milestonePayouts[milestoneIndex];

        vault.milestonesPaid[milestoneIndex] = true;
        vault.nextMilestoneToPay++;
        vault.amountWithdrawn += payoutAmount;

        if (vault.nextMilestoneToPay == vault.milestonePayouts.length) {
            vault.finalized = true;
        }

        IERC20(vault.tokenAddress).transfer(vault.beneficiary, payoutAmount); // Updated field name
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

    function getVaultIdsFundedByUser(address _funder) public view returns (uint224[] memory) {
        return funderVaultIds[_funder];
    }

    function getVaultIdsAsBeneficiary(address _beneficiary) public view returns (uint224[] memory) {
        return beneficiaryVaultIds[_beneficiary];
    }
}