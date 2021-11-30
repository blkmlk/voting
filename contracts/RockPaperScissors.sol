// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

enum Move {
    NONE,
    ROCK,
    PAPER,
    SCISSORS
}

struct Player {
    Move move;
    bool verified;
    bool exists;
}

struct PlayerMove {
    address from;
    Move move;
    uint256 nonce;
    bytes signature;
}

contract RockPaperScissors {
    uint8 constant MAX_PLAYERS = 2;

    address public owner;
    address public winner;
    uint256 public bet;
    uint8 public freeSpots;
    mapping(address => Player) public players;

    mapping(Move => mapping(Move => uint8)) internal outcomes;

    event Started();
    event Finished(address winner);

    constructor(uint256 _bet) payable {
        owner = msg.sender;
        require(_bet == msg.value, 'invalid value');
        bet = _bet;
        freeSpots = MAX_PLAYERS-1;
        players[msg.sender] = Player({
            move: Move.NONE,
            verified: false,
            exists: true
        });

        initOutcomes();
    }

    function join() external payable {
        require(msg.value == bet, 'value does not equal to the bet');
        require(freeSpots > 0, 'no free spot');
        require(!players[msg.sender].exists, 'player already joined the game');

        freeSpots--;

        if (freeSpots == 0) {
            emit Started();
        }

        players[msg.sender] = Player({
            move: Move.NONE,
            verified: false,
            exists: true
        });
    }

    function finish(PlayerMove[] calldata _moves) external {
        require(winner == address(0), 'the game is already finished');
        require(_moves.length == MAX_PLAYERS, 'wrong number of player moves');
        require(freeSpots == 0, 'the game is not started');

        bytes32 hash;
        bytes32 r;
        bytes32 s;
        uint8 v;
        bool found = false;

        for(uint i = 0; i < _moves.length; i++) {
            PlayerMove calldata m = _moves[i];
            require(m.from != address(0), 'invalid address');
            require(m.signature.length == 65, 'invalid signature length');

            Player storage player = players[m.from];

            require(player.exists, 'player does not exist');
            require(!player.verified, 'player is already verified');

            hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(m.nonce, m.nonce))));

            bytes memory signature = m.signature;

            assembly {
                r := mload(add(signature, 32))
                s := mload(add(signature, 64))
                v := byte(0, mload(add(signature, 96)))
            }

            address signer = ecrecover(hash, v, r, s);
            require(signer == m.from, 'invalid signer address');

            player.verified = true;
            player.move = m.move;

            if (msg.sender == signer) {
                found = true;
            }
        }

        require(found, 'the game can be finished only by players');

        Move m0 = _moves[0].move;
        Move m1 = _moves[1].move;

        if (m0 == m1) {
            revert('draw');
        }

        winner = _moves[outcomes[m0][m1]].from;

        require(winner != address(0), 'invalid moves provided');

        if (bet > 0) {
            payable (winner).transfer(bet*MAX_PLAYERS);
        }
        emit Finished(winner);
    }

    function initOutcomes() internal {
        outcomes[Move.ROCK][Move.SCISSORS] = 0;
        outcomes[Move.ROCK][Move.PAPER] = 1;
        outcomes[Move.PAPER][Move.ROCK] = 0;
        outcomes[Move.PAPER][Move.SCISSORS] = 1;
        outcomes[Move.SCISSORS][Move.ROCK] = 1;
        outcomes[Move.SCISSORS][Move.PAPER] = 0;
    }
}