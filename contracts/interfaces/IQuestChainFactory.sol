// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.15;

interface IQuestChainFactory {
    event FactoryInit();
    event QuestChainCreated(uint256 index, address questChain);
    event AdminReplaced(address admin);
    event ImplReplaced(address impl);
    event TreasuryReplaced(address treasury);
    event PaymentTokenReplaced(address paymentToken);
    event UpgradeFeeReplaced(uint256 upgradeFee);
    event QuestChainUpgraded(address questChain, address sender, uint256 cost);

    function questChainCount() external view returns (uint256);

    function questChainImpl() external view returns (address);

    function questChainToken() external view returns (address);

    function admin() external view returns (address);

    function treasury() external view returns (address);

    function paymentToken() external view returns (address);

    function upgradeFee() external view returns (uint256);

    function create(
        string calldata _details,
        string memory _tokenURI,
        address[3][] calldata _members,
        string[] calldata _quests,
        bool _paused,
        bytes32 _salt
    ) external returns (address);

    function predictAddress(bytes32 _salt) external returns (address);

    function getQuestChainAddress(uint256 _index)
        external
        view
        returns (address);

    function upgradeQuestChain(address _questChainAddress) external;

    function upgradeQuestChainWithPermit(
        address _questChainAddress,
        uint256 _deadline,
        bytes memory _signature
    ) external;
}
