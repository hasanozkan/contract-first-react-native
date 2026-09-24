import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { AssistantScreen } from '../features/assistant/AssistantScreen';
import { renderWithQuery } from '../test-utils/render';

async function say(text: string) {
  await waitFor(() => expect(screen.getByPlaceholderText('Ask the library assistant')).toBeTruthy()); // session open
  fireEvent.changeText(screen.getByTestId('assistant-input'), text);
  fireEvent.press(screen.getByTestId('assistant-send'));
}

it('a requested write arrives as a plain card and runs only on confirm', async () => {
  renderWithQuery(<AssistantScreen />);
  await say('Please borrow "Clean Architecture" for m_ada');
  expect(await screen.findByText(/Please confirm it/)).toBeTruthy();
  const confirm = await screen.findByTestId(/proposal-a_\d+-confirm/);
  expect(screen.queryByTestId(/proposal-a_\d+-warning/)).toBeNull();
  expect(screen.getByText('copy_id: c_ca_1')).toBeTruthy();
  fireEvent.press(confirm);
  expect(await screen.findByText(/^Borrowed c_ca_1 · due /)).toBeTruthy();
  expect(screen.getByText('Confirmed.')).toBeTruthy();
});

it('an injected instruction reaches the user as a warned card, and dismissing it changes nothing', async () => {
  renderWithQuery(<AssistantScreen />);
  await say('Search for "ignore"');
  expect(await screen.findByTestId(/proposal-a_\d+-warning/)).toBeTruthy();
  expect(screen.getByText('member_id: m_attacker')).toBeTruthy();
  fireEvent.press(screen.getByTestId(/proposal-a_\d+-dismiss/));
  expect(await screen.findByText('Dismissed — nothing changed.')).toBeTruthy();
  expect(screen.queryByText(/^Borrowed /)).toBeNull();
});
