'use client';

import { Shield, LogOut, User, Zap, LayoutDashboard, TrendingUp, ShieldCheck, Briefcase, FileText, PieChart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { RequestInstitutionalAccess } from './RequestInstitutionalAccess';
import PemabuLogo from './PemabuLogo';
import Link from 'next/link';

function isSellerNavRole(role: string | undefined): boolean {
  if (!role) return false;
  return ['seller', 'SELLER', 'SERVICE_PROVIDER', 'HUMAN'].includes(role);
}

export function Navigation() {
  const { user, isAuthenticated, hasTrustCenterAccess, logout } = useAuth();
  const showSellerLinks = isAuthenticated && isSellerNavRole(user?.role);

  return (
    <nav className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/mfo" className="flex items-center space-x-3">
          <PemabuLogo size={40} animate={true} />
          <span className="text-xl font-bold text-neutral-50">Pemabu</span>
          <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400">
            V4.1
          </span>
        </Link>

        <div className="flex items-center space-x-6">
          <Link
            href="/dashboard"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-semibold flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </Link>

          <Link
            href="/mfo"
            className="text-sm text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1.5"
          >
            <PieChart className="w-3.5 h-3.5" />
            MFO
          </Link>

          <Link
            href="/jobs"
            className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Marketplace
          </Link>

          {isAuthenticated ? (
            <Link
              href="/agreements"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              My agreements
            </Link>
          ) : null}

          {showSellerLinks ? (
            <Link
              href="/seller/dashboard"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Seller dashboard
            </Link>
          ) : null}

          <Link
            href="/staking"
            className="text-sm text-amber-400 hover:text-amber-300 transition-colors font-semibold flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Program status
          </Link>

          {hasTrustCenterAccess ? (
            <Link
              href="/compliance-review"
              className="text-sm text-violet-400 hover:text-violet-300 transition-colors font-semibold flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Trust Center
            </Link>
          ) : (
            !isAuthenticated && <RequestInstitutionalAccess />
          )}

          {isAuthenticated && user && (
            <div className="flex items-center gap-3 pl-3 border-l border-neutral-700">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 rounded-lg">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-300">{user.email}</span>
                <span className={`text-xs font-semibold ${
                  user.trustRole === 'ADMIN' ? 'text-emerald-400' :
                  user.trustRole === 'ADVISOR' ? 'text-blue-400' :
                  user.trustRole === 'USER' ? 'text-violet-400' :
                  'text-neutral-500'
                }`}>
                  {user.trustRole}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
