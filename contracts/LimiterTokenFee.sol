// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILimiter.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";

/// @author @parv3213
contract LimiterTokenFee is ILimiter {
    struct QuestChainDetails {
        address tokenAddress;
        address treasuryAddress;
        uint256 feeAmount;
    }
    mapping(address => QuestChainDetails) public questChainDetails;

    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event AddQuestChainDetails(
        address _questChain,
        address _tokenAddress,
        uint256 _feeAmount,
        address _sender
    );

    function addQuestChainDetails(
        address _questChain,
        address _tokenAddress,
        address _treasuryAddress,
        uint256 _feeAmount
    ) external {
        require(
            IAccessControl(_questChain).hasRole(ADMIN_ROLE, msg.sender),
            "TokenGated: only admin"
        );
        questChainDetails[_questChain] = QuestChainDetails(
            _tokenAddress,
            _treasuryAddress,
            _feeAmount
        );
        emit AddQuestChainDetails(
            _questChain,
            _tokenAddress,
            _feeAmount,
            msg.sender
        );
    }

    function submitProofLimiter(address _sender) external returns (bool) {
        QuestChainDetails memory _details = questChainDetails[msg.sender];

        return
            IERC20(_details.tokenAddress).transferFrom(
                _sender,
                _details.treasuryAddress,
                _details.feeAmount
            );
    }
}
