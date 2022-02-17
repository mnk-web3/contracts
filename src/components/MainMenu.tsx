import { FunctionComponent, useEffect, useState } from "react";
import { Container, Button, Col, Row, Form, Stack, Spinner } from "react-bootstrap";
import { Contract } from "web3-eth-contract";


import "./common.css";


import { WalletBase } from "web3-core";
import Web3 from "web3";


enum CurrentScreen {
  Main, ConstructGame
}


type CommonProps = {
  web3Instance: Web3,
  dmnkContract: Contract,
  getWallet: () => WalletBase | null,
  setWallet: (wallet: WalletBase) => void,
};


type MainMenuState = { screen: CurrentScreen, gameSettings: GameSettings | null };


export const MainScreen: FunctionComponent<{ goNext: () => void }> = (props) => {
  return (
    <Button onClick={props.goNext} variant="outline-dark" size="lg">
      Play matchmaking
    </Button>
  )
}


export const GameConstructor: FunctionComponent<
  {
    goBack: () => void,
    goNext: (settings: GameSettings) => void,
    getBalance: () => Promise<number>,
  }
> = (props) => {
  const [bidMax, setBidMax] = useState(3);
  const [currentBid, setBid] = useState(0.4);
  const [currentSlippage, setSlippage] = useState(0.2);

  useEffect(
    () => {
      props.getBalance().then(
        (balance) => {
          Math.min(bidMax, balance)
        }
      )
    },
    []
  )

  return (
    <Stack gap={2}>
      <Form.Label>Bid: {currentBid}</Form.Label>
      <Form.Range
        min={0.2}
        max={bidMax}
        step={0.2}
        value={Math.min(currentBid, bidMax)}
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
              {
                bid: currentBid,
                range_from: (1 - currentSlippage) * currentBid,
                range_to: (1 + currentSlippage) * currentBid,
              }
            )
        }
        variant="outline-dark" size="lg"
      >
        Play
      </Button>
      <Button onClick={props.goBack} variant="outline-dark" size="lg">
        Back
      </Button>
    </Stack >
  )
}


type GameCreated = {
  gameAddress: string,
  transaction: string,
}


type GameFound = {
  gameAddress: string,
  transaction: string,
  opponent: string,
}


// This is what expected to come out of the game constructor
export type GameSettings = {
  bid: number,
  range_from: number,
  range_to: number,
}


interface MainMenuProps {
  getBalance: () => Promise<number>,
  onGameSettingsReady: (settings: GameSettings) => void;
}


const DMNKMainMenu: FunctionComponent<MainMenuProps> = (props) => {
  const [currentScreen, setCurrentScreen] = useState(CurrentScreen.Main);

  let currentControl;
  switch (currentScreen) {
    case (CurrentScreen.Main): {
      currentControl =
        <MainScreen goNext={() => { setCurrentScreen(CurrentScreen.ConstructGame) }}
        />
      break;
    }
    case (CurrentScreen.ConstructGame): {
      currentControl =
        <GameConstructor
          getBalance={props.getBalance}
          goNext={props.onGameSettingsReady}
          goBack={() => { setCurrentScreen(CurrentScreen.Main) }}
        />
      break;
    }
  }
  return (
    <Container>
      <Row>
        <Col>
          <Stack gap={2} className="col-md-3 mx-auto">
            {currentControl}
          </Stack>
        </Col>
      </Row>
    </Container >
  );
}


export default DMNKMainMenu;
