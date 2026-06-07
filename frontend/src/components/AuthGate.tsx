import { useState } from 'react';
import { setToken } from '../lib/api';

interface AuthGateProps {
  onAuthenticated: () => void;
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [token, setTokenInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Zadaj API token');
      return;
    }
    setToken(token.trim());
    try {
      const res = await fetch('/api/arsenal/status', {
        headers: { Authorization: `Bearer ${token.trim()}` },
      });
      if (!res.ok) {
        setError('Neplatný token');
        return;
      }
      onAuthenticated();
    } catch {
      setError('Backend nedostupný — skontroluj či beží na porte 3847');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-8 shadow-2xl"
      >
        <h2 className="text-xl font-bold text-emerald-400">Arsenal Control Panel</h2>
        <p className="mt-2 text-sm text-slate-400">
          Zadaj <code className="text-emerald-300">ARSENAL_API_TOKEN</code> z backendu.
        </p>
        <input
          type="password"
          value={token}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="API token"
          className="mt-4 w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm outline-none focus:border-emerald-500"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500 transition-colors"
        >
          Prihlásiť sa
        </button>
      </form>
    </div>
  );
}
