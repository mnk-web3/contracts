import { FunctionComponent, useState, useEffect } from "react";
import { Navbar, Container, Button, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Account } from "web3-core";
import { shortenAddress } from "../common";


import { AccountCreate } from "./CreateWallet";


import Popover from "react-bootstrap/Popover"
import QRCode from "qrcode.react";


export enum AccountResultKind {
  Exists, NonExists, Locked
}


export type AccountRequestResult =
  {
    kind: AccountResultKind.Exists,
    value: Account
  } |
  {
    kind: AccountResultKind.NonExists,
    value: null
  } |
  {
    kind: AccountResultKind.Locked
    value: ((password: string) => boolean)
  }


export type NavbarProps = {
  getBalance: (account: Account) => Promise<number>,
  getAccount: () => AccountRequestResult,
  createAccount: (password: string) => void,
};


const AccountUnlock: FunctionComponent<{ unlockAccount: (password: string) => boolean }> = (props) => {
  // Password field
  const [currentInput, setInput] = useState("");

  const popover =
    <Popover id="popover-contained">
      <Popover.Header as="h3">
        <i className="bi bi-unlock-fill"></i>
      </Popover.Header>
      <Popover.Body>
        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>
            Unlock:
          </Form.Label>
          <Form.Control
            type="password"
            autoFocus={true}
            placeholder="Your password"
            value={currentInput}
            onChange={(event) => { setInput(event.target.value) }}
            onKeyUp={
              (event) => {
                (event.key == "Enter") && !props.unlockAccount(currentInput) && setInput("")
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


const AccountDetails: FunctionComponent<
  {
    account: Account,
    getBalance: (account: Account) => Promise<number>
  }
> = (props) => {
  const [balance, setBalance] = useState(0)

  // Refresh the balance value each 500ms
  useEffect(
    () => {
      const id = setInterval(
        () => {
          props
            .getBalance(props.account)
            .then(setBalance)
        },
        500
      );
      return () => clearInterval(id);
    },
    []
  )

  const popover =
    <Popover id="popover-contained">
      <Popover.Header as="h3">
        <i className="bi bi-boxes"></i> Address details:
      </Popover.Header>
      <Popover.Body>
        <div>
          <QRCode
            value={props.account.address}
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
              onClick={() => { navigator.clipboard.writeText(props.account.address).then(() => { }) }
              }>
              <strong>Address:</strong> {shortenAddress(props.account.address)}
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
        Address: <strong>{shortenAddress(props.account.address)} <i className="bi bi-boxes"></i></strong>
      </Button >
    </OverlayTrigger>
  )
}


const Wallet: FunctionComponent<NavbarProps> = (props) => {
  const accountHandle = props.getAccount();

  switch (accountHandle.kind) {
    case AccountResultKind.Exists: {
      return <AccountDetails account={accountHandle.value} getBalance={props.getBalance} />
    }
    case AccountResultKind.NonExists: {
      return <AccountCreate onCreate={props.createAccount} />
    }
    case AccountResultKind.Locked: {
      return <AccountUnlock unlockAccount={accountHandle.value} />
    }
  }
}


export const DMNKNavbar: FunctionComponent<NavbarProps> = (props) => {
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
          < Wallet {...props} />
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
