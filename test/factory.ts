import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { MockContract } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';

import {
  IERC20__factory,
  QuestChain,
  QuestChainFactory,
  QuestChainToken,
} from '../types';
import { QuestChainCommons } from '../types/contracts/QuestChainFactory';
import {
  awaitQuestChainAddress,
  deploy,
  getContractAt,
  numberToBytes32,
} from './utils/helpers';

const { deployMockContract } = waffle;
const DETAILS_STRING = 'ipfs://details';
const URI_STRING = 'ipfs://uri';

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

  before(async () => {
    signers = await ethers.getSigners();
    admin = signers[0].address;
    // admin = signers[1].address;

    mockToken = await deployMockContract(signers[0], IERC20__factory.abi);

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
      10,
    );

    await expect(chainFactory.deployTransaction).to.emit(
      chainFactory,
      'FactorySetup',
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
        .withArgs(admin, admin, 10)
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
});
