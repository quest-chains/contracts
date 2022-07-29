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
        nonZeroAddr(_treasury)
        nonZeroAddr(_paymentToken)
        nonZeroUint(upgradeFee)
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

    function _setupQuestChain(
        address _questChainAddress,
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers
    ) internal {
        IQuestChainToken(questChainToken).setTokenOwner(
            questChainCount,
            _questChainAddress
        );

        IQuestChain(_questChainAddress).init(
            msg.sender,
            _details,
            _tokenURI,
            _admins,
            _editors,
            _reviewers
        );

        _questChains[questChainCount] = _questChainAddress;
        emit QuestChainCreated(questChainCount, _questChainAddress);

        questChainCount++;
    }

    function predictAddress(bytes32 _salt) external view returns (address) {
        return Clones.predictDeterministicAddress(questChainImpl, _salt);
    }

    function create(
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers,
        bytes32 _salt
    ) external returns (address) {
        address questChainAddress = Clones.cloneDeterministic(
            questChainImpl,
            _salt
        );

        _setupQuestChain(
            questChainAddress,
            _details,
            _tokenURI,
            _admins,
            _editors,
            _reviewers
        );

        return questChainAddress;
    }

    function getQuestChainAddress(uint256 _index)
        external
        view
        returns (address)
    {
        return _questChains[_index];
    }

    function _upgradeQuestChain(address _questChainAddress) internal {
        IERC20(paymentToken).safeTransferFrom(msg.sender, treasury, upgradeFee);
        IQuestChain(_questChainAddress).upgrade();
        emit QuestChainUpgraded(_questChainAddress, msg.sender, upgradeFee);
    }

    function upgradeQuestChain(address _questChainAddress)
        external
        nonReentrant
    {
        _upgradeQuestChain(_questChainAddress);
    }

    function upgradeQuestChainWithPermit(
        address _questChainAddress,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        IERC20Permit(paymentToken).safePermit(
            msg.sender,
            address(this),
            upgradeFee,
            deadline,
            v,
            r,
            s
        );
        _upgradeQuestChain(_questChainAddress);
    }
}
