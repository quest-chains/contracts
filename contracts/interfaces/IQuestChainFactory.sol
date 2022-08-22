// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

import "../libraries/QuestChainCommons.sol";

interface IQuestChainFactory {
    event FactoryInit();
    event QuestChainCreated(uint256 index, address questChain);
    event AdminReplaced(address admin);
    event ImplReplaced(address impl);
    event TreasuryReplaced(address treasury);
    event PaymentTokenReplaced(address paymentToken);
    event UpgradeFeeReplaced(uint256 upgradeFee);
    event QuestChainUpgraded(address sender, address questChain);

    function create(
        QuestChainCommons.QuestChainInfo calldata _info,
        bytes32 _salt
    ) external returns (address);

    function createAndUpgrade(
        QuestChainCommons.QuestChainInfo calldata _info,
        bytes32 _salt
    ) external returns (address);

    function createAndUpgradeWithPermit(
        QuestChainCommons.QuestChainInfo calldata _info,
        bytes32 _salt,
        uint256 _deadline,
        bytes calldata _signature
    ) external returns (address);

    function upgradeQuestChain(address _questChainAddress) external;

    function upgradeQuestChainWithPermit(
        address _questChainAddress,
        uint256 _deadline,
        bytes calldata _signature
    ) external;

    function getQuestChainAddress(uint256 _index)
        external
        view
        returns (address);

    function questChainCount() external view returns (uint256);

    function questChainImpl() external view returns (address);

    function questChainToken() external view returns (address);

    function admin() external view returns (address);

    function treasury() external view returns (address);

    function paymentToken() external view returns (address);

    function upgradeFee() external view returns (uint256);
}
