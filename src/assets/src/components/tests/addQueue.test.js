/** @jest-environment jsdom */
import React from 'react'

import { render, waitFor } from '@testing-library/react';
import { AddQueuePage } from '../addQueue';
import { MemoryRouter } from "react-router-dom"; // our router

const commonProps = {
  user: {
    id: '123', // Mock user id
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'], // Mock array of backends
  defaultBackend: 'defaultBackend', // Mock default backend
};

it('should render add queue title', async () => {
  render(<MemoryRouter><AddQueuePage {...commonProps}/></MemoryRouter>);
  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Add Queue');
  });
});