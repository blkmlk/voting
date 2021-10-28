// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './IElection.sol';
import './Election.sol';
import './ICrowdfunding.sol';
import './Crowdfunding.sol';

contract Factory {
    IElection[] elections;
    ICrowdfunding[] crowdfunding;

    constructor() {
    }

    function createElection(string calldata _name) external {
        elections.push(new Election(msg.sender, _name));
    }

    function createCrowdfunding(string calldata _name, string calldata _description, uint _targetAmount, address target) external{
        crowdfunding.push(new Crowdfunding(_name, _description, _targetAmount, target));
    }

    function getElections() public view returns (IElection[] memory) {
        return elections;
    }

    function getCrowdfunding() public view returns (ICrowdfunding[] memory) {
        return crowdfunding;
    }
}
