import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-expressions */
describe("TokenGatedSecret", function () {
  let secret: any;
  let mockNFT: any;
  let mockToken: any;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  const MIN_TOKEN_BALANCE = ethers.parseUnits("100", 18);

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    // Deploy Mock NFT
    const MockNFTFactory = await ethers.getContractFactory("MockERC721");
    mockNFT = await MockNFTFactory.deploy("MockNFT", "MNFT");
    await mockNFT.waitForDeployment();

    // Deploy Mock ERC20
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockTokenFactory.deploy("MockToken", "MTK", 18);
    await mockToken.waitForDeployment();

    // Deploy TokenGatedSecret
    const SecretFactory = await ethers.getContractFactory("TokenGatedSecret");
    secret = await SecretFactory.deploy();
    await secret.waitForDeployment();

    // Mint NFT #1 to Alice
    await mockNFT.mint(alice.address, 1);

    // Mint tokens to Bob
    await mockToken.mint(bob.address, MIN_TOKEN_BALANCE * 2n);
  });

  describe("Create Secret", function () {
    it("Should create NFT gated secret", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await secret.getAddress(), owner.address)
        .add64(12345n)
        .add256(9876543210n)
        .encrypt();

      await expect(
        secret.createSecret(
          "NFT Gated Secret",
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          await mockNFT.getAddress(),
          0, // GateType.NFT_ANY
          0,
          encryptedInput.inputProof,
        ),
      ).to.emit(secret, "SecretCreated");

      expect(await secret.getSecretsCount()).to.equal(1);
    });

    it("Should create ERC20 gated secret", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await secret.getAddress(), owner.address)
        .add64(99999n)
        .add256(1234567890n)
        .encrypt();

      await expect(
        secret.createSecret(
          "Token Gated Secret",
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          await mockToken.getAddress(),
          2, // GateType.ERC20_MIN
          MIN_TOKEN_BALANCE,
          encryptedInput.inputProof,
        ),
      ).to.emit(secret, "SecretCreated");

      expect(await secret.getSecretsCount()).to.equal(1);
    });
  });

  describe("NFT Gate Access", function () {
    let secretId: bigint;

    beforeEach(async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await secret.getAddress(), owner.address)
        .add64(12345n)
        .add256(67890n)
        .encrypt();

      await secret.createSecret(
        "Test Secret",
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        await mockNFT.getAddress(),
        0, // GateType.NFT_ANY
        0,
        encryptedInput.inputProof,
      );
      secretId = 0n;
    });

    it("NFT holder meets gate requirement", async function () {
      expect(await secret.meetsGateRequirement(secretId, alice.address)).to.be.true;
    });

    it("Non-holder does not meet gate requirement", async function () {
      expect(await secret.meetsGateRequirement(secretId, bob.address)).to.be.false;
    });

    it("NFT holder can request permanent access", async function () {
      await expect(secret.connect(alice).requestPermanentAccess(secretId)).to.emit(secret, "AccessGranted");
      expect(await secret.permanentAccess(secretId, alice.address)).to.be.true;
    });

    it("Non-holder cannot request access", async function () {
      await expect(secret.connect(bob).requestPermanentAccess(secretId)).to.be.reverted;
    });

    it("NFT holder can get secret handles", async function () {
      const [valueHandle, dataHandle] = await secret.connect(alice).getSecretHandles(secretId);
      expect(valueHandle).to.not.equal(ethers.ZeroHash);
      expect(dataHandle).to.not.equal(ethers.ZeroHash);
    });

    it("Non-holder cannot get secret handles", async function () {
      await expect(secret.connect(bob).getSecretHandles(secretId)).to.be.reverted;
    });
  });

  describe("ERC20 Gate Access", function () {
    let secretId: bigint;

    beforeEach(async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await secret.getAddress(), owner.address)
        .add64(12345n)
        .add256(67890n)
        .encrypt();

      await secret.createSecret(
        "Token Gated",
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        await mockToken.getAddress(),
        2, // GateType.ERC20_MIN
        MIN_TOKEN_BALANCE,
        encryptedInput.inputProof,
      );
      secretId = 0n;
    });

    it("Token holder with sufficient balance meets gate requirement", async function () {
      expect(await secret.meetsGateRequirement(secretId, bob.address)).to.be.true;
    });

    it("User with insufficient balance does not meet gate requirement", async function () {
      expect(await secret.meetsGateRequirement(secretId, alice.address)).to.be.false;
    });

    it("Token holder can request permanent access", async function () {
      await expect(secret.connect(bob).requestPermanentAccess(secretId)).to.emit(secret, "AccessGranted");
      expect(await secret.permanentAccess(secretId, bob.address)).to.be.true;
    });

    it("Token holder can get secret handles", async function () {
      const [valueHandle, dataHandle] = await secret.connect(bob).getSecretHandles(secretId);
      expect(valueHandle).to.not.equal(ethers.ZeroHash);
      expect(dataHandle).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Creator Permissions", function () {
    let secretId: bigint;

    beforeEach(async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await secret.getAddress(), owner.address)
        .add64(12345n)
        .add256(67890n)
        .encrypt();

      await secret.createSecret(
        "Test Secret",
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        await mockNFT.getAddress(),
        0,
        0,
        encryptedInput.inputProof,
      );
      secretId = 0n;
    });

    it("Creator has automatic permanent access", async function () {
      expect(await secret.permanentAccess(secretId, owner.address)).to.be.true;
    });

    it("Creator can update gate requirements", async function () {
      await expect(secret.updateGate(secretId, await mockToken.getAddress(), 2, MIN_TOKEN_BALANCE)).to.emit(
        secret,
        "SecretUpdated",
      );

      const info = await secret.getSecretInfo(secretId);
      expect(info.gateContract).to.equal(await mockToken.getAddress());
      expect(info.gateType).to.equal(2);
    });

    it("Non-creator cannot update gate requirements", async function () {
      await expect(secret.connect(alice).updateGate(secretId, await mockToken.getAddress(), 2, MIN_TOKEN_BALANCE)).to.be
        .reverted;
    });
  });

  describe("Public Info Query", function () {
    it("Anyone can query public info", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await secret.getAddress(), owner.address)
        .add64(12345n)
        .add256(67890n)
        .encrypt();

      await secret.createSecret(
        "Public Title",
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        await mockNFT.getAddress(),
        0,
        0,
        encryptedInput.inputProof,
      );

      const info = await secret.connect(bob).getSecretInfo(0);
      expect(info.title).to.equal("Public Title");
      expect(info.gateContract).to.equal(await mockNFT.getAddress());
      expect(info.creator).to.equal(owner.address);
      expect(info.exists).to.be.true;
    });

    it("getAllSecrets returns all secrets", async function () {
      const encryptedInput = await fhevm
        .createEncryptedInput(await secret.getAddress(), owner.address)
        .add64(12345n)
        .add256(67890n)
        .encrypt();

      await secret.createSecret(
        "Secret 1",
        encryptedInput.handles[0],
        encryptedInput.handles[1],
        await mockNFT.getAddress(),
        0,
        0,
        encryptedInput.inputProof,
      );

      const secrets = await secret.getAllSecrets();
      expect(secrets.length).to.equal(1);
      expect(secrets[0].title).to.equal("Secret 1");
    });
  });
});
