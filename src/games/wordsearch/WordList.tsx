import React from 'react';
import type { PlacedWord } from './types';
import { getFoundColor } from './foundColors';

interface WordListProps {
  words: PlacedWord[];
  foundWords: string[];
}

export const WordList = React.memo(function WordList({ words, foundWords }: WordListProps) {
  return (
    <div
      className="flex flex-wrap justify-center"
      style={{
        gap: 'clamp(6px, 1.6vw, 10px)',
        padding: 'clamp(16px, 4vw, 28px) 0 clamp(8px, 2vw, 16px)',
      }}
    >
      {words.map((w) => {
        const foundIndex = foundWords.indexOf(w.word);
        const isFound = foundIndex !== -1;
        return (
          <span
            key={w.word}
            className={`ws-word ${isFound ? 'ws-word--found' : ''}`}
            style={isFound ? { background: getFoundColor(foundIndex) } : undefined}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
});
