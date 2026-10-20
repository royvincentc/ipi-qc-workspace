import {useId} from 'react';

/** Context illustration only: these marks never encode sample measurements. */
export function LabGraphic({kind = 'dish'}: {kind?: 'dish' | 'assay' | 'sheets' | 'vessel'}) {
  const id = useId().replace(/:/g, '');

  return (
    <span className={`lab-object lab-object-${kind}`} aria-hidden="true">
      <svg viewBox="0 0 144 112" focusable="false">
        <defs>
          <linearGradient id={`${id}glass`} x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="var(--glass-highlight)" stopOpacity="0.7" />
            <stop offset="45%" stopColor="var(--glass-mid)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--glass-edge)" stopOpacity="0.48" />
          </linearGradient>
          <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0%" stopColor="var(--glass-highlight)" stopOpacity="0.85" />
            <stop offset="35%" stopColor="var(--glass-mid)" stopOpacity="0.25" />
            <stop offset="70%" stopColor="var(--glass-highlight)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--glass-edge)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={`${id}lens`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="var(--glass-highlight)" stopOpacity="0.45" />
            <stop offset="50%" stopColor="var(--glass-mid)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--glass-edge)" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id={`${id}lime`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#f0fac0" />
            <stop offset="100%" stopColor="#9bb34e" />
          </linearGradient>
          <linearGradient id={`${id}paper`} x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="var(--paper-light)" />
            <stop offset="100%" stopColor="var(--paper-shade)" />
          </linearGradient>
          <linearGradient id={`${id}tab`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#bedb65" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {kind === 'dish' ? (
          <>
            <ellipse cx="72" cy="94" rx="48" ry="8" fill="var(--object-shadow)" opacity="0.85" />
            <ellipse cx="72" cy="93" rx="38" ry="5" fill="var(--object-shadow)" opacity="0.4" />
            <path
              className="dish-wall"
              d="M 21 49 v 18 c 0 22 23 35 51 35 s 51 -13 51 -35 V 49"
              fill={`url(#${id}glass)`}
              stroke="var(--glass-stroke)"
              strokeWidth="1.2"
            />
            <path
              d="M 25 57 v 10 c 0 19 21 30 47 30 s 47 -11 47 -30 V 57"
              fill="none"
              stroke="var(--glass-edge)"
              strokeWidth="0.9"
              opacity="0.35"
            />
            <ellipse cx="72" cy="53" rx="44" ry="23" fill="var(--agar-fill)" stroke="var(--border-subtle)" strokeWidth="0.8" />
            <ellipse cx="72" cy="53" rx="42.5" ry="22" fill="none" stroke="var(--accent)" strokeWidth="0.5" opacity="0.32" />
            <path
              d="M 72 34 v 6 M 72 66 v 6 M 34 53 h 6 M 104 53 h 6"
              stroke="var(--paper-rule)"
              strokeWidth="0.9"
              strokeLinecap="round"
              opacity="0.45"
            />
            <ellipse cx="72" cy="53" rx="22" ry="11" fill="none" stroke="var(--assay-line)" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.35" />
            <g className="dish-colonies">
              {[
                [46, 44, 4.5], [52, 40, 4.2], [59, 43, 4], [48, 51, 3.8], [55, 49, 4],
                [62, 48, 3.5], [43, 48, 3.2], [82, 63, 4], [90, 59, 3.5], [97, 66, 3.8],
                [85, 71, 3.2], [93, 74, 3], [101, 71, 2.5], [77, 69, 2.8],
              ].map(([x, y, r], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r={r} fill={`url(#${id}lime)`} stroke="#8fa347" strokeWidth="0.5" />
                  <circle cx={x - r * 0.28} cy={y - r * 0.28} r={Math.max(0.7, r * 0.26)} fill="var(--glass-highlight)" opacity="0.75" />
                </g>
              ))}
            </g>
            <ellipse
              className="dish-rim"
              cx="72"
              cy="49"
              rx="51"
              ry="28"
              fill={`url(#${id}rim)`}
              stroke="var(--glass-stroke)"
              strokeWidth="1.3"
            />
            <ellipse cx="72" cy="49" rx="47.5" ry="25" fill="none" stroke="var(--glass-highlight)" strokeWidth="0.8" opacity="0.6" />
            <path
              className="dish-highlight"
              d="M 29 46 C 29 33 46 23 71 23 C 81 23 91 25 99 28 M 81 74 C 97 71 110 64 115 54"
              fill="none"
              stroke="var(--glass-highlight)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path d="M 40 88 C 50 92 64 94 76 93" fill="none" stroke="var(--glass-highlight)" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
          </>
        ) : kind === 'assay' ? (
          <>
            <ellipse cx="72" cy="98" rx="38" ry="5.5" fill="var(--object-shadow)" opacity="0.8" />
            <ellipse cx="72" cy="97" rx="28" ry="3.5" fill="var(--object-shadow)" opacity="0.4" />
            <circle cx="72" cy="51" r="44" fill={`url(#${id}lens)`} stroke="var(--glass-stroke)" strokeWidth="1.2" />
            <circle cx="72" cy="51" r="41.5" fill="none" stroke="var(--glass-highlight)" strokeWidth="0.8" opacity="0.55" />
            <path d="M 37 31 A 42 42 0 0 1 83 10" fill="none" stroke="var(--glass-highlight)" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
            <path d="M 87 88 A 42 42 0 0 1 104 69" fill="none" stroke="var(--glass-highlight)" strokeWidth="0.9" strokeLinecap="round" opacity="0.35" />
            <path d="M 28 51 h 88 M 72 7 v 88" stroke="var(--assay-line)" strokeDasharray="2 4" strokeWidth="0.8" opacity="0.35" />
            <path
              d="M 108 51 h 5 M 31 51 h 5 M 72 9 v 5 M 72 88 v 5 M 98 25 l 3 -3 M 43 22 l 3 3 M 43 80 l 3 -3 M 98 77 l 3 3"
              stroke="var(--assay-line)"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.6"
            />
            <g className="assay-rings" fill="none" stroke="var(--assay-line)">
              <circle cx="72" cy="51" r="41" strokeWidth="1" />
              <circle cx="72" cy="51" r="30" strokeWidth="0.85" strokeDasharray="3 3" opacity="0.75" />
              <circle cx="72" cy="51" r="18" strokeWidth="0.85" />
              <circle cx="72" cy="51" r="7" strokeWidth="0.75" opacity="0.7" />
              <circle cx="72" cy="51" r="2" fill="var(--accent)" stroke="none" />
              <path className="assay-sweep" d="M 72 10 a 41 41 0 0 1 41 41" stroke="#bedb65" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <g className="assay-specimen">
              <circle cx="58" cy="48" r="7.5" fill="none" stroke="var(--accent)" strokeWidth="0.6" strokeDasharray="1.5 2" opacity="0.6" />
              <circle cx="58" cy="48" r="4" fill={`url(#${id}lime)`} stroke="#8da048" strokeWidth="0.7" />
              <circle cx="58" cy="48" r="1.3" fill="#fff" opacity="0.9" />
              <circle cx="87" cy="41" r="2.8" fill={`url(#${id}lime)`} stroke="#8da048" strokeWidth="0.6" />
              <circle cx="87" cy="41" r="1" fill="#fff" opacity="0.9" />
              <circle cx="64" cy="65" r="2.5" fill={`url(#${id}lime)`} stroke="#8da048" strokeWidth="0.6" />
              <circle cx="64" cy="65" r="0.9" fill="#fff" opacity="0.9" />
            </g>
          </>
        ) : kind === 'sheets' ? (
          <>
            <ellipse cx="73" cy="99" rx="44" ry="6" fill="var(--object-shadow)" opacity="0.85" />
            <g className="report-sheet-back" transform="rotate(-12 59 53)">
              <rect x="33" y="13" width="53" height="74" rx="4" fill={`url(#${id}paper)`} stroke="var(--glass-stroke)" strokeWidth="1" />
              <path d="M 34 85 V 15 C 34 14 35 13 36 13 H 84" fill="none" stroke="var(--glass-highlight)" strokeWidth="0.8" opacity="0.6" />
              <rect x="41" y="21" width="16" height="4" rx="1" fill="var(--paper-rule)" opacity="0.45" />
              <path
                d="M 41 30 h 36 M 41 37 h 36 M 41 44 h 36 M 41 51 h 30 M 41 58 h 34 M 41 65 h 26 M 41 72 h 32"
                stroke="var(--paper-rule)"
                strokeWidth="1.3"
                strokeLinecap="round"
                opacity="0.75"
              />
              <path d="M 62 29 v 46" stroke="var(--paper-rule)" strokeWidth="0.5" strokeDasharray="1.5 2" opacity="0.35" />
            </g>
            <rect x="94" y="21" width="7" height="21" rx="3" fill={`url(#${id}tab)`} stroke="var(--glass-stroke)" strokeWidth="0.7" transform="rotate(12 98 32)" />
            <path d="M 96.5 23 v 17" stroke="var(--glass-highlight)" strokeWidth="0.8" strokeLinecap="round" transform="rotate(12 98 32)" opacity="0.75" />
            <g className="report-sheet-front" transform="rotate(10 87 62)">
              <rect x="57" y="29" width="54" height="70" rx="4" fill={`url(#${id}paper)`} stroke="var(--glass-stroke)" strokeWidth="1.1" />
              <path d="M 58 97 V 31 C 58 30 59 29 60 29 H 109" fill="none" stroke="var(--glass-highlight)" strokeWidth="0.9" opacity="0.85" />
              <rect x="66" y="37" width="14" height="4" rx="1" fill="var(--accent)" opacity="0.85" />
              <path d="M 83 39 h 21" stroke="var(--paper-rule)" strokeWidth="1.3" strokeLinecap="round" />
              <path
                d="M 66 47 h 14 M 83 47 h 21 M 66 54 h 12 M 83 54 h 21 M 66 61 h 15 M 83 61 h 18 M 66 68 h 11 M 83 68 h 21 M 66 75 h 16 M 83 75 h 15 M 66 82 h 13 M 83 82 h 19"
                stroke="var(--paper-rule)"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <path d="M 81 45 v 40" stroke="var(--paper-rule)" strokeWidth="0.5" strokeDasharray="1.5 2" opacity="0.4" />
              <circle cx="101" cy="87" r="4.2" fill="none" stroke="var(--accent)" strokeWidth="0.9" />
              <path d="M 99.2 87 l 1.3 1.3 l 2.5 -2.5" fill="none" stroke="var(--accent)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </>
        ) : (
          <>
            <ellipse cx="72" cy="100" rx="31" ry="5.5" fill="var(--object-shadow)" opacity="0.85" />
            <ellipse cx="72" cy="99" rx="21" ry="3.5" fill="var(--object-shadow)" opacity="0.4" />
            <path
              d="M 61 27 H 83 L 87 34 C 92 39 95 45 95 53 V 86 C 95 93.5 89.5 98 82 98 H 62 C 54.5 98 49 93.5 49 86 V 53 C 49 45 52 39 57 34 Z"
              fill={`url(#${id}glass)`}
              stroke="var(--glass-stroke)"
              strokeWidth="1.2"
            />
            <path d="M 52 86 C 52 92 57 95 64 95 H 80 C 87 95 92 92 92 86" fill="none" stroke="var(--glass-edge)" strokeWidth="0.9" opacity="0.4" />
            <path
              d="M 49.5 62 V 86 C 49.5 93 54.5 97.5 62 97.5 H 82 C 89.5 97.5 94.5 93 94.5 86 V 62 Q 72 65 49.5 62 Z"
              fill="var(--agar-fill)"
            />
            <ellipse cx="72" cy="62" rx="22.5" ry="3.8" fill="var(--agar-fill)" stroke="var(--accent)" strokeWidth="0.8" opacity="0.75" />
            <path d="M 52 62 Q 72 65 92 62" fill="none" stroke="var(--glass-highlight)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
            <path d="M 86 46 h 8" stroke="var(--glass-highlight)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 89 54 h 5" stroke="var(--glass-highlight)" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
            <path d="M 86 62 h 8" stroke="var(--glass-highlight)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 89 70 h 5" stroke="var(--glass-highlight)" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
            <path d="M 86 78 h 8" stroke="var(--glass-highlight)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M 53 40 L 53 88" stroke="var(--glass-highlight)" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
            <path d="M 56 42 L 56 86" stroke="var(--glass-highlight)" strokeWidth="0.7" strokeLinecap="round" opacity="0.4" />
            <path d="M 91 42 L 91 86" stroke="var(--glass-highlight)" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
            <path d="M 57 95 Q 72 98 87 95" fill="none" stroke="var(--glass-highlight)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
            <rect x="60" y="47" width="22" height="28" rx="2.5" fill="var(--paper-light)" stroke="var(--glass-stroke)" strokeWidth="0.7" opacity="0.95" />
            <path d="M 64 53 h 14 M 64 58 h 14 M 64 63 h 9" stroke="var(--paper-rule)" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="78" cy="68" r="1.4" fill="var(--accent)" />
            <rect x="62" y="23" width="20" height="7" fill={`url(#${id}glass)`} stroke="var(--glass-stroke)" strokeWidth="0.9" />
            <rect x="56" y="11" width="32" height="14" rx="3.5" fill="var(--paper-shade)" stroke="var(--glass-stroke)" strokeWidth="1" />
            <path d="M 59 12 h 26" stroke="var(--glass-highlight)" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
            <path d="M 61 14 v 8 M 65 14 v 8 M 69 14 v 8 M 73 14 v 8 M 77 14 v 8 M 81 14 v 8" stroke="var(--paper-rule)" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
            <rect x="58" y="24" width="28" height="3" rx="1" fill="var(--glass-mid)" stroke="var(--glass-stroke)" strokeWidth="0.6" />
          </>
        )}
      </svg>
    </span>
  );
}
