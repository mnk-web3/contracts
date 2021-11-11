import { Component, FunctionComponent, useState, useEffect } from "react";
import { Navbar, Container, Button, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { WalletBase } from "web3-core";
import { LocalstorageKey } from "../constants";

import Popover from "react-bootstrap/Popover"
import QRCode from "qrcode.react";

import Web3 from "web3";


function shortenAddress(address: string): string {
  return address.slice(0, 6) + "..." + address.slice(-4)
};


type CommonProps = {
  web3Instance: Web3,
  getWallet: () => WalletBase | null,
  setWallet: (wallet: WalletBase) => void,
};


const CreateWallet: FunctionComponent<CommonProps> = (props) => {
  return (
    <Button onClick={
      () => {
        let newWallet = props.web3Instance.eth.accounts.wallet.create(1);
        newWallet.save("123");
        props.setWallet(newWallet);
      }}>
      <i className="bi bi-plus-square-fill"></i>
    </Button>
  )
};


const UnlockWallet: FunctionComponent<CommonProps> = (props) => {
  const [currentInput, setInput] = useState("");
  const [isPasswordValid, setValid] = useState(true);

  const popover =
    <Popover id="popover-contained">
      <Popover.Header as="h3">
        <i className="bi bi-unlock-fill"></i>
      </Popover.Header>
      <Popover.Body>
        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>
            Passphrase:
          </Form.Label>
          <Form.Control
            type="password"
            autoFocus={true}
            placeholder="Wallet passphrase"
            value={currentInput}
            isValid={isPasswordValid}
            onChange={(event) => { setInput(event.target.value) }}
            onKeyUp={
              (event) => {
                if (event.key == "Enter") {
                  try {
                    // Trying to load the wallet with the password provided
                    props.setWallet(
                      props.web3Instance.eth.accounts.wallet.load(currentInput)
                    );
                  } catch {
                    setValid(false);
                    setInput("");
                  }
                }
              }
            }
          />
        </Form.Group>
      </Popover.Body>
    </Popover>
  return (
    <OverlayTrigger
      placement="bottom"
      overlay={popover}
      trigger="click"
      rootClose
    >
      <Button variant="warning">
        <i className="bi bi-unlock-fill"></i>
      </Button>
    </OverlayTrigger>
  )
}


const WalletUnknown: FunctionComponent<CommonProps> = (props) => {
  if (window.localStorage.getItem(LocalstorageKey) == undefined) {
    return <CreateWallet {...props} />
  } else {
    return <UnlockWallet {...props} />
  }
}


const WalletDetails: FunctionComponent<CommonProps> = (props) => {
  const account = props.getWallet()![0];
  const [balance, setBalance] = useState("0");

  useEffect(
    () => {
      const id = setInterval(
        () => {
          props.web3Instance.eth.getBalance(account.address).then(
            (currentBalance) => {
              setBalance(props.web3Instance.utils.fromWei(currentBalance))
            }
          )
        },
        1000
      );
      return () => clearInterval(id);
    }
  )

  const popover =
    <Popover id="popover-contained">
      <Popover.Header as="h3">
        <i className="bi bi-boxes"></i> Address details:
      </Popover.Header>
      <Popover.Body>
        <div>
          <QRCode
            value={account.address}
            level="L"
            style={{
              marginLeft: "auto",
              marginRight: "auto",
              display: "block"
            }}
          />
          <hr />
          <OverlayTrigger
            key="address-copy-overlay-trigger"
            placement="top"
            overlay={
              <Tooltip id={"address-copy-overlay-trigger"}>
                <p>Click to copy the address</p>
              </Tooltip>
            }
          >
            <p
              style={{ marginBottom: 0, cursor: "pointer" }}
              onClick={() => { navigator.clipboard.writeText(account.address).then(() => { }) }
              }>
              <strong>Address:</strong> {shortenAddress(account.address)}
            </p>
          </OverlayTrigger>
          <p style={{ marginBottom: 0 }}><strong>Balance</strong>: {balance}</p>
          <hr />
          <Button variant="outline-dark">Withdraw</Button>
        </div>
      </Popover.Body>
    </Popover>

  return (
    <OverlayTrigger
      placement="bottom"
      overlay={popover}
      trigger="click"
      rootClose
    >
      < Button variant="light" >
        Address: <strong>{shortenAddress(account.address)} <i className="bi bi-boxes"></i></strong>
      </Button >
    </OverlayTrigger>
  )
}


export class Wallet extends Component<CommonProps, any> {
  constructor(props: CommonProps) {
    super(props);
  }

  render() {
    return (
      this.props.getWallet() == null
        ? <WalletUnknown {...this.props} />
        : <WalletDetails {...this.props} />
    )
  }
}


export class DMNKNavbar extends Component<CommonProps, any> {

  constructor(props: CommonProps) {
    super(props);
  }

  render() {
    return (
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand>
            <strong>
              D
              <i className="bi bi-controller"></i>
              NK
            </strong>
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-end">
            < Wallet {...this.props} />
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  }
}
