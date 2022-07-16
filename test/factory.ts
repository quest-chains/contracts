import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { QuestChain, QuestChainFactory } from '../types';
import { awaitQuestChainAddress, deploy, getContractAt } from './utils/helpers';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
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
  let owner: string;

  before(async () => {
    signers = await ethers.getSigners();
    owner = signers[0].address;

    questChainImpl = await deploy<QuestChain>('QuestChain', {});

    [OWNER_ROLE, ADMIN_ROLE, EDITOR_ROLE, REVIEWER_ROLE] = await Promise.all([
      questChainImpl.OWNER_ROLE(),
      questChainImpl.ADMIN_ROLE(),
      questChainImpl.EDITOR_ROLE(),
      questChainImpl.REVIEWER_ROLE(),
    ]);

    const QuestChainFactoryFactory = await ethers.getContractFactory(
      'QuestChainFactory',
    );

    chainFactory = (await QuestChainFactoryFactory.deploy(
      questChainImpl.address,
    )) as QuestChainFactory;

    await chainFactory.deployed();

    await expect(chainFactory.deployTransaction)
      .to.emit(chainFactory, 'QuestChainImplUpdated')
      .withArgs(ZERO_ADDRESS, questChainImpl.address);

    expect(OWNER_ROLE).to.equal(ZERO_BYTES32);
  });

  it('Should be initialized properly', async () => {
    expect(await chainFactory.questChainCount()).to.equal(0);
    expect(await chainFactory.owner()).to.equal(owner);
    expect(await chainFactory.questChainImpl()).to.equal(
      questChainImpl.address,
    );
  });

  it('Should revert change questChainImpl if zero address', async () => {
    const tx = chainFactory.updateChainImpl(ZERO_ADDRESS);
    await expect(tx).to.revertedWith('QuestChainFactory: invalid impl');
  });

  it('Should revert change questChainImpl if not owner', async () => {
    const newQuestChain = await deploy<QuestChain>('QuestChain', {});
    const tx = chainFactory
      .connect(signers[1])
      .updateChainImpl(newQuestChain.address);
    await expect(tx).to.revertedWith('Ownable: caller is not the owner');
  });

  it('Should change questChainImpl', async () => {
    const newQuestChain = await deploy<QuestChain>('QuestChain', {});
    const tx = await chainFactory.updateChainImpl(newQuestChain.address);
    await tx.wait();
    await expect(tx)
      .to.emit(chainFactory, 'QuestChainImplUpdated')
      .withArgs(questChainImpl.address, newQuestChain.address);
    expect(await chainFactory.questChainImpl()).to.equal(newQuestChain.address);
  });

  it('Should revert init for questChainImpl', async () => {
    const tx = questChainImpl.init(owner, DETAILS_STRING, URI_STRING);
    await expect(tx).to.revertedWith(
      'Initializable: contract is already initialized',
    );
  });

  it('Should deploy a QuestChain', async () => {
    const tx = await chainFactory.create(DETAILS_STRING, URI_STRING);
    chainAddress = await awaitQuestChainAddress(await tx.wait());
    await expect(tx)
      .to.emit(chainFactory, 'QuestChainCreated')
      .withArgs(0, chainAddress);

    const chain = await getContractAt<QuestChain>('QuestChain', chainAddress);
    await expect(tx)
      .to.emit(chain, 'QuestChainCreated')
      .withArgs(owner, DETAILS_STRING);

    expect(await chain.hasRole(OWNER_ROLE, owner)).to.equal(true);
    expect(await chain.hasRole(ADMIN_ROLE, owner)).to.equal(true);
    expect(await chain.hasRole(EDITOR_ROLE, owner)).to.equal(true);
    expect(await chain.hasRole(REVIEWER_ROLE, owner)).to.equal(true);

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
    const tx = await chainFactory.createWithRoles(
      DETAILS_STRING,
      URI_STRING,
      admins,
      editors,
      reviewers,
    );
    chainAddress = await awaitQuestChainAddress(await tx.wait());
    await expect(tx)
      .to.emit(chainFactory, 'QuestChainCreated')
      .withArgs(1, chainAddress);

    const chain = await getContractAt<QuestChain>('QuestChain', chainAddress);
    await expect(tx)
      .to.emit(chain, 'QuestChainCreated')
      .withArgs(owner, DETAILS_STRING);

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

  it('Should predict QuestChain address', async () => {
    owner = signers[0].address;

    const predictedAddress = await chainFactory.predictDeterministicAddress(
      ZERO_BYTES32,
    );

    const tx = await chainFactory.createDeterministic(
      DETAILS_STRING,
      URI_STRING,
      ZERO_BYTES32,
    );

    chainAddress = await awaitQuestChainAddress(await tx.wait());
    await expect(tx)
      .to.emit(chainFactory, 'QuestChainCreated')
      .withArgs(2, chainAddress);

    expect(chainAddress).to.equal(predictedAddress);
    expect(await chainFactory.getQuestChainAddress(2)).to.equal(chainAddress);
  });

  it('Should update questChainCount', async () => {
    expect(await chainFactory.questChainCount()).to.equal(3);
    let tx = await chainFactory.create(DETAILS_STRING, URI_STRING);
    const chain0 = await awaitQuestChainAddress(await tx.wait());
    expect(await chainFactory.questChainCount()).to.equal(4);
    tx = await chainFactory.create(DETAILS_STRING, URI_STRING);
    const chain1 = await awaitQuestChainAddress(await tx.wait());
    expect(await chainFactory.questChainCount()).to.equal(5);

    expect(await chainFactory.getQuestChainAddress(3)).to.equal(chain0);
    expect(await chainFactory.getQuestChainAddress(4)).to.equal(chain1);
  });
});
