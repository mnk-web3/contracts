# Distributed m,n,k game.

This repo presents a WIP implementation of the distributed tic-tac-toe game (distributed M,N,K game, hence the name), that suppose to run on top of the Harmony blockchain. More on that later.

# Tests

The whole build-test pipeline is wrapped with the docker toolchain, hence zero configuration is required to run the test suite:
```bash
$ git clone git@github.com:mnk-web3/contracts.git
$ cd contracts
$ ./tests/runtest.sh tests/envs/localnet.env --reruns=3
```

# Typical interaction flow

```mermaid
sequenceDiagram
    autonumber
    participant Alice
    participant Bob
    participant Gateway
    participant Game
    Alice->>Gateway: call new_game method
    Gateway->>Game: deploy fresh contract
    Game->>Game: enter CREATED state
    Alice->>Alice: read game_address from on-chain logs
    note right of Alice: Alice may wanna cancel the game she just created
    note right of Alice: Rendering that game instance cancelled forever
    rect rgb(251, 77, 70)
    opt cancel just created:
      Alice->>Game: invoke cancel_game method
      Game->>Game: enter ABORTED state
    end
    end
    Alice->>Game: invoke join method, lock BID amount of funds
    Game->>Game: enter WAITING state
    note right of Alice: Alice may wanna cancel the game she just joined
    note right of Alice: Rendering that game instance cancelled forever
    rect rgb(251, 77, 70)
    opt cancel just joined:
      Alice->>Game: invoke cancel_game method
      Game->>Game: enter ABORTED state
      Game->>Alice: unlock Alice's funds
    end
    end
    Alice-->>Bob: share game address (offchain, i.e. via telegram)
    Bob->>Game: invoke join method, lock BID amount of funds
    Game->>Game: entering RUNNING state
    Alice->>Game: invoke append_move method
    rect rgb(0, 87, 217)
    loop main game loop:
      Bob->>Bob: waiting for Alice's move appear on chain
      Bob->>Game: invoke append_move method
      Alice->>Alice: waiting for Bob's move appear on chain
      Alice->>Game: invoke append_move method
    end
    end
```
