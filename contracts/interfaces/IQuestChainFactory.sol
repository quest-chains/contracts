// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

import "./IERC20Token.sol";
import "./IQuestChainToken.sol";
import "../libraries/QuestChainCommons.sol";

interface IQuestChainFactory {
    event FactorySetup();
    event QuestChainCreated(uint256 index, address questChain);
    event AdminReplaceProposed(address proposedAdmin);
    event AdminReplaced(address admin);
    event PaymentTokenReplaceProposed(address proposedPaymentToken);
    event PaymentTokenReplaced(IERC20Token paymentToken);
    event UpgradeFeeReplaceProposed(uint256 proposedUpgradeFee);
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

    function questChainTemplate() external view returns (address);

    function questChainToken() external view returns (IQuestChainToken);

    function admin() external view returns (address);

    function treasury() external view returns (address);

    function paymentToken() external view returns (IERC20Token);

    function upgradeFee() external view returns (uint256);
}
