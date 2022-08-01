import { execSync } from 'child_process';
import fs from 'fs';
import { ethers, network, run } from 'hardhat';

import {
  DEFAULT_UPGRADE_FEE,
  NETWORK_CURRENCY,
  NETWORK_NAME,
  PAYMENT_TOKEN,
  TREASURY_ADDRESS,
  validateSetup,
} from './utils';

async function main() {
  const { chainId, deployer, address, balance } = await validateSetup();
  if (!deployer.provider) {
    throw new Error('Provider not found for network');
  }
  const commitHash = execSync('git rev-parse --short HEAD', {
    encoding: 'utf-8',
  }).trim();

  console.log('Deploying QuestChainFactory:', NETWORK_NAME[chainId]);
  console.log('Commit Hash:', commitHash);

  const QuestChain = await ethers.getContractFactory('QuestChain', {});
  const questChain = await QuestChain.deploy();
  await questChain.deployed();
  console.log('Implementation Address:', questChain.address);

  const QuestChainFactory = await ethers.getContractFactory(
    'QuestChainFactory',
  );
  const questChainFactory = await QuestChainFactory.deploy(
    questChain.address,
    address,
    TREASURY_ADDRESS[chainId],
    PAYMENT_TOKEN[chainId],
    DEFAULT_UPGRADE_FEE,
  );
  await questChainFactory.deployed();
  console.log('Factory Address:', questChainFactory.address);

  const txHash = questChainFactory.deployTransaction.hash;
  console.log('Transaction Hash:', txHash);
  const receipt = await deployer.provider.getTransactionReceipt(txHash);
  console.log('Block Number:', receipt.blockNumber);

  const afterBalance = await deployer.provider.getBalance(address);
  const gasUsed = balance.sub(afterBalance);
  console.log(
    'Gas Used:',
    ethers.utils.formatEther(gasUsed),
    NETWORK_CURRENCY[chainId],
  );
  console.log(
    'Account Balance:',
    ethers.utils.formatEther(afterBalance),
    NETWORK_CURRENCY[chainId],
  );

  if (chainId === 31337) {
    return;
  }

  const deploymentInfo = {
    network: network.name,
    version: commitHash,
    factory: questChainFactory.address,
    implemention: questChain.address,
    txHash,
    blockNumber: receipt.blockNumber.toString(),
  };

  fs.writeFileSync(
    `deployments/${network.name}.json`,
    JSON.stringify(deploymentInfo, undefined, 2),
  );

  try {
    await questChainFactory.deployTransaction.wait(5);
    console.log('Verifying Contracts...');

    await run('verify:verify', {
      address: questChain.address,
      constructorArguments: [],
    });
    console.log('Verified Implementation');

    await run('verify:verify', {
      address: questChainFactory.address,
      constructorArguments: [
        questChain.address,
        address,
        TREASURY_ADDRESS[chainId],
        PAYMENT_TOKEN[chainId],
        DEFAULT_UPGRADE_FEE,
      ],
    });
    console.log('Verified Factory');
  } catch (err) {
    console.error('Error verifying contracts:', err);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
