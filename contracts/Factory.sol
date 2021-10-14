// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './IElection.sol';
import './Election.sol';

contract Factory {
    IElection[] elections;

    constructor() {
    }

    function createElection(address _owner, string calldata _name) external {
        require(_owner != address(0));
        elections.push(new Election(_owner, _name));
    }

    function getElections() public view returns (IElection[] memory) {
        return elections;
    }
}
