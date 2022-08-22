// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

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
    Pausable,
    AccessControl
{
    bytes32 public constant OWNER_ROLE = bytes32(0);
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant EDITOR_ROLE = keccak256("EDITOR_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    bool public premium;
    IQuestChainFactory public questChainFactory;
    IQuestChainToken public questChainToken;
    uint256 public questChainId;
    uint256 public questCount;

    mapping(uint256 => bool) public questPaused;
    mapping(address => mapping(uint256 => Status)) private _questStatus;

    modifier onlyFactory() {
        require(
            _msgSender() == address(questChainFactory),
            "QuestChain: not factory"
        );
        _;
    }

    modifier onlyPremium() {
        require(premium, "QuestChain: not premium");
        _;
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

    // solhint-disable-next-line no-empty-blocks
    constructor() {
        _disableInitializers();
    }

    function init(QuestChainCommons.QuestChainInfo calldata _info)
        external
        initializer
    {
        questChainFactory = IQuestChainFactory(_msgSender());
        questChainToken = IQuestChainToken(questChainFactory.questChainToken());
        questChainId = questChainFactory.questChainCount();

        _setRoleAdmin(ADMIN_ROLE, OWNER_ROLE);
        _setRoleAdmin(EDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(REVIEWER_ROLE, ADMIN_ROLE);

        _setTokenURI(_info.tokenURI);
        require(_info.owners.length > 0, "QuestChain: no owners");

        for (uint256 i = 0; i < _info.owners.length; i = i + 1) {
            _grantRole(OWNER_ROLE, _info.owners[i]);
            _grantRole(ADMIN_ROLE, _info.owners[i]);
            _grantRole(EDITOR_ROLE, _info.owners[i]);
            _grantRole(REVIEWER_ROLE, _info.owners[i]);
        }

        for (uint256 i = 0; i < _info.admins.length; i = i + 1) {
            _grantRole(ADMIN_ROLE, _info.admins[i]);
            _grantRole(EDITOR_ROLE, _info.admins[i]);
            _grantRole(REVIEWER_ROLE, _info.admins[i]);
        }

        for (uint256 i = 0; i < _info.editors.length; i = i + 1) {
            _grantRole(EDITOR_ROLE, _info.editors[i]);
            _grantRole(REVIEWER_ROLE, _info.editors[i]);
        }

        for (uint256 i = 0; i < _info.reviewers.length; i = i + 1) {
            _grantRole(REVIEWER_ROLE, _info.reviewers[i]);
        }

        questCount = questCount + _info.quests.length;
        if (_info.paused) {
            _pause();
        }
        emit QuestChainInit(_info.details, _info.quests, _info.paused);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function edit(string calldata _details) external onlyRole(ADMIN_ROLE) {
        emit QuestChainEdited(_msgSender(), _details);
    }

    function createQuests(string[] calldata _detailsList)
        external
        onlyRole(EDITOR_ROLE)
    {
        uint256 _loopLength = _detailsList.length;
        uint256 _questCount = questCount;
        uint256[] memory _questIdList = new uint256[](_loopLength);

        for (uint256 i; i < _loopLength; ) {
            _questIdList[i] = _questCount + i;
            unchecked {
                ++i;
            }
        }

        questCount += _detailsList.length;

        emit QuestsCreated(_msgSender(), _questIdList, _detailsList);
    }

    function editQuests(
        uint256[] calldata _questIdList,
        string[] calldata _detailsList
    ) external onlyRole(EDITOR_ROLE) {
        uint256 _loopLength = _questIdList.length;

        require(
            _loopLength == _detailsList.length,
            "QuestChain: invalid params"
        );

        for (uint256 i; i < _loopLength; ) {
            require(
                _questIdList[i] < questCount,
                "QuestChain: quest not found"
            );
            unchecked {
                ++i;
            }
        }

        emit QuestsEdited(_msgSender(), _questIdList, _detailsList);
    }

    function pauseQuests(
        uint256[] calldata _questIdList,
        bool[] calldata _pausedList
    ) external onlyRole(EDITOR_ROLE) {
        uint256 _loopLength = _questIdList.length;
        require(
            _loopLength == _pausedList.length,
            "QuestChain: invalid params"
        );
        for (uint256 i; i < _loopLength; ) {
            if (_pausedList[i]) {
                _pauseQuest(_questIdList[i]);
            } else {
                _unpauseQuest(_questIdList[i]);
            }
            unchecked {
                ++i;
            }
        }
        emit QuestsPaused(_msgSender(), _questIdList, _pausedList);
    }

    function submitProofs(
        uint256[] calldata _questIdList,
        string[] calldata _proofList
    ) external whenNotPaused {
        uint256 _loopLength = _questIdList.length;

        require(_loopLength == _proofList.length, "QuestChain: invalid params");

        for (uint256 i; i < _loopLength; ) {
            _submitProof(_questIdList[i]);
            unchecked {
                ++i;
            }
        }

        emit QuestProofsSubmitted(_msgSender(), _questIdList, _proofList);
    }

    function reviewProofs(
        address[] calldata _questerList,
        uint256[] calldata _questIdList,
        bool[] calldata _successList,
        string[] calldata _detailsList
    ) external onlyRole(REVIEWER_ROLE) {
        uint256 _loopLength = _questerList.length;

        require(
            _loopLength == _questIdList.length &&
                _loopLength == _successList.length &&
                _loopLength == _detailsList.length,
            "QuestChain: invalid params"
        );

        for (uint256 i; i < _loopLength; ) {
            _reviewProof(_questerList[i], _questIdList[i], _successList[i]);
            unchecked {
                ++i;
            }
        }

        emit QuestProofsReviewed(
            _msgSender(),
            _questerList,
            _questIdList,
            _successList,
            _detailsList
        );
    }

    function setTokenURI(string memory _tokenURI)
        external
        onlyRole(ADMIN_ROLE)
        onlyPremium
    {
        _setTokenURI(_tokenURI);
    }

    function mintToken() external {
        address quester = _msgSender();
        require(questCount > 0, "QuestChain: no quests found");
        for (uint256 questId = 0; questId < questCount; questId = questId + 1) {
            require(
                questPaused[questId] ||
                    _questStatus[quester][questId] == Status.pass,
                "QuestChain: chain incomplete"
            );
        }
        questChainToken.mint(quester, questChainId);
    }

    function burnToken() external {
        address quester = _msgSender();
        questChainToken.burn(quester, questChainId);
    }

    function upgrade() external onlyFactory {
        require(!premium, "QuestChain: already upgraded");
        premium = true;
    }

    function questStatus(address _quester, uint256 _questId)
        external
        view
        validQuest(_questId)
        returns (Status status)
    {
        status = _questStatus[_quester][_questId];
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

    function getTokenURI() public view returns (string memory) {
        return questChainToken.uri(questChainId);
    }

    function _submitProof(uint256 _questId)
        internal
        whenQuestNotPaused(_questId)
        validQuest(_questId)
    {
        require(
            _questStatus[_msgSender()][_questId] != Status.pass,
            "QuestChain: already passed"
        );

        _questStatus[_msgSender()][_questId] = Status.review;
    }

    function _reviewProof(
        address _quester,
        uint256 _questId,
        bool _success
    ) internal validQuest(_questId) {
        require(
            _questStatus[_quester][_questId] == Status.review,
            "QuestChain: quest not in review"
        );

        _questStatus[_quester][_questId] = _success ? Status.pass : Status.fail;
    }

    function _setTokenURI(string memory _tokenURI) internal {
        questChainToken.setTokenURI(questChainId, _tokenURI);
        emit QuestChainTokenURIUpdated(_tokenURI);
    }

    function _pauseQuest(uint256 _questId)
        internal
        validQuest(_questId)
        whenQuestNotPaused(_questId)
    {
        questPaused[_questId] = true;
    }

    function _unpauseQuest(uint256 _questId)
        internal
        validQuest(_questId)
        whenQuestPaused(_questId)
    {
        questPaused[_questId] = false;
    }
}
