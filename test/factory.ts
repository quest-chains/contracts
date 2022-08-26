import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { MockContract } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';

const { provider } = waffle;

import {
  IERC20Token__factory,
  MockERC20Token,
  QuestChain,
  QuestChainFactory,
  QuestChainToken,
  QuestChainToken__factory,
} from '../types';
import { QuestChainCommons } from '../types/contracts/QuestChainFactory';
import {
  awaitQuestChainAddress,
  deploy,
  getContractAt,
  numberToBytes32,
} from './utils/helpers';
import { getPermitSignature } from './utils/permitSignature';

const { deployMockContract } = waffle;
const DETAILS_STRING = 'ipfs://details';
const URI_STRING = 'ipfs://uri';
const UPGRADE_FEE = 10;

describe('QuestChainFactory', () => {
  let questChainTemplate: QuestChain;
  let chainFactory: QuestChainFactory;
  let signers: SignerWithAddress[];
  let chainAddress: string;
  let DEFAULT_ADMIN_ROLE: string;
  let ADMIN_ROLE: string;
  let EDITOR_ROLE: string;
  let REVIEWER_ROLE: string;
  let admin: string;
  let mockToken: MockContract;
  let mockPermitToken: MockERC20Token;
  let questChainToken: QuestChainToken;

  before(async () => {
    signers = await ethers.getSigners();
    admin = signers[0].address;
    // admin = signers[1].address;

    mockToken = await deployMockContract(signers[0], IERC20Token__factory.abi);

    mockPermitToken = await deploy<MockERC20Token>('MockERC20Token', {});

    questChainTemplate = await deploy<QuestChain>('QuestChain', {});

    [DEFAULT_ADMIN_ROLE, ADMIN_ROLE, EDITOR_ROLE, REVIEWER_ROLE] =
      await Promise.all([
        questChainTemplate.DEFAULT_ADMIN_ROLE(),
        questChainTemplate.ADMIN_ROLE(),
        questChainTemplate.EDITOR_ROLE(),
        questChainTemplate.REVIEWER_ROLE(),
      ]);

    chainFactory = await deploy<QuestChainFactory>(
      'QuestChainFactory',
      {},
      questChainTemplate.address,
      admin,
      admin,
      mockToken.address,
      UPGRADE_FEE,
    );

    await expect(chainFactory.deployTransaction).to.emit(
      chainFactory,
      'FactorySetup',
    );

    questChainToken = QuestChainToken__factory.connect(
      await chainFactory.questChainToken(),
      signers[0],
    );

    expect(DEFAULT_ADMIN_ROLE).to.equal(numberToBytes32(0));
  });

  it('Should be initialized properly', async () => {
    expect(await chainFactory.questChainCount()).to.equal(0);
    expect(await chainFactory.admin()).to.equal(admin);
    expect(await chainFactory.questChainTemplate()).to.equal(
      questChainTemplate.address,
    );
  });

  it('Should revert init for questChainTemplate', async () => {
    const info: QuestChainCommons.QuestChainInfoStruct = {
      details: DETAILS_STRING,
      tokenURI: URI_STRING,
      owners: [admin],
      admins: [],
      editors: [],
      reviewers: [],
      quests: [],
      paused: false,
    };
    const tx = questChainTemplate.init(info);
    await expect(tx).to.revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  describe('create', async () => {
    it('Should deploy a QuestChain', async () => {
      const info: QuestChainCommons.QuestChainInfoStruct = {
        details: DETAILS_STRING,
        tokenURI: URI_STRING,
        owners: [admin],
        admins: [],
        editors: [],
        reviewers: [],
        quests: [],
        paused: false,
      };
      const tx = await chainFactory.create(info, numberToBytes32(0));
      chainAddress = await awaitQuestChainAddress(await tx.wait());
      await expect(tx)
        .to.emit(chainFactory, 'QuestChainCreated')
        .withArgs(0, chainAddress);

      const chain = await getContractAt<QuestChain>('QuestChain', chainAddress);
      await expect(tx)
        .to.emit(chain, 'QuestChainInit')
        .withArgs(DETAILS_STRING, [], false);

      expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.equal(true);
      expect(await chain.hasRole(ADMIN_ROLE, admin)).to.equal(true);
      expect(await chain.hasRole(EDITOR_ROLE, admin)).to.equal(true);
      expect(await chain.hasRole(REVIEWER_ROLE, admin)).to.equal(true);

      expect(await chain.getRoleAdmin(DEFAULT_ADMIN_ROLE)).to.equal(
        DEFAULT_ADMIN_ROLE,
      );
      expect(await chain.getRoleAdmin(ADMIN_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);
      expect(await chain.getRoleAdmin(EDITOR_ROLE)).to.equal(ADMIN_ROLE);
      expect(await chain.getRoleAdmin(REVIEWER_ROLE)).to.equal(ADMIN_ROLE);

      expect(await chainFactory.getQuestChainAddress(0)).to.equal(chainAddress);
    });

    it('Should deploy a QuestChain with roles', async () => {
      const owners = [admin, signers[5].address];
      const admins = [signers[1].address, signers[2].address];
      const editors = [signers[2].address, signers[3].address];
      const reviewers = [signers[3].address, signers[4].address];
      const info: QuestChainCommons.QuestChainInfoStruct = {
        details: DETAILS_STRING,
        tokenURI: URI_STRING,
        owners,
        admins,
        editors,
        reviewers,
        quests: [],
        paused: false,
      };
      const tx = await chainFactory.create(info, numberToBytes32(1));
      chainAddress = await awaitQuestChainAddress(await tx.wait());
      await expect(tx)
        .to.emit(chainFactory, 'QuestChainCreated')
        .withArgs(1, chainAddress);

      const chain = await getContractAt<QuestChain>('QuestChain', chainAddress);
      await expect(tx)
        .to.emit(chain, 'QuestChainInit')
        .withArgs(DETAILS_STRING, [], false);

      await Promise.all(
        owners.map(async owner =>
          expect(await chain.hasRole(DEFAULT_ADMIN_ROLE, owner)).to.equal(true),
        ),
      );
      await Promise.all(
        owners.map(async owner =>
          expect(await chain.hasRole(ADMIN_ROLE, owner)).to.equal(true),
        ),
      );
      await Promise.all(
        admins.map(async admin =>
          expect(await chain.hasRole(ADMIN_ROLE, admin)).to.equal(true),
        ),
      );
      await Promise.all(
        owners.map(async owner =>
          expect(await chain.hasRole(EDITOR_ROLE, owner)).to.equal(true),
        ),
      );
      await Promise.all(
        admins.map(async admin =>
          expect(await chain.hasRole(EDITOR_ROLE, admin)).to.equal(true),
        ),
      );
      await Promise.all(
        editors.map(async editor =>
          expect(await chain.hasRole(EDITOR_ROLE, editor)).to.equal(true),
        ),
      );
      await Promise.all(
        owners.map(async owner =>
          expect(await chain.hasRole(REVIEWER_ROLE, owner)).to.equal(true),
        ),
      );
      await Promise.all(
        admins.map(async admin =>
          expect(await chain.hasRole(REVIEWER_ROLE, admin)).to.equal(true),
        ),
      );
      await Promise.all(
        editors.map(async editor =>
          expect(await chain.hasRole(REVIEWER_ROLE, editor)).to.equal(true),
        ),
      );
      await Promise.all(
        reviewers.map(async reviewer =>
          expect(await chain.hasRole(REVIEWER_ROLE, reviewer)).to.equal(true),
        ),
      );

      expect(await chainFactory.getQuestChainAddress(1)).to.equal(chainAddress);
    });

    it('Should update questChainCount', async () => {
      expect(await chainFactory.questChainCount()).to.equal(2);
      const info: QuestChainCommons.QuestChainInfoStruct = {
        details: DETAILS_STRING,
        tokenURI: URI_STRING,
        owners: [admin],
        admins: [],
        editors: [],
        reviewers: [],
        quests: [],
        paused: false,
      };

      let tx = await chainFactory.create(info, numberToBytes32(2));
      const chain0 = await awaitQuestChainAddress(await tx.wait());
      expect(await chainFactory.questChainCount()).to.equal(3);
      tx = await chainFactory.create(info, numberToBytes32(3));
      const chain1 = await awaitQuestChainAddress(await tx.wait());
      expect(await chainFactory.questChainCount()).to.equal(4);

      expect(await chainFactory.getQuestChainAddress(2)).to.equal(chain0);
      expect(await chainFactory.getQuestChainAddress(3)).to.equal(chain1);
    });

    it('Should create quests & paused', async () => {
      expect(await chainFactory.questChainCount()).to.equal(4);
      const info: QuestChainCommons.QuestChainInfoStruct = {
        details: DETAILS_STRING,
        tokenURI: URI_STRING,
        owners: [admin],
        admins: [],
        editors: [],
        reviewers: [],
        quests: ['1', '2', '3'],
        paused: true,
      };

      const tx = await chainFactory.create(info, numberToBytes32(4));

      const chainAddress = await awaitQuestChainAddress(await tx.wait());

      expect(await chainFactory.questChainCount()).to.equal(5);

      const chain = await getContractAt<QuestChain>('QuestChain', chainAddress);

      await expect(tx)
        .to.emit(chain, 'QuestChainInit')
        .withArgs(DETAILS_STRING, ['1', '2', '3'], true);

      expect(await chain.paused()).to.equal(true);
      expect(await chain.questCount()).to.equal(3);
    });

    it('Should revert create quest chain with no owners', async () => {
      expect(await chainFactory.questChainCount()).to.equal(5);
      const info: QuestChainCommons.QuestChainInfoStruct = {
        details: DETAILS_STRING,
        tokenURI: URI_STRING,
        owners: [],
        admins: [],
        editors: [],
        reviewers: [],
        quests: ['1', '2', '3', '4'],
        paused: true,
      };

      const txPromise = chainFactory.create(info, numberToBytes32(5));

      await expect(txPromise).to.be.revertedWith('QuestChain: no owners');
    });
  });

  describe('upgradeQuestChain', async () => {
    let chain: QuestChain;
    const NEW_TOKEN_URI = 'ipfs://new-uri';
    it('Should create quest chain', async () => {
      expect(await chainFactory.questChainCount()).to.equal(5);
      const info: QuestChainCommons.QuestChainInfoStruct = {
        details: DETAILS_STRING,
        tokenURI: URI_STRING,
        owners: [admin],
        admins: [],
        editors: [],
        reviewers: [],
        quests: ['1', '2', '3', '4'],
        paused: true,
      };

      let tx = await chainFactory.create(info, numberToBytes32(5));

      const chainAddress = await awaitQuestChainAddress(await tx.wait());

      expect(await chainFactory.questChainCount()).to.equal(6);

      chain = await getContractAt<QuestChain>('QuestChain', chainAddress);

      await expect(tx)
        .to.emit(chain, 'QuestChainInit')
        .withArgs(DETAILS_STRING, ['1', '2', '3', '4'], true);

      expect(await chain.paused()).to.equal(true);
      expect(await chain.questCount()).to.equal(4);

      expect(await chain.getTokenURI()).to.equal(URI_STRING);
      expect(await chain.premium()).to.equal(false);
    });

    it('should revert setTokenURI when not premium', async () => {
      const txPromise = chain.setTokenURI(NEW_TOKEN_URI);
      await expect(txPromise).to.be.revertedWith('QuestChain: not premium');
    });

    it('should revert upgrade quest chain if not factory', async () => {
      const txPromise = chain.upgrade();
      await expect(txPromise).to.be.revertedWith(`QuestChain: not factory`);
    });

    it('should upgrade quest chain to premium', async () => {
      await mockToken.mock.transferFrom
        .withArgs(admin, admin, UPGRADE_FEE)
        .returns(true);
      1;
      const tx = await chainFactory.upgradeQuestChain(chain.address);
      await tx.wait();
      await expect(tx)
        .to.emit(chainFactory, 'QuestChainUpgraded')
        .withArgs(admin, chain.address);

      expect(await chain.premium()).to.equal(true);
    });

    it('should revert upgrade quest chain if premium', async () => {
      const txPromise = chainFactory.upgradeQuestChain(chain.address);
      await expect(txPromise).to.be.revertedWith(
        `QuestChain: already upgraded`,
      );
    });

    it('should revert setTokenURI if not admin', async () => {
      const txPromise = chain.connect(signers[2]).setTokenURI(NEW_TOKEN_URI);
      await expect(txPromise).to.be.revertedWith(
        `AccessControl: account ${signers[2].address.toLowerCase()} is missing role ${ADMIN_ROLE}`,
      );
    });

    it('should setTokenURI if admin & premium', async () => {
      const questChainToken = await getContractAt<QuestChainToken>(
        'QuestChainToken',
        await chain.questChainToken(),
      );

      const tx = await chain.setTokenURI(NEW_TOKEN_URI);
      await tx.wait();
      await expect(tx)
        .to.emit(questChainToken, 'URI')
        .withArgs(NEW_TOKEN_URI, await chain.questChainId());
      expect(await chain.getTokenURI()).to.equal(NEW_TOKEN_URI);
    });
  });

  describe('createAndUpgradeQuestChain', async () => {
    let chain: QuestChain;
    it('Should create and upgrade quest chain', async () => {
      expect(await chainFactory.questChainCount()).to.equal(6);
      await mockToken.mock.transferFrom
        .withArgs(admin, admin, UPGRADE_FEE)
        .returns(true);
      1;
      const info: QuestChainCommons.QuestChainInfoStruct = {
        details: DETAILS_STRING,
        tokenURI: URI_STRING,
        owners: [admin],
        admins: [],
        editors: [],
        reviewers: [],
        quests: ['1', '2', '3', '4'],
        paused: true,
      };

      let tx = await chainFactory.createAndUpgrade(info, numberToBytes32(6));

      const chainAddress = await awaitQuestChainAddress(await tx.wait());

      expect(await chainFactory.questChainCount()).to.equal(7);

      chain = await getContractAt<QuestChain>('QuestChain', chainAddress);

      await expect(tx)
        .to.emit(chain, 'QuestChainInit')
        .withArgs(DETAILS_STRING, ['1', '2', '3', '4'], true);

      expect(await chain.paused()).to.equal(true);
      expect(await chain.questCount()).to.equal(4);

      expect(await chain.getTokenURI()).to.equal(URI_STRING);
      expect(await chain.premium()).to.equal(true);
    });
  });

  describe('upgradeQuestChainWithPermit', async () => {
    let chain: QuestChain;
    it('Should create quest chain', async () => {
      chainFactory = await deploy<QuestChainFactory>(
        'QuestChainFactory',
        {},
        questChainTemplate.address,
        admin,
        admin,
        mockPermitToken.address,
        UPGRADE_FEE,
      );

      await expect(chainFactory.deployTransaction).to.emit(
        chainFactory,
        'FactorySetup',
      );
      expect(await chainFactory.questChainCount()).to.equal(0);
      const info: QuestChainCommons.QuestChainInfoStruct = {
        details: DETAILS_STRING,
        tokenURI: URI_STRING,
        owners: [admin],
        admins: [],
        editors: [],
        reviewers: [],
        quests: ['1', '2', '3', '4'],
        paused: true,
      };

      let tx = await chainFactory.create(info, numberToBytes32(0));

      const chainAddress = await awaitQuestChainAddress(await tx.wait());

      expect(await chainFactory.questChainCount()).to.equal(1);

      chain = await getContractAt<QuestChain>('QuestChain', chainAddress);

      await expect(tx)
        .to.emit(chain, 'QuestChainInit')
        .withArgs(DETAILS_STRING, ['1', '2', '3', '4'], true);

      expect(await chain.paused()).to.equal(true);
      expect(await chain.questCount()).to.equal(4);

      expect(await chain.getTokenURI()).to.equal(URI_STRING);
      expect(await chain.premium()).to.equal(false);
    });

    it('should revert upgrade quest chain with permit if invalid signature', async () => {
      const deadline = ethers.constants.MaxUint256;
      const signature = '0x';

      const txPromise = chainFactory.upgradeQuestChainWithPermit(
        chain.address,
        deadline,
        signature,
      );
      await expect(txPromise).to.be.revertedWith(
        'QuestChainCommons: bad signature',
      );
    });

    it('should upgrade quest chain with permit to premium', async () => {
      await (await mockPermitToken.mint(admin, UPGRADE_FEE)).wait();
      const deadline = ethers.constants.MaxUint256;

      const signature = await getPermitSignature(
        signers[0],
        mockPermitToken,
        chainFactory.address,
        UPGRADE_FEE,
        deadline,
      );

      const tx = await chainFactory.upgradeQuestChainWithPermit(
        chain.address,
        deadline,
        signature,
      );
      await tx.wait();
      await expect(tx)
        .to.emit(chainFactory, 'QuestChainUpgraded')
        .withArgs(admin, chain.address);

      expect(await chain.premium()).to.equal(true);
    });

    describe('createAndUpgradeQuestChainWithPermit', async () => {
      let chain: QuestChain;
      it('Should create and upgrade quest chain with permit', async () => {
        expect(await chainFactory.questChainCount()).to.equal(1);
        const info: QuestChainCommons.QuestChainInfoStruct = {
          details: DETAILS_STRING,
          tokenURI: URI_STRING,
          owners: [admin],
          admins: [],
          editors: [],
          reviewers: [],
          quests: ['1', '2', '3', '4'],
          paused: true,
        };

        await (await mockPermitToken.mint(admin, UPGRADE_FEE)).wait();
        const deadline = ethers.constants.MaxUint256;

        const signature = await getPermitSignature(
          signers[0],
          mockPermitToken,
          chainFactory.address,
          UPGRADE_FEE,
          deadline,
        );

        let tx = await chainFactory.createAndUpgradeWithPermit(
          info,
          numberToBytes32(1),
          deadline,
          signature,
        );

        const chainAddress = await awaitQuestChainAddress(await tx.wait());

        expect(await chainFactory.questChainCount()).to.equal(2);

        chain = await getContractAt<QuestChain>('QuestChain', chainAddress);

        await expect(tx)
          .to.emit(chain, 'QuestChainInit')
          .withArgs(DETAILS_STRING, ['1', '2', '3', '4'], true);
        await expect(tx)
          .to.emit(chainFactory, 'QuestChainUpgraded')
          .withArgs(admin, chain.address);

        expect(await chain.paused()).to.equal(true);
        expect(await chain.questCount()).to.equal(4);

        expect(await chain.getTokenURI()).to.equal(URI_STRING);
        expect(await chain.premium()).to.equal(true);
      });
    });

    describe('questChainToken', async () => {
      it('Should revert set token owner', async () => {
        const txPromise = questChainToken.setTokenOwner(0, signers[0].address);
        await expect(txPromise).to.be.revertedWith(
          'QuestChainToken: not factory',
        );
      });
      it('Should revert set token uri', async () => {
        const txPromise = questChainToken.setTokenURI(0, URI_STRING);
        await expect(txPromise).to.be.revertedWith(
          'QuestChainToken: not token owner',
        );
      });
    });

    describe('replacing upgradeFee', async () => {
      const NEW_UPGRADE_FEE = 20;
      it('Should revert upgradeFee change proposal when sender is not admin', async () => {
        const tx = chainFactory
          .connect(signers[1])
          .proposeUpgradeFeeReplace(NEW_UPGRADE_FEE);
        await expect(tx).to.be.revertedWith('QCFactory: not admin');
      });

      it('Should be able to create a proposal for replacing upgradeFee', async () => {
        const tx = await chainFactory.proposeUpgradeFeeReplace(NEW_UPGRADE_FEE);
        await expect(tx)
          .to.emit(chainFactory, 'UpgradeFeeReplaceProposed')
          .withArgs(NEW_UPGRADE_FEE);
        expect(await chainFactory.proposedUpgradeFee()).to.equal(
          NEW_UPGRADE_FEE,
        );
      });

      it('Should revert upgradeFee change proposal when new upgradeFee is same as old proposed upgradeFee', async () => {
        const tx = chainFactory.proposeUpgradeFeeReplace(NEW_UPGRADE_FEE);
        await expect(tx).to.be.revertedWith('QCFactory: no change');
      });

      it('Should revert upgradeFee change execution if not admin', async () => {
        const tx = chainFactory.connect(signers[1]).executeUpgradeFeeReplace();
        await expect(tx).to.be.revertedWith('QCFactory: not admin');
      });

      it('Should revert upgradeFee change execution if one day has not passed', async () => {
        const tx = chainFactory.executeUpgradeFeeReplace();
        await expect(tx).to.be.revertedWith('QCFactory: too soon');
      });

      it('Should execute upgradeFee change after one day', async () => {
        await provider.send('evm_setNextBlockTimestamp', [
          (await chainFactory.upgradeFeeProposalTimestamp())
            .add(864000)
            .toNumber(),
        ]);
        const tx = await chainFactory.executeUpgradeFeeReplace();
        await expect(tx)
          .to.emit(chainFactory, 'UpgradeFeeReplaced')
          .withArgs(NEW_UPGRADE_FEE);
        expect(await chainFactory.upgradeFee()).to.equal(NEW_UPGRADE_FEE);
      });
    });

    describe('replacing paymentToken', async () => {
      it('Should revert paymentToken change proposal when sender is not admin', async () => {
        const tx = chainFactory
          .connect(signers[1])
          .proposePaymentTokenReplace(mockToken.address);
        await expect(tx).to.be.revertedWith('QCFactory: not admin');
      });

      it('Should revert paymentToken change proposal when new paymentToken is 0 address', async () => {
        const tx = chainFactory.proposePaymentTokenReplace(
          ethers.constants.AddressZero,
        );
        await expect(tx).to.be.revertedWith('QCFactory: 0 address');
      });

      it('Should be able to create a proposal for replacing paymentToken', async () => {
        const tx = await chainFactory.proposePaymentTokenReplace(
          mockToken.address,
        );
        await expect(tx)
          .to.emit(chainFactory, 'PaymentTokenReplaceProposed')
          .withArgs(mockToken.address);
        expect(await chainFactory.proposedPaymentToken()).to.equal(
          mockToken.address,
        );
      });

      it('Should revert paymentToken change proposal when new paymentToken is same as old proposed paymentToken', async () => {
        const tx = chainFactory.proposePaymentTokenReplace(mockToken.address);
        await expect(tx).to.be.revertedWith('QCFactory: no change');
      });

      it('Should revert paymentToken change execution if not admin', async () => {
        const tx = chainFactory
          .connect(signers[1])
          .executePaymentTokenReplace();
        await expect(tx).to.be.revertedWith('QCFactory: not admin');
      });

      it('Should revert paymentToken change execution if one day has not passed', async () => {
        const tx = chainFactory.executePaymentTokenReplace();
        await expect(tx).to.be.revertedWith('QCFactory: too soon');
      });

      it('Should execute paymentToken change after one day', async () => {
        await provider.send('evm_setNextBlockTimestamp', [
          (await chainFactory.paymentTokenProposalTimestamp())
            .add(864000)
            .toNumber(),
        ]);
        const tx = await chainFactory.executePaymentTokenReplace();
        await expect(tx)
          .to.emit(chainFactory, 'PaymentTokenReplaced')
          .withArgs(mockToken.address);
        expect(await chainFactory.paymentToken()).to.equal(mockToken.address);
      });
    });

    describe('replacing admin', async () => {
      it('Should revert admin change proposal when sender is not admin', async () => {
        const tx = chainFactory
          .connect(signers[1])
          .proposePaymentTokenReplace(signers[1].address);
        await expect(tx).to.be.revertedWith('QCFactory: not admin');
      });

      it('Should revert admin change proposal when new admin is 0 address', async () => {
        const tx = chainFactory.proposeAdminReplace(
          ethers.constants.AddressZero,
        );
        await expect(tx).to.be.revertedWith('QCFactory: 0 address');
      });

      it('Should be able to create a proposal for replacing admin', async () => {
        const tx = await chainFactory.proposeAdminReplace(signers[1].address);
        await expect(tx)
          .to.emit(chainFactory, 'AdminReplaceProposed')
          .withArgs(signers[1].address);
        expect(await chainFactory.proposedAdmin()).to.equal(signers[1].address);
      });

      it('Should revert admin change proposal when new admin is same as old proposed admin', async () => {
        const tx = chainFactory.proposeAdminReplace(signers[1].address);
        await expect(tx).to.be.revertedWith('QCFactory: no change');
      });

      it('Should revert admin change execution if one day has not passed', async () => {
        const tx = chainFactory.connect(signers[1]).executeAdminReplace();
        await expect(tx).to.be.revertedWith('QCFactory: too soon');
      });

      it('Should revert admin change execution if not proposed admin', async () => {
        await provider.send('evm_setNextBlockTimestamp', [
          (await chainFactory.adminProposalTimestamp()).add(864000).toNumber(),
        ]);
        const tx = chainFactory.executeAdminReplace();
        await expect(tx).to.be.revertedWith('QCFactory: !proposedAdmin');
      });

      it('Should execute admin change after one day', async () => {
        const tx = await chainFactory.connect(signers[1]).executeAdminReplace();
        await expect(tx)
          .to.emit(chainFactory, 'AdminReplaced')
          .withArgs(signers[1].address);
        expect(await chainFactory.admin()).to.equal(signers[1].address);
      });
    });
  });
});
