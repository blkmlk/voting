// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './IElection.sol';
import './Election.sol';

contract Factory {
    IElection[] elections;

    constructor() {
    }

    function createElection(string calldata _name) external {
        elections.push(new Election(msg.sender, _name));
    }

    function getElections() public view returns (IElection[] memory) {
        return elections;
    }
}
