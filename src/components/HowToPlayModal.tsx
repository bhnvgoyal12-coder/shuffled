import type { GameType } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface HowToPlayModalProps {
  gameType: GameType;
  onClose: () => void;
}

export function HowToPlayModal({ gameType, onClose }: HowToPlayModalProps) {
  useEscapeKey(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to play"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[20000] animate-[fadeIn_0.3s_ease] backdrop-blur-[4px]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="win-card-bg rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-[scaleIn_0.3s_ease] w-[90vw] max-w-[380px] max-h-[85vh] overflow-y-auto relative"
        style={{ padding: 'clamp(20px, 4vw, 32px)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2
            className="font-bold text-[#2e7d32] m-0"
            style={{ fontSize: 'clamp(20px, 5vw, 26px)' }}
          >
            How to Play
          </h2>
          <button
            className="bg-transparent border-none text-[#999] cursor-pointer hover:text-[#333] transition-colors leading-none"
            style={{ fontSize: 'clamp(24px, 5vw, 30px)' }}
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Game name badge */}
        <div
          className="inline-block bg-[#2e7d32]/10 text-[#2e7d32] font-semibold rounded-full mb-4"
          style={{
            padding: 'clamp(3px, 0.8vw, 5px) clamp(10px, 2.5vw, 14px)',
            fontSize: 'clamp(11px, 2.5vw, 13px)',
          }}
        >
          {gameType === 'klondike' ? 'Classic Solitaire' : gameType === 'freecell' ? 'FreeCell' : gameType === 'spider' ? 'Spider Solitaire' : gameType === 'mahjong' ? 'Mahjong' : 'Word Search'}
        </div>

        {gameType === 'klondike' && <KlondikeRules />}
        {gameType === 'freecell' && <FreeCellRules />}
        {gameType === 'spider' && <SpiderRules />}
        {gameType === 'mahjong' && <MahjongRules />}
        {gameType === 'wordsearch' && <WordSearchRules />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3
        className="font-semibold text-[#2e7d32] m-0 mb-1"
        style={{ fontSize: 'clamp(13px, 3vw, 15px)' }}
      >
        {title}
      </h3>
      <div className="text-[#555] leading-relaxed" style={{ fontSize: 'clamp(12px, 2.8vw, 14px)' }}>
        {children}
      </div>
    </div>
  );
}

function KlondikeRules() {
  return (
    <>
      <Section title="Goal">
        <p className="m-0">Move all 52 cards to the 4 foundation piles, building each from Ace to King by suit.</p>
      </Section>
      <Section title="Tableau">
        <p className="m-0">7 columns of cards. Build downward in alternating colors (red on black, black on red). You can move groups of face-up cards together.</p>
      </Section>
      <Section title="Stock & Waste">
        <p className="m-0">Tap the stock pile to draw cards. Play the top card of the waste pile to the tableau or foundations.</p>
      </Section>
      <Section title="Moving Cards">
        <p className="m-0">Tap a card to send it to the best available spot, or drag it exactly where you want it. Stuck? The lightbulb suggests a move, and Undo takes back as many moves as you like.</p>
      </Section>
      <Section title="Foundations">
        <p className="m-0">Build up by suit from Ace to King. A card can be brought back down to the tableau if you need it, at a cost of 15 points.</p>
      </Section>
      <Section title="Tip">
        <p className="m-0 text-[#888] italic">Focus on revealing face-down cards and freeing up columns for Kings.</p>
      </Section>
    </>
  );
}

function FreeCellRules() {
  return (
    <>
      <Section title="Goal">
        <p className="m-0">Move all 52 cards to the 4 foundation piles, building each from Ace to King by suit.</p>
      </Section>
      <Section title="Free Cells">
        <p className="m-0">4 temporary cells at the top-left, each holding 1 card. Use them as temporary storage to plan your moves.</p>
      </Section>
      <Section title="Tableau">
        <p className="m-0">8 columns with all cards face-up. Build downward in alternating colors (red on black).</p>
      </Section>
      <Section title="Supermove">
        <p className="m-0">Move groups of cards at once depending on how many free cells and empty columns are available. More open spaces means bigger moves.</p>
      </Section>
      <Section title="Moving Cards">
        <p className="m-0">Tap a card to send it to the best available spot — a foundation, another column, or a free cell — or drag it exactly where you want it. The lightbulb suggests a move.</p>
      </Section>
      <Section title="Tip">
        <p className="m-0 text-[#888] italic">Keep free cells open as long as possible. The more available, the larger groups you can move.</p>
      </Section>
    </>
  );
}

function SpiderRules() {
  return (
    <>
      <Section title="Goal">
        <p className="m-0">Build 8 complete runs of King down to Ace in the same suit. Completed runs are removed from the board.</p>
      </Section>
      <Section title="Tableau">
        <p className="m-0">10 columns of cards. You can place any card of descending rank on another, regardless of suit. However, only same-suit sequences can be moved as a group.</p>
      </Section>
      <Section title="Stock">
        <p className="m-0">Tap the stock pile to deal 10 new cards (one per column). All columns must have at least 1 card before dealing.</p>
      </Section>
      <Section title="Suit Variants">
        <p className="m-0">Choose difficulty in Settings: 1 suit (easy), 2 suits (medium), or 4 suits (hard).</p>
      </Section>
      <Section title="Tip">
        <p className="m-0 text-[#888] italic">Build same-suit sequences whenever possible. Mixed-suit stacks block group moves.</p>
      </Section>
    </>
  );
}

function WordSearchRules() {
  return (
    <>
      <Section title="Goal">
        <p className="m-0">Find all the hidden words in the letter grid to complete each level.</p>
      </Section>
      <Section title="How to Select">
        <p className="m-0">Touch a letter and drag in a straight line (horizontal, vertical, or diagonal) to highlight a word. Release to submit your selection. Can't spot one? The lightbulb shows where a word starts.</p>
      </Section>
      <Section title="Levels">
        <p className="m-0">Each level gets harder with larger grids, more words, and additional directions. Complete all words to advance to the next level.</p>
      </Section>
      <Section title="Scoring">
        <p className="m-0">Earn points for each word found (longer words score more). Bonus points are awarded for completing a level.</p>
      </Section>
      <Section title="Tip">
        <p className="m-0 text-[#888] italic">Look for less common letters first (Q, Z, X) to quickly spot word locations.</p>
      </Section>
    </>
  );
}

function MahjongRules() {
  return (
    <>
      <Section title="Goal">
        <p className="m-0">Remove all 144 tiles from the board by matching pairs of identical tiles.</p>
      </Section>
      <Section title="Free Tiles">
        <p className="m-0">A tile is free if nothing is on top of it and at least one side (left or right) is open. Only free tiles can be selected.</p>
      </Section>
      <Section title="Matching">
        <p className="m-0">Tap two free tiles with the same face to remove them. Suited tiles match by exact type and number. All Seasons match each other, and all Flowers match each other.</p>
      </Section>
      <Section title="Shuffle & Hint">
        <p className="m-0">Stuck? The lightbulb highlights a pair you can remove, and Shuffle rearranges the remaining tiles (-50 pts). Every new board can be cleared.</p>
      </Section>
      <Section title="Tip">
        <p className="m-0 text-[#888] italic">Work from the top layers down. Prioritize removing tiles that free up others underneath.</p>
      </Section>
    </>
  );
}
