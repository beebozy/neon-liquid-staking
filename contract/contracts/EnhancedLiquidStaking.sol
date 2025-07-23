// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20ForSpl} from "./interfaces/IERC20ForSpl.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICallSolana} from './precompiles/ICallSolana.sol';
import {AdvancedSolanaInteractions} from './utils/AdvancedSolanaInteractions.sol';
import {CallSolanaHelperLib} from './utils/CallSolanaHelperLib.sol';
import {LibAssociatedTokenData} from "./libraries/associated-token-program/LibAssociatedTokenData.sol";
import {LibSPLTokenData} from "./libraries/spl-token-program/LibSPLTokenData.sol";

/// @title EnhancedLiquidStaking
/// @notice Advanced liquid staking contract using Neon EVM's Solana interaction patterns
/// @dev Implements patterns from https://neonevm.org/docs/composability/Solana_Interactions
contract EnhancedLiquidStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20ForSpl;

    ICallSolana public constant CALL_SOLANA = ICallSolana(0xFF00000000000000000000000000000000000006);
    IERC20ForSpl public immutable wsolToken;
    IERC20ForSpl public immutable usdtToken;

    // Enhanced constants with Neon EVM integration
    uint256 public constant MIN_STAKE = 0.1 * 1e9;  // 0.1 WSOL
    uint256 public constant MAX_STAKE = 1 * 1e9;    // 1 WSOL
    uint256 public constant STAKE_MULTIPLE = 0.1 * 1e9;
    uint256 public constant TOKENS_PER_STAKE = 1e5; // 0.1 USDT
    uint256 public constant VESTING_PERIOD = 30 minutes;
    uint256 public constant VESTING_CLIFF = 7 minutes;

    // Solana interaction parameters
    uint64 public constant LAMPORTS_FOR_ACCOUNT_CREATION = 5000000; // ~0.005 SOL
    uint64 public constant LAMPORTS_FOR_TRANSACTIONS = 1000000;     // ~0.001 SOL

    struct EnhancedStake {
        uint256 wsolAmount;
        uint256 usdtTokensGranted;
        uint256 usdtTokensClaimed;
        uint256 startTime;
        bool unstaked;
        bytes32 solanaStakeAccount;  // Dedicated Solana account for this stake
        bytes32 stakeSalt;           // Salt used for account creation
    }

    mapping(address => EnhancedStake) public stakes;
    mapping(bytes32 => address) public solanaAccountToStaker; // Reverse mapping

    // Events with Solana integration details
    event StakedWithSolana(
        address indexed user, 
        uint256 wsolAmount, 
        uint256 usdtTokensGranted,
        bytes32 indexed solanaStakeAccount
    );
    event UnstakedFromSolana(
        address indexed user, 
        uint256 wsolAmount,
        bytes32 indexed solanaStakeAccount
    );
    event SolanaInstructionExecuted(
        bytes32 indexed programId,
        bytes32 indexed account,
        bool success
    );

    error InvalidStaker();
    error InvalidAmount();
    error AlreadyStaked();
    error NothingToUnstake();
    error NothingToClaim();
    error VestingCliffNotReached();
    error SolanaInstructionFailed(string reason);
    error AccountCreationFailed();

    constructor(address _wsolToken, address _usdtToken) Ownable(msg.sender) {
        wsolToken = IERC20ForSpl(_wsolToken);
        usdtToken = IERC20ForSpl(_usdtToken);
    }

    /// @notice Enhanced stake function with direct Solana instruction execution
    function stake(uint256 amount) external payable nonReentrant {
        if (msg.sender == address(0)) revert InvalidStaker();
        if (stakes[msg.sender].wsolAmount > 0) revert AlreadyStaked();
        if (!_isValidAmount(amount)) revert InvalidAmount();

        // Generate unique salt for this staker's Solana account
        bytes32 stakeSalt = keccak256(abi.encodePacked(msg.sender, block.timestamp, amount));

        // Step 1: Create dedicated Solana account for this stake
        bytes32 stakeAccount = _createStakeAccount(stakeSalt);
        if (stakeAccount == bytes32(0)) revert AccountCreationFailed();

        // Step 2: Execute advanced WSOL transfer to dedicated account
        if (!_executeAdvancedWSolTransfer(amount, stakeAccount)) {
            revert SolanaInstructionFailed("WSOL transfer failed");
        }

        // Step 3: Create stake record with Solana integration
        uint256 usdtTokens = (amount / STAKE_MULTIPLE) * TOKENS_PER_STAKE;
        
        stakes[msg.sender] = EnhancedStake({
            wsolAmount: amount,
            usdtTokensGranted: usdtTokens,
            usdtTokensClaimed: 0,
            startTime: block.timestamp,
            unstaked: false,
            solanaStakeAccount: stakeAccount,
            stakeSalt: stakeSalt
        });

        solanaAccountToStaker[stakeAccount] = msg.sender;

        emit StakedWithSolana(msg.sender, amount, usdtTokens, stakeAccount);
    }

    /// @notice Enhanced unstake with Solana state cleanup
    function unstake() external nonReentrant {
        EnhancedStake storage userStake = stakes[msg.sender];
        if (userStake.wsolAmount == 0 || userStake.unstaked) {
            revert NothingToUnstake();
        }

        // Execute advanced WSOL transfer back to user
        bytes32 userATA = _getAssociatedTokenAccount(wsolToken.tokenMint(), msg.sender);
        
        if (!_executeAdvancedWSolTransferFromAccount(
            userStake.solanaStakeAccount,
            userATA,
            uint64(userStake.wsolAmount)
        )) {
            revert SolanaInstructionFailed("WSOL return transfer failed");
        }

        // Clean up Solana state
        _cleanupSolanaAccount(userStake.solanaStakeAccount, userStake.stakeSalt);

        userStake.unstaked = true;
        emit UnstakedFromSolana(msg.sender, userStake.wsolAmount, userStake.solanaStakeAccount);
    }

    /// @notice Enhanced claim with Solana state verification
    function claim() external nonReentrant {
        EnhancedStake storage userStake = stakes[msg.sender];
        if (block.timestamp < userStake.startTime + VESTING_CLIFF) {
            revert VestingCliffNotReached();
        }

        // Verify Solana account state before claiming
        if (!_verifySolanaAccountState(userStake.solanaStakeAccount)) {
            revert SolanaInstructionFailed("Solana state verification failed");
        }

        uint256 claimable = _calculateVestedAmount(msg.sender) - userStake.usdtTokensClaimed;
        if (claimable == 0) revert NothingToClaim();

        userStake.usdtTokensClaimed += claimable;
        usdtToken.mint(msg.sender, claimable);

        emit TokensClaimed(msg.sender, claimable);
    }

    /// @notice Create a dedicated Solana account for staking
    function _createStakeAccount(bytes32 salt) internal returns (bytes32) {
        try AdvancedSolanaInteractions.createSolanaAccount(
            salt,
            165, // SPL token account size
            LAMPORTS_FOR_ACCOUNT_CREATION,
            AdvancedSolanaInteractions.SPL_TOKEN_PROGRAM_ID
        ) returns (bytes32 account) {
            emit SolanaInstructionExecuted(
                AdvancedSolanaInteractions.SPL_TOKEN_PROGRAM_ID,
                account,
                true
            );
            return account;
        } catch {
            emit SolanaInstructionExecuted(
                AdvancedSolanaInteractions.SPL_TOKEN_PROGRAM_ID,
                bytes32(0),
                false
            );
            return bytes32(0);
        }
    }

    /// @notice Execute advanced WSOL transfer using direct instructions
    function _executeAdvancedWSolTransfer(
        uint256 amount, 
        bytes32 destinationAccount
    ) internal returns (bool) {
        bytes32 sourceATA = _getAssociatedTokenAccount(wsolToken.tokenMint(), msg.sender);
        bytes32 authority = CALL_SOLANA.getNeonAddress(address(this));

        AdvancedSolanaInteractions.TransferInstruction memory transfer = 
            AdvancedSolanaInteractions.TransferInstruction({
                source: sourceATA,
                destination: destinationAccount,
                owner: authority,
                amount: uint64(amount)
            });

        return AdvancedSolanaInteractions.executeSPLTokenTransfer(
            transfer,
            LAMPORTS_FOR_TRANSACTIONS
        );
    }

    /// @notice Execute WSOL transfer from stake account back to user
    function _executeAdvancedWSolTransferFromAccount(
        bytes32 sourceAccount,
        bytes32 destinationATA,
        uint64 amount
    ) internal returns (bool) {
        bytes32 authority = CALL_SOLANA.getNeonAddress(address(this));

        AdvancedSolanaInteractions.TransferInstruction memory transfer = 
            AdvancedSolanaInteractions.TransferInstruction({
                source: sourceAccount,
                destination: destinationATA,
                owner: authority,
                amount: amount
            });

        return AdvancedSolanaInteractions.executeSPLTokenTransfer(
            transfer,
            LAMPORTS_FOR_TRANSACTIONS
        );
    }

    /// @notice Cleanup Solana account state after unstaking
    function _cleanupSolanaAccount(bytes32 account, bytes32 salt) internal {
        // Execute account cleanup using external authority
        ICallSolana.AccountMeta[] memory accounts = new ICallSolana.AccountMeta[](2);
        accounts[0] = ICallSolana.AccountMeta({
            account: account,
            is_signer: false,
            is_writable: true
        });
        accounts[1] = ICallSolana.AccountMeta({
            account: CALL_SOLANA.getNeonAddress(msg.sender),
            is_signer: true,
            is_writable: false
        });

        bytes memory cleanupData = abi.encodePacked(uint8(9)); // Close account instruction

        (bool success, ) = AdvancedSolanaInteractions.executeWithExternalAuthority(
            salt,
            AdvancedSolanaInteractions.SPL_TOKEN_PROGRAM_ID,
            accounts,
            cleanupData,
            LAMPORTS_FOR_TRANSACTIONS
        );

        emit SolanaInstructionExecuted(
            AdvancedSolanaInteractions.SPL_TOKEN_PROGRAM_ID,
            account,
            success
        );
    }

    /// @notice Verify Solana account state for security
    function _verifySolanaAccountState(bytes32 account) internal view returns (bool) {
        return AdvancedSolanaInteractions.verifyAccountOwnership(
            account,
            AdvancedSolanaInteractions.SPL_TOKEN_PROGRAM_ID
        );
    }

    /// @notice Get Associated Token Account with error handling
    function _getAssociatedTokenAccount(bytes32 tokenMint, address evmOwner) internal view returns (bytes32) {
        return LibAssociatedTokenData.getAssociatedTokenAccount(
            tokenMint,
            CALL_SOLANA.getNeonAddress(evmOwner)
        );
    }

    /// @notice Validate stake amount
    function _isValidAmount(uint256 amount) internal pure returns (bool) {
        return (amount >= MIN_STAKE && 
                amount <= MAX_STAKE && 
                amount % STAKE_MULTIPLE == 0);
    }

    /// @notice Calculate vested amount with Solana state consideration
    function _calculateVestedAmount(address user) internal view returns (uint256) {
        EnhancedStake storage userStake = stakes[user];
        if (block.timestamp < userStake.startTime + VESTING_CLIFF) {
            return 0;
        }

        uint256 elapsed = block.timestamp - userStake.startTime;
        if (elapsed >= VESTING_PERIOD || userStake.unstaked) {
            return userStake.usdtTokensGranted;
        }

        return (userStake.usdtTokensGranted * elapsed) / VESTING_PERIOD;
    }

    /// @notice Admin function to query Solana account data
    function querySolanaStakeAccount(address staker) 
        external 
        view 
        onlyOwner 
        returns (bytes32 account, bool exists, uint64 balance) 
    {
        EnhancedStake storage stake = stakes[staker];
        account = stake.solanaStakeAccount;
        
        if (account != bytes32(0)) {
            exists = true;
            balance = LibSPLTokenData.getSPLTokenAccountBalance(account);
        }
    }

    /// @notice Emergency function to recover stuck funds from Solana accounts
    function emergencyRecoverSolanaFunds(
        bytes32 stakeAccount, 
        bytes32 destinationATA,
        uint64 amount
    ) external onlyOwner {
        require(solanaAccountToStaker[stakeAccount] != address(0), "Invalid stake account");

        // Use external authority for emergency recovery
        bytes32 emergencySalt = keccak256(abi.encodePacked("emergency", block.timestamp));
        
        AdvancedSolanaInteractions.TransferInstruction memory emergencyTransfer = 
            AdvancedSolanaInteractions.TransferInstruction({
                source: stakeAccount,
                destination: destinationATA,
                owner: CALL_SOLANA.getExtAuthority(emergencySalt),
                amount: amount
            });

        bool success = AdvancedSolanaInteractions.executeSPLTokenTransfer(
            emergencyTransfer,
            LAMPORTS_FOR_TRANSACTIONS
        );

        require(success, "Emergency recovery failed");
    }

    // Events
    event TokensClaimed(address indexed user, uint256 amount);

    // Receive function to accept ETH for gas fees
    receive() external payable {}
} 