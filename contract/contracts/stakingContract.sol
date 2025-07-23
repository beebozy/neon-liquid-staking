

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import {IERC20ForSpl} from "./interfaces/IERC20ForSpl.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ICallSolana} from './precompiles/ICallSolana.sol';
import {LibAssociatedTokenData} from "./libraries/associated-token-program/LibAssociatedTokenData.sol";

contract LiquidStaking is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20ForSpl;

    ICallSolana public constant CALL_SOLANA = ICallSolana(0xFF00000000000000000000000000000000000006);
    IERC20ForSpl public immutable wsolToken;
    IERC20ForSpl public immutable usdcToken;

uint256 public constant MIN_STAKE = 0.1 * 1e9;  // 0.1 WSOL (100,000,000 lamports)
uint256 public constant MAX_STAKE = 1 * 1e9;    // 1 WSOL (1,000,000,000 lamports)
uint256 public constant STAKE_MULTIPLE = 0.1 * 1e9; // 0.1 WSOL
uint256 public constant TOKENS_PER_STAKE = 1e5; // 0.1 usdc = 100,000 (6 decimals)
   
    // Vesting parameters (30 days total, 7 day cliff)
    uint256 public constant VESTING_PERIOD = 30 minutes;
    uint256 public constant VESTING_CLIFF = 7 minutes;

    struct Stake {
        uint256 wsolAmount;
        uint256 usdcTokensGranted;
        uint256 usdcTokensClaimed;
        uint256 startTime;
        bool unstaked;
    }

    mapping(address => Stake) public stakes;

    event Staked(address indexed user, uint256 wsolAmount, uint256 usdcTokensGranted);
    event Unstaked(address indexed user, uint256 wsolAmount);
    event TokensClaimed(address indexed user, uint256 amount);
    event PayoutReceived(address indexed receiver, uint256 amount);

    error InvalidStaker();
    error InvalidAmount();
    error AlreadyStaked();
    error NothingToUnstake();
    error NothingToClaim();
    error VestingCliffNotReached();
    error SolanaTransferFailed();

    constructor(address _wsolToken, address _usdcToken) Ownable(msg.sender) {
        wsolToken = IERC20ForSpl(_wsolToken);
        usdcToken = IERC20ForSpl(_usdcToken);
    }

    /// @dev Check if amount is valid (0.1-1 WSOL and multiple of 0.1)
    function _isValidAmount(uint256 amount) internal pure returns (bool) {
        return (amount >= MIN_STAKE && 
                amount <= MAX_STAKE && 
                amount % STAKE_MULTIPLE == 0);
    }

    /// @notice Stake WSOL with vesting
    function stake(uint256 amount) external nonReentrant {
        if (msg.sender == address(0)) revert InvalidStaker();
        if (stakes[msg.sender].wsolAmount > 0) revert AlreadyStaked();
        if (!_isValidAmount(amount)) revert InvalidAmount();

        // Transfer WSOL to Solana ATA
        bytes32 wsolATA = _getAssociatedTokenAccount(wsolToken.tokenMint(), address(this));
        if (!wsolToken.transferSolana(wsolATA, uint64(amount))) {
            revert SolanaTransferFailed();
        }

// The usdc token should be 0.1 per 0.1wsol 
        // Calculate memetokens (0.1 per 0.1 WSOL)
        uint256 usdcTokens = (amount / STAKE_MULTIPLE) * TOKENS_PER_STAKE;

        stakes[msg.sender] = Stake({
            wsolAmount: amount,
            usdcTokensGranted: usdcTokens,
            usdcTokensClaimed: 0,
            startTime: block.timestamp,
            unstaked: false
        });

        emit Staked(msg.sender, amount, usdcTokens);
    }

    /// @notice Claim vested memetokens
    function claim() external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        if (block.timestamp < userStake.startTime + VESTING_CLIFF) {
            revert VestingCliffNotReached();
        }

        uint256 claimable = _calculateVestedAmount(msg.sender) - userStake.usdcTokensClaimed;
        if (claimable == 0) revert NothingToClaim();

        userStake.usdcTokensClaimed += claimable;
        usdcToken.mint(msg.sender, claimable);
        emit TokensClaimed(msg.sender, claimable);
    }

    /// @notice Unstake WSOL (ends vesting)
    function unstake() external nonReentrant {
        Stake storage userStake = stakes[msg.sender];
        if (userStake.wsolAmount == 0 || userStake.unstaked) {
            revert NothingToUnstake();
        }

        // Transfer remaining WSOL back
        bytes32 userATA = _getAssociatedTokenAccount(wsolToken.tokenMint(), msg.sender);
        if (!wsolToken.transferSolana(userATA, uint64(userStake.wsolAmount))) {
            revert SolanaTransferFailed();
        }

        userStake.unstaked = true;
        emit Unstaked(msg.sender, userStake.wsolAmount);
    }

    /// @dev Calculate vested amount (linear vesting)
    function _calculateVestedAmount(address user) internal view returns (uint256) {
        Stake storage userStake = stakes[user];
        if (block.timestamp < userStake.startTime + VESTING_CLIFF) {
            return 0;
        }

        uint256 elapsed = block.timestamp - userStake.startTime;
        if (elapsed >= VESTING_PERIOD || userStake.unstaked) {
            return userStake.usdcTokensGranted;
        }

        return (userStake.usdcTokensGranted * elapsed) / VESTING_PERIOD;
    }

    /// @notice Withdraw fees to Solana address (owner only)
    function withdrawFeesToSolana(bytes32 solanaRecipient, uint64 amount) external onlyOwner {
        bytes32 wsolATA = _getAssociatedTokenAccount(wsolToken.tokenMint(), address(this));
        if (!wsolToken.transferSolana(solanaRecipient, amount)) {
            revert SolanaTransferFailed();
        }
        emit PayoutReceived(address(0), amount);
    }

    /// @notice Get Associated Token Account (ATA) on Solana
    function _getAssociatedTokenAccount(bytes32 tokenMint, address evmOwner) internal view returns (bytes32) {
        return LibAssociatedTokenData.getAssociatedTokenAccount(
            tokenMint,
            CALL_SOLANA.getNeonAddress(evmOwner)
        );
    }

    // Utility functions
    function getNeonAddress(address _address) public view returns (bytes32) {
        return CALL_SOLANA.getNeonAddress(_address);
    }

    function getPayer() public view returns (bytes32) {
        return CALL_SOLANA.getPayer();
    }
}


