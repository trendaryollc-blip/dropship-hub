import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountTab from "./AccountTab";

const defaultProps = {
  user: { email: "test@example.com" },
  newPassword: "",
  confirmPassword: "",
  updatingPassword: false,
  onNewPasswordChange: vi.fn(),
  onConfirmPasswordChange: vi.fn(),
  onChangePassword: vi.fn(),
  onDeleteConfirm: vi.fn(),
};

describe("AccountTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows user email", () => {
    render(<AccountTab {...defaultProps} />);
    expect(screen.getByText("test@example.com")).toBeDefined();
  });

  it("shows 'Not signed in' when no user", () => {
    render(<AccountTab {...defaultProps} user={null} />);
    expect(screen.getByText("Not signed in")).toBeDefined();
  });

  it("renders password input fields", () => {
    render(<AccountTab {...defaultProps} />);
    const newPasswordInput = screen.getByPlaceholderText("New password");
    const confirmPasswordInput = screen.getByPlaceholderText("Confirm new password");
    expect(newPasswordInput).toBeDefined();
    expect(confirmPasswordInput).toBeDefined();
    expect(newPasswordInput.getAttribute("type")).toBe("password");
    expect(confirmPasswordInput.getAttribute("type")).toBe("password");
  });

  it("calls onNewPasswordChange when typing in new password", () => {
    render(<AccountTab {...defaultProps} />);
    const input = screen.getByPlaceholderText("New password");
    fireEvent.change(input, { target: { value: "newpass123" } });
    expect(defaultProps.onNewPasswordChange).toHaveBeenCalledWith("newpass123");
  });

  it("calls onConfirmPasswordChange when typing in confirm password", () => {
    render(<AccountTab {...defaultProps} />);
    const input = screen.getByPlaceholderText("Confirm new password");
    fireEvent.change(input, { target: { value: "confirmpass" } });
    expect(defaultProps.onConfirmPasswordChange).toHaveBeenCalledWith("confirmpass");
  });

  it("update password button calls onChangePassword", () => {
    render(<AccountTab {...defaultProps} newPassword="pass123" />);
    const updateBtn = screen.getByText("Update Password");
    fireEvent.click(updateBtn);
    expect(defaultProps.onChangePassword).toHaveBeenCalled();
  });

  it("update password button is disabled when no password", () => {
    render(<AccountTab {...defaultProps} newPassword="" />);
    const updateBtn = screen.getByText("Update Password");
    expect(updateBtn.closest("button")?.disabled).toBe(true);
  });

  it("delete account button triggers onDeleteConfirm", () => {
    render(<AccountTab {...defaultProps} />);
    const deleteBtn = screen.getByText("Delete Account");
    fireEvent.click(deleteBtn);
    expect(defaultProps.onDeleteConfirm).toHaveBeenCalled();
  });

  it("shows danger zone section", () => {
    render(<AccountTab {...defaultProps} />);
    expect(screen.getByText("Danger Zone")).toBeDefined();
    expect(screen.getByText("Permanently delete your account and all associated data.")).toBeDefined();
  });

  it("shows loading spinner when updating password", () => {
    render(<AccountTab {...defaultProps} newPassword="pass" updatingPassword={true} />);
    const updateBtn = screen.getByText("Update Password");
    expect(updateBtn.closest("button")?.disabled).toBe(true);
  });

  it("shows account management header", () => {
    render(<AccountTab {...defaultProps} />);
    expect(screen.getByText("Account Management")).toBeDefined();
  });
});
