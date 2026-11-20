import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-cache-friendly-code',
  title: 'Cache-Friendly Code',
  summary:
    'Loop order, AoS vs SoA for game entities, pointer chasing, hardware and software prefetching, loop tiling and hot/cold splitting, each measured in cache misses with a simulator, plus how to measure real code with perf and VTune.',
  minutes: 24,
  objectives: [
    'Predict and count the cache misses of row-major and column-major traversals, including power-of-two stride conflicts',
    'Choose between array-of-structures and structure-of-arrays layouts for game entity updates',
    'Explain why pointer chasing is slow even when miss counts look similar, and how to avoid it',
    'Describe what hardware prefetchers detect and use a software prefetch with a sensible distance',
    'Apply loop tiling and hot/cold splitting, and pick tile sizes from cache sizes',
    'Name the counters and tools (perf, VTune and friends) used to find cache problems in real code',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Loop order: row-major vs column-major',
      blocks: [
        {
          type: 'p',
          text: 'C++ stores a two-dimensional array **row by row**: `int a[R][C]` places `a[i][j]` at element offset `i × C + j`, so `a[i][j]` and `a[i][j + 1]` are neighbours, while `a[i][j]` and `a[i + 1][j]` are a whole row apart. The same holds for a flat `std::vector` indexed as `v[i * width + j]`, the usual way to store images, grids and tile maps. Which loop goes outside therefore decides whether you walk memory sequentially or jump by a row each time.',
        },
        {
  "type": "algo",
  "view": "array",
  "interval": 900,
  "frames": [
    {
      "note": "Row-major order, `i` outer and `j` inner. `int a[4][4]` with toy 16-byte lines: each row is exactly one line. The toy cache holds 2 lines.",
      "array": [
        "0,0",
        "0,1",
        "0,2",
        "0,3",
        "1,0",
        "1,1",
        "1,2",
        "1,3",
        "2,0",
        "2,1",
        "2,2",
        "2,3",
        "3,0",
        "3,1",
        "3,2",
        "3,3"
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "(empty)"
        ],
        [
          "hits / misses",
          "0 / 0"
        ]
      ]
    },
    {
      "note": "`a[0][0]` → line of row 0: **miss**.",
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a[0][0]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 0"
        ],
        [
          "hits / misses",
          "0 / 1"
        ]
      ]
    },
    {
      "note": "`a[0][1]` → line of row 0: **hit**.",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "a[0][1]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 0"
        ],
        [
          "hits / misses",
          "1 / 1"
        ]
      ]
    },
    {
      "note": "`a[0][2]` → line of row 0: **hit**.",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "a[0][2]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 0"
        ],
        [
          "hits / misses",
          "2 / 1"
        ]
      ]
    },
    {
      "note": "`a[0][3]` → line of row 0: **hit**.",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "a[0][3]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 0"
        ],
        [
          "hits / misses",
          "3 / 1"
        ]
      ]
    },
    {
      "note": "`a[1][0]` → line of row 1: **miss**.",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 4,
          "label": "a[1][0]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 1"
        ],
        [
          "hits / misses",
          "3 / 2"
        ]
      ]
    },
    {
      "note": "`a[1][1]` → line of row 1: **hit**.",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 5,
          "label": "a[1][1]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 1"
        ],
        [
          "hits / misses",
          "4 / 2"
        ]
      ]
    },
    {
      "note": "`a[1][2]` → line of row 1: **hit**.",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 6,
          "label": "a[1][2]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 1"
        ],
        [
          "hits / misses",
          "5 / 2"
        ]
      ]
    },
    {
      "note": "`a[1][3]` → line of row 1: **hit**.",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 7,
          "label": "a[1][3]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 1"
        ],
        [
          "hits / misses",
          "6 / 2"
        ]
      ]
    },
    {
      "note": "`a[2][0]` → line of row 2: **miss**. Row 0 is evicted (LRU).",
      "marks": [
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 8,
          "label": "a[2][0]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 1, 2"
        ],
        [
          "hits / misses",
          "6 / 3"
        ]
      ]
    },
    {
      "note": "`a[2][1]` → line of row 2: **hit**.",
      "marks": [
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 9,
          "label": "a[2][1]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 1, 2"
        ],
        [
          "hits / misses",
          "7 / 3"
        ]
      ]
    },
    {
      "note": "`a[2][2]` → line of row 2: **hit**.",
      "marks": [
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 10,
          "label": "a[2][2]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 1, 2"
        ],
        [
          "hits / misses",
          "8 / 3"
        ]
      ]
    },
    {
      "note": "`a[2][3]` → line of row 2: **hit**.",
      "marks": [
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 11,
          "label": "a[2][3]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 1, 2"
        ],
        [
          "hits / misses",
          "9 / 3"
        ]
      ]
    },
    {
      "note": "`a[3][0]` → line of row 3: **miss**. Row 1 is evicted (LRU).",
      "marks": [
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 12,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 12,
          "label": "a[3][0]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 2, 3"
        ],
        [
          "hits / misses",
          "9 / 4"
        ]
      ]
    },
    {
      "note": "`a[3][1]` → line of row 3: **hit**.",
      "marks": [
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 13,
          "label": "a[3][1]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 2, 3"
        ],
        [
          "hits / misses",
          "10 / 4"
        ]
      ]
    },
    {
      "note": "`a[3][2]` → line of row 3: **hit**.",
      "marks": [
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 14,
          "label": "a[3][2]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 2, 3"
        ],
        [
          "hits / misses",
          "11 / 4"
        ]
      ]
    },
    {
      "note": "`a[3][3]` → line of row 3: **hit**.",
      "marks": [
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "green"
        }
      ],
      "pointers": [
        {
          "index": 15,
          "label": "a[3][3]"
        }
      ],
      "lines": [
        1,
        2,
        3
      ],
      "vars": [
        [
          "cache holds",
          "rows 2, 3"
        ],
        [
          "hits / misses",
          "12 / 4"
        ]
      ]
    },
    {
      "note": "Row-major: **12 hits, 4 misses**. One miss per line, then three hits: every byte fetched is used.",
      "vars": [
        [
          "hits / misses",
          "12 / 4"
        ]
      ],
      "lines": [
        1,
        2,
        3
      ]
    },
    {
      "note": "Now column-major order, `j` outer and `i` inner, starting again with an empty cache.",
      "array": [
        "0,0",
        "0,1",
        "0,2",
        "0,3",
        "1,0",
        "1,1",
        "1,2",
        "1,3",
        "2,0",
        "2,1",
        "2,2",
        "2,3",
        "3,0",
        "3,1",
        "3,2",
        "3,3"
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "(empty)"
        ],
        [
          "hits / misses",
          "0 / 0"
        ]
      ]
    },
    {
      "note": "`a[0][0]` → line of row 0: **miss**.",
      "marks": [
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 0,
          "label": "a[0][0]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 0"
        ],
        [
          "hits / misses",
          "0 / 1"
        ]
      ]
    },
    {
      "note": "`a[1][0]` → line of row 1: **miss**.",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 4,
          "label": "a[1][0]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 1"
        ],
        [
          "hits / misses",
          "0 / 2"
        ]
      ]
    },
    {
      "note": "`a[2][0]` → line of row 2: **miss**. Row 0 is evicted (LRU).",
      "marks": [
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 8,
          "label": "a[2][0]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 1, 2"
        ],
        [
          "hits / misses",
          "0 / 3"
        ]
      ]
    },
    {
      "note": "`a[3][0]` → line of row 3: **miss**. Row 1 is evicted (LRU).",
      "marks": [
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 12,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 12,
          "label": "a[3][0]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 2, 3"
        ],
        [
          "hits / misses",
          "0 / 4"
        ]
      ]
    },
    {
      "note": "`a[0][1]` → line of row 0: **miss**. Row 2 is evicted (LRU).",
      "marks": [
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 1,
          "label": "a[0][1]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 3"
        ],
        [
          "hits / misses",
          "0 / 5"
        ]
      ]
    },
    {
      "note": "`a[1][1]` → line of row 1: **miss**. Row 3 is evicted (LRU).",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 5,
          "label": "a[1][1]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 1"
        ],
        [
          "hits / misses",
          "0 / 6"
        ]
      ]
    },
    {
      "note": "`a[2][1]` → line of row 2: **miss**. Row 0 is evicted (LRU).",
      "marks": [
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 9,
          "label": "a[2][1]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 1, 2"
        ],
        [
          "hits / misses",
          "0 / 7"
        ]
      ]
    },
    {
      "note": "`a[3][1]` → line of row 3: **miss**. Row 1 is evicted (LRU).",
      "marks": [
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 13,
          "label": "a[3][1]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 2, 3"
        ],
        [
          "hits / misses",
          "0 / 8"
        ]
      ]
    },
    {
      "note": "`a[0][2]` → line of row 0: **miss**. Row 2 is evicted (LRU).",
      "marks": [
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 2,
          "label": "a[0][2]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 3"
        ],
        [
          "hits / misses",
          "0 / 9"
        ]
      ]
    },
    {
      "note": "`a[1][2]` → line of row 1: **miss**. Row 3 is evicted (LRU).",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 6,
          "label": "a[1][2]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 1"
        ],
        [
          "hits / misses",
          "0 / 10"
        ]
      ]
    },
    {
      "note": "`a[2][2]` → line of row 2: **miss**. Row 0 is evicted (LRU).",
      "marks": [
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 10,
          "label": "a[2][2]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 1, 2"
        ],
        [
          "hits / misses",
          "0 / 11"
        ]
      ]
    },
    {
      "note": "`a[3][2]` → line of row 3: **miss**. Row 1 is evicted (LRU).",
      "marks": [
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 14,
          "label": "a[3][2]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 2, 3"
        ],
        [
          "hits / misses",
          "0 / 12"
        ]
      ]
    },
    {
      "note": "`a[0][3]` → line of row 0: **miss**. Row 2 is evicted (LRU).",
      "marks": [
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "blue"
        },
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 3,
          "label": "a[0][3]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 3"
        ],
        [
          "hits / misses",
          "0 / 13"
        ]
      ]
    },
    {
      "note": "`a[1][3]` → line of row 1: **miss**. Row 3 is evicted (LRU).",
      "marks": [
        {
          "index": 0,
          "color": "blue"
        },
        {
          "index": 1,
          "color": "blue"
        },
        {
          "index": 2,
          "color": "blue"
        },
        {
          "index": 3,
          "color": "blue"
        },
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 7,
          "label": "a[1][3]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 0, 1"
        ],
        [
          "hits / misses",
          "0 / 14"
        ]
      ]
    },
    {
      "note": "`a[2][3]` → line of row 2: **miss**. Row 0 is evicted (LRU).",
      "marks": [
        {
          "index": 4,
          "color": "blue"
        },
        {
          "index": 5,
          "color": "blue"
        },
        {
          "index": 6,
          "color": "blue"
        },
        {
          "index": 7,
          "color": "blue"
        },
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 11,
          "label": "a[2][3]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 1, 2"
        ],
        [
          "hits / misses",
          "0 / 15"
        ]
      ]
    },
    {
      "note": "`a[3][3]` → line of row 3: **miss**. Row 1 is evicted (LRU).",
      "marks": [
        {
          "index": 8,
          "color": "blue"
        },
        {
          "index": 9,
          "color": "blue"
        },
        {
          "index": 10,
          "color": "blue"
        },
        {
          "index": 11,
          "color": "blue"
        },
        {
          "index": 12,
          "color": "blue"
        },
        {
          "index": 13,
          "color": "blue"
        },
        {
          "index": 14,
          "color": "blue"
        },
        {
          "index": 15,
          "color": "red"
        }
      ],
      "pointers": [
        {
          "index": 15,
          "label": "a[3][3]"
        }
      ],
      "lines": [
        5,
        6,
        7
      ],
      "vars": [
        [
          "cache holds",
          "rows 2, 3"
        ],
        [
          "hits / misses",
          "0 / 16"
        ]
      ]
    },
    {
      "note": "Column-major: **0 hits, 16 misses**. Each line is evicted before the loop comes back for its next element, so every access misses.",
      "vars": [
        [
          "hits / misses",
          "0 / 16"
        ]
      ],
      "lines": [
        5,
        6,
        7
      ]
    }
  ],
  "code": "for (int i = 0; i < 4; ++i)       // row-major\n    for (int j = 0; j < 4; ++j)\n        sum += a[i][j];\n\nfor (int j = 0; j < 4; ++j)       // column-major\n    for (int i = 0; i < 4; ++i)\n        sum += a[i][j];",
  "caption": "Cells are the 16 elements in memory order (`i,j`). Blue = in the cache, green = hit, red = miss."
},
        {
          type: 'p',
          text: 'Now with real sizes: a 512 × 512 `int` matrix (1 MiB) summed through a 32 KiB, 8-way L1, using the simulator from the previous lesson trimmed to loads.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <vector>

// The simulator from the previous lesson, trimmed to loads:
// set-associative with true LRU, counting misses only.
struct Cache {
    std::uint64_t line, ways, sets, clock = 0, misses = 0;
    std::vector<std::uint64_t> tags, lastUse;  // 0 = empty
    Cache(std::uint64_t size, std::uint64_t lineB, std::uint64_t w)
        : line{lineB}, ways{w}, sets{size / (lineB * w)},
          tags(sets * w), lastUse(sets * w) {}
    void load(std::uint64_t addr) {
        const std::uint64_t block = addr / line;
        const std::uint64_t first = (block % sets) * ways;
        const std::uint64_t tag = block / sets + 1;  // never 0
        std::uint64_t victim = first;
        ++clock;
        for (std::uint64_t i = first; i < first + ways; ++i) {
            if (tags[i] == tag) { lastUse[i] = clock; return; }
            if (lastUse[i] < lastUse[victim]) victim = i;
        }
        ++misses;
        tags[victim] = tag;
        lastUse[victim] = clock;
    }
};

// Misses for summing an n x n int matrix whose rows are
// \`stride\` ints apart, on a 32 KiB 8-way L1 with 64 B lines.
std::uint64_t sum(std::uint64_t n, std::uint64_t stride,
                  bool rowMajor) {
    Cache l1{32 * 1024, 64, 8};
    for (std::uint64_t a = 0; a < n; ++a) {
        for (std::uint64_t b = 0; b < n; ++b) {
            const std::uint64_t i = rowMajor ? a : b;
            const std::uint64_t j = rowMajor ? b : a;
            l1.load((i * stride + j) * sizeof(int));
        }
    }
    return l1.misses;
}

int main() {
    const std::uint64_t n = 512;
    std::cout << "loads:            " << n * n << '\\n';
    std::cout << "row-major misses: " << sum(n, n, true) << '\\n';
    std::cout << "col-major misses: " << sum(n, n, false) << '\\n';
    std::cout << "col-major, rows padded to 520 ints: "
              << sum(n, 520, false) << '\\n';
}`,
          output: "loads:            262144\nrow-major misses: 16384\ncol-major misses: 262144\ncol-major, rows padded to 520 ints: 16640",
          annotations: [
            { lines: '7-27', text: 'The same LRU set-associative model as before, stripped to loads and a miss counter. Tags are stored plus one so that 0 can mean "empty".' },
            { lines: '34-38', text: 'One loop nest serves both orders: `rowMajor` decides whether the outer variable is the row or the column. The address is computed exactly as C++ lays out the matrix.' },
            { lines: 47, text: 'Row-major: 262,144 loads touch 16,384 lines once each. One miss per 16 ints, a 6.25% miss rate, and every one of them compulsory.' },
            { lines: 48, text: 'Column-major: **every single load misses**, 16× more than row-major.' },
            { lines: '49-50', text: 'The same column walk, but each row is padded with 8 unused ints (520 instead of 512).' },
          ],
        },
        {
          type: 'p',
          text: 'Column-major is bad for two separate reasons. First, each line brings 16 ints but the loop uses one before moving 2 KiB away, so the line must survive 512 other loads to be reused by the next column. Second, and worse here, the stride is 2048 bytes, a power of two. As the previous lesson showed, addresses that differ by multiples of 4 KiB land in the same set, and a 2 KiB stride uses only **2 of the 64 sets**: 16 lines of capacity for a 512-line column. Padding each row to 520 ints spreads the column over all 64 sets, and the misses drop from 262,144 to 16,640, almost the row-major ideal.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do power-of-two sizes cause trouble?',
          text: 'Set index bits are a slice of the address. A stride of 2ᵏ bytes leaves the low *k* address bits unchanged, so once 2ᵏ reaches the line size, every step changes fewer index bits, and at 4 KiB (for a 64-set cache) no index bits change at all: every access goes to the same set. Game and graphics data loves power-of-two sizes (1024-wide textures, 512-entry tables), so watch for column walks or interleaved arrays with such strides. Padding rows or offsetting arrays by a line or two breaks the pattern.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Know your library\'s layout',
          text: 'Not every library stores matrices row by row. glm stores a `mat4` as four columns, DirectXMath\'s `XMMATRIX` as four rows, and Fortran, MATLAB and many linear algebra libraries are column-major. On real hardware L2 catches part of the damage of a bad loop order, but for large data the right order is still commonly several times faster.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'numeric',
      prompt: 'A 1024 × 1024 `int` matrix is summed in row-major order through a cache with 64-byte lines. The matrix starts on a line boundary and nothing is cached at the start. How many cache misses occur? (Ignore prefetching.)',
      answer: 65536,
      alsoAccept: ['65_536', '2^16'],
      unit: 'misses',
      hint: 'In row-major order, each line is fetched once and then fully used.',
      explanation:
        'The matrix is 1024 × 1024 × 4 = 4 MiB = 4,194,304 bytes, which is 4,194,304 / 64 = **65,536 lines**. Row-major order fetches each line once and uses all 16 ints in it, so there is exactly one compulsory miss per line, a 1/16 = 6.25% miss rate. Column-major order on this matrix would miss on all 1,048,576 loads.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'AoS vs SoA for game entities',
      blocks: [
        {
          type: 'p',
          text: 'The natural object-oriented layout is an **array of structures (AoS)**: one `Entity` struct holding everything about an entity, and a `std::vector<Entity>`. But a system rarely needs everything. A movement update reads position and velocity; a health-regeneration pass reads health. Every other byte in the line is fetched, cached and evicted for nothing. The alternative is a **[[structure-of-arrays]] (SoA)**: one array per field.',
        },
        {
          type: 'figure',
          svg: `<svg viewBox="0 0 520 272" xmlns="http://www.w3.org/2000/svg"><text x="20" y="16" font-size="12.5" text-anchor="start" font-weight="700">Array of structures (AoS): one 64-byte Entity per line</text><text x="84" y="43" font-size="11.5" text-anchor="end" font-weight="600">line 0</text><text x="84" y="56" font-size="10" text-anchor="end" class="t-gray">entity 0</text><rect x="92" y="26" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="92" y="26" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="105" y="43" font-size="10.5" text-anchor="middle">x</text><rect x="118" y="26" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="118" y="26" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="131" y="43" font-size="10.5" text-anchor="middle">y</text><rect x="144" y="26" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="144" y="26" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="157" y="43" font-size="10.5" text-anchor="middle">z</text><rect x="170" y="26" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="170" y="26" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="183" y="43" font-size="10.5" text-anchor="middle">vx</text><rect x="196" y="26" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="196" y="26" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="209" y="43" font-size="10.5" text-anchor="middle">vy</text><rect x="222" y="26" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="222" y="26" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="235" y="43" font-size="10.5" text-anchor="middle">vz</text><rect x="248" y="26" width="26" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="261" y="43" font-size="10.5" text-anchor="middle">hp</text><rect x="274" y="26" width="26" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="287" y="43" font-size="10.5" text-anchor="middle">ar</text><rect x="300" y="26" width="26" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="313" y="43" font-size="10.5" text-anchor="middle">tm</text><rect x="326" y="26" width="26" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="339" y="43" font-size="10.5" text-anchor="middle">fl</text><rect x="352" y="26" width="156" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="430" y="43" font-size="11" text-anchor="middle">name[24]</text><text x="84" y="75" font-size="11.5" text-anchor="end" font-weight="600">line 1</text><text x="84" y="88" font-size="10" text-anchor="end" class="t-gray">entity 1</text><rect x="92" y="58" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="92" y="58" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="105" y="75" font-size="10.5" text-anchor="middle">x</text><rect x="118" y="58" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="118" y="58" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="131" y="75" font-size="10.5" text-anchor="middle">y</text><rect x="144" y="58" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="144" y="58" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="157" y="75" font-size="10.5" text-anchor="middle">z</text><rect x="170" y="58" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="170" y="58" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="183" y="75" font-size="10.5" text-anchor="middle">vx</text><rect x="196" y="58" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="196" y="58" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="209" y="75" font-size="10.5" text-anchor="middle">vy</text><rect x="222" y="58" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="222" y="58" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="235" y="75" font-size="10.5" text-anchor="middle">vz</text><rect x="248" y="58" width="26" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="261" y="75" font-size="10.5" text-anchor="middle">hp</text><rect x="274" y="58" width="26" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="287" y="75" font-size="10.5" text-anchor="middle">ar</text><rect x="300" y="58" width="26" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="313" y="75" font-size="10.5" text-anchor="middle">tm</text><rect x="326" y="58" width="26" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="339" y="75" font-size="10.5" text-anchor="middle">fl</text><rect x="352" y="58" width="156" height="26" rx="2" fill="none" class="s-gray" stroke-width="1"/><text x="430" y="75" font-size="11" text-anchor="middle">name[24]</text><text x="300" y="104" font-size="11.5" text-anchor="middle" class="t-blue">movement uses 24 of every 64 bytes fetched (37.5%)</text><line x1="20" y1="118" x2="500" y2="118" class="s-gray" stroke-width="0.8"/><text x="20" y="140" font-size="12.5" text-anchor="start" font-weight="700">Structure of arrays (SoA): one array per field</text><text x="84" y="167" font-size="11.5" text-anchor="end" font-weight="600">x[] line</text><rect x="92" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="92" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="105" y="167" font-size="10.5" text-anchor="middle">x0</text><rect x="118" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="118" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="131" y="167" font-size="10.5" text-anchor="middle">x1</text><rect x="144" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="144" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="157" y="167" font-size="10.5" text-anchor="middle">x2</text><rect x="170" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="170" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="183" y="167" font-size="10.5" text-anchor="middle">x3</text><rect x="196" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="196" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="209" y="167" font-size="10.5" text-anchor="middle">x4</text><rect x="222" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="222" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="235" y="167" font-size="10.5" text-anchor="middle">x5</text><rect x="248" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="248" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="261" y="167" font-size="10.5" text-anchor="middle">x6</text><rect x="274" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="274" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="287" y="167" font-size="10.5" text-anchor="middle">x7</text><rect x="300" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="300" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="313" y="167" font-size="10.5" text-anchor="middle">x8</text><rect x="326" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="326" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="339" y="167" font-size="10.5" text-anchor="middle">x9</text><rect x="352" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="352" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="365" y="167" font-size="10.5" text-anchor="middle">x10</text><rect x="378" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="378" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="391" y="167" font-size="10.5" text-anchor="middle">x11</text><rect x="404" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="404" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="417" y="167" font-size="10.5" text-anchor="middle">x12</text><rect x="430" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="430" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="443" y="167" font-size="10.5" text-anchor="middle">x13</text><rect x="456" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="456" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="469" y="167" font-size="10.5" text-anchor="middle">x14</text><rect x="482" y="150" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="482" y="150" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="495" y="167" font-size="10.5" text-anchor="middle">x15</text><text x="84" y="199" font-size="11.5" text-anchor="end" font-weight="600">y[] line</text><rect x="92" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="92" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="105" y="199" font-size="10.5" text-anchor="middle">y0</text><rect x="118" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="118" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="131" y="199" font-size="10.5" text-anchor="middle">y1</text><rect x="144" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="144" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="157" y="199" font-size="10.5" text-anchor="middle">y2</text><rect x="170" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="170" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="183" y="199" font-size="10.5" text-anchor="middle">y3</text><rect x="196" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="196" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="209" y="199" font-size="10.5" text-anchor="middle">y4</text><rect x="222" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="222" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="235" y="199" font-size="10.5" text-anchor="middle">y5</text><rect x="248" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="248" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="261" y="199" font-size="10.5" text-anchor="middle">y6</text><rect x="274" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="274" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="287" y="199" font-size="10.5" text-anchor="middle">y7</text><rect x="300" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="300" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="313" y="199" font-size="10.5" text-anchor="middle">y8</text><rect x="326" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="326" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="339" y="199" font-size="10.5" text-anchor="middle">y9</text><rect x="352" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="352" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="365" y="199" font-size="10.5" text-anchor="middle">y10</text><rect x="378" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="378" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="391" y="199" font-size="10.5" text-anchor="middle">y11</text><rect x="404" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="404" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="417" y="199" font-size="10.5" text-anchor="middle">y12</text><rect x="430" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="430" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="443" y="199" font-size="10.5" text-anchor="middle">y13</text><rect x="456" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="456" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="469" y="199" font-size="10.5" text-anchor="middle">y14</text><rect x="482" y="182" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="482" y="182" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="495" y="199" font-size="10.5" text-anchor="middle">y15</text><text x="84" y="231" font-size="11.5" text-anchor="end" font-weight="600">vz[] line</text><rect x="92" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="92" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="105" y="231" font-size="10.5" text-anchor="middle">vz0</text><rect x="118" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="118" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="131" y="231" font-size="10.5" text-anchor="middle">vz1</text><rect x="144" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="144" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="157" y="231" font-size="10.5" text-anchor="middle">vz2</text><rect x="170" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="170" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="183" y="231" font-size="10.5" text-anchor="middle">vz3</text><rect x="196" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="196" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="209" y="231" font-size="10.5" text-anchor="middle">vz4</text><rect x="222" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="222" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="235" y="231" font-size="10.5" text-anchor="middle">vz5</text><rect x="248" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="248" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="261" y="231" font-size="10.5" text-anchor="middle">vz6</text><rect x="274" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="274" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="287" y="231" font-size="10.5" text-anchor="middle">vz7</text><rect x="300" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="300" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="313" y="231" font-size="10.5" text-anchor="middle">vz8</text><rect x="326" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="326" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="339" y="231" font-size="10.5" text-anchor="middle">vz9</text><rect x="352" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="352" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="365" y="231" font-size="10.5" text-anchor="middle">vz10</text><rect x="378" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="378" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="391" y="231" font-size="10.5" text-anchor="middle">vz11</text><rect x="404" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="404" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="417" y="231" font-size="10.5" text-anchor="middle">vz12</text><rect x="430" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="430" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="443" y="231" font-size="10.5" text-anchor="middle">vz13</text><rect x="456" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="456" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="469" y="231" font-size="10.5" text-anchor="middle">vz14</text><rect x="482" y="214" width="26" height="26" rx="2" class="f-blue" fill-opacity="0.22"/><rect x="482" y="214" width="26" height="26" rx="2" fill="none" class="s-blue" stroke-width="1"/><text x="495" y="231" font-size="10.5" text-anchor="middle">vz15</text><text x="300" y="260" font-size="11.5" text-anchor="middle" class="t-blue">… six arrays · every byte fetched is used (100%)</text></svg>`,
          alt: 'Two rows show AoS cache lines, each containing one entity: x, y, z, vx, vy, vz highlighted, and health, armor, team, flags and name not highlighted. Below, SoA lines for the x, y and vz arrays contain sixteen consecutive values each, all highlighted.',
          caption: 'Highlighted bytes are the ones a movement update actually uses.',
        },
        {
          type: 'compare',
          left: {
            title: 'AoS: one struct per entity',
            tone: 'neutral',
            code: `struct Entity {
    float x, y, z, vx, vy, vz;
    float health, armor;
    std::uint32_t team, flags;
    char name[24];
};
std::vector<Entity> es;

for (Entity& e : es) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.z += e.vz * dt;
}`,
            text: 'Natural to write and good when code uses most fields of one entity together.',
          },
          right: {
            title: 'SoA: one array per field',
            tone: 'good',
            code: `struct Entities {
    std::vector<float> x, y, z;
    std::vector<float> vx, vy, vz;
    std::vector<float> health, armor;
    // team, flags, names...
};

for (std::size_t i = 0; i < n; ++i) {
    E.x[i] += E.vx[i] * dt;
    E.y[i] += E.vy[i] * dt;
    E.z[i] += E.vz[i] * dt;
}`,
            text: 'Every fetched byte is used, the loop is trivially vectorizable, and adding a field costs nothing for systems that ignore it.',
          },
        },
        {
          type: 'p',
          text: 'Counting misses for 10,000 entities, each pass starting cold:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstddef>
#include <cstdint>
#include <iostream>
#include <vector>

// The simulator from the previous lesson, trimmed to loads:
// set-associative with true LRU, counting misses only.
struct Cache {
    std::uint64_t line, ways, sets, clock = 0, misses = 0;
    std::vector<std::uint64_t> tags, lastUse;  // 0 = empty
    Cache(std::uint64_t size, std::uint64_t lineB, std::uint64_t w)
        : line{lineB}, ways{w}, sets{size / (lineB * w)},
          tags(sets * w), lastUse(sets * w) {}
    void load(std::uint64_t addr) {
        const std::uint64_t block = addr / line;
        const std::uint64_t first = (block % sets) * ways;
        const std::uint64_t tag = block / sets + 1;  // never 0
        std::uint64_t victim = first;
        ++clock;
        for (std::uint64_t i = first; i < first + ways; ++i) {
            if (tags[i] == tag) { lastUse[i] = clock; return; }
            if (lastUse[i] < lastUse[victim]) victim = i;
        }
        ++misses;
        tags[victim] = tag;
        lastUse[victim] = clock;
    }
};

struct Entity {                  // array of structures (AoS)
    float x, y, z;               // position
    float vx, vy, vz;            // velocity
    float health, armor;
    std::uint32_t team, flags;
    char name[24];
};
static_assert(sizeof(Entity) == 64);

int main() {
    const std::uint64_t n = 10'000;
    Cache aosMove{32 * 1024, 64, 8}, aosHeal{32 * 1024, 64, 8};
    for (std::uint64_t i = 0; i < n; ++i) {
        const std::uint64_t e = i * sizeof(Entity);
        for (std::uint64_t f = 0; f < 6; ++f) {  // x..vz
            aosMove.load(e + f * sizeof(float));
        }
        aosHeal.load(e + offsetof(Entity, health));
    }

    // Structure of arrays (SoA): one array per field, each
    // n floats long, laid out one after another.
    auto field = [n](std::uint64_t k, std::uint64_t i) {
        return (k * n + i) * sizeof(float);
    };
    Cache soaMove{32 * 1024, 64, 8}, soaHeal{32 * 1024, 64, 8};
    for (std::uint64_t i = 0; i < n; ++i) {
        for (std::uint64_t k = 0; k < 6; ++k) {  // x..vz arrays
            soaMove.load(field(k, i));
        }
        soaHeal.load(field(6, i));               // health array
    }
    std::cout << "move: AoS " << aosMove.misses << " misses, SoA "
              << soaMove.misses << '\\n';
    std::cout << "heal: AoS " << aosHeal.misses << " misses, SoA "
              << soaHeal.misses << '\\n';
}`,
          output: "move: AoS 10000 misses, SoA 3750\nheal: AoS 10000 misses, SoA 625",
          annotations: [
            { lines: '30-37', text: 'Exactly 64 bytes, so each entity occupies one full line when the array is line-aligned. The `static_assert` documents and enforces that.' },
            { lines: '44-47', text: 'AoS: movement reads the first six floats; healing reads `health` via `offsetof`. Either way, every entity costs a whole line.' },
            { lines: '52-54', text: 'SoA addresses: field array `k` starts after `k` other arrays of `n` floats.' },
            { lines: 62, text: 'Movement: 10,000 misses vs 3,750. Six streams of floats, each needing one line per 16 entities: 6 × 625.' },
            { lines: 64, text: 'Healing: 10,000 vs 625, a 16× difference, because AoS fetches 64 bytes to use 4.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why engines moved to data-oriented layouts',
          text: 'A frame runs a handful of systems over thousands of entities, each touching a few fields. AoS makes every system pay for every field; SoA lets each system stream exactly the data it needs. SoA also suits SIMD: `x[i..i+7]` loads straight into one AVX register, as the SIMD lesson showed. This is the core of **[[data-oriented-design]]**, and of the **[[entity-component-system]]** architectures (Unity DOTS, Unreal\'s Mass, EnTT, flecs) that group each component type into contiguous arrays. The trade-off: code that needs *many* fields of *one* entity, such as a detailed AI decision, now touches many arrays. Some engines use **AoSoA**, small SoA blocks of 4–16 entities, to get both.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Mass Entity',
          text: 'Unreal\'s Mass framework stores entity data as small structs called *fragments*, grouped by archetype into fixed-size chunks so that a processor iterates contiguous arrays of exactly the fragments it asks for. It is how Unreal handles crowds of tens of thousands of agents, for the reasons in this lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'numeric',
      prompt: 'A game stores 12,000 enemies in SoA form. A regeneration pass reads only the `health` array (`float`, line-aligned). How many cache lines does the pass touch?',
      answer: 750,
      unit: 'lines',
      hint: 'How many floats fit in one 64-byte line?',
      explanation:
        'The health array is 12,000 × 4 = 48,000 bytes = 48,000 / 64 = **750 lines**. With a 64-byte AoS `Enemy`, the same pass would touch 12,000 lines (one per enemy) and use 4 bytes of each: 16× the memory traffic for identical work.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Pointer chasing vs contiguous arrays',
      blocks: [
        {
          type: 'p',
          text: 'Linked lists, trees, `std::map`, `std::unordered_map` buckets, and `std::vector<std::unique_ptr<Enemy>>` all reach the next element through a pointer. Nodes allocated at different times end up scattered across the heap. Simulating a 100,000-node list (16-byte nodes) walked in allocation order and in scattered order:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <random>
#include <utility>
#include <vector>

// The simulator from the previous lesson, trimmed to loads:
// set-associative with true LRU, counting misses only.
struct Cache {
    std::uint64_t line, ways, sets, clock = 0, misses = 0;
    std::vector<std::uint64_t> tags, lastUse;  // 0 = empty
    Cache(std::uint64_t size, std::uint64_t lineB, std::uint64_t w)
        : line{lineB}, ways{w}, sets{size / (lineB * w)},
          tags(sets * w), lastUse(sets * w) {}
    void load(std::uint64_t addr) {
        const std::uint64_t block = addr / line;
        const std::uint64_t first = (block % sets) * ways;
        const std::uint64_t tag = block / sets + 1;  // never 0
        std::uint64_t victim = first;
        ++clock;
        for (std::uint64_t i = first; i < first + ways; ++i) {
            if (tags[i] == tag) { lastUse[i] = clock; return; }
            if (lastUse[i] < lastUse[victim]) victim = i;
        }
        ++misses;
        tags[victim] = tag;
        lastUse[victim] = clock;
    }
};

struct Node {                     // a singly linked list node
    Node* next;
    int value;
};                                // 16 bytes with padding

int main() {
    const std::uint64_t n = 100'000;
    // order[k] = which pool slot holds the k-th node of the list
    std::vector<std::uint64_t> order(n);
    for (std::uint64_t k = 0; k < n; ++k) order[k] = k;

    Cache packed{32 * 1024, 64, 8};
    for (std::uint64_t k = 0; k < n; ++k) {
        packed.load(order[k] * sizeof(Node));
    }

    // Nodes allocated over time end up scattered: shuffle them.
    std::mt19937 rng{2024};
    for (std::uint64_t k = n - 1; k > 0; --k) {
        std::swap(order[k], order[rng() % (k + 1)]);
    }
    Cache scattered{32 * 1024, 64, 8};
    for (std::uint64_t k = 0; k < n; ++k) {
        scattered.load(order[k] * sizeof(Node));
    }
    std::cout << "nodes in order:  " << packed.misses << " misses\\n";
    std::cout << "nodes scattered: " << scattered.misses
              << " misses\\n";
}`,
          output: "nodes in order:  25000 misses\nnodes scattered: 98513 misses",
          annotations: [
            { lines: '31-34', text: '8 bytes of pointer + 4 bytes of value + 4 bytes of padding for the pointer\'s alignment: four nodes per line.' },
            { lines: '42-45', text: 'A freshly built list from a pool: node *k* lives in slot *k*, so the walk is sequential, one miss per four nodes.' },
            { lines: '48-51', text: 'A Fisher–Yates shuffle with a fixed seed. `std::mt19937`\'s output is fully specified by the standard, so this is reproducible everywhere (unlike `std::shuffle` or the distributions, whose algorithms vary between libraries).' },
            { lines: 57, text: 'Scattered: almost every node is a miss. A 1.6 MB list cannot stay in a 32 KiB cache, and neighbours in the list are not neighbours in memory.' },
          ],
        },
        {
          type: 'p',
          text: 'The miss count is four times higher, but reality is **worse than the count suggests**. In a contiguous array, the address of element `i + 10` is known now, so an out-of-order core can issue ten misses at once and wait for all of them together. In a list, the address of the next node is *inside* the current node: the core cannot even start the next load until this one returns. That chain of **dependent loads** is called **[[pointer-chasing]]**, and it turns every miss into a full, serialized trip to memory.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why arrays beat lists even at Big-O\'s own game',
          text: 'Inserting into the middle of a vector is O(n) and into a list O(1), yet for thousands of elements the vector usually wins: shifting contiguous memory streams at tens of GB/s, while finding the insertion point in a list is a chain of serialized misses. Bjarne Stroustrup has demonstrated this repeatedly in talks. Use contiguous containers by default; reach for nodes only when you truly need stable addresses or very large elements.',
        },
        {
          type: 'list',
          items: [
            '**Store by value**: `std::vector<Enemy>` instead of `std::vector<std::unique_ptr<Enemy>>` when the type is known.',
            '**Group polymorphic objects by type**: one array per concrete type, updated in turn. That also makes the virtual call predictable or removes it entirely.',
            '**Use indices instead of pointers**: a 32-bit index into a vector is half the size of a pointer and survives reallocation.',
            '**Allocate related nodes together** from a pool or arena when you must keep a linked structure.',
            '**Prefer flat associative containers** (sorted vectors, C++23 `std::flat_map`, open-addressing hash tables) for lookup-heavy data.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'Two loops each take 10,000 cache misses: one sums a large array using precomputed random indices (`sum += data[idx[i]]`), the other walks a scattered linked list (`p = p->next`). Why is the linked-list loop typically much slower?',
      options: [
        {
          text: 'Each list node is bigger than an array element, so each miss transfers more bytes',
          why: 'A miss always transfers one 64-byte line, whatever the element size. Both loops move the same amount of data per miss.',
        },
        {
          text: 'The list\'s loads are dependent: the next address is only known when the current load returns, so misses cannot overlap',
          correct: true,
          why: 'With `idx[]` known in advance, the out-of-order core issues many independent misses at once (memory-level parallelism). A list forces one full memory round trip after another.',
        },
        {
          text: 'Linked lists cause more branch mispredictions, and those dominate the time',
          why: 'The loop-exit branch of a list walk is predictable until the end. The cost is waiting for memory, not mispredicted branches.',
        },
        {
          text: 'The hardware prefetcher makes the array loop free, so only the list loop pays for its misses',
          why: 'Random indices defeat the stride and stream prefetchers too. The array loop still misses; its misses just overlap with each other.',
        },
      ],
      explanation:
        'Equal miss counts do not mean equal time. What matters is how many misses are **in flight at once**. Independent loads can overlap, roughly dividing their cost by the number of outstanding misses the core supports. Dependent loads serialize, so each costs the full latency. This is why hash-table probing, tree descent and list walks are latency-bound, and why the fixes all remove the dependency or the scattering.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Prefetching: hardware and software',
      blocks: [
        {
          type: 'p',
          text: 'A **[[prefetching|prefetch]]** fetches a line *before* the program asks for it, so that the demand load hits. Every modern CPU has several **hardware prefetchers** watching the stream of misses: a *next-line* prefetcher that fetches the line after a miss, *stride* prefetchers that learn "this load instruction advances by 48 bytes each time", and *stream* prefetchers in L2 that detect ascending or descending runs and race ahead of them. Since physical pages are not contiguous, these typically stop at 4 KiB page boundaries and have to re-detect the stream in the next page.',
        },
        {
          type: 'p',
          text: 'The simplest useful design is a **tagged next-line prefetcher**: a miss on line *L*, or the first use of a line that was brought in by a prefetch, requests line *L + 1*. Adding one to the simulator shows what prefetchers can and cannot do:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <random>
#include <utility>
#include <vector>

// LRU cache plus an optional "tagged next-line" prefetcher:
// a miss on line L, or the first use of a prefetched line L,
// asks for line L + 1 in advance. (Timing is not modelled.)
struct Cache {
    std::uint64_t ways, sets, clock = 0, misses = 0, issued = 0;
    std::vector<std::uint64_t> tags, lastUse;
    std::vector<bool> early;      // fetched by the prefetcher
    bool prefetcher;
    Cache(std::uint64_t lines, std::uint64_t w, bool pf)
        : ways{w}, sets{lines / w}, tags(lines), lastUse(lines),
          early(lines), prefetcher{pf} {}

    // Returns the slot holding \`block\`, inserting it on a miss.
    std::uint64_t find(std::uint64_t block, bool& hit) {
        const std::uint64_t first = (block % sets) * ways;
        const std::uint64_t tag = block / sets + 1;
        std::uint64_t victim = first;
        for (std::uint64_t i = first; i < first + ways; ++i) {
            if (tags[i] == tag) { hit = true; return i; }
            if (lastUse[i] < lastUse[victim]) victim = i;
        }
        hit = false;
        tags[victim] = tag;
        return victim;
    }
    void prefetch(std::uint64_t block) {
        bool hit;
        const std::uint64_t i = find(block, hit);
        if (!hit) { ++issued; early[i] = true; lastUse[i] = ++clock; }
    }
    void load(std::uint64_t addr) {
        bool hit;
        const std::uint64_t block = addr / 64;
        const std::uint64_t i = find(block, hit);
        lastUse[i] = ++clock;
        if (!hit) { ++misses; early[i] = false; }
        const bool trigger = !hit || early[i];
        early[i] = false;
        if (prefetcher && trigger) prefetch(block + 1);
    }
};

template <typename Pattern>
void compare(const char* name, Pattern pattern) {
    Cache off{512, 8, false}, on{512, 8, true};   // 32 KiB
    pattern(off);
    pattern(on);
    std::cout << name << ": " << off.misses << " -> " << on.misses
              << " misses (" << on.issued << " prefetches)\\n";
}

int main() {
    const std::uint64_t n = 262'144;              // 1 MiB of ints
    compare("sequential   ", [&](Cache& c) {
        for (std::uint64_t i = 0; i < n; ++i) c.load(i * 4);
    });
    compare("stride 4 KiB ", [&](Cache& c) {
        for (std::uint64_t j = 0; j < 1024; ++j)
            for (std::uint64_t i = 0; i < 256; ++i)
                c.load(i * 4096 + j * 4);
    });
    std::vector<std::uint64_t> order(n / 16);     // one per line
    for (std::uint64_t k = 0; k < order.size(); ++k) order[k] = k;
    std::mt19937 rng{7};
    for (std::uint64_t k = order.size() - 1; k > 0; --k)
        std::swap(order[k], order[rng() % (k + 1)]);
    compare("random lines ", [&](Cache& c) {
        for (std::uint64_t line : order) c.load(line * 64);
    });
}`,
          output: "sequential   : 16384 -> 1 misses (16384 prefetches)\nstride 4 KiB : 262144 -> 262144 misses (262144 prefetches)\nrandom lines : 16384 -> 16121 misses (16142 prefetches)",
          annotations: [
            { lines: 13, text: '`early` marks lines brought in by the prefetcher that the program has not used yet. Their first use re-triggers the prefetcher, keeping it one line ahead of a stream.' },
            { lines: '32-36', text: 'A prefetch inserts the line like a miss would, but it is not counted as a miss: no instruction was waiting for it.' },
            { lines: '37-45', text: 'A demand load. On a miss, or on the first use of a prefetched line, the next line is requested.' },
            { lines: '60-62', text: 'Sequential: after the very first miss, the prefetcher always stays one line ahead. 16,384 misses become 1.' },
            { lines: '63-67', text: 'A 4 KiB stride: line *L + 1* is never the one needed next. Every prefetch is wasted bandwidth and pollutes the cache.' },
            { lines: '73-75', text: 'Random lines: prefetching the neighbour helps only when, by luck, the neighbour is visited while it is still cached.' },
          ],
        },
        {
          type: 'p',
          text: 'This model ignores timing; a real prefetch only helps if it arrives before the load needs it, which is why hardware prefetchers run several lines ahead. When the pattern is irregular but **known to your code**, such as a list of indices, you can issue a **software prefetch**:',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstddef>
#include <cstdint>
#include <iostream>
#include <vector>

struct Particle {
    float x, y, z, life;
};

// Sum the life of the live particles, listed by index.
// The indices jump around, so the hardware cannot guess the
// next address, but we can: it is alive[i + kAhead].
float totalLife(const std::vector<Particle>& ps,
                const std::vector<std::uint32_t>& alive) {
    constexpr std::size_t kAhead = 16;    // prefetch distance
    float sum = 0.0f;
    for (std::size_t i = 0; i < alive.size(); ++i) {
        if (i + kAhead < alive.size()) {
            __builtin_prefetch(&ps[alive[i + kAhead]]);
        }
        sum += ps[alive[i]].life;
    }
    return sum;
}

int main() {
    std::vector<Particle> ps(100'000, Particle{0, 0, 0, 0.5f});
    std::vector<std::uint32_t> alive;
    for (std::uint32_t i = 0; i < ps.size(); i += 7) {
        alive.push_back((i * 7919u) % ps.size());  // scattered
    }
    std::cout << alive.size() << " live particles, total life "
              << totalLife(ps, alive) << '\\n';
}`,
          output: "14286 live particles, total life 7143",
          annotations: [
            { lines: 15, text: 'The **prefetch distance**: far enough ahead that the line arrives in time (latency ÷ time per iteration), but not so far that it is evicted again before use. Tune it by measuring.' },
            { lines: 19, text: '`__builtin_prefetch` (GCC and Clang) compiles to an x86 `prefetcht0` instruction: a hint, not a load. It never faults, even on a bad address, and the CPU may drop it under load. MSVC spells it `_mm_prefetch(p, _MM_HINT_T0)` from `<xmmintrin.h>`.' },
            { lines: 21, text: 'The real load. If the prefetch 16 iterations ago has completed, this hits.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Prefetch only what the hardware cannot predict',
          text: 'Software prefetches cost instructions, load-queue slots and bandwidth. For sequential and simple strided loops, hardware prefetchers already do the job, and extra prefetches usually make code slower. They help for gathers through index lists, hash-table probes you can compute early, and walking a tree level whose children you know. Always measure before and after.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'truefalse',
      prompt: 'Placing `__builtin_prefetch(&data[i])` on the line immediately before `sum += data[i];` makes that load much faster when `data[i]` is not cached.',
      answer: false,
      explanation:
        'A prefetch cannot make memory faster; it can only start the wait earlier. Issued one instruction before the load, it overlaps almost nothing, and the load still waits ~100 ns, now with an extra instruction in the way. Prefetches must be issued a **distance** ahead, roughly the miss latency divided by the time per iteration, such as `data[idx[i + 16]]`, so the line arrives just in time.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Loop tiling: reuse data while it is cached',
      blocks: [
        {
          type: 'p',
          text: 'Some algorithms *must* touch data in two orders. Transposing a matrix reads `A` row by row and writes `B` column by column; matrix multiplication walks one input by rows and the other by columns. No loop order makes both sequential. **[[loop-tiling|Loop tiling]]** (also called *blocking*) splits the iteration space into small tiles and finishes a whole tile before moving on, so the lines of both matrices that a tile uses are reused while they are still cached.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <algorithm>
#include <cstdint>
#include <iostream>
#include <vector>

// The simulator from the previous lesson, trimmed to loads:
// set-associative with true LRU, counting misses only.
struct Cache {
    std::uint64_t line, ways, sets, clock = 0, misses = 0;
    std::vector<std::uint64_t> tags, lastUse;  // 0 = empty
    Cache(std::uint64_t size, std::uint64_t lineB, std::uint64_t w)
        : line{lineB}, ways{w}, sets{size / (lineB * w)},
          tags(sets * w), lastUse(sets * w) {}
    void load(std::uint64_t addr) {
        const std::uint64_t block = addr / line;
        const std::uint64_t first = (block % sets) * ways;
        const std::uint64_t tag = block / sets + 1;  // never 0
        std::uint64_t victim = first;
        ++clock;
        for (std::uint64_t i = first; i < first + ways; ++i) {
            if (tags[i] == tag) { lastUse[i] = clock; return; }
            if (lastUse[i] < lastUse[victim]) victim = i;
        }
        ++misses;
        tags[victim] = tag;
        lastUse[victim] = clock;
    }
};

const std::uint64_t n = 1000;                 // n x n floats
const std::uint64_t srcBase = 0;              // matrix A
const std::uint64_t dstBase = n * n * 4;      // matrix B

// B[j][i] = A[i][j] for the block of rows [i0, i1) and
// columns [j0, j1).
void block(Cache& c, std::uint64_t i0, std::uint64_t i1,
           std::uint64_t j0, std::uint64_t j1) {
    for (std::uint64_t i = i0; i < i1; ++i) {
        for (std::uint64_t j = j0; j < j1; ++j) {
            c.load(srcBase + (i * n + j) * 4);  // read A[i][j]
            c.load(dstBase + (j * n + i) * 4);  // write B[j][i]
        }
    }
}

std::uint64_t transpose(std::uint64_t tile) {
    Cache l1{32 * 1024, 64, 8};
    for (std::uint64_t ii = 0; ii < n; ii += tile) {
        for (std::uint64_t jj = 0; jj < n; jj += tile) {
            block(l1, ii, std::min(ii + tile, n),
                  jj, std::min(jj + tile, n));
        }
    }
    return l1.misses;
}

int main() {
    std::cout << "naive:    " << transpose(n) << " misses\\n";
    for (std::uint64_t t : {8, 16, 32, 64}) {
        std::cout << "tile " << t << ": " << (t < 10 ? " " : "")
                  << transpose(t) << " misses\\n";
    }
    std::cout << "minimum:  " << 2 * n * n * 4 / 64
              << " (every line of A and B once)\\n";
}`,
          output: "naive:    1062500 misses\ntile 8:  188000 misses\ntile 16: 157000 misses\ntile 32: 141500 misses\ntile 64: 137177 misses\nminimum:  125000 (every line of A and B once)",
          annotations: [
            { lines: '36-44', text: 'The kernel transposes one rectangle. Writes are modelled as accesses, which is accurate for a write-allocate cache: a store miss fetches the line too.' },
            { lines: '46-55', text: 'The two outer loops step from tile to tile. With `tile == n` the whole matrix is one tile, which is the naive transpose.' },
            { lines: 58, text: 'Naive: reading `A` is sequential (62,500 misses), but writing `B` down a column misses on every element.' },
            { lines: '59-62', text: 'With 32 × 32 tiles, each tile touches 64 lines of `A` (32 rows × 128 bytes) and 64 lines of `B`, 8 KiB in all, which stay cached while the tile finishes: 7.5× fewer misses than naive.' },
            { lines: '63-64', text: 'The floor is one compulsory miss per line of `A` and `B`: 125,000. With 32 × 32 tiles the count is only about 13% above it.' },
          ],
        },
        {
          type: 'p',
          text: 'Pick the tile so that everything a tile touches fits comfortably in the target cache: here, two 32 × 32 float tiles are 8 KiB, a quarter of L1, leaving room for everything else the program uses. Larger tiles look better in this idealized model, which gives the transpose the whole cache, but in real code they start fighting with other data. Tiling for L2 or L3 as well, with nested tiles, is how optimized matrix libraries reach near-peak performance.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Tiling in games and GPUs',
          text: 'The same idea appears all over graphics. GPUs store textures *swizzled* in small tiles or along a Morton (Z-order) curve, so that a 2D neighbourhood of texels sits in a few nearby lines, whichever direction the sampler moves. Image filters, light culling over screen tiles and terrain processing all benefit from tile-by-tile loops on the CPU too.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'numeric',
      prompt: 'A tiled matrix multiplication keeps one B × B tile of each of **three** `double` matrices in a 32 KiB L1 cache. What is the largest **power of two** B for which the three tiles fit?',
      answer: 32,
      hint: 'Write the condition 3 × B² × 8 bytes ≤ 32,768 bytes and solve for B.',
      explanation:
        '3 × B² × 8 ≤ 32,768 gives B² ≤ 1365.3, so B ≤ 36.9. The largest power of two below that is **32**: three 32 × 32 tiles of doubles take 24 KiB, three quarters of L1. In practice you would also test 16 (6 KiB), because the tiles are not the only data in the cache and set conflicts eat into the usable capacity.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Hot/cold splitting',
      blocks: [
        {
          type: 'p',
          text: 'SoA is not all-or-nothing. A lighter technique is **[[hot-cold-splitting]]**: keep the fields that are used every frame (hot) together in a compact struct, and move rarely used fields (cold) to a separate array, linked by an index.',
        },
        {
          type: 'code',
          runnable: true,
          code: `#include <cstdint>
#include <iostream>
#include <vector>

// The simulator from the previous lesson, trimmed to loads:
// set-associative with true LRU, counting misses only.
struct Cache {
    std::uint64_t line, ways, sets, clock = 0, misses = 0;
    std::vector<std::uint64_t> tags, lastUse;  // 0 = empty
    Cache(std::uint64_t size, std::uint64_t lineB, std::uint64_t w)
        : line{lineB}, ways{w}, sets{size / (lineB * w)},
          tags(sets * w), lastUse(sets * w) {}
    void load(std::uint64_t addr) {
        const std::uint64_t block = addr / line;
        const std::uint64_t first = (block % sets) * ways;
        const std::uint64_t tag = block / sets + 1;  // never 0
        std::uint64_t victim = first;
        ++clock;
        for (std::uint64_t i = first; i < first + ways; ++i) {
            if (tags[i] == tag) { lastUse[i] = clock; return; }
            if (lastUse[i] < lastUse[victim]) victim = i;
        }
        ++misses;
        tags[victim] = tag;
        lastUse[victim] = clock;
    }
};

struct Monster {                 // hot and cold fields mixed
    float x, y, z, vx, vy, vz;   // hot: read every frame
    float health;                // hot
    char name[32];               // cold: UI only
    float lootTable[16];         // cold: used on death
    std::uint64_t spawnTime;     // cold: analytics
};

struct MonsterHot {              // touched every frame
    float x, y, z, vx, vy, vz;
    float health;
    std::uint32_t cold;          // index into the cold array
};

struct MonsterCold {             // touched rarely
    char name[32];
    float lootTable[16];
    std::uint64_t spawnTime;
};

// Misses for one update pass that reads the 28 hot bytes at
// the start of each element, \`stride\` bytes apart.
std::uint64_t update(std::uint64_t n, std::uint64_t stride) {
    Cache l1{32 * 1024, 64, 8};
    for (std::uint64_t i = 0; i < n; ++i) {
        for (std::uint64_t b = 0; b < 28; b += 4) {
            l1.load(i * stride + b);
        }
    }
    return l1.misses;
}

int main() {
    std::cout << "sizeof(Monster)     = " << sizeof(Monster) << '\\n';
    std::cout << "sizeof(MonsterHot)  = " << sizeof(MonsterHot)
              << '\\n';
    std::cout << "sizeof(MonsterCold) = " << sizeof(MonsterCold)
              << '\\n';
    const std::uint64_t n = 10'000;
    std::cout << "update, mixed: " << update(n, sizeof(Monster))
              << " misses\\n";
    std::cout << "update, split: " << update(n, sizeof(MonsterHot))
              << " misses\\n";
}`,
          output: "sizeof(Monster)     = 136\nsizeof(MonsterHot)  = 32\nsizeof(MonsterCold) = 104\nupdate, mixed: 13750 misses\nupdate, split: 5000 misses",
          annotations: [
            { lines: '29-35', text: '28 hot bytes, then 104 cold bytes. `spawnTime` needs 8-byte alignment, so 4 padding bytes come before it: 136 bytes in total.' },
            { lines: '37-41', text: 'The hot part with a 4-byte index to its cold data: exactly 32 bytes, two monsters per line.' },
            { lines: '51-59', text: 'An update that reads the 28 hot bytes of each monster, `stride` bytes apart.' },
            { lines: '68-71', text: '13,750 misses mixed (some hot regions straddle two lines) vs 5,000 split: 2.75× fewer, and the cache now holds four times as many monsters\' hot data.' },
          ],
        },
        {
          type: 'p',
          text: 'Field order matters within the hot struct too: grouping fields used together keeps them in the same line, and ordering fields from largest to smallest alignment avoids padding, as the Objects in Memory lesson showed. Compilers apply the same idea to code: functions or branches marked cold (`[[unlikely]]`, GCC\'s `__attribute__((cold))`, or profile-guided optimization) are moved away from hot code, so the instruction cache holds only what runs every frame.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Find the hot fields with data, not intuition',
          text: 'Which fields are hot depends on which systems run every frame. List the systems in your frame and the fields each reads and writes; the fields that appear in per-frame systems are hot. Fields read only on events (death, UI, saving) are cold candidates.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'bug',
      prompt: 'This fog pass over a row-major `width × height` image produces the right pixels but runs many times slower than it should for 4K frames. Tap the line that causes the slowdown.',
      code: `void applyFog(std::vector<float>& image, int width,
              int height, float fog) {
    for (int x = 0; x < width; ++x) {
        for (int y = 0; y < height; ++y) {
            image[y * width + x] *= fog;
        }
    }
}`,
      bugLines: [3, 4],
      hint: 'Which index moves fastest, and how far apart in memory are consecutive iterations of the inner loop?',
      explanation:
        'The inner loop varies `y`, so consecutive iterations are `width` floats apart: 15,360 bytes for a 3840-wide image. Every access touches a different line, and with a power-of-two-ish stride, many of those lines fight over a few sets. Swapping the loops, `y` outside and `x` inside, makes the inner loop walk a row sequentially: one miss per 16 pixels, with the hardware prefetcher streaming ahead. The result is identical because each pixel is processed independently, which is exactly what makes the interchange legal.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'concept',
      title: 'Measuring cache behaviour in real programs',
      blocks: [
        {
          type: 'p',
          text: 'Simulators give exact, repeatable counts for a model. To see what real hardware does, use the CPU\'s **performance monitoring counters**: hardware registers that count events such as cycles, instructions retired, L1 misses, last-level cache misses and TLB misses, with almost no overhead.',
        },
        {
          type: 'code',
          lang: 'shell',
          code: `# Whole-program counts (Linux)
perf stat -e cycles,instructions,L1-dcache-load-misses,\\
LLC-load-misses,dTLB-load-misses ./game --benchmark

# Which functions and lines cause the misses
perf record -e L1-dcache-load-misses ./game --benchmark
perf report

# Exact miss counts from a cache model, not timing
valgrind --tool=cachegrind ./game --benchmark`,
          annotations: [
            { lines: '2-3', text: '`perf stat` prints totals. Event names vary by CPU and kernel; `perf list` shows what your machine supports.' },
            { lines: '6-7', text: '`perf record` samples where the events happen, so `perf report` can attribute misses to functions and source lines.' },
            { lines: 10, text: 'Cachegrind runs the program on a simulated cache, like this lesson\'s simulator: slow, but deterministic and detailed per line of code.' },
          ],
        },
        {
          type: 'p',
          text: 'On Windows and for deeper analysis, **Intel VTune Profiler**\'s Microarchitecture Exploration and Memory Access analyses use the same counters and organize them with the **top-down method**: is the core front-end bound, bad-speculation bound, back-end memory bound or retiring useful work? A loop flagged "Memory Bound" with high L1 or DRAM-bound percentages is a candidate for the techniques in this lesson. **AMD uProf** plays the same role on AMD CPUs, and console vendors ship their own counter-based profilers (PIX on Xbox, Razor on PlayStation).',
        },
        {
          type: 'p',
          text: 'Frame profilers such as **Tracy** and **Superluminal** answer the first question: *where* does the frame time go? Counters answer the second: *why* is that code slow? Use them in that order.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Measure like an engineer',
          text: 'Profile optimized builds with debug symbols, not debug builds. Run long enough to average out noise, warm up before measuring, and compare before and after on the same machine. Most importantly, check that the code you changed was actually the bottleneck: a 10× faster loop that took 1% of the frame saves 0.9%.',
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'A system updates the `position` and `velocity` of 50,000 particles each frame. Particles also carry a 64-byte `debugName` and a 128-byte emitter description that are read only by the editor. Which change most reduces cache misses in the update?',
      options: [
        {
          text: 'Move `debugName` and the emitter description into a separate cold array, or store positions and velocities as SoA arrays',
          correct: true,
          why: 'Either way, the update streams only the bytes it uses. With 24 hot bytes out of more than 200 per particle, this cuts the lines touched by roughly an order of magnitude.',
        },
        {
          text: 'Add `__builtin_prefetch(&particles[i + 1])` inside the loop',
          why: 'The loop is already sequential, so the hardware prefetcher handles it, and prefetching does not reduce the number of lines fetched, only when they arrive.',
        },
        {
          text: 'Process the particles in reverse order',
          why: 'A descending sequential walk touches exactly the same lines, and prefetchers detect descending streams too.',
        },
        {
          text: 'Make the particle struct `alignas(64)`',
          why: 'Alignment stops a particle straddling two lines, but each particle is still over 200 bytes, nearly all of it unused by the update.',
        },
      ],
      explanation:
        'Cache misses scale with the number of distinct lines a loop touches. The most effective fixes shrink the bytes per element that the hot loop must stream: SoA, hot/cold splitting, smaller types. Prefetching and alignment adjust *when* and *how* lines are fetched, which helps less than not fetching them at all.',
    },
  ],
  takeaways: [
    'Walk arrays in memory order: row-major C++ arrays want the last index in the innermost loop. Power-of-two strides concentrate accesses in a few sets; padding breaks the pattern.',
    'Structure of arrays streams only the fields a system uses and suits SIMD; it is the foundation of data-oriented design and ECS engines.',
    'Pointer chasing serializes misses because each address depends on the previous load; prefer contiguous storage, values over pointers, and indices over pointers.',
    'Hardware prefetchers catch sequential and strided patterns; software prefetches with the right distance can help irregular but predictable gathers.',
    'Loop tiling reuses data while it is cached; choose tiles that fit comfortably in the target level.',
    'Hot/cold splitting packs per-frame fields densely and moves rarely used fields out of the way.',
    'Find problems with frame profilers first, then explain them with hardware counters (perf, VTune, uProf) or deterministic simulators (Cachegrind).',
  ],
  reading: [
    {
      title: 'Game Programming Patterns: Data Locality',
      url: 'https://gameprogrammingpatterns.com/data-locality.html',
      source: 'book',
      note: 'Contiguous component arrays, hot/cold splitting and pointer chasing explained with game code.',
    },
    {
      title: 'What Every Programmer Should Know About Memory',
      url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      source: 'article',
      note: 'Section 6 ("What Programmers Can Do") covers loop tiling, prefetching and data layout with measurements.',
    },
    {
      title: 'Agner Fog: Software optimization resources',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'The C++ optimization manual has a chapter on cache-friendly data structures and access patterns.',
    },
    {
      title: 'Loop nest optimization',
      url: 'https://en.wikipedia.org/wiki/Loop_nest_optimization',
      source: 'article',
      note: 'Tiling and loop interchange, with the matrix multiplication example worked through.',
    },
  ],
};
