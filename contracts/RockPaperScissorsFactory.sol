// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RockPaperScissors.sol";

contract RockPaperScissorsFactory {
    RockPaperScissors[] rps;

    constructor() {}

    function create(string calldata _name) external payable {
        rps.push(new RockPaperScissors{value: msg.value}(_name, msg.sender));
    }

    function list() public view returns (RockPaperScissors[] memory) {
        return rps;
    }
}
