import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { MockContract } from 'ethereum-waffle';
import { constants } from 'ethers';
import { ethers, waffle } from 'hardhat';

import {
  IERC20__factory,
  LimiterTokenFee,
  LimiterTokenGated,
  QuestChain,
  QuestChainFactory,
  QuestChainToken,
} from '../types';
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
  let chainToken: QuestChainToken;
  let chainFactory: QuestChainFactory;
  let signers: SignerWithAddress[];
  let chainAddress: string;
  let DEFAULT_ADMIN_ROLE: string;
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

    [DEFAULT_ADMIN_ROLE, ADMIN_ROLE, EDITOR_ROLE, REVIEWER_ROLE] =
      await Promise.all([
        questChainImpl.DEFAULT_ADMIN_ROLE(),
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

    chainToken = await getContractAt<QuestChainToken>(
      'QuestChainToken',
      await chain.questChainToken(),
    );

    expect(await chainToken.tokenOwner(await chain.questChainId())).to.equal(
      chain.address,
    );
  });

  it('Should initialize correctly', async () => {
    expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(
      true,
    );
    expect(await chain.hasRole(ADMIN_ROLE, owner.address)).to.equal(true);
    expect(await chain.hasRole(EDITOR_ROLE, owner.address)).to.equal(true);
    expect(await chain.hasRole(REVIEWER_ROLE, owner.address)).to.equal(true);

    expect(await chain.getRoleAdmin(DEFAULT_ADMIN_ROLE)).to.equal(
      DEFAULT_ADMIN_ROLE,
    );
    expect(await chain.getRoleAdmin(ADMIN_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);
    expect(await chain.getRoleAdmin(EDITOR_ROLE)).to.equal(ADMIN_ROLE);
    expect(await chain.getRoleAdmin(REVIEWER_ROLE)).to.equal(ADMIN_ROLE);

    expect(await chain.questCount()).to.equal(0);
  });

  describe('grantRole', async () => {
    it('should grant REVIEWER_ROLE', async () => {
      const account = signers[9].address;
      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(false);

      const tx = await chain.grantRole(REVIEWER_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleGranted')
        .withArgs(REVIEWER_ROLE, account, owner.address);

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should grant EDITOR_ROLE and roles below', async () => {
      const account = signers[10].address;
      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
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

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should grant ADMIN_ROLE and roles below', async () => {
      const account = signers[11].address;
      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
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

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should grant DEFAULT_ADMIN_ROLE and roles below', async () => {
      const account = signers[12].address;
      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(false);

      const tx = await chain.grantRole(DEFAULT_ADMIN_ROLE, account);
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
        .withArgs(DEFAULT_ADMIN_ROLE, account, owner.address);

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });
  });

  describe('revokeRole', async () => {
    it('should revoke DEFAULT_ADMIN_ROLE', async () => {
      const account = signers[9].address;
      let tx = await chain.grantRole(DEFAULT_ADMIN_ROLE, account);
      await tx.wait();

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);

      tx = await chain.revokeRole(DEFAULT_ADMIN_ROLE, account);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'RoleRevoked')
        .withArgs(DEFAULT_ADMIN_ROLE, account, owner.address);

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should revoke ADMIN_ROLE and roles above', async () => {
      const account = signers[10].address;
      let tx = await chain.grantRole(DEFAULT_ADMIN_ROLE, account);
      await tx.wait();

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(true);
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
        .withArgs(DEFAULT_ADMIN_ROLE, account, owner.address);

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should revoke EDITOR_ROLE and roles above', async () => {
      const account = signers[11].address;
      let tx = await chain.grantRole(DEFAULT_ADMIN_ROLE, account);
      await tx.wait();

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(true);
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
        .withArgs(DEFAULT_ADMIN_ROLE, account, owner.address);

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(ADMIN_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(EDITOR_ROLE, account)).to.equal(false);
      expect(await chain.hasRole(REVIEWER_ROLE, account)).to.equal(true);
    });

    it('should revoke REVIEWER_ROLE and roles above', async () => {
      const account = signers[12].address;
      let tx = await chain.grantRole(DEFAULT_ADMIN_ROLE, account);
      await tx.wait();

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(true);
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
        .withArgs(DEFAULT_ADMIN_ROLE, account, owner.address);

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, account)).to.equal(false);
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
        .withArgs(owner.address, [DETAILS_STRING]);
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
        .withArgs(signers[1].address, [DETAILS_STRING]);
      expect(await chain.questCount()).to.equal(2);

      const detailsArray = [DETAILS_STRING, DETAILS_STRING];
      tx = await chain.connect(signers[1]).createQuests(detailsArray);
      await tx.wait();

      await expect(tx)
        .to.emit(chain, 'QuestsCreated')
        .withArgs(signers[1].address, detailsArray);

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

    it('should revert pause the questChain if not admin', async () => {
      expect(await chain.paused()).to.equal(true);

      const tx = chain.connect(signers[5]).pause();

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[5].address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
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

    it('should revert unpause the questChain if not admin', async () => {
      expect(await chain.paused()).to.equal(false);

      const tx = chain.connect(signers[5]).unpause();

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[5].address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
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
      expect((await chain.questDetails(0)).paused).to.equal(false);
      expect((await chain.questDetails(1)).paused).to.equal(false);

      const questIdList = [0, 1];
      const questDetailsList = [
        { paused: true, optional: false, skipReview: false },
        { paused: true, optional: false, skipReview: false },
      ];

      const tx = await chain.configureQuests(questIdList, questDetailsList);
      const receipt = await tx.wait();

      expect(
        receipt.events?.some(event => {
          if (event.event === 'ConfiguredQuests') {
            if (
              event.data ===
              ethers.utils.defaultAbiCoder.encode(
                ['address', 'uint256[]', '(bool,bool,bool)[]'],
                [
                  owner.address,
                  questIdList,
                  questDetailsList.map(questDetails =>
                    Object.values(questDetails),
                  ),
                ],
              )
            )
              return true;
          }
        }),
      ).to.equal(true);

      // FIXME cannot compare like this, hence the code above
      // await expect(tx)
      //   .to.emit(chain, 'ConfiguredQuests')
      //   .withArgs(
      //     owner.address,
      //     questIdList,
      //     questDetailsList.map(questDetails => Object.values(questDetails)),
      //   );

      expect((await chain.questDetails(0)).paused).to.equal(true);
      expect((await chain.questDetails(1)).paused).to.equal(true);
    });

    it('should unpause/pause the list of quests', async () => {
      expect((await chain.questDetails(0)).paused).to.equal(true);
      expect((await chain.questDetails(1)).paused).to.equal(true);
      expect((await chain.questDetails(2)).paused).to.equal(false);

      const questIdList = [0, 1, 2];
      const questDetailsList = [
        { paused: false, optional: false, skipReview: false },
        { paused: false, optional: false, skipReview: false },
        { paused: true, optional: false, skipReview: false },
      ];

      const tx = await chain.configureQuests(questIdList, questDetailsList);
      const receipt = await tx.wait();

      expect(
        receipt.events?.some(event => {
          if (event.event === 'ConfiguredQuests') {
            if (
              event.data ===
              ethers.utils.defaultAbiCoder.encode(
                ['address', 'uint256[]', '(bool,bool,bool)[]'],
                [
                  owner.address,
                  questIdList,
                  questDetailsList.map(questDetails =>
                    Object.values(questDetails),
                  ),
                ],
              )
            )
              return true;
          }
        }),
      ).to.equal(true);

      // await expect(tx)
      //   .to.emit(chain, 'ConfiguredQuests')
      //   .withArgs(owner.address, questIdList, questDetailsList);

      expect((await chain.questDetails(0)).paused).to.equal(false);
      expect((await chain.questDetails(1)).paused).to.equal(false);
      expect((await chain.questDetails(2)).paused).to.equal(true);
    });

    it('should unpause quest if unpaused', async () => {
      const questIdList = [0];
      const questDetailsList = [
        { paused: false, optional: false, skipReview: false },
      ];

      const tx = chain.configureQuests(questIdList, questDetailsList);

      await expect(tx).to.not.be.reverted;
    });

    it('should pause quest if paused', async () => {
      const questIdList = [2];
      const questDetailsList = [
        { paused: true, optional: false, skipReview: false },
      ];

      const tx = chain.configureQuests(questIdList, questDetailsList);

      await expect(tx).to.not.be.reverted;
    });

    it('should revert pause quest if not owner', async () => {
      const questIdList = [5];
      const questDetailsList = [
        { paused: true, optional: false, skipReview: false },
      ];

      const tx = chain
        .connect(signers[5])
        .configureQuests(questIdList, questDetailsList);

      await expect(tx).to.be.revertedWith(
        `AccessControl: account ${signers[5].address.toLowerCase()} is missing role ${EDITOR_ROLE}`,
      );
    });

    it('should revert pause quest if invalid params', async () => {
      const tx = chain.configureQuests([0], []);
      await expect(tx).to.be.revertedWith('QuestChain: invalid params');
    });

    it('should revert submitProofs when paused', async () => {
      expect((await chain.questDetails(2)).paused).to.equal(true);
      const tx = chain.connect(signers[3]).submitProofs([2], ['']);
      await expect(tx).to.be.revertedWith(`QuestChain: quest paused`);
      expect((await chain.questDetails(2)).paused).to.equal(true);
    });
  });

  const createChain = async (quests: string[]): Promise<QuestChain> => {
    const info: QuestChainCommons.QuestChainInfoStruct = {
      details: DETAILS_STRING,
      tokenURI: URI_STRING,
      owners: [owner.address],
      admins: [],
      editors: [],
      reviewers: [],
      quests,
      paused: false,
    };

    const tx = await chainFactory.create(
      info,
      numberToBytes32((await chainFactory.questChainCount()).toNumber()),
    );

    return getContractAt<QuestChain>(
      'QuestChain',
      await awaitQuestChainAddress(await tx.wait()),
    );
  };

  describe('mintToken', async () => {
    it('should revert mint if there are no quests', async () => {
      const questChain = await createChain([]);
      const txPromise = questChain.mintToken();
      await expect(txPromise).to.be.revertedWith(`QuestChain: no quests found`);
    });
    it('should revert mint if there are quests not attempted', async () => {
      const questChain = await createChain(['1']);
      const txPromise = questChain.mintToken();
      await expect(txPromise).to.be.revertedWith(
        'QuestChain: chain incomplete',
      );
    });
    it('should revert mint if there are quests not reviewed', async () => {
      const questChain = await createChain(['1']);
      await (await questChain.submitProofs([0], ['proof'])).wait();
      const txPromise = questChain.mintToken();
      await expect(txPromise).to.be.revertedWith(
        'QuestChain: chain incomplete',
      );
    });
    it('should revert mint if there are quests failed', async () => {
      const questChain = await createChain(['1']);
      await (await questChain.submitProofs([0], ['proof'])).wait();
      await (
        await questChain.reviewProofs(
          [owner.address],
          [0],
          [false],
          ['details'],
        )
      ).wait();
      const txPromise = questChain.mintToken();
      await expect(txPromise).to.be.revertedWith(
        'QuestChain: chain incomplete',
      );
    });
    it('should mint if completed all quests', async () => {
      const questChain = await createChain(['1']);
      await (await questChain.submitProofs([0], ['proof'])).wait();
      await (
        await questChain.reviewProofs([owner.address], [0], [true], ['details'])
      ).wait();
      const tx = await questChain.mintToken();
      await tx.wait();
      const questChainToken = await getContractAt<QuestChainToken>(
        'QuestChainToken',
        await questChain.questChainToken(),
      );
      await expect(tx)
        .to.emit(questChainToken, 'TransferSingle')
        .withArgs(
          questChain.address,
          constants.AddressZero,
          owner.address,
          await questChain.questChainId(),
          1,
        );
    });
    let questChain: QuestChain;
    it('should revert mint if already minted', async () => {
      questChain = await createChain(['1']);
      await (await questChain.submitProofs([0], ['proof'])).wait();
      await (
        await questChain.reviewProofs([owner.address], [0], [true], ['details'])
      ).wait();
      const tx = await questChain.mintToken();
      await tx.wait();
      const questChainToken = await getContractAt<QuestChainToken>(
        'QuestChainToken',
        await questChain.questChainToken(),
      );
      await expect(tx)
        .to.emit(questChainToken, 'TransferSingle')
        .withArgs(
          questChain.address,
          constants.AddressZero,
          owner.address,
          await questChain.questChainId(),
          1,
        );
      const txPromise = questChain.mintToken();
      await expect(txPromise).to.be.revertedWith(
        'QuestChainToken: already minted',
      );
    });

    it('should revert transfer of token', async () => {
      const txPromise = chainToken.safeTransferFrom(
        signers[0].address,
        signers[1].address,
        await questChain.questChainId(),
        1,
        '0x',
      );
      await expect(txPromise).to.be.revertedWith('QuestChainToken: soulbound');
    });

    it('should revert approval of token', async () => {
      const txPromise = chainToken.setApprovalForAll(signers[1].address, true);
      await expect(txPromise).to.be.revertedWith('QuestChainToken: soulbound');
    });
  });

  describe('burnToken', async () => {
    it('should revert burn if there is not token', async () => {
      const questChain = await createChain(['1']);
      const txPromise = questChain.burnToken();
      await expect(txPromise).to.be.revertedWith(
        'QuestChainToken: token not found',
      );
    });
    it('should burn minted token', async () => {
      const questChain = await createChain(['1']);
      await (await questChain.submitProofs([0], ['proof'])).wait();
      await (
        await questChain.reviewProofs([owner.address], [0], [true], ['details'])
      ).wait();
      let tx = await questChain.mintToken();
      await tx.wait();
      const questChainToken = await getContractAt<QuestChainToken>(
        'QuestChainToken',
        await questChain.questChainToken(),
      );
      await expect(tx)
        .to.emit(questChainToken, 'TransferSingle')
        .withArgs(
          questChain.address,
          constants.AddressZero,
          owner.address,
          await questChain.questChainId(),
          1,
        );

      tx = await questChain.burnToken();
      await tx.wait();
      await expect(tx)
        .to.emit(questChainToken, 'TransferSingle')
        .withArgs(
          questChain.address,
          owner.address,
          constants.AddressZero,
          await questChain.questChainId(),
          1,
        );
    });
  });

  describe('Tests for skipReview, optional and paused quests', () => {
    let questChain: QuestChain;

    before('Create QuestCain with three quests', async () => {
      questChain = await createChain(['1', '2', '3']);
    });

    it('Should revert to configure non-existed quest', async () => {
      await expect(
        questChain.configureQuests(
          [3],
          [
            { paused: false, optional: false, skipReview: true }, // skipReview is true
          ],
        ),
      ).to.be.revertedWith('QuestChain: quest not found');
    });

    it('Set quests as skipReview, optional and paused, respectively', async () => {
      const questIdList = [0, 1, 2];
      const questDetailsList = [
        { paused: false, optional: false, skipReview: true }, // skipReview is true
        { paused: false, optional: true, skipReview: false }, // optional is true
        { paused: true, optional: false, skipReview: false }, // paused is true
      ];

      const tx = await questChain.configureQuests(
        questIdList,
        questDetailsList,
      );
      const receipt = await tx.wait();

      expect(
        receipt.events?.some(event => {
          if (event.event === 'ConfiguredQuests') {
            if (
              event.data ===
              ethers.utils.defaultAbiCoder.encode(
                ['address', 'uint256[]', '(bool,bool,bool)[]'],
                [
                  owner.address,
                  questIdList,
                  questDetailsList.map(questDetails =>
                    Object.values(questDetails),
                  ),
                ],
              )
            )
              return true;
          }
        }),
      ).to.equal(true);

      expect((await questChain.questDetails(0)).paused).to.equal(false);
      expect((await questChain.questDetails(0)).skipReview).to.equal(true);
      expect((await questChain.questDetails(0)).optional).to.equal(false);

      expect((await questChain.questDetails(1)).paused).to.equal(false);
      expect((await questChain.questDetails(1)).skipReview).to.equal(false);
      expect((await questChain.questDetails(1)).optional).to.equal(true);

      expect((await questChain.questDetails(2)).paused).to.equal(true);
      expect((await questChain.questDetails(2)).skipReview).to.equal(false);
      expect((await questChain.questDetails(2)).optional).to.equal(false);
    });

    it('skipReview quest should automatically pass on submission', async () => {
      const questIdList = ['0'];
      const detailsList = [''];
      const tx = await questChain.submitProofs(questIdList, detailsList);
      await tx.wait();

      await expect(tx)
        .to.emit(questChain, 'QuestProofsSubmitted')
        .withArgs(owner.address, questIdList, detailsList);

      expect(
        await questChain.questStatus(owner.address, questIdList[0]),
      ).to.equal(Status.pass);
    });

    it('should mint NFT with incomplete paused and optional quests', async () => {
      expect(await questChain.questStatus(owner.address, 1)).to.equal(
        Status.init,
      );
      expect(await questChain.questStatus(owner.address, 2)).to.equal(
        Status.init,
      );

      const tx = await questChain.mintToken();
      await tx.wait();

      const questChainToken = await getContractAt<QuestChainToken>(
        'QuestChainToken',
        await questChain.questChainToken(),
      );
      await expect(tx)
        .to.emit(questChainToken, 'TransferSingle')
        .withArgs(
          questChain.address,
          constants.AddressZero,
          owner.address,
          await questChain.questChainId(),
          1,
        );
    });
  });

  // Limiter Tests
  describe('LimiterTokenGated', () => {
    let limiterChain: QuestChain;
    let limiterTokenGated: LimiterTokenGated;
    let minBalance = '100';
    before('Initialize', async () => {
      limiterChain = (await createChain([])) as QuestChain;
      limiterTokenGated = await deploy<LimiterTokenGated>(
        'LimiterTokenGated',
        {},
      );
    });

    it('addQuestChainDetails: revert when sender is not QuestChain admin', async () => {
      await expect(
        limiterTokenGated
          .connect(signers[1])
          .addQuestChainDetails(
            limiterChain.address,
            limiterChain.address,
            0,
            0,
            '1',
          ),
      ).to.be.revertedWith('TokenGated: only admin');
    });

    it('addQuestChainDetails: works when sender is QuestChain admin', async () => {
      const tx = await limiterTokenGated
        .connect(owner)
        .addQuestChainDetails(
          limiterChain.address,
          mockToken.address,
          0,
          0,
          minBalance,
        );

      await tx.wait();

      await expect(tx)
        .to.emit(limiterTokenGated, 'AddQuestChainDetails')
        .withArgs(
          limiterChain.address,
          mockToken.address,
          minBalance,
          owner.address,
        );

      const questChainDetails = await limiterTokenGated.questChainDetails(
        limiterChain.address,
      );
      expect(questChainDetails.tokenAddress).to.equal(mockToken.address);
      expect(questChainDetails.minTokenBalance).to.equal(minBalance);
    });

    it('setLimiter: revert when sender is not admin', async () => {
      await expect(
        limiterChain.connect(signers[1]).setLimiter(limiterTokenGated.address),
      ).to.be.revertedWith('AccessControl: account');
    });
    it('setLimiter: revert when QuestChain is not premium', async () => {
      await expect(
        limiterChain.connect(owner).setLimiter(limiterTokenGated.address),
      ).to.be.revertedWith('QuestChain: not premium');
    });
    it('setLimiter: works when QuestChain is premium', async () => {
      await mockToken.mock.transferFrom
        .withArgs(signers[0].address, signers[0].address, '10')
        .returns(true);

      (await chainFactory.upgradeQuestChain(limiterChain.address)).wait();

      const tx = await limiterChain
        .connect(owner)
        .setLimiter(limiterTokenGated.address);

      await tx.wait();

      await expect(tx)
        .to.emit(limiterChain, 'SetLimiter')
        .withArgs(limiterTokenGated.address);

      expect(await limiterChain.limiterContract()).to.equal(
        limiterTokenGated.address,
      );
    });

    it('submitProofs: revert when sender does not have minimum balance', async () => {
      (await limiterChain.createQuests([''])).wait();

      await mockToken.mock.balanceOf.withArgs(signers[0].address).returns(9);
      await expect(limiterChain.submitProofs(['0'], [''])).to.be.revertedWith(
        'LimiterTokenGated: limited',
      );
    });

    it('submitProofs: works when sender has minimum balance or above', async () => {
      await mockToken.mock.balanceOf
        .withArgs(signers[0].address)
        .returns(minBalance);
      (await limiterChain.submitProofs(['0'], [''])).wait();

      await mockToken.mock.balanceOf
        .withArgs(signers[0].address)
        .returns(minBalance + 1);
      (await limiterChain.submitProofs(['0'], [''])).wait();
    });
  });

  describe('LimiterTokenFee', () => {
    let limiterChain: QuestChain;
    let limiterTokenFee: LimiterTokenFee;
    let treasury: SignerWithAddress;
    let feeAmount = '100';
    before('Initialize', async () => {
      treasury = signers[1];
      limiterChain = (await createChain([])) as QuestChain;
      limiterTokenFee = await deploy<LimiterTokenFee>('LimiterTokenFee', {});
    });

    it('addQuestChainDetails: revert when sender is not QuestChain admin', async () => {
      await expect(
        limiterTokenFee
          .connect(signers[1])
          .addQuestChainDetails(
            limiterChain.address,
            limiterChain.address,
            0,
            0,
            limiterChain.address,
            '1',
          ),
      ).to.be.revertedWith('TokenGated: only admin');
    });

    it('addQuestChainDetails: works when sender is QuestChain admin', async () => {
      const tx = await limiterTokenFee
        .connect(owner)
        .addQuestChainDetails(
          limiterChain.address,
          mockToken.address,
          0,
          0,
          treasury.address,
          feeAmount,
        );

      await tx.wait();

      await expect(tx)
        .to.emit(limiterTokenFee, 'AddQuestChainDetails')
        .withArgs(
          limiterChain.address,
          mockToken.address,
          treasury.address,
          feeAmount,
          owner.address,
        );

      const questChainDetails = await limiterTokenFee.questChainDetails(
        limiterChain.address,
      );
      expect(questChainDetails.tokenAddress).to.equal(mockToken.address);
      expect(questChainDetails.treasuryAddress).to.equal(treasury.address);
      expect(questChainDetails.feeAmount).to.equal(feeAmount);
    });

    it('setLimiter: revert when sender is not admin', async () => {
      await expect(
        limiterChain.connect(signers[1]).setLimiter(limiterTokenFee.address),
      ).to.be.revertedWith('AccessControl: account');
    });
    it('setLimiter: revert when QuestChain is not premium', async () => {
      await expect(
        limiterChain.connect(owner).setLimiter(limiterTokenFee.address),
      ).to.be.revertedWith('QuestChain: not premium');
    });
    it('setLimiter: works when QuestChain is premium', async () => {
      await mockToken.mock.transferFrom
        .withArgs(signers[0].address, signers[0].address, '10')
        .returns(true);

      (await chainFactory.upgradeQuestChain(limiterChain.address)).wait();

      const tx = await limiterChain
        .connect(owner)
        .setLimiter(limiterTokenFee.address);

      await tx.wait();

      await expect(tx)
        .to.emit(limiterChain, 'SetLimiter')
        .withArgs(limiterTokenFee.address);

      expect(await limiterChain.limiterContract()).to.equal(
        limiterTokenFee.address,
      );
    });

    it('submitProofs: revert when sender does not have enough balance', async () => {
      (await limiterChain.createQuests([''])).wait();

      await mockToken.mock.transferFrom
        .withArgs(signers[0].address, treasury.address, feeAmount)
        .returns(false);
      await expect(limiterChain.submitProofs(['0'], [''])).to.be.revertedWith(
        'SafeERC20: ERC20 operation did not succeed',
      );
    });

    it('submitProofs: works when sender has minimum balance or above', async () => {
      await mockToken.mock.transferFrom
        .withArgs(signers[0].address, treasury.address, feeAmount)
        .returns(true);
      (await limiterChain.submitProofs(['0'], [''])).wait();
    });
  });
});
