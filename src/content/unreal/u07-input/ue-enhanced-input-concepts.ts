import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-enhanced-input-concepts',
  title: 'Enhanced Input Concepts',
  summary:
    'Input Actions, Mapping Contexts, Modifiers, Triggers and trigger events: how Unreal turns key presses into player intent.',
  minutes: 17,
  objectives: [
    'Explain why Enhanced Input replaced the legacy Action/Axis Mapping system',
    'Pick the right value type (bool, Axis1D, Axis2D, Axis3D) for an Input Action',
    'Use Input Mapping Contexts and priorities to switch control schemes at run time',
    'Combine Negate, Swizzle and Dead Zone modifiers to shape raw device input',
    'Predict which `ETriggerEvent`s fire for a given trigger and press timeline',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'From keys to intent',
      blocks: [
        {
          type: 'p',
          text: 'A player presses **W** on a keyboard, pushes a thumbstick, or taps a touch screen. Your gameplay code does not care which: it wants to know the player\'s **intent** — "move forward", "jump", "reload". An input system is the translation layer between physical devices and that intent.',
        },
        {
          type: 'p',
          text: 'Unreal 4 shipped a simple layer: **Action Mappings** and **Axis Mappings** in Project Settings, saved to `DefaultInput.ini` and bound in C++ by *string name*. You will still meet it in older tutorials and projects, so recognise it:',
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'DefaultInput.ini (legacy)',
          code: `[/Script/Engine.InputSettings]
+ActionMappings=(ActionName="Jump",Key=SpaceBar)
+AxisMappings=(AxisName="MoveForward",Key=W,Scale=1.0)
+AxisMappings=(AxisName="MoveForward",Key=S,Scale=-1.0)`,
          annotations: [
            { lines: 2, text: 'An **action** mapping: a named, on/off event bound to a key.' },
            { lines: '3-4', text: 'An **axis** mapping: a named float. W contributes +1 and S contributes −1 to the same `MoveForward` axis.' },
          ],
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp (legacy — do not copy)',
          code: `PlayerInputComponent->BindAxis(
    "MoveForward", this, &AMyCharacter::MoveForward);
PlayerInputComponent->BindAction(
    "Jump", IE_Pressed, this, &ACharacter::Jump);`,
          annotations: [
            { lines: '1-2', text: 'Bound by string (an [[fname]]). Misspell it as `"MoveForwrd"` and it still compiles — the axis just never fires.' },
            { lines: '3-4', text: '`IE_Pressed` is the legacy event type. Anything subtler (hold, double tap, dead zones) had to be coded by hand.' },
          ],
        },
        {
          type: 'p',
          text: 'Since **UE 5.1** the legacy system is deprecated and [[enhanced-input]] is the default for new projects. Enhanced Input is built from four kinds of objects, each covered in this lesson:',
        },
        {
          type: 'table',
          headers: ['Building block', 'What it is', 'Example asset'],
          rows: [
            ['[[input-action]] (`UInputAction`)', 'One thing the player can do, plus the type of value it produces', '`IA_Jump`, `IA_Move`'],
            ['[[input-mapping-context]] (`UInputMappingContext`)', 'A set of key → action mappings that can be switched on and off', '`IMC_OnFoot`, `IMC_Vehicle`'],
            ['[[input-modifier]] (`UInputModifier`)', 'Transforms the raw value (invert, swap axes, dead zone…)', 'Negate, Dead Zone'],
            ['[[input-trigger]] (`UInputTrigger`)', 'Decides *when* the action fires', 'Pressed, Hold, Tap'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why replace a system that worked?',
          text: 'The legacy layer had four structural problems. **Strings**: actions were identified by names, so typos failed silently. **One global table**: there was no built-in way to say "in a car, W means throttle", so code filled up with `if (bInVehicle)` branches. **Behaviour in code**: dead zones, hold-to-charge and tap-vs-hold needed hand-written timers. **Split axes**: movement was two separate 1D axes stitched together in C++. Enhanced Input turns all four into *data*: actions are typed [[asset|assets]], contexts are layered at run time, and modifiers and triggers are configured in the editor where designers can tune them.',
        },
        {
          type: 'callout',
          variant: 'history',
          text: 'Enhanced Input first shipped as an experimental plugin late in UE4\'s life, matured through UE 5.0, and became the default in UE 5.1. It is still technically a plugin (`EnhancedInput`) — that matters when you add it to `Build.cs` in the next lesson.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'In Enhanced Input, what does your gameplay C++ code bind a handler function to?',
      options: [
        {
          text: 'An Input Action asset, such as `IA_Jump`',
          correct: true,
          why: 'Right. Code reacts to *intent* (the action). Which keys produce that intent is decided by mapping contexts, which code never needs to know about.',
        },
        {
          text: 'A specific key, such as `EKeys::SpaceBar`',
          why: 'Binding to keys would tie code to one device and one layout — exactly what the action/mapping split exists to avoid.',
        },
        {
          text: 'A string action name from `DefaultInput.ini`',
          why: 'That is the legacy system. Enhanced Input uses typed object references to assets, so a missing action is visible instead of a silent typo.',
        },
        {
          text: 'An Input Mapping Context',
          why: 'Contexts decide which keys map to which actions, and are added or removed as a set. Handlers are bound to the actions inside them.',
        },
      ],
      explanation:
        'Enhanced Input separates *what the player wants* (Input Actions, which code binds to) from *how they express it* (key mappings inside Mapping Contexts). That separation is what lets the same `Jump` handler work for Space, gamepad A, or a remapped key without any code changes.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Input Actions and value types',
      blocks: [
        {
          type: 'p',
          text: 'An [[input-action]] is a small asset (by convention prefixed `IA_`) that represents one player intent. Its most important setting is the **Value Type** — the shape of data the action delivers to your code:',
        },
        {
          type: 'table',
          headers: ['Value Type (editor)', 'C++ type you read', 'Typical actions'],
          rows: [
            ['Digital (bool)', '`bool`', 'Jump, Interact, Fire, Pause'],
            ['Axis1D (float)', '`float`', 'Throttle, zoom (mouse wheel), lean'],
            ['Axis2D (Vector2D)', '`FVector2D`', 'Move (WASD / left stick), Look (mouse / right stick)'],
            ['Axis3D (Vector)', '`FVector`', 'Free-flight with up/down, motion-controller input'],
          ],
        },
        {
          type: 'p',
          text: 'Any key can drive any action; the value is converted to fit. A digital key such as **W** produces `1.0` while held. Feed it into an Axis2D action and you get `(1, 0)` — the key fills only the **X** component. Analog axes produce their real value, and 2D device axes such as *Gamepad Left Thumbstick 2D-Axis* or *Mouse XY 2D-Axis* fill X and Y together.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why one Axis2D "Move" instead of MoveForward + MoveRight?',
          text: 'Movement *is* two-dimensional. A single 2D action gives you one handler that receives the whole direction vector, which makes diagonal input, stick magnitude and **radial** dead zones (covered below) natural. With two separate 1D axes — the legacy approach — each axis is processed independently, and things like a circular dead zone become awkward to express.',
        },
        {
          type: 'p',
          text: 'Actions have a few other settings worth knowing now: their own list of modifiers and triggers (applied to every key that maps to the action), and **Consume Input**, which controls whether a key used by this action is hidden from lower-priority contexts — more on that in the next card.',
        },
        {
          type: 'deepdive',
          title: 'What FInputActionValue looks like inside',
          blocks: [
            {
              type: 'p',
              text: 'Every action, regardless of type, hands your code an `FInputActionValue`. Internally it stores a three-component vector plus a tag saying which value type it represents. `Get<float>()` reads X, `Get<FVector2D>()` reads X and Y, `Get<bool>()` tests whether the value is non-zero. That is why a single handler signature (`const FInputActionValue&`) works for every action — you will write those handlers in the next lesson.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'mcq',
      prompt: 'You are creating the action for walking, driven by WASD on keyboard and the left stick on a gamepad. Which value type should `IA_Move` use?',
      options: [
        {
          text: 'Digital (bool)',
          why: 'A bool only says "pressed or not". You would lose direction entirely, and analog stick magnitude (walk vs run) with it.',
        },
        {
          text: 'Two actions, `IA_MoveForward` and `IA_MoveRight`, each Axis1D',
          why: 'This works, but it recreates the legacy split-axis design: two handlers, and no single vector to apply a circular dead zone to. One 2D action is the idiomatic choice.',
        },
        {
          text: 'Axis2D (Vector2D)',
          correct: true,
          why: 'Yes. Ground movement is a 2D direction. The stick fills X and Y directly, and keys are routed into X or Y with modifiers.',
        },
        {
          text: 'Axis3D (Vector)',
          why: 'There is no third axis for walking on the ground. Axis3D is for things like free flight with up/down or motion controllers.',
        },
      ],
      explanation:
        'Choose the value type that matches the *meaning* of the intent. Walking is a direction on the ground plane, so Axis2D gives your handler exactly one `FVector2D` per frame — whether it came from four keys or one thumbstick.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Input Mapping Contexts: switchable layers of controls',
      blocks: [
        {
          type: 'p',
          text: 'An [[input-mapping-context]] (prefix `IMC_`) is a list of mappings. Each mapping says: *this key drives this action*, optionally with its own modifiers and triggers. A typical `IMC_OnFoot` maps W/A/S/D and the left stick to `IA_Move`, the mouse to `IA_Look`, Space and gamepad A to `IA_Jump`.',
        },
        {
          type: 'p',
          text: 'Contexts are activated per player on the [[enhanced-input-subsystem]] (one exists for each local player), and **several can be active at once**. Each is added with an integer **priority**; when two active contexts map the same key, the higher priority is evaluated first and, by default, *consumes* the key so lower contexts never see it.',
        },
        {
          type: 'code',
          title: 'Switching control schemes (preview — full C++ next lesson)',
          code: `// Player climbs into a car
Subsystem->AddMappingContext(IMC_Vehicle, 1);

// Player opens the pause menu
Subsystem->AddMappingContext(IMC_Menu, 100);

// Menu closed, player leaves the car
Subsystem->RemoveMappingContext(IMC_Menu);
Subsystem->RemoveMappingContext(IMC_Vehicle);`,
          annotations: [
            { lines: 2, text: '`IMC_OnFoot` stays active at priority 0. `IMC_Vehicle` at priority 1 now wins any key both contexts use — W becomes throttle — while keys only `IMC_OnFoot` maps (say, the camera) keep working.' },
            { lines: 5, text: 'A very high priority means the menu context beats everything for the keys it maps (navigate, confirm, back).' },
            { lines: '8-9', text: 'Removing a context restores whatever is underneath. No `if (bInVehicle)` checks anywhere in gameplay code.' },
          ],
        },
        {
          type: 'table',
          headers: ['Context', 'Priority', 'Active when'],
          rows: [
            ['`IMC_OnFoot`', '0', 'Always, while the character is alive'],
            ['`IMC_Vehicle`', '1', 'Driving — overrides movement keys'],
            ['`IMC_Debug`', '10', 'Development builds only (cheat keys)'],
            ['`IMC_Menu`', '100', 'A menu is open'],
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'Transparent sheets on a light table',
          text: 'Picture each context as a transparent sheet with key labels drawn on it. You stack sheets in priority order and look down from the top: for each key you see the topmost label. Lift a sheet off and the labels underneath show through again.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Give overlapping contexts different priorities',
          text: 'If two contexts that map the same key share a priority, which one wins is not something you should rely on. Decide the order explicitly. And if you genuinely want a key to drive actions in *both* contexts, turn off **Consume Input** on the higher-priority action instead of relying on accident.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'truefalse',
      prompt: '`IMC_OnFoot` (priority 0) maps Space to `IA_Jump` and `IMC_Vehicle` (priority 1) maps Space to `IA_Handbrake`. With both active and default settings, pressing Space fires both actions.',
      answer: false,
      explanation:
        'The higher-priority context is evaluated first, and by default its action **consumes** the key, so `IA_Jump` never sees the press — you pull the handbrake instead of jumping out of the car. That layering is the whole point of contexts. If you really wanted both to fire, you would untick **Consume Input** on `IA_Handbrake`.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Modifiers: shaping the raw value',
      blocks: [
        {
          type: 'p',
          text: 'Between the key and your code sits a processing pipeline. [[input-modifier|Modifiers]] transform the value; triggers then decide whether the action fires. Each frame, for each mapped key:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Raw value', text: 'The device reports a value: `1.0` for a held key, the stick\'s X/Y, the mouse delta.' },
            { title: 'Mapping modifiers', text: 'Modifiers on this key\'s mapping in the context run in order.' },
            { title: 'Action modifiers', text: 'Then the modifiers set on the Input Action itself, which apply to every key mapped to it.' },
            { title: 'Triggers', text: 'Triggers inspect the modified value over time and decide the action\'s state.' },
            { title: 'Event', text: 'State changes become `ETriggerEvent`s, and your bound C++ function runs.' },
          ],
        },
        {
          type: 'table',
          headers: ['Modifier', 'What it does', 'Typical use'],
          rows: [
            ['**Negate**', 'Flips the sign of the chosen axes (X, Y, Z checkboxes)', 'A and S keys; inverting look'],
            ['**Swizzle Input Axis Values**', 'Reorders axes; the default order `YXZ` swaps X and Y', 'Route a key\'s value into the Y axis'],
            ['**Dead Zone**', 'Zeroes small values below *Lower Threshold* and rescales the rest to 0–1', 'Analog sticks that never rest at exactly 0'],
            ['**Scalar**', 'Multiplies each axis by a constant', 'Sensitivity'],
            ['**Response Curve**', 'Applies an exponential or custom curve', 'Fine aim near the centre of the stick'],
            ['**Smooth**', 'Averages the value over recent frames', 'Jittery input'],
          ],
        },
        { type: 'heading', text: 'Worked example: four keys and a stick into one Axis2D action' },
        {
          type: 'table',
          headers: ['Mapping in IMC_OnFoot', 'Modifiers', 'Value reaching IA_Move'],
          rows: [
            ['D', '(none)', '`(1, 0)` — right'],
            ['A', 'Negate', '`(-1, 0)` — left'],
            ['W', 'Swizzle Input Axis Values (YXZ)', '`(0, 1)` — forward'],
            ['S', 'Swizzle + Negate', '`(0, -1)` — back'],
            ['Gamepad Left Thumbstick 2D-Axis', 'Dead Zone (Radial)', '`(x, y)` with drift removed'],
          ],
          caption: 'A key\'s 1.0 always lands in X; Swizzle moves it to Y, Negate flips it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why do this in data instead of C++?',
          text: 'Because the handler stays trivial: it receives one clean `FVector2D` no matter which device produced it. Inverting an axis, adding sensitivity or fixing stick drift becomes an asset edit a designer can make and test in seconds — no recompile, no risk of breaking gameplay code.',
        },
        {
          type: 'deepdive',
          title: 'Radial vs axial dead zones',
          blocks: [
            {
              type: 'p',
              text: 'An **axial** dead zone checks X and Y separately. That creates a cross-shaped dead region: push the stick slightly up-and-right and the small X component may be zeroed while Y survives, so movement snaps toward the cardinal directions. A **radial** dead zone looks at the length of the whole (X, Y) vector, giving a circular dead region that preserves direction. That is why Radial is the usual choice for a 2D stick.',
            },
            {
              type: 'p',
              text: 'Both types *rescale* the remaining range. With a lower threshold of 0.2, a stick at 0.2 reports 0 and a stick at 1.0 still reports 1.0, so there is no sudden jump from 0 to 0.2 at the edge of the dead zone.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Complete the setup so the W and S keys drive the Y axis of the Axis2D action `IA_Move`.',
      templateIsCode: false,
      template:
        'On the W mapping, add a ___ modifier so its 1.0 moves from X into Y. On the S mapping, add the same modifier plus a ___ modifier so the value becomes −1.',
      blanks: [
        { answers: ['Swizzle Input Axis Values', 'Swizzle'] },
        { answers: ['Negate'] },
      ],
      wordBank: ['Swizzle Input Axis Values', 'Negate', 'Dead Zone', 'Scalar', 'Smooth'],
      explanation:
        'A digital key always produces its value in X. **Swizzle Input Axis Values** (default order YXZ) swaps X and Y, turning `(1, 0)` into `(0, 1)`. **Negate** flips the sign to give `(0, -1)`. Dead Zone is for analog noise, Scalar for sensitivity, and Smooth for jitter — none of them move a value between axes.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Triggers: deciding when an action fires',
      blocks: [
        {
          type: 'p',
          text: 'Modifiers shape *what* the value is; [[input-trigger|triggers]] decide *when* the action counts as fired. Each frame a trigger looks at the modified value (and how long it has been held) and reports a state: **None**, **Ongoing** (still deciding) or **Triggered**. An action with **no triggers** behaves like *Down*: it is Triggered on every frame the input is actuated.',
        },
        {
          type: 'table',
          headers: ['Trigger', 'Fires when…', 'Example'],
          rows: [
            ['Down', 'Every frame the input is held (the implicit default)', 'Move, Look, hold-to-fire'],
            ['Pressed', 'Once, on the frame the input goes down', 'Jump, Interact'],
            ['Released', 'Once, on the frame the input goes up', 'Release a charged throw'],
            ['Hold', 'After the input is held for *Hold Time Threshold* (default 1 s); *Is One Shot* makes it fire once instead of every frame after', 'Hold E to revive a teammate'],
            ['Hold And Release', 'On release, if it was held at least the threshold', 'Charge-and-release attack'],
            ['Tap', 'On release, if released within *Tap Release Time Threshold* (default 0.2 s)', 'Tap R to reload (vs hold R to inspect)'],
            ['Pulse', 'Repeatedly at an interval while held', 'Auto-repeat in menus'],
            ['Chorded Action', 'Only while another action is also triggered', 'Shift + key combinations'],
          ],
        },
        {
          type: 'p',
          text: 'Like modifiers, triggers can sit on a single mapping (only that key behaves this way) or on the action (every key does). Mapping one key twice — a **Tap** mapping to `IA_Reload` and a **Hold** mapping to `IA_InspectWeapon` — gives you tap-vs-hold on one button without a line of timing code.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why put timing in triggers?',
          text: 'Hand-written hold logic needs a timer, a "was it released early?" flag, reset rules, and care when the game pauses or the context switches mid-hold. Every feature reinvents it, slightly differently. Triggers make that logic reusable, consistent and tunable: changing a revive from 1 s to 1.5 s is a number in an asset.',
        },
        {
          type: 'deepdive',
          title: 'Explicit, implicit and blocker triggers',
          blocks: [
            {
              type: 'p',
              text: 'When several triggers are attached, Enhanced Input combines them by category. **Explicit** triggers (Pressed, Hold, Tap…) succeed if *any* of them succeeds. **Implicit** triggers (Chorded Action is one) must *all* succeed. **Blockers** stop the action when they succeed. You rarely need more than one trigger, but this is why stacking them behaves the way it does.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'mcq',
      prompt: 'A designer wants: "Hold F for 1.5 seconds to plant the bomb. Letting go early does nothing." What is the cleanest setup?',
      options: [
        {
          text: 'A Pressed trigger on `IA_PlantBomb`, plus a 1.5 s timer and a release check in C++',
          why: 'It can be made to work, but you are re-implementing exactly what the Hold trigger already does — including the fiddly early-release case.',
        },
        {
          text: 'A Tap trigger with its threshold set to 1.5 s',
          why: 'Tap fires when the key is released *within* the threshold — the opposite of what is wanted. A quick press would plant the bomb.',
        },
        {
          text: 'A Hold trigger with Hold Time Threshold 1.5 and Is One Shot enabled',
          correct: true,
          why: 'Yes. Hold reports Ongoing until 1.5 s have passed, then Triggered. One Shot makes it fire exactly once instead of every frame afterwards. Releasing early simply cancels.',
        },
        {
          text: 'A Released trigger, checking in C++ how long the key was held',
          why: 'This fires on release, so the bomb would plant when the player lets go rather than at the 1.5 s mark — and the duration check is again hand-written timing logic.',
        },
      ],
      explanation:
        'Whenever a request sounds like "hold", "tap", "double press" or "only together with", look for a trigger first. Here the Hold trigger handles the timing; the C++ handler only needs to plant the bomb when the action is Triggered.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'ETriggerEvent: the life cycle of an action',
      blocks: [
        {
          type: 'p',
          text: 'Your C++ code never sees trigger *states*; it sees **changes** between them, delivered as an [[trigger-event]]. When you bind a handler you choose which of these events it listens to:',
        },
        {
          type: 'table',
          headers: ['Event', 'State change', 'Typical use'],
          rows: [
            ['`Started`', 'None → Ongoing or None → Triggered (first frame of evaluation)', 'Begin something: start a jump, start sprinting, show a hold-progress bar'],
            ['`Ongoing`', 'Ongoing → Ongoing (still evaluating, not yet triggered)', 'Update a hold-progress bar'],
            ['`Triggered`', '→ Triggered (condition met)', 'Do the thing. For Down triggers this fires **every frame** — ideal for Move and Look'],
            ['`Completed`', 'Triggered → None', 'End something: stop jumping, stop sprinting'],
            ['`Canceled`', 'Ongoing → None (never triggered)', 'Hide the progress bar; play a "fizzle" sound'],
          ],
        },
        { type: 'heading', text: 'Three timelines worth memorising' },
        {
          type: 'table',
          headers: ['Setup', 'What the player does', 'Events, in order'],
          rows: [
            ['Down (no trigger)', 'Press, hold for a while, release', '`Started` + `Triggered` on the first frame, `Triggered` every held frame, `Completed` on release'],
            ['Hold, 1 s', 'Press, release after 0.4 s', '`Started`, `Ongoing` every frame, then `Canceled`'],
            ['Hold, 1 s (not one-shot)', 'Press, release after 2 s', '`Started`, `Ongoing` until 1 s, then `Triggered` every frame, `Completed` on release'],
          ],
        },
        {
          type: 'p',
          text: 'Notice that on the very first frame of a Down trigger, `Started` and `Triggered` *both* fire, and `Started` always comes first. `Completed` only happens after a successful trigger; an attempt that never got there ends in `Canceled` instead.',
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'The classic one-frame-movement bug',
          text: 'Bind your Move handler to `Started` and the character moves for exactly **one frame** per key press, because `Started` fires once. Continuous actions (Move, Look, hold-to-fire) belong on `Triggered`. One-off actions such as Jump are usually bound to `Started`, with release logic on `Completed`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'You can bind the same action several times to different events — for example `IA_Jump` with `Started` → `Jump` and `Completed` → `StopJumping`. That is exactly what the UE5 character templates do.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: '`IA_Revive` uses a Hold trigger with a 1.0 s threshold. The player presses the key and lets go after 0.6 s. Which events fire?',
      options: [
        {
          text: '`Started`, then `Triggered`, then `Completed`',
          why: '`Triggered` requires reaching the 1.0 s threshold, which never happened. Without a trigger there can be no `Completed`.',
        },
        {
          text: 'Nothing at all — the action did not trigger',
          why: 'Trigger *evaluation* began the moment the key went down, so `Started` and `Ongoing` fire even though the action never triggers.',
        },
        {
          text: '`Started`, then `Ongoing` on each frame, then `Completed`',
          why: '`Completed` means Triggered → None. This attempt went Ongoing → None, which has its own event.',
        },
        {
          text: '`Started`, then `Ongoing` on each frame, then `Canceled`',
          correct: true,
          why: 'Exactly. Evaluation started, stayed Ongoing while the timer ran, and was abandoned before the threshold — Ongoing → None is `Canceled`.',
        },
      ],
      explanation:
        'Think in state transitions: None → Ongoing (`Started`), Ongoing → Ongoing (`Ongoing`), Ongoing → None (`Canceled`). `Canceled` is how you know to hide a hold-progress UI or refund a partially charged ability, while `Triggered` is reserved for actually doing the revive.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      prompt: 'An action uses a Hold trigger (1 s, not one-shot). The player holds the key for 3 seconds, then releases it. Put the events in the order they first fire.',
      lines: ['ETriggerEvent::Started', 'ETriggerEvent::Ongoing', 'ETriggerEvent::Triggered', 'ETriggerEvent::Completed'],
      distractors: ['ETriggerEvent::Canceled'],
      explanation:
        'Pressing begins evaluation (`Started`); during the first second the trigger is still deciding (`Ongoing`); at 1 s the condition is met (`Triggered`, then every frame while held); releasing ends a successful trigger (`Completed`). `Canceled` only happens when the key is released *before* the threshold, so it does not belong here.',
    },
    // ------------------------------------------------------------------ 14
    {
      kind: 'concept',
      title: 'Putting it together, and debugging',
      blocks: [
        {
          type: 'p',
          text: 'Here is a complete, realistic default context for a third-person game. Every row is data; the C++ only ever sees four actions.',
        },
        {
          type: 'table',
          headers: ['Action (type)', 'Mappings in IMC_Default', 'Modifiers / triggers'],
          rows: [
            ['`IA_Move` (Axis2D)', 'W, A, S, D; Gamepad Left Thumbstick 2D-Axis', 'Swizzle / Negate on keys; Dead Zone on the stick'],
            ['`IA_Look` (Axis2D)', 'Mouse XY 2D-Axis; Gamepad Right Thumbstick 2D-Axis', 'Negate (Y only) if vertical look feels inverted; Dead Zone on the stick'],
            ['`IA_Jump` (bool)', 'Space Bar; Gamepad Face Button Bottom', 'None (Down) — code binds `Started` and `Completed`'],
            ['`IA_Interact` (bool)', 'E; Gamepad Face Button Left', 'Pressed'],
          ],
        },
        {
          type: 'p',
          text: 'Two project settings make all of this work: **Project Settings → Input → Default Classes** must name the Enhanced Input player-input and component classes. New UE5 projects already do; projects upgraded from UE4 may not.',
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultInput.ini',
          code: `[/Script/Engine.InputSettings]
DefaultPlayerInputClass=/Script/EnhancedInput.EnhancedPlayerInput
DefaultInputComponentClass=/Script/EnhancedInput.EnhancedInputComponent`,
          annotations: [
            { lines: 2, text: 'The object that processes raw keys through contexts, modifiers and triggers.' },
            { lines: 3, text: 'The component class every pawn and controller receives for binding. Your C++ casts to this type in the next lesson — if this line is wrong, that cast fails.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**`showdebug enhancedinput`** (console, during Play) lists active contexts, their priorities, and each action\'s current value and trigger state. It is the first thing to check when "the key does nothing".',
            'Name assets consistently (`IA_`, `IMC_`) and keep them in one folder, e.g. `Content/Input/`.',
            'Recent UE5 versions also include **Enhanced Input User Settings** for player key remapping, built on the same mapping data — so getting the data right now pays off later.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Next: the C++ side',
          text: 'Two C++ pieces connect this data to gameplay: the [[enhanced-input-subsystem]] (where you add and remove contexts) and the [[enhanced-input-component]] (where you bind actions and trigger events to member functions). The next lesson writes both, line by line.',
        },
      ],
    },
    // ------------------------------------------------------------------ 15
    {
      kind: 'mcq',
      multi: true,
      prompt: 'Which of these can be done **purely by editing Enhanced Input assets** — no C++ and no Blueprint graph changes? Select all that apply.',
      options: [
        {
          text: 'Making the S key move the character backwards',
          correct: true,
          why: 'A mapping (S → IA_Move) plus Swizzle and Negate modifiers — pure data.',
        },
        {
          text: 'Requiring the interact key to be held for 0.5 s',
          correct: true,
          why: 'A Hold trigger with a 0.5 s threshold on the mapping or the action.',
        },
        {
          text: 'Disabling on-foot controls while a menu is open',
          correct: false,
          why: 'This one needs a little code: something has to call `AddMappingContext(IMC_Menu, …)` when the menu opens. The *contents* of the menu context are data, but switching contexts is a run-time decision made in C++ or Blueprint.',
        },
        {
          text: 'Adding a dead zone to a drifting gamepad stick',
          correct: true,
          why: 'A Dead Zone modifier on the stick mapping.',
        },
        {
          text: 'What the character does when `IA_Jump` triggers',
          correct: false,
          why: 'The *response* to an action is gameplay code — the function you bind. Enhanced Input decides when and with what value it is called, not what it does.',
        },
      ],
      explanation:
        'The dividing line: Enhanced Input assets describe **which inputs produce which intent, with what value, at what moment**. Code decides **what the intent does** and **when control schemes switch**. Keeping that line clean is what lets designers iterate on feel while programmers own behaviour.',
    },
  ],
  takeaways: [
    'Enhanced Input is the default since UE 5.1; the legacy string-based Action/Axis Mappings are deprecated.',
    'An Input Action is a typed intent (bool, Axis1D, Axis2D, Axis3D); code binds to actions, never to keys.',
    'Input Mapping Contexts map keys to actions and are layered at run time by priority — the higher priority consumes shared keys by default.',
    'Modifiers (Negate, Swizzle Input Axis Values, Dead Zone…) shape the value; triggers (Down, Pressed, Released, Hold, Tap…) decide when the action fires.',
    '`ETriggerEvent` reports state changes: Started, Ongoing, Triggered, Completed, Canceled. Continuous actions bind `Triggered`; one-off actions usually bind `Started`/`Completed`.',
    'Use `showdebug enhancedinput` to see active contexts and action states while playing.',
  ],
  reading: [
    {
      title: 'Enhanced Input',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of actions, mapping contexts, modifiers and triggers, including the full list of built-in modifiers and triggers.',
    },
    {
      title: 'ETriggerEvent (API reference)',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/EnhancedInput/ETriggerEvent',
      source: 'unreal-docs',
      note: 'The exact definition of each trigger event — worth reading once to cement the state-transition model.',
    },
    {
      title: 'Configure Character Movement with C++',
      url: 'https://dev.epicgames.com/documentation/unreal-engine/coder-03-configure-character-movement-with-cplusplus-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s tutorial that creates the IA_/IMC_ assets from this lesson and wires them up in C++ — a preview of the next two lessons.',
    },
  ],
};
