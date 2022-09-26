// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ILimiter.sol";

contract SampleLimiter is ILimiter {
    // TODO add setter
    address public tokenAddress;
    // TODO add setter
    uint256 public minTokenBalance;

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
