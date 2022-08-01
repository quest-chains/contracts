// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.11;

import "./IQuestChainToken.sol";

interface IQuestChain {
    event QuestChainCreated(address indexed creator, string details);
    event QuestChainEdited(address indexed editor, string details);
    event QuestsCreated(
        address indexed creator,
        uint256[] questIdList,
        string[] detailsList
    );
    event QuestsEdited(
        address indexed editor,
        uint256[] questIdList,
        string[] detailsList
    );
    event QuestProofsSubmitted(
        address indexed quester,
        uint256[] questIdList,
        string[] proofList
    );
    event QuestProofsReviewed(
        address indexed reviewer,
        address[] questerList,
        uint256[] questIdList,
        bool[] successList,
        string[] detailsList
    );
    event QuestPaused(address indexed editor, uint256 indexed questId);
    event QuestUnpaused(address indexed editor, uint256 indexed questId);
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

    function init(
        address _owner,
        string calldata _details,
        string memory _tokenURI
    ) external;

    function initWithRoles(
        address _owner,
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers
    ) external;

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

    function mintToken(address _quester) external;

    function burnToken(address _quester) external;
}
