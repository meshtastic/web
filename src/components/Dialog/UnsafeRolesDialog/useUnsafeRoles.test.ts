import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnsafeRoles } from './useUnsafeRoles.ts';
import { useDevice } from '@core/stores/deviceStore.ts';
import useLocalStorage from '@core/hooks/useLocalStorage.ts';

vi.mock('@core/stores/deviceStore', () => ({
  useDevice: vi.fn()
}));

vi.mock('@core/hooks/useLocalStorage', () => {
  return {
    default: vi.fn()
  };
});

describe('useUnsafeRoles', () => {
  const setDialogOpenMock = vi.fn();
  const setAgreedToUnsafeRolesMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();

    (useDevice as any).mockReturnValue({
      setDialogOpen: setDialogOpenMock
    });

    (useLocalStorage as any).mockReturnValue([
      false,
      setAgreedToUnsafeRolesMock
    ]);
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useUnsafeRoles());

    expect(result.current.agreedToUnSafeRoles).toBe(false);
    expect(result.current.getConfirmState()).toBe(false);
  });

  it('should toggle confirm state correctly', () => {
    const { result } = renderHook(() => useUnsafeRoles());

    act(() => {
      result.current.toggleConfirmState();
    });

    expect(result.current.getConfirmState()).toBe(true);

    act(() => {
      result.current.toggleConfirmState();
    });

    expect(result.current.getConfirmState()).toBe(false);
  });

  it('should handle dialog close with dismiss state', () => {
    const { result } = renderHook(() => useUnsafeRoles());

    act(() => {
      result.current.handleCloseDialog('dismiss');
    });

    expect(setAgreedToUnsafeRolesMock).toHaveBeenCalledWith(false);
    expect(setDialogOpenMock).toHaveBeenCalledWith('unsafeRoles', false);
  });

  it('should handle dialog close with confirm state', () => {
    const { result } = renderHook(() => useUnsafeRoles());

    act(() => {
      result.current.handleCloseDialog('confirm');
    });

    expect(setAgreedToUnsafeRolesMock).toHaveBeenCalledWith(true);
    expect(setDialogOpenMock).toHaveBeenCalledWith('unsafeRoles', false);
  });

  it('should maintain state consistency across multiple operations', () => {
    const { result } = renderHook(() => useUnsafeRoles());

    act(() => {
      result.current.toggleConfirmState();
    });
    expect(result.current.getConfirmState()).toBe(true);

    act(() => {
      result.current.handleCloseDialog('confirm');
    });

    expect(result.current.getConfirmState()).toBe(false);
    expect(setAgreedToUnsafeRolesMock).toHaveBeenCalledWith(true);

    (useLocalStorage as any).mockReturnValue([
      true,
      setAgreedToUnsafeRolesMock
    ]);

    const { result: newResult } = renderHook(() => useUnsafeRoles());
    expect(newResult.current.agreedToUnSafeRoles).toBe(true);
  });
});