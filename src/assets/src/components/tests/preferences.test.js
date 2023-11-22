/** @jest-environment jsdom */
import React from 'react'

import { render, waitFor } from '@testing-library/react';
import { PreferencesPage } from '../preferences';
import { MemoryRouter } from "react-router-dom"; // our router
jest.mock('react-phone-input-2/lib/bootstrap.css', () => '')
const commonProps = {
  user: {
    id: '123', // Mock user id
    // other necessary user properties...
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'], // Mock array of backends
  defaultBackend: 'defaultBackend', // Mock default backend
};

it('should render prefernces title', async () => {
  render(<MemoryRouter><PreferencesPage {...commonProps}/></MemoryRouter>);
  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Preferences');
  });
});