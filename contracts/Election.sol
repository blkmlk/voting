// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

struct ElectionInfo {
    bool started;
    address owner;
    string name;
    uint expiresAt;
    uint votes;
    Candidate[] candidates;
}

struct Candidate {
    string name;
    string surname;
    string imageValue;
    uint votes;
    bool active;
}

struct Vote {
    uint candidateID;
    uint expiresAt;
    bool exists;
}

contract Election {
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

    function start(uint _expiresIn) external returns(bool) {
        require(!started);
        require(candidates.length > 0);

        expiresAt = block.timestamp + _expiresIn;
        started = true;
        return true;
    }

    function getInfo() external view returns(ElectionInfo memory) {
        Candidate[] memory tmp = candidates;

        uint totalVotes = 0;
        if (block.timestamp < expiresAt) {
            for (uint i = 0; i < tmp.length; i++) {
                totalVotes += tmp[i].votes;
                tmp[i].votes = 0;
            }
        }

        return ElectionInfo({
            started: started,
            owner: owner,
            name: name,
            votes: totalVotes,
            expiresAt: expiresAt,
            candidates: tmp
        });
    }

    function addCandidates(Candidate[] calldata _candidates) external ownerOnly returns(uint) {
        require(!started);

        for (uint i = 0; i < _candidates.length; i++) {
            candidates.push(_candidates[i]);
            candidates[candidates.length - 1].votes = 0;
            candidates[candidates.length - 1].active = true;
        }

        return candidates.length - 1;
    }

    function vote(uint _candidateId) external returns(bool) {
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

    function getVote() external view returns(Vote memory) {
        return votes[msg.sender];
    }

    function retract() external returns(bool) {
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