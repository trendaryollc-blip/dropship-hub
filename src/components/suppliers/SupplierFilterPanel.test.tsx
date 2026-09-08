import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("lucide-react", () => ({
  X: (p: any) => <div data-testid="icon-x" />,
  Shield: (p: any) => <div data-testid="icon-shield" />,
  MapPin: (p: any) => <div data-testid="icon-map" />,
  Star: (p: any) => <div data-testid="icon-star" />,
  Truck: (p: any) => <div data-testid="icon-truck" />,
  Tag: (p: any) => <div data-testid="icon-tag" />,
  DollarSign: (p: any) => <div data-testid="icon-dollar" />,
  Search: (p: any) => <div data-testid="icon-search" />,
  Package: (p: any) => <div data-testid="icon-package" />,
  Award: (p: any) => <div data-testid="icon-award" />,
}));
vi.mock("./supplier-shared", () => ({
  badgeConfig: {
    gold: { label: "Gold", color: "text-amber-400", border: "border-amber-400/20" },
    silver: { label: "Silver", color: "text-slate-300", border: "border-slate-300/20" },
    bronze: { label: "Bronze", color: "text-orange-400", border: "border-orange-400/20" },
  },
}));

import SupplierFilterPanel, { type SupplierFilters } from "./SupplierFilterPanel";

const defaultFilters: SupplierFilters = {
  badges: [], locations: [], minRating: 0, shippingSpeed: "",
  specializations: [], minPriceCompetitiveness: 0, certifications: [], search: "",
};

const defaultProps = {
  filters: defaultFilters,
  setFilters: vi.fn(),
  uniqueLocations: [
    { country: "China", flag: "\ud83c\udde8\ud83c\uddf3" },
    { country: "USA", flag: "\ud83c\uddfa\ud83c\uddf8" },
  ],
  allSpecializations: ["Electronics", "Clothing", "Home & Garden"],
  allCertifications: ["ISO9001", "CE"],
  resultCount: 100,
  filteredCount: 100,
};

describe("SupplierFilterPanel", () => {
  it("renders Filters heading", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("renders Trust Badge section", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Trust Badge")).toBeInTheDocument();
  });

  it("renders badge filter buttons", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.getByText("Silver")).toBeInTheDocument();
    expect(screen.getByText("Bronze")).toBeInTheDocument();
  });

  it("renders Location section with countries", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText(/\ud83c\udde8\ud83c\uddf3 China/)).toBeInTheDocument();
    expect(screen.getByText(/\ud83c\uddfa\ud83c\uddf8 USA/)).toBeInTheDocument();
  });

  it("calls setFilters when badge is toggled", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} />);
    screen.getByText("Gold").click();
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ badges: ["gold"] })
    );
  });

  it("calls setFilters when location is toggled", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} />);
    screen.getByText(/\ud83c\udde8\ud83c\uddf3 China/).click();
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ locations: ["China"] })
    );
  });

  it("shows Clear all when filters are active", () => {
    render(<SupplierFilterPanel {...defaultProps} filters={{ ...defaultFilters, badges: ["gold"] }} />);
    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("hides Clear all when no filters active", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
  });

  it("shows hidden count when filters are active", () => {
    render(<SupplierFilterPanel {...defaultProps} filters={{ ...defaultFilters, badges: ["gold"] }} filteredCount={80} />);
    expect(screen.getByText("20 hidden")).toBeInTheDocument();
  });

  it("renders Min Rating section", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Min Rating")).toBeInTheDocument();
  });

  it("renders Specialization section", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Specialization")).toBeInTheDocument();
  });

  it("calls setFilters when min rating is toggled", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("4.5+"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ minRating: 4.5 })
    );
  });

  it("toggles min rating off when clicked again", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, minRating: 4.5 }} />);
    fireEvent.click(screen.getByText("4.5+"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ minRating: 0 })
    );
  });

  it("renders Shipping Speed section", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Shipping Speed")).toBeInTheDocument();
  });

  it("calls setFilters when shipping speed is toggled", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("Express (4d)"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ shippingSpeed: "express" })
    );
  });

  it("toggles shipping speed off when clicked again", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, shippingSpeed: "express" }} />);
    fireEvent.click(screen.getByText("Express (4d)"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ shippingSpeed: "" })
    );
  });

  it("calls setFilters when specialization is toggled", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("Electronics"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ specializations: ["Electronics"] })
    );
  });

  it("calls clearAll when Clear all is clicked", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, badges: ["gold"] }} />);
    fireEvent.click(screen.getByText("Clear all"));
    expect(setFilters).toHaveBeenCalledWith({
      badges: [], locations: [], minRating: 0, shippingSpeed: "",
      specializations: [], minPriceCompetitiveness: 0, certifications: [], search: "",
    });
  });

  it("renders Price Competitiveness section", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Price Competitiveness")).toBeInTheDocument();
  });

  it("calls setFilters when price competitiveness is toggled", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("70%+"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ minPriceCompetitiveness: 70 })
    );
  });

  it("renders Certifications section when certifications exist", () => {
    render(<SupplierFilterPanel {...defaultProps} />);
    expect(screen.getByText("Certifications")).toBeInTheDocument();
  });

  it("calls setFilters when certification is toggled", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} />);
    fireEvent.click(screen.getByText("ISO9001"));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ certifications: ["ISO9001"] })
    );
  });

  it("renders Active filter chips when filters are active", () => {
    render(<SupplierFilterPanel {...defaultProps} filters={{ ...defaultFilters, badges: ["gold"], locations: ["China"] }} />);
    expect(screen.getByText("Active:")).toBeInTheDocument();
    expect(screen.getAllByText("Gold").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("China")).toBeInTheDocument();
  });

  it("removes badge filter when active chip is clicked", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, badges: ["gold"] }} />);
    const chips = screen.getAllByTestId("icon-x");
    fireEvent.click(chips[0]);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ badges: [] })
    );
  });

  it("removes location filter when active chip is clicked", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, locations: ["China"] }} />);
    const chips = screen.getAllByTestId("icon-x");
    fireEvent.click(chips[0]);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ locations: [] })
    );
  });

  it("removes specialization filter when active chip is clicked", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, specializations: ["Electronics"] }} />);
    const chips = screen.getAllByTestId("icon-x");
    fireEvent.click(chips[0]);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ specializations: [] })
    );
  });

  it("removes min rating filter when active chip is clicked", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, minRating: 4.5 }} />);
    expect(screen.getByText("4.5+ stars")).toBeInTheDocument();
    const chips = screen.getAllByTestId("icon-x");
    fireEvent.click(chips[0]);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ minRating: 0 })
    );
  });

  it("removes shipping speed filter when active chip is clicked", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, shippingSpeed: "express" }} />);
    expect(screen.getByText("express")).toBeInTheDocument();
    const chips = screen.getAllByTestId("icon-x");
    fireEvent.click(chips[0]);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ shippingSpeed: "" })
    );
  });

  it("removes price competitiveness filter when active chip is clicked", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, minPriceCompetitiveness: 70 }} />);
    expect(screen.getByText("70%+ price")).toBeInTheDocument();
    const chips = screen.getAllByTestId("icon-x");
    fireEvent.click(chips[0]);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ minPriceCompetitiveness: 0 })
    );
  });

  it("removes certification filter when active chip is clicked", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, certifications: ["ISO9001"] }} />);
    const chips = screen.getAllByTestId("icon-x");
    fireEvent.click(chips[0]);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ certifications: [] })
    );
  });

  it("toggles badge off when already selected", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, badges: ["gold"] }} />);
    const goldButtons = screen.getAllByText("Gold");
    const filterButton = goldButtons.find((el) => !el.closest('[class*="rounded-full"]')) || goldButtons[0];
    fireEvent.click(filterButton);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ badges: [] })
    );
  });

  it("toggles location off when already selected", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, locations: ["China"] }} />);
    fireEvent.click(screen.getByText(/\ud83c\udde8\ud83c\uddf3 China/));
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ locations: [] })
    );
  });

  it("toggles certification off when already selected", () => {
    const setFilters = vi.fn();
    render(<SupplierFilterPanel {...defaultProps} setFilters={setFilters} filters={{ ...defaultFilters, certifications: ["ISO9001"] }} />);
    const isoButtons = screen.getAllByText("ISO9001");
    const filterButton = isoButtons.find((el) => !el.closest('[class*="rounded-full"]')) || isoButtons[0];
    fireEvent.click(filterButton);
    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({ certifications: [] })
    );
  });

  it("shows location count when locations are selected", () => {
    render(<SupplierFilterPanel {...defaultProps} filters={{ ...defaultFilters, locations: ["China", "USA"] }} />);
    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("shows specialization count when specializations are selected", () => {
    render(<SupplierFilterPanel {...defaultProps} filters={{ ...defaultFilters, specializations: ["Electronics", "Clothing"] }} />);
    const counts = screen.getAllByText("(2)");
    expect(counts.length).toBeGreaterThanOrEqual(1);
  });
});
