'use client';

import { useState, useEffect } from 'react';
import { Shield, Clock, Clock as Unlock } from 'lucide-react';

interface JITAccessControlProps {
  children: (enabled: boolean) => React.ReactNode;
  durationSeconds?: number;
}

export function JITAccessControl({
  children,
  durationSeconds = 120
}: JITAccessControlProps) {
  const [isElevated, setIsElevated] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!isElevated || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsElevated(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isElevated, remainingSeconds]);

  const handleRequestAccess = async () => {
    setIsRequesting(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsElevated(true);
    setRemainingSeconds(durationSeconds);
    setIsRequesting(false);

    console.log(`JIT Access Granted: ${durationSeconds}s window started`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
        <div className={`p-2 rounded-lg ${
          isElevated
            ? 'bg-green-500/20 text-green-400'
            : 'bg-neutral-800 text-neutral-500'
        }`}>
          {isElevated ? <Unlock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-200">
              {isElevated ? 'Elevated Access Active' : 'Elevated Access Required'}
            </h3>
            {isElevated && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono">{formatTime(remainingSeconds)}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isElevated
              ? 'JIT access window is active. Access will auto-revoke when timer expires.'
              : 'Request temporary elevated access to perform sensitive operations.'
            }
          </p>
        </div>

        {!isElevated && (
          <button
            onClick={handleRequestAccess}
            disabled={isRequesting}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${isRequesting
                ? 'bg-neutral-800 text-neutral-500 cursor-wait'
                : 'bg-violet-500 hover:bg-violet-600 text-white'
              }
            `}
          >
            {isRequesting ? 'Requesting...' : 'Request Access'}
          </button>
        )}

        {isElevated && (
          <button
            onClick={() => {
              setIsElevated(false);
              setRemainingSeconds(0);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          >
            Revoke Early
          </button>
        )}
      </div>

      {children(isElevated)}
    </div>
  );
}
