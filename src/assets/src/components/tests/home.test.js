/** @jest-environment jsdom */
import React from 'react'

import { render, waitFor } from '@testing-library/react';
import { HomePage } from '../home';

it('should render home page title', async () => {
  render(<HomePage />)
  await waitFor(() => {
    expect(document.title).toEqual('Remote Office Hours Queue - Office Hours');
  });
});