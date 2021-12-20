// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RockPaperScissors.sol";

contract RockPaperScissorsFactory {
    RockPaperScissors[] rps;

    constructor() {}

    function createRPS(string calldata _name) external payable {
        rps.push(new RockPaperScissors{value: msg.value}(_name));
    }

    function getRPS() public view returns (RockPaperScissors[] memory) {
        return rps;
    }
}
