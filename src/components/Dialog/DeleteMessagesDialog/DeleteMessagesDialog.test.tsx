import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessageStore } from "@core/stores/messageStore.ts";
import { DeleteMessagesDialog } from "@components/Dialog/DeleteMessagesDialog/DeleteMessagesDialog.tsx";

vi.mock('@core/stores/messageStore.ts', () => ({
  useMessageStore: vi.fn(() => ({
    deleteAllMessages: vi.fn(),
  })),
}));

describe('DeleteMessagesDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockClearAllMessages = vi.fn();

  beforeEach(() => {
    vi.mocked(useMessageStore).mockReturnValue({ deleteAllMessages: mockClearAllMessages });
    mockOnOpenChange.mockClear();
    mockClearAllMessages.mockClear();
  });

  it('renders the dialog when open is true', () => {
    render(<DeleteMessagesDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('Clear All Messages')).toBeVisible();
    expect(screen.getByText(/This action will clear all message history./)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Clear Messages' })).toBeVisible();
  });

  it('does not render the dialog when open is false', () => {
    render(<DeleteMessagesDialog open={false} onOpenChange={mockOnOpenChange} />);
    expect(screen.queryByText('Clear All Messages')).toBeNull();
  });

  it('calls onOpenChange with false when the close button is clicked', () => {
    render(<DeleteMessagesDialog open={true} onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onOpenChange with false when the dismiss button is clicked', () => {
    render(<DeleteMessagesDialog open={true} onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls deleteAllMessages and onOpenChange with false when the clear messages button is clicked', () => {
    render(<DeleteMessagesDialog open={true} onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear Messages' }));
    expect(mockClearAllMessages).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});