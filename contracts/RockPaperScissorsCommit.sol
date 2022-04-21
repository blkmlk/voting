// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

enum Move {
    NONE,
    ROCK,
    PAPER,
    SCISSORS
}

struct Player {
    bytes32 commit;
    Move move;
    bool exists;
}

contract RockPaperScissorsCommit {
    string public name;
    uint256 public bet;
    uint256 public expiresAt = 1 << 256-1;
    uint256 public mustBeProvedBefore = 1 << 256-1;
    uint8 public freeSpots;
    uint8 public committed;
    uint8 public proved;

    address public winner;
    bool public finished;

    mapping(Move => mapping(Move => uint8)) internal outcomes;
    mapping(address => Player) internal players;
    address []internal playerAddresses;

    event Started();
    event Joined(address player);
    event Left(address player);
    event Finished(address winner);

    constructor(string memory _name, uint256 _bet) {
        name = _name;
        freeSpots = 2;
        committed = 0;
        proved = 0;
        bet = _bet;

        _initOutcomes();
    }

    function join() external payable {
        require(freeSpots > 0 && block.timestamp < expiresAt, "no free spots");
        require(!players[msg.sender].exists, "already joined");
        players[msg.sender].exists = true;
        freeSpots--;
        playerAddresses.push(msg.sender);

        require(msg.value >= bet, "not enough value");

        uint256 change = msg.value - bet;
        if (change > 0) {
            payable(msg.sender).transfer(change);
        }

        emit Joined(msg.sender);

        if (freeSpots == 0) {
            expiresAt = block.timestamp + 1 days;
            emit Started();
        }
    }

    function leave() external {
        require(freeSpots > 0 && block.timestamp < expiresAt, "the game is not finished");
        require(players[msg.sender].exists, "player does not exist");
        players[msg.sender].exists = false;

        for (uint256 i = 0; i < playerAddresses.length; i++) {
            if (playerAddresses[i] == msg.sender) {
                _deletePlayer(i);
                break;
            }
        }

        freeSpots++;

        payable(msg.sender).transfer(bet);
        emit Left(msg.sender);
    }

    function commit(bytes32 _commit) external {
        require(freeSpots == 0 && block.timestamp < expiresAt, "the game is not started");
        require(players[msg.sender].exists, "player does not exist");
        require(players[msg.sender].commit == 0, "player has already committed");
        players[msg.sender].commit = _commit;
        committed++;

        if (committed == 2) {
            mustBeProvedBefore = block.timestamp + 1 days;
        }
    }

    function prove(uint256 _nonce, Move _move) external {
        require(freeSpots == 0 && block.timestamp < expiresAt, "the game is not started");
        require(players[msg.sender].exists, "player does not exist");
        require(players[msg.sender].commit != 0, "not committed");
        require(block.timestamp < mustBeProvedBefore, "too late to prove");

        if (_move <= Move.NONE || _move > Move.SCISSORS) {
            revert("invalid move");
        }

        require(_getHash(_nonce, _move) == players[msg.sender].commit, "invalid commit");

        players[msg.sender].move = _move;
        proved++;

        if (proved == 1) {
            mustBeProvedBefore = block.timestamp + 1 days;
        }
    }

    function finish() external {
        require(!finished, "already finished");
        require(proved == 2 || (proved == 1 && block.timestamp > mustBeProvedBefore), "not proved yet");
        require(playerAddresses.length == 2, "not enough players");

        Move move1 = players[playerAddresses[0]].move;
        Move move2 = players[playerAddresses[1]].move;

        if (proved == 1) {
            if (move1 != Move.NONE) {
                winner = playerAddresses[0];
            } else {
                winner = playerAddresses[1];
            }
        } else if (move1 != move2) {
            winner = playerAddresses[outcomes[move1][move2]];
        }

        finished = true;

        if (winner != address(0)) {
            payable(winner).transfer(address(this).balance);
        } else {
            for(uint256 i = 0; i < playerAddresses.length; i++) {
                payable(playerAddresses[i]).transfer(bet);
            }
        }
        emit Finished(winner);
    }

    function _initOutcomes() internal {
        outcomes[Move.ROCK][Move.SCISSORS] = 0;
        outcomes[Move.ROCK][Move.PAPER] = 1;
        outcomes[Move.PAPER][Move.ROCK] = 0;
        outcomes[Move.PAPER][Move.SCISSORS] = 1;
        outcomes[Move.SCISSORS][Move.ROCK] = 1;
        outcomes[Move.SCISSORS][Move.PAPER] = 0;
    }

    function _getHash(uint256 _nonce, Move _move) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), _nonce, _move));
    }

    function _deletePlayer(uint256 _idx) internal {
        playerAddresses[_idx] = playerAddresses[playerAddresses.length-1];
        playerAddresses.pop();
    }
}