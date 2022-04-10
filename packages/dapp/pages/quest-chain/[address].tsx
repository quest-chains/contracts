import { Flex, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { GetStaticPropsContext, InferGetStaticPropsType } from 'next';
import { useRouter } from 'next/router';

import { AddQuestBlock } from '@/components/AddQuestBlock';
import {
  getQuestChainAddresses,
  getQuestChainInfo,
} from '@/graphql/questChains';
import { useLatestQuestChainData } from '@/hooks/useLatestQuestChainData';
import { useWallet } from '@/web3';

type Props = InferGetStaticPropsType<typeof getStaticProps>;

const QuestChain: React.FC<Props> = ({ questChain: inputQuestChain }) => {
  const { isFallback } = useRouter();
  const { address } = useWallet();

  const { questChain, refresh } = useLatestQuestChainData(inputQuestChain);
  if (isFallback) {
    return (
      <VStack>
        <Spinner color="main" />
      </VStack>
    );
  }
  if (!questChain) {
    return (
      <VStack>
        <Text> Quest Chain not found! </Text>
      </VStack>
    );
  }
  const isAdmin: boolean = questChain.admins.some(
    ({ address: a }) => a === address?.toLowerCase(),
  );
  const isEditor: boolean = questChain.editors.some(
    ({ address: a }) => a === address?.toLowerCase(),
  );
  const isReviewer: boolean = questChain.editors.some(
    ({ address: a }) => a === address?.toLowerCase(),
  );

  const isUser = !(isAdmin || isEditor || isReviewer);

  return (
    <VStack w="100%" align="flex-start" color="main">
      <Text fontSize="xl">{questChain.name}</Text>
      <Text>{questChain.description}</Text>
      <SimpleGrid columns={isUser ? 1 : 2} spacing={8} pt={8} w="100%">
        <VStack spacing={2}>
          <Text w="100%">{questChain.quests.length} Quests Found</Text>
          {questChain.quests.map(quest => (
            <Flex
              w="100%"
              boxShadow="inset 0px 0px 0px 1px #AD90FF"
              p={8}
              borderRadius={20}
              justify="space-between"
              key={quest.questId}
            >
              <Flex flexDir="column">
                <Text fontSize="lg">{quest.name}</Text>
                <Text>{quest.description}</Text>
              </Flex>
            </Flex>
          ))}
        </VStack>
        <VStack spacing={8}>
          <AddQuestBlock questChain={questChain} refresh={refresh} />
        </VStack>
      </SimpleGrid>
    </VStack>
  );
};

type QueryParams = { address: string };

export async function getStaticPaths() {
  const addresses = await getQuestChainAddresses(1000);
  const paths = addresses.map(address => ({
    params: { address },
  }));

  return { paths, fallback: true };
}

export const getStaticProps = async (
  context: GetStaticPropsContext<QueryParams>,
) => {
  const address = context.params?.address;

  const questChain = address ? await getQuestChainInfo(address) : null;

  return {
    props: {
      questChain,
    },
    revalidate: 1,
  };
};

export default QuestChain;