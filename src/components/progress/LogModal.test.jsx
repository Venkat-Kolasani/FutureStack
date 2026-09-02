import { fireEvent, render, screen } from '@testing-library/react';
import LogModal from './LogModal';

const track = {
  id: 'track-1',
  name: 'DSA',
  templateType: 'leetcode',
};

describe('LogModal', () => {
  it('shows template fields for a DSA track and saves base plus metadata', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(
      <LogModal
        isOpen
        onClose={jest.fn()}
        track={track}
        date="2026-08-21"
        onSave={onSave}
      />
    );

    expect(screen.getByText('What did you do?')).toBeInTheDocument();
    expect(screen.getByText('Problems solved')).toBeInTheDocument();
    expect(screen.getByText('How did it feel?')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('3 graph problems, including a timed medium'), {
      target: { value: 'Two graph problems' },
    });
    fireEvent.change(screen.getByPlaceholderText('3'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Moderate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save log' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      trackId: 'track-1',
      logDate: '2026-08-21',
      didLog: true,
      whatDidYouDo: 'Two graph problems',
      mood: 'moderate',
      metadata: expect.objectContaining({ problems: '2' }),
    }));
  });

  it('skips detail validation on an off day', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(
      <LogModal
        isOpen
        onClose={jest.fn()}
        track={track}
        date="2026-08-21"
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Off day' }));
    expect(screen.queryByText('What did you do?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save log' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      didLog: false,
      whatDidYouDo: '',
      metadata: {},
      mood: null,
    }));
  });
});
