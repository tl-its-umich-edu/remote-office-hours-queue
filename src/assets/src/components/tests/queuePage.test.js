/** @jest-environment jsdom */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { QueuePage } from '../queue';

const commonProps = {
  user: {
    id: '123',
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'],
  defaultBackend: 'defaultBackend',
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