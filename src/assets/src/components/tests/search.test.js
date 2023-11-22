/** @jest-environment jsdom */
import React from 'react'

import { render, waitFor } from '@testing-library/react';
import { SearchPage } from '../search';
import { MemoryRouter } from "react-router-dom";

const commonProps = {
  user: {
    id: '123', // Mock user id
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'], // Mock array of backends
  defaultBackend: 'defaultBackend', // Mock default backend
};

it('should render search page title', async () => {
  render(<MemoryRouter><SearchPage {...commonProps}/></MemoryRouter>);
  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Search');
  });
});