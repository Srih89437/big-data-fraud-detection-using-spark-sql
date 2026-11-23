// Regression tests for the frontend data client used during package upgrades.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearApiCache, fetchYears } from './api';

describe('fetchYears', () => {
  beforeEach(() => {
    clearApiCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('caches a successful response for repeated requests', async () => {
    const responseData = { years: [2020, 2021, 2022, 2023, 2024] };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(responseData),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchYears()).resolves.toEqual(responseData);
    await expect(fetchYears()).resolves.toEqual(responseData);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports API errors and permits a retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: vi.fn().mockResolvedValue({ detail: 'Service unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ years: [2020, 2021, 2022, 2023, 2024] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchYears()).rejects.toThrow('Service unavailable');
    await expect(fetchYears()).resolves.toEqual({ years: [2020, 2021, 2022, 2023, 2024] });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
