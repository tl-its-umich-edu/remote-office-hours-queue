/** @jest-environment jsdom */
import React from 'react'

import { render, waitFor } from '@testing-library/react';
import { PreferencesPage } from '../preferences';
import { MemoryRouter } from "react-router-dom";
jest.mock('react-phone-input-2/lib/bootstrap.css', () => '')
const commonProps = {
  user: {
    id: '123',
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'],
  defaultBackend: 'defaultBackend',
};

it('should render prefernces title', async () => {
  render(<MemoryRouter><PreferencesPage {...commonProps}/></MemoryRouter>);
  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Preferences');
  });
});