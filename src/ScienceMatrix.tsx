import {memo} from 'react';

const SYMBOL_IDS = [
  'sci-flask',
  'sci-beaker',
  'sci-test-tube',
  'sci-pipette',
  'sci-syringe',
  'sci-petri',
  'sci-dna',
  'sci-atom',
  'sci-microscope',
  'sci-molecule',
];

const CELL = 64;
const COLS = 10;
const ROWS = 4;
const TILE_W = COLS * CELL;
const TILE_H = ROWS * CELL;

// Build the repeating tile once; there is no per-frame JavaScript.
const BASE_CELLS = Array.from({length: COLS * ROWS}, (_, i) => ({
  id: SYMBOL_IDS[(i * 7 + (i % 11)) % SYMBOL_IDS.length],
  x: (i % COLS) * CELL + 21,
  y: Math.floor(i / COLS) * CELL + 21,
}));

/**
 * One static SVG tile keeps laboratory detail without a background animation loop.
 */
export const ScienceMatrix = memo(function ScienceMatrix() {
  return (
    <div className="science-matrix" aria-hidden="true">
      <svg className="science-matrix-svg" width="100%" height="100%">
        <defs>
          <symbol id="sci-flask" viewBox="0 0 24 24">
            <path d="M10 2v5.5L4.5 18A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-3L14 7.5V2" />
            <path d="M9 2h6" />
            <path d="M7 16h10" />
            <circle cx="10" cy="18.5" r=".7" fill="currentColor" />
            <circle cx="14" cy="17.5" r=".5" fill="currentColor" />
          </symbol>
          <symbol id="sci-beaker" viewBox="0 0 24 24">
            <path d="M5 3h14v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3z" />
            <path d="M6 4v14a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V4" />
            <path d="M14 9h4" />
            <path d="M14 13h4" />
            <path d="M6 14.5c2.5-1 5.5 1 8 0s3.5-.5 4 0" />
          </symbol>
          <symbol id="sci-test-tube" viewBox="0 0 24 24">
            <path d="M8 2h8" />
            <path d="M9 2v14a3 3 0 0 0 6 0V2" />
            <path d="M9 11h6" />
            <circle cx="12" cy="14" r=".7" fill="currentColor" />
          </symbol>
          <symbol id="sci-pipette" viewBox="0 0 24 24">
            <path d="M18 2a3 3 0 0 1 3 3c0 1.2-.7 2.2-1.8 2.7L17 8l-2-2 .3-2.2A3 3 0 0 1 18 2z" />
            <path d="M15 6L5.5 15.5a2 2 0 0 0-.5 1.1L4 20l3.4-1a2 2 0 0 0 1.1-.5L18 9" />
            <circle cx="10" cy="11.5" r=".5" fill="currentColor" />
            <circle cx="2.5" cy="22.5" r=".7" fill="currentColor" />
          </symbol>
          <symbol id="sci-syringe" viewBox="0 0 24 24">
            <path d="m18 2 4 4" />
            <path d="m16 4 3 3" />
            <path d="m14 6-9.5 9.5a1.5 1.5 0 0 0 0 2.1l1.9 1.9a1.5 1.5 0 0 0 2.1 0L18 10" />
            <path d="m8.5 11.5 2 2" />
            <path d="m11 9 2 2" />
            <path d="m4.5 19.5-2.5 2.5" />
            <path d="m19 3 2 2" />
          </symbol>
          <symbol id="sci-petri" viewBox="0 0 24 24">
            <ellipse cx="12" cy="12" rx="9.5" ry="6.5" />
            <ellipse cx="12" cy="14" rx="8" ry="4.5" />
            <circle cx="10" cy="13" r="1.2" fill="currentColor" />
            <circle cx="13" cy="12.5" r="1" fill="currentColor" />
            <circle cx="15" cy="14" r="1.1" fill="currentColor" />
            <circle cx="9" cy="15" r=".8" fill="currentColor" />
          </symbol>
          <symbol id="sci-dna" viewBox="0 0 24 24">
            <path d="M4 3c3 3 5 7 5 9s-2 6-5 9" />
            <path d="M20 3c-3 3-5 7-5 9s2 6 5 9" />
            <path d="M6.5 6h11" />
            <path d="M9 12h6" />
            <path d="M6.5 18h11" />
          </symbol>
          <symbol id="sci-atom" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-30 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(90 12 12)" />
          </symbol>
          <symbol id="sci-microscope" viewBox="0 0 24 24">
            <path d="M6 21h12" />
            <path d="M9 21v-3h6v3" />
            <path d="M14 6l3 3-5 5-3-3 5-5z" />
            <path d="M11 9L7.5 5.5" />
            <path d="M10 17a4 4 0 0 1-4-4V7" />
            <circle cx="15.5" cy="4.5" r="1.5" />
          </symbol>
          <symbol id="sci-molecule" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <circle cx="5" cy="7" r="1.8" />
            <circle cx="19" cy="7" r="1.8" />
            <circle cx="7" cy="18" r="1.8" />
            <circle cx="17" cy="18" r="1.8" />
            <path d="M6.5 8.2l4 2.6" />
            <path d="M17.5 8.2l-4 2.6" />
            <path d="M8.2 16.5l2.6-3" />
            <path d="M15.8 16.5l-2.6-3" />
          </symbol>
          <pattern id="sci-pattern-base" width={TILE_W} height={TILE_H} patternUnits="userSpaceOnUse">
            {BASE_CELLS.map((cell, index) => (
              <use
                key={index}
                href={'#' + cell.id}
                x={cell.x}
                y={cell.y}
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </pattern>
        </defs>
        <rect className="science-matrix-base" width="100%" height="100%" fill="url(#sci-pattern-base)" />
      </svg>
    </div>
  );
});
