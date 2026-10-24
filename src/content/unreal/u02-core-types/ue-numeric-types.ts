import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-numeric-types',
  title: 'Core Numeric Types and FMath',
  summary:
    'Fixed-size integers and why Unreal insists on them, uint8 for enums and bitfields, float vs double under Large World Coordinates, and the FMath helpers and constants you will use every day.',
  minutes: 16,
  objectives: [
    'Choose between `int8`…`int64` and `uint8`…`uint64` and explain why sizes must be fixed',
    'Use `uint8` for Blueprint enums and bitfield flags, and avoid unsigned wrap-around bugs',
    'Explain why UE5 switched `FVector` to `double` (Large World Coordinates) and handle float/double mixing',
    'Use `FMath::Clamp`, `Lerp`, `RandRange`, `IsNearlyEqual` and `FInterpTo` correctly',
    'Use engine constants such as `UE_PI` and `UE_KINDA_SMALL_NUMBER`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Integers with guaranteed sizes',
      blocks: [
        {
          type: 'p',
          text: 'In the C++ course you learned that `int` is only guaranteed to be *at least* 16 bits and that `long` is 32 bits on Windows but 64 bits on Linux and macOS. You also met the [[fixed-width-integer|fixed-width types]] `std::int32_t` and friends. Unreal has its own set of [[int32|fixed-size integer types]], defined for every platform the engine supports:',
        },
        {
          type: 'table',
          headers: ['Type', 'Size', 'Range', 'Typical use'],
          rows: [
            ['`int8` / `uint8`', '1 byte', '−128…127 / 0…255', 'Enums, flags, small counts, raw bytes'],
            ['`int16` / `uint16`', '2 bytes', '−32,768…32,767 / 0…65,535', 'Compact data in large arrays or network packets'],
            ['`int32` / `uint32`', '4 bytes', 'about ±2.1 billion / 0…4.29 billion', '`int32`: the everyday integer. `uint32`: hashes, seeds, bit masks'],
            ['`int64` / `uint64`', '8 bytes', 'about ±9.2 × 10¹⁸', 'Totals that can exceed 2 billion, timestamps, IDs'],
          ],
        },
        {
          type: 'code',
          title: 'PlayerStats.h (excerpt)',
          code: `UPROPERTY(VisibleAnywhere, Category = "Stats")
int32 Score = 0;

UPROPERTY(VisibleAnywhere, Category = "Stats")
int64 LifetimeExperience = 0;

UPROPERTY(EditAnywhere, Category = "Stats")
uint8 Level = 1;

uint32 LootSeed = 12345;`,
          annotations: [
            { lines: 2, text: '`int32` is the default integer in Unreal code: counts, indices, scores. Blueprints call it **Integer**.' },
            { lines: 5, text: 'An `int64` because a long-running total can pass 2,147,483,647. Blueprints support it as **Integer64**.' },
            { lines: 8, text: '`uint8` is enough for 1…255 and is the Blueprint **Byte** type.' },
            { lines: 10, text: 'Unsigned 32-bit values are natural for seeds and bit patterns. Not exposed to Blueprints: they only support `uint8`, `int32` and `int64` integers.' },
          ],
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'What the coding standard says',
          text: 'Epic\'s standard allows plain `int` and `unsigned int` "in code where the integer width is unimportant", but requires explicitly sized types for anything **serialized or replicated**. In practice nearly all Unreal code writes `int32` everywhere, and so will this course. Limits come from `TNumericLimits<int32>::Max()` (Unreal\'s `std::numeric_limits`) or macros such as `MAX_int32`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'Why fixed sizes: portability, saving and networking',
      blocks: [
        {
          type: 'p',
          text: 'Unreal games ship on Windows, consoles, phones and Linux servers, compiled by different compilers for different CPUs. Three things break if a type changes size between them:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Portability', text: 'Code that assumes `long` holds 64 bits overflows on Windows, where it holds 32. Behaviour that depends on the platform is a nightmare to test.' },
            { title: 'Serialization', text: 'Save games and `.uasset` files are written as raw bytes. If a value takes 4 bytes when written and 8 when read, every value after it is read from the wrong position — the whole file is garbage.' },
            { title: 'Networking', text: 'Dedicated servers usually run Linux while players run Windows or consoles. A replicated value must have the same size on both ends of the wire, or the receiver misreads the stream.' },
          ],
        },
        {
          type: 'code',
          title: 'Saving a struct with FArchive',
          code: `void FPlayerSave::Serialize(FArchive& Ar) {
    Ar << Score;              // int32: always 4 bytes
    Ar << LifetimeExperience; // int64: always 8 bytes
    Ar << Level;              // uint8: always 1 byte
}`,
          annotations: [
            { lines: 1, text: '`FArchive` is Unreal\'s binary stream. The same function both **saves** and **loads**: `<<` writes when the archive is saving and reads when it is loading.' },
            { lines: '2-4', text: 'The number of bytes written depends only on the type, so a file saved on a PC reads back correctly on a console or a Linux server. `FArchive` also handles byte order.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use std::int32_t?',
          text: 'Unreal\'s typedefs predate reliable `<cstdint>` support across every compiler and console toolchain Epic had to support, and they are now baked into reflection, serialization and Blueprints. They are the same idea as the standard fixed-width types — on current platforms `int32` and `std::int32_t` are the same size — but inside Unreal code, use the engine names. A `UPROPERTY` declared as `std::int32_t` is not recognised as a reflected integer type.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'A replicated `long Gold;` works in local testing on Windows, but values arrive corrupted when Windows players connect to the Linux dedicated server. What is the root cause?',
      options: [
        {
          text: '`long` is 4 bytes with MSVC on Windows but 8 bytes on 64-bit Linux, so the two ends disagree on the data layout',
          correct: true,
          why: 'Windows uses the LLP64 model (32-bit `long`); Linux uses LP64 (64-bit `long`). Data written as 4 bytes is read as 8.',
        },
        {
          text: 'Linux servers cannot replicate integer properties',
          why: 'Integer replication works on every platform — when the integer has the same size everywhere, such as `int32` or `int64`.',
        },
        {
          text: '`long` is a floating-point type on Linux',
          why: '`long` is an integer type on every platform. Only its **size** differs.',
        },
        {
          text: 'Windows stores integers with the opposite byte order',
          why: 'Both are little-endian on x86-64 and ARM64, and Unreal\'s serialization handles byte order anyway. The size mismatch is the problem.',
        },
      ],
      explanation:
        'This is exactly the class of bug fixed-size types prevent. (In fact, a `UPROPERTY` of type `long` isn\'t even supported by Unreal\'s reflection — the engine pushes you towards `int32`/`int64` precisely so that sizes match on every platform.)',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'uint8 for enums and bitfields',
      blocks: [
        {
          type: 'p',
          text: '`uint8` shows up constantly in Unreal for two jobs. First, every enum you expose to Blueprints must use it as its underlying type. Second, it is the storage type for **bitfield** flags, which pack several booleans into one byte.',
        },
        {
          type: 'code',
          title: 'Door.h (excerpt)',
          code: `UENUM(BlueprintType)
enum class EDoorState : uint8 {
    Closed,
    Opening,
    Open
};

// Inside ADoor:
UPROPERTY(EditAnywhere, Category = "Door")
EDoorState State = EDoorState::Closed;

UPROPERTY(EditAnywhere, Category = "Door")
uint8 bStartsLocked : 1;

UPROPERTY(EditAnywhere, Category = "Door")
uint8 bAutoClose : 1;`,
          annotations: [
            { lines: 2, text: 'An [[enum-class]] with `uint8` as its underlying type. For `BlueprintType` enums this is required: Blueprints store enums in their **Byte** type, and UnrealHeaderTool rejects other underlying types.' },
            { lines: 10, text: 'One byte in memory and on the network — handy when thousands of actors replicate their state.' },
            { lines: '12-16', text: 'A **bitfield**: `: 1` means "use one bit". The two flags share a single `uint8`. The editor shows them as ordinary checkboxes.' },
          ],
        },
        {
          type: 'memory',
          caption: 'Both flags live in the same byte',
          regions: [
            {
              label: 'One uint8 inside ADoor',
              kind: 'other',
              cells: [
                { name: 'bit 0: bStartsLocked', value: '1', highlight: true },
                { name: 'bit 1: bAutoClose', value: '0', highlight: true },
                { name: 'bits 2–7', value: '(free for more flags)' },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Why the engine loves bitfields',
          text: '`AActor` alone has dozens of boolean flags. Stored as `bool`, each takes a whole byte; as bitfields, eight fit in one. Across tens of thousands of objects that saves memory and, more importantly, keeps hot data in fewer cache lines.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Bitfield limitations',
          text: 'You cannot take the address of a bitfield or bind a `bool&` to it, so it can\'t be passed to a function that writes through a reference. Set default values in the constructor (`bStartsLocked = true;`) — that is the usual engine style for bitfield members.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'bug',
      prompt: 'Firing a 3-round burst with 2 rounds left should leave the clip empty. Instead the HUD shows **255** rounds. Tap the faulty line(s).',
      code: `UPROPERTY(VisibleAnywhere, Category = "Weapon")
uint8 AmmoInClip = 2;

void AWeapon::FireBurst() {
    AmmoInClip -= 3;
    if (AmmoInClip < 0) {
        AmmoInClip = 0;
    }
}`,
      bugLines: [5, 6],
      hint: 'What happens when an unsigned value goes below zero? Can `AmmoInClip < 0` ever be true?',
      explanation:
        'Unsigned arithmetic wraps around: `2 - 3` stored in a `uint8` becomes 255 (well-defined modulo arithmetic, not undefined behavior). The guard on line 6 can never be true because an unsigned value is never negative — compilers even warn that the comparison is always false. Check *before* subtracting, or compute in a signed type and clamp: `AmmoInClip = static_cast<uint8>(FMath::Max(0, AmmoInClip - 3));` (the subtraction happens in `int` after promotion, so it can go negative).',
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'concept',
      title: 'float, double and Large World Coordinates',
      blocks: [
        {
          type: 'p',
          text: 'A `float` has about 7 significant decimal digits; a `double` about 15–16. Unreal measures distance in **centimetres**, so precision is lost as you move away from the world origin: the farther out, the larger the gap between neighbouring representable positions. This standard C++ program prints that gap:',
        },
        {
          type: 'code',
          title: 'precision.cpp (standard C++)',
          runnable: true,
          code: `#include <cmath>
#include <iostream>

int main() {
    // Unreal units are centimetres: 100,000 cm = 1 km
    const double distancesCm[] = {1e2, 1e5, 1e6, 1e7, 1e8};
    for (const double cm : distancesCm) {
        const float f = static_cast<float>(cm);
        const float fStep = std::nextafter(f, 2 * f) - f;
        const double dStep = std::nextafter(cm, 2 * cm) - cm;
        std::cout << cm / 1e5 << " km: float step " << fStep
                  << " cm, double step " << dStep << " cm\\n";
    }
}`,
          output: `0.001 km: float step 7.62939e-06 cm, double step 1.42109e-14 cm
1 km: float step 0.0078125 cm, double step 1.45519e-11 cm
10 km: float step 0.0625 cm, double step 1.16415e-10 cm
100 km: float step 1 cm, double step 1.86265e-09 cm
1000 km: float step 8 cm, double step 1.49012e-08 cm`,
          annotations: [
            { lines: 9, text: '`std::nextafter` returns the next representable value after `f` in the direction of `2 * f`. Subtracting gives the smallest step a `float` can take at that distance.' },
            { lines: 10, text: 'The same measurement for `double`.' },
          ],
        },
        {
          type: 'p',
          text: 'At 100 km from the origin, a `float` position can only move in **1 cm** jumps; at 1,000 km, 8 cm. Long before that, the accumulated rounding in transform maths shows up as jittering meshes, shaky cameras and unstable physics. UE4 stored positions as `float` and capped worlds at roughly 21 km (its `WORLD_MAX` constant was 2,097,152 cm).',
        },
        {
          type: 'p',
          text: 'UE5 introduced [[large-world-coordinates]]: [[fvector]] and the other core math types now store **`double`**. `FVector` is an alias for `UE::Math::TVector<double>`; a float version, `FVector3f`, exists for places where size matters more than range, such as data sent to the GPU.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Mixing float and double',
          text: 'Many APIs still use `float` — `Tick(float DeltaTime)` for a start — while vector maths returns `double`. Writing `float Dist = FVector::Dist(A, B);` silently narrows a `double` to `float`, and compilers may warn. Keep results as `double` (or `FVector::FReal`), or convert deliberately with `static_cast<float>` when you know the value is small. Blueprint float variables are double precision in UE5 too.',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'truefalse',
      prompt: 'In Unreal Engine 5, `FVector` stores its X, Y and Z components as `float`.',
      answer: false,
      explanation:
        'Since UE5.0, `FVector` is `TVector<double>` as part of Large World Coordinates, so positions stay precise far from the origin. If you specifically need floats (for example, compact data for rendering), use `FVector3f`. Old UE4 tutorials that assume `float` components will produce narrowing warnings in UE5.',
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'concept',
      title: 'FMath: Unreal\'s maths toolbox',
      blocks: [
        {
          type: 'p',
          text: '[[fmath]] is a struct full of static functions — Unreal\'s answer to `<cmath>` and `<algorithm>` rolled into one, plus many game-specific helpers. A handful cover most gameplay code:',
        },
        {
          type: 'code',
          title: 'HealthComponent.cpp (excerpts)',
          code: `// Keep health within [0, MaxHealth]
Health = FMath::Clamp(Health - Damage, 0.f, MaxHealth);

// 25% of the way from 0 to 200 -> 50
const float Shield = FMath::Lerp(0.f, 200.f, 0.25f);

// Whole number 1..6, both ends included
const int32 Roll = FMath::RandRange(1, 6);

// Random float in [0.9, 1.1] for damage variance
const float Variance = FMath::FRandRange(0.9f, 1.1f);

const float Biggest = FMath::Max(A, B);
const float Distance = FMath::Abs(Offset);
const double Radians = FMath::DegreesToRadians(90.0);`,
          annotations: [
            { lines: 2, text: '`Clamp(Value, Min, Max)` returns `Value` limited to the range — the same idea as `std::clamp` from C++17.' },
            { lines: 5, text: '`Lerp(A, B, Alpha)` returns `A + Alpha * (B - A)`: linear interpolation. Alpha 0 gives A, 1 gives B.' },
            { lines: 8, text: 'For integers, `RandRange` includes **both** ends. Contrast with many standard-library ranges, which exclude the upper bound.' },
            { lines: 11, text: '`FRandRange` returns a random floating-point value in the range. For reproducible randomness (procedural levels, replays), use a seeded `FRandomStream` instead.' },
            { lines: '13-15', text: 'Templates such as `Max`, `Min` and `Abs` work for `int32`, `float` and `double` alike; conversions such as `DegreesToRadians` save you from typing constants.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just use <cmath> and <algorithm>?',
          text: 'Some of FMath simply wraps the standard functions, but routing everything through one API lets Epic pick the fastest implementation per platform (including SIMD intrinsics), behave identically across compilers, and add helpers the standard library lacks — interpolation, `IsNearlyEqual`, angle utilities and vector overloads. It also matches the rest of the code base, which matters when your teammates read your code.',
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'mcq',
      prompt: 'What are the values of `A`, `B` and `C`?',
      code: `const float A = FMath::Clamp(130.f, 0.f, 100.f);
const float B = FMath::Lerp(0.f, 200.f, 0.25f);
const int32 C = FMath::RandRange(1, 6);`,
      options: [
        {
          text: '`A` is 130, `B` is 50, `C` is a whole number from 1 to 5',
          why: '`Clamp` limits 130 to the maximum of 100, and integer `RandRange` includes the upper bound.',
        },
        {
          text: '`A` is 100, `B` is 0.25, `C` is a whole number from 1 to 6',
          why: '`Lerp` returns a point between A and B, not the alpha itself: `0 + 0.25 × (200 − 0)` = 50.',
        },
        {
          text: '`A` is 100, `B` is 50, `C` is a whole number from 1 to 6',
          correct: true,
          why: 'Clamped to the maximum, a quarter of the way from 0 to 200, and an inclusive random integer — a fair die roll.',
        },
        {
          text: '`A` is 100, `B` is 150, `C` is a whole number from 0 to 6',
          why: '`Lerp` with alpha 0.25 is a quarter of the way from A, not from B; and `RandRange(1, 6)` never returns 0.',
        },
      ],
      explanation:
        '`Clamp(V, Min, Max)` returns `V` limited to the range; `Lerp(A, B, Alpha)` returns `A + Alpha × (B − A)`; integer `RandRange(Min, Max)` returns a value with **both** ends included. Knowing these exact semantics avoids off-by-one surprises such as a die that never rolls a 6.',
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'concept',
      title: 'Comparing floats, smoothing values, and constants',
      blocks: [
        {
          type: 'p',
          text: 'You learned in the C++ course that floating-point arithmetic is not exact: `0.1f + 0.2f == 0.3f` is false. Comparing floats with `==` is almost always a bug. FMath provides tolerance-based comparisons instead:',
        },
        {
          type: 'code',
          title: 'Comparisons and smoothing',
          code: `if (FMath::IsNearlyEqual(Height, TargetHeight, 0.5f)) {
    bReachedTarget = true;
}

if (FMath::IsNearlyZero(Speed, UE_KINDA_SMALL_NUMBER)) {
    StopFootstepSounds();
}

// In Tick: ease the camera arm towards its target length
ArmLength = FMath::FInterpTo(ArmLength, TargetArmLength,
    DeltaTime, 5.f);`,
          annotations: [
            { lines: 1, text: '`IsNearlyEqual(A, B, Tolerance)` is `Abs(A - B) <= Tolerance`. Pick a tolerance that means something in game terms — here, half a centimetre.' },
            { lines: 5, text: 'Always pass a tolerance. The defaults for both functions are `UE_SMALL_NUMBER` (1e-8), so strict that they behave almost like `==`.' },
            { lines: '10-11', text: '`FInterpTo(Current, Target, DeltaTime, Speed)` moves a fraction of the *remaining* distance each frame: fast at first, slowing as it arrives — a smooth ease-out that adapts to the frame rate.' },
          ],
        },
        {
          type: 'table',
          headers: ['Constant', 'Value', 'Use'],
          rows: [
            ['`UE_PI`', '3.14159… (float)', 'Angles in radians; `UE_DOUBLE_PI` for double precision'],
            ['`UE_SMALL_NUMBER`', '1e-8', 'Guarding divisions; very strict comparisons'],
            ['`UE_KINDA_SMALL_NUMBER`', '1e-4', 'A sensible default tolerance for gameplay comparisons'],
            ['`UE_BIG_NUMBER`', '3.4e+38', 'An "infinitely far" starting value when searching for a minimum'],
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'PI, SMALL_NUMBER, KINDA_SMALL_NUMBER',
          text: 'Before UE 5.1 these constants had no `UE_` prefix. The old names were deprecated in 5.1 because short global macros such as `PI` collided with other libraries. You will still see them in older tutorials and code; use the `UE_` versions in new code.',
        },
        {
          type: 'deepdive',
          title: 'How FInterpTo works inside',
          blocks: [
            {
              type: 'p',
              text: 'Simplified, `FInterpTo` does this every call:',
            },
            {
              type: 'code',
              code: `if (Speed <= 0) return Target;          // no smoothing
const auto Dist = Target - Current;
if (Dist * Dist < UE_SMALL_NUMBER) return Target;
const auto Alpha = FMath::Clamp(DeltaTime * Speed, 0.f, 1.f);
return Current + Dist * Alpha;`,
              annotations: [
                { lines: 3, text: 'Snap to the target once close enough, so it actually arrives instead of creeping forever.' },
                { lines: 4, text: 'The step is proportional to frame time, and clamped so a long frame can never overshoot.' },
              ],
            },
            {
              type: 'p',
              text: 'Because each step covers a fraction of what remains, the motion is an exponential ease-out. If you want a **constant** speed instead, use `FInterpConstantTo`. `VInterpTo` and `RInterpTo` do the same for vectors and rotators.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'fill',
      prompt: 'Complete the zooming camera: clamp the target field of view, ease towards it every frame, and stop ticking once it arrives.',
      template: `void AZoomCamera::ZoomIn() {
    TargetFOV = FMath::___(TargetFOV - 10.f, 30.f, 90.f);
    SetActorTickEnabled(true);
}

void AZoomCamera::Tick(float DeltaTime) {
    Super::Tick(DeltaTime);
    CurrentFOV = FMath::___(CurrentFOV, TargetFOV,
        DeltaTime, ZoomSpeed);
    if (FMath::___(CurrentFOV, TargetFOV, 0.01f)) {
        SetActorTickEnabled(false);
    }
}`,
      blanks: [
        { answers: ['Clamp'] },
        { answers: ['FInterpTo', 'FInterpConstantTo'] },
        { answers: ['IsNearlyEqual'] },
      ],
      wordBank: ['Clamp', 'FInterpTo', 'IsNearlyEqual', 'Lerp', 'RandRange', 'Max', 'Abs'],
      explanation:
        '`Clamp` keeps the target between 30° and 90°. `FInterpTo` takes current, target, delta time and speed, and eases smoothly — `Lerp` alone isn\'t frame-rate aware unless you compute the alpha yourself. `IsNearlyEqual` with a tolerance decides "close enough" without the fragility of `==`, and turning tick off afterwards means the camera costs nothing while idle.',
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: '`Height` holds roughly `100.00001f`, yet `FMath::IsNearlyEqual(Height, 100.f)` returns `false`. Why?',
      options: [
        {
          text: '`IsNearlyEqual` only works with `double` arguments',
          why: 'It has overloads for `float` and `double`.',
        },
        {
          text: 'The default tolerance is `UE_SMALL_NUMBER` (1e-8), which is far smaller than the difference of about 0.00001',
          correct: true,
          why: 'With no third argument, the allowed difference is tiny. Pass a meaningful tolerance, such as `UE_KINDA_SMALL_NUMBER` or a gameplay value.',
        },
        {
          text: 'It compares the bit patterns of the two floats exactly',
          why: 'It computes `Abs(A - B) <= Tolerance`. The comparison is tolerance based; the tolerance is just very strict by default.',
        },
        {
          text: '100 cannot be represented exactly as a `float`',
          why: '100 is a small integer and is represented exactly. The issue is the size of the default tolerance.',
        },
      ],
      explanation:
        'Tolerance-based comparison is only as good as the tolerance you choose. The defaults of `IsNearlyEqual` and `IsNearlyZero` are extremely strict, so always pass one: `UE_KINDA_SMALL_NUMBER` (1e-4) for general maths, or a value in game units — "within 1 cm", "within half a degree" — when you know the scale.',
    },
  ],
  takeaways: [
    'Use `int32` as the everyday integer; `int64` for big totals; `uint8` for enums, flags and small values. Blueprints support `uint8`, `int32` and `int64`.',
    'Fixed sizes keep code portable and make saved files and replicated data identical on every platform — `long` is 4 bytes on Windows but 8 on Linux.',
    '`BlueprintType` enums must be `enum class … : uint8`; `uint8 bFlag : 1` bitfields pack booleans into single bits.',
    'Unsigned values wrap around instead of going negative; check before subtracting.',
    'UE5\'s Large World Coordinates made `FVector` a vector of `double`s; watch for narrowing when results flow into `float` APIs.',
    '`FMath` provides `Clamp`, `Lerp`, inclusive `RandRange`, `IsNearlyEqual` and frame-rate-aware `FInterpTo`; always pass a tolerance to the comparisons.',
    'Use `UE_PI`, `UE_SMALL_NUMBER` and `UE_KINDA_SMALL_NUMBER`; the unprefixed names are deprecated since UE 5.1.',
  ],
  reading: [
    {
      title: 'Large World Coordinates in Unreal Engine 5',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/large-world-coordinates-in-unreal-engine-5',
      source: 'unreal-docs',
      note: 'Why UE5 moved to doubles, the float variants such as `FVector3f`, and how to upgrade older code.',
    },
    {
      title: 'Epic C++ Coding Standard — Portable C++ code',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/epic-cplusplus-coding-standard-for-unreal-engine',
      source: 'unreal-docs',
      note: 'The rules for `int32` and friends, including when plain `int` is acceptable.',
    },
    {
      title: 'Fixed width integer types',
      url: 'https://en.cppreference.com/w/cpp/types/integer',
      source: 'cppreference',
      note: 'The standard `std::int32_t` family that Unreal\'s typedefs parallel.',
    },
    {
      title: 'std::nextafter',
      url: 'https://en.cppreference.com/w/cpp/numeric/math/nextafter',
      source: 'cppreference',
      note: 'The function used in this lesson to measure floating-point spacing.',
    },
  ],
};
