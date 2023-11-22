/** @jest-environment jsdom */
import React from 'react'

import { render, waitFor } from '@testing-library/react';
import { AddQueuePage } from '../addQueue';
import { MemoryRouter } from "react-router-dom";

const commonProps = {
  user: {
    id: '123',
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'],
  defaultBackend: 'defaultBackend',
};

it('should render add queue title', async () => {
  render(<MemoryRouter><AddQueuePage {...commonProps}/></MemoryRouter>);
  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Add Queue');
  });
});