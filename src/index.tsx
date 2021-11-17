import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { Contract } from "web3-eth-contract";
import Web3 from "web3";


import { buildInfo as buildInfoDMNK } from "./artifacts/buildInfoDMNK";
import { deployInfo as deployInfoDMNK } from "./artifacts/deployInfoDMNK";
import { buildInfo as buildInfoGameInstance } from "./artifacts/buildInfoGameInstance";


ReactDOM.render(
  <App
    dmnkABI={buildInfoDMNK.abi}
    dmnkAddress={deployInfoDMNK.address}
    gameInstanceABI={buildInfoGameInstance.abi as any}
  />,
  document.getElementById("root")
);
