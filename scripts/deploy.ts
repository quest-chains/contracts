import { execSync } from 'child_process';
import fs from 'fs';
import { ethers, network, run } from 'hardhat';

import {
  BLOCKSCOUT_CHAIN_IDS,
  networkName,
  SUBGRAPH_NETWORK_NAMES,
  validateSetup,
} from './utils';

async function main() {
  const [chainId, deployer] = await validateSetup();
  if (!deployer.provider) {
    throw new Error('Provider not found for network');
  }
  const commitHash = execSync('git rev-parse --short HEAD', {
    encoding: 'utf-8',
  }).trim();

  console.log('Deploying QuestChainFactory:', networkName[chainId]);
  console.log('Commit Hash:', commitHash);

  const QuestChain = await ethers.getContractFactory('QuestChain', {});
  const questChain = await QuestChain.deploy();
  await questChain.deployed();
  console.log('Implementation Address:', questChain.address);

  const QuestChainFactory = await ethers.getContractFactory(
    'QuestChainFactory',
  );
  const questChainFactory = await QuestChainFactory.deploy(questChain.address);
  await questChainFactory.deployed();
  console.log('Factory Address:', questChainFactory.address);

  const txHash = questChainFactory.deployTransaction.hash;
  console.log('Transaction Hash:', txHash);
  const receipt = await deployer.provider.getTransactionReceipt(txHash);
  console.log('Block Number:', receipt.blockNumber);

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

  const subgraphInfo = {
    network: SUBGRAPH_NETWORK_NAMES[network.name] ?? network.name,
    factory: questChainFactory.address,
    blockNumber: receipt.blockNumber.toString(),
  };

  fs.writeFileSync(
    `../subgraph/src/config/${network.name}.json`,
    JSON.stringify(subgraphInfo, undefined, 2),
  );

  try {
    await questChainFactory.deployTransaction.wait(5);
    console.log('Verifying Contracts...');
    const TASK_VERIFY = BLOCKSCOUT_CHAIN_IDS.includes(chainId)
      ? 'verify:verify-blockscout'
      : 'verify:verify';

    await run(TASK_VERIFY, {
      address: questChain.address,
      constructorArguments: [],
    });
    console.log('Verified Implementation');

    await run(TASK_VERIFY, {
      address: questChainFactory.address,
      constructorArguments: [questChain.address],
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
