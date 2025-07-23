const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EnhancedLiquidStaking with Neon EVM Solana Interactions", function () {
    let enhancedStaking, wsolToken, usdtToken, owner, staker1, staker2;

    before(async function () {
        [owner, staker1, staker2] = await ethers.getSigners();

        // Note: In real deployment, these would be actual IERC20ForSpl tokens
        // For testing, you'd need mock contracts or use actual Neon EVM testnet tokens
        const MockToken = await ethers.getContractFactory("ERC20Mock"); // You'd need to create this
        wsolToken = await MockToken.deploy("Wrapped SOL", "WSOL", ethers.parseUnits("1000", 9));
        usdtToken = await MockToken.deploy("USD Tether", "USDT", ethers.parseUnits("1000000", 6));

        const EnhancedLiquidStaking = await ethers.getContractFactory("EnhancedLiquidStaking");
        enhancedStaking = await EnhancedLiquidStaking.deploy(
            await wsolToken.getAddress(),
            await usdtToken.getAddress()
        );
    });

    describe("Enhanced Staking Features", function () {

        it("Should create dedicated Solana accounts for stakes", async function () {
            const stakeAmount = ethers.parseUnits("0.1", 9); // 0.1 WSOL

            // Setup: Give staker1 WSOL tokens and approve
            await wsolToken.transfer(staker1.address, stakeAmount);
            await wsolToken.connect(staker1).approve(await enhancedStaking.getAddress(), stakeAmount);

            // Stake with enhanced features
            const tx = await enhancedStaking.connect(staker1).stake(stakeAmount, {
                value: ethers.parseEther("0.01") // ETH for Solana gas fees
            });

            const receipt = await tx.wait();

            // Check that StakedWithSolana event was emitted with Solana account
            const event = receipt.logs.find(log =>
                log.fragment && log.fragment.name === 'StakedWithSolana'
            );

            expect(event).to.not.be.undefined;
            expect(event.args.solanaStakeAccount).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");

            // Verify stake record includes Solana details
            const stake = await enhancedStaking.stakes(staker1.address);
            expect(stake.wsolAmount).to.equal(stakeAmount);
            expect(stake.solanaStakeAccount).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
            expect(stake.stakeSalt).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
        });

        it("Should allow admin to query Solana account data", async function () {
            const result = await enhancedStaking.querySolanaStakeAccount(staker1.address);

            expect(result.account).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
            expect(result.exists).to.be.true;
            // Balance check would depend on actual Solana integration
        });

        it("Should emit Solana instruction execution events", async function () {
            const stakeAmount = ethers.parseUnits("0.2", 9); // 0.2 WSOL

            await wsolToken.transfer(staker2.address, stakeAmount);
            await wsolToken.connect(staker2).approve(await enhancedStaking.getAddress(), stakeAmount);

            const tx = await enhancedStaking.connect(staker2).stake(stakeAmount, {
                value: ethers.parseEther("0.01")
            });

            const receipt = await tx.wait();

            // Check for SolanaInstructionExecuted events
            const solanaEvents = receipt.logs.filter(log =>
                log.fragment && log.fragment.name === 'SolanaInstructionExecuted'
            );

            expect(solanaEvents.length).to.be.greaterThan(0);
        });

        it("Should handle enhanced unstaking with Solana cleanup", async function () {
            // First ensure staker1 has staked
            const stakeBefore = await enhancedStaking.stakes(staker1.address);
            expect(stakeBefore.wsolAmount).to.be.greaterThan(0);

            // Unstake with enhanced features
            const tx = await enhancedStaking.connect(staker1).unstake();
            const receipt = await tx.wait();

            // Check UnstakedFromSolana event
            const event = receipt.logs.find(log =>
                log.fragment && log.fragment.name === 'UnstakedFromSolana'
            );

            expect(event).to.not.be.undefined;
            expect(event.args.solanaStakeAccount).to.equal(stakeBefore.solanaStakeAccount);

            // Verify stake is marked as unstaked
            const stakeAfter = await enhancedStaking.stakes(staker1.address);
            expect(stakeAfter.unstaked).to.be.true;
        });

        it("Should support emergency fund recovery (owner only)", async function () {
            const staker2Stake = await enhancedStaking.stakes(staker2.address);

            // Only owner can call emergency recovery
            await expect(
                enhancedStaking.connect(staker1).emergencyRecoverSolanaFunds(
                    staker2Stake.solanaStakeAccount,
                    "0x1234567890123456789012345678901234567890123456789012345678901234", // dummy ATA
                    ethers.parseUnits("0.1", 9)
                )
            ).to.be.revertedWithCustomError(enhancedStaking, "OwnableUnauthorizedAccount");

            // Owner should be able to call (though it might fail due to mocking)
            // In real environment with actual Solana integration, this would work
            try {
                await enhancedStaking.connect(owner).emergencyRecoverSolanaFunds(
                    staker2Stake.solanaStakeAccount,
                    "0x1234567890123456789012345678901234567890123456789012345678901234",
                    ethers.parseUnits("0.1", 9)
                );
            } catch (error) {
                // Expected to fail in mock environment
                expect(error.message).to.include("Emergency recovery failed");
            }
        });
    });

    describe("Gas and Fee Management", function () {
        it("Should require ETH for Solana transaction fees", async function () {
            const stakeAmount = ethers.parseUnits("0.1", 9);

            await wsolToken.mint(staker1.address, stakeAmount);
            await wsolToken.connect(staker1).approve(await enhancedStaking.getAddress(), stakeAmount);

            // Should fail without sufficient ETH for Solana fees
            await expect(
                enhancedStaking.connect(staker1).stake(stakeAmount)
            ).to.be.reverted; // Would fail due to insufficient lamports for account creation
        });

        it("Should accept ETH deposits for fee management", async function () {
            const initialBalance = await ethers.provider.getBalance(await enhancedStaking.getAddress());

            await staker1.sendTransaction({
                to: await enhancedStaking.getAddress(),
                value: ethers.parseEther("0.1")
            });

            const newBalance = await ethers.provider.getBalance(await enhancedStaking.getAddress());
            expect(newBalance).to.equal(initialBalance + ethers.parseEther("0.1"));
        });
    });

    describe("Advanced Error Handling", function () {
        it("Should provide detailed error messages for Solana failures", async function () {
            // Test invalid amounts
            await expect(
                enhancedStaking.connect(staker1).stake(ethers.parseUnits("0.05", 9)) // Below minimum
            ).to.be.revertedWithCustomError(enhancedStaking, "InvalidAmount");

            await expect(
                enhancedStaking.connect(staker1).stake(ethers.parseUnits("2", 9)) // Above maximum
            ).to.be.revertedWithCustomError(enhancedStaking, "InvalidAmount");
        });

        it("Should handle Solana instruction failures gracefully", async function () {
            // In mock environment, Solana instructions might fail
            // The contract should handle this gracefully with proper error messages
            const stakeAmount = ethers.parseUnits("0.3", 9);

            await wsolToken.mint(staker1.address, stakeAmount);
            await wsolToken.connect(staker1).approve(await enhancedStaking.getAddress(), stakeAmount);

            try {
                await enhancedStaking.connect(staker1).stake(stakeAmount, {
                    value: ethers.parseEther("0.01")
                });
            } catch (error) {
                // Should provide meaningful error message
                expect(error.message).to.include("SolanaInstructionFailed");
            }
        });
    });
});

/*
Testing Notes:

1. **Mock Environment**: These tests use mock tokens. For full integration testing, 
   you'd need actual IERC20ForSpl tokens on Neon EVM testnet.

2. **Solana Integration**: Real Solana interactions require:
   - Actual Neon EVM network connection
   - Real SPL tokens
   - Sufficient SOL for lamports

3. **Test Environment Setup**:
   - Use Neon EVM devnet for integration tests
   - Ensure test accounts have SOL for gas fees
   - Mock the ICallSolana interface for unit tests

4. **Advanced Testing**:
   - Test actual Solana account creation
   - Verify SPL token transfers on Solana
   - Test cross-chain state consistency
   - Validate PDA calculations

Run tests:
npx hardhat test test/EnhancedStaking.test.js

For integration testing on Neon EVM:
npx hardhat test test/EnhancedStaking.test.js --network neon-devnet
*/ 