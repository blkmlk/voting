// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct Info {
    address owner;
    string description;
    uint currentAmount;
    uint targetAmount;
    address target;
    uint startedAt;
    uint expiresAt;
}

struct Donation {
    string message;
    uint amount;
    uint createdAt;
}

interface ICrowdfunding {
}
