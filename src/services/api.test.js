jest.mock('axios', () => {
  const client = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => client),
    },
  };
});

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
  },
}));

jest.mock('../lib/analytics', () => ({
  analytics: {
    opportunityCreated: jest.fn(),
    opportunityUpdated: jest.fn(),
    opportunityDeleted: jest.fn(),
  },
}));

import axios from 'axios';
import { opportunityService, progressService } from './api';

describe('opportunityService.getAll', () => {
  const apiClient = axios.create.mock.results[0].value;

  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it('follows cursors so callers receive every opportunity', async () => {
    apiClient.get
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 'first' }, { id: 'second' }],
          nextCursor: 'next-page',
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 'third' }],
          nextCursor: null,
        },
      });

    await expect(opportunityService.getAll()).resolves.toEqual([
      { id: 'first' },
      { id: 'second' },
      { id: 'third' },
    ]);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/opportunities', {
      params: { limit: 100 },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/opportunities', {
      params: { limit: 100, cursor: 'next-page' },
    });
  });
});

describe('progressService', () => {
  const apiClient = axios.create.mock.results[0].value;

  beforeEach(() => {
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('loads the heatmap with the local end date', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [{ date: '2026-08-24', count: 1, tracks: ['DSA'] }],
    });

    await expect(progressService.getHeatmap('2026-08-24')).resolves.toEqual([
      { date: '2026-08-24', count: 1, tracks: ['DSA'] },
    ]);
    expect(apiClient.get).toHaveBeenCalledWith('/progress/heatmap', {
      params: { end: '2026-08-24' },
    });
  });

  it('saves a log through POST /progress/logs', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { id: 'log-1', didLog: true },
    });

    await expect(progressService.saveLog({
      trackId: 'track-1',
      logDate: '2026-08-21',
      didLog: true,
      whatDidYouDo: 'Graphs',
    })).resolves.toEqual({ id: 'log-1', didLog: true });

    expect(apiClient.post).toHaveBeenCalledWith('/progress/logs', {
      trackId: 'track-1',
      logDate: '2026-08-21',
      didLog: true,
      whatDidYouDo: 'Graphs',
    });
  });
});
