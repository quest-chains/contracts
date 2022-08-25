// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

// solhint-disable-next-line no-empty-blocks
interface IERC20Token is IERC20, IERC20Permit {

}
