// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/IQuestChain.sol";
import "./interfaces/IQuestChainFactory.sol";
import "./QuestChainToken.sol";

// author: @dan13ram

/* solhint-disable not-rely-on-time */

contract QuestChainFactory is IQuestChainFactory, ReentrancyGuard {
    using SafeERC20 for IERC20Token;

    /********************************
     STATE VARIABLES
     *******************************/

    // immutable contract address for quest chain ERC1155 tokens
    IQuestChainToken public immutable questChainToken;
    // immutable template contract address for quest chain
    address public immutable questChainTemplate;
    // immutable DAO treasury address
    address public immutable treasury;

    // counter for all quest chains
    uint256 public questChainCount = 0;

    // access control role
    address public admin;
    // proposed admin address
    address public proposedAdmin;
    // timestamp of last admin proposal
    uint256 public adminProposalTimestamp;

    // ERC20 token address for payments
    IERC20Token public paymentToken;
    // proposed payment token address
    address public proposedPaymentToken;
    // timestamp of last paymentToken proposal
    uint256 public paymentTokenProposalTimestamp;

    // cost to upgrade quest chains
    uint256 public upgradeFee;
    // proposed upgrade fee
    uint256 public proposedUpgradeFee;
    // timestamp of last upgrade fee proposal
    uint256 public upgradeFeeProposalTimestamp;

    uint256 private constant ONE_DAY = 86400;

    /********************************
     MAPPING STRUCTS EVENTS MODIFIER
     *******************************/

    // mapping from quest chain counter to deployed quest chains
    mapping(uint256 => address) private _questChains;

    /**
     * @dev Access control modifier for functions callable by admin only
     */
    modifier onlyAdmin() {
        require(admin == msg.sender, "QCFactory: not admin");
        _;
    }

    /**
     * @dev Modifier enforces non zero address
     */
    modifier nonZeroAddr(address _address) {
        require(_address != address(0), "QCFactory: 0 address");
        _;
    }

    /**
     * @dev Modifier enforces two addresses are different
     */
    modifier mustChangeAddr(address _oldAddress, address _newAddress) {
        require(_oldAddress != _newAddress, "QCFactory: no change");
        _;
    }

    /**
     * @dev Modifier enforces two integers are different
     */
    modifier mustChangeUint(uint256 _oldUint, uint256 _newUint) {
        require(_oldUint != _newUint, "QCFactory: no change");
        _;
    }

    /**
     * @dev Modifier enforces timestamps be atleast a day ago
     */
    modifier onlyAfterDelay(uint256 _timestamp) {
        require(block.timestamp >= _timestamp + ONE_DAY, "QCFactory: too soon");
        _;
    }

    constructor(
        address _template,
        address _admin,
        address _treasury,
        address _paymentToken,
        uint256 _upgradeFee
    )
        nonZeroAddr(_template)
        nonZeroAddr(_admin)
        nonZeroAddr(_treasury)
        nonZeroAddr(_paymentToken)
    {
        // deploy the Quest Chain Token and store it's address
        questChainToken = new QuestChainToken();

        // set the quest chain template contract
        questChainTemplate = _template;

        // set the DAO treasury address
        treasury = _treasury;

        // set the admin address
        admin = _admin;

        // set the payment token address
        paymentToken = IERC20Token(_paymentToken);

        // set the quest chain upgrade fee
        upgradeFee = _upgradeFee;

        // log constructor data
        emit FactorySetup();
    }

    /*************************
     ACCESS CONTROL FUNCTIONS
     *************************/

    /**
     * @dev Proposes a new admin address
     * @param _admin the address of the new admin
     */
    function proposeAdminReplace(address _admin)
        external
        onlyAdmin
        nonZeroAddr(_admin)
        mustChangeAddr(proposedAdmin, _admin)
    {
        // set proposed admin address
        proposedAdmin = _admin;
        adminProposalTimestamp = block.timestamp;

        // log proposedAdmin change data
        emit AdminReplaceProposed(_admin);
    }

    /**
     * @dev Executes the proposed admin replacement
     */
    function executeAdminReplace()
        external
        nonZeroAddr(proposedAdmin)
        onlyAfterDelay(adminProposalTimestamp)
        mustChangeAddr(proposedAdmin, admin)
    {
        require(proposedAdmin == msg.sender, "QCFactory: !proposedAdmin");

        // replace admin
        admin = proposedAdmin;

        delete proposedAdmin;
        delete adminProposalTimestamp;

        // log admin change data
        emit AdminReplaced(admin);
    }

    /**
     * @dev Proposes a new paymentToken address
     * @param _paymentToken the address of the new paymentToken
     */
    function proposePaymentTokenReplace(address _paymentToken)
        external
        onlyAdmin
        nonZeroAddr(_paymentToken)
        mustChangeAddr(proposedPaymentToken, _paymentToken)
    {
        // set proposed paymentToken address
        proposedPaymentToken = _paymentToken;
        paymentTokenProposalTimestamp = block.timestamp;

        // log proposedPaymentToken change data
        emit PaymentTokenReplaceProposed(_paymentToken);
    }

    /**
     * @dev Executes the proposed paymentToken replacement
     */
    function executePaymentTokenReplace()
        external
        onlyAdmin
        nonZeroAddr(proposedPaymentToken)
        onlyAfterDelay(paymentTokenProposalTimestamp)
        mustChangeAddr(proposedPaymentToken, address(paymentToken))
    {
        // replace paymentToken
        paymentToken = IERC20Token(proposedPaymentToken);

        delete proposedPaymentToken;
        delete paymentTokenProposalTimestamp;

        // log paymentToken change data
        emit PaymentTokenReplaced(paymentToken);
    }

    /**
     * @dev Proposes a new upgradeFee
     * @param _upgradeFee the new upgradeFee
     */
    function proposeUpgradeFeeReplace(uint256 _upgradeFee)
        external
        onlyAdmin
        mustChangeUint(proposedUpgradeFee, _upgradeFee)
    {
        // set proposed upgradeFee
        proposedUpgradeFee = _upgradeFee;
        upgradeFeeProposalTimestamp = block.timestamp;

        // log proposedUpgradeFee change data
        emit UpgradeFeeReplaceProposed(_upgradeFee);
    }

    /**
     * @dev Executes the proposed upgradeFee replacement
     */
    function executeUpgradeFeeReplace()
        external
        onlyAdmin
        onlyAfterDelay(upgradeFeeProposalTimestamp)
        mustChangeUint(proposedUpgradeFee, upgradeFee)
    {
        // replace upgradeFee
        upgradeFee = proposedUpgradeFee;

        delete proposedUpgradeFee;
        delete upgradeFeeProposalTimestamp;

        // log upgradeFee change data
        emit UpgradeFeeReplaced(upgradeFee);
    }

    /**
     * @dev Change upgrade fee
     * @param _upgradeFee the address of the new DAO treasury
     */
    function replaceUpgradeFee(uint256 _upgradeFee)
        external
        onlyAdmin
        mustChangeUint(upgradeFee, _upgradeFee)
    {
        // set new upgrade fee amount
        upgradeFee = _upgradeFee;

        // log upgrade fee change data
        emit UpgradeFeeReplaced(_upgradeFee);
    }

    /**
     * @dev Deploys a new quest chain minimal proxy
     * @param _info the initialization data struct for our new clone
     * @param _salt an arbitrary source of entropy
     */
    function create(
        QuestChainCommons.QuestChainInfo calldata _info,
        bytes32 _salt
    ) external returns (address) {
        // deploy new quest chain minimal proxy
        return _create(_info, _salt);
    }

    /**
     * @dev Deploys a new quest chain minimal proxy and runs an upgrade
     * @param _info the initialization data struct for our new clone
     * @param _salt an arbitrary source of entropy
     */
    function createAndUpgrade(
        QuestChainCommons.QuestChainInfo calldata _info,
        bytes32 _salt
    ) external nonReentrant returns (address) {
        // deploy new quest chain minimal proxy
        address questChainAddress = _create(_info, _salt);

        // upgrade new quest chain and transfer upgrade fee to treasury
        _upgradeQuestChain(questChainAddress);
        return questChainAddress;
    }

    /**
     * @dev Deploys a new quest chain minimal proxy and runs an upgrade while permitting upgrade fee
     * @param _info the initialization data struct for our new clone
     * @param _salt an arbitrary source of entropy
     * @param _deadline the timestamp where permit expires
     * @param _signature the ERC20 permit signature
     */
    function createAndUpgradeWithPermit(
        QuestChainCommons.QuestChainInfo calldata _info,
        bytes32 _salt,
        uint256 _deadline,
        bytes calldata _signature
    ) external nonReentrant returns (address) {
        // deploy new quest chain minimal proxy
        address questChainAddress = _create(_info, _salt);

        // upgrade new quest chain and permit fee
        _upgradeQuestChainWithPermit(questChainAddress, _deadline, _signature);
        return questChainAddress;
    }

    /**
     * @dev Upgrades an existing quest chain contract
     * @param _questChainAddress the quest chain contract to be upgraded
     */
    function upgradeQuestChain(address _questChainAddress)
        external
        nonReentrant
    {
        // upgrade new quest chain and transfer upgrade fee to treasury
        _upgradeQuestChain(_questChainAddress);
    }

    /**
     * @dev Upgrades an existing quest chain contract
     * @param _questChainAddress the quest chain contract to be upgraded
     * @param _deadline the timestamp where permit expires
     * @param _signature the ERC20 permit signature
     */
    function upgradeQuestChainWithPermit(
        address _questChainAddress,
        uint256 _deadline,
        bytes calldata _signature
    ) external nonReentrant {
        _upgradeQuestChainWithPermit(_questChainAddress, _deadline, _signature);
    }

    /**
     * @dev Returns the address of a deployed quest chain proxy
     * @param _index the quest chain contract index
     */
    function getQuestChainAddress(uint256 _index)
        external
        view
        returns (address)
    {
        return _questChains[_index];
    }

    /**
     * @dev Internal function deploys and initializes a new quest chain minimal proxy
     * @param _info the initialization data struct for our new clone
     * @param _salt an arbitrary source of entropy
     */
    function _create(
        QuestChainCommons.QuestChainInfo calldata _info,
        bytes32 _salt
    ) internal returns (address) {
        // deploy a new quest chain clone
        address questChainAddress = _newClone(_salt);

        // initialize the new quest chain clone
        _setupQuestChain(questChainAddress, _info);

        return questChainAddress;
    }

    /**
     * @dev Internal function deploys a new quest chain minimal proxy
     * @param _salt an arbitrary source of entropy
     */
    function _newClone(bytes32 _salt) internal returns (address) {
        return Clones.cloneDeterministic(questChainTemplate, _salt);
    }

    /**
     * @dev Internal function initializes a new quest chain minimal proxy
     * @param _questChainAddress the new minimal proxy's address
     * @param _info the initialization parameters
     */
    function _setupQuestChain(
        address _questChainAddress,
        QuestChainCommons.QuestChainInfo calldata _info
    ) internal {
        // assign the quest chain token owner
        questChainToken.setTokenOwner(questChainCount, _questChainAddress);

        // initialize the quest chain proxy
        IQuestChain(_questChainAddress).init(_info);

        // store the new proxy's address in the quest chain registry
        _questChains[questChainCount] = _questChainAddress;

        // log quest chain creation data
        emit QuestChainCreated(questChainCount, _questChainAddress);

        // increment quest chain counter
        questChainCount++;
    }

    /**
     * @dev Internal function upgrades an existing quest chain and transfers upgrade fee to treasury
     * @param _questChainAddress the new minimal proxy's address
     */
    function _upgradeQuestChain(address _questChainAddress) internal {
        // transfer upgrade fee to the treasury from caller
        paymentToken.safeTransferFrom(msg.sender, treasury, upgradeFee);

        // assign quest chain as premium
        IQuestChain(_questChainAddress).upgrade();

        // log quest chain premium upgrade data
        emit QuestChainUpgraded(msg.sender, _questChainAddress);
    }

    /**
     * @dev Internal function upgrades an existing quest chain and permits upgrade fee
     * @param _questChainAddress the new minimal proxy's address
     * @param _deadline the timestamp permit expires upon
     * @param _signature the ERC20Permit signature
     */
    function _upgradeQuestChainWithPermit(
        address _questChainAddress,
        uint256 _deadline,
        bytes calldata _signature
    ) internal {
        // recover signature parameters
        (uint8 v, bytes32 r, bytes32 s) = QuestChainCommons.recoverParameters(
            _signature
        );

        // permit upgrade fee
        paymentToken.safePermit(
            msg.sender,
            address(this),
            upgradeFee,
            _deadline,
            v,
            r,
            s
        );

        // upgrade the quest chain to premium
        _upgradeQuestChain(_questChainAddress);
    }
}
