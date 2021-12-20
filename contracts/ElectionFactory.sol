// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './Election.sol';

contract ElectionFactory {
    Election[] elections;

    constructor() {}

    function create(string calldata _name) external {
        elections.push(new Election(msg.sender, _name));
    }

    function list() public view returns (Election[] memory) {
        return elections;
    }
}
