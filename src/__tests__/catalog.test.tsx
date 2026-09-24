import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CatalogScreen } from '../features/catalog/CatalogScreen';
import { renderWithQuery } from '../test-utils/render';

it('search → open copies → borrow through the confirmation card → availability follows', async () => {
  renderWithQuery(<CatalogScreen />);
  fireEvent.changeText(screen.getByTestId('search-input'), 'domain');
  fireEvent(screen.getByTestId('search-input'), 'submitEditing');
  expect(await screen.findByText('2 of 2 available')).toBeTruthy();

  fireEvent.press(screen.getByTestId('book-9780321125217'));
  fireEvent.press(await screen.findByTestId('borrow-c_ddd_1'));
  expect(screen.getByText('Borrow “Domain-Driven Design”?')).toBeTruthy();
  fireEvent.press(screen.getByTestId('borrow-card-confirm'));

  expect(await screen.findByTestId('loan-receipt')).toHaveTextContent('Borrowed · due 2026-03-16');
  await waitFor(() => expect(screen.getByTestId('availability-9780321125217')).toHaveTextContent('1 of 2 available'));
  expect(screen.queryByTestId('borrow-c_ddd_1')).toBeNull(); // now on loan
});

it('dismissing the card borrows nothing', async () => {
  renderWithQuery(<CatalogScreen />);
  fireEvent.changeText(screen.getByTestId('search-input'), 'clean');
  fireEvent(screen.getByTestId('search-input'), 'submitEditing');
  fireEvent.press(await screen.findByTestId('book-9780134494166'));
  fireEvent.press(await screen.findByTestId('borrow-c_ca_1'));
  fireEvent.press(screen.getByTestId('borrow-card-dismiss'));
  expect(screen.queryByTestId('borrow-card')).toBeNull();
  expect(screen.getByTestId('availability-9780134494166')).toHaveTextContent('1 of 1 available');
});
