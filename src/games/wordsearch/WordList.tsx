import React from 'react';
import type { PlacedWord } from './types';
import { getFoundColor } from './GridCell';

interface WordListProps {
  words: PlacedWord[];
  foundWords: string[];
}

export const WordList = React.memo(function WordList({ words, foundWords }: WordListProps) {
  return (
    <div
      className="flex flex-wrap justify-center"
      style={{
        gap: 'clamp(4px, 1vw, 8px)',
        padding: 'clamp(16px, 4vw, 28px) 0 clamp(8px, 2vw, 16px)',
      }}
    >
      {words.map((w) => {
        const foundIndex = foundWords.indexOf(w.word);
        const isFound = foundIndex !== -1;
        return (
          <span
            key={w.word}
            className="font-semibold rounded-full transition-all duration-300"
            style={{
              padding: 'clamp(3px, 0.7vw, 5px) clamp(10px, 2.2vw, 14px)',
              fontSize: 'clamp(11px, 2.5vw, 14px)',
              letterSpacing: '0.5px',
              background: isFound ? getFoundColor(foundIndex) : 'rgba(255,255,255,0.1)',
              color: isFound ? '#fff' : 'rgba(255,255,255,0.6)',
              textDecoration: isFound ? 'line-through' : 'none',
              opacity: isFound ? 0.7 : 1,
            }}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
});
