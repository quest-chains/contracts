// SPDX-License-Identifier: MIT
// solhint-disable max-states-count

pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import "./interfaces/IQuestChain.sol";

// author: @dan13ram

contract QuestChain is
    IQuestChain,
    ReentrancyGuard,
    Initializable,
    AccessControl,
    Pausable
{
    bytes32 public constant OWNER_ROLE = bytes32(0);
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EDITOR_ROLE = keccak256("EDITOR_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    mapping(uint256 => bool) public questPaused;
    uint256 public questCount;
    IQuestChainFactory public override questChainFactory;
    uint256 public override questChainId;

    mapping(address => mapping(uint256 => Status)) private _questStatus;

    // solhint-disable-next-line no-empty-blocks
    constructor() initializer {}

    function _init(address _owner, string memory _tokenURI) private {
        questChainFactory = IQuestChainFactory(msg.sender);
        questChainId = questChainFactory.questChainCount();

        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        _setRoleAdmin(EDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(REVIEWER_ROLE, ADMIN_ROLE);

        _grantRole(OWNER_ROLE, _owner);
        _grantRole(ADMIN_ROLE, _owner);
        _grantRole(EDITOR_ROLE, _owner);
        _grantRole(REVIEWER_ROLE, _owner);

        _setTokenURI(_tokenURI);
    }

    function questChainToken() public view override returns (IQuestChainToken) {
        return IQuestChainToken(questChainFactory.questChainToken());
    }

    function init(
        address _owner,
        string calldata _details,
        string memory _tokenURI
    ) external override initializer {
        _init(_owner, _tokenURI);

        emit QuestChainCreated(_owner, _details);
    }

    function initWithRoles(
        address _owner,
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers
    ) external override initializer {
        _init(_owner, _tokenURI);

        for (uint256 i = 0; i < _admins.length; i = i + 1) {
            _grantRole(ADMIN_ROLE, _admins[i]);
            _grantRole(EDITOR_ROLE, _admins[i]);
            _grantRole(REVIEWER_ROLE, _admins[i]);
        }

        for (uint256 i = 0; i < _editors.length; i = i + 1) {
            _grantRole(EDITOR_ROLE, _editors[i]);
            _grantRole(REVIEWER_ROLE, _editors[i]);
        }

        for (uint256 i = 0; i < _reviewers.length; i = i + 1) {
            _grantRole(REVIEWER_ROLE, _reviewers[i]);
        }

        emit QuestChainCreated(_owner, _details);
    }

    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        _grantRole(role, account);
        if (role == OWNER_ROLE) {
            grantRole(ADMIN_ROLE, account);
        } else if (role == ADMIN_ROLE) {
            grantRole(EDITOR_ROLE, account);
        } else if (role == EDITOR_ROLE) {
            grantRole(REVIEWER_ROLE, account);
        }
    }

    function revokeRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        _revokeRole(role, account);
        if (role == REVIEWER_ROLE) {
            revokeRole(EDITOR_ROLE, account);
        } else if (role == EDITOR_ROLE) {
            revokeRole(ADMIN_ROLE, account);
        } else if (role == ADMIN_ROLE) {
            revokeRole(OWNER_ROLE, account);
        }
    }

    function pause() external onlyRole(OWNER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(OWNER_ROLE) {
        _unpause();
    }

    modifier whenQuestNotPaused(uint256 _questId) {
        require(!questPaused[_questId], "QuestChain: quest paused");
        _;
    }

    modifier whenQuestPaused(uint256 _questId) {
        require(questPaused[_questId], "QuestChain: quest not paused");
        _;
    }

    modifier validQuest(uint256 _questId) {
        require(_questId < questCount, "QuestChain: quest not found");
        _;
    }

    function _setTokenURI(string memory _tokenURI) internal {
        questChainToken().setTokenURI(questChainId, _tokenURI);
        emit QuestChainTokenURIUpdated(_tokenURI);
    }

    function setTokenURI(string memory _tokenURI)
        public
        override
        onlyRole(OWNER_ROLE)
    {
        _setTokenURI(_tokenURI);
    }

    function getTokenURI() public view override returns (string memory) {
        return questChainToken().uri(questChainId);
    }

    function pauseQuest(uint256 _questId)
        external
        onlyRole(EDITOR_ROLE)
        validQuest(_questId)
        whenQuestNotPaused(_questId)
    {
        questPaused[_questId] = true;
        emit QuestPaused(_msgSender(), _questId);
    }

    function unpauseQuest(uint256 _questId)
        external
        onlyRole(EDITOR_ROLE)
        validQuest(_questId)
        whenQuestPaused(_questId)
    {
        questPaused[_questId] = true;
        emit QuestUnpaused(_msgSender(), _questId);
    }

    function edit(string calldata _details)
        external
        override
        onlyRole(ADMIN_ROLE)
    {
        emit QuestChainEdited(_msgSender(), _details);
    }

    function createQuest(string calldata _details)
        external
        override
        onlyRole(EDITOR_ROLE)
        whenNotPaused
    {
        emit QuestCreated(_msgSender(), questCount, _details);

        questCount += 1;
    }

    function editQuest(uint256 _questId, string calldata _details)
        external
        override
        onlyRole(EDITOR_ROLE)
        whenNotPaused
        validQuest(_questId)
    {
        emit QuestEdited(_msgSender(), _questId, _details);
    }

    function submitProof(uint256 _questId, string calldata _proof)
        external
        override
        whenNotPaused
        whenQuestNotPaused(_questId)
        validQuest(_questId)
    {
        Status status = _questStatus[_msgSender()][_questId];
        require(status != Status.pass, "QuestChain: already passed");

        _questStatus[_msgSender()][_questId] = Status.review;

        emit QuestProofSubmitted(_msgSender(), _questId, _proof);
    }

    function reviewProof(
        address _quester,
        uint256 _questId,
        bool _success,
        string calldata _details
    ) external override onlyRole(REVIEWER_ROLE) validQuest(_questId) {
        Status status = _questStatus[_quester][_questId];
        require(status == Status.review, "QuestChain: quest not in review");
        _questStatus[_quester][_questId] = _success ? Status.pass : Status.fail;

        emit QuestProofReviewed(
            _msgSender(),
            _quester,
            _questId,
            _success,
            _details
        );
    }

    function questStatus(address _quester, uint256 _questId)
        external
        view
        override
        validQuest(_questId)
        returns (Status status)
    {
        status = _questStatus[_quester][_questId];
    }

    function mintToken(address _quester) public override {
        require(questCount > 0, "QuestChain: no quests found");
        for (uint256 questId = 0; questId < questCount; questId = questId + 1) {
            require(
                questPaused[questId] ||
                    _questStatus[_quester][questId] == Status.pass,
                "QuestChain: chain incomplete"
            );
        }
        questChainToken().mint(_quester, questChainId);
    }

    function burnToken(address _quester) public override onlyRole(OWNER_ROLE) {
        questChainToken().burn(_quester, questChainId);
    }
}
