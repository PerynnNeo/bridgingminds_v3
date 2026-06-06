/**
 * Deterministic reading-fidelity check for the onboarding passage.
 *
 * Compares the expected passage to what was actually transcribed using a
 * word-level edit-distance alignment (the standard way speech accuracy is
 * measured). This reliably catches skipped sentences and mixed-up words, where
 * a loose AI comparison does not.
 */

export interface ReadingAccuracy {
  /** 0..100: words read correctly out of the whole passage (penalises skips AND mix-ups). */
  accuracy: number;
  /** 0..100: how much of the passage they actually got to (skipping lowers this). */
  coverage: number;
  /** Notable skipped stretches (the expected text of omitted runs). */
  skipped: string[];
  /** Mixed-up or mispronounced words: expected vs what was heard. */
  substitutions: { expected: string; said: string }[];
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function analyzeReading(expected: string, spoken: string): ReadingAccuracy {
  const E = tokenize(expected);
  const S = tokenize(spoken);
  const n = E.length;
  const m = S.length;
  if (n === 0) return { accuracy: 0, coverage: 0, skipped: [], substitutions: [] };

  // Word-level Levenshtein DP.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = E[i - 1] === S[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  // Backtrace from (n, m) to classify each operation.
  let i = n;
  let j = m;
  let matches = 0;
  let subs = 0;
  const substitutions: { expected: string; said: string }[] = [];
  const run: string[] = [];
  const skipped: string[] = [];
  const flush = () => {
    if (run.length >= 3) skipped.push(run.slice(0, 7).join(' '));
    run.length = 0;
  };

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && E[i - 1] === S[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      matches++;
      flush();
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      subs++;
      if (substitutions.length < 6) substitutions.unshift({ expected: E[i - 1], said: S[j - 1] });
      flush();
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      run.unshift(E[i - 1]); // expected word that was skipped
      i--;
    } else {
      j--; // extra spoken word (insertion)
    }
  }
  flush();

  return {
    accuracy: Math.round((matches / n) * 100),
    coverage: Math.round(((matches + subs) / n) * 100),
    skipped,
    substitutions,
  };
}
