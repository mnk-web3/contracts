import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { Contract } from "web3-eth-contract";
import Web3 from "web3";


import { buildInfo as buildInfoDMNK } from "./artifacts/buildInfoDMNK";
import { deployInfo as deployInfoDMNK } from "./artifacts/deployInfoDMNK";
import { buildInfo as buildInfoGameInstance } from "./artifacts/buildInfoGameInstance";


const web3 = new Web3("https://api.s0.b.hmny.io");
//const web3 = new Web3("wss://ws.s0.pops.one/")

ReactDOM.render(
  <React.StrictMode>
    <App
      web3={web3}
      dmnkContract={new web3.eth.Contract(buildInfoDMNK.abi as any, deployInfoDMNK.address)}
      gameInstanceABI={buildInfoGameInstance.abi as any}
    />
  </React.StrictMode>,
  document.getElementById("root")
);
