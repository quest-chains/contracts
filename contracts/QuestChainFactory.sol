// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "./interfaces/IQuestChain.sol";
import "./interfaces/IQuestChainFactory.sol";
import "./QuestChainToken.sol";

// author: @dan13ram

contract QuestChainFactory is IQuestChainFactory, Ownable {
    uint256 public questChainCount = 0;
    mapping(uint256 => address) private _questChains;

    address public override questChainImpl;
    address public override questChainToken;

    constructor(address _questChainImpl) {
        questChainToken = address(new QuestChainToken());
        updateChainImpl(_questChainImpl);
    }

    function updateChainImpl(address _questChainImpl) public onlyOwner {
        require(
            Address.isContract(_questChainImpl),
            "QuestChainFactory: invalid impl"
        );
        address oldImpl = questChainImpl;
        questChainImpl = _questChainImpl;
        emit QuestChainImplUpdated(oldImpl, _questChainImpl);
    }

    function _newQuestChain(
        address _questChainAddress,
        string calldata _details,
        string memory _tokenURI
    ) internal {
        IQuestChainToken(questChainToken).setTokenOwner(
            questChainCount,
            _questChainAddress
        );

        IQuestChain(_questChainAddress).init(_msgSender(), _details, _tokenURI);

        _questChains[questChainCount] = _questChainAddress;

        emit QuestChainCreated(questChainCount, _questChainAddress);

        questChainCount++;
    }

    function _newQuestChainWithRoles(
        address _questChainAddress,
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers
    ) internal {
        IQuestChainToken(questChainToken).setTokenOwner(
            questChainCount,
            _questChainAddress
        );

        IQuestChain(_questChainAddress).initWithRoles(
            _msgSender(),
            _details,
            _tokenURI,
            _admins,
            _editors,
            _reviewers
        );

        _questChains[questChainCount] = _questChainAddress;
        emit QuestChainCreated(questChainCount, _questChainAddress);

        questChainCount++;
    }

    function create(string calldata _details, string memory _tokenURI)
        external
        override
        returns (address)
    {
        address questChainAddress = Clones.clone(questChainImpl);

        _newQuestChain(questChainAddress, _details, _tokenURI);

        return questChainAddress;
    }

    function createWithRoles(
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers
    ) external override returns (address) {
        address questChainAddress = Clones.clone(questChainImpl);

        _newQuestChainWithRoles(
            questChainAddress,
            _details,
            _tokenURI,
            _admins,
            _editors,
            _reviewers
        );

        return questChainAddress;
    }

    function predictDeterministicAddress(bytes32 _salt)
        external
        view
        override
        returns (address)
    {
        return Clones.predictDeterministicAddress(questChainImpl, _salt);
    }

    function createDeterministic(
        string calldata _details,
        string memory _tokenURI,
        bytes32 _salt
    ) external override returns (address) {
        address questChainAddress = Clones.cloneDeterministic(
            questChainImpl,
            _salt
        );

        _newQuestChain(questChainAddress, _details, _tokenURI);

        return questChainAddress;
    }

    function createDeterministicWithRoles(
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers,
        bytes32 _salt
    ) external override returns (address) {
        address questChainAddress = Clones.cloneDeterministic(
            questChainImpl,
            _salt
        );

        _newQuestChainWithRoles(
            questChainAddress,
            _details,
            _tokenURI,
            _admins,
            _editors,
            _reviewers
        );

        return questChainAddress;
    }

    function getQuestChainAddress(uint256 _index)
        public
        view
        override
        returns (address)
    {
        return _questChains[_index];
    }
}
