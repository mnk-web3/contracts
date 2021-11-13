import { ComponentStory, ComponentMeta } from '@storybook/react';


import Board from "../components/board/Board"


export default {
  title: 'DMNK/Board',
  component: Board,
} as ComponentMeta<typeof Board>;


const Template: ComponentStory<typeof Board> = (args) => <Board {...args} />;


export const ActualInGame = Template.bind({});
export const Small = Template.bind({});
export const Medium = Template.bind({});


ActualInGame.args = {
  height: 25,
  width: 25
};


Small.args = {
  height: 5,
  width: 5
};


Medium.args = {
  height: 15,
  width: 15
};

