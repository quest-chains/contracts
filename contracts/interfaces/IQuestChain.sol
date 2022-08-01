// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.15;

import "../libraries/QuestChainCommons.sol";
import "./IQuestChainToken.sol";

interface IQuestChain {
    event QuestChainInit(string details, string[] quests, bool paused);
    event QuestChainEdited(address editor, string details);
    event QuestCreated(address creator, uint256 questId, string details);
    event QuestEdited(address editor, uint256 questId, string details);
    event QuestProofSubmitted(address quester, uint256 questId, string proof);
    event QuestProofReviewed(
        address reviewer,
        address quester,
        uint256 questId,
        bool success,
        string details
    );
    event QuestPaused(address editor, uint256 questId);
    event QuestUnpaused(address editor, uint256 questId);
    event QuestChainTokenURIUpdated(string tokenURI);

    enum Status {
        init,
        review,
        pass,
        fail
    }

    function questChainFactory() external view returns (IQuestChainFactory);

    function questChainToken() external view returns (IQuestChainToken);

    function questChainId() external view returns (uint256);

    function init(QuestChainCommons.QuestChainInfo calldata _info) external;

    function setTokenURI(string memory _tokenURI) external;

    function getTokenURI() external view returns (string memory);

    function edit(string calldata _details) external;

    function createQuest(string calldata _details) external;

    function editQuest(uint256 _questId, string calldata _details) external;

    function submitProof(uint256 _questId, string calldata _proof) external;

    function reviewProof(
        address _quester,
        uint256 _questId,
        bool _success,
        string calldata _details
    ) external;

    function questStatus(address _quester, uint256 _questId)
        external
        view
        returns (Status);

    function mintToken() external;

    function burnToken() external;

    function upgrade() external;
}
