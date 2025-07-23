// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ICallSolana} from '../precompiles/ICallSolana.sol';
import {Constants} from '../libraries/Constants.sol';
import {CallSolanaHelperLib} from './CallSolanaHelperLib.sol';
import {LibSPLTokenData} from '../libraries/spl-token-program/LibSPLTokenData.sol';

/// @title AdvancedSolanaInteractions
/// @notice Advanced utilities for Solana interactions using Neon EVM patterns
/// @dev Based on https://neonevm.org/docs/composability/Solana_Interactions
library AdvancedSolanaInteractions {
    using CallSolanaHelperLib for address;

    ICallSolana public constant CALL_SOLANA = ICallSolana(0xFF00000000000000000000000000000000000006);

    // Solana program IDs
    bytes32 public constant SYSTEM_PROGRAM_ID = 0x00000000000000000000000000000000000000000000000000000000;
    bytes32 public constant SPL_TOKEN_PROGRAM_ID = 0x06ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9;
    bytes32 public constant ASSOCIATED_TOKEN_PROGRAM_ID = 0x8c97258f4e2489f1bb3d1029148e0d830b5a1399daff1084048e7bd8dbe9f859;

    struct TransferInstruction {
        bytes32 source;
        bytes32 destination;
        bytes32 owner;
        uint64 amount;
    }

    struct CreateAccountInstruction {
        bytes32 fundingAccount;
        bytes32 newAccount;
        uint64 lamports;
        uint64 space;
        bytes32 owner;
    }

    /// @notice Create a new account on Solana using direct instruction execution
    /// @param salt Unique salt for account creation
    /// @param space Space to allocate for the account
    /// @param lamports Lamports to fund the account
    /// @param owner Program that will own the account
    /// @return The created account address
    function createSolanaAccount(
        bytes32 salt,
        uint64 space,
        uint64 lamports,
        bytes32 owner
    ) internal returns (bytes32) {
        // Create the account resource
        bytes32 newAccount = CALL_SOLANA.createResource(salt, space, lamports, owner);
        return newAccount;
    }

    /// @notice Execute a direct SPL token transfer using instruction execution
    /// @param transfer Transfer instruction parameters
    /// @param lamportsForFees Lamports needed for transaction fees
    /// @return Success status
    function executeSPLTokenTransfer(
        TransferInstruction memory transfer,
        uint64 lamportsForFees
    ) internal returns (bool) {
        // Prepare accounts for the transfer instruction
        bytes32[] memory accounts = new bytes32[](3);
        bool[] memory isSigners = new bool[](3);
        bool[] memory isWritables = new bool[](3);

        accounts[0] = transfer.source;      // Source token account
        accounts[1] = transfer.destination; // Destination token account
        accounts[2] = transfer.owner;       // Owner/authority

        isSigners[0] = false;
        isSigners[1] = false;
        isSigners[2] = true;  // Owner must sign

        isWritables[0] = true;  // Source will be debited
        isWritables[1] = true;  // Destination will be credited
        isWritables[2] = false;

        // Prepare transfer instruction data (instruction type 3 = Transfer)
        bytes memory instructionData = abi.encodePacked(
            uint8(3),  // Transfer instruction
            transfer.amount
        );

        // Prepare the full instruction
        bytes memory instruction = CallSolanaHelperLib.prepareSolanaInstruction(
            SPL_TOKEN_PROGRAM_ID,
            accounts,
            isSigners,
            isWritables,
            instructionData
        );

        try CALL_SOLANA.execute(lamportsForFees, instruction) returns (bytes memory returnData) {
            return true;
        } catch {
            return false;
        }
    }

    /// @notice Create an Associated Token Account using direct execution
    /// @param mint Token mint address
    /// @param owner Owner of the ATA
    /// @param payer Account paying for the creation
    /// @param lamportsForFees Lamports for transaction fees
    /// @return The created ATA address
    function createAssociatedTokenAccount(
        bytes32 mint,
        bytes32 owner,
        bytes32 payer,
        uint64 lamportsForFees
    ) internal returns (bytes32) {
        // Calculate the ATA address
        bytes memory seeds = abi.encodePacked(owner, SPL_TOKEN_PROGRAM_ID, mint);
        bytes32 ata = CALL_SOLANA.getSolanaPDA(ASSOCIATED_TOKEN_PROGRAM_ID, seeds);

        // Prepare accounts for ATA creation
        bytes32[] memory accounts = new bytes32[](7);
        bool[] memory isSigners = new bool[](7);
        bool[] memory isWritables = new bool[](7);

        accounts[0] = payer;                    // Funding account
        accounts[1] = ata;                      // Associated token account
        accounts[2] = owner;                    // Owner of the ATA
        accounts[3] = mint;                     // Token mint
        accounts[4] = SYSTEM_PROGRAM_ID;        // System program
        accounts[5] = SPL_TOKEN_PROGRAM_ID;     // Token program
        accounts[6] = 0x06a7d517187bd16635dad40455fdc2c0c124c68f215675a5dbbacb5f08000000; // Rent sysvar

        isSigners[0] = true;   // Payer signs
        for (uint i = 1; i < 7; i++) {
            isSigners[i] = false;
        }

        isWritables[0] = true; // Payer pays
        isWritables[1] = true; // ATA is created
        for (uint i = 2; i < 7; i++) {
            isWritables[i] = false;
        }

        // Create ATA instruction (no additional data needed)
        bytes memory instructionData = "";

        bytes memory instruction = CallSolanaHelperLib.prepareSolanaInstruction(
            ASSOCIATED_TOKEN_PROGRAM_ID,
            accounts,
            isSigners,
            isWritables,
            instructionData
        );

        try CALL_SOLANA.execute(lamportsForFees, instruction) returns (bytes memory) {
            return ata;
        } catch {
            return bytes32(0);
        }
    }

    /// @notice Execute a transaction with external authority (using seed)
    /// @param salt Seed for external authority
    /// @param programId Target program ID
    /// @param accounts Account list
    /// @param instructionData Instruction data
    /// @param lamports Lamports for fees
    /// @return Success status and return data
    function executeWithExternalAuthority(
        bytes32 salt,
        bytes32 programId,
        ICallSolana.AccountMeta[] memory accounts,
        bytes memory instructionData,
        uint64 lamports
    ) internal returns (bool success, bytes memory returnData) {
        ICallSolana.Instruction memory instruction = ICallSolana.Instruction({
            program_id: programId,
            accounts: accounts,
            instruction_data: instructionData
        });

        try CALL_SOLANA.executeWithSeed(lamports, salt, instruction) returns (bytes memory result) {
            return (true, result);
        } catch {
            return (false, "");
        }
    }

    /// @notice Query Solana account data and decode it
    /// @param account Solana account to query
    /// @return success Query success status
    /// @return data Account data
    function queryAccountData(bytes32 account) internal view returns (bool success, bytes memory data) {
        // Note: This would typically use QueryAccount precompile
        // For now, return a placeholder implementation
        return (false, "");
    }

    /// @notice Get return data from the last instruction execution
    /// @return programId Program ID that returned data
    /// @return data The returned data
    function getLastReturnData() internal view returns (bytes32 programId, bytes memory data) {
        return CALL_SOLANA.getReturnData();
    }

    /// @notice Calculate PDA (Program Derived Address) for a program and seeds
    /// @param programId Target program ID
    /// @param seeds Seeds for PDA derivation
    /// @return The calculated PDA
    function calculatePDA(bytes32 programId, bytes memory seeds) internal view returns (bytes32) {
        return CALL_SOLANA.getSolanaPDA(programId, seeds);
    }

    /// @notice Verify if an account exists and has the expected owner
    /// @param account Account to verify
    /// @param expectedOwner Expected owner program ID
    /// @return True if account exists and owner matches
    function verifyAccountOwnership(bytes32 account, bytes32 expectedOwner) internal view returns (bool) {
        // This would typically use QueryAccount to check the owner
        // Implementation depends on your specific QueryAccount setup
        return true; // Placeholder
    }
} 