// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILimiter.sol";
import "./interfaces/IQuestChain.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/// @author @parv3213
contract LimiterTokenGated is ILimiter {
    struct QuestChainDetails {
        address tokenAddress;
        uint256 minTokenBalance;
    }
    mapping(address => QuestChainDetails) public questChainDetails;

    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event AddQuestChainDetails(
        address _questChain,
        address _tokenAddress,
        uint256 _minBalance,
        address _sender
    );

    function addQuestChainDetails(
        address _questChain,
        address _tokenAddress,
        uint256 _minBalance
    ) external {
        require(
            IAccessControl(_questChain).hasRole(ADMIN_ROLE, msg.sender),
            "TokenGated: only admin"
        );
        questChainDetails[_questChain] = QuestChainDetails(
            _tokenAddress,
            _minBalance
        );
        emit AddQuestChainDetails(
            _questChain,
            _tokenAddress,
            _minBalance,
            msg.sender
        );
    }

    function submitProofLimiter(address _sender)
        external
        returns (bool _check)
    {
        QuestChainDetails memory _details = questChainDetails[msg.sender];
        if (
            IERC20(_details.tokenAddress).balanceOf(_sender) >=
            _details.minTokenBalance
        ) {
            _check = true;
        }
    }
}
