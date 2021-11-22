import { ComponentStory, ComponentMeta } from '@storybook/react';


import { WaitingForContractPlayReaction, PlayEventKind, PlayResponse } from "../components/WaitScreens";


export default {
  title: 'DMNK/WaitingForPlayResponse',
  component: WaitingForContractPlayReaction,
} as ComponentMeta<typeof WaitingForContractPlayReaction>;


const Template: ComponentStory<typeof WaitingForContractPlayReaction> = (args) => <WaitingForContractPlayReaction {...args} />;


export const Main = Template.bind({});


function getPlayResponse(): Promise<PlayResponse> {
  return new Promise(
    (resolve, reject) => {
      setTimeout(() => { resolve({kind: PlayEventKind.GameCreated, gameAddress: "someaddress"}) }, 1000)
    }
  )
}


Main.args = {
  onInsufficientBalance: () => {},
  onGameCreated: (response) => {},
  onGameFound: (response) => {},
  getPlayResponse: () => getPlayResponse(),
};
