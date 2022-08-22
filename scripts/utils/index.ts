import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

export const NETWORK_NAME: Record<number, string> = {
  4: 'Rinkeby Testnet',
  5: 'Goerli Testnet',
  77: 'POA Sokol Testnet',
  100: 'Gnosis Chain',
  137: 'Polygon Mainnet',
  80001: 'Polygon Mumbai Testnet',
  31337: 'Hardhat Chain',
};

export const NETWORK_CURRENCY: Record<number, string> = {
  4: 'ETH',
  5: 'ETH',
  77: 'SPOA',
  100: 'xDAI',
  137: 'MATIC',
  80001: 'MATIC',
  31337: 'ETH',
};

export type DeploymentInfo = {
  network: string;
  factory: string;
  implemention: string;
  txHash: string;
  blockNumber: string;
};

export const TREASURY_ADDRESS: Record<string, string> = {
  4: '0xC9F2D9adfa6C24ce0D5a999F2BA3c6b06E36F75E',
  5: '0xC9F2D9adfa6C24ce0D5a999F2BA3c6b06E36F75E',
  77: '0xC9F2D9adfa6C24ce0D5a999F2BA3c6b06E36F75E',
  100: '0xcDba6263aC0a162848380A1eD117B48D973EABFC', // gnosis safe
  137: '0xcDba6263aC0a162848380A1eD117B48D973EABFC', // gnosis safe
  80001: '0xC9F2D9adfa6C24ce0D5a999F2BA3c6b06E36F75E',
  31337: '0xffffffffffffffffffffffffffffffffffffffff',
};

export const PAYMENT_TOKEN: Record<string, string> = {
  4: '0xFC14dB2acDa7f2ff41462692094206247D4AEBF3', // custom USDC
  5: '0x7f8F6E42C169B294A384F5667c303fd8Eedb3CF3', // custom USDC
  77: '0xDEbaC18E0F827B815A15F2761b566805998c78C9', // custom USDC
  100: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83', // USDC
  137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
  80001: '0xD60e36945160281eB456A962408295B1FC257796', // custom USDC
  31337: '0xffffffffffffffffffffffffffffffffffffffff',
};

export const DEFAULT_UPGRADE_FEE = 10000000; // 10 USDC with 6 decimals

export type SetupValues = {
  chainId: number;
  deployer: SignerWithAddress;
  address: string;
  balance: BigNumber;
};

export const validateSetup = async (): Promise<SetupValues> => {
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  if (!deployer.provider) {
    throw new Error('Provider not found for network');
  }
  const { chainId } = await deployer.provider.getNetwork();
  if (!Object.keys(NETWORK_NAME).includes(chainId.toString())) {
    throw new Error('Unsupported network');
  }
  console.log('Account Address:', address);
  const balance = await deployer.provider.getBalance(address);
  console.log(
    'Account Balance:',
    ethers.utils.formatEther(balance),
    NETWORK_CURRENCY[chainId],
  );

  return { chainId, deployer, address, balance };
};
