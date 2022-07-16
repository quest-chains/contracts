// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

import "./IQuestChainFactory.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";

interface IQuestChainToken is IERC1155MetadataURI {
    function questChainFactory() external view returns (IQuestChainFactory);

    function setTokenOwner(uint256 _tokenId, address _questChain) external;

    function tokenOwner(uint256 _tokenId) external view returns (address);

    function setTokenURI(uint256 _tokenId, string memory _tokenURI) external;

    function mint(address _user, uint256 _tokenId) external;

    function burn(address _user, uint256 _tokenId) external;
}
