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

interface IElection {
    function start(uint) external returns(bool);
    function getInfo() external view returns(ElectionInfo memory);
    function addCandidates(Candidate[] calldata) external returns(uint);
    function vote(uint) external returns(bool);
    function getVote() external view returns(Vote memory);
    function retract() external returns(bool);
}