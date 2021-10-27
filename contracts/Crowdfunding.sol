// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ICrowdfunding.sol";

contract Crowdfunding is ICrowdfunding {
    address owner;
    string description;
    uint currentAmount;
    uint targetAmount;
    address target;
    mapping(address => Donation) donations;
    uint startedAt;
    uint expiresAt;
    bool ended;

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
        require(msg.sender == owner, "CF: wrong address");
        require(_expiresIn > 0, "CF: wrong duration");
        require(expiresAt == 0, "CF: already started");

        startedAt = block.timestamp;
        expiresAt = startedAt + _expiresIn;
    }

    function getInfo() external view returns(Info memory) {
        return Info({
            owner: owner,
            description: description,
            currentAmount: currentAmount,
            targetAmount: targetAmount,
            target: target,
            startedAt: startedAt,
            expiresAt: expiresAt,
            ended: ended
        });
    }

    function donate(string calldata message) external payable {
        require(msg.sender != target, "CF: wrong address");
        require(donations[msg.sender].createdAt == 0, "CF: already donated");
        require(expiresAt != 0, "CF: not started");
        require(block.timestamp < expiresAt, "CF: expired");
        require(msg.value > 0, "CF: value is 0");

        require(currentAmount < targetAmount, "CF: amount is collected");

        uint amount = msg.value;
        currentAmount += amount;

        if (currentAmount > targetAmount) {
            uint rebate = currentAmount - targetAmount;
            amount -= rebate;
            currentAmount -= rebate;
            payable (msg.sender).transfer(rebate);
        }

        if (currentAmount == targetAmount) {
            ended = true;
        }

        donations[msg.sender] = Donation({
            message: message,
            amount: amount,
            createdAt: block.timestamp
        });

        emit NewDonation(message, amount);
    }

    function getDonation() external view returns(Donation memory) {
        return donations[msg.sender];
    }

    function withdraw() external {
        uint amount;

        if (msg.sender == target) {
            require(ended, "CF: amount isn't collected");

            amount = currentAmount;
        } else {
            require(!ended, "CF: amount is collected");
            require(block.timestamp >= expiresAt, "CF: contract isn't expired");
            require(donations[msg.sender].createdAt > 0, "CF: donation not found");

            amount = donations[msg.sender].amount;
        }

        if (amount > 0) {
            currentAmount -= amount;
            payable(msg.sender).transfer(amount);
        }
    }

    receive() external payable {
        revert("use donate method instead");
    }
}
