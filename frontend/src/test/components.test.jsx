import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import RiskRadialGauge from '../components/charts/RiskRadialGauge';
import OrderTimelineStepper from '../components/charts/OrderTimelineStepper';
import { DollarSign } from 'lucide-react';

describe('UI & Chart Components Unit Test Suite', () => {
  it('renders StatCard with exact numbers and icons', () => {
    render(
      <StatCard
        title="30-Day Gross Revenue"
        value="$1,420,500"
        trend={12.5}
        trendLabel="vs last month"
        icon={DollarSign}
        color="emerald"
      />
    );

    expect(screen.getByText('30-Day Gross Revenue')).toBeInTheDocument();
    expect(screen.getByText('$1,420,500')).toBeInTheDocument();
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
  });

  it('renders EmptyState with custom title and message', () => {
    render(
      <EmptyState
        title="No Inventory Records"
        description="No active items found matching the selected filter."
      />
    );

    expect(screen.getByText('No Inventory Records')).toBeInTheDocument();
    expect(screen.getByText('No active items found matching the selected filter.')).toBeInTheDocument();
  });

  it('renders RiskRadialGauge with Critical risk and correct color label', () => {
    render(
      <RiskRadialGauge
        riskLevel="Critical"
        daysRemaining={3.5}
        title="Stockout Risk Gauge"
      />
    );

    expect(screen.getByText('Stockout Risk Gauge')).toBeInTheDocument();
    expect(screen.getByText('Critical Risk')).toBeInTheDocument();
    expect(screen.getByText(/3.5 days/)).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('renders RiskRadialGauge with Healthy/Low risk state', () => {
    render(
      <RiskRadialGauge
        riskLevel="Low"
        daysRemaining={28.0}
        title="Stockout Risk Gauge"
      />
    );

    expect(screen.getByText('Healthy Stock')).toBeInTheDocument();
    expect(screen.getByText(/28 days/)).toBeInTheDocument();
    expect(screen.getByText('18%')).toBeInTheDocument();
  });

  it('renders OrderTimelineStepper with correct status and carrier info', () => {
    const mockOrder = {
      order_id: 'ORD-7001',
      status: 'In-Transit',
      carrier: 'FedEx Priority Express',
      tracking_number: 'FX-70018921',
      timeline: [
        { status: 'Manufactured', timestamp: '2026-09-25T10:00:00Z' },
        { status: 'Dispatched', timestamp: '2026-09-26T14:30:00Z' },
        { status: 'In-Transit', timestamp: '2026-09-27T08:15:00Z' },
      ],
    };

    render(<OrderTimelineStepper order={mockOrder} />);

    expect(screen.getByText(/Order ORD-7001/)).toBeInTheDocument();
    expect(screen.getByText(/Tracking: FX-70018921/)).toBeInTheDocument();
    expect(screen.getAllByText('In-Transit').length).toBeGreaterThan(0);
  });
});
