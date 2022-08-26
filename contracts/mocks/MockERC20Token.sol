// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "solmate/src/tokens/ERC20.sol";

contract MockERC20Token is ERC20 {
    // solhint-disable-next-line no-empty-blocks
    constructor() ERC20("token", "TOKEN", 18) {}

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
