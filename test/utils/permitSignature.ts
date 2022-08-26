import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumberish, constants } from 'ethers';

import { MockERC20Token } from '../../types';

export const getPermitSignature = async (
  wallet: SignerWithAddress,
  token: MockERC20Token,
  spender: string,
  value: BigNumberish = constants.MaxUint256,
  deadline = constants.MaxUint256,
): Promise<string> => {
  const [nonce, name, version, chainId] = await Promise.all([
    token.nonces(wallet.address),
    token.name(),
    '1',
    wallet.getChainId(),
  ]);

  return wallet._signTypedData(
    {
      name,
      version,
      chainId,
      verifyingContract: token.address,
    },
    {
      Permit: [
        {
          name: 'owner',
          type: 'address',
        },
        {
          name: 'spender',
          type: 'address',
        },
        {
          name: 'value',
          type: 'uint256',
        },
        {
          name: 'nonce',
          type: 'uint256',
        },
        {
          name: 'deadline',
          type: 'uint256',
        },
      ],
    },
    {
      owner: wallet.address,
      spender,
      value,
      nonce,
      deadline,
    },
  );
};
