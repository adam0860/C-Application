import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'arch-optimization-case-study',
  title: 'Optimizing a Game Frame',
  summary: 'A frame-budget story: an entity update loop taken step by step from virtual objects on the heap to branchless SIMD over arrays, with counts from simulators and a sense of when to stop.',
  minutes: 22,
  objectives: [
    'Turn a profile and counters into concrete hypotheses about an entity update loop',
    'Convert an array of polymorphic objects into a structure of arrays and count the cache lines saved',
    'Explain what virtual calls cost in a hot loop and how sorting or splitting by type removes that cost',
    'Write branchless updates that the compiler really compiles without a branch, and know when they pay off',
    'Vectorize the loop with SSE2 intrinsics, handle the tail, and decide when further optimization is not worth its readability cost',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'The scenario: a frame over budget',
      blocks: [
        {
          type: 'p',
          text: 'You join a team shipping a sci-fi shooter at 60 fps. The big set piece has a swarm of **100,000 entities**: drones, soldiers and turrets. In that level the game thread takes **19 ms** per frame against a [[frame-budget]] of 16.67 ms, and the frame timeline shows one zone, `UpdateEntities`, at **6.0 ms**. Your task: get the frame under budget.',
        },
        {
          type: 'p',
          text: 'The code is clean, textbook object-oriented C++, the kind you wrote in the first course:',
        },
        {
          type: 'code',
          title: 'Entity.h (the starting point)',
          code: `class Entity {
public:
    virtual ~Entity() = default;
    virtual void update(float dt) = 0;
protected:
    std::string name;
    float pos[3]{};
    float vel[3]{};
    float health = 100.0f;
    int team = 0;
    char aiBlackboard[64]{};
};

class Drone : public Entity {
public:
    void update(float dt) override {
        for (int k = 0; k < 3; ++k) pos[k] += vel[k] * dt;
    }
};

std::vector<std::unique_ptr<Entity>> entities;

void updateAll(float dt) {
    for (auto& e : entities) e->update(dt);
}`,
          annotations: [
            { lines: '1-4', text: 'An abstract base with a virtual `update`: every object carries a [[vptr]], and every update is an indirect call.' },
            { lines: '6-11', text: 'Hot data (position and velocity, 24 bytes) lives next to cold data the movement update never reads: a name, team, health and a 64-byte AI blackboard.' },
            { lines: 21, text: 'Each entity is a separate heap allocation. After a few thousand spawns and deaths, consecutive pointers point all over the heap.' },
            { lines: '23-25', text: 'The hot loop: load a pointer, load the object\'s vptr, load the function address, call it. Repeat 100,000 times per frame.' },
          ],
        },
        {
          type: 'p',
          text: 'Before touching anything, apply [[amdahls-law]]. `UpdateEntities` is 6.0 of 19 ms, about 32% of the frame. Even an infinitely fast update would only bring the frame to 13 ms; to reach 16.67 ms you must save at least 2.33 ms, so the update must drop to about 3.7 ms or less. That is a concrete, checkable goal.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a story instead of a list of tricks',
          text: 'Every technique in this lesson is a trade: speed for flexibility, readability or portability. Applied blindly they make code worse. Applied in the right order, guided by measurement, each one removes a specific cost the hardware is charging you, and you can stop as soon as the budget is met.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Step 1: measure, then form hypotheses',
      blocks: [
        {
          type: 'p',
          text: 'A sampling capture of the slow level puts almost all of `UpdateEntities` on the loop line and on the first instruction of each `update`, the first load from the object, which is where a cache-miss stall shows up in a sample. The counters for that zone show IPC around 0.5, about two last-level cache misses per entity and a high branch-miss rate. In iron-law terms: the instruction count is tiny, and CPI is terrible.',
        },
        {
          type: 'p',
          text: 'Now count what each entity costs the hardware. Start with its size:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'layout.cpp',
          code: `#include <cstdio>
#include <string>

struct Entity {                 // the OOP version
    virtual ~Entity() = default;
    virtual void update(float dt) = 0;
    std::string name;
    float pos[3];
    float vel[3];
    float health;
    int team;
    char aiBlackboard[64];
};

struct EntityData {             // same fields, no vptr
    std::string name;
    float pos[3];
    float vel[3];
    float health;
    int team;
    char aiBlackboard[64];
};

int main() {
    const std::size_t hot = sizeof(float[3]) * 2;  // pos+vel
    std::printf("sizeof(std::string) = %zu\\n",
                sizeof(std::string));
    std::printf("sizeof(Entity)      = %zu\\n", sizeof(Entity));
    std::printf("sizeof(EntityData)  = %zu\\n",
                sizeof(EntityData));
    std::printf("hot bytes: %zu of %zu (%.1f%%)\\n", hot,
                sizeof(Entity), 100.0 * hot / sizeof(Entity));
}`,
          output: `sizeof(std::string) = 32
sizeof(Entity)      = 136
sizeof(EntityData)  = 128
hot bytes: 24 of 136 (17.6%)`,
          annotations: [
            { lines: 5, text: 'The virtual destructor adds the 8-byte vptr at offset 0.' },
            { lines: 7, text: '`std::string` is 32 bytes in libstdc++ (GCC) and MSVC, 24 in libc++, so the sizes printed here are for GCC on x86-64.' },
            { lines: '8-9', text: 'With the vptr first, `pos` starts at offset 40 and `vel` at 52: the 24 hot bytes are bytes 40 to 63 of the object.' },
            { lines: '31-32', text: 'Less than a fifth of each object is useful to the movement update, yet the cache moves data in whole 64-byte [[cache-line|cache lines]].' },
          ],
        },
        {
          type: 'p',
          text: 'Put the counts together and you get three hypotheses, one per hardware mechanism:',
        },
        {
          type: 'list',
          ordered: true,
          items: [
            '**Memory:** each entity costs a pointer load plus one or two scattered cache lines, of which 24 bytes are used. 100,000 objects of 144 bytes (136 rounded up by the allocator) are about 14 MB, more than many CPUs\' L3 cache, so many of those lines come from DRAM, and scattered addresses defeat the hardware [[prefetching|prefetcher]].',
            '**Control flow:** each entity costs an indirect call whose target depends on its type. In spawn order, the types are effectively random, so the branch predictor often [[branch-misprediction|guesses the wrong target]].',
            '**Work:** the actual math is 3 multiply-adds. It cannot be inlined, let alone vectorized, because the compiler cannot see through the virtual call.',
          ],
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Fix the biggest cost first',
          text: 'Memory stalls cost hundreds of cycles each; mispredictions about 15–20; the arithmetic a handful. Attack them in that order: the first fix changes the problem the later ones see.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'The counters for `UpdateEntities` show IPC ≈ 0.5 and about two last-level cache misses per entity. Which factor of the iron law is the problem, and what kind of fix does that suggest?',
      options: [
        { text: 'Instruction count: rewrite the math with SIMD first', why: 'The math is a few instructions per entity. Cutting it does little while each entity waits hundreds of cycles for memory.' },
        { text: 'CPI: the core is stalled on memory, so change the data layout and access pattern', correct: true, why: 'Low IPC with many LLC misses means cycles are spent waiting. Fewer, more predictable cache-line fetches lower CPI directly.' },
        { text: 'Cycle time: the CPU is probably thermally throttling', why: 'Throttling slows everything uniformly; it does not produce cache misses. The counters point at memory.' },
        { text: 'None: an IPC of 0.5 is normal for game code', why: 'Some game code is memory-bound, but that is a problem to fix, not a law. A streaming update over arrays easily reaches IPC above 2 on the same core.' },
      ],
      explanation: 'Time = instructions × CPI × cycle time. Here the instruction count is small and the clock is fixed, so the time is in CPI, and the cache-miss counter says why. The fix is to touch fewer cache lines and make the accesses predictable, which is a data-layout change. SIMD comes later, once the loop is no longer waiting on memory.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Step 2: from objects to arrays',
      blocks: [
        {
          type: 'p',
          text: 'The [[data-oriented-design|data-oriented]] fix is to store each field the update needs in its own contiguous array: a [[structure-of-arrays|structure of arrays]] (SoA) instead of an array of structures (AoS). The movement system then streams through exactly the bytes it uses.',
        },
        {
          type: 'code',
          title: 'Swarm.h (SoA)',
          code: `struct Swarm {                    // one array per field
    std::vector<float> x, y, z;      // hot: read + written
    std::vector<float> vx, vy, vz;   // hot: read
    std::vector<float> health;       // warm: other systems
    std::vector<std::string> name;   // cold: UI, debugging
};

void integrate(Swarm& s, float dt) {
    const std::size_t n = s.x.size();
    for (std::size_t i = 0; i < n; ++i) {
        s.x[i] += s.vx[i] * dt;
        s.y[i] += s.vy[i] * dt;
        s.z[i] += s.vz[i] * dt;
    }
}`,
          annotations: [
            { lines: '2-3', text: 'Entity *i* is now an index, not an object: its position is `x[i], y[i], z[i]`.' },
            { lines: '4-5', text: 'Cold data still exists, but it no longer travels through the cache with every movement update.' },
            { lines: '10-14', text: 'A plain loop over arrays: no pointers to chase, no calls, and an access pattern the hardware prefetcher recognizes immediately.' },
          ],
        },
        {
  "type": "figure",
  "svg": "<svg viewBox=\"0 0 520 336\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\">\n<text x=\"10\" y=\"20\" font-size=\"13\" font-weight=\"700\" stroke=\"none\">Packed AoS: 128-byte EntityData, update reads pos + vel</text>\n<rect x=\"20.0\" y=\"30\" width=\"117.0\" height=\"26\" class=\"s-gray f-gray\" fill=\"currentColor\" fill-opacity=\"0.12\"/>\n<text x=\"78.5\" y=\"46.5\" text-anchor=\"middle\" font-size=\"10\" stroke=\"none\">name</text>\n<rect x=\"137.0\" y=\"30\" width=\"43.9\" height=\"26\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<text x=\"158.9\" y=\"46.5\" text-anchor=\"middle\" font-size=\"10\" stroke=\"none\">pos</text>\n<rect x=\"180.9\" y=\"30\" width=\"43.9\" height=\"26\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<text x=\"202.8\" y=\"46.5\" text-anchor=\"middle\" font-size=\"10\" stroke=\"none\">vel</text>\n<rect x=\"224.8\" y=\"30\" width=\"14.6\" height=\"26\" class=\"s-gray f-gray\" fill=\"currentColor\" fill-opacity=\"0.12\"/>\n<rect x=\"239.4\" y=\"30\" width=\"14.6\" height=\"26\" class=\"s-gray f-gray\" fill=\"currentColor\" fill-opacity=\"0.12\"/>\n<rect x=\"20\" y=\"30\" width=\"234\" height=\"26\" stroke-width=\"2\"/>\n<rect x=\"266.0\" y=\"30\" width=\"234.0\" height=\"26\" class=\"s-gray f-gray\" fill=\"currentColor\" fill-opacity=\"0.12\"/>\n<text x=\"383.0\" y=\"46.5\" text-anchor=\"middle\" font-size=\"10\" stroke=\"none\">aiBlackboard</text>\n<rect x=\"266\" y=\"30\" width=\"234\" height=\"26\" stroke-width=\"2\"/>\n<text x=\"20\" y=\"70\" font-size=\"10.5\" class=\"t-gray\" stroke=\"none\">entity 0: line 0 fetched (24 of 64 bytes used) · line 1 never touched</text>\n<rect x=\"20.0\" y=\"88\" width=\"117.0\" height=\"26\" class=\"s-gray f-gray\" fill=\"currentColor\" fill-opacity=\"0.12\"/>\n<text x=\"78.5\" y=\"104.5\" text-anchor=\"middle\" font-size=\"10\" stroke=\"none\">name</text>\n<rect x=\"137.0\" y=\"88\" width=\"43.9\" height=\"26\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<text x=\"158.9\" y=\"104.5\" text-anchor=\"middle\" font-size=\"10\" stroke=\"none\">pos</text>\n<rect x=\"180.9\" y=\"88\" width=\"43.9\" height=\"26\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<text x=\"202.8\" y=\"104.5\" text-anchor=\"middle\" font-size=\"10\" stroke=\"none\">vel</text>\n<rect x=\"224.8\" y=\"88\" width=\"14.6\" height=\"26\" class=\"s-gray f-gray\" fill=\"currentColor\" fill-opacity=\"0.12\"/>\n<rect x=\"239.4\" y=\"88\" width=\"14.6\" height=\"26\" class=\"s-gray f-gray\" fill=\"currentColor\" fill-opacity=\"0.12\"/>\n<rect x=\"20\" y=\"88\" width=\"234\" height=\"26\" stroke-width=\"2\"/>\n<rect x=\"266.0\" y=\"88\" width=\"234.0\" height=\"26\" class=\"s-gray f-gray\" fill=\"currentColor\" fill-opacity=\"0.12\"/>\n<text x=\"383.0\" y=\"104.5\" text-anchor=\"middle\" font-size=\"10\" stroke=\"none\">aiBlackboard</text>\n<rect x=\"266\" y=\"88\" width=\"234\" height=\"26\" stroke-width=\"2\"/>\n<text x=\"20\" y=\"128\" font-size=\"10.5\" class=\"t-gray\" stroke=\"none\">entity 1: line 2 fetched (24 of 64 bytes used) · line 3 never touched</text>\n<text x=\"10\" y=\"162\" font-size=\"13\" font-weight=\"700\" stroke=\"none\">SoA: one array per field, every fetched byte is used</text>\n<rect x=\"20.0\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"34.6\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"49.2\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"63.9\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"78.5\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"93.1\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"107.8\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"122.4\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"137.0\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"151.6\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"166.2\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"180.9\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"195.5\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"210.1\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"224.8\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"239.4\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"20\" y=\"172\" width=\"234\" height=\"24\" stroke-width=\"2\"/>\n<rect x=\"266.0\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"280.6\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"295.2\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"309.9\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"324.5\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"339.1\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"353.8\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"368.4\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"383.0\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"397.6\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"412.2\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"426.9\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"441.5\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"456.1\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"470.8\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"485.4\" y=\"172\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"266\" y=\"172\" width=\"234\" height=\"24\" stroke-width=\"2\"/>\n<text x=\"14\" y=\"188\" text-anchor=\"end\" font-size=\"11\" stroke=\"none\">x</text>\n<rect x=\"20.0\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"34.6\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"49.2\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"63.9\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"78.5\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"93.1\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"107.8\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"122.4\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"137.0\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"151.6\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"166.2\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"180.9\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"195.5\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"210.1\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"224.8\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"239.4\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"20\" y=\"206\" width=\"234\" height=\"24\" stroke-width=\"2\"/>\n<rect x=\"266.0\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"280.6\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"295.2\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"309.9\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"324.5\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"339.1\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"353.8\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"368.4\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"383.0\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"397.6\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"412.2\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"426.9\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"441.5\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"456.1\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"470.8\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"485.4\" y=\"206\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"266\" y=\"206\" width=\"234\" height=\"24\" stroke-width=\"2\"/>\n<text x=\"14\" y=\"222\" text-anchor=\"end\" font-size=\"11\" stroke=\"none\">y</text>\n<rect x=\"20.0\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"34.6\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"49.2\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"63.9\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"78.5\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"93.1\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"107.8\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"122.4\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"137.0\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"151.6\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"166.2\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"180.9\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"195.5\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"210.1\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"224.8\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"239.4\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"20\" y=\"240\" width=\"234\" height=\"24\" stroke-width=\"2\"/>\n<rect x=\"266.0\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"280.6\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"295.2\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"309.9\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"324.5\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"339.1\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"353.8\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"368.4\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"383.0\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"397.6\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"412.2\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"426.9\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"441.5\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"456.1\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"470.8\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"485.4\" y=\"240\" width=\"14.6\" height=\"24\" class=\"s-blue f-blue\" fill=\"currentColor\" fill-opacity=\"0.35\"/>\n<rect x=\"266\" y=\"240\" width=\"234\" height=\"24\" stroke-width=\"2\"/>\n<text x=\"14\" y=\"256\" text-anchor=\"end\" font-size=\"11\" stroke=\"none\">z</text>\n<text x=\"20\" y=\"280\" font-size=\"11\" stroke=\"none\">… and vx, vy, vz. One 64-byte line holds one field of 16 entities.</text>\n<text x=\"20\" y=\"302\" font-size=\"11\" class=\"t-gray\" stroke=\"none\">Each outlined box is one 64-byte cache line; blue bytes are read by the update.</text>\n<text x=\"20\" y=\"320\" font-size=\"11\" class=\"t-gray\" stroke=\"none\">4,096 entities: AoS fetches 4,096 lines; SoA fetches 6 × 256 = 1,536.</text>\n</svg>",
  "alt": "Cache lines for two layouts. Packed AoS: each 128-byte entity spans two 64-byte lines; only 24 bytes (pos and vel) of the first line are read and the second line is never touched. SoA: separate x, y, z arrays where every byte of each line is read.",
  "caption": "With AoS, each fetched line carries 40 bytes the update never reads. With SoA, every byte that crosses the memory bus is used."
},
        {
          type: 'p',
          text: 'To compare layouts without timing noise, run the address stream of each through a simulated 32 KiB, 8-way L1 data cache with 64-byte lines and LRU replacement, and count misses. This uses 4,096 entities; the counts scale linearly.',
        },
        {
          type: 'code',
          runnable: true,
          title: 'layout_misses.cpp',
          code: `#include <cstdint>
#include <cstdio>
#include <utility>
#include <vector>

// 32 KiB, 8-way, 64-byte lines, LRU: a typical L1D.
struct Cache {
    static constexpr int kWays = 8, kSets = 64, kLine = 64;
    std::uint64_t tag[kSets][kWays] = {};
    std::uint64_t used[kSets][kWays] = {};  // LRU stamp
    std::uint64_t tick = 0, misses = 0;

    void access(std::uint64_t addr) {
        std::uint64_t line = addr / kLine;
        int set = static_cast<int>(line % kSets);
        int victim = 0;
        ++tick;
        for (int w = 0; w < kWays; ++w) {
            if (used[set][w] && tag[set][w] == line) {
                used[set][w] = tick;            // hit
                return;
            }
            if (used[set][w] < used[set][victim]) victim = w;
        }
        ++misses;                               // miss: fill
        tag[set][victim] = line;
        used[set][victim] = tick;
    }
};

const int kN = 4096;                            // entities

std::uint64_t lcg(std::uint64_t& s) {           // fixed PRNG
    s = s * 6364136223846793005ull + 1442695040888963407ull;
    return s >> 33;
}

int main() {
    // (a) unique_ptr<Entity> array; objects scattered in a
    //     heap pool, 144-byte chunks, in shuffled order.
    std::vector<std::uint64_t> slot(kN);
    for (int i = 0; i < kN; ++i) slot[i] = i;
    std::uint64_t seed = 42;
    for (int i = kN - 1; i > 0; --i)
        std::swap(slot[i], slot[lcg(seed) % (i + 1)]);
    Cache a;
    for (int i = 0; i < kN; ++i) {
        a.access(0x100000 + 8 * i);             // the pointer
        std::uint64_t obj = 0x800000 + 144 * slot[i];
        a.access(obj);                          // vptr
        for (int b = 40; b < 64; b += 4)
            a.access(obj + b);                  // pos, vel
    }
    // (b) std::vector<EntityData>: packed, 128 B each.
    Cache b;
    for (int i = 0; i < kN; ++i)
        for (int k = 32; k < 56; k += 4)
            b.access(0x800000 + 128 * i + k);
    // (c) SoA: six float arrays (x, y, z, vx, vy, vz).
    Cache c;
    for (int i = 0; i < kN; ++i)
        for (int arr = 0; arr < 6; ++arr)
            c.access(0x800000 + arr * 0x10000 + 4 * i);

    std::printf("misses per update of %d entities\\n", kN);
    std::printf("  scattered objects: %5llu\\n",
                static_cast<unsigned long long>(a.misses));
    std::printf("  packed AoS:        %5llu\\n",
                static_cast<unsigned long long>(b.misses));
    std::printf("  SoA arrays:        %5llu\\n",
                static_cast<unsigned long long>(c.misses));
}`,
          output: `misses per update of 4096 entities
  scattered objects:  7680
  packed AoS:         4096
  SoA arrays:         1536`,
          annotations: [
            { lines: '13-28', text: 'A set-associative LRU cache in 15 lines: split the address into line number and set, look for the tag in that set\'s 8 ways, otherwise evict the least recently used way.' },
            { lines: '41-45', text: 'Fisher–Yates shuffle with a fixed seed: the objects sit in the heap in an order unrelated to the pointer array, as they do after a few minutes of spawning and dying.' },
            { lines: '47-53', text: 'Per entity: the pointer, the vptr at offset 0 and `pos`/`vel` at offsets 40–63. 144 is not a multiple of 64, so three objects in four straddle two lines: 1.75 lines per entity, plus one pointer line per 8 entities, gives 7,680.' },
            { lines: '55-58', text: 'Packed but still AoS: one line per entity, 40 of its 64 bytes wasted.' },
            { lines: '60-63', text: 'SoA: 6 arrays × 4,096 floats × 4 bytes / 64 bytes per line = 1,536 lines. Every byte fetched is used.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Misses are not all equal',
          text: 'The simulator counts misses but cannot price them. In real hardware the SoA misses are almost free: the access pattern is sequential, so the prefetcher fetches lines before they are needed. The scattered misses are the expensive kind, each a dependent load to an unpredictable address. Fewer misses *and* predictable ones is why moving a [[pointer-chasing|pointer-chasing]] update to arrays commonly makes that loop several times faster, often in the 2–4× range on desktop CPUs, though the exact factor depends on the CPU and the data size.',
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Engines do this for you at scale',
          text: 'This is the core idea of the [[entity-component-system|Entity Component System]] (ECS) pattern: libraries such as EnTT and flecs, Unity\'s DOTS and Unreal\'s **Mass** framework store components in contiguous arrays and run systems over them. Unreal uses Mass for crowds and traffic in large worlds, exactly the "100,000 simple entities" case where `AActor` per entity would be far too heavy.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'numeric',
      prompt: 'A 2D swarm stores `x`, `y`, `vx`, `vy` as four SoA arrays of `float`. Updating 8,192 entities streams through all four arrays once. With 64-byte cache lines and a cold cache, how many cache lines are fetched?',
      hint: 'Bytes per array = 8,192 × 4. Divide by 64 bytes per line, then multiply by the number of arrays.',
      answer: 2048,
      unit: 'lines',
      explanation: 'Each array is 8,192 × 4 = 32,768 bytes = 512 lines, and there are 4 arrays: **2,048 lines**, or one line per 4 entities. An AoS layout that put the same 16 hot bytes inside a 64-byte struct would fetch 8,192 lines, four times as many, for the same useful data.',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'Step 3: no virtual calls in the hot loop',
      blocks: [
        {
          type: 'p',
          text: 'Recall from [[vtable|how virtual calls work]] that `e->update(dt)` loads a vptr, loads a function address and makes an **indirect call**. The CPU predicts the target of an indirect call from its history. When drones, soldiers and turrets arrive in random order, the history is useless. This model of a simple predictor that guesses "same target as last time" counts the damage:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'indirect_calls.cpp',
          code: `#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <vector>

enum Type { Soldier, Drone, Turret };   // 3 subclasses

std::uint64_t lcg(std::uint64_t& s) {
    s = s * 6364136223846793005ull + 1442695040888963407ull;
    return s >> 33;
}

// A simple indirect-branch predictor: guess that the
// call goes where it went last time (one BTB entry).
int countMispredicts(const std::vector<Type>& order) {
    int last = -1, misses = 0;
    for (Type t : order) {         // e->update() per entity
        if (t != last) ++misses;
        last = t;
    }
    return misses;
}

int main() {
    std::vector<Type> ents(4096);
    std::uint64_t seed = 7;
    for (Type& t : ents) t = static_cast<Type>(lcg(seed) % 3);

    std::printf("indirect calls: %zu\\n", ents.size());
    std::printf("spawn order:    %d mispredicts\\n",
                countMispredicts(ents));
    std::sort(ents.begin(), ents.end());
    std::printf("sorted by type: %d mispredicts\\n",
                countMispredicts(ents));
}`,
          output: `indirect calls: 4096
spawn order:    2704 mispredicts
sorted by type: 3 mispredicts`,
          annotations: [
            { lines: '15-22', text: 'The model: a misprediction whenever the target differs from the previous call\'s. Real predictors use longer histories and do better on patterns, but no predictor can guess a random sequence.' },
            { lines: 30, text: 'Random types: about 2 in 3 calls go somewhere new, roughly what the model predicts for three equally likely types.' },
            { lines: '32-34', text: 'Sorted by type: one misprediction per type boundary. Same calls, same work, almost no wasted cycles.' },
          ],
        },
        {
          type: 'p',
          text: 'Sorting fixes prediction, but the call is still indirect, so the compiler still cannot [[function-inlining|inline]] `update`, cannot hoist `dt` out of the loop, and cannot vectorize. The full fix is to stop asking each entity what it is. Keep one array (or one SoA block) **per type** and run a plain loop over each:',
        },
        {
          type: 'compare',
          left: {
            title: 'Dispatch per entity',
            tone: 'bad',
            code: `for (auto& e : entities)
    e->update(dt);   // indirect
                     // call each`,
          },
          right: {
            title: 'Dispatch per type',
            tone: 'good',
            code: `integrate(drones, dt);
integrate(soldiers, dt);
updateTurrets(turrets, dt);
// 3 direct calls per frame`,
          },
        },
        {
          type: 'p',
          text: 'Polymorphism has not disappeared; it moved from "per entity, per frame" to "per type, per frame". Three dispatches instead of 100,000, and each loop body is now visible to the optimizer. Typical effect on a loop like this: removing the indirect call and the mispredictions is often worth tens of percent on its own, and it is what unlocks the next two steps.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why virtual functions were the right call elsewhere',
          text: 'Virtual dispatch is perfect for objects counted in dozens or hundreds: weapons, game modes, UI screens, AI behaviors. Their flexibility costs nanoseconds per call. It becomes a problem only when the same call runs 100,000 times per frame over small objects, which is exactly the shape of code data-oriented design targets.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'fill',
      prompt: 'Complete the sentence about sorting a polymorphic array by type.',
      templateIsCode: false,
      template: 'Sorting entities by type makes the indirect branch ___, but the call through the vtable still cannot be ___ by the compiler.',
      blanks: [{ answers: ['predictable'] }, { answers: ['inlined'] }],
      wordBank: ['predictable', 'inlined', 'unpredictable', 'allocated', 'cached'],
      explanation: 'The predictor learns quickly when the same target repeats, so mispredictions drop to one per type boundary. But inlining is a compile-time decision, and at compile time the call site still does not know which `update` it will reach. Per-type arrays fix both, because each loop calls one known function directly.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'Step 4: branchless updates (and checking the compiler agrees)',
      blocks: [
        {
          type: 'p',
          text: 'Gameplay adds a poison cloud: every entity within radius *r* of its center loses `dmg` health per frame. The obvious code branches on the distance. Entities are sorted by type, not by position, so about half are inside and half outside in no useful order. A 2-bit [[saturating-counter|saturating counter]], the classic branch predictor, shows what that means:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'poison_branch.cpp',
          code: `#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <vector>

std::uint64_t lcg(std::uint64_t& s) {
    s = s * 6364136223846793005ull + 1442695040888963407ull;
    return s >> 33;
}

// One 2-bit saturating counter predicting one branch.
struct TwoBit {
    int state = 2;                      // 0-1 not taken, 2-3 taken
    int misses = 0;
    void branch(bool taken) {
        if ((state >= 2) != taken) ++misses;
        state = taken ? std::min(state + 1, 3)
                      : std::max(state - 1, 0);
    }
};

int main() {
    const int n = 4096;
    std::vector<float> dist2(n);
    std::uint64_t seed = 99;
    for (float& d : dist2) d = lcg(seed) % 1000 / 10.0f;
    const float r2 = 50.0f;             // poison cloud radius^2

    TwoBit spawnOrder;                  // if (dist2 < r2) ...
    for (float d : dist2) spawnOrder.branch(d < r2);
    std::sort(dist2.begin(), dist2.end());
    TwoBit sorted;
    for (float d : dist2) sorted.branch(d < r2);

    std::printf("entities: %d\\n", n);
    std::printf("random order: %d mispredicts\\n",
                spawnOrder.misses);
    std::printf("sorted order: %d mispredicts\\n",
                sorted.misses);
    std::printf("branchless:   0 mispredicts (no branch)\\n");
}`,
          output: `entities: 4096
random order: 2020 mispredicts
sorted order: 2 mispredicts
branchless:   0 mispredicts (no branch)`,
          annotations: [
            { lines: '12-20', text: 'Predict "taken" in states 2–3, "not taken" in 0–1, and move one step toward the actual outcome. It survives one surprise, but random outcomes defeat it.' },
            { lines: 26, text: 'Squared distances from 0 to 99.9; the cloud covers those below 50, so the branch is a coin flip per entity.' },
            { lines: 36, text: 'About half the branches mispredicted: at roughly 15–20 cycles each, that is 7–10 wasted cycles per entity, more than the useful work.' },
            { lines: 38, text: 'Sorted by distance, the branch is false for a long run and then true for a long run: two mispredictions in total. Predictability is a property of the **data**, not of the code.' },
          ],
        },
        {
          type: 'p',
          text: 'The branchless idea is to compute both outcomes and select with arithmetic, so there is nothing to predict. But "branchless" in C++ does not guarantee branchless machine code. Here are three versions compiled by g++ 13 with `-O2`:',
        },
        {
          type: 'code',
          title: 'poison.cpp',
          code: `void poisonBranchy(float* hp, const float* dist2,
                   int n, float r2, float dmg) {
    for (int i = 0; i < n; ++i)
        if (dist2[i] < r2)
            hp[i] -= dmg;
}

void poisonMultiply(float* hp, const float* dist2,
                    int n, float r2, float dmg) {
    for (int i = 0; i < n; ++i) {
        float inside = dist2[i] < r2;   // 1.0f or 0.0f
        hp[i] -= dmg * inside;
    }
}

void poisonSelect(float* hp, const float* dist2,
                  int n, float r2, float dmg) {
    for (int i = 0; i < n; ++i) {
        float d = dist2[i] < r2 ? dmg : 0.0f;
        hp[i] -= d;
    }
}`,
          annotations: [
            { lines: '4-5', text: 'A conditional **store**: the compiler may not invent a store to `hp[i]` on the path that does not have one, so it keeps the branch.' },
            { lines: '11-12', text: 'Looks branchless: convert the comparison to 0 or 1 and multiply.' },
            { lines: '19-20', text: 'Always store; select the *amount* with `?:`.' },
          ],
        },
        {
          type: 'code',
          lang: 'text',
          title: 'g++ 13 -O2 -masm=intel, loop bodies only',
          code: `; poisonBranchy
.L5:  comiss  xmm0, DWORD PTR [rsi+rax]  ; r2 vs dist2[i]
      jbe     .L3                        ; branch!
      movss   xmm2, DWORD PTR [rdi+rax]
      subss   xmm2, xmm1
      movss   DWORD PTR [rdi+rax], xmm2
.L3:  add     rax, 4

; poisonMultiply
.L12: comiss  xmm0, DWORD PTR [rsi+rax]
      movaps  xmm3, xmm1
      ja      .L11                       ; still a branch!
      mulss   xmm3, xmm4                 ; dmg * 0.0f
.L11: movss   xmm2, DWORD PTR [rdi+rax]

; poisonSelect
.L21: movss   xmm2, DWORD PTR [rsi+rax]  ; dist2[i]
      movss   xmm3, DWORD PTR [rdi+rax]  ; hp[i]
      cmpltss xmm2, xmm0                 ; mask: all 1s or 0s
      andps   xmm2, xmm1                 ; dmg or 0.0f
      subss   xmm3, xmm2
      movss   DWORD PTR [rdi+rax], xmm3`,
          annotations: [
            { lines: 3, text: 'The data-dependent branch the predictor has to guess.' },
            { lines: '10-13', text: 'Surprise: GCC turned `dmg * inside` back into a branch that skips the multiply. Source that *looks* branchless proves nothing.' },
            { lines: '19-20', text: 'Truly branchless: `cmpltss` writes a mask of all one bits (true) or all zero bits (false), and `andps` turns that mask into `dmg` or `0.0f`. Hold on to this pattern; it is exactly how SIMD code selects, one lane at a time.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Branchless is not automatically faster',
          text: 'A branchless version always does the work of both paths and adds a dependency from the comparison to the result. When the branch is predictable (sorted data, rare events such as "health reached zero"), the branchy version is usually as fast or faster. Go branchless only for branches the counters show are mispredicting, and confirm in the assembly (Compiler Explorer) and in the profile.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'numeric',
      prompt: 'The poison check mispredicts about 2,020 times per 4,096 entities. If each misprediction costs 17 cycles, how many cycles per 4,096 entities are wasted?',
      answer: 34340,
      unit: 'cycles',
      explanation: '2,020 × 17 = **34,340 cycles**, about 8.4 cycles per entity, which is more than the poison math itself. At 3 GHz that is 11.4 µs per 4,096 entities, so about 0.28 ms for the 100,000-entity swarm, every frame, for nothing. The branchless select removes all of it; sorting by distance would too, but entities move every frame, so the order would have to be maintained.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Step 5: SIMD, four entities per instruction',
      blocks: [
        {
          type: 'p',
          text: 'With SoA data, no calls and no branches, the loop finally has the shape SIMD needs: the same operations on consecutive elements of arrays. SSE2 is part of the x86-64 baseline, so every 64-bit x86 CPU has it, and its 128-bit registers hold four `float`s. The masked select from the previous step becomes `_mm_cmplt_ps` plus `_mm_and_ps`, now for four entities at a time:',
        },
        {
          type: 'code',
          runnable: true,
          title: 'swarm_simd.cpp',
          code: `#include <cstdio>
#include <emmintrin.h>   // SSE2: always on x86-64
#include <vector>

struct Movers {          // SoA: one array per field
    std::vector<float> x, vx, hp, dist2;
};

int scalarUpdate(Movers& m, float dt, float r2,
                 float dmg) {
    int iters = 0;
    for (std::size_t i = 0; i < m.x.size(); ++i, ++iters) {
        m.x[i] += m.vx[i] * dt;
        m.hp[i] -= m.dist2[i] < r2 ? dmg : 0.0f;
    }
    return iters;
}

int simdUpdate(Movers& m, float dt, float r2, float dmg) {
    const __m128 vdt = _mm_set1_ps(dt);
    const __m128 vr2 = _mm_set1_ps(r2);
    const __m128 vdmg = _mm_set1_ps(dmg);
    int iters = 0;       // size is a multiple of 4 here
    for (std::size_t i = 0; i < m.x.size(); i += 4, ++iters) {
        __m128 x = _mm_loadu_ps(&m.x[i]);
        __m128 vx = _mm_loadu_ps(&m.vx[i]);
        _mm_storeu_ps(&m.x[i],
                      _mm_add_ps(x, _mm_mul_ps(vx, vdt)));
        __m128 in = _mm_cmplt_ps(_mm_loadu_ps(&m.dist2[i]),
                                 vr2);  // lanes: all 1s or 0s
        __m128 hp = _mm_loadu_ps(&m.hp[i]);
        _mm_storeu_ps(&m.hp[i],
                      _mm_sub_ps(hp, _mm_and_ps(in, vdmg)));
    }
    return iters;
}

Movers make(int n) {
    Movers m{std::vector<float>(n), std::vector<float>(n),
             std::vector<float>(n, 100.0f),
             std::vector<float>(n)};
    for (int i = 0; i < n; ++i) {
        m.x[i] = i * 0.5f;
        m.vx[i] = (i % 7) - 3.0f;
        m.dist2[i] = (i * 37 % 100) * 1.0f;
    }
    return m;
}

double checksum(const Movers& m) {
    double s = 0;
    for (std::size_t i = 0; i < m.x.size(); ++i)
        s += m.x[i] + m.hp[i];
    return s;
}

int main() {
    Movers a = make(4096), b = make(4096);
    int sIters = scalarUpdate(a, 1.0f / 60, 50.0f, 2.5f);
    int vIters = simdUpdate(b, 1.0f / 60, 50.0f, 2.5f);
    std::printf("scalar: %4d iterations, checksum %.3f\\n",
                sIters, checksum(a));
    std::printf("SSE2:   %4d iterations, checksum %.3f\\n",
                vIters, checksum(b));
}`,
          output: `scalar: 4096 iterations, checksum 4597757.450
SSE2:   1024 iterations, checksum 4597757.450`,
          annotations: [
            { lines: 2, text: '`<emmintrin.h>` declares the SSE2 intrinsics: C++ functions that map one-to-one onto vector instructions.' },
            { lines: '20-22', text: '`_mm_set1_ps` broadcasts a scalar into all four lanes, once, outside the loop.' },
            { lines: 24, text: 'Four entities per iteration. This version assumes the count is a multiple of 4; real code needs a tail loop (see the next question).' },
            { lines: '25-28', text: '`x[i..i+3] += vx[i..i+3] * dt`. The `u` in `loadu`/`storeu` means unaligned: no 16-byte alignment requirement on the address.' },
            { lines: '29-33', text: 'The branchless select, four lanes wide: compare to get a mask, AND it with `dmg`, subtract.' },
            { lines: '61-64', text: 'Same additions and multiplies in the same order per element, so both versions produce bit-identical results: a cheap regression test for the optimized path.' },
          ],
        },
        {
          type: 'p',
          text: 'A quarter of the iterations, and a quarter of the instructions in the loop body. On a compute-bound loop that can approach 4×; this loop now moves only a few dozen bytes per entity, so it soon becomes limited by memory bandwidth instead, and the measured gain is usually smaller. Wider vectors (AVX2: 8 floats, AVX-512: 16) need a CPU check, either a compile-time target such as `-mavx2` guarded by `#ifdef __AVX2__` or run-time dispatch.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Let the compiler try first',
          text: 'g++ 13 at `-O3` auto-vectorizes `poisonSelect` from the previous card into `cmpltps`/`andps`/`subps`, the same instructions as the intrinsics above, while `poisonBranchy` (conditional store) and `poisonMultiply` (the branch GCC put back) stay scalar. Writing vectorizable loops (SoA, no calls, no branches, no aliasing surprises) often gets you SIMD for free. Math libraries such as DirectXMath and glm wrap the intrinsics in vector types, and their SSE and ARM NEON back ends let one source target PCs, consoles and phones.',
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'bug',
      prompt: 'This SSE2 version of the update is called with any number of entities. Tap the line with the bug.',
      code: `#include <emmintrin.h>
#include <cstddef>

void integrate(float* x, const float* vx,
               std::size_t n, float dt) {
    const __m128 vdt = _mm_set1_ps(dt);
    for (std::size_t i = 0; i < n; i += 4) {
        __m128 p = _mm_loadu_ps(x + i);
        __m128 v = _mm_loadu_ps(vx + i);
        _mm_storeu_ps(x + i,
                      _mm_add_ps(p, _mm_mul_ps(v, vdt)));
    }
}`,
      bugLines: [7],
      explanation: 'With `i < n` and steps of 4, the last iteration reads and writes up to three floats past the end whenever `n` is not a multiple of 4: a buffer overflow and undefined behavior that silently corrupts whatever follows `x`. The standard fix is a vector loop that stops while four full elements remain, `for (i = 0; i + 4 <= n; i += 4)`, followed by a scalar tail loop for the last 0–3 elements. Alternatively, pad the arrays to a multiple of 4 and document the guarantee.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'The scoreboard, and when to stop',
      blocks: [
        {
          type: 'p',
          text: 'Here is the whole journey. The middle column comes from this lesson\'s simulators and is exact for their models; the right column is a rough guide to what such changes typically do on real desktop hardware. Your profiler is the only judge for your game.',
        },
        {
          type: 'table',
          headers: ['Step', 'Counted (per 4,096 entities)', 'Typical real effect'],
          rows: [
            ['Baseline: `unique_ptr<Entity>`, virtual update', '7,680 L1 misses (scattered), 2,704 indirect mispredicts', 'Memory-stall bound, IPC well below 1'],
            ['SoA arrays', '1,536 L1 misses, all sequential', 'Often 2–4× on the loop'],
            ['Per-type loops, no virtual calls', '3 mispredicts per sort, then 0 indirect calls', 'Tens of percent; enables inlining and vectorization'],
            ['Branchless poison', '2,020 → 0 data-dependent mispredicts', 'Big when the branch was random, nothing (or a loss) when it was predictable'],
            ['SSE2', '4,096 → 1,024 loop iterations', 'Up to ~4× if compute-bound, less once memory-bound'],
          ],
        },
        {
          type: 'p',
          text: 'Suppose the update drops from 6.0 ms to about 1.5 ms. The frame goes from 19 ms to 14.5 ms: **under budget**, with headroom. Now Amdahl\'s law works against further effort: making the update twice as fast again saves 0.75 ms, 5% of the frame, while animation at 5 ms is now the biggest zone on the timeline. The right move is to stop, check in and profile again.',
        },
        {
          type: 'p',
          text: 'Each step also had a price in readability and flexibility:',
        },
        {
          type: 'list',
          items: [
            '**SoA** turns "an entity" into an index into several arrays. Adding, removing and reordering entities must keep every array in sync, and debugging means looking at `x[i]`, `y[i]` and `z[i]` instead of one object. ECS frameworks exist largely to manage this.',
            '**Per-type loops** trade open-ended polymorphism for a closed set of known types. Adding a new entity type now means adding a new loop.',
            '**Branchless code** hides intent. `hp -= (dist2 < r2) ? dmg : 0` is fine; a page of masks and shifts is not, and it must be re-checked in the assembly after every compiler upgrade.',
            '**Intrinsics** are tied to an ISA. SSE2 code does not compile for ARM (Nintendo Switch, phones, Apple silicon) without a NEON version or a portable wrapper.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "premature optimization" is about the 97%',
          text: 'Donald Knuth\'s famous line comes with a second half: "We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. Yet we should not pass up our opportunities in that critical 3%." The profile tells you which code is in the 3%. Optimize that hard, keep the simple scalar version as a reference and a test oracle, isolate the clever code behind a clear interface, and leave the other 97% readable.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'numeric',
      prompt: 'A game thread takes 22 ms per frame, of which the physics step takes 8 ms. You make physics 4× faster and change nothing else. What is the new frame time in milliseconds?',
      answer: 16,
      unit: 'ms',
      explanation: 'Physics drops from 8 ms to 8 / 4 = 2 ms; the other 14 ms are unchanged, so the frame takes 14 + 2 = **16 ms**, just under a 60 fps budget. The overall speedup is 22 / 16 = 1.375×, not 4×: Amdahl\'s law again. Further physics work could save at most 2 more milliseconds.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'truefalse',
      prompt: 'Branchless code is always faster than the equivalent code with an `if`, because it can never be mispredicted.',
      answer: false,
      explanation: 'Branchless code avoids mispredictions but always pays for both outcomes and makes the result depend on the comparison. When a branch is well predicted (sorted data, rare events, long runs of the same outcome), the predictor makes the `if` nearly free and the branchy version is often as fast or faster. Branchless code wins when the branch is genuinely unpredictable, which is something to measure with the branch-miss counter, not assume.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'After the five steps, the frame is 14.5 ms against a 16.67 ms budget. `UpdateEntities` is 1.5 ms; animation is 5 ms and growing as artists add content. A teammate proposes an AVX-512 version of the entity update. What is the best response?',
      options: [
        { text: 'Do it: AVX-512 is four times wider than SSE2, so the update should get four times faster', why: 'The loop is now largely memory-bound, wider vectors do not add bandwidth, and AVX-512 is missing on many target CPUs (and on current consoles), so it also needs a fallback path.' },
        { text: 'Profile the animation system next; the entity update is no longer where the frame\'s time is going', correct: true, why: 'Amdahl\'s law: even a free update saves at most 1.5 ms, while animation is the largest zone on the timeline and still growing. Spend effort where the time is.' },
        { text: 'Convert the remaining gameplay code to SoA as well, for consistency', why: 'Consistency is not a performance reason. Most gameplay code is not hot, and SoA everywhere would make it harder to read for no measurable gain.' },
        { text: 'Rewrite the update in assembly to remove compiler overhead', why: 'The compiler already emits essentially the same instructions as the intrinsics. Hand-written assembly is hard to maintain and would not fix the bottleneck, which is now elsewhere.' },
      ],
      explanation: 'Optimization is a loop: measure, fix the biggest cost, measure again. Once a system is inside its budget, its remaining time is small next to other zones, so the expected payoff of more work there is small and its maintenance cost is real. The next profile, not the last success, decides where to work next.',
    },
  ],
  takeaways: [
    'Start from the budget and Amdahl\'s law: know how many milliseconds you must save and the most a given system can give.',
    'Counters turn profiles into hypotheses: low IPC with many cache misses means fix the data layout before the arithmetic.',
    'SoA streams only the bytes a system uses and makes access sequential: 1,536 instead of 7,680 simulated L1 misses per 4,096 entities.',
    'Move dispatch from per entity to per type: sorted types make indirect calls predictable, per-type arrays make them disappear and allow inlining.',
    'Branchless selects remove mispredictions on random data, but check the assembly and only use them where branches really mispredict.',
    'SIMD processes four (or more) entities per instruction once data is SoA and loops are call- and branch-free; handle the tail and keep a scalar reference.',
    'Stop when the budget is met: further gains shrink while the readability and portability costs remain.',
  ],
  reading: [
    {
      title: 'Game Programming Patterns: Data Locality',
      url: 'https://gameprogrammingpatterns.com/data-locality.html',
      source: 'book',
      note: 'Robert Nystrom walks through the same pointer-chasing to contiguous-array transformation, with hot/cold splitting and measurements.',
    },
    {
      title: 'What Every Programmer Should Know About Memory',
      url: 'https://people.freebsd.org/~lstewart/articles/cpumemory.pdf',
      source: 'article',
      note: 'Ulrich Drepper\'s classic; section 6 explains why sequential, prefetchable access beats scattered access by such large factors.',
    },
    {
      title: 'Agner Fog: Optimizing software in C++',
      url: 'https://www.agner.org/optimize/',
      source: 'article',
      note: 'Chapters on data layout, branch prediction, virtual functions and vectorization, with per-microarchitecture details.',
    },
    {
      title: 'Intel Intrinsics Guide',
      url: 'https://www.intel.com/content/www/us/en/docs/intrinsics-guide/index.html',
      source: 'other',
      note: 'Search for `_mm_cmplt_ps` or `_mm_and_ps` to see the instruction each intrinsic maps to and which ISA extension it needs.',
    },
    {
      title: 'Compiler Explorer',
      url: 'https://godbolt.org/',
      source: 'other',
      note: 'Compile the three poison functions at `-O2` and `-O3` and watch which ones become branchless or vectorized.',
    },
  ],
};
