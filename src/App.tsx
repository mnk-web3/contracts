import { Component, FunctionComponent, useState } from "react";
import { Container, Navbar } from "react-bootstrap";
import { DMNKNavbar, NavbarProps } from "./components/navbar/Navbar";
import DMNKMainMenu from "./components/MainMenu";
import { Contract } from "web3-eth-contract";
import { WalletBase } from "web3-core";
import { LocalstorageKey } from "./constants";
import { Account } from "web3-core";



import Web3 from "web3";


enum NetworkType {
  HarmonyTestnet,
  HarmonyMainnet
}


function networkTypeToWeb3Instance(networkType: NetworkType): Web3 {
  switch (networkType) {
    case NetworkType.HarmonyMainnet: {
      return new Web3("https://api.harmony.one");
    }
    case NetworkType.HarmonyTestnet: {
      return new Web3("https://api.s0.b.hmny.io");
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


enum CurrentScreen {
  MainScreen,
  GameScreen
}


const commonProps = {
  getAccount: () => {
    if (window.localStorage.getItem(LocalstorageKey) == null) {
      return null;
    }
  }
}


const App: FunctionComponent<AppProps> = (props) => {
  const [currentScreen, setCurrentScreen] = useState(CurrentScreen.MainScreen);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [web3Instance, setWeb3Instance] = useState(
    networkTypeToWeb3Instance(NetworkType.HarmonyTestnet)
  )

  const commonProps: NavbarProps = {
    createAccount: (password: string) => {
      let newWallet = web3Instance.eth.accounts.wallet.create(1);
      newWallet.save(password);
      setCurrentAccount(newWallet[0]);
    },
    getBalance: async (acc: Account) => {
      const balance = await web3Instance.eth.getBalance(acc.address)
      return parseFloat(web3Instance.utils.fromWei(balance))
    },
    getAccount: () => {
      // account being created and unlocked
      if (currentAccount != null) {
        return {
          kind: "exists",
          value: currentAccount
        }
      }
      // no account for you, create first
      else if (window.localStorage.getItem(LocalstorageKey) == null) {
        return {
          kind: "not_exists",
          value: null
        };
      }
      // account is there, but it is locked
      else {
        return {
          kind: "locked",
          value: (password: string) => {
            try {
              setCurrentAccount(web3Instance.eth.accounts.wallet.load(password)[0]);
            }
            catch {
            }
          }
        }
      }
    }
  }

  return (
    <Container>
      <DMNKNavbar {...commonProps} />
    </Container>
  );
}

export default App;
