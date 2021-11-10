import { Component } from "react";
import { Container, Navbar } from "react-bootstrap";
import { DMNKNavbar } from "./components/Navbar";
import { DMNKMainMenu } from "./components/MainMenu";
import Web3 from "web3";
import detectEthereumProvider from "@metamask/detect-provider";
import { Account, WalletBase } from "web3-core";


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
  web3Instance: Web3,
  wallet: WalletBase | null,
}


export class App extends Component<any, AppState> {
  constructor(props: any) {
    super(props);
    this.state = {
      web3Instance: new Web3("https://api.s0.b.hmny.io"),
      wallet: null,
    }
  }
  render() {
    return (
      <Container>
        <DMNKNavbar
          web3Instance={this.state.web3Instance}
          getWallet={() => { return this.state.wallet }}
          setWallet={(wallet: WalletBase) => { this.setState({ wallet: wallet }) }}
        />
      </Container>
    );
  }
}
