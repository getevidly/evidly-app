import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/** Wrap component with MemoryRouter for testing. */
export function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
}
