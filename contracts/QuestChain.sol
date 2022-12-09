// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Context.sol";

import "./interfaces/IQuestChain.sol";
import "./interfaces/ILimiter.sol";

// author: @dan13ram

/// @author @dan13ram, @parv3213
contract QuestChain is
    IQuestChain,
    ReentrancyGuard,
    Initializable,
    Pausable,
    AccessControl
{
    /********************************
     CONSTANT VARIABLES
     *******************************/

    // role key for the admin role
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    // role key for the editor role
    bytes32 public constant EDITOR_ROLE = keccak256("EDITOR_ROLE");
    // role key for the reviewer role
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    /********************************
     STATE VARIABLES
     *******************************/
    // quest chain upgrade status
    bool public premium;
    // instantiate factory interface
    IQuestChainFactory public questChainFactory;
    // instantiate token interface
    IQuestChainToken public questChainToken;
    // identifier for quest chain and corresponding token
    uint256 public questChainId;
    // counter for all quests
    uint256 public questCount;

    // address of limiter, if any.
    address public limiterContract;

    /********************************
     MAPPING STRUCTS EVENTS MODIFIER
     *******************************/

    mapping(uint256 => QuestDetails) public questDetails;
    // quest completion status for each quest for each user account
    mapping(address => mapping(uint256 => Status)) private _questStatus;

    /**
     * @dev Access control modifier for functions callable by factory contract only
     */
    modifier onlyFactory() {
        require(
            _msgSender() == address(questChainFactory),
            "QuestChain: not factory"
        );
        _;
    }

    /**
     * @dev Modifier for functions which are supported only for premium quest chains
     */
    modifier onlyPremium() {
        require(premium, "QuestChain: not premium");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the quest is valid
     */
    modifier validQuest(uint256 _questId) {
        require(_questId < questCount, "QuestChain: quest not found");
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function init(QuestChainCommons.QuestChainInfo calldata _info)
        external
        initializer
    {
        // set factory interface
        questChainFactory = IQuestChainFactory(_msgSender());
        // set token interface
        questChainToken = IQuestChainToken(questChainFactory.questChainToken());
        // set quest chain / token Id
        questChainId = questChainFactory.questChainCount();

        // set role admins
        _setRoleAdmin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(EDITOR_ROLE, ADMIN_ROLE);
        _setRoleAdmin(REVIEWER_ROLE, ADMIN_ROLE);

        // set token uri
        _setTokenURI(_info.tokenURI);

        // cannot have a quest chain without owners
        require(_info.owners.length > 0, "QuestChain: no owners");

        // set roles for owners
        for (uint256 i = 0; i < _info.owners.length; i = i + 1) {
            _grantRole(DEFAULT_ADMIN_ROLE, _info.owners[i]);
            _grantRole(ADMIN_ROLE, _info.owners[i]);
            _grantRole(EDITOR_ROLE, _info.owners[i]);
            _grantRole(REVIEWER_ROLE, _info.owners[i]);
        }

        // set roles for admins
        for (uint256 i = 0; i < _info.admins.length; i = i + 1) {
            _grantRole(ADMIN_ROLE, _info.admins[i]);
            _grantRole(EDITOR_ROLE, _info.admins[i]);
            _grantRole(REVIEWER_ROLE, _info.admins[i]);
        }

        // set roles for editors
        for (uint256 i = 0; i < _info.editors.length; i = i + 1) {
            _grantRole(EDITOR_ROLE, _info.editors[i]);
            _grantRole(REVIEWER_ROLE, _info.editors[i]);
        }

        // set roles for reviewers
        for (uint256 i = 0; i < _info.reviewers.length; i = i + 1) {
            _grantRole(REVIEWER_ROLE, _info.reviewers[i]);
        }

        // update quests counter
        questCount = questCount + _info.quests.length;
        if (_info.paused) {
            // set pause status
            _pause();
        }

        // log initializer data
        emit QuestChainInit(_info.details, _info.quests, _info.paused);
    }

    /**
     * @dev Triggers disabled state
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Returns to enabled state
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Emits event to update quest chain details
     * @param _details uri of off chain details for quest chain
     */
    function edit(string calldata _details) external onlyRole(ADMIN_ROLE) {
        // log edited quest chain data
        emit QuestChainEdited(_msgSender(), _details);
    }

    /**
     * @notice Admin can decide to add a limiter
     * @param _limiterContract address of limiter
     */
    function setLimiter(address _limiterContract)
        external
        onlyRole(ADMIN_ROLE)
        onlyPremium
    {
        limiterContract = _limiterContract;
        emit SetLimiter(_limiterContract);
    }

    /**
     * @dev Creates quests in quest chain
     * @param _detailsList list of uris of off chain details for new quests
     */
    function createQuests(string[] calldata _detailsList)
        external
        onlyRole(EDITOR_ROLE)
    {
        // update quest counter
        questCount += _detailsList.length;

        // log  off chain details of quests created
        emit QuestsCreated(_msgSender(), _detailsList);
    }

    /**
     * @dev Edits existing quests in quest chain
     * @param _questIdList list of quest ids of the quests to be edited
     * @param _detailsList list of uris of off chain details for each quest
     */
    function editQuests(
        uint256[] calldata _questIdList,
        string[] calldata _detailsList
    ) external onlyRole(EDITOR_ROLE) {
        // local copy of loop length
        uint256 _loopLength = _questIdList.length;

        // ensure equal length arrays
        require(
            _loopLength == _detailsList.length,
            "QuestChain: invalid params"
        );

        // ensure each quest is valid
        for (uint256 i; i < _loopLength; ) {
            require(
                _questIdList[i] < questCount,
                "QuestChain: quest not found"
            );
            unchecked {
                ++i;
            }
        }

        // log off chain details of quests edited
        emit QuestsEdited(_msgSender(), _questIdList, _detailsList);
    }

    // TODO add Natspec
    function configureQuests(
        uint256[] calldata _questIdList,
        QuestDetails[] calldata _questDetails
    ) external onlyRole(EDITOR_ROLE) {
        uint256 _loopLength = _questIdList.length;

        // Check if length of questIdList equals questDetailsList
        require(
            _loopLength == _questDetails.length,
            "QuestChain: invalid params"
        );

        for (uint256 i; i < _loopLength; ) {
            // Check if quest is valid
            require(
                _questIdList[i] < questCount,
                "QuestChain: quest not found"
            );

            questDetails[_questIdList[i]] = QuestDetails(
                _questDetails[i].paused,
                _questDetails[i].optional,
                _questDetails[i].skipReview
            );

            unchecked {
                ++i;
            }
        }
        emit ConfiguredQuests(_msgSender(), _questIdList, _questDetails);
    }

    /**
     * @dev Submit proofs for completing particular quests in quest chain
     * @param _questIdList list of quest ids of the quest submissions
     * @param _proofList list of off chain proofs for each quest
     */
    function submitProofs(
        uint256[] calldata _questIdList,
        string[] calldata _proofList
    ) external whenNotPaused {
        if (limiterContract != address(0)) {
            ILimiter(limiterContract).submitProofLimiter(
                _msgSender(),
                _questIdList
            );
        }

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

    /**
     * @dev Reviews proofs for proofs previously submitted by questers
     * @param _questerList list of questers whose submissions are being reviewed
     * @param _questIdList list of quest ids of the quest submissions
     * @param _successList list of booleans accepting or rejecting submissions
     * @param _detailsList list of off chain comments for each submission
     */
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

    /**
     * @dev Updates token uri for the quest chain nft
     * @param _tokenURI off chain token uri
     */
    function setTokenURI(string memory _tokenURI)
        external
        onlyRole(ADMIN_ROLE)
        onlyPremium
    {
        _setTokenURI(_tokenURI);
    }

    /**
     * @dev Mints NFT to the msg.sender if they have completed all quests
     */

    function mintToken() external {
        require(questCount > 0, "QuestChain: no quests found");
        for (uint256 _questId; _questId < questCount; ++_questId) {
            require(
                questDetails[_questId].optional ||
                    questDetails[_questId].paused ||
                    _questStatus[_msgSender()][_questId] == Status.pass,
                "QuestChain: chain incomplete"
            );
        }
        questChainToken.mint(_msgSender(), questChainId);
    }

    /**
     * @dev Burns NFT from the msg.sender
     */
    function burnToken() external {
        questChainToken.burn(_msgSender(), questChainId);
    }

    /**
     * @dev Upgrades quest chain to premium
     */
    function upgrade() external onlyFactory {
        require(!premium, "QuestChain: already upgraded");
        premium = true;
    }

    /**
     * @dev Public getter to read status of completion of a quest by a particular quester
     * @param _quester address of quester
     * @param _questId identifier of the quest
     */
    function questStatus(address _quester, uint256 _questId)
        external
        view
        validQuest(_questId)
        returns (Status status)
    {
        status = _questStatus[_quester][_questId];
    }

    /**
     * @dev Grants cascading roles to user
     * @param _role role to be granted
     * @param _account address of the user
     */
    function grantRole(bytes32 _role, address _account)
        public
        override
        onlyRole(getRoleAdmin(_role))
    {
        _grantRole(_role, _account);
        if (_role == DEFAULT_ADMIN_ROLE) {
            grantRole(ADMIN_ROLE, _account);
        } else if (_role == ADMIN_ROLE) {
            grantRole(EDITOR_ROLE, _account);
        } else if (_role == EDITOR_ROLE) {
            grantRole(REVIEWER_ROLE, _account);
        }
    }

    /**
     * @dev Revokes cascading roles from user
     * @param _role role to be granted
     * @param _account address of the user
     */
    function revokeRole(bytes32 _role, address _account)
        public
        override
        onlyRole(getRoleAdmin(_role))
    {
        _revokeRole(_role, _account);
        if (_role == REVIEWER_ROLE) {
            revokeRole(EDITOR_ROLE, _account);
        } else if (_role == EDITOR_ROLE) {
            revokeRole(ADMIN_ROLE, _account);
        } else if (_role == ADMIN_ROLE) {
            revokeRole(DEFAULT_ADMIN_ROLE, _account);
        }
    }

    /**
     * @dev Public getter to view quest chain token uri
     */
    function getTokenURI() public view returns (string memory uri) {
        uri = questChainToken.uri(questChainId);
    }

    /**
     * @dev internal function to update status of quest to review
     * @param _questId identifier of quest
     */
    function _submitProof(uint256 _questId) internal validQuest(_questId) {
        require(!questDetails[_questId].paused, "QuestChain: quest paused");
        require(
            _questStatus[_msgSender()][_questId] != Status.pass,
            "QuestChain: already passed"
        );

        questDetails[_questId].skipReview
            ? _questStatus[_msgSender()][_questId] = Status.pass
            : _questStatus[_msgSender()][_questId] = Status.review;
    }

    /**
     * @dev internal function to review quest
     * @param _quester quester address
     * @param _questId identifier of quest
     * @param _success accepting / rejecting proof
     */
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

    /**
     * @dev internal function to update token uri
     * @param _tokenURI off chain token uri
     */
    function _setTokenURI(string memory _tokenURI) internal {
        questChainToken.setTokenURI(questChainId, _tokenURI);
        emit QuestChainTokenURIUpdated(_tokenURI);
    }
}
