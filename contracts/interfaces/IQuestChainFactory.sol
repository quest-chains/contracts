// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IQuestChainFactory {
    event QuestChainCreated(uint256 indexed index, address questChain);
    event QuestChainImplUpdated(
        address indexed oldImpl,
        address indexed newImpl
    );

    function questChainCount() external view returns (uint256);

    function questChainImpl() external view returns (address);

    function questChainToken() external view returns (address);

    function create(string calldata _details, string memory _tokenURI)
        external
        returns (address);

    function createWithRoles(
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers
    ) external returns (address);

    function createDeterministic(
        string calldata _details,
        string memory _tokenURI,
        bytes32 _salt
    ) external returns (address);

    function createDeterministicWithRoles(
        string calldata _details,
        string memory _tokenURI,
        address[] calldata _admins,
        address[] calldata _editors,
        address[] calldata _reviewers,
        bytes32 _salt
    ) external returns (address);

    function predictDeterministicAddress(bytes32 _salt)
        external
        returns (address);

    function getQuestChainAddress(uint256 _index)
        external
        view
        returns (address);
}
