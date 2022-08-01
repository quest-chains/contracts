import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { MockContract } from 'ethereum-waffle';
import { ethers, waffle } from 'hardhat';

import { IERC20__factory, QuestChain, QuestChainFactory } from '../types';
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
  let questChainImpl: QuestChain;
  let chainFactory: QuestChainFactory;
  let signers: SignerWithAddress[];
  let chainAddress: string;
  let OWNER_ROLE: string;
  let ADMIN_ROLE: string;
  let EDITOR_ROLE: string;
  let REVIEWER_ROLE: string;
  let admin: string;
  let mockToken: MockContract;

  before(async () => {
    signers = await ethers.getSigners();
    admin = signers[0].address;

    mockToken = await deployMockContract(signers[0], IERC20__factory.abi);

    questChainImpl = await deploy<QuestChain>('QuestChain', {});

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
      admin,
      admin,
      mockToken.address,
      10,
    );

    await expect(chainFactory.deployTransaction).to.emit(
      chainFactory,
      'FactoryInit',
    );

    expect(OWNER_ROLE).to.equal(numberToBytes32(0));
  });

  it('Should be initialized properly', async () => {
    expect(await chainFactory.questChainCount()).to.equal(0);
    expect(await chainFactory.admin()).to.equal(admin);
    expect(await chainFactory.questChainImpl()).to.equal(
      questChainImpl.address,
    );
  });

  it('Should revert change questChainImpl if zero address', async () => {
    const tx = chainFactory.replaceChainImpl(ethers.constants.AddressZero);
    await expect(tx).to.revertedWith('QuestChainFactory: 0 address');
  });

  it('Should revert change questChainImpl if not admin', async () => {
    const newQuestChain = await deploy<QuestChain>('QuestChain', {});
    const tx = chainFactory
      .connect(signers[1])
      .replaceChainImpl(newQuestChain.address);
    await expect(tx).to.revertedWith('QuestChainFactory: not admin');
  });

  it('Should change questChainImpl', async () => {
    const newQuestChain = await deploy<QuestChain>('QuestChain', {});
    const tx = await chainFactory.replaceChainImpl(newQuestChain.address);
    await tx.wait();
    await expect(tx)
      .to.emit(chainFactory, 'ImplReplaced')
      .withArgs(newQuestChain.address);
    expect(await chainFactory.questChainImpl()).to.equal(newQuestChain.address);
  });

  it('Should revert init for questChainImpl', async () => {
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
    const tx = questChainImpl.init(info);
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

    expect(await chain.hasRole(OWNER_ROLE, admin)).to.equal(true);
    expect(await chain.hasRole(ADMIN_ROLE, admin)).to.equal(true);
    expect(await chain.hasRole(EDITOR_ROLE, admin)).to.equal(true);
    expect(await chain.hasRole(REVIEWER_ROLE, admin)).to.equal(true);

    expect(await chain.getRoleAdmin(OWNER_ROLE)).to.equal(OWNER_ROLE);
    expect(await chain.getRoleAdmin(ADMIN_ROLE)).to.equal(OWNER_ROLE);
    expect(await chain.getRoleAdmin(EDITOR_ROLE)).to.equal(ADMIN_ROLE);
    expect(await chain.getRoleAdmin(REVIEWER_ROLE)).to.equal(ADMIN_ROLE);

    expect(await chainFactory.getQuestChainAddress(0)).to.equal(chainAddress);
  });

  it('Should deploy a QuestChain with roles', async () => {
    const admins = [signers[1].address, signers[2].address];
    const editors = [signers[2].address, signers[3].address];
    const reviewers = [signers[3].address, signers[4].address];
    const info: QuestChainCommons.QuestChainInfoStruct = {
      details: DETAILS_STRING,
      tokenURI: URI_STRING,
      owners: [admin],
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
      admins.map(async admin =>
        expect(await chain.hasRole(ADMIN_ROLE, admin)).to.equal(true),
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
});
