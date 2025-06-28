// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Import the standard interface for ERC20 tokens
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title EscrowFactory
 * @dev A factory contract for creating and managing fantasy contest-style prize pools.
 */
contract EscrowFactory {
    // --- Data Structures ---

    /**
     * @dev Represents a single escrow prize pool.
     * @param organizer The address that created the pool.
     * @param tokenContract The address of the ERC20 token used for deposits.
     * @param dues The required amount for a single entry. If 0, any amount is accepted.
     * @param startTime The unix timestamp after which no new entries are accepted. If 0, no start time constraint.
     * @param endTime The unix timestamp after which payouts can be processed.
     * @param totalAmount The total amount of tokens deposited into the pool.
     * @param finalized A flag to show that the escrow has been payed out
     * @param depositors A mapping of user addresses to their total contributed amount.
     */
    struct Escrow {
        address organizer;
        address tokenContract;
        uint256 dues;
        uint256 startTime;
        uint256 endTime;
        uint256 totalAmount;
        bool finalized; // Changed from isLocked for clarity
        mapping(address => uint256) depositors;
    }

    // --- State Variables ---

    Escrow[] public escrows;

    // --- Events ---

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed organizer,
        address indexed tokenContract,
        uint256 dues
    );

    event DepositMade(
        uint256 indexed escrowId,
        address indexed depositor,
        uint256 amount
    );
  
    event EscrowFinalized(uint256 indexed escrowId);

    // --- Functions ---

    /**
     * @dev Creates a new escrow prize pool.
     * @param _tokenContract The contract address of the ERC20 token for this pool.
     * @param _dues The required entry fee. Set to 0 for variable contributions.
     * @param _startTime The unix timestamp when the contest begins (entries close).
     * @param _endTime The unix timestamp when the contest ends (payouts enabled).
     * @param _joinAsOrganizer If true, the creator will also join and pay the dues immediately.
     */
    function createEscrow(
        address _tokenContract,
        uint256 _dues,
        uint256 _startTime,
        uint256 _endTime,
        bool _joinAsOrganizer
    ) public {
        require(_endTime > block.timestamp, "End time must be in the future");
        if (_startTime != 0) {
            require(_startTime < _endTime, "Start time must be before end time");
        }
        if (_joinAsOrganizer) {
            require(_dues > 0, "Cannot join a pool with 0 dues upon creation");
        }

        uint256 escrowId = escrows.length;

        // Create the Escrow struct in storage
        Escrow storage newEscrow = escrows.push();
        newEscrow.organizer = msg.sender;
        newEscrow.tokenContract = _tokenContract;
        newEscrow.dues = _dues;
        newEscrow.startTime = _startTime;
        newEscrow.endTime = _endTime;
        // Other fields (totalAmount, finalized) default to 0/false

        // Handle the case where the organizer joins immediately
        if (_joinAsOrganizer) {
            // This internal function will handle the token transfer and state updates
            _deposit(escrowId, msg.sender, _dues);
        }

        emit EscrowCreated(escrowId, msg.sender, _tokenContract, _dues);
    }

    /**
     * @dev Internal function to handle the logic of a deposit.
     * It transfers tokens and updates escrow state.
     */
    function _deposit(uint256 _escrowId, address _depositor, uint256 _amount) internal {
        // Retrieve the escrow from storage
        Escrow storage escrow = escrows[_escrowId];

        // Transfer the tokens from the depositor to this contract
        IERC20 token = IERC20(escrow.tokenContract);
        bool success = token.transferFrom(_depositor, address(this), _amount);
        require(success, "ERC20 transfer failed");

        // Update the state
        escrow.depositors[_depositor] += _amount;
        escrow.totalAmount += _amount;

        // Emit an event
        emit DepositMade(_escrowId, _depositor, _amount);
    }

    /**
     * @dev Allows a user to join an existing escrow by depositing funds.
     * @param _escrowId The ID of the escrow to join.
     * @param _amount The amount of tokens to deposit.
     */
    function joinEscrow(uint256 _escrowId, uint256 _amount) public {
        require(_escrowId < escrows.length, "Invalid escrow ID");
        Escrow storage escrow = escrows[_escrowId];

        // If startTime is set, ensure we are not past it
        if (escrow.startTime != 0) {
            require(block.timestamp < escrow.startTime, "Escrow has already started");
        } else {
            require(block.timestamp < escrow.endTime, "Contest has ended & closed to new entries");
        }
        
        // If dues are fixed, ensure the deposited amount matches
        if (escrow.dues > 0) {
            require(_amount == escrow.dues, "Deposit amount must equal the set dues");
        } else {
            // If dues are variable (0), just ensure some amount is deposited
            require(_amount > 0, "Deposit amount must be greater than zero");
        }

        // --- Action ---
        // Use the internal deposit function to handle the transfer and state updates
        _deposit(_escrowId, msg.sender, _amount);
    }

        /**
     * @dev Allows the organizer to distribute the funds after the contest ends.
     * This can only be called once.
     * @param _escrowId The ID of the escrow to finalize.
     * @param _recipients An array of addresses to receive funds.
     * @param _amounts An array of amounts to be sent to each recipient.
     */
    function distributeWinnings(
        uint256 _escrowId,
        address[] calldata _recipients,
        uint256[] calldata _amounts
    ) public {
        require(_escrowId < escrows.length, "Invalid escrow ID");
        Escrow storage escrow = escrows[_escrowId];

        // --- CHECKS ---
        // 1. Authorization: Only the organizer can call this.
        require(msg.sender == escrow.organizer, "Only the organizer can distribute winnings");

        // 2. Timing: The contest must have ended.
        require(block.timestamp >= escrow.endTime, "Contest has not ended yet");

        // 3. Finalization: Ensure this function can only be called once.
        require(!escrow.finalized, "Winnings have already been distributed");

        // 4. Input Validity: The arrays must have the same number of entries.
        require(_recipients.length == _amounts.length, "Recipients and amounts arrays must have the same length");

        // 5. Sum Check: The total payout amount must exactly equal the total amount in escrow.
        uint256 totalPayout;
        for (uint i = 0; i < _amounts.length; i++) {
            totalPayout += _amounts[i];
        }
        require(totalPayout == escrow.totalAmount, "Total payout must equal total amount in escrow");

        // --- EFFECTS & INTERACTIONS ---
        // Mark as finalized *before* the transfers to prevent re-entrancy attacks.
        escrow.finalized = true;

        IERC20 token = IERC20(escrow.tokenContract);
        for (uint i = 0; i < _recipients.length; i++) {
            // 6. Recipient Check: The recipient MUST have been a depositor.
            require(escrow.depositors[_recipients[i]] > 0, "A recipient was not a depositor");
            
            // Transfer the tokens.
            token.transfer(_recipients[i], _amounts[i]);
        }

        emit EscrowFinalized(_escrowId);
    }

    /**
     * @dev Returns the core details of a specific escrow pool.
     * @param _escrowId The ID of the escrow to query.
     */
    function getEscrowDetails(uint256 _escrowId)
        public
        view
        returns (
            address organizer,
            address tokenContract,
            uint256 dues,
            uint256 startTime,
            uint256 endTime,
            uint256 totalAmount,
            bool finalized
        )
    {
        require(_escrowId < escrows.length, "Invalid escrow ID");
        Escrow storage escrow = escrows[_escrowId];
        return (
            escrow.organizer,
            escrow.tokenContract,
            escrow.dues,
            escrow.startTime,
            escrow.endTime,
            escrow.totalAmount,
            escrow.finalized
        );
    }

}

