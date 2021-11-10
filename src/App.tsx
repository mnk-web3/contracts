import { Component } from "react";
import { Container, Navbar } from "react-bootstrap";
import { DMNKNavbar } from "./components/Navbar";
import { DMNKMainMenu } from "./components/MainMenu";
import Web3 from "web3";
import detectEthereumProvider from "@metamask/detect-provider";
import { Account } from "web3-core";


enum NetworkType {
  HarmonyTestnet, HarmonyMainnet, Unknown
}


const opPk = "opPk";


function getOrCreateOpAccount(web3: Web3 | null): Account | null {
  if (web3 == null) {
    return null;
  }
  const maybePk = window.localStorage.getItem(opPk);
  if (maybePk != null) {
    return web3.eth.accounts.privateKeyToAccount(maybePk);
  } else {
    const newAccount = web3.eth.accounts.create();
    window.localStorage.setItem(opPk, newAccount.privateKey);
    return newAccount;
  }
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
  // Is metamask connected to the website
  isConnected: boolean;
  // generic web3 provider
  web3: Web3 | null;
  // What to display right now
  screen: AppScreen;
  // Operational wallet
  opWallet: Account | null
};


export class App extends Component<any, AppState> {
  constructor(props: any) {
    super(props);
    this.state = {
      screen: AppScreen.Main,
      web3: null,
      opWallet: null,
      isConnected:
        window.ethereum != undefined &&
        (window.ethereum as any).selectedAddress != undefined,
    }
  }
  onConnectionSuccess = () => {
    let web3Instance =
      networkTypeToWeb3Instance(
        networkVersionToType((window.ethereum as any).networkVersion)
      )
    this.setState(
      {
        isConnected: true,
        web3: web3Instance,
        opWallet: getOrCreateOpAccount(web3Instance),
      }
    );
  }
  render() {
    let currentControl;
    switch (this.state.screen) {
      case (AppScreen.Main): {
        currentControl = (
          <DMNKMainMenu
            isConnected={this.state.isConnected}
            onPlay={() => { this.setState({ screen: AppScreen.GamePending }) }}
          />
        );
        break;
      }
    }
    return (
      <Container>
        <DMNKNavbar
          isConnected={this.state.isConnected}
          onConnectionSuccess={this.onConnectionSuccess}
        />
        {currentControl}
      </Container>
    );
  }
}
