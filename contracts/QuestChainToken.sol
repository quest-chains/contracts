// SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.16;

//   ╔═╗ ┬ ┬┌─┐┌─┐┌┬┐╔═╗┬ ┬┌─┐┬┌┐┌┌─┐
//   ║═╬╗│ │├┤ └─┐ │ ║  ├─┤├─┤││││└─┐
//   ╚═╝╚└─┘└─┘└─┘ ┴ ╚═╝┴ ┴┴ ┴┴┘└┘└─┘

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./interfaces/IQuestChain.sol";
import "./interfaces/IQuestChainToken.sol";

// author: @dan13ram

contract QuestChainToken is IQuestChainToken, ERC1155 {
    // instantiate factory interface (consider making immutable)
    IQuestChainFactory public questChainFactory;

    /********************************
     MAPPING STRUCTS EVENTS MODIFIER
     *******************************/

    // metadata uri for each token kind
    mapping(uint256 => string) private _tokenURIs;

    // quest owner mapping
    mapping(uint256 => address) private _tokenOwners;

    /**
     * @dev Access control modifier for functions callable by factory contract only
     */
    modifier onlyChainFactory() {
        require(
            msg.sender == address(questChainFactory),
            "QuestChainToken: not factory"
        );
        _;
    }

    /**
     * @dev Access control modifier for functions callable by quest owners only
     * @param _tokenId the complete initialization data
     */
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

    /*************************
     ACCESS CONTROL FUNCTIONS
     *************************/

    /**
     * @dev Assigns quest chain ownership
     * @param _tokenId the quest NFT identifier
     * @param _questChain the address of the new QuestChain minimal proxy
     */
    function setTokenOwner(uint256 _tokenId, address _questChain)
        public
        onlyChainFactory
    {
        // assign quest chain address as quest token's owner
        _tokenOwners[_tokenId] = _questChain;
    }

    /**
     * @dev Assigns the metadata location for a quest line
     * @param _tokenId the quest NFT identifier
     * @param _tokenURI the URI pointer for locating token metadata
     */
    function setTokenURI(uint256 _tokenId, string memory _tokenURI)
        public
        onlyTokenOwner(_tokenId)
    {
        // assign metadata pointer to the tokenId
        _tokenURIs[_tokenId] = _tokenURI;

        // log URI change and tokenId data
        emit URI(uri(_tokenId), _tokenId);
    }

    /**
     * @dev Mints a quest achievement token to the user
     * @param _user the address of a successful questing user
     * @param _tokenId the quest token identifier
     */
    function mint(address _user, uint256 _tokenId)
        public
        onlyTokenOwner(_tokenId)
    {
        // place user balance on the stack
        uint256 userBalance = balanceOf(_user, _tokenId);

        // enforce that user doesn't already possess the quest token
        require(userBalance == 0, "QuestChainToken: already minted");

        // mint the user their new quest achievement token
        _mint(_user, _tokenId, 1, "");
    }

    /**
     * @dev Burns a quest achievement token from the user
     * @param _user the address of a successful questing user
     * @param _tokenId the quest token identifier
     */
    function burn(address _user, uint256 _tokenId)
        public
        onlyTokenOwner(_tokenId)
    {
        // place user balance on the stack
        uint256 userBalance = balanceOf(_user, _tokenId);

        // enforce that user owns exactly one quest token
        require(userBalance == 1, "QuestChainToken: token not found");

        // burn the user their new quest achievement token
        _burn(_user, _tokenId, 1);
    }

    /*************************
     VIEW AND PURE FUNCTIONS
     *************************/

    /**
     * @dev Returns the owner address of a particular quest token
     * @param _tokenId the quest token identifier
     */
    function tokenOwner(uint256 _tokenId) public view returns (address) {
        return _tokenOwners[_tokenId];
    }

    /**
     * @dev Returns the metadata URI of a particular quest token
     * @param _tokenId the quest token identifier
     */
    function uri(uint256 _tokenId)
        public
        view
        override(IERC1155MetadataURI, ERC1155)
        returns (string memory)
    {
        return _tokenURIs[_tokenId];
    }

    /*************************
     OVERRIDES
     *************************/

    /**
     * @dev Prevents transferring the tokens and thus makes them SoulBound
     */
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
