// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './Crowdfunding.sol';

contract CrowdfundingFactory {
    Crowdfunding[] crowdfunding;

    constructor() {}

    function create(string calldata _name, string calldata _description, uint _targetAmount, address target) external {
        crowdfunding.push(new Crowdfunding(msg.sender, _name, _description, _targetAmount, target));
    }

    function list() public view returns (Crowdfunding[] memory) {
        return crowdfunding;
    }
}
