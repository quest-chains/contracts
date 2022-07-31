// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.15;

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

    uint256 public questChainCount = 0;
    mapping(uint256 => address) private _questChains;

    address public admin;
    address public questChainImpl;
    address public questChainToken;
    address public treasury;
    address public paymentToken;
    uint256 public upgradeFee;

    struct QuestChainInfo {
        address chainAddress;
        string details;
        string tokenURI;
        address[3][] members;
        string[] quests;
        bool paused;
    }

    modifier onlyAdmin() {
        require(admin == msg.sender, "QuestChainFactory: not admin");
        _;
    }

    modifier nonZeroAddr(address _address) {
        require(_address != address(0), "QuestChainFactory: 0 address");
        _;
    }

    modifier nonZeroUint(uint256 _uint) {
        require(_uint != 0, "QuestChainFactory: 0 uint256");
        _;
    }

    modifier mustChangeAddr(address _oldAddress, address _newAddress) {
        require(_oldAddress != _newAddress, "QuestChainFactory: no change");
        _;
    }

    modifier mustChangeUint(uint256 _oldUint, uint256 _newUint) {
        require(_oldUint != _newUint, "QuestChainFactory: no change");
        _;
    }

    constructor(
        address _impl,
        address _treasury,
        address _paymentToken,
        uint256 _upgradeFee
    )
        nonZeroAddr(_impl)
        nonZeroAddr(_treasury)
        nonZeroAddr(_paymentToken)
        nonZeroUint(_upgradeFee)
    {
        questChainToken = address(new QuestChainToken());
        admin = msg.sender;
        questChainImpl = _impl;
        treasury = _treasury;
        paymentToken = _paymentToken;
        upgradeFee = _upgradeFee;

        emit FactoryInit();
    }

    function replaceAdmin(address _admin)
        public
        onlyAdmin
        nonZeroAddr(_admin)
        mustChangeAddr(admin, _admin)
    {
        admin = _admin;
        emit AdminReplaced(_admin);
    }

    function replaceChainImpl(address _impl)
        public
        onlyAdmin
        nonZeroAddr(_impl)
        mustChangeAddr(questChainImpl, _impl)
    {
        questChainImpl = _impl;
        emit ImplReplaced(_impl);
    }

    function replaceTreasury(address _treasury)
        public
        onlyAdmin
        nonZeroAddr(_treasury)
        mustChangeAddr(treasury, _treasury)
    {
        treasury = _treasury;
        emit TreasuryReplaced(_treasury);
    }

    function replacePaymentToken(address _paymentToken)
        public
        onlyAdmin
        nonZeroAddr(_paymentToken)
        mustChangeAddr(paymentToken, _paymentToken)
    {
        paymentToken = _paymentToken;
        emit PaymentTokenReplaced(_paymentToken);
    }

    function replaceUpgradeFee(uint256 _upgradeFee)
        public
        onlyAdmin
        nonZeroUint(_upgradeFee)
        mustChangeUint(upgradeFee, _upgradeFee)
    {
        upgradeFee = _upgradeFee;
        emit UpgradeFeeReplaced(_upgradeFee);
    }

    function predictAddress(bytes32 _salt) external view returns (address) {
        return Clones.predictDeterministicAddress(questChainImpl, _salt);
    }

    function create(
        string calldata _details,
        string calldata _tokenURI,
        address[3][] calldata _members,
        string[] calldata _quests,
        bool _paused,
        bytes32 _salt
    ) external returns (address) {
        QuestChainInfo memory info;

        {
            info.chainAddress = _newClone(_salt);
            info.details = _details;
            info.tokenURI = _tokenURI;
            info.members = _members;
            info.quests = _quests;
            info.paused = _paused;
        }

        _setupQuestChain(info);

        return info.chainAddress;
    }

    function getQuestChainAddress(uint256 _index)
        external
        view
        returns (address)
    {
        return _questChains[_index];
    }

    function upgradeQuestChain(address _questChainAddress)
        external
        nonReentrant
    {
        _upgradeQuestChain(_questChainAddress);
    }

    function upgradeQuestChainWithPermit(
        address _questChainAddress,
        uint256 _deadline,
        bytes memory _signature
    ) external nonReentrant {
        (uint8 v, bytes32 r, bytes32 s) = _recoverParameters(_signature);
        IERC20Permit(paymentToken).safePermit(
            msg.sender,
            address(this),
            upgradeFee,
            _deadline,
            v,
            r,
            s
        );
        _upgradeQuestChain(_questChainAddress);
    }

    function _newClone(bytes32 _salt) internal returns (address) {
        return Clones.cloneDeterministic(questChainImpl, _salt);
    }

    function _setupQuestChain(QuestChainInfo memory _info) internal {
        IQuestChainToken(questChainToken).setTokenOwner(
            questChainCount,
            _info.chainAddress
        );

        IQuestChain(_info.chainAddress).init(
            msg.sender,
            _info.details,
            _info.tokenURI,
            _info.members,
            _info.quests,
            _info.paused
        );

        _questChains[questChainCount] = _info.chainAddress;
        emit QuestChainCreated(questChainCount, _info.chainAddress);

        questChainCount++;
    }

    function _upgradeQuestChain(address _questChainAddress) internal {
        IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, upgradeFee);
        IQuestChain(_questChainAddress).upgrade();
        emit QuestChainUpgraded(_questChainAddress, msg.sender, upgradeFee);
    }

    function _recoverParameters(bytes memory _signature)
        internal
        pure
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s
        )
    {
        require(
            _signature.length == 65,
            "QuestChainFactory: invalid signature"
        );
        assembly {
            r := mload(add(_signature, 0x20))
            s := mload(add(_signature, 0x40))
            v := byte(0, mload(add(_signature, 0x60)))
        }
    }
}
