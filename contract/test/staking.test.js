const { expect } = require("chai");
const { ethers } = require("hardhat");
const bs58 = require("bs58");
const web3 = require("@solana/web3.js");

const { config } = require('./config.js');
const { createATA } = require('./createATAThroughWeb3.js');

describe("🧪 LiquidStaking Contract", function () {
    let owner, user1;
    let stakingContract;
    let WSOL, USDC;

    const WSOL_ADDRESS = config.DATA.EVM.ADDRESSES.WSOL;
    const USDC_ADDRESS = config.DATA.EVM.ADDRESSES.devUSDC;

    before(async function () {
        [owner, user1] = await ethers.getSigners();

        const LiquidStaking = await ethers.getContractFactory("LiquidStaking");
        stakingContract = await LiquidStaking.deploy(WSOL_ADDRESS, USDC_ADDRESS);
        await stakingContract.deployed();

        WSOL = await ethers.getContractAt("IERC20ForSpl", WSOL_ADDRESS);
        USDC = await ethers.getContractAt("IERC20ForSpl", USDC_ADDRESS);

        // Mint some WSOL to owner if needed (depends on setup)
        // await WSOL.mint(owner.address, ethers.utils.parseUnits("10", 9));
    });

    it("🔐 Should approve and stake WSOL", async function () {
        const stakeAmount = ethers.utils.parseUnits("0.5", 9); // 0.5 WSOL

        // Approve contract to spend WSOL
        await WSOL.connect(owner).approve(stakingContract.address, stakeAmount);

        // Stake WSOL
        const tx = await stakingContract.connect(owner).stake(stakeAmount);
        const receipt = await tx.wait();

        // Check for Staked event
        const event = receipt.events?.find(e => e.event === "Staked");
        expect(event).to.not.be.undefined;
        expect(event.args.staker).to.equal(owner.address);
        expect(event.args.wsolAmount).to.equal(stakeAmount);

        // Confirm stake recorded
        const stakeRecord = await stakingContract.stakes(owner.address);
        expect(stakeRecord.wsolAmount).to.equal(stakeAmount);

        console.log("✅ Staked:", ethers.utils.formatUnits(stakeAmount, 9), "WSOL");
    });

    it("📬 Should derive Solana ATA for user", async function () {
        const neonAddr = await stakingContract.getNeonAddress(owner.address);
        const wsolMint = await WSOL.tokenMint();

        const ata = await createATA(
            [new web3.PublicKey(bs58.encode(neonAddr))],
            [bs58.encode(ethers.getBytes(wsolMint))]
        );

        console.log("✅ ATA Created:", ata);
    });

    it("🧯 Should fail to stake 0 WSOL", async function () {
        await expect(
            stakingContract.connect(owner).stake(0)
        ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("💸 Should allow unstaking", async function () {
        const prevStake = await stakingContract.stakes(owner.address);
        expect(prevStake.wsolAmount).to.be.gt(0);

        const tx = await stakingContract.connect(owner).unstake();
        const receipt = await tx.wait();

        const event = receipt.events?.find(e => e.event === "Unstaked");
        expect(event).to.not.be.undefined;

        const updatedStake = await stakingContract.stakes(owner.address);
        expect(updatedStake.wsolAmount).to.equal(0);

        console.log("✅ Unstaked successfully");
    });

    it("🪙 Should allow claiming USDC rewards (stub)", async function () {
        // This test assumes you have logic in claim() to issue rewards
        // You may need to mock rewards for now or setup the logic in contract

        const claimable = await stakingContract.calculateReward(owner.address);
        console.log("Claimable USDC reward:", ethers.utils.formatUnits(claimable, 6));

        if (claimable.gt(0)) {
            const tx = await stakingContract.connect(owner).claim();
            await tx.wait();
            console.log("✅ Claimed USDC rewards");
        } else {
            console.log("⚠️ No claimable reward yet — skipping claim");
        }
    });
});
