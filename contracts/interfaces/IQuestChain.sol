// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "../libraries/QuestChainCommons.sol";
import "./IQuestChainToken.sol";

interface IQuestChain {
    enum Status {
        init,
        review,
        pass,
        fail
    }

    struct QuestDetails {
        // pause status for each quest
        bool paused;
        bool optional;
        bool skipReview;
    }

    event QuestChainInit(string details, string[] quests, bool paused);
    event QuestChainEdited(address editor, string details);
    event QuestsCreated(address creator, string[] detailsList);
    event ConfiguredQuests(
        address editor,
        uint256[] questIdList,
        QuestDetails[] questDetails
    );
    event QuestsEdited(
        address editor,
        uint256[] questIdList,
        string[] detailsList
    );
    event SetLimiter(address limiterContract);
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
    event QuestChainTokenURIUpdated(string tokenURI);

    function init(QuestChainCommons.QuestChainInfo calldata _info) external;

    function setTokenURI(string memory _tokenURI) external;

    function edit(string calldata _details) external;

    function createQuests(string[] calldata _detailsList) external;

    function editQuests(
        uint256[] calldata _questIdList,
        string[] calldata _detailsList
    ) external;

    function configureQuests(
        uint256[] calldata _questIdList,
        QuestDetails[] calldata _questDetails
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

    function mintToken() external;

    function burnToken() external;

    function upgrade() external;

    function questChainFactory() external view returns (IQuestChainFactory);

    function questChainToken() external view returns (IQuestChainToken);

    function questChainId() external view returns (uint256);

    function getTokenURI() external view returns (string memory);

    function questStatus(
        address _quester,
        uint256 _questId
    ) external view returns (Status);
}
