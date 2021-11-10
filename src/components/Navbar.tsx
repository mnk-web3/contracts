import { Account } from "web3-core";


import { Component } from "react";
import { Navbar, Container, Button } from "react-bootstrap";


export type WalletProvider = {
  isConnected: boolean;
  onConnectionSuccess: () => void;
};


function shortenAddress(address: string): string {
  return address.slice(0, 6) + "..." + address.slice(-4)
};


type OnConnect = {
  onConnectionSuccess: () => void;
}


export class ConnectToMetamask extends Component<OnConnect, any> {
  constructor(props: OnConnect) {
    super(props);
  }

  attemptToConnect = () => {
    (window.ethereum as any)
      .request({ method: "eth_requestAccounts" })
      .then(
        (accounts: string[]) => { this.props.onConnectionSuccess() }
      )
  }

  render() {
    return <Button variant="light" onClick={this.attemptToConnect}>Connect to metamask</Button>
  }
}


export class WalletDetails extends Component {
  render() {
    return (
      <Button variant="light">
        Connected: {shortenAddress((window.ethereum as any).selectedAddress as string)}
      </Button>
    )
  }
}


export class DMNKNavbar extends Component<WalletProvider, any> {

  constructor(props: WalletProvider) {
    super(props);
  }

  render() {
    return (
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand>{`DMNK <3 Harmony`}</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-end">
            {
              this.props.isConnected
                ? < WalletDetails />
                : < ConnectToMetamask
                  onConnectionSuccess={this.props.onConnectionSuccess}
                />
            }
          </Navbar.Collapse>
        </Container>
      </Navbar>
    );
  }
}
