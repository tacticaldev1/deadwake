import { useCallback, useState } from 'react';
import DeadwakeGame from './DeadwakeGame';
import CoopGame from './CoopGame';
import CoopMenu from '../components/CoopMenu';
import { NetClient } from '../net/NetClient';

type Mode = 'solo' | 'coopMenu' | 'coop';

const Index = () => {
  const [mode, setMode] = useState<Mode>('solo');
  const [client, setClient] = useState<NetClient | null>(null);
  const [hostJoinCode, setHostJoinCode] = useState<string | null>(null);

  const handleConnected = useCallback((c: NetClient, joinCode?: string) => {
    setClient(c);
    setHostJoinCode(joinCode ?? null);
    setMode('coop');
  }, []);

  const handleLeaveCoop = useCallback(() => {
    setClient(null);
    setHostJoinCode(null);
    setMode('solo');
  }, []);

  if (mode === 'coopMenu') {
    return <CoopMenu onConnected={handleConnected} onBack={() => setMode('solo')} />;
  }

  if (mode === 'coop' && client) {
    return <CoopGame client={client} onLeave={handleLeaveCoop} hostJoinCode={hostJoinCode ?? undefined} />;
  }

  return <DeadwakeGame onEnterCoop={() => setMode('coopMenu')} />;
};

export default Index;
