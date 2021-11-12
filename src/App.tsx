import { Component } from "react";
import { Container, Navbar } from "react-bootstrap";
import { DMNKNavbar } from "./components/navbar/Navbar";
import { DMNKMainMenu } from "./components/MainMenu";
import { Contract } from "web3-eth-contract";
import { WalletBase } from "web3-core";


import Web3 from "web3";


enum NetworkType {
  HarmonyTestnet, HarmonyMainnet, Unknown
}


function networkVersionToType(version: string): NetworkType {
  switch (version) {
    case "1666600000": {
      return NetworkType.HarmonyMainnet;
    }
    case "1666700000": {
      return NetworkType.HarmonyTestnet;
    }
    default: {
      return NetworkType.Unknown;
    }
  }
}


function networkTypeToWeb3Instance(networkType: NetworkType): Web3 | null {
  switch (networkType) {
    case NetworkType.HarmonyMainnet: {
      return new Web3("https://api.harmony.one");
    }
    case NetworkType.HarmonyTestnet: {
      return new Web3("https://api.s0.b.hmny.io");
    }
    case NetworkType.Unknown: {
      return null;
    }
  }
}


enum AppScreen {
  Main, GamePending, GameRunning
}


type AppState = {
  wallet: WalletBase | null,
}


export type AppProps = {
  web3: Web3,
  dmnkContract: Contract,
  gameInstanceABI: any,
}


export class App extends Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      wallet: null,
    }
  }
  render() {
    const commonProps = {
      web3Instance: this.props.web3,
      getWallet: (() => { return this.state.wallet }),
      setWallet: ((wallet: WalletBase) => { this.setState({ wallet: wallet }) }),
      dmnkContract: this.props.dmnkContract,
    }
    return (
      <Container>
        <DMNKNavbar {...commonProps} />
        <DMNKMainMenu {...commonProps} />
      </Container>
    );
  }
}
