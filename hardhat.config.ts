import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

import dotenv from 'dotenv';
import { HardhatUserConfig, task } from 'hardhat/config';

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (_args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

if (!process.env.PRIVATE_KEY) {
  console.error('invalid env variable: PRIVATE_KEY');
  process.exit(1);
}

const accounts = [process.env.PRIVATE_KEY!];

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000000,
          },
        },
      },
    ],
  },
  networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_ID}`,
      accounts,
    },
    gnosis: {
      url: `https://rpc.gnosischain.com`,
      accounts,
    },
    polygon: {
      url: 'https://rpc-mainnet.maticvigil.com',
      accounts,
    },
    polygonMumbai: {
      url: 'https://rpc-mumbai.maticvigil.com',
      accounts,
    },
    arbitrumOne: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts,
    },
    arbitrumGoerli: {
      url: 'https://goerli-rollup.arbitrum.io/rpc',
      accounts,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY!,
      goerli: process.env.ETHERSCAN_API_KEY!,
      polygon: process.env.POLYGONSCAN_API_KEY!,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY!,
      gnosis: process.env.GNOSISSCAN_API_KEY!,
      arbitrumOne: process.env.ARBISCAN_API_KEY!,
      arbitrumGoerli: process.env.ARBISCAN_API_KEY!,
    },
  },
  typechain: {
    outDir: 'types',
  },
};

export default config;
