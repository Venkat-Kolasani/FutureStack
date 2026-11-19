import { render, screen } from '@testing-library/react';
import axios from 'axios';
import InternshipList from './InternshipList';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    })),
  },
}));

describe('InternshipList', () => {
  const apiClient = axios.create.mock.results[0].value;

  beforeEach(() => {
    apiClient.get.mockReset();
  });

  it.each([
    [20, [{ limit: 100, category: 'internship' }]],
    [120, [{ limit: 100, category: 'internship' }, { limit: 100, category: 'internship', cursor: '100' }]],
  ])('loads %i internships without paging through hackathons', async (internshipCount, expectedPages) => {
    const makeRows = (category, count) => Array.from({ length: count }, (_, index) => ({
      id: `${category}-${index + 1}`,
      title: `${category} ${index + 1}`,
      category,
      status: 'applied',
    }));
    const rows = [...makeRows('hackathon', 250), ...makeRows('internship', internshipCount)];
    apiClient.get.mockImplementation(async (_path, { params: { category, cursor, limit } }) => {
      const matching = category ? rows.filter((row) => row.category === category) : rows;
      const offset = Number(cursor ?? 0);
      const end = offset + limit;
      return {
        data: {
          items: matching.slice(offset, end),
          nextCursor: end < matching.length ? String(end) : null,
        },
      };
    });

    render(<InternshipList />);

    expect(await screen.findByText(`Showing ${internshipCount} of ${internshipCount} internships`)).toBeInTheDocument();
    expect(screen.getByText(`internship ${internshipCount}`)).toBeInTheDocument();
    expect(apiClient.get.mock.calls).toEqual(expectedPages.map((params) => ['/opportunities', { params }]));
  });
});
