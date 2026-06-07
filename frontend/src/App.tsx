import { useState } from 'react';
import { AuthGate } from './components/AuthGate';
import { Dashboard } from './pages/Dashboard';
import { SchrodingerScan } from './pages/SchrodingerScan';
import { clearToken, getToken } from './lib/api';

type Tab = 'arsenal' | 'schrodinger';

export default function App() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const [tab, setTab] = useState<Tab>('arsenal');

  const handleLogout = () => {
    clearToken();
    setAuthenticated(false);
  };

  return (
    <>
      {!authenticated && (
        <AuthGate onAuthenticated={() => setAuthenticated(true)} />
      )}
      {authenticated && (
        <div className="relative min-h-screen">
          <div className="absolute right-4 top-4 z-10 flex items-center gap-4">
            <nav className="flex rounded-lg border border-slate-700 bg-slate-900 p-1 text-xs">
              <button
                onClick={() => setTab('arsenal')}
                className={`rounded-md px-3 py-1.5 ${tab === 'arsenal' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Arsenal
              </button>
              <button
                onClick={() => setTab('schrodinger')}
                className={`rounded-md px-3 py-1.5 ${tab === 'schrodinger' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Schrödinger
              </button>
            </nav>
            <button
              onClick={handleLogout}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Odhlásiť
            </button>
          </div>

          {tab === 'arsenal' && <Dashboard authenticated={authenticated} />}
          {tab === 'schrodinger' && <SchrodingerScan />}
        </div>
      )}
    </>
  );
}
