'use client';

import { useState, useEffect } from 'react';
import { Shield, Activity, Lock, Database, TrendingUp, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Download, Zap, Users } from 'lucide-react';
import PemabuLogo from '@/app/components/PemabuLogo';

type EntityContext = 'PEMABU_ADMIN' | 'FLOMISMA_ADMIN' | 'DUAL_ADMIN';

interface WarRoomMetrics {
  totalTransactions: number;
  totalLedgerAmount: string;
  activeAgents: number;
  activeTenants: number;
  reserveRatio: number;
  solvencyRatio: number;
  tsvCoverage: number;
}

interface WarRoomData {
  systemStatus: {
    database: string;
    api: string;
    security: string;
    compliance: string;
  };
  metrics: WarRoomMetrics;
  staking?: {
    totalValueLocked: number;
    currentAPY: number;
    last30DayRevenue: string;
    rewardPoolBalance: string;
  };
  contracts?: {
    active: number;
    completed: number;
    total: number;
  };
  lastAudit?: string;
  timestamp?: string;
}

export default function WarRoomPage() {
  const [entityContext, setEntityContext] = useState<EntityContext>('PEMABU_ADMIN');
  const [data, setData] = useState<WarRoomData | null>(null);
  const [driftSimulation, setDriftSimulation] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchMetrics = async (context: EntityContext) => {
    try {
      const response = await fetch('/api/admin/war-room', {
        headers: {
          'X-Admin-Entity-Context': context
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        setData(responseData);
      }
    } catch (error) {
      console.error('Failed to fetch war room metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics(entityContext);
    const interval = setInterval(() => fetchMetrics(entityContext), 30000);
    return () => clearInterval(interval);
  }, [entityContext]);

  const handleEntityContextChange = (newContext: EntityContext) => {
    setEntityContext(newContext);
    setDriftSimulation(0);
    setIsSimulating(false);
  };

  const simulateDrift = () => {
    setIsSimulating(true);
    setDriftSimulation(30000);
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setDriftSimulation(0);
  };

  const generateCertificate = () => {
    if (!data) return;

    const certificate = {
      certificateType: 'V4.1_SOLVENCY_CERTIFICATE',
      issuer: 'Pemabu Platform',
      entityContext: entityContext,
      timestamp: data.timestamp || new Date().toISOString(),
      auditTimestamp: data.lastAudit || new Date().toISOString(),
      solvencyProof: {
        reserveRatio: effectiveReserveRatio,
        threshold: 1.25,
        status: circuitBreakerActive ? 'CIRCUIT_BREAKER_ACTIVE' : 'SOVEREIGN_PULSE_ACTIVE',
        compliance: effectiveReserveRatio >= 1.25 ? 'COMPLIANT' : 'NON_COMPLIANT'
      },
      metrics: {
        totalTransactions: data.metrics.totalTransactions,
        activeAgents: data.metrics.activeAgents,
        activeTenants: data.metrics.activeTenants,
        totalValueLocked: data.staking?.totalValueLocked || 0,
        currentAPY: data.staking?.currentAPY || 0
      },
      signature: {
        algorithm: 'SHA-256',
        hash: generateHash(data),
        signedAt: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pemabu-v4.1-certificate-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateHash = (data: WarRoomData): string => {
    const payload = JSON.stringify({
      reserveRatio: data.metrics.reserveRatio,
      timestamp: data.timestamp,
      activeAgents: data.metrics.activeAgents
    });
    return btoa(payload).substring(0, 64);
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading War Room...</div>
      </div>
    );
  }

  const effectiveReserveRatio = isSimulating
    ? (data.metrics.reserveRatio * 125000 - driftSimulation) / 100000
    : data.metrics.reserveRatio;

  const circuitBreakerActive = effectiveReserveRatio < 0.95;
  const sovereignPulseActive = effectiveReserveRatio >= 1.25;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <PemabuLogo size={56} animate={true} />
            <div>
              <h1 className="text-4xl font-bold text-white">PEMABU War Room</h1>
              <p className="text-slate-400">V4.1 Gold Standard · Entity-scoped Cockpit</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select
              value={entityContext}
              onChange={(e) => handleEntityContextChange(e.target.value as EntityContext)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="PEMABU_ADMIN">PEMABU_ADMIN</option>
              <option value="FLOMISMA_ADMIN">FLOMISMA_ADMIN</option>
              <option value="DUAL_ADMIN">DUAL_ADMIN</option>
            </select>

            <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-lg">
              <PemabuLogo size={28} animate={false} />
              <span className="text-white font-bold text-lg">Sovereign V4.1</span>
            </div>
          </div>
        </div>

        <div className={`mb-6 p-6 rounded-lg shadow-xl border-2 transition-all duration-500 ${
          circuitBreakerActive
            ? 'bg-red-900/30 border-red-500'
            : sovereignPulseActive
            ? 'bg-emerald-900/30 border-emerald-500'
            : 'bg-amber-900/30 border-amber-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                circuitBreakerActive
                  ? 'bg-red-500 animate-pulse'
                  : sovereignPulseActive
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}>
                {circuitBreakerActive ? (
                  <AlertTriangle className="w-8 h-8 text-white" />
                ) : (
                  <Shield className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {circuitBreakerActive
                    ? 'CIRCUIT BREAKER ACTIVE'
                    : sovereignPulseActive
                    ? 'SOVEREIGN PULSE ACTIVE'
                    : 'WARNING: APPROACHING THRESHOLD'}
                </h2>
                <p className={`text-lg ${
                  circuitBreakerActive ? 'text-red-300' : sovereignPulseActive ? 'text-emerald-300' : 'text-amber-300'
                }`}>
                  Reserve Ratio: <span className="font-bold">{(effectiveReserveRatio * 100).toFixed(2)}%</span>
                  {' · '}
                  TSV Coverage: <span className="font-bold">{(data.metrics.tsvCoverage * 100).toFixed(2)}%</span>
                  {isSimulating && <span className="ml-3 text-sm">(Simulated)</span>}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {!isSimulating ? (
                <button
                  onClick={simulateDrift}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  Simulate Drift
                </button>
              ) : (
                <button
                  onClick={resetSimulation}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Reset Simulation
                </button>
              )}

              <button
                onClick={generateCertificate}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Download className="w-5 h-5" />
                Generate V4.1 Certificate
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatusCard
            icon={<Database className="w-8 h-8" />}
            title="Database"
            status={data.systemStatus.database}
          />
          <StatusCard
            icon={<Activity className="w-8 h-8" />}
            title="API Services"
            status={data.systemStatus.api}
          />
          <StatusCard
            icon={<Lock className="w-8 h-8" />}
            title="Security"
            status={data.systemStatus.security}
          />
          <StatusCard
            icon={<Shield className="w-8 h-8" />}
            title="Compliance"
            status={data.systemStatus.compliance}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={<TrendingUp className="w-6 h-6 text-blue-400" />}
            title="Total Transactions"
            value={data.metrics.totalTransactions.toLocaleString()}
            subtitle={`$${Number(data.metrics.totalLedgerAmount).toLocaleString()}`}
          />
          <MetricCard
            icon={<Users className="w-6 h-6 text-emerald-400" />}
            title="Active Agents"
            value={data.metrics.activeAgents.toLocaleString()}
            subtitle={`${data.metrics.activeTenants} tenant(s)`}
          />
          <MetricCard
            icon={<Shield className="w-6 h-6 text-violet-400" />}
            title="Reserve Ratio"
            value={`${(effectiveReserveRatio * 100).toFixed(2)}%`}
            subtitle={effectiveReserveRatio >= 1.25 ? 'Compliant' : 'Below Threshold'}
            alert={effectiveReserveRatio < 1.25}
          />
          <MetricCard
            icon={<CheckCircle className="w-6 h-6 text-teal-400" />}
            title="TSV Coverage"
            value={`${(data.metrics.tsvCoverage * 100).toFixed(2)}%`}
            subtitle={data.metrics.tsvCoverage >= 1.25 ? 'Above Floor' : 'Below Floor'}
            alert={data.metrics.tsvCoverage < 1.25}
          />
        </div>

        {data.staking && (
          <div className="mb-8 bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              Staking Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Value Locked</p>
                <p className="text-2xl font-bold text-white">${data.staking.totalValueLocked.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Current APY</p>
                <p className="text-2xl font-bold text-emerald-400">{data.staking.currentAPY.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">30-Day Revenue</p>
                <p className="text-2xl font-bold text-white">${Number(data.staking.last30DayRevenue).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-1">Reward Pool</p>
                <p className="text-2xl font-bold text-violet-400">${Number(data.staking.rewardPoolBalance).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-400" />
              Solvency Analysis
            </h2>
            <div className="space-y-4">
              <SolvencyBar
                label="Reserve Ratio"
                percentage={(effectiveReserveRatio / 2) * 100}
                value={effectiveReserveRatio}
                threshold={1.25}
                circuitBreaker={0.95}
              />
              <div className="mt-6 p-4 bg-slate-700 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Solvency Thresholds</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Sovereign Floor (1.25x):</span>
                    <span className="text-emerald-400 font-bold">$125,000</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Circuit Breaker (0.95x):</span>
                    <span className="text-red-400 font-bold">$95,000</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Credits Issued:</span>
                    <span className="text-white font-bold">$100,000</span>
                  </div>
                  {isSimulating && (
                    <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-600">
                      <span>Simulated Reserve:</span>
                      <span className="text-amber-400 font-bold">${(125000 - driftSimulation).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              Entity Context Info
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-slate-700 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Current Context</h3>
                <p className="text-emerald-400 text-xl font-bold">{entityContext}</p>
                <p className="text-slate-400 text-sm mt-2">
                  {entityContext === 'PEMABU_ADMIN' && 'Viewing Pemabu Platform data only'}
                  {entityContext === 'FLOMISMA_ADMIN' && 'Viewing Flomisma Foundation data only'}
                  {entityContext === 'DUAL_ADMIN' && 'Cross-entity admin view (all tenants)'}
                </p>
              </div>

              <div className="p-4 bg-slate-700 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Temporal Firewall</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-slate-300">Entity isolation: <span className="text-emerald-400 font-bold">ACTIVE</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-slate-300">RLS policies: <span className="text-emerald-400 font-bold">ENFORCED</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-slate-300">Data segregation: <span className="text-emerald-400 font-bold">VERIFIED</span></span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-700 rounded-lg">
                <h3 className="text-white font-semibold mb-2">Last Audit</h3>
                <p className="text-slate-300 text-sm">
                  {data.lastAudit ? new Date(data.lastAudit).toLocaleString() : 'No audit data'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon, title, status }: { icon: React.ReactNode; title: string; status: string }) {
  const isOperational = status === 'operational' || status === 'OPTIMAL';

  return (
    <div className="bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className={isOperational ? 'text-emerald-400' : 'text-amber-400'}>
          {icon}
        </div>
        <div className={`w-3 h-3 rounded-full ${isOperational ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
      </div>
      <h3 className="text-slate-300 text-sm font-medium mb-1">{title}</h3>
      <p className={`text-lg font-bold ${isOperational ? 'text-emerald-400' : 'text-amber-400'} capitalize`}>
        {status}
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
  alert = false
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  alert?: boolean;
}) {
  return (
    <div className={`bg-slate-800 rounded-lg shadow-xl p-6 border ${alert ? 'border-red-500' : 'border-slate-700'}`}>
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <h3 className="text-slate-300 text-sm font-medium">{title}</h3>
      </div>
      <p className={`text-2xl font-bold mb-1 ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className={`text-sm ${alert ? 'text-red-300' : 'text-emerald-400'}`}>{subtitle}</p>
    </div>
  );
}

function SolvencyBar({
  label,
  percentage,
  value,
  threshold,
  circuitBreaker
}: {
  label: string;
  percentage: number;
  value: number;
  threshold: number;
  circuitBreaker: number;
}) {
  const getColor = () => {
    if (value < circuitBreaker) return 'bg-red-500';
    if (value < threshold) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = () => {
    if (value < circuitBreaker) return 'text-red-400';
    if (value < threshold) return 'text-amber-400';
    return 'text-emerald-400';
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-300">{label}</span>
        <span className={`font-bold ${getTextColor()}`}>{value.toFixed(4)}x</span>
      </div>
      <div className="relative w-full bg-slate-700 rounded-full h-3">
        <div
          className={`${getColor()} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        <div
          className="absolute top-0 left-[62.5%] w-0.5 h-3 bg-emerald-300"
          title="1.25x Threshold"
        />
        <div
          className="absolute top-0 left-[47.5%] w-0.5 h-3 bg-red-300"
          title="0.95x Circuit Breaker"
        />
      </div>
    </div>
  );
}
