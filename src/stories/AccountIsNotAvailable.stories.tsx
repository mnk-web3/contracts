import { ComponentStory, ComponentMeta } from '@storybook/react';


import { AccountIsNotAvailable, UnavailabitlityReason } from "../components/WaitScreens";


export default {
  title: 'DMNK/AccountIsNotAvailable',
  component: AccountIsNotAvailable,
} as ComponentMeta<typeof AccountIsNotAvailable>;


const Template: ComponentStory<typeof AccountIsNotAvailable> = (args) => <AccountIsNotAvailable {...args} />;


export const AccountIsLocked = Template.bind({});


AccountIsLocked.args = {
  reason: UnavailabitlityReason.Locked
};
