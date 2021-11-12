import { Component, FunctionComponent, Ref, useEffect, useRef, useState } from "react";
import { Modal, Button, Form, Container, FloatingLabel } from "react-bootstrap";


type CreateWalletModalProps = {
  onCreate: (password: string) => void,
  onHide: () => void,
  show: boolean
}


export const CreateWalletModal: FunctionComponent<CreateWalletModalProps> =
  (props) => {
    const [firstPasswordField, setFirstPasswordField] = useState("")
    const [secondPasswordField, setSecondPasswordField] = useState("")

    return (
      <Modal
        size="sm"
        aria-labelledby="contained-modal-title-vcenter"
        centered
        show={props.show}
        onHide={props.onHide}
        animation={false}
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            Create a new wallet:
          </Modal.Title>
        </Modal.Header>
        <Container>
          <Modal.Body>
            <Form>
              <FloatingLabel
                controlId="password-input-first"
                label="Password"
                className="mb-3"
              >
                <Form.Control
                  type="password"
                  value={firstPasswordField}
                  onChange={(event) => { setFirstPasswordField(event.target.value) }}
                  autoFocus={true}
                />
              </FloatingLabel>
              <FloatingLabel
                controlId="password-input-second"
                label="Password again"
                className="mb-3"
              >
                <Form.Control
                  type="password"
                  placeholder="Password again"
                  value={secondPasswordField}
                  isValid={firstPasswordField == secondPasswordField}
                  onChange={(event) => { setSecondPasswordField(event.target.value) }}
                />
              </FloatingLabel>
            </Form>
          </Modal.Body>
        </Container>
        <Modal.Footer>
          <Button
            disabled={firstPasswordField != secondPasswordField}
            onClick={() => props.onCreate(firstPasswordField)}
          >
            Create
          </Button>
          <Button onClick={props.onHide}>Cancel</Button>
        </Modal.Footer>
      </Modal>
    )
  }


type CreateWalletProps = {
  onCreate: (password: string) => void,
}


export const CreateWallet: FunctionComponent<CreateWalletProps> = (props) => {
  const [showModal, setShowModal] = useState(false)
  return (
    <>
      <Button onClick={() => { setShowModal(true) }} >
        <i className="bi bi-plus-square-fill"></i>
      </Button>
      <CreateWalletModal
        show={showModal}
        onHide={() => { setShowModal(false) }}
        onCreate={props.onCreate}
      />
    </>
  )
}