// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './IElection.sol';

contract Election is IElection {
    address owner;
    string name;
    uint expiresAt;
    bool started;

    Candidate[] public candidates;
    mapping(address => Vote) votes;

    modifier ownerOnly() {
        require(owner == msg.sender);
        _;
    }

    constructor(address _owner, string memory _name) {
        owner = _owner;
        name = _name;
    }

    // @override
    function start(uint _expiresIn) external override returns(bool) {
        require(!started);
        require(candidates.length > 0);

        expiresAt = block.timestamp + _expiresIn;
        started = true;
        return true;
    }

    // @override
    function getInfo() external override view returns(Info memory) {
        Candidate[] memory tmp = candidates;

        uint totalVotes = 0;
        if (block.timestamp < expiresAt) {
            for (uint i = 0; i < tmp.length; i++) {
                totalVotes += tmp[i].votes;
                tmp[i].votes = 0;
            }
        }

        return Info({
            started: started,
            owner: owner,
            name: name,
            votes: totalVotes,
            expiresAt: expiresAt,
            candidates: tmp
        });
    }

    // @override
    function addCandidates(Candidate[] calldata _candidates) external override ownerOnly returns(uint) {
        require(!started);

        for (uint i = 0; i < _candidates.length; i++) {
            candidates.push(_candidates[i]);
            candidates[candidates.length - 1].votes = 0;
            candidates[candidates.length - 1].active = true;
        }

        return candidates.length - 1;
    }

    // @override
    function vote(uint _candidateId) external override returns(bool) {
        require(started);
        require(block.timestamp < expiresAt);
        require(!votes[msg.sender].exists);
        require(_candidateId < candidates.length);
        require(candidates[_candidateId].active);

        votes[msg.sender] = Vote({
            candidateID: _candidateId,
            expiresAt: block.timestamp + 10 minutes,
            exists: true
        });

        Candidate storage candidate = candidates[_candidateId];
        candidate.votes += 1;

        return true;
    }

    // @override
    function getVote() external override view returns(Vote memory) {
        return votes[msg.sender];
    }

    // @override
    function retract() external override returns(bool) {
        require(started);
        require(block.timestamp < expiresAt);

        Vote memory v = votes[msg.sender];

        require(v.exists);
        require(block.timestamp < v.expiresAt);

        candidates[v.candidateID].votes -= 1;
        delete votes[msg.sender];

        return true;
    }
}