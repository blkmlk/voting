// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './Election.sol';

contract ElectionFactory {
    Election[] elections;

    constructor() {}

    function createElection(string calldata _name) external {
        elections.push(new Election(msg.sender, _name));
    }

    function getElections() public view returns (Election[] memory) {
        return elections;
    }
}
