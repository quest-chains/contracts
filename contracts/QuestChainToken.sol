// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./interfaces/IQuestChain.sol";
import "./interfaces/IQuestChainToken.sol";

// author: @dan13ram

contract QuestChainToken is IQuestChainToken, ERC1155 {
    IQuestChainFactory public questChainFactory;

    mapping(uint256 => string) private _tokenURIs;

    mapping(uint256 => address) private _tokenOwners;

    modifier onlyChainFactory() {
        require(
            msg.sender == address(questChainFactory),
            "QuestChainToken: not factory"
        );
        _;
    }

    modifier onlyTokenOwner(uint256 _tokenId) {
        require(
            msg.sender == _tokenOwners[_tokenId],
            "QuestChainToken: not token owner"
        );
        _;
    }

    constructor() ERC1155("") {
        questChainFactory = IQuestChainFactory(msg.sender);
    }

    function setTokenOwner(uint256 _tokenId, address _questChain)
        public
        onlyChainFactory
    {
        _tokenOwners[_tokenId] = _questChain;
    }

    function setTokenURI(uint256 _tokenId, string memory _tokenURI)
        public
        onlyTokenOwner(_tokenId)
    {
        _tokenURIs[_tokenId] = _tokenURI;
        emit URI(uri(_tokenId), _tokenId);
    }

    function mint(address _user, uint256 _tokenId)
        public
        onlyTokenOwner(_tokenId)
    {
        uint256 userBalance = balanceOf(_user, _tokenId);
        require(userBalance == 0, "QuestChainToken: already minted");
        _mint(_user, _tokenId, 1, "");
    }

    function burn(address _user, uint256 _tokenId)
        public
        onlyTokenOwner(_tokenId)
    {
        uint256 userBalance = balanceOf(_user, _tokenId);
        require(userBalance == 1, "QuestChainToken: token not found");
        _burn(_user, _tokenId, 1);
    }

    function tokenOwner(uint256 _tokenId) public view returns (address) {
        return _tokenOwners[_tokenId];
    }

    function uri(uint256 _tokenId)
        public
        view
        override(IERC1155MetadataURI, ERC1155)
        returns (string memory)
    {
        return _tokenURIs[_tokenId];
    }

    function _beforeTokenTransfer(
        address,
        address _from,
        address _to,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) internal pure override {
        require(
            _to == address(0) || _from == address(0),
            "QuestChainToken: cannot transfer"
        );
    }
}
