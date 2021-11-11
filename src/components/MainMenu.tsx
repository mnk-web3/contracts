import { Component, FunctionComponent, useState } from "react";
import { Container, Button, Col, Row, Form } from "react-bootstrap";
import Stack from "react-bootstrap/Stack";
import "./common.css";


import { WalletBase } from "web3-core";
import Web3 from "web3";


enum CurrentScreen {
  Main, SetupMMGame, SetupCusomGame, WaitMMGame,
}


type CommonProps = {
  web3Instance: Web3,
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
    currentWallet: WalletBase | null,
    goBack: () => void,
    goNext: (bid: number, range_from: number, range_to: number) => void,
  }
> = (props) => {
  const [currentBid, setBid] = useState(3);
  const [currentSlippage, setSlippage] = useState(0.2);
  return (
    <Stack gap={2}>
      <Form.Label>Bid: {currentBid}</Form.Label>
      <Form.Range
        min={1}
        max={10}
        step={1}
        value={currentBid}
        onChange={(event) => { setBid(parseInt(event.target.value)) }}
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


type GameSettings = {
  bid: number,
  range_from: number,
  range_to: number,
}


export class DMNKMainMenu extends Component<CommonProps, MainMenuState> {
  constructor(props: CommonProps) {
    super(props);
    this.state = { screen: CurrentScreen.Main, gameSettings: null };
  }
  render() {
    let currentControl;
    switch (this.state.screen) {
      case (CurrentScreen.Main): {
        currentControl =
          <MainScreen
            currentWallet={this.props.getWallet()}
            goNext={() => { this.setState({ screen: CurrentScreen.SetupMMGame }) }}
            goBack={() => { }}
          />
        break;
      }
      case (CurrentScreen.SetupMMGame): {
        currentControl =
          <SetupMMGame
            currentWallet={this.props.getWallet()}
            goNext=
            {
              (bid, range_from, range_to) => {
                this.setState(
                  {
                    screen: CurrentScreen.WaitMMGame,
                    gameSettings: { bid: bid, range_from: range_from, range_to: range_to }
                  }
                );
              }
            }
            goBack={() => { this.setState({ screen: CurrentScreen.Main }) }}
          />
        break;
      }
    }
    return (
      <Container className="padded">
        <Row>
          <Col>
            {asciiLogo},
            <Stack gap={2} className="col-md-3 mx-auto">
              {currentControl}
            </Stack>
          </Col>
        </Row>
      </Container>
    );
  }
}
