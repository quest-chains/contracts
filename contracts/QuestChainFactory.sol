// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/IQuestChain.sol";
import "./interfaces/IQuestChainFactory.sol";
import "./QuestChainToken.sol";

// author: @dan13ram

contract QuestChainFactory is IQuestChainFactory, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for IERC20Permit;

    /********************************
     STATE VARIABLES
     *******************************/

    // counter for all quest chains
    uint256 public questChainCount = 0;
    // cost to upgrade quest chains
    uint256 public upgradeFee;
    // access control role
    address public admin;
    // implementation contract address for quest chain
    address public questChainImpl;
    // contract address for quest chain ERC1155 tokens
    address public questChainToken;
    // DAO treasury address
    address public treasury;
    // ERC20 token address for payments #todo consider making this IERC20Permit interface
    address public paymentToken;

    /********************************
     MAPPING STRUCTS EVENTS MODIFIER
     *******************************/

    // mapping from quest chain counter to deployed quest chains
    mapping(uint256 => address) private _questChains;

    /**
     * @dev Access control modifier for functions callable by admin only
     */
    modifier onlyAdmin() {
        require(admin == msg.sender, "QuestChainFactory: not admin");
        _;
    }

    /**
     * @dev Modifier enforces non zero address
     */
    modifier nonZeroAddr(address _address) {
        require(_address != address(0), "QuestChainFactory: 0 address");
        _;
    }

    /**
     * @dev Modifier enforces integers cannot be zero
     */
    modifier nonZeroUint(uint256 _uint) {
        require(_uint != 0, "QuestChainFactory: 0 uint256");
        _;
    }

    /**
     * @dev Modifier enforces two addresses are different
     */
    modifier mustChangeAddr(address _oldAddress, address _newAddress) {
        require(_oldAddress != _newAddress, "QuestChainFactory: no change");
        _;
    }

    /**
     * @dev Modifier enforces two integers are different
     */
    modifier mustChangeUint(uint256 _oldUint, uint256 _newUint) {
        require(_oldUint != _newUint, "QuestChainFactory: no change");
        _;
    }

    constructor(
        address _impl,
        address _admin,
        address _treasury,
        address _paymentToken,
        uint256 _upgradeFee
    )
        nonZeroAddr(_impl)
        nonZeroAddr(_admin)
        nonZeroAddr(_treasury)
        nonZeroAddr(_paymentToken)
        nonZeroUint(_upgradeFee)
    {
        // deploy the Quest Chain Token and store it's address
        questChainToken = address(new QuestChainToken());

        // set the admin address
        admin = _admin;

        // set the quest chain implementation contract
        questChainImpl = _impl;

        // set the DAO treasury address
        treasury = _treasury;

        // set the payment token address #todo consider assigning the interface here
        paymentToken = _paymentToken;

        // set the quest chain upgrade fee
        upgradeFee = _upgradeFee;

        // log constructor data #todo consider renaming this without Init - since it's not an initializer related func
        emit FactoryInit();
    }

    /*************************
     ACCESS CONTROL FUNCTIONS
     *************************/

    /**
     * @dev Assigns a new admin address
     * @param _admin the address of the new admin
     */
    function replaceAdmin(address _admin)
        external
        onlyAdmin
        nonZeroAddr(_admin)
        mustChangeAddr(admin, _admin)
    {
        // set new admin address
        admin = _admin;

        // log admin change data
        emit AdminReplaced(_admin);
    }

    /**
     * @dev Assigns a new quest chain contract implementation address
     * @param _impl the address of the new quest chain implementation contract
     * #todo consider storing each different implementation address in a registry mapping for extensibility
     */
    function replaceChainImpl(address _impl)
        external
        onlyAdmin
        nonZeroAddr(_impl)
        mustChangeAddr(questChainImpl, _impl)
    {
        // set new quest chain contract implementation address
        questChainImpl = _impl;

        // log quest chain contract implementation change data
        emit ImplReplaced(_impl);
    }

    /**
     * @dev Assigns a new treasury address
     * @param _treasury the address of the new DAO treasury
     * #todo #security #medium fee collection address could be immutable for increased security
     */
    function replaceTreasury(address _treasury)
        external
        onlyAdmin
        nonZeroAddr(_treasury)
        mustChangeAddr(treasury, _treasury)
    {
        // set new treasury address
        treasury = _treasury;

        // log treasury address change data
        emit TreasuryReplaced(_treasury);
    }

    /**
     * @dev Assigns a new payment token address
     * @param _paymentToken the address of the new payment token
     * #todo #security #high payment token address could be immutable for increased security
     */
    function replacePaymentToken(address _paymentToken)
        external
        onlyAdmin
        nonZeroAddr(_paymentToken)
        mustChangeAddr(paymentToken, _paymentToken)
    {
        // set new payment token address
        paymentToken = _paymentToken;

        // log payment token change data
        emit PaymentTokenReplaced(_paymentToken);
    }

    /**
     * @dev Change upgrade fee
     * @param _upgradeFee the address of the new DAO treasury
     * #todo #security #high payment token address could be immutable for increased security
     *
     * #todo - combining calls to replaceUpgradeFee and replaceUpgradeToken could be used maliciously before a user's
     * #todo - upgrade; effectively allowing QuestChains to steal arbitrary kinds and amounts of tokens
     * #todo - also could be combined with replaceTreasury to make the funds unavailable to DAO members
     */
    function replaceUpgradeFee(uint256 _upgradeFee)
        external
        onlyAdmin
        nonZeroUint(_upgradeFee)
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
    ) external returns (address) {
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
    ) external returns (address) {
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
        return Clones.cloneDeterministic(questChainImpl, _salt);
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
        IQuestChainToken(questChainToken).setTokenOwner(
            questChainCount,
            _questChainAddress
        );

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
     * #todo #medium if safeTransfer call returns false; upgrade will not revert
     */
    function _upgradeQuestChain(address _questChainAddress) internal {
        // transfer upgrade fee to the treasury from caller
        IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, upgradeFee);

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
        IERC20Permit(paymentToken).safePermit(
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
