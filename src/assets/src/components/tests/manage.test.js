/** @jest-environment jsdom */
import React from 'react'
import { MemoryRouter } from "react-router-dom"; // our router
import { render, waitFor } from '@testing-library/react';
import { ManagePage } from '../manage';
const commonProps = {
    user: {
      id: '123', // Mock user id
      // other necessary user properties...
    },
    loginUrl: 'mockedLoginUrl',
    backends: ['backend1', 'backend2'], // Mock array of backends
    defaultBackend: 'defaultBackend', // Mock default backend
  };
  
  

it('should render manage page title', async () => {
  render(<MemoryRouter><ManagePage {...commonProps}/></MemoryRouter>);
  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Manage');
  });
});