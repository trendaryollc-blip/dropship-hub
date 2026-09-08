import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthProvider";

vi.mock("@/lib/firebase", () => ({
  auth: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

const mockOnAuthStateChanged = vi.fn();
const mockOnIdTokenChanged = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithPopup = vi.fn();
const mockFirebaseSignOut = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (...args: any[]) => mockOnAuthStateChanged(...args),
  onIdTokenChanged: (...args: any[]) => mockOnIdTokenChanged(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUserWithEmailAndPassword(...args),
  signInWithPopup: (...args: any[]) => mockSignInWithPopup(...args),
  signOut: (...args: any[]) => mockFirebaseSignOut(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  GoogleAuthProvider: vi.fn(),
}));

function TestConsumer() {
  const { user, loading, signInWithEmail, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "loading" : "loaded"}</span>
      <span data-testid="user">{user ? user.email : "no user"}</span>
      <button onClick={() => signInWithEmail("test@test.com", "pass")}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

function NoProviderConsumer() {
  let content;
  try {
    useAuth();
    content = "No error";
  } catch (e: any) {
    content = e.message;
  }
  return <div>{content}</div>;
}


describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChanged.mockReturnValue(vi.fn());
    mockOnIdTokenChanged.mockReturnValue(vi.fn());
  });

  it("provides auth context", () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId("loading")).toBeDefined();
    expect(screen.getByTestId("user")).toBeDefined();
  });

  it("signInWithEmail calls firebase", async () => {
    mockSignInWithEmailAndPassword.mockResolvedValue(undefined);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    screen.getByText("Sign In").click();
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalled();
  });

  it("signOut calls firebase", async () => {
    mockFirebaseSignOut.mockResolvedValue(undefined);
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    screen.getByText("Sign Out").click();
    expect(mockFirebaseSignOut).toHaveBeenCalled();
  });

  it("throws when useAuth outside provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<NoProviderConsumer />);
    expect(screen.getByText("useAuth must be used within AuthProvider")).toBeDefined();
    spy.mockRestore();
  });
});
