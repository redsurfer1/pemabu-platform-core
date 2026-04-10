'use client';

import { useState, useEffect } from 'react';
import { Shield, Check, Clock, TriangleAlert as AlertTriangle, FileCheck, Eye } from 'lucide-react';

interface AuditSnapshot {
  id: string;
  eventType: string;
  systemState: string;
  triggeredAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reserveRatio: string | null;
  ledgerSum: string | null;
  reserveSum: string | null;
  snapshotData: {
    ratio: string;
    agentCount: number;
    recentLedgerEntries: any[];
    timestamp: string;
  };
}

export function ComplianceReviewDashboard() {
  const [snapshots, setSnapshots] = useState<AuditSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AuditSnapshot | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const fetchSnapshots = async () => {
    try {
      const response = await fetch('/api/audit-evidence');
      const data = await response.json();
      setSnapshots(data.snapshots || []);
    } catch (error) {
      console.error('Failed to fetch audit snapshots:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySnapshot = async (snapshotId: string) => {
    setIsReviewing(true);

    try {
      const response = await fetch('/api/audit-evidence/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId,
          reviewedBy: 'admin@pemabu.ai',
        }),
      });

      if (response.ok) {
        await fetchSnapshots();
        setSelectedSnapshot(null);
      }
    } catch (error) {
      console.error('Failed to verify snapshot:', error);
    } finally {
      setIsReviewing(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'CIRCUIT_BREAKER':
        return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'DRIFT_DETECTED':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'RESERVE_REBALANCE':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default:
        return 'text-neutral-400 bg-neutral-500/20 border-neutral-500/30';
    }
  };

  const getSystemStateColor = (state: string) => {
    switch (state) {
      case 'OPTIMAL':
        return 'text-green-400';
      case 'DEGRADED':
        return 'text-amber-400';
      case 'HALTED':
        return 'text-red-400';
      case 'INTEGRITY_DRIFT':
        return 'text-orange-400';
      default:
        return 'text-neutral-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-neutral-400">Loading audit evidence...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-100">Compliance Review Dashboard</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Human-in-the-loop verification of automated audit evidence
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-green-400" />
            <span className="text-neutral-400">
              {snapshots.filter(s => s.reviewedAt).length} Reviewed
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-neutral-400">
              {snapshots.filter(s => !s.reviewedAt).length} Pending
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {snapshots.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900/50 border border-neutral-800 rounded-lg">
            <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-400">No audit evidence snapshots yet</p>
            <p className="text-sm text-neutral-500 mt-1">
              Snapshots are automatically captured during compliance events
            </p>
          </div>
        ) : (
          snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getEventTypeColor(snapshot.eventType)}`}>
                      {snapshot.eventType}
                    </span>
                    <span className={`text-sm font-semibold ${getSystemStateColor(snapshot.systemState)}`}>
                      {snapshot.systemState}
                    </span>
                    {snapshot.reviewedAt && (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <Check className="w-3.5 h-3.5" />
                        Reviewed
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-neutral-500 text-xs">Triggered At</p>
                      <p className="text-neutral-300 font-mono text-xs mt-1">
                        {new Date(snapshot.triggeredAt).toLocaleString()}
                      </p>
                    </div>
                    {snapshot.reserveRatio && (
                      <div>
                        <p className="text-neutral-500 text-xs">Reserve Ratio</p>
                        <p className="text-neutral-300 font-mono mt-1">
                          {parseFloat(snapshot.reserveRatio).toFixed(4)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-neutral-500 text-xs">Agent Count</p>
                      <p className="text-neutral-300 font-mono mt-1">
                        {snapshot.snapshotData.agentCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500 text-xs">Ledger Entries</p>
                      <p className="text-neutral-300 font-mono mt-1">
                        {snapshot.snapshotData.recentLedgerEntries.length}
                      </p>
                    </div>
                  </div>

                  {snapshot.reviewedAt && (
                    <div className="mt-3 pt-3 border-t border-neutral-800">
                      <p className="text-xs text-neutral-500">
                        Reviewed by {snapshot.reviewedBy} on{' '}
                        {new Date(snapshot.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setSelectedSnapshot(snapshot)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>

                  {!snapshot.reviewedAt && (
                    <button
                      onClick={() => handleVerifySnapshot(snapshot.id)}
                      disabled={isReviewing}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Verify
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-100">Snapshot Details</h3>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-neutral-400 hover:text-neutral-200 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-neutral-300 mb-2">Event Information</h4>
                <pre className="bg-neutral-950 border border-neutral-800 rounded p-4 text-xs text-neutral-300 overflow-x-auto">
                  {JSON.stringify(
                    {
                      id: selectedSnapshot.id,
                      eventType: selectedSnapshot.eventType,
                      systemState: selectedSnapshot.systemState,
                      triggeredAt: selectedSnapshot.triggeredAt,
                      reserveRatio: selectedSnapshot.reserveRatio,
                      ledgerSum: selectedSnapshot.ledgerSum,
                      reserveSum: selectedSnapshot.reserveSum,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-neutral-300 mb-2">Snapshot Data</h4>
                <pre className="bg-neutral-950 border border-neutral-800 rounded p-4 text-xs text-neutral-300 overflow-x-auto max-h-96">
                  {JSON.stringify(selectedSnapshot.snapshotData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
