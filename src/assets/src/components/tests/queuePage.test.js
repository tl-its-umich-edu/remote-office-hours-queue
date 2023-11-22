/** @jest-environment jsdom */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // Assuming you're using React Router v6 or higher

import { QueuePage } from '../queue';

const commonProps = {
  user: {
    id: '123', // Mock user id
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'], // Mock array of backends
  defaultBackend: 'defaultBackend', // Mock default backend
};

it('should render queue page title', async () => {

  render(
    <MemoryRouter initialEntries={['/queues/123']}>
      <Routes>
        <Route path="/queues/:queue_id" element={<QueuePage {...commonProps} />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Queue');
  });


});