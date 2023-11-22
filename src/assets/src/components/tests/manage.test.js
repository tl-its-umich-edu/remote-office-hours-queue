/** @jest-environment jsdom */
import React from 'react'
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from '@testing-library/react';
import { ManagePage } from '../manage';
const commonProps = {
    user: {
      id: '123',
    },
    loginUrl: 'mockedLoginUrl',
    backends: ['backend1', 'backend2'],
    defaultBackend: 'defaultBackend',
  };
  
  

it('should render manage page title', async () => {
  render(<MemoryRouter><ManagePage {...commonProps}/></MemoryRouter>);
  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Manage');
  });
});