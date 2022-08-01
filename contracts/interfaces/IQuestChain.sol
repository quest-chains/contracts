// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.15;

import "../libraries/QuestChainCommons.sol";
import "./IQuestChainToken.sol";

interface IQuestChain {
    event QuestChainInit(string details, string[] quests, bool paused);
    event QuestChainEdited(address editor, string details);
    event QuestsCreated(
        address creator,
        uint256[] questIdList,
        string[] detailsList
    );
    event QuestsEdited(
        address editor,
        uint256[] questIdList,
        string[] detailsList
    );
    event QuestProofsSubmitted(
        address quester,
        uint256[] questIdList,
        string[] proofList
    );
    event QuestProofsReviewed(
        address reviewer,
        address[] questerList,
        uint256[] questIdList,
        bool[] successList,
        string[] detailsList
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

    function createQuests(string[] calldata _detailsList) external;

    function editQuests(
        uint256[] calldata _questIdList,
        string[] calldata _detailsList
    ) external;

    function submitProofs(
        uint256[] calldata _questIdList,
        string[] calldata _proofList
    ) external;

    function reviewProofs(
        address[] calldata _questerList,
        uint256[] calldata _questIdList,
        bool[] calldata _successList,
        string[] calldata _detailsList
    ) external;

    function questStatus(address _quester, uint256 _questId)
        external
        view
        returns (Status);

    function mintToken() external;

    function burnToken() external;

    function upgrade() external;
}
