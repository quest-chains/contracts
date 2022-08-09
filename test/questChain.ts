import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { MockContract } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';

import { IERC20__factory, QuestChain, QuestChainFactory } from '../types';
import { QuestChainCommons } from '../types/contracts/QuestChain';
import {
  awaitQuestChainAddress,
  deploy,
  getContractAt,
  numberToBytes32,
  Status,
} from './utils/helpers';

const { deployMockContract } = waffle;
const DETAILS_STRING = 'ipfs://details';
const URI_STRING = 'ipfs://uri';

describe('QuestChain', () => {
  let chain: QuestChain;
  let chainFactory: QuestChainFactory;
  let signers: SignerWithAddress[];
  let chainAddress: string;
  let OWNER_ROLE: string;
  let ADMIN_ROLE: string;
  let EDITOR_ROLE: string;
  let REVIEWER_ROLE: string;
  let owner: SignerWithAddress;
  let mockToken: MockContract;

  before(async () => {
    signers = await ethers.getSigners();
    owner = signers[0];

    mockToken = await deployMockContract(signers[0], IERC20__factory.abi);

    const questChainImpl = await deploy<QuestChain>('QuestChain', {});

    [OWNER_ROLE, ADMIN_ROLE, EDITOR_ROLE, REVIEWER_ROLE] = await Promise.all([
      questChainImpl.OWNER_ROLE(),
      questChainImpl.ADMIN_ROLE(),
      questChainImpl.EDITOR_ROLE(),
      questChainImpl.REVIEWER_ROLE(),
    ]);

    chainFactory = await deploy<QuestChainFactory>(
      'QuestChainFactory',
      {},
      questChainImpl.address,
      signers[0].address,
      signers[0].address,
      mockToken.address,
      10,
    );

    const info: QuestChainCommons.QuestChainInfoStruct = {
      details: DETAILS_STRING,
      tokenURI: URI_STRING,
      owners: [owner.address],
      admins: [],
      editors: [],
      reviewers: [],
      quests: [],
      paused: false,
    };

    const tx = await chainFactory.create(info, numberToBytes32(0));
    chainAddress = await awaitQuestChainAddress(await tx.wait());

    chain = await getContractAt<QuestChain>('QuestChain', chainAddress);

    await expect(tx)
      .to.emit(chain, 'QuestChainInit')
      .withArgs(DETAILS_STRING, [], false);
  });

  it('Should initialize correctly', async () => {
    expect(await chain.hasRole(OWNER_ROLE, owner.address)).to.equal(true);
    expect(await chain.hasRole(ADMIN_ROLE, owner.address)).to.equal(true);
    expect(await chain.hasRole(EDITOR_ROLE, owner.address)).to.equal(true);
    expect(await chain.hasRole(REVIEWER_ROLE, owner.address)).to.equal(true);

    expect(await chain.getRoleAdmin(OWNER_ROLE)).to.equal(OWNER_ROLE);
    expect(await chain.getRoleAdmin(ADMIN_ROLE)).to.equal(OWNER_ROLE);
    expect(await chain.getRoleAdmin(EDITOR_ROLE)).to.equal(ADMIN_ROLE);
    expect(await chain.getRoleAdmin(REVIEWER_ROLE)).to.equal(ADMIN_ROLE);

    expect(await chain.questCount()).to.equal(0);
  });

  describe('grantRole', async () => {
    it('should grant REVIEWER_ROLE', async () => {
      const account = signers[9].address;
      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(false);

      const tx = await chain.grantRole(REVIEWER_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(REVIEWER_ROLE, account, owner.address);

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should grant EDITOR_ROLE and roles below', async () => {
      const account = signers[10].address;
      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(false);

      const tx = await chain.grantRole(EDITOR_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(REVIEWER_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(EDITOR_ROLE, account, owner.address);

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should grant ADMIN_ROLE and roles below', async () => {
      const account = signers[11].address;
      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(false);

      const tx = await chain.grantRole(ADMIN_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(REVIEWER_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(EDITOR_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(ADMIN_ROLE, account, owner.address);

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should grant OWNER_ROLE and roles below', async () => {
      const account = signers[12].address;
      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(false);

      const tx = await chain.grantRole(OWNER_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(REVIEWER_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(EDITOR_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(ADMIN_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(OWNER_ROLE, account, owner.address);

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });
  });

  describe('revokeRole', async () => {
    it('should revoke OWNER_ROLE', async () => {
      const account = signers[9].address;
      let tx = await chain.grantRole(OWNER_ROLE, account);
      await tx.wait();

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);

      tx = await chain.revokeRole(OWNER_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(OWNER_ROLE, account, owner.address);

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should revoke ADMIN_ROLE and roles above', async () => {
      const account = signers[10].address;
      let tx = await chain.grantRole(OWNER_ROLE, account);
      await tx.wait();

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);

      tx = await chain.revokeRole(ADMIN_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(ADMIN_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(OWNER_ROLE, account, owner.address);

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should revoke EDITOR_ROLE and roles above', async () => {
      const account = signers[11].address;
      let tx = await chain.grantRole(OWNER_ROLE, account);
      await tx.wait();

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);

      tx = await chain.revokeRole(EDITOR_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(EDITOR_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(ADMIN_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(OWNER_ROLE, account, owner.address);

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should revoke REVIEWER_ROLE and roles above', async () => {
      const account = signers[12].address;
      let tx = await chain.grantRole(OWNER_ROLE, account);
      await tx.wait();

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);

      tx = await chain.revokeRole(REVIEWER_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(REVIEWER_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(EDITOR_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(ADMIN_ROLE, account, owner.address);
      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(OWNER_ROLE, account, owner.address);

      expect(await chain.hasRole(OWNER_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(false);
    });
  });

  describe('editQuestChain', async () => {
    it('Should edit the quest chain', async () => {
      const NEW_DETAILS_STRING = 'ipfs://new-details-1';
      const tx = await chain.edit(NEW_DETAILS_STRING);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestChainEdited')
        .withArgs(owner.address, NEW_DETAILS_STRING);
    });

    it('Should revert edit if not ADMIN', async () => {
      const NEW_DETAILS_STRING = 'ipfs://new-details-2';
      const tx = chain.connect(signers[1]).edit(NEW_DETAILS_STRING);

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[1].address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
      );
    });

    it('Should edit if new ADMIN', async () => {
      await (await chain.grantRole(ADMIN_ROLE, signers[1].address)).wait();

      const NEW_DETAILS_STRING = 'ipfs://new-details-3';
      const tx = chain.connect(signers[1]).edit(NEW_DETAILS_STRING);

      await expect(tx)
        .to.emit(chain, 'QuestChainEdited')
        .withArgs(signers[1].address, NEW_DETAILS_STRING);
    });
  });

  describe('createQuests', async () => {
    it('Should create a new quest', async () => {
      const tx = await chain.createQuests([DETAILS_STRING]);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestsCreated')
        .withArgs(owner.address, [0], [DETAILS_STRING]);
      expect(await chain.questCount()).to.equal(1);
    });

    it('Should revert create if not EDITOR', async () => {
      const tx = chain.connect(signers[2]).createQuests([DETAILS_STRING]);

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[2].address.toLowerCase()} is missing role ${EDITOR_ROLE}`,
      );
    });

    it('Should create if new EDITOR (& also multiple create)', async () => {
      let tx = await chain.connect(signers[1]).createQuests([DETAILS_STRING]);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestsCreated')
        .withArgs(signers[1].address, [1], [DETAILS_STRING]);
      expect(await chain.questCount()).to.equal(2);

      const detailsArray = [DETAILS_STRING, DETAILS_STRING];
      tx = await chain.connect(signers[1]).createQuests(detailsArray);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestsCreated')
        .withArgs(signers[1].address, [2, 3], detailsArray);

      expect(await chain.questCount()).to.equal(4);
    });
  });

  describe('editQuests', async () => {
    it('Should edit a new quest', async () => {
      const tx = await chain.editQuests([0], [DETAILS_STRING]);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestsEdited')
        .withArgs(owner.address, [0], [DETAILS_STRING]);
    });

    it('Should revert edit if invalid params', async () => {
      const tx = chain.editQuests([0, 1], [DETAILS_STRING]);
      await expect(tx).to.be.revertedWith('QuestChain: invalid params');
    });

    it('Should revert edit if invalid questId', async () => {
      const tx = chain.editQuests([5], [DETAILS_STRING]);

      await expect(tx).to.be.revertedWith('QuestChain: quest not found');
    });

    it('Should revert edit if not EDITOR', async () => {
      const tx = chain.connect(signers[2]).editQuests([0], [DETAILS_STRING]);

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[2].address.toLowerCase()} is missing role ${EDITOR_ROLE}`,
      );
    });

    it('Should edit if new EDITOR (& also multiple edit)', async () => {
      await (await chain.grantRole(EDITOR_ROLE, signers[2].address)).wait();

      const NEW_DETAILS_STRING = 'ipfs://details-new';
      const questIdList = [0, 1];
      const detailsList = [NEW_DETAILS_STRING, NEW_DETAILS_STRING + '1'];

      const tx = await chain
        .connect(signers[2])
        .editQuests(questIdList, detailsList);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestsEdited')
        .withArgs(signers[2].address, questIdList, detailsList);
    });
  });

  describe('submitProofs', async () => {
    it('Should submitProofs for a quest', async () => {
      const questIdList = [0, 1];
      const detailsList = [DETAILS_STRING, DETAILS_STRING + '1'];

      const tx = await chain.submitProofs(questIdList, detailsList);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestProofsSubmitted')
        .withArgs(owner.address, questIdList, detailsList);
    });

    it('Should revert submitProofs if invalid params', async () => {
      const tx = chain.submitProofs([0, 1], [DETAILS_STRING]);
      await expect(tx).to.be.revertedWith('QuestChain: invalid params');
    });

    it('Should revert submitProofs if invalid questId', async () => {
      const tx = chain.submitProofs([5], [DETAILS_STRING]);

      await expect(tx).to.be.revertedWith('QuestChain: quest not found');
    });

    it('Should submitProofs event if already in review', async () => {
      const tx = await chain.submitProofs([0], [DETAILS_STRING]);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestProofsSubmitted')
        .withArgs(owner.address, [0], [DETAILS_STRING]);
    });

    it('Should revert submitProofs if already accepted', async () => {
      await (
        await chain.reviewProofs([owner.address], [0], [true], [DETAILS_STRING])
      ).wait();

      const tx = chain.submitProofs([0], [DETAILS_STRING]);

      await expect(tx).to.be.revertedWith('QuestChain: already passed');
    });

    it('Should submitProofs for a quest if already failed', async () => {
      await (
        await chain.reviewProofs(
          [owner.address],
          [1],
          [false],
          [DETAILS_STRING],
        )
      ).wait();

      const NEW_DETAILS_STRING = 'ipfs://new-details-1';
      const tx = await chain.submitProofs([1], [NEW_DETAILS_STRING]);
      await tx.wait();
      await expect(tx)
        .to.emit(chain, 'QuestProofsSubmitted')
        .withArgs(owner.address, [1], [NEW_DETAILS_STRING]);
    });
  });

  describe('reviewProofs', async () => {
    it('Should accept reviewProofs for a proof submission', async () => {
      expect(await chain.questStatus(signers[1].address, 0)).to.be.equal(
        Status.init,
      );
      await (
        await chain
          .connect(signers[1])
          .submitProofs([0, 1], [DETAILS_STRING, DETAILS_STRING])
      ).wait();

      const questerList = [signers[1].address, signers[1].address];
      const questIdList = [0, 1];
      const successList = [true, false];
      const detailsList = [DETAILS_STRING, DETAILS_STRING + '1'];

      const tx = await chain.reviewProofs(
        questerList,
        questIdList,
        successList,
        detailsList,
      );
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestProofsReviewed')
        .withArgs(
          owner.address,
          questerList,
          questIdList,
          successList,
          detailsList,
        );

      expect(await chain.questStatus(signers[1].address, 0)).to.be.equal(
        Status.pass,
      );
    });

    it('Should revert reviewProofs if invalid params', async () => {
      const questerList = [signers[1].address];
      const questIdList = [0, 1];
      const successList = [true, false];
      const detailsList = [DETAILS_STRING, DETAILS_STRING + '1'];
      const tx = chain.reviewProofs(
        questerList,
        questIdList,
        successList,
        detailsList,
      );
      await expect(tx).to.be.revertedWith('QuestChain: invalid params');
    });

    it('Should reject reviewProofs for a proof submission', async () => {
      expect(await chain.questStatus(signers[1].address, 2)).to.be.equal(
        Status.init,
      );
      await (
        await chain.connect(signers[1]).submitProofs([2], [DETAILS_STRING])
      ).wait();

      const tx = await chain.reviewProofs(
        [signers[1].address],
        [2],
        [false],
        [DETAILS_STRING],
      );
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestProofsReviewed')
        .withArgs(
          owner.address,
          [signers[1].address],
          [2],
          [false],
          [DETAILS_STRING],
        );
      expect(await chain.questStatus(signers[1].address, 1)).to.be.equal(
        Status.fail,
      );
    });

    it('Should revert reviewProofs if invalid questId', async () => {
      const tx = chain.reviewProofs(
        [owner.address],
        [5],
        [true],
        [DETAILS_STRING],
      );

      await expect(tx).to.be.revertedWith('QuestChain: quest not found');
    });

    it('Should revert reviewProofs if quest not in review', async () => {
      const tx = chain.reviewProofs(
        [owner.address],
        [3],
        [true],
        [DETAILS_STRING],
      );

      await expect(tx).to.be.revertedWith('QuestChain: quest not in review');
    });

    it('Should revert reviewProofs if not REVIEWER', async () => {
      await (
        await chain.connect(signers[1]).submitProofs([3], [DETAILS_STRING])
      ).wait();
      const tx = chain
        .connect(signers[3])
        .reviewProofs([signers[1].address], [3], [true], [DETAILS_STRING]);

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[3].address.toLowerCase()} is missing role ${REVIEWER_ROLE}`,
      );
    });

    it('Should reviewProofs if new REVIEWER', async () => {
      const tx = await chain
        .connect(signers[2])
        .reviewProofs([signers[1].address], [3], [false], [DETAILS_STRING]);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestProofsReviewed')
        .withArgs(
          signers[2].address,
          [signers[1].address],
          [3],
          [false],
          [DETAILS_STRING],
        );
      expect(await chain.questStatus(signers[1].address, 3)).to.be.equal(
        Status.fail,
      );
    });
  });

  describe('questStatus', async () => {
    it('Should questStatus review after proof submission', async () => {
      expect(await chain.questStatus(signers[2].address, 0)).to.be.equal(
        Status.init,
      );
      await (
        await chain.connect(signers[2]).submitProofs([0], [DETAILS_STRING])
      ).wait();

      expect(await chain.questStatus(signers[2].address, 0)).to.be.equal(
        Status.review,
      );
    });

    it('Should questStatus pass for an accepted submission', async () => {
      expect(await chain.questStatus(signers[2].address, 0)).to.be.equal(
        Status.review,
      );

      await (
        await chain.reviewProofs(
          [signers[2].address],
          [0],
          [true],
          [DETAILS_STRING],
        )
      ).wait();

      expect(await chain.questStatus(signers[2].address, 0)).to.be.equal(
        Status.pass,
      );
    });

    it('Should questStatus fail for a rejected submission', async () => {
      expect(await chain.questStatus(signers[2].address, 1)).to.be.equal(
        Status.init,
      );
      await (
        await chain.connect(signers[2]).submitProofs([1], [DETAILS_STRING])
      ).wait();

      expect(await chain.questStatus(signers[2].address, 1)).to.be.equal(
        Status.review,
      );

      await (
        await chain.reviewProofs(
          [signers[2].address],
          [1],
          [false],
          [DETAILS_STRING],
        )
      ).wait();

      expect(await chain.questStatus(signers[2].address, 1)).to.be.equal(
        Status.fail,
      );
    });

    it('Should revert questStatus if invalid questId', async () => {
      const tx = chain.questStatus(owner.address, 5);

      await expect(tx).to.be.revertedWith('QuestChain: quest not found');
    });
  });

  describe('pause', async () => {
    it('should pause the questChain', async () => {
      expect(await chain.paused()).to.equal(false);

      const tx = await chain.pause();
      await tx.wait();

      await expect(tx).to.emit(chain, 'Paused');

      expect(await chain.paused()).to.equal(true);
    });

    it('should revert pause the questChain if not owner', async () => {
      expect(await chain.paused()).to.equal(true);

      const tx = chain.connect(signers[1]).pause();

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[1].address.toLowerCase()} is missing role ${OWNER_ROLE}`,
      );

      expect(await chain.paused()).to.equal(true);
    });

    it('should revert submitProofs when paused', async () => {
      expect(await chain.paused()).to.equal(true);

      const tx = chain.connect(signers[3]).submitProofs([0], ['']);

      await expect(tx).to.be.revertedWith(`Pausable: paused`);

      expect(await chain.paused()).to.equal(true);
    });
  });

  describe('unpause', async () => {
    it('should unpause the questChain', async () => {
      expect(await chain.paused()).to.equal(true);

      const tx = await chain.unpause();
      await tx.wait();

      await expect(tx).to.emit(chain, 'Unpaused');

      expect(await chain.paused()).to.equal(false);
    });

    it('should revert unpause the questChain if not owner', async () => {
      expect(await chain.paused()).to.equal(false);

      const tx = chain.connect(signers[1]).unpause();

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[1].address.toLowerCase()} is missing role ${OWNER_ROLE}`,
      );

      expect(await chain.paused()).to.equal(false);
    });

    it('should allow submitProofs when unpaused', async () => {
      expect(await chain.paused()).to.equal(false);

      const tx = await chain.connect(signers[3]).submitProofs([0], ['']);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestProofsSubmitted')
        .withArgs(signers[3].address, [0], ['']);

      expect(await chain.paused()).to.equal(false);
    });
  });

  describe('pauseQuests', async () => {
    it('should pause the list of quests', async () => {
      expect(await chain.questPaused(0)).to.equal(false);
      expect(await chain.questPaused(1)).to.equal(false);

      const tx = await chain.pauseQuests([0, 1], [true, true]);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestsPaused')
        .withArgs(owner.address, [0, 1], [true, true]);

      expect(await chain.questPaused(0)).to.equal(true);
      expect(await chain.questPaused(1)).to.equal(true);
    });

    it('should unpause/pause the list of quests', async () => {
      expect(await chain.questPaused(0)).to.equal(true);
      expect(await chain.questPaused(1)).to.equal(true);
      expect(await chain.questPaused(2)).to.equal(false);

      const tx = await chain.pauseQuests([0, 1, 2], [false, false, true]);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestsPaused')
        .withArgs(owner.address, [0, 1, 2], [false, false, true]);

      expect(await chain.questPaused(0)).to.equal(false);
      expect(await chain.questPaused(1)).to.equal(false);
      expect(await chain.questPaused(2)).to.equal(true);
    });

    it('should revert unpause quest if unpaused', async () => {
      const tx = chain.pauseQuests([0], [false]);

      await expect(tx).to.be.revertedWith(`QuestChain: quest not paused`);
    });

    it('should revert pause quest if paused', async () => {
      const tx = chain.pauseQuests([2], [true]);

      await expect(tx).to.be.revertedWith(`QuestChain: quest paused`);
    });

    it('should revert pause quest if not owner', async () => {
      const tx = chain.connect(signers[5]).pauseQuests([0], [true]);

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[5].address.toLowerCase()} is missing role ${EDITOR_ROLE}`,
      );
    });

    it('should revert submitProofs when paused', async () => {
      expect(await chain.questPaused(2)).to.equal(true);
      const tx = chain.connect(signers[3]).submitProofs([2], ['']);
      await expect(tx).to.be.revertedWith(`QuestChain: quest paused`);
      expect(await chain.questPaused(2)).to.equal(true);
    });
  });
});
