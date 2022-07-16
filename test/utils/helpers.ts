import { Log, TransactionReceipt } from '@ethersproject/abstract-provider';
import { Contract } from '@ethersproject/contracts';
import { Libraries } from '@nomiclabs/hardhat-ethers/types';
import { ethers } from 'hardhat';

export const deploy = async <Type>(
  typeName: string,
  libraries?: Libraries,
  ...args: any[]
): Promise<Type> => {
  const ctrFactory = await ethers.getContractFactory(typeName, { libraries });

  const ctr = (await ctrFactory.deploy(...args)) as unknown as Type;
  await (ctr as unknown as Contract).deployed();
  return ctr;
};

export const getContractAt = async <Type>(
  typeName: string,
  address: string,
): Promise<Type> => {
  const ctr = (await ethers.getContractAt(
    typeName,
    address,
  )) as unknown as Type;
  return ctr;
};

export const awaitQuestChainAddress = async (receipt: TransactionReceipt) => {
  if (!receipt || !receipt.logs) return '';
  const abi = new ethers.utils.Interface([
    'event QuestChainCreated(uint256 indexed id, address questChain)',
  ]);
  const eventFragment = abi.events[Object.keys(abi.events)[0]];
  const eventTopic = abi.getEventTopic(eventFragment);
  const event = receipt.logs.find((e: Log) => e.topics[0] === eventTopic);
  if (event) {
    const decodedLog = abi.decodeEventLog(
      eventFragment,
      event.data,
      event.topics,
    );
    return decodedLog.questChain;
  }
  return '';
};

export enum Status {
  init,
  review,
  pass,
  fail,
}
