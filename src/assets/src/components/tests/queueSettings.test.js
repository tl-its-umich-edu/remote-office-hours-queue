/** @jest-environment jsdom */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { ManageQueueSettingsPage } from '../queueSettings';


const commonProps = {
  user: {
    id: '123',
  },
  loginUrl: 'mockedLoginUrl',
  backends: ['backend1', 'backend2'],
  defaultBackend: 'defaultBackend',
};

it('should render queue settings page title', async () => {

  render(
    <MemoryRouter initialEntries={['/manage/123/settings']}>
      <Routes>
        <Route path="/manage/:queue_id/settings" element={<ManageQueueSettingsPage {...commonProps} />} />
      </Routes>
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Manage Queue Settings');
  });


});