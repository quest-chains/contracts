// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./IQuestChainToken.sol";

interface IQuestChain {
    event QuestChainCreated(address indexed creator, string details);
    event QuestChainEdited(address indexed editor, string details);
    event QuestCreated(
        address indexed creator,
        uint256 indexed questId,
        string details
    );
    event QuestEdited(
        address indexed editor,
        uint256 indexed questId,
        string details
    );
    event QuestProofSubmitted(
        address indexed quester,
        uint256 indexed questId,
        string proof
    );
    event QuestProofReviewed(
        address indexed reviewer,
        address indexed quester,
        uint256 indexed questId,
        bool success,
        string details
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

    function mintToken(address _quester) external;

    function burnToken(address _quester) external;
}
