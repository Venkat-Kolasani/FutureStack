import { fireEvent, render, screen } from '@testing-library/react';
import CreateTrackModal from './CreateTrackModal';

describe('CreateTrackModal', () => {
  it('lets a student pick a template and create a named track', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    render(<CreateTrackModal isOpen onClose={jest.fn()} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: /System design/i }));
    fireEvent.change(screen.getByPlaceholderText('DSA'), {
      target: { value: 'High-level design' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create track' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'High-level design',
      templateType: 'system_design',
    });
  });
});
