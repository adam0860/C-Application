/**
 * Builds a Compiler Explorer (godbolt.org) link that opens the code with an
 * executor pane, so learners can compile and run any example in a browser.
 * Uses the documented ClientState format: /clientstate/<base64 JSON>.
 */
export function compilerExplorerUrl(code: string, opts: { std?: string; stdin?: string } = {}): string {
  const options = `-std=${opts.std ?? 'c++20'} -O1 -Wall -Wextra`;
  const state = {
    sessions: [
      {
        id: 1,
        language: 'c++',
        source: code,
        compilers: [{ id: 'g132', options }],
        executors: [
          {
            arguments: '',
            compiler: { id: 'g132', libs: [], options },
            stdin: opts.stdin ?? '',
            stdinVisible: Boolean(opts.stdin),
            compilerOutputVisible: false,
          },
        ],
      },
    ],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `https://godbolt.org/clientstate/${encodeURIComponent(btoa(bin))}`;
}
