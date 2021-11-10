import { Component } from "react";
import { Modal, Button, Form, Container } from "react-bootstrap";

export type PlayGameState = {
  deposit: number;
};

export default class PlayGameModal extends Component<any, PlayGameState> {
  constructor(props: any) {
    super(props);
    this.state = {
      deposit: 0,
    };
  }

  render() {
    return (
      <Modal
        {...this.props}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            Game settings
          </Modal.Title>
        </Modal.Header>
        <Container>
          <Modal.Body>
            <Form.Label htmlFor="depositSelector">
              Deposit: {this.state.deposit}
            </Form.Label>
            <Form.Control
              type="range"
              className="form-range"
              value={this.state.deposit}
              onChange={(event) =>
                this.setState({ deposit: parseInt(event.target.value) })
              }
              min={0}
              max={20}
              step={1}
              id="depositSelector"
            />
          </Modal.Body>
        </Container>
        <Modal.Footer>
          <Button onClick={this.props.onPlay}>Play</Button>
          <Button onClick={this.props.onHide}>Cancel</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
