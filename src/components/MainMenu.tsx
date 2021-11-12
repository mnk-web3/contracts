import { Component, FunctionComponent, useEffect, useState } from "react";
import { Container, Button, Col, Row, Form, Stack, Spinner } from "react-bootstrap";
import { Contract } from "web3-eth-contract";


import "./common.css";


import { Account, WalletBase } from "web3-core";
import Web3 from "web3";


enum CurrentScreen {
  Main, SetupMMGame, SetupCusomGame, WaitMMGame,
}


type CommonProps = {
  web3Instance: Web3,
  dmnkContract: Contract,
  getWallet: () => WalletBase | null,
  setWallet: (wallet: WalletBase) => void,
};


type MainMenuState = { screen: CurrentScreen, gameSettings: GameSettings | null };


const asciiLogo = <pre className="col-md-7 mx-auto logo">
  {`
8 888888888o.               ,8.       ,8.          b.             8 8 8888     ,88' 
8 8888    \`^888.           ,888.     ,888.         888o.          8 8 8888    ,88'  
8 8888        \`88.        .\`8888.   .\`8888.        Y88888o.       8 8 8888   ,88'   
8 8888         \`88       ,8.\`8888. ,8.\`8888.       .\`Y888888o.    8 8 8888  ,88'    
8 8888          88      ,8'8.\`8888,8^8.\`8888.      8o. \`Y888888o. 8 8 8888 ,88'     
8 8888          88     ,8' \`8.\`8888' \`8.\`8888.     8\`Y8o. \`Y88888o8 8 8888 88'      
8 8888         ,88    ,8'   \`8.\`88'   \`8.\`8888.    8   \`Y8o. \`Y8888 8 888888<       
8 8888        ,88'   ,8'     \`8.\`'     \`8.\`8888.   8      \`Y8o. \`Y8 8 8888 \`Y8.     
8 8888    ,o88P'    ,8'       \`8        \`8.\`8888.  8         \`Y8o.\` 8 8888   \`Y8.   
8 888888888P'      ,8'         \`         \`8.\`8888. 8            \`Yo 8 8888     \`Y8.
`}
</pre>


export const MainScreen: FunctionComponent<
  {
    currentWallet: WalletBase | null,
    goNext: () => void,
    goBack: () => void,
  }
> = (props) => {
  return (
    <Button
      onClick={props.goNext}
      variant="outline-dark"
      size="lg"
      disabled={props.currentWallet == null}
    >Play matchmaking
    </Button>
  )
}


export const SetupMMGame: FunctionComponent<
  {
    currentAccount: Account,
    goBack: () => void,
    goNext: (bid: number, range_from: number, range_to: number) => void,
  }
> = (props) => {
  const [currentBid, setBid] = useState(0.4);
  const [currentSlippage, setSlippage] = useState(0.2);
  return (
    <Stack gap={2}>
      <Form.Label>Bid: {currentBid}</Form.Label>
      <Form.Range
        min="0.2"
        max="3"
        step="0.2"
        value={currentBid}
        onChange={(event) => { setBid(parseFloat(event.target.value)) }}
      />
      <Form.Label>Slippage: {(currentSlippage * 100).toFixed(1)}%</Form.Label>
      <Form.Range
        min={0.04}
        max={0.3}
        step={0.02}
        value={currentSlippage}
        onChange={(event) => { setSlippage(parseFloat(event.target.value)) }}
      />
      <Button
        onClick={
          () =>
            props.goNext(
              currentBid,
              (1 - currentSlippage) * currentBid,
              (1 + currentSlippage) * currentBid)
        }
        variant="outline-dark" size="lg"
      >
        Play
      </Button>
      <Button onClick={props.goBack} variant="outline-dark" size="lg">
        Back
      </Button>
    </Stack>
  )
}

// {
//     "blockHash": "0x9f38e50c5aec73c530b67ea95b77109572d577554903ae8f7b7f20dc40d6482f",
//     "blockNumber": 17424819,
//     "contractAddress": null,
//     "cumulativeGasUsed": 1984491,
//     "from": "0xc79e2d0215a5d0aeba939c27a2c0fddbda36832a",
//     "gasUsed": 1928713,
//     "logsBloom": "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000400000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000004000000000000000000000000000000000000000000000000000000",
//     "status": true,
//     "to": "0xd628b705e08f59c2bfe1217801d66f2e5d7d45f0",
//     "transactionHash": "0x62fa1070e523cae40a1578ae0c7a84a2a0804e2ad967c3050e98f03271bd63ff",
//     "transactionIndex": 2,
//     "events": {
//         "GameCreated": {
//             "address": "0xd628b705e08f59c2Bfe1217801D66f2e5d7d45F0",
//             "blockHash": "0x9f38e50c5aec73c530b67ea95b77109572d577554903ae8f7b7f20dc40d6482f",
//             "blockNumber": 17424819,
//             "logIndex": 0,
//             "removed": false,
//             "transactionHash": "0x62fa1070e523cae40a1578ae0c7a84a2a0804e2ad967c3050e98f03271bd63ff",
//             "transactionIndex": 2,
//             "id": "log_12a25878",
//             "returnValues": {
//                 "0": "0x4FE6c61AA04F0F3EC49D1Ebb0B2716D8c0164747",
//                 "1": "0xc79e2D0215a5d0AEbA939c27A2C0fDDBda36832A",
//                 "gameAddress": "0x4FE6c61AA04F0F3EC49D1Ebb0B2716D8c0164747",
//                 "alice": "0xc79e2D0215a5d0AEbA939c27A2C0fDDBda36832A"
//             },
//             "event": "GameCreated",
//             "signature": "0xb60d84e37a6658effce28870b1d123cb86f86409df5888679310c0f276e1f5d2",
//             "raw": {
//                 "data": "0x0000000000000000000000004fe6c61aa04f0f3ec49d1ebb0b2716d8c0164747000000000000000000000000c79e2d0215a5d0aeba939c27a2c0fddbda36832a",
//                 "topics": [
//                     "0xb60d84e37a6658effce28870b1d123cb86f86409df5888679310c0f276e1f5d2"
//                 ]
//             }
//         }
//     }
// }


type GameCreated = {
  gameAddress: string,
  transaction: string,
}


type GameFound = {
  gameAddress: string,
  transaction: string,
  opponent: string,
}


export const WaitMMGame: FunctionComponent<
  {
    currentAccount: Account,
    web3Instance: Web3,
    gameSettings: GameSettings,
    contract: Contract,
    goNext: (bid: number, range_from: number, range_to: number) => void,
  }
> = (props) => {
  const [waitStatus, setWaitStatus] = useState(true)
  const [connectionResult, setConnectionResult] = useState<GameCreated | GameFound | null>(null)
  useEffect(
    () => {
      props.contract.methods
        .play(
          props.web3Instance.utils.toWei(props.gameSettings.range_from.toString()),
          props.web3Instance.utils.toWei(props.gameSettings.range_to.toString()),
        )
        .send(
          {
            "from": props.currentAccount.address,
            "value": props.web3Instance.utils.toWei(props.gameSettings.bid.toString()),
            "chainId": "1666700000",
            "gas": "7000000",
            "gasPrice": "1000000000",
          }
        )
        .on(
          "receipt",
          (receipt: any) => {
            if (receipt.status) {
              // Handle new game case
              if ("GameCreated" in receipt.events) {
                console.log("New game being created")
                setConnectionResult(
                  {
                    gameAddress: receipt.events.GameCreated.returnValues.gameAddress as string,
                    transaction: receipt.transactionHash,
                  }
                )
              }
              else {
                console.log("Join existing game")
                console.log(receipt);
              }
              setWaitStatus(false)
            }
          }
        )
        .on(
          "error",
          (receipt: any, error: any) => {
            if (error != undefined) {
              console.log("Error occured");
              // handle the error
            }
          }
        )
    },
    []
  )
  return (
    waitStatus
      ?
      <div>
        <p>Pending play request</p>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
      :
      <div>
        <p>New game created: { }</p>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Waiting for opponent...</span>
        </Spinner>
      </div>
  )
}


type GameSettings = {
  bid: number,
  range_from: number,
  range_to: number,
}


export const DMNKMainMenu: FunctionComponent<CommonProps> = (props) => {
  const [currentScreen, setCurrentScreen] = useState(CurrentScreen.Main);
  const [currentGameSettings, setGameSettings] = useState<GameSettings | null>(null);

  let currentControl;
  switch (currentScreen) {
    case (CurrentScreen.Main): {
      currentControl =
        <MainScreen
          currentWallet={props.getWallet()}
          goNext={() => { setCurrentScreen(CurrentScreen.SetupMMGame) }}
          goBack={() => { }}
        />
      break;
    }
    case (CurrentScreen.SetupMMGame): {
      currentControl =
        <SetupMMGame
          currentAccount={props.getWallet()![0]}
          goNext={
            (bid, range_from, range_to) => {
              setCurrentScreen(CurrentScreen.WaitMMGame)
              setGameSettings({ bid: bid, range_from: range_from, range_to: range_to })
            }
          }
          goBack={() => { setCurrentScreen(CurrentScreen.Main) }}
        />
      break;
    }
    case (CurrentScreen.WaitMMGame): {
      currentControl =
        <WaitMMGame
          web3Instance={props.web3Instance}
          currentAccount={props.getWallet()![0]}
          gameSettings={currentGameSettings!}
          contract={props.dmnkContract}
          goNext={
            () => { }
          }
        />
      break;
    }
  }
  return (
    <Container className="padded">
      <Row>
        <Col>
          {asciiLogo}
          <Stack gap={2} className="col-md-3 mx-auto">
            {currentControl}
          </Stack>
        </Col>
      </Row>
    </Container>
  );
}
