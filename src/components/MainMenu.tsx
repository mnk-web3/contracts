import { Component } from "react";
import { Container, Button, Col, Row } from "react-bootstrap";
import Stack from "react-bootstrap/Stack";
import "./common.css";


enum CurrentScreen {
  Main, CreateGame,
}


type MainMenuState = { screen: CurrentScreen };
type MainMenuProps = { isConnected: Boolean, onPlay: () => void };


const asciiLogo = <pre className="col-md-7 mx-auto logo">{`
8 888888888o.               ,8.       ,8.          b.             8 8 8888     ,88' 
8 8888    \`^888.           ,888.     ,888.         888o.          8 8 8888    ,88'  
8 8888        \`88.        .\`8888.   .\`8888.        Y88888o.       8 8 8888   ,88'   
8 8888         \`88       ,8.\`8888. ,8.\`8888.       .\`Y888888o.    8 8 8888  ,88'    
8 8888          88      ,8'8.\`8888,8^8.\`8888.      8o. \`Y888888o. 8 8 8888 ,88'     
8 8888          88     ,8' \`8.\`8888' \`8.\`8888.     8\`Y8o. \`Y88888o8 8 8888 88'      
8 8888         ,88    ,8'   \`8.\`88'   \`8.\`8888.    8   \`Y8o. \`Y8888 8 888888<       
8 8888        ,88'   ,8'     \`8.\`'     \`8.\`8888.   8      \`Y8o. \`Y8 8 8888 \`Y8.     
8 8888    ,o88P'    ,8'       \`8        \`8.\`8888.  8         \`Y8o.\` 8 8888   \`Y8.   
8 888888888P'      ,8'         \`         \`8.\`8888. 8            \`Yo 8 8888     \`Y8.`}
</pre>


export class DMNKMainMenu extends Component<MainMenuProps, MainMenuState> {
  constructor(props: MainMenuProps) {
    super(props);
    this.state = { screen: CurrentScreen.Main };
  }
  render() {
    let currentControl;
    switch (this.state.screen) {
      case (CurrentScreen.Main): {
        currentControl =
          <Button
            onClick={() => { this.setState({ screen: CurrentScreen.CreateGame }); }}
            variant="outline-dark"
            size="lg"
            disabled={!this.props.isConnected}
          >Play matchmaking
          </Button>
        break;
      }
      case (CurrentScreen.CreateGame): {
        currentControl =
          <>
            <Button
              onClick={this.props.onPlay} variant="dark" size="lg"
            >Play
            </Button>
            <Button
              onClick={() => { this.setState({ screen: CurrentScreen.Main }); }}
              variant="dark"
              size="lg"
            >Back
            </Button>
          </>
        break;
      }
    }
    return (
      <Container className="padded">
        <Row>
          <Col>
            {asciiLogo},
            <Stack gap={2} className="col-md-3 mx-auto">
              {currentControl}
            </Stack>
          </Col>
        </Row>
      </Container>
    );
  }
}
