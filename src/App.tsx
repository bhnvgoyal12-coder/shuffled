import { useState, useCallback, useEffect } from 'react';
import type { GameType } from './types';
import { Board as KlondikeBoard } from './games/klondike/Board';
import { Board as FreeCellBoard } from './games/freecell/Board';
import { Board as SpiderBoard } from './games/spider/Board';
import { Board as MahjongBoard } from './games/mahjong/Board';
import { HomeScreen } from './components/HomeScreen';
import { SettingsProvider } from './contexts/SettingsContext';
import { trackGameSelect, trackGoHome } from './utils/analytics';

type AppView = { screen: 'home' } | { screen: 'game'; game: GameType };

function App() {
  const [view, setView] = useState<AppView>({ screen: 'home' });

  const goHome = useCallback(() => { trackGoHome(); setView({ screen: 'home' }); }, []);

  const selectGame = useCallback((game: GameType) => {
    trackGameSelect(game);
    setView({ screen: 'game', game });
  }, []);

  // Browser back: game → home (instead of leaving the app)
  useEffect(() => {
    const handlePopState = () => {
      if (view.screen === 'game') {
        setView({ screen: 'home' });
      }
      // Always push a state so the next "back" doesn't leave the app
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [view.screen]);

  // Push a new history entry when navigating to a game
  useEffect(() => {
    if (view.screen === 'game') {
      window.history.pushState(null, '', window.location.href);
    }
  }, [view.screen]);

  return (
    <SettingsProvider>
      {view.screen === 'home' && <HomeScreen onSelectGame={selectGame} />}
      {view.screen === 'game' && view.game === 'klondike' && <KlondikeBoard onGoHome={goHome} />}
      {view.screen === 'game' && view.game === 'freecell' && <FreeCellBoard onGoHome={goHome} />}
      {view.screen === 'game' && view.game === 'spider' && <SpiderBoard onGoHome={goHome} />}
      {view.screen === 'game' && view.game === 'mahjong' && <MahjongBoard onGoHome={goHome} />}
    </SettingsProvider>
  );
}

export default App;
