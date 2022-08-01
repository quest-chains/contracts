// SPDX-License-Identifier: GPL-3.0

pragma solidity 0.8.15;

library QuestChainCommons {
    struct QuestChainInfo {
        string details;
        string tokenURI;
        address[] owners;
        address[] admins;
        address[] editors;
        address[] reviewers;
        string[] quests;
        bool paused;
    }

    function recoverParameters(bytes memory _signature)
        internal
        pure
        returns (
            uint8 v,
            bytes32 r,
            bytes32 s
        )
    {
        require(
            _signature.length == 65,
            "QuestChainCommons: invalid signature"
        );
        assembly {
            r := mload(add(_signature, 0x20))
            s := mload(add(_signature, 0x40))
            v := byte(0, mload(add(_signature, 0x60)))
        }
    }
}
