// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "./interfaces/ILimiter.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import {MultiToken, Category} from "./libraries/MultiToken.sol";

/// @author @parv3213
contract LimiterTokenFee is ILimiter {
    using MultiToken for MultiToken.Asset;

    struct QuestChainDetails {
        address tokenAddress;
        Category category;
        uint256 nftId;
        address treasuryAddress;
        uint256 feeAmount;
    }
    mapping(address => QuestChainDetails) public questChainDetails;

    bytes32 internal constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event AddQuestChainDetails(
        address _questChain,
        address _tokenAddress,
        address _treasuryAddress,
        uint256 _feeAmount,
        address _sender
    );

    function addQuestChainDetails(
        address _questChain,
        address _tokenAddress,
        Category _category,
        uint256 _nftId,
        address _treasuryAddress,
        uint256 _feeAmount
    ) external {
        require(
            IAccessControl(_questChain).hasRole(ADMIN_ROLE, msg.sender),
            "TokenGated: only admin"
        );
        questChainDetails[_questChain] = QuestChainDetails(
            _tokenAddress,
            _category,
            _nftId,
            _treasuryAddress,
            _feeAmount
        );
        emit AddQuestChainDetails(
            _questChain,
            _tokenAddress,
            _treasuryAddress,
            _feeAmount,
            msg.sender
        );
    }

    function submitProofLimiter(
        address _sender,
        uint256[] calldata /* _questIdList */
    ) external {
        QuestChainDetails memory _details = questChainDetails[msg.sender];

        MultiToken
            .Asset(
                _details.tokenAddress,
                _details.category,
                _details.feeAmount,
                _details.nftId
            )
            .transferAssetFrom(_sender, _details.treasuryAddress);
    }
}
