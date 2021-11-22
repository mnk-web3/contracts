import ReactDOM from "react-dom";
import App from "./App";
import { MyGamesKey } from "./constants"

import "./index.css";

import { buildInfo as buildInfoDMNK } from "./artifacts/buildInfoDMNK";
import { deployInfo as deployInfoDMNK } from "./artifacts/deployInfoDMNK";
import { buildInfo as buildInfoGameInstance } from "./artifacts/buildInfoGameInstance";


ReactDOM.render(
  <App
    dmnkABI={buildInfoDMNK.abi}
    dmnkAddress={deployInfoDMNK.address}
    gameInstanceABI={buildInfoGameInstance.abi as any}
    dropGame={
      (address: string) => {
        let currentGames = new Set<string>(JSON.parse(window.localStorage.getItem(MyGamesKey) || "[]"))
        currentGames.delete(address)
        window.localStorage.setItem(MyGamesKey, JSON.stringify(Array.from(currentGames)))
      }
    }
    getGames={
      () => new Set<string>(JSON.parse(window.localStorage.getItem(MyGamesKey) || "[]"))
    }
    addGame={
      (address: string) => {
        window.localStorage.setItem(
          MyGamesKey,
          JSON.stringify(
            Array.from(
              new Set<string>(JSON.parse(window.localStorage.getItem(MyGamesKey) || "[]")).add(address)
            )
          )
        )
      }
    }
  />,
  document.getElementById("root")
);
