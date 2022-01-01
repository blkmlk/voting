// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RockPaperScissors.sol";

contract RockPaperScissorsFactory {
    RockPaperScissors[] rps;

    constructor() {}

    function create(string calldata _name, uint256 _bet, uint _expiresIn) external payable {
        rps.push(new RockPaperScissors(_name, msg.sender, _bet, _expiresIn));
    }

    function list() public view returns (RockPaperScissors[] memory) {
        return rps;
    }
}
