// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RockPaperScissors.sol";

contract RockPaperScissorsFactory {
    RockPaperScissors[] rps;

    constructor() {}

    function create(string calldata _name, uint256 _bet) external payable {
        rps.push(new RockPaperScissors(_name, msg.sender, _bet));
    }

    function list() public view returns (RockPaperScissors[] memory) {
        return rps;
    }
}
