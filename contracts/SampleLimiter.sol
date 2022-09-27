// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILimiter.sol";

contract SampleLimiter is ILimiter {
    address public tokenAddress;
    uint256 public minTokenBalance;

    constructor(address _tokenAddress, uint256 _minTokenBalance) {
        tokenAddress = _tokenAddress;
        minTokenBalance = _minTokenBalance;
    }

    function submitProofLimiter(address _sender)
        external
        view
        returns (bool _check)
    {
        if (IERC20(tokenAddress).balanceOf(_sender) >= minTokenBalance) {
            _check = true;
        }
    }
}
