import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnsafeRolesDialog } from '@components/Dialog/UnsafeRolesDialog/UnsafeRolesDialog.tsx';
import { useUnsafeRoles } from '@components/Dialog/UnsafeRolesDialog/useUnsafeRoles.ts';

vi.mock('@components/Dialog/UnsafeRolesDialog/useUnsafeRoles', () => ({
  useUnsafeRoles: vi.fn()
}));

describe('UnsafeRolesDialog', () => {
  const getConfirmStateMock = vi.fn();
  const toggleConfirmStateMock = vi.fn();
  const handleCloseDialogMock = vi.fn();
  const onOpenChangeMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    getConfirmStateMock.mockReturnValue(false);

    (useUnsafeRoles as any).mockReturnValue({
      getConfirmState: getConfirmStateMock,
      toggleConfirmState: toggleConfirmStateMock,
      handleCloseDialog: handleCloseDialogMock
    });
  });

  it('should not render when open is false', () => {
    render(<UnsafeRolesDialog open={false} onOpenChange={onOpenChangeMock} />);

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(<UnsafeRolesDialog open={true} onOpenChange={onOpenChangeMock} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).length(2);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText('Yes, I know what I\'m doing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
  });

  it('should have disabled confirm button when checkbox is unchecked', () => {
    getConfirmStateMock.mockReturnValue(false);

    render(<UnsafeRolesDialog open={true} onOpenChange={onOpenChangeMock} />);

    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('should have enabled confirm button when checkbox is checked', () => {
    getConfirmStateMock.mockReturnValue(true);

    render(<UnsafeRolesDialog open={true} onOpenChange={onOpenChangeMock} />);

    expect(screen.getByRole('button', { name: /confirm/i })).not.toBeDisabled();
  });

  it('should call toggleConfirmState when checkbox is clicked', () => {
    render(<UnsafeRolesDialog open={true} onOpenChange={onOpenChangeMock} />);

    fireEvent.click(screen.getByRole('checkbox'));

    expect(toggleConfirmStateMock).toHaveBeenCalledTimes(1);
  });

  it('should call handleCloseDialog with "dismiss" when dismiss button is clicked', () => {
    render(<UnsafeRolesDialog open={true} onOpenChange={onOpenChangeMock} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(handleCloseDialogMock).toHaveBeenCalledWith('dismiss');
  });

  it('should call handleCloseDialog with "confirm" when confirm button is clicked', () => {
    getConfirmStateMock.mockReturnValue(true);

    render(<UnsafeRolesDialog open={true} onOpenChange={onOpenChangeMock} />);

    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(handleCloseDialogMock).toHaveBeenCalledWith("confirm");
  });
});