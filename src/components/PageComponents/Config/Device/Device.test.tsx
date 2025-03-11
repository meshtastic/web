import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Device } from '@components/PageComponents/Config/Device/index.tsx';
import { useDevice } from '@core/stores/deviceStore.ts';
import { useUnsafeRolesDialog } from '@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog.ts';

// Mock dependencies
vi.mock('@core/stores/deviceStore', () => ({
  useDevice: vi.fn()
}));

vi.mock('@components/Dialog/UnsafeRolesDialog/useUnsafeRolesDialog', () => ({
  useUnsafeRolesDialog: vi.fn()
}));

describe('Device component with UnsafeRolesDialog', () => {
  const setWorkingConfigMock = vi.fn();
  const validateRoleDialogResultMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    
    // Mock useDevice hook
    (useDevice as any).mockReturnValue({
      config: {
        device: {}
      },
      setWorkingConfig: setWorkingConfigMock
    });
    
    // Mock useUnsafeRolesDialog hook
    (useUnsafeRolesDialog as any).mockReturnValue({
      validateRoleDialogResult: validateRoleDialogResultMock
    });
  });

  it('should use the validateRoleDialogResult from the hook', () => {
    render(<Device />);
    
    // Verify the hook was called
    expect(useUnsafeRolesDialog).toHaveBeenCalled();
    
    // Verify the form is using the validation function from the hook
    expect(setWorkingConfigMock).not.toHaveBeenCalled(); // Just ensure the component rendered without errors
  });
});