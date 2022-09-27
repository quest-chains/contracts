// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILimiter.sol";

contract TokenFee is ILimiter {
    address public treasury;
    address public tokenAddress;
    uint256 public feeAmount;

    constructor(
        address _tokenAddress,
        address _treasury,
        uint256 _feeAmount
    ) {
        tokenAddress = _tokenAddress;
        treasury = _treasury;
        feeAmount = _feeAmount;
    }

    function submitProofLimiter(address _sender) external returns (bool) {
        return IERC20(tokenAddress).transferFrom(_sender, treasury, feeAmount);
    }
}
