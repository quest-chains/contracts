// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "./IQuestChainFactory.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";

interface IQuestChainToken is IERC1155MetadataURI {
    function setTokenOwner(uint256 _tokenId, address _questChain) external;

    function setTokenURI(uint256 _tokenId, string memory _tokenURI) external;

    function mint(address _user, uint256 _tokenId) external;

    function burn(address _user, uint256 _tokenId) external;

    function questChainFactory() external view returns (IQuestChainFactory);

    function tokenOwner(uint256 _tokenId) external view returns (address);
}
