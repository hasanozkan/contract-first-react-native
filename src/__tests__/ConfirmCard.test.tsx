import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmCard } from '../ui/ConfirmCard';

it('a plain proposal has no warning; confirm and dismiss call through', () => {
  const onConfirm = jest.fn();
  const onDismiss = jest.fn();
  render(<ConfirmCard title="Borrow?" lines={['Copy c_1']} onConfirm={onConfirm} onDismiss={onDismiss} testID="card" />);
  expect(screen.queryByTestId('card-warning')).toBeNull();
  fireEvent.press(screen.getByTestId('card-confirm'));
  fireEvent.press(screen.getByTestId('card-dismiss'));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('a suspicious proposal shows every reason above the buttons', () => {
  render(
    <ConfirmCard
      title="Borrow?"
      lines={[]}
      warning={['the user did not ask for a change', 'proposed after tool output that contained instructions']}
      onConfirm={jest.fn()}
      onDismiss={jest.fn()}
      testID="card"
    />,
  );
  expect(screen.getByTestId('card-warning')).toBeTruthy();
  expect(screen.getByText(/did not ask for a change/)).toBeTruthy();
  expect(screen.getByText(/contained instructions/)).toBeTruthy();
});
