import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';

export const networkName: Record<number, string> = {
  1: 'Ethereum Mainnet',
  4: 'Rinkeby Testnet',
  100: 'Gnosis Chain',
  137: 'Polygon Mainnet',
  80001: 'Polygon Mumbai Testnet',
  31337: 'Hardhat Chain',
};

export const networkCurrency: Record<number, string> = {
  1: 'ETH',
  4: 'ETH',
  100: 'xDAI',
  137: 'MATIC',
  80001: 'MATIC',
  31337: 'ETH',
};

export const SUBGRAPH_NETWORK_NAMES: Record<string, string> = {
  polygonMumbai: 'mumbai',
  polygon: 'matic',
  rinkeby: 'rinkeby',
  xdai: 'xdai',
};

export const BLOCKSCOUT_CHAIN_IDS = [77, 100];

export type DeploymentInfo = {
  network: string;
  factory: string;
  implemention: string;
  txHash: string;
  blockNumber: string;
};

export const validateSetup = async (): Promise<[number, SignerWithAddress]> => {
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  if (!deployer.provider) {
    throw new Error('Provider not found for network');
  }
  const { chainId } = await deployer.provider.getNetwork();
  if (!Object.keys(networkName).includes(chainId.toString())) {
    throw new Error('Unsupported network');
  }
  console.log('Account address:', address);
  console.log(
    'Account balance:',
    ethers.utils.formatEther(await deployer.provider.getBalance(address)),
    networkCurrency[chainId],
  );

  return [chainId, deployer];
};
