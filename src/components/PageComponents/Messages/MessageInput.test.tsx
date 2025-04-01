import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MessageInput } from './MessageInput.tsx';
import { useDevice } from '@core/stores/deviceStore.ts';
import { useMessageStore } from '@core/stores/messageStore.ts';
import { debounce } from '@core/utils/debounce.ts';
import { Types } from "@meshtastic/core";

vi.mock('@components/UI/Button.tsx', () => ({
  Button: vi.fn(({ type, className, children, onClick, onSubmit }) => (
    <button type={type} className={className} onClick={onClick} onSubmit={onSubmit}>
      {children}
    </button>
  )),
}));

vi.mock('@components/UI/Input.tsx', () => ({
  Input: vi.fn(({ autoFocus, minLength, name, placeholder, value, onChange }) => (
    <input
      autoFocus={autoFocus}
      minLength={minLength}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  )),
}));

vi.mock('@core/stores/deviceStore.ts', () => ({
  useDevice: vi.fn(),
}));

vi.mock('@core/stores/messageStore.ts', () => ({
  useMessageStore: vi.fn(),
  MessageState: {
    Ack: 'ack',
    Waiting: 'waiting',
    Failed: 'failed',
  },
  MessageType: {
    Direct: 'direct',
    Broadcast: 'broadcast',
  },
}));

vi.mock('@core/utils/debounce.ts', () => ({
  debounce: vi.fn((fn) => fn),
}));

vi.mock('lucide-react', () => ({
  SendIcon: vi.fn(() => <svg data-testid="send-icon" />),
}));

describe('MessageInput', () => {
  const mockSetMessageState = vi.fn();
  const mockSetActiveChat = vi.fn();
  const mockSetDraft = vi.fn();
  const mockGetDraft = vi.fn();
  const mockClearDraft = vi.fn();
  const mockSendText = vi.fn();

  beforeEach(() => {
    (useDevice as ReturnType<typeof vi.fn>).mockReturnValue({
      connection: {
        sendText: mockSendText,
      },
    });

    (useMessageStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      setMessageState: mockSetMessageState,
      activeChat: 123,
      setDraft: mockSetDraft,
      getDraft: mockGetDraft,
      clearDraft: mockClearDraft,
    });

    mockSetMessageState.mockClear();
    mockSetActiveChat.mockClear();
    mockSetDraft.mockClear();
    mockGetDraft.mockClear();
    mockClearDraft.mockClear();
    mockSendText.mockClear();
    (debounce as ReturnType<typeof vi.fn>).mockImplementation((fn) => fn);
  });

  const renderComponent = (props: { to: Types.Destination; channel: Types.ChannelNumber; maxBytes: number }) => {
    render(<MessageInput {...props} />);
  };

  it.skip('sends text message and updates state to Ack on submit', async () => {
    renderComponent({ to: 2, channel: 3, maxBytes: 256 });
    const inputElement = screen.getByPlaceholderText('Enter Message') as HTMLInputElement;
    fireEvent.change(inputElement, { target: { value: 'Hello' } });
    const formElement = screen.getByRole('form');
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(mockSendText).toHaveBeenCalledWith('Hello', 2, true, 3);
      expect(mockSetMessageState).toHaveBeenCalledWith({
        type: 'direct',
        key: 123,
        messageId: undefined,
        newState: 'ack',
      });
      expect(mockClearDraft).toHaveBeenCalledWith(2);
      expect(inputElement.value).toBe('');
      expect(screen.getByTestId('byte-counter')).toHaveTextContent('0/256');
    });
  });

  it.skip('sends broadcast message if to is "broadcast" and updates state to Ack', async () => {
    renderComponent({ to: 'broadcast', channel: 5, maxBytes: 256 });
    const inputElement = screen.getByPlaceholderText('Enter Message') as HTMLInputElement;
    fireEvent.change(inputElement, { target: { value: 'Broadcast message' } });
    const formElement = screen.getByRole('form');
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(mockSendText).toHaveBeenCalledWith('Broadcast message', 'broadcast', true, 5);
      expect(mockSetMessageState).toHaveBeenCalledWith({
        type: 'broadcast',
        key: 123,
        messageId: undefined,
        newState: 'ack',
      });
      expect(mockClearDraft).toHaveBeenCalledWith('broadcast');
      expect(inputElement.value).toBe('');
      expect(screen.getByTestId('byte-counter')).toHaveTextContent('0/256');
    });
  });

  it('updates state to Failed if sendText throws an error', async () => {
    mockSendText.mockRejectedValue({ id: 456 });
    renderComponent({ to: 3, channel: 1, maxBytes: 256 });
    const inputElement = screen.getByPlaceholderText('Enter Message') as HTMLInputElement;
    fireEvent.change(inputElement, { target: { value: 'Error message' } });
    const formElement = screen.getByRole('form');
    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(mockSendText).toHaveBeenCalledWith('Error message', 3, true, 1);
      expect(mockSetMessageState).toHaveBeenCalledWith({
        type: 'direct',
        key: 123,
        messageId: 456,
        newState: 'failed',
      });
      expect(mockClearDraft).toHaveBeenCalledWith(3);
      expect(inputElement.value).toBe('');
      expect(screen.getByTestId('byte-counter')).toHaveTextContent('0/256');
    });
  });
});