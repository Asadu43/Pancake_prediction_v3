const { network, ethers, deployments } = require("hardhat");
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import exp from "constants";
import { Contract, BigNumber, Signer, constants } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre from "hardhat";

describe.only("Pancake NFT Market ", function async() {
  let signers: Signer[];

  let token: Contract;
  let aggregator: Contract;
  let pancakePrediction: Contract;

  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let buser1: SignerWithAddress;
  let buser2: SignerWithAddress;
  let buser3: SignerWithAddress;

  let MockERC20: any;
  let MockAggregatorV3: any;
  let PancakePredictionV3: any;

  const DECIMALS = 8; // Chainlink default for CAKE/USD
  const INITIAL_PRICE = 10000000000; // $100, 8 decimal places

  before(async () => {
    [owner, user, user2, user3, buser1, buser2, buser3] = await ethers.getSigners();

    hre.tracer.nameTags[owner.address] = "ADMIN";
    hre.tracer.nameTags[user.address] = "USER1";
    hre.tracer.nameTags[user2.address] = "USER2";

    MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Asad", "ASD", parseEther("100000"));

    MockAggregatorV3 = await ethers.getContractFactory("MockAggregatorV3");
    aggregator = await MockAggregatorV3.deploy(DECIMALS, INITIAL_PRICE);

    PancakePredictionV3 = await ethers.getContractFactory("PancakePredictionV3");
    pancakePrediction = await PancakePredictionV3.deploy(token.address, aggregator.address, owner.address, owner.address, 100, 25, parseEther("1"), 150, 1000);
  });

  async function increaseTime(duration: number): Promise<void> {
    ethers.provider.send("evm_increaseTime", [duration]);
    ethers.provider.send("evm_mine", []);
  }

  it("Not operator (Only Operator Can Start Round)", async () => {
    await expect(pancakePrediction.connect(user).genesisStartRound()).to.revertedWith("Not operator");

    // await pancakePrediction.genesisLockRound();
  });

  it("Can only run after genesisStartRound is triggered", async () => {
    await expect(pancakePrediction.genesisLockRound()).to.be.revertedWith("Can only run after genesisStartRound is triggered");
  });

  it("Can only run after genesisStartRound and genesisLockRound is triggered", async () => {
    await expect(pancakePrediction.executeRound()).to.be.revertedWith("Can only run after genesisStartRound and genesisLockRound is triggered");
  });

  it("Start Round", async () => {
    await pancakePrediction.genesisStartRound();
  });

  it("User Only Trying To Bet(ERC20: insufficient allowance)", async () => {
    await expect(pancakePrediction.connect(user).betBull(1, parseEther("1.1"))).to.be.revertedWith("ERC20: insufficient allowance");
  });

  it("Mint Token and Approve", async () => {
    for (let owner of [user, user2, user3, buser1, buser2, buser3]) {
      await token.connect(owner).mintTokens(parseEther("100"));
      await token.connect(owner).approve(pancakePrediction.address, parseEther("100"));
    }
  });

  it("Can only lock round after lockTimestamp", async () => {
    await expect(pancakePrediction.genesisLockRound()).to.be.revertedWith("Can only lock round after lockTimestamp");
  });

  it("Can only lock round after lockTimestamp", async () => {
    // Skip Time
    await increaseTime(100);
    await pancakePrediction.genesisLockRound();
  });

  it("Oracle update roundId must be larger than oracleLatestRoundId", async () => {
    await expect(pancakePrediction.executeRound()).to.be.revertedWith("Oracle update roundId must be larger than oracleLatestRoundId");
  });

  it("Change Oracle Id (Can only lock round after lockTimestamp)", async () => {
    await aggregator.updateAnswer(INITIAL_PRICE);
    await expect(pancakePrediction.executeRound()).to.be.revertedWith("Can only lock round after lockTimestamp");
  });
  it("Change Oracle Id (Can only lock round after lockTimestamp)", async () => {
    await increaseTime(100);
    await aggregator.updateAnswer(INITIAL_PRICE);
    await pancakePrediction.executeRound();
  });

  it("Start Bet For Round 1(Bet is too early/late)", async () => {
    await expect(pancakePrediction.connect(user).betBull(1, parseEther("1.2"))).to.be.revertedWith("Bet is too early/late");
    await expect(pancakePrediction.connect(user2).betBull(1, parseEther("1.4"))).to.be.revertedWith("Bet is too early/late");
    await expect(pancakePrediction.connect(buser1).betBear(1, parseEther("1.4"))).that.be.revertedWith("Bet is too early/late");

    // Because Round 1 is already Finished
  });

  it("Start Bet For Round 2(Bet is too early/late)", async () => {
    await expect(pancakePrediction.connect(user).betBull(2, parseEther("1.2"))).to.be.revertedWith("Bet is too early/late");
    await expect(pancakePrediction.connect(user2).betBull(2, parseEther("1.4"))).to.be.revertedWith("Bet is too early/late");
    await expect(pancakePrediction.connect(buser1).betBear(2, parseEther("1.4"))).that.be.revertedWith("Bet is too early/late");

    // Because Round 2 is already Finished and Current Round is 3
  });

  it("Start Bet For Round 3 (We Can Bet in this Round Because Round There is Started and Not Finish Yet)", async () => {
    await pancakePrediction.connect(user).betBull(3, parseEther("1.2"));
    await pancakePrediction.connect(user2).betBull(3, parseEther("1.4"));
    await pancakePrediction.connect(buser1).betBear(3, parseEther("2.1"));
  });

  it("Start Bet For Round 4(We cannot Start bet Because Round 4 Not Start Yet)", async () => {
    await expect(pancakePrediction.connect(user).betBull(4, parseEther("1.2"))).to.be.revertedWith("Bet is too early/late");
    await expect(pancakePrediction.connect(user2).betBull(4, parseEther("1.4"))).to.be.revertedWith("Bet is too early/late");
    await expect(pancakePrediction.connect(buser1).betBear(4, parseEther("1.4"))).that.be.revertedWith("Bet is too early/late");
  });

  it("Change Oracle Id (Can only lock round after lockTimestamp)", async () => {
    await expect(pancakePrediction.executeRound()).to.be.revertedWith("Oracle update roundId must be larger than oracleLatestRoundId");

    await aggregator.updateAnswer(9000000000);

    await expect(pancakePrediction.executeRound()).to.be.revertedWith("Can only lock round after lockTimestamp");

    await increaseTime(100);

    await pancakePrediction.executeRound();

    console.log(await token.balanceOf(pancakePrediction.address));
  });

  it("Start Bet For Round 4 (We Can Bet in this Round Because Round There is Started and Not Finish Yet)", async () => {
    await pancakePrediction.connect(user).betBull(4, parseEther("1.5"));
    await pancakePrediction.connect(user2).betBull(4, parseEther("1.7"));
    await pancakePrediction.connect(buser1).betBear(4, parseEther("2.3"));
  });

  it("Change Oracle Id", async () => {
    await increaseTime(100);
    await aggregator.updateAnswer(INITIAL_PRICE);
    await pancakePrediction.executeRound();
  });

  it("Check Reward Claimable or Not", async () => {
    expect(await pancakePrediction.claimable(3, user.address)).to.be.equal(true);

    expect(await pancakePrediction.claimable(3, user2.address)).to.be.equal(true);

    expect(await pancakePrediction.claimable(3, buser1.address)).to.be.equal(false);

  });

  it("Claim Reward Of Round 3 (Claim Only user and user2 Because BetBull WIN)", async () => {
    await pancakePrediction.connect(user).claim([3]);
    await pancakePrediction.connect(user2).claim([3]);
    await expect(pancakePrediction.connect(buser1).claim([3])).to.be.revertedWith("ot eligible for claim");
  });

  it("Change Oracle Id", async () => {
    await increaseTime(100);
    await aggregator.updateAnswer(9000000000);
    await pancakePrediction.executeRound();
  });

  it("Check Reward Claimable or Not", async () => {
    expect(await pancakePrediction.claimable(4, user.address)).to.be.equal(false);

    expect(await pancakePrediction.claimable(4, user2.address)).to.be.equal(false);

    expect(await pancakePrediction.claimable(4, buser1.address)).to.be.equal(true);
  });

  it("Claim Reward Round 4 (Claim Only Buser1 Because BetBear WIN)", async () => {
    await expect(pancakePrediction.connect(user).claim([4])).to.be.revertedWith("Not eligible for claim");
    await expect(pancakePrediction.connect(user2).claim([4])).to.be.revertedWith("Not eligible for claim");
    await pancakePrediction.connect(buser1).claim([4]);
  });

  it("Owner Recover Treasery Amount", async () => {
    await pancakePrediction.claimTreasury();
  });

  it("Set Allownce(Pausable: not paused)", async () => {
    await expect(pancakePrediction.setOracleUpdateAllowance(200)).to.be.revertedWith("Pausable: not paused");
  });

  it("Set Pause", async () => {
    await pancakePrediction.pause();
  });

  it("Set Allownce", async () => {
    await pancakePrediction.setOracleUpdateAllowance(200);
  });


  it("Start Round (Pausable: paused)", async () => {
    await expect(pancakePrediction.genesisStartRound()).to.be.revertedWith("Pausable: paused");
  });


  it("Set Unpause", async () => {
    await pancakePrediction.unpause();
  });

  it("Start Round", async () => {
    await pancakePrediction.genesisStartRound();
  });

  it("Can only lock round after lockTimestamp", async () => {
    // Skip Time
    await increaseTime(100);
    await aggregator.updateAnswer(9000000000);
    await pancakePrediction.genesisLockRound();
  });


  it("Change Oracle Id", async () => {
    await increaseTime(100);
    await aggregator.updateAnswer(9000000000);
    await pancakePrediction.executeRound();
  });


  // it("Should start genesis rounds",async ()=>{

  //   await pancakePrediction.genesisStartRound();

  //   await increaseTime(100);

  //   await pancakePrediction.genesisLockRound();
  //   const currentEpoch = await pancakePrediction.currentEpoch();

  //   console.log("hhhhhh",currentEpoch);

  // await pancakePrediction.connect(user).betBull(currentEpoch, parseEther("1.1"))
  // await pancakePrediction.connect(user2).betBull(currentEpoch, parseEther("1.2"))
  // await pancakePrediction.connect(user3).betBear(currentEpoch, parseEther("1.4"))

  //   await increaseTime(100);
  // await aggregator.updateAnswer(INITIAL_PRICE);
  //   await pancakePrediction.executeRound();
  //   await increaseTime(100);

  //   await aggregator.updateAnswer(12000000000);
  //   await pancakePrediction.executeRound();

  //  console.log("Hellllo",currentEpoch)
  //  console.log(await token.balanceOf(pancakePrediction.address))
  //   // await pancakePrediction.executeRound();

  //  console.log(await pancakePrediction.claimable(2, user.address))
  //  console.log(await pancakePrediction.claimable(2, user2.address))
  //  console.log(await pancakePrediction.claimable(2, user3.address))

  // await pancakePrediction.connect(user).claim([2]);
  // await pancakePrediction.connect(user2).claim([2]);
  // // await pancakePrediction.connect(user3).claim([2]); Not eligible for claim

  // await pancakePrediction.claimTreasury()

  // // await pancakePrediction.pause();

  // // await pancakePrediction.setOracleUpdateAllowance(200);

  // // await pancakePrediction.unpause();

  // // await pancakePrediction.genesisStartRound();
  // // await increaseTime(100);
  // // await aggregator.updateAnswer(10000000000);
  // // await pancakePrediction.genesisLockRound();
  // await increaseTime(110);
  // await aggregator.updateAnswer(13000000000);

  // await pancakePrediction.executeRound();

  // await pancakePrediction.connect(user).betBull(5, parseEther("2.1"))
  // await pancakePrediction.connect(user2).betBull(5, parseEther("2.2"))
  // await pancakePrediction.connect(user3).betBear(5, parseEther("3.4"))

  // await increaseTime(100);
  // await aggregator.updateAnswer(10000000000);
  // await pancakePrediction.executeRound();
  // await increaseTime(100);
  // await aggregator.updateAnswer(9000000000);
  // await pancakePrediction.executeRound();
  // console.log(await pancakePrediction.claimable(5, user.address))
  // console.log(await pancakePrediction.claimable(5, user2.address))
  // console.log(await pancakePrediction.claimable(5, user3.address))

  // await increaseTime(100);

  // console.log(await pancakePrediction.currentEpoch());
  // await aggregator.updateAnswer(10000000000);
  // await pancakePrediction.executeRound();

  // // await increaseTime(100);
  // // await aggregator.updateAnswer(10000000000);
  // // await pancakePrediction.executeRound();
  // // console.log(await pancakePrediction.currentEpoch());

  // await pancakePrediction.connect(user).betBull(8, parseEther("2.1"))
  // await pancakePrediction.connect(user2).betBull(8, parseEther("2.2"))
  // await pancakePrediction.connect(user3).betBear(8, parseEther("3.4"))

  //   await increaseTime(100);
  // await aggregator.updateAnswer(11000000000);
  // await pancakePrediction.executeRound();

  // await pancakePrediction.connect(user).betBull(9, parseEther("2.1"))
  // await pancakePrediction.connect(user2).betBull(9, parseEther("2.2"))
  // await pancakePrediction.connect(user3).betBear(9, parseEther("3.4"))

  // await increaseTime(100);
  // await aggregator.updateAnswer(9000000000);
  // await pancakePrediction.executeRound();
  //   // await increaseTime(100);

  //   // await pancakePrediction.genesisStartRound();

  //   // await pancakePrediction.genesisStartRound();
  //   // await pancakePrediction.genesisLockRound();
  //   // await pancakePrediction.executeRound();

  //   // console.log(await pancakePrediction.rounds(4))
  //   // console.log((await pancakePrediction.rounds(1)).startTimestamp)
  //   // console.log((await pancakePrediction.rounds(1)).closeTimestamp)

  // })
});
