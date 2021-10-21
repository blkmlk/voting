// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICrowdfunding.sol";

contract Crowdfunding is ICrowdfunding {
    address owner;
    string description;
    uint targetAmount;
    address target;
    mapping(address => Donation) donations;
    uint startedAt;
    uint expiresAt;

    event NewDonation(string message, uint amount);

    constructor(string memory _description, uint _targetAmount, address _target) {
        require(_targetAmount > 0);
        require(_target != address(0));

        owner = msg.sender;
        description = _description;
        targetAmount = _targetAmount;
        target = _target;
    }

    function start(uint _expiresIn) external {
        require(msg.sender == owner);
        require(_expiresIn > 0);

        startedAt = block.timestamp;
        expiresAt = startedAt + _expiresIn;
    }

    function getInfo() external view returns(Info memory) {
        return Info({
            owner: owner,
            description: description,
            currentAmount: address(this).balance,
            targetAmount: targetAmount,
            target: target,
            startedAt: startedAt,
            expiresAt: expiresAt
        });
    }

    function donate(string calldata message) external payable {
        require(msg.sender != target);
        require(donations[msg.sender].createdAt == 0);
        require(block.timestamp < expiresAt);

        uint balance = address(this).balance;
        require(balance < targetAmount);

        uint rebate = balance - targetAmount;

        if (rebate > 0) {
            payable (msg.sender).transfer(rebate);
        }

        donations[msg.sender] = Donation({
            message: message,
            amount: msg.value,
            createdAt: block.timestamp
        });

        emit NewDonation(message, msg.value);
    }

    function getDonation() external view returns(Donation memory) {
        return donations[msg.sender];
    }

    function withdraw() external {
        uint amount = 0;
        uint balance = address(this).balance;

        if (msg.sender == target) {
            require(balance == targetAmount);

            amount = balance;
        } else {
            require(balance < targetAmount);
            require(block.timestamp >= expiresAt);
            require(donations[msg.sender].createdAt > 0);

            amount = donations[msg.sender].amount;
        }

        if (amount > 0) {
            payable(msg.sender).transfer(amount);
        }
    }

    receive() external payable {
        revert("use donate method instead");
    }
}
