const { network, ethers, deployments } = require("hardhat");
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { Contract, BigNumber, Signer, constants } from "ethers";
import { parseEther } from "ethers/lib/utils";
import hre from "hardhat";

describe.only("Pancake NFT Market ", function async() {
  let signers: Signer[];

  let token: Contract;
  let aggregator: Contract;
  let pancakePrediction:Contract;

  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let buser1: SignerWithAddress;
  let buser2: SignerWithAddress;
  let buser3: SignerWithAddress;


  let MockERC20 : any;
  let MockAggregatorV3: any;
  let PancakePredictionV3 : any;

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
    aggregator = await MockAggregatorV3.deploy(DECIMALS,INITIAL_PRICE);

    PancakePredictionV3 = await ethers.getContractFactory("PancakePredictionV3");
    pancakePrediction = await PancakePredictionV3.deploy(token.address,aggregator.address,owner.address,owner.address,100,25,parseEther("1"),150,1000)


  });

  async function increaseTime(duration: number): Promise<void> {
    ethers.provider.send("evm_increaseTime", [duration]);
    ethers.provider.send("evm_mine", []);
  }


  it("Functions", async () => {
    // console.log(token.functions);
    // console.log(aggregator.functions);
    console.log(pancakePrediction.functions);
    // console.log(pancakeBunnies.functions);
    // console.log(pancakeBunniesChecker.functions);
    // console.log(nftmarket.functions)
  });



  it("Mint Token and Approve",async () =>{

    for(let owner of [user, user2, user3, buser1, buser2, buser3]){
      await token.connect(owner).mintTokens(parseEther("100"))
      await token.connect(owner).approve(pancakePrediction.address,parseEther("100"))

    }

  })

  it("Should start genesis rounds",async ()=>{
    await pancakePrediction.genesisStartRound();

    await increaseTime(100);

    await pancakePrediction.genesisLockRound();
    const currentEpoch = await pancakePrediction.currentEpoch();

    console.log("hhhhhh",currentEpoch);

    await pancakePrediction.connect(user).betBull(currentEpoch, parseEther("1.1"))
    await pancakePrediction.connect(user2).betBull(currentEpoch, parseEther("1.2"))
    await pancakePrediction.connect(user3).betBear(currentEpoch, parseEther("1.4"))

    await increaseTime(100);
    await aggregator.updateAnswer(INITIAL_PRICE);
    await pancakePrediction.executeRound();
    await increaseTime(100);

    await aggregator.updateAnswer(12000000000);
    await pancakePrediction.executeRound();


   console.log("Hellllo",currentEpoch)
   console.log(await token.balanceOf(pancakePrediction.address))
    // await pancakePrediction.executeRound();

    
   console.log(await pancakePrediction.claimable(2, user.address))
   console.log(await pancakePrediction.claimable(2, user2.address))
   console.log(await pancakePrediction.claimable(2, user3.address))


  await pancakePrediction.connect(user).claim([2]);
  await pancakePrediction.connect(user2).claim([2]);
  // await pancakePrediction.connect(user3).claim([2]); Not eligible for claim

  await pancakePrediction.claimTreasury()


  // await pancakePrediction.pause();

  // await pancakePrediction.setOracleUpdateAllowance(200);

  // await pancakePrediction.unpause();

  // await pancakePrediction.genesisStartRound();
  // await increaseTime(100);
  // await aggregator.updateAnswer(10000000000);
  // await pancakePrediction.genesisLockRound();
  await increaseTime(110);
  await aggregator.updateAnswer(13000000000);

  await pancakePrediction.executeRound();

  await pancakePrediction.connect(user).betBull(5, parseEther("2.1"))
  await pancakePrediction.connect(user2).betBull(5, parseEther("2.2"))
  await pancakePrediction.connect(user3).betBear(5, parseEther("3.4"))

  await increaseTime(100);
  await aggregator.updateAnswer(10000000000);
  await pancakePrediction.executeRound();
  await increaseTime(100);
  await aggregator.updateAnswer(9000000000);
  await pancakePrediction.executeRound();
  console.log(await pancakePrediction.claimable(5, user.address))
  console.log(await pancakePrediction.claimable(5, user2.address))
  console.log(await pancakePrediction.claimable(5, user3.address))

  await increaseTime(100);

  console.log(await pancakePrediction.currentEpoch());
  await aggregator.updateAnswer(10000000000);
  await pancakePrediction.executeRound();

  // await increaseTime(100);
  // await aggregator.updateAnswer(10000000000);
  // await pancakePrediction.executeRound();
  // console.log(await pancakePrediction.currentEpoch());

  await pancakePrediction.connect(user).betBull(8, parseEther("2.1"))
  await pancakePrediction.connect(user2).betBull(8, parseEther("2.2"))
  await pancakePrediction.connect(user3).betBear(8, parseEther("3.4"))


    await increaseTime(100);
  await aggregator.updateAnswer(11000000000);
  await pancakePrediction.executeRound();

  await pancakePrediction.connect(user).betBull(9, parseEther("2.1"))
  await pancakePrediction.connect(user2).betBull(9, parseEther("2.2"))
  await pancakePrediction.connect(user3).betBear(9, parseEther("3.4"))


  await increaseTime(100);
  await aggregator.updateAnswer(9000000000);
  await pancakePrediction.executeRound();
    // await increaseTime(100);

    // await pancakePrediction.genesisStartRound();

    // await pancakePrediction.genesisStartRound();
    // await pancakePrediction.genesisLockRound();
    // await pancakePrediction.executeRound();

    // console.log(await pancakePrediction.rounds(4))
    // console.log((await pancakePrediction.rounds(1)).startTimestamp)
    // console.log((await pancakePrediction.rounds(1)).closeTimestamp)


  })


});