import {
  deployFixture,
  MAX_UINT_AMOUNT,
  TestDeploymentEnv,
} from "./helper/utils";
import { parseEther } from "ethers";
import { ZEROADDRESS } from "../script/helpers/constants";
const hre = require("hardhat");
const { expect } = require("chai");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("XERC20 TEST", function () {
  it("ERC20 with AAVE strategy operation function as expected", async function () {
    const [owner, user] = await hre.ethers.getSigners();
    const testENV: TestDeploymentEnv = await loadFixture(deployFixture);

    const testAmount = parseEther("1000");
    const halfAmount = parseEther("500");
    await testENV.erc20.connect(user)["mint(uint256)"](testAmount);

    await testENV.erc20
      .connect(user)
      .approve(await testENV.lockBox.getAddress(), MAX_UINT_AMOUNT);

    await testENV.lockBox.connect(user).deposit(testAmount);

    expect(await testENV.xERC20.balanceOf(user.address)).to.be.eq(testAmount);

    expect(
      await testENV.erc20.balanceOf(await testENV.lockBox.getAddress())
    ).to.be.eq(testAmount);
    await testENV.lockBox.connect(owner).strategyYield(testAmount);
    expect(
      await testENV.erc20.balanceOf(await testENV.lockBox.getAddress())
    ).to.be.eq(0);
    await testENV.lockBox.connect(owner).strategyWithdraw(testAmount);
    expect(
      await testENV.erc20.balanceOf(await testENV.lockBox.getAddress())
    ).to.be.eq(testAmount);

    await testENV.lockBox.connect(owner).setExchangeRate(parseEther("2"));

    await testENV.xERC20
      .connect(user)
      .approve(await testENV.lockBox.getAddress(), MAX_UINT_AMOUNT);
    await testENV.lockBox.connect(user).withdraw(testAmount);
    expect(
      await testENV.erc20.balanceOf(await testENV.lockBox.getAddress())
    ).to.be.eq(0);
    expect(await testENV.xERC20.balanceOf(user.address)).to.be.eq(halfAmount);
  });

  it("ETH with ETH AAVE strategy operation function as expected", async function () {
    const [owner, user] = await hre.ethers.getSigners();
    const testENV: TestDeploymentEnv = await loadFixture(deployFixture);

    const testAmount = parseEther("100");
    const halfAmount = parseEther("50");

    await testENV.ethLockBox
      .connect(user)
      .depositGasToken({ value: testAmount });

    const lockBoxAddr = await testENV.ethLockBox.getAddress();
    const provider = hre.ethers.provider;
    expect(await provider.getBalance(lockBoxAddr)).to.be.eq(testAmount);
    await testENV.ethLockBox.connect(owner).strategyYield(testAmount);
    expect(await provider.getBalance(lockBoxAddr)).to.be.eq(0);
    await testENV.ethLockBox.connect(owner).strategyWithdraw(testAmount);
    expect(await provider.getBalance(lockBoxAddr)).to.be.eq(0);
    expect(await testENV.lido.balanceOf(lockBoxAddr)).to.be.eq(0);

    //simulate offchain owner action
    await testENV.ethLockBox
      .connect(owner)
      .rescueERC20(
        await testENV.lido.getAddress(),
        await owner.getAddress(),
        testAmount
      );
    await owner.sendTransaction({
      to: await testENV.ethLockBox.getAddress(),
      value: testAmount,
    });

    await testENV.ethLockBox.connect(owner).setExchangeRate(parseEther("2"));
    await testENV.ethXERC20
      .connect(user)
      .approve(await testENV.ethLockBox.getAddress(), MAX_UINT_AMOUNT);
    await testENV.ethLockBox.connect(user).withdraw(testAmount);
    expect(await provider.getBalance(lockBoxAddr)).to.be.eq(0);
    expect(await testENV.ethXERC20.balanceOf(user.address)).to.be.eq(
      halfAmount
    );
  });

  it("lockbox owner privilege operation", async function () {
    const [, user] = await hre.ethers.getSigners();
    const testENV: TestDeploymentEnv = await loadFixture(deployFixture);

    await expect(
      testENV.lockBox.connect(user).setExchangeRate("1")
    ).to.be.rejectedWith("Ownable: caller is not the owner");

    await expect(
      testENV.lockBox.connect(user).setStrategy(ZEROADDRESS)
    ).to.be.rejectedWith("Ownable: caller is not the owner");

    await expect(
      testENV.lockBox.connect(user).strategyYield("1")
    ).to.be.rejectedWith("Ownable: caller is not the owner");

    await expect(
      testENV.lockBox.connect(user).strategyWithdraw("1")
    ).to.be.rejectedWith("Ownable: caller is not the owner");

    await expect(
      testENV.lockBox.connect(user).rescueERC20(ZEROADDRESS, ZEROADDRESS, "1")
    ).to.be.rejectedWith("Ownable: caller is not the owner");
  });
});
