import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-transforms',
  title: 'FVector, FRotator, FQuat and FTransform',
  summary: 'Unreal\'s coordinate system and the maths types that place, aim and move everything in a level.',
  minutes: 19,
  objectives: [
    'Describe Unreal\'s left-handed, Z-up coordinate system and its units',
    'Use `FVector` arithmetic, length, distance, normalization, dot and cross products for real gameplay checks',
    'Read and build `FRotator`s correctly (Pitch, Yaw, Roll in degrees) and avoid the constructor-order trap',
    'Explain why `FQuat` exists (gimbal lock, interpolation) and use it with radians',
    'Use `FTransform` to convert between world and relative space, and move actors with sweeps and local offsets',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Unreal\'s coordinate system',
      blocks: [
        {
          type: 'p',
          text: 'Every position in a level is three numbers along three axes. Which way each axis points is a convention, and engines disagree. Unreal\'s is:',
        },
        {
          type: 'table',
          headers: ['Axis', 'Direction', 'Editor colour', 'Constant'],
          rows: [
            ['X', 'Forward', 'Red', '`FVector::ForwardVector` = (1, 0, 0)'],
            ['Y', 'Right', 'Green', '`FVector::RightVector` = (0, 1, 0)'],
            ['Z', 'Up', 'Blue', '`FVector::UpVector` = (0, 0, 1)'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Z is up.** Height is Z — unlike Unity, where Y is up.',
            '**Left-handed.** With X forward and Z up, a right-handed system would put +Y on the *left*. Unreal puts it on the right, which makes the system left-handed. Content exported from right-handed tools (Blender, Maya) is converted on import.',
            '**1 unit = 1 cm.** An [[unreal-unit]] is a centimetre, so a 180-unit capsule is a 1.8 m person. Physics and gravity assume this scale.',
          ],
        },
        {
          type: 'code',
          title: 'Logging a position',
          code: `const FVector Here = GetActorLocation();
UE_LOG(LogTemp, Log, TEXT("At %s, height %.1f m"),
    *Here.ToString(), Here.Z / 100.0);
// At X=1200.000 Y=-350.000 Z=90.000, height 0.9 m`,
          annotations: [
            { lines: 1, text: 'An [[fvector]] is a struct of three numbers: `X`, `Y`, `Z`.' },
            { lines: '2-3', text: '`ToString()` formats all three; dividing Z by 100 converts centimetres to metres.' },
          ],
        },
        {
          type: 'callout',
          variant: 'history',
          title: 'Double precision since UE5',
          text: 'In UE4, `FVector` held `float`s, whose precision runs out a few kilometres from the origin (objects start to jitter). UE5 introduced [[large-world-coordinates|Large World Coordinates]]: `FVector`, `FRotator`, `FQuat` and `FTransform` now use `double`. Single-precision variants (`FVector3f`, `FTransform3f`) remain for rendering and compact data. In practice: store positions in `FVector`, and expect `double` when you read components.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'concept',
      title: 'FVector: arithmetic, length and distance',
      blocks: [
        {
          type: 'p',
          text: '`FVector` overloads the operators you learned to write in the operator-overloading lesson, so vector maths reads like maths:',
        },
        {
          type: 'code',
          code: `FVector A(100.0, 0.0, 0.0);
FVector B(100.0, 300.0, 400.0);

FVector Sum = A + B;            // (200, 300, 400)
FVector Offset = B - A;         // (0, 300, 400): from A to B
FVector Doubled = A * 2.0;      // (200, 0, 0)
FVector Scaled = B * FVector(1.0, 0.5, 0.0); // per-axis

double Len = Offset.Size();              // 500
double LenSq = Offset.SizeSquared();     // 250000
double D = FVector::Dist(A, B);          // 500
double DSq = FVector::DistSquared(A, B); // 250000

bool Same = A.Equals(B, 0.01);  // compare with a tolerance`,
          annotations: [
            { lines: 5, text: '`B - A` is the displacement **from A to B**. Its length is the distance between them, its direction points at B.' },
            { lines: 7, text: 'Multiplying two vectors is component-wise in Unreal (not a dot product).' },
            { lines: 9, text: '`Size()` (alias `Length()`) uses the Pythagorean theorem in 3D: √(0² + 300² + 400²) = 500.' },
            { lines: 10, text: '`SizeSquared()` skips the square root — cheaper, and enough for comparisons.' },
            { lines: 14, text: 'Never compare floating-point vectors with `==`: tiny rounding differences make equal-looking vectors unequal. Use `Equals` with a tolerance ([[epsilon-comparison]]).' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Compare squared distances',
          text: 'To ask "is the player within 800 units?", compare `DistSquared(A, B) < 800.0 * 800.0` instead of `Dist(A, B) < 800.0`. Both sides of the comparison are squared, so the answer is identical, and you skip a square root. For 200 enemies checking every frame, that is free performance — but square **both** sides, or the check is silently wrong.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'mcq',
      prompt: 'Each of 200 turrets checks every frame whether the player is within `Range` units. Which check is both **correct** and **cheapest**?',
      codeOptions: true,
      options: [
        {
          text: 'FVector::Dist(TurretLoc, PlayerLoc) < Range',
          why: 'Correct result, but it computes a square root per turret per frame that a squared comparison avoids.',
        },
        {
          text: 'FVector::DistSquared(TurretLoc, PlayerLoc) < Range',
          why: 'Compares a squared distance with an unsquared range: a turret with `Range = 1000` would only react inside about 31.6 units.',
        },
        {
          text: 'FVector::DistSquared(TurretLoc, PlayerLoc) < Range * Range',
          correct: true,
          why: 'Correct. Both sides are squared, so the comparison is equivalent to the distance check, without the square root.',
        },
        {
          text: '(TurretLoc - PlayerLoc).Size() < Range * Range',
          why: 'The opposite mistake: a real distance compared with a squared range. With `Range = 1000` the turret would react up to 1,000,000 units — 10 km — away.',
        },
      ],
      explanation:
        'Because distances are never negative, `d < r` and `d² < r²` give the same answer. Squared comparisons are a classic game-programming optimization; the classic bug is squaring only one side.',
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'concept',
      title: 'Directions and the dot product',
      blocks: [
        {
          type: 'p',
          text: 'A **direction** is a vector of length 1 — a [[unit-vector]]. You get one by dividing a vector by its length, which Unreal calls normalizing:',
        },
        {
          type: 'code',
          code: `FVector ToPlayer = PlayerLoc - GetActorLocation();

FVector Dir = ToPlayer.GetSafeNormal();  // copy, length 1
bool bOk = ToPlayer.Normalize();         // in place, returns
                                         // false if too short`,
          annotations: [
            { lines: 3, text: '`GetSafeNormal()` returns a normalized copy — or the zero vector if the input is (nearly) zero length, instead of dividing by zero. "Safe" is the point: two actors at the same spot would otherwise produce NaNs.' },
            { lines: '4-5', text: '`Normalize()` modifies the vector itself and returns `bool`. Do not use it where a vector value is expected.' },
          ],
        },
        {
          type: 'p',
          text: 'The [[dot-product]] of two unit vectors is the cosine of the angle between them. That single number answers "is it in front of me, and how far off to the side?":',
        },
        {
          type: 'table',
          headers: ['Dot of two unit vectors', 'Angle', 'Meaning'],
          rows: [
            ['1', '0°', 'Exactly the same direction'],
            ['0.707', '45°', 'Within a 90° cone'],
            ['0.5', '60°', 'Within a 120° cone'],
            ['0', '90°', 'Perpendicular — exactly to the side'],
            ['−1', '180°', 'Exactly behind'],
          ],
        },
        {
          type: 'code',
          title: 'Guard.cpp',
          code: `bool AGuard::CanSee(const AActor* Target) const {
    const FVector ToTarget =
        (Target->GetActorLocation() - GetActorLocation())
            .GetSafeNormal();
    const double Facing = FVector::DotProduct(
        GetActorForwardVector(), ToTarget);
    return Facing >= FMath::Cos(
        FMath::DegreesToRadians(ViewHalfAngle));
}`,
          annotations: [
            { lines: '2-4', text: 'Direction from the guard to the target. Normalizing matters: the dot product only equals the cosine when **both** vectors have length 1.' },
            { lines: '5-6', text: '`GetActorForwardVector()` is already a unit vector: the actor\'s local +X axis in world space. `A.Dot(B)` is equivalent.' },
            { lines: '7-8', text: 'With `ViewHalfAngle = 60`, the guard sees anything within 60° either side of straight ahead (cos 60° = 0.5). `FMath::Cos` works in radians, hence the conversion.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why the dot product is everywhere in games',
          text: 'It is three multiplications and two additions — no trigonometry — yet it measures alignment. Vision cones, backstab checks ("is the attacker behind?" means dot < 0), how directly a surface faces a light, and how much of a velocity points along a slope are all dot products.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'The cross product',
      blocks: [
        {
          type: 'p',
          text: 'The [[cross-product]] of two vectors is a third vector **perpendicular to both**. Its length is |A||B| sin θ, and its direction depends on the operand order.',
        },
        {
          type: 'code',
          code: `FVector Up = FVector::CrossProduct(
    FVector::ForwardVector, FVector::RightVector); // (0,0,1)

// Is the target to my right or to my left?
const FVector ToTarget = TargetLoc - GetActorLocation();
const double Side = FVector::CrossProduct(
    GetActorForwardVector(), ToTarget).Z;
// Side > 0: right, Side < 0: left, ~0: dead ahead or behind`,
          annotations: [
            { lines: '1-2', text: 'In Unreal\'s axes, Forward × Right = Up. Swapping the operands gives Down: the cross product is *anti*-commutative.' },
            { lines: '6-7', text: 'For level ground, the Z of Forward × ToTarget tells which side the target is on — useful for choosing a turn direction or a "hit from the left" animation.' },
          ],
        },
        {
          type: 'p',
          text: 'Typical uses: building a coordinate frame (given forward and up, cross them to get right), computing a surface normal from two edges of a triangle, and finding the axis to rotate around to turn one direction into another. For the simple left/right test, `FVector::DotProduct(GetActorRightVector(), ToTarget) > 0` works too and is easier to read.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Operators | and ^',
          text: 'Unreal also overloads `A | B` as the dot product and `A ^ B` as the cross product. You will see them in engine code, but the named functions (`DotProduct`, `CrossProduct`, or `A.Dot(B)`, `A.Cross(B)`) are far clearer to readers who do not know the convention — and `^` has surprisingly low [[precedence]].',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'fill',
      prompt: 'Complete the backstab check: the attack counts if the attacker is **behind** the victim.',
      template: `bool IsBehind(const AActor* Victim, const AActor* Attacker) {
    const FVector ToAttacker =
        (Attacker->GetActorLocation() - Victim->GetActorLocation())
            .___();
    const double D = FVector::___(
        Victim->GetActorForwardVector(), ToAttacker);
    return D < ___;
}`,
      blanks: [{ answers: ['GetSafeNormal'] }, { answers: ['DotProduct'] }, { answers: ['0.0', '0', '0.0f'] }],
      wordBank: ['GetSafeNormal', 'DotProduct', '0.0', 'Normalize', 'CrossProduct', '1.0', 'Size'],
      explanation:
        '`GetSafeNormal()` turns the offset into a direction (returning a vector, unlike `Normalize()`, which returns `bool`). The dot product of the victim\'s forward vector and the direction to the attacker is negative when the angle exceeds 90°, i.e. the attacker is in the half-space behind the victim. Comparing with `1.0` would require being exactly in front; `CrossProduct` measures sideways-ness, not front/back.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'FRotator: Pitch, Yaw and Roll',
      blocks: [
        {
          type: 'p',
          text: 'An [[frotator]] describes an orientation as three angles **in degrees** — the way a pilot or a camera operator thinks:',
        },
        {
          type: 'table',
          headers: ['Angle', 'Rotates around', 'Feels like', 'Positive means'],
          rows: [
            ['**Pitch**', 'Y (right) axis', 'Nodding: looking up and down', 'Nose up'],
            ['**Yaw**', 'Z (up) axis', 'Shaking your head: turning left and right', 'Turning right (clockwise seen from above)'],
            ['**Roll**', 'X (forward) axis', 'Tilting your head to one side', 'Banking around the forward axis'],
          ],
        },
        {
          type: 'code',
          code: `FRotator Rot(10.0, 90.0, 0.0);  // Pitch, Yaw, Roll!
SetActorRotation(Rot);           // face +Y, nose up 10°

FVector Facing = Rot.Vector();   // unit forward direction
FRotator Look = (TargetLoc - GetActorLocation()).Rotation();

FRotator Spin(0.0, 720.0, 0.0);  // two full turns
FRotator Tidy = Spin.GetNormalized(); // yaw 0`,
          annotations: [
            { lines: 1, text: 'The constructor order is **Pitch, Yaw, Roll** — not X, Y, Z, and not the order the editor displays.' },
            { lines: 4, text: '`Vector()` converts an orientation into the forward direction it points.' },
            { lines: 5, text: 'And back: `Rotation()` gives the rotator that faces along a vector (with zero roll) — a quick "look at".' },
            { lines: '7-8', text: 'A rotator can hold any angle, including several turns. `GetNormalized()` maps each angle into (−180, 180].' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The order trap',
          text: 'The Details panel and the Blueprint *Make Rotator* node show rotation as **X (Roll), Y (Pitch), Z (Yaw)**. The C++ constructor takes **(Pitch, Yaw, Roll)**. Copying "0, 0, 90" from the editor into `FRotator(0, 0, 90)` gives you a 90° *roll* instead of a 90° *yaw* — the object tips onto its side. When in doubt, set the members by name: `Rot.Yaw = 90.0;`.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'mcq',
      prompt: 'An actor faces +X. You call `SetActorRotation(FRotator(0.0, 90.0, 0.0));`. What does it do?',
      options: [
        {
          text: 'It turns to face +Y (to its original right)',
          correct: true,
          why: 'Correct. The middle argument is Yaw, and positive yaw turns from +X towards +Y.',
        },
        {
          text: 'It tilts its nose straight up',
          why: 'That would be a pitch of 90°: `FRotator(90.0, 0.0, 0.0)`. Pitch is the *first* argument.',
        },
        {
          text: 'It rolls onto its side',
          why: 'Roll is the *third* argument. This is the result people get when they copy the editor\'s X/Y/Z order into the constructor.',
        },
        {
          text: 'It turns to face −Y (to its original left)',
          why: 'Positive yaw turns clockwise when seen from above (from +X towards +Y), which is to the right in Unreal\'s left-handed system.',
        },
      ],
      explanation:
        '`FRotator(Pitch, Yaw, Roll)`: yaw is rotation around the vertical Z axis, so it changes which way the actor faces on the ground. Remember that the editor displays the same three values in a different order (Roll, Pitch, Yaw as X, Y, Z).',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'FQuat: why quaternions exist',
      blocks: [
        {
          type: 'p',
          text: 'Pitch, yaw and roll (Euler angles) are easy for humans but awkward for maths. Three problems push engines towards quaternions:',
        },
        {
          type: 'list',
          items: [
            '**[[gimbal-lock|Gimbal lock]].** Euler angles are applied one after another. Pitch the nose straight up (90°) and the yaw and roll axes end up spinning around the *same* world axis: changing either does the same thing, and one degree of freedom is gone. Near that pose, small changes in orientation need huge jumps in the angles.',
            '**Interpolation.** Blending angles component by component takes strange, curving paths, and wrapping goes the long way: from yaw 350° to 10° "interpolates" through 180° instead of turning 20°.',
            '**Composition.** Combining two Euler rotations ("turn, then tilt") requires converting to matrices and back.',
          ],
        },
        {
          type: 'p',
          text: 'A quaternion ([[fquat]]) stores a rotation as four numbers (`X`, `Y`, `Z`, `W`) that encode **an axis and an angle around it**. It has no gimbal lock, composes by multiplication, and interpolates along the shortest arc with [[slerp]].',
        },
        {
          type: 'code',
          title: 'Turret.cpp',
          code: `// 45° around the vertical axis. FQuat angles are RADIANS.
const FQuat Turn(FVector::UpVector,
    FMath::DegreesToRadians(45.0));
const FVector Aim = Turn.RotateVector(FVector::ForwardVector);

// Smoothly turn the head towards a target each frame
const FQuat Current = Head->GetComponentQuat();
const FQuat Target = (TargetLoc - Head->GetComponentLocation())
    .ToOrientationQuat();
const float Alpha = FMath::Clamp(TurnSpeed * DeltaSeconds,
    0.0f, 1.0f);
Head->SetWorldRotation(FQuat::Slerp(Current, Target, Alpha));

FRotator ForHumans = Current.Rotator();  // convert for display`,
          annotations: [
            { lines: '2-3', text: 'Axis (must be a unit vector) and angle in **radians**. `FRotator` uses degrees; `FQuat` uses radians — a classic source of bugs.' },
            { lines: 4, text: '`RotateVector` applies the rotation to a vector: forward rotated 45° to the right.' },
            { lines: '8-9', text: '`ToOrientationQuat()` is the quaternion version of "face along this vector".' },
            { lines: 12, text: '`Slerp` takes the shortest arc at a steady angular speed, with no wrap-around surprises.' },
            { lines: 14, text: 'Convert back to a rotator whenever a human needs to read it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why Unreal keeps both',
          text: 'Designers type rotations into the Details panel, Blueprints expose them, and animators think in pitch, yaw and roll — so `FRotator` is the human-facing type. Internally, `FTransform` stores a quaternion, and the engine converts whenever you call `SetActorRotation(FRotator)`. Use `FRotator` for input, tuning and display; use `FQuat` for composing and interpolating 3D rotations. (`FRotator` can also represent several full turns, like 720°, which a quaternion cannot — handy for a spinning wheel\'s accumulated angle.)',
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A camera tripod head',
          text: 'A tripod head with separate pan and tilt knobs is Euler angles: perfect for panning a landscape, but tilt the camera straight up and the pan knob now just spins the picture around the lens — you have lost a direction. A quaternion is like a ball head: you swing the camera directly to any orientation along the shortest path.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'A rotating platform should turn 90° per second around the vertical axis, but it spins wildly fast and erratically. Tap the faulty line.',
      code: `void ARotatingPlatform::Tick(float DeltaSeconds) {
    Super::Tick(DeltaSeconds);
    const double Degrees = 90.0 * DeltaSeconds;
    const FQuat Step(FVector::UpVector, Degrees);
    AddActorWorldRotation(Step);
}`,
      bugLines: [4],
      hint: 'Which unit does an axis-angle FQuat expect?',
      explanation:
        'The `FQuat(Axis, Angle)` constructor takes the angle in **radians**. Line 4 passes degrees, so each frame turns about 57 times too far (1 radian ≈ 57.3°) — roughly 86° per frame at 60 fps, which looks like erratic flickering rather than a smooth turn. Fix: `FQuat Step(FVector::UpVector, FMath::DegreesToRadians(Degrees));` — or work in degrees with a rotator: `AddActorWorldRotation(FRotator(0.0, Degrees, 0.0));`.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'FTransform: location, rotation and scale together',
      blocks: [
        {
          type: 'p',
          text: 'An [[ftransform]] bundles everything needed to place something: a **translation** (`FVector`), a **rotation** (`FQuat`) and a **3D scale** (`FVector`). Every actor and scene component has one. Its real power is converting points between spaces.',
        },
        {
          type: 'code',
          title: 'Drone.cpp',
          code: `const FTransform& T = GetActorTransform();

FVector Location = T.GetLocation();
FQuat Rotation = T.GetRotation();
FVector Scale = T.GetScale3D();

// "80 cm in front of me and 20 cm below", in world space
const FVector Muzzle =
    T.TransformPosition(FVector(80.0, 0.0, -20.0));

// Where is the player, from my point of view?
const FVector PlayerLocal =
    T.InverseTransformPosition(PlayerLoc);
const bool bPlayerAhead = PlayerLocal.X > 0.0;`,
          annotations: [
            { lines: '3-5', text: 'The three parts. For an actor these are the root component\'s world-space values.' },
            { lines: '8-9', text: '`TransformPosition` takes a point in the actor\'s **local** space and returns it in **world** space: scale it, rotate it, then add the translation. Wherever the drone flies or turns, the muzzle stays at the right spot.' },
            { lines: '12-13', text: '`InverseTransformPosition` goes the other way: world to local.' },
            { lines: 14, text: 'In local space, +X is "in front of me" — no dot product required.' },
          ],
        },
        {
          type: 'table',
          headers: ['Function', 'Converts', 'Uses translation?'],
          rows: [
            ['`TransformPosition(P)`', 'Local point → world point', 'Yes'],
            ['`InverseTransformPosition(P)`', 'World point → local point', 'Yes'],
            ['`TransformVector(V)`', 'Local direction/offset → world (with scale)', 'No'],
            ['`TransformVectorNoScale(V)`', 'Local direction → world, ignoring scale', 'No'],
          ],
        },
        {
          type: 'deepdive',
          title: 'Multiplication order: FTransform vs FQuat',
          blocks: [
            {
              type: 'p',
              text: 'Composing transforms is multiplication, and order matters. For `FTransform`, `A * B` means "apply **A first**, then **B**". A component\'s world transform is therefore `Relative * ParentWorld`: first place it relative to the parent, then carry it along with the parent.',
            },
            {
              type: 'p',
              text: 'For `FQuat` the convention is the opposite, as in most maths texts: `A * B` applies **B first**, then A. Unreal\'s source comments spell out both; when you compose by hand, check the comment rather than trusting intuition.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'concept',
      title: 'World space, relative space and moving actors',
      blocks: [
        {
          type: 'p',
          text: 'Two spaces matter day to day. [[world-space|World space]] is measured from the level\'s origin along the fixed world axes. [[relative-space|Relative (local) space]] is measured from a parent, along the parent\'s rotated axes. Actor functions work on the root component, in world space unless they say "local"; component functions say which space they use.',
        },
        {
          type: 'code',
          title: 'Hovercraft.cpp',
          code: `void AHovercraft::Tick(float DeltaSeconds) {
    Super::Tick(DeltaSeconds);

    // Forward along MY facing, stopping at walls
    FHitResult Hit;
    AddActorLocalOffset(
        FVector(Speed * DeltaSeconds, 0.0, 0.0), true, &Hit);
    if (Hit.bBlockingHit) {
        AddActorLocalRotation(FRotator(0.0, 90.0, 0.0));
    }
}

void AHovercraft::ResetToStart() {
    SetActorLocation(StartLocation);       // teleport, no sweep
    Thruster->SetRelativeLocation(FVector(-120.0, 0.0, 30.0));
}`,
          annotations: [
            { lines: '6-7', text: '`AddActorLocalOffset` moves along the actor\'s **own** axes: local +X is wherever it is facing. `AddActorWorldOffset(GetActorForwardVector() * Speed * DeltaSeconds, true, &Hit)` would do the same.' },
            { lines: 7, text: '`true` = **sweep**: the root component\'s collision is moved along the path and stops at the first blocking hit, which is reported in `Hit`. Without it, the actor teleports and can end up inside walls. Sweeps and `FHitResult` are covered in depth in the Collision unit.' },
            { lines: 9, text: 'Bumped into something: turn 90° to the right, relative to the current facing.' },
            { lines: 14, text: '`SetActorLocation` takes a **world** position. With the sweep flag left at `false`, it simply teleports there.' },
            { lines: 15, text: 'Components are usually positioned **relative** to their parent: the thruster stays 120 cm behind the hull however the hovercraft turns. `SetWorldLocation` exists when you really need world space.' },
          ],
        },
        {
          type: 'table',
          headers: ['Actor function', 'Space'],
          rows: [
            ['`GetActorLocation` / `SetActorLocation`', 'World'],
            ['`AddActorWorldOffset` / `AddActorWorldRotation`', 'World axes'],
            ['`AddActorLocalOffset` / `AddActorLocalRotation`', 'The actor\'s own axes'],
            ['`GetActorForwardVector` / `RightVector` / `UpVector`', 'The actor\'s axes, expressed in world space'],
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Moving with a sweep returns early, not false',
          text: '`SetActorLocation(Target, true, &Hit)` returns whether any movement happened. If something blocks the way halfway, the actor stops at the obstacle, the function still returns `true`, and `Hit.bBlockingHit` tells you it was stopped. Check the hit result, not just the return value.',
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'truefalse',
      prompt: '`AddActorLocalOffset(FVector(100.0, 0.0, 0.0))` always moves the actor 100 cm along the world X axis.',
      answer: false,
      explanation:
        '"Local" means the offset is expressed in the actor\'s own coordinate frame: its +X is its forward vector. An actor rotated 90° in yaw moves 100 cm along world **+Y** instead. To move along the world axis regardless of facing, use `AddActorWorldOffset(FVector(100.0, 0.0, 0.0))`.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'mcq',
      prompt: 'A drone\'s gun muzzle is 80 cm in front of and 20 cm below the drone\'s centre. Which expression gives the muzzle\'s **world** position, whatever way the drone is facing?',
      codeOptions: true,
      options: [
        {
          text: 'GetActorLocation() + FVector(80.0, 0.0, -20.0)',
          why: 'This adds the offset along the **world** axes. It is only right while the drone faces exactly +X; turn it and the muzzle stays behind, in the old direction.',
        },
        {
          text: 'GetActorTransform().InverseTransformPosition(\n    FVector(80.0, 0.0, -20.0))',
          why: 'The inverse converts world to local. Here it treats the local offset as a world position and returns nonsense.',
        },
        {
          text: 'GetActorTransform().TransformPosition(\n    FVector(80.0, 0.0, -20.0))',
          correct: true,
          why: 'Correct. The offset is given in the drone\'s local space and converted to world space: scaled, rotated by the drone\'s rotation, then translated to its location.',
        },
        {
          text: 'GetActorRotation().Vector() * 80.0 - 20.0',
          why: 'This compiles (subtracting a number subtracts it from every component), but it ignores the drone\'s location and treats "20 cm below" as "minus 20 on every axis".',
        },
      ],
      explanation:
        'Offsets attached to an object ("in front of me", "on my left shoulder") are naturally local. `TransformPosition` maps them into world space using the object\'s full transform, so they follow every move and turn. This is exactly how components with relative locations work internally.',
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      prompt: 'Why does `FTransform` store its rotation as an `FQuat` rather than an `FRotator`?',
      options: [
        {
          text: 'Quaternions compose and interpolate cleanly and do not suffer from gimbal lock',
          correct: true,
          why: 'Correct. Transforms are constantly combined (child × parent) and blended (animation), which is exactly where Euler angles misbehave.',
        },
        {
          text: 'Quaternions use less memory than three angles',
          why: 'A quaternion is four numbers, a rotator three. The choice is about correctness, not size.',
        },
        {
          text: '`FRotator` cannot represent every orientation',
          why: 'It can represent every orientation (and even several turns). The problem is how Euler angles behave under composition and interpolation, and near gimbal lock.',
        },
        {
          text: 'Blueprints cannot display rotators',
          why: 'The opposite: Blueprints and the editor display rotators precisely because they are human-readable. The engine converts to quaternions internally.',
        },
      ],
      explanation:
        'Each representation has a job. `FRotator` is for humans — readable degrees in the editor and Blueprints. `FQuat` is for the engine — robust composition, interpolation and no gimbal lock. Converting between them is cheap, so use whichever fits the task at hand.',
    },
  ],
  takeaways: [
    'Unreal is left-handed and Z-up: X forward, Y right, Z up; 1 unit = 1 cm; `FVector` and friends use `double` since UE5.',
    'Use `DistSquared` against a squared range for cheap checks, `Equals` with a tolerance instead of `==`, and `GetSafeNormal()` for directions.',
    'The dot product of unit vectors is the cosine of the angle between them — the basis of vision cones and front/behind tests; the cross product gives a perpendicular vector.',
    '`FRotator(Pitch, Yaw, Roll)` is in degrees, and its constructor order differs from the editor\'s X/Y/Z (Roll, Pitch, Yaw) display.',
    '`FQuat` avoids gimbal lock and interpolates cleanly with `Slerp`; its axis-angle constructor takes radians.',
    '`FTransform` = translation + rotation + scale; `TransformPosition` maps local to world, `InverseTransformPosition` world to local.',
    'Actor moves are in world space unless they say "local"; pass `bSweep = true` to stop at blocking collision and inspect the `FHitResult`.',
  ],
  reading: [
    {
      title: 'Coordinate System and Spaces',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/coordinate-system-and-spaces-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s description of world, local and component spaces and the axis conventions.',
    },
    {
      title: 'Gimbal lock',
      url: 'https://en.wikipedia.org/wiki/Gimbal_lock',
      source: 'article',
      note: 'Diagrams and animations that make the lost degree of freedom easy to see.',
    },
    {
      title: 'Quaternions and spatial rotation',
      url: 'https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation',
      source: 'article',
      note: 'The maths behind axis-angle quaternions, composition and slerp, for when you want to go deeper.',
    },
    {
      title: 'Dot product',
      url: 'https://en.wikipedia.org/wiki/Dot_product',
      source: 'article',
      note: 'The geometric definition (|A||B| cos θ) that every facing and vision-cone check relies on.',
    },
  ],
};
