// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct CrowdfundingInfo {
    address owner;
    string name;
    string description;
    uint currentAmount;
    uint targetAmount;
    address target;
    uint startBlock;
    uint startedAt;
    uint expiresAt;
    bool ended;
    bool withdrawn;
}

struct Donation {
    string message;
    uint amount;
    uint createdAt;
}

interface ICrowdfunding {
    function start(uint) external;
    function getInfo() external view returns(CrowdfundingInfo memory);
    function donate(string calldata) external payable;
    function getDonation() external view returns(Donation memory);
    function withdraw() external;
}
