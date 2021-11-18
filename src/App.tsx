import { FunctionComponent, useState } from "react";
import { Container } from "react-bootstrap";
import { DMNKNavbar, NavbarProps, AccountResultKind } from "./components/navbar/Navbar";
import {
  AccountIsNotAvailable, WaitingForContractPlayReaction,
  PlayResponse, PlayEventKind, GameCreatedResponse, GameFoundResponse, NewGameBeingCreated
}
  from "./components/WaitScreens";
import DMNKMainMenu, { GameSettings } from "./components/MainMenu";
import { Board, CurrentTurn } from "./components/board/Board";
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
      // return new Web3("https://api.s0.b.hmny.io");
      return new Web3("wss://ws.s0.pops.one/");
    }
  }
}


enum CurrentScreen {
  Main = "Main",
  WaitingForPlayResponse = "WaitingForPlayResponse",
  GamePending = "GamePending",
  GamePlaying = "GamePlaying"
}


export type AppProps = {
  dmnkABI: any,
  dmnkAddress: string,
  gameInstanceABI: any,
}


const App: FunctionComponent<AppProps> = (props) => {
  const [currentScreen, setCurrentScreen] = useState(CurrentScreen.Main);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings | null>(null);
  const [gameAddress, setGameAddress] = useState<string | null>(null);
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
                // wallet.load will raise an exception on the wrong password
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

  let currentComponent;
  switch (currentScreen) {
    case (CurrentScreen.Main): {
      currentComponent =
        <DMNKMainMenu
          getBalance={async () => { return mainProps.getBalance(currentAccount!) }}
          onGameSettingsReady={
            (settings) => {
              setGameSettings(settings)
              setCurrentScreen(CurrentScreen.WaitingForPlayResponse)
            }
          }
        />
      break
    }
    case (CurrentScreen.WaitingForPlayResponse): {
      currentComponent =
        <WaitingForContractPlayReaction
          onGameCreated={
            (response) => {
              setGameAddress(response.gameAddress)
              setCurrentScreen(CurrentScreen.GamePending)
            }
          }
          onGameFound={
            (response) => {
              setGameAddress(response.gameAddress)
              setCurrentScreen(CurrentScreen.GamePlaying)
            }
          }
          getPlayResponse={
            () =>
              dmnkContract
                .methods
                .play(
                  web3Instance.utils.toWei(gameSettings!.range_from.toString()),
                  web3Instance.utils.toWei(gameSettings!.range_to.toString()),
                )
                .send(
                  {
                    "from": currentAccount!.address,
                    "value": web3Instance.utils.toWei(gameSettings!.bid.toString()),
                    "gas": "5000000",
                    "gasPrice": "1000000000",
                  },
                )
          }
        />
      break
    }
    case (CurrentScreen.GamePending): {
      currentComponent =
        <NewGameBeingCreated
          gameAddress={gameAddress!}
          gameSettings={gameSettings!}
          waitForOpponent={
            () => {
              return new Promise(
                (resolve, reject) => {
                  dmnkContract.events.GameStarted(
                    {
                      filters: {
                        gameAddress: gameAddress!,
                        alice: currentAccount!.address,
                      },
                      fromBlock: 0,
                    }
                  )
                    .on(
                      "data",
                      (log: any) => {
                        resolve(log.returnValues.bob)
                      }
                    )
                }
              )
            }}
          proceedAfterOpponentFound={
            (address) => {
              setCurrentScreen(CurrentScreen.GamePlaying)
            }
          }
          proceedAfterCancellation={
            () => {
              setCurrentScreen(CurrentScreen.Main)
            }
          }
          cancelGame={
            async () => {
              const receipt: any = (
                await
                  (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                    .methods
                    .cancel()
                    .send(
                      {
                        "from": currentAccount!.address,
                        "gas": "5000000",
                        "gasPrice": "1000000000",
                      }
                    )
              )
              return receipt.status
            }
          }
        />
      break
    }
    case (CurrentScreen.GamePlaying): {
      currentComponent =
        <Board
          dimensions={{ width: 25, height: 25 }}
          getLockedValue={
            async () => {
              const valueAsWEI = await
                (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                  .methods
                  .getLockedValue()
                  .call()
              return parseFloat(web3Instance.utils.fromWei(valueAsWEI))
            }
          }
          getCurrentTurn={
            async () => {
              const address = await
                (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                  .methods
                  .getCurrentTurn()
                  .call()
              return (address == currentAccount!.address) ? CurrentTurn.Mine : CurrentTurn.NotMine
            }
          }
          appendMyMove={
            async (x, y) => {
              // implement me
              const receipt: any = (
                await
                  (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                    .methods
                    .makeMove(x.toString(), y.toString())
                    .send(
                      {
                        "from": currentAccount!.address,
                        "gas": "5000000",
                        "gasPrice": "1000000000",
                      }
                    )
              )
              return receipt.status
            }
          }
          getOpponentMove={
            () => {
              return new Promise(
                (resolve, reject) => {
                  (new web3Instance.eth.Contract(props.gameInstanceABI, gameAddress!))
                    .events.Move(
                      {
                        filters: {
                        },
                        fromBlock: 0,
                      }
                    )
                    .on(
                      "data",
                      (log: any) => {
                        console.log("Got opponents move", log)
                        if (log.returnValues.player != currentAccount!.address) {
                          resolve({ x: parseInt(log.returnValues.x), y: parseInt(log.returnValues.y) })
                        }
                      }
                    )
                }
              )
            }
          }
        />
    }
  }

  return (
    <Container>
      <DMNKNavbar {...mainProps} />
      {
        (currentAccount == null)
          ? <AccountIsNotAvailable />
          : currentComponent
      }
    </Container >
  );
}

export default App;
