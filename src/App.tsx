import { Component, FunctionComponent, useState } from "react";
import { Container, Navbar } from "react-bootstrap";
import { DMNKNavbar, NavbarProps, AccountResultKind } from "./components/navbar/Navbar";
import { AccountIsNotAvailable } from "./components/WaitScreens";
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
  dmnkABI: any,
  dmnkAddress: string,
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
  // const [currentScreen, setCurrentScreen] = useState(CurrentScreen.MainScreen);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [web3Instance, setWeb3Instance] = useState(
    networkTypeToWeb3Instance(NetworkType.HarmonyTestnet)
  )
  // Main dmnk contract instance
  const [dmnkContract, setDMNKContract] = useState(
    new web3Instance.eth.Contract(props.dmnkABI, props.dmnkAddress)
  );

  const mainProps: NavbarProps = {
    createAccount: (password: string) => {
      const newWallet = web3Instance.eth.accounts.wallet.create(1);
      newWallet.save(password);
      setCurrentAccount(newWallet[0]);
    },
    getBalance: async (acc: Account) => {
      return parseFloat(
        web3Instance.utils.fromWei(
          await web3Instance.eth.getBalance(acc.address)
        )
      )
    },
    getAccount: () => {
      // account is there and it is unlocked
      if (currentAccount != null) {
        return {
          kind: AccountResultKind.Exists,
          value: currentAccount
        }
      }
      // no account for you, create first
      else if (window.localStorage.getItem(LocalstorageKey) == null) {
        return {
          kind: AccountResultKind.NonExists,
          value: null
        };
      }
      // account is there but it is locked
      else {
        return {
          kind: AccountResultKind.Locked,
          value:
            (password: string) => {
              try {
                setCurrentAccount(web3Instance.eth.accounts.wallet.load(password)[0]);
                return true
              }
              catch {
                return false
              }
            }
        }
      }
    }
  }

  return (
    <Container>
      <DMNKNavbar {...mainProps} />
      {
        (currentAccount == null)
          ? <AccountIsNotAvailable />
          : <DMNKMainMenu
            getBalance={async () => { return mainProps.getBalance(currentAccount) }}
            onGameSettingsReady={(settings) => { }}
          />
      }
    </Container>
  );
}

export default App;
