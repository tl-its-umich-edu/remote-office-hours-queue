/** @jest-environment jsdom */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // Assuming you're using React Router v6 or higher

import { QueueManagerPage } from '../queueManager';

const commonProps = {
  user: {
    id: '123', // Mock user id
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'], // Mock array of backends
  defaultBackend: 'defaultBackend', // Mock default backend
};

it('should render queue manager page title', async () => {
  render(
    <MemoryRouter initialEntries={['/manage/123']}>
      <Routes>
        <Route path="/manage/:queue_id" element={<QueueManagerPage {...commonProps} />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Manage Queue');
  });
});
