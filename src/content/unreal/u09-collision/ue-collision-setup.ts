import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-collision-setup',
  title: 'Collision Channels, Profiles and Responses',
  summary:
    'Collision Enabled modes, object types vs trace channels, the Ignore/Overlap/Block rule, presets, custom channels — and setting it all from C++.',
  minutes: 17,
  objectives: [
    'Pick the right Collision Enabled mode (NoCollision, QueryOnly, PhysicsOnly, QueryAndPhysics) for a component',
    'Distinguish object types (what a component *is*) from trace channels (what a query *asks*)',
    'Predict the outcome when any two components meet, using the Ignore/Overlap/Block rule',
    'Use collision presets and create custom channels, and refer to them correctly in C++',
    'Configure collision in C++ with `SetCollisionProfileName` and `SetCollisionResponseToChannel`',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Three questions every component answers',
      blocks: [
        {
          type: 'p',
          text: 'In the last unit you used profiles like `Trigger` and `BlockAllDynamic` as black boxes. Now open them up. Every collidable [[primitive-component]] answers three questions, and together the answers decide everything — hits, overlaps, what traces see, what physics pushes:',
        },
        {
          type: 'steps',
          items: [
            { title: 'Do I take part, and in what?', text: 'The [[collision-enabled|Collision Enabled]] mode: queries, physics, both or neither.' },
            { title: 'What am I?', text: 'The **Object Type**: one channel such as WorldStatic, Pawn or PhysicsBody.' },
            { title: 'How do I react to each channel?', text: 'A **response** — Ignore, Overlap or Block — for every object type and trace channel.' },
          ],
        },
        { type: 'heading', text: 'Collision Enabled' },
        {
          type: 'table',
          headers: ['Mode', 'Used by', 'Typical example'],
          rows: [
            ['`NoCollision`', 'Nothing', 'Decorative meshes, effects, a door that has been opened'],
            ['`QueryOnly`', 'Traces, sweeps and overlaps', 'Trigger volumes, a character\'s skeletal mesh used for hit detection'],
            ['`PhysicsOnly`', 'Rigid-body simulation only', 'Small debris that tumbles realistically but never stops a bullet or triggers anything'],
            ['`QueryAndPhysics`', 'Both', 'A crate you can shoot *and* knock over; character capsules'],
          ],
        },
        {
          type: 'p',
          text: '"Query" covers anything that *asks* the world a spatial question: line traces, shape sweeps (including the sweeps the Character Movement Component performs every frame), and overlap tests. "Physics" means the [[chaos-physics|Chaos]] solver generating contacts between bodies and pushing them apart.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why separate queries from physics?',
          text: 'They are different workloads with different costs. A physics body participates in contact generation and solving every physics step; a query-only shape costs nothing until someone asks a question about it. Splitting the two lets you give a trigger volume exactly the capability it needs, and lets a thousand pieces of debris simulate without making every gameplay trace test against them.',
        },
        {
          type: 'deepdive',
          title: 'Probe modes',
          blocks: [
            {
              type: 'p',
              text: 'Recent UE5 versions also list `ProbeOnly` and `QueryAndProbe`. A *probe* takes part in physics contact generation and reports contacts, but the solver does not push anything apart — useful for physics-driven sensors. You will rarely need them; the four classic modes cover almost every gameplay case.',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: 'A trigger box should detect players walking into it but must never physically push or stop anything. Which Collision Enabled mode fits?',
      options: [
        {
          text: '`QueryAndPhysics`',
          why: 'Including physics means the box would take part in rigid-body contacts, which it never needs. Pay only for what you use.',
        },
        {
          text: '`PhysicsOnly`',
          why: 'Overlap detection is a *query*. With physics only, the box could interact with simulated bodies but would never report overlaps.',
        },
        {
          text: '`QueryOnly`',
          correct: true,
          why: 'Yes. Overlap tests are queries, and the box needs nothing from the physics solver. This is what the built-in `Trigger` preset uses.',
        },
        {
          text: '`NoCollision`',
          why: 'With no collision at all, nothing can overlap it, so no events fire.',
        },
      ],
      explanation:
        'Detection is a query; pushing is physics. A trigger only detects, so `QueryOnly` — combined with Overlap responses and Generate Overlap Events — is exactly enough.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Object types vs trace channels',
      blocks: [
        {
          type: 'p',
          text: 'Unreal calls both of these "collision channels", and they share one C++ enum, `ECollisionChannel`, but they play different roles:',
        },
        {
          type: 'table',
          headers: ['Channel', 'Kind', 'Typical users'],
          rows: [
            ['`ECC_WorldStatic`', 'Object type', 'Level geometry that never moves'],
            ['`ECC_WorldDynamic`', 'Object type', 'Moving props, doors, platforms, triggers'],
            ['`ECC_Pawn`', 'Object type', 'Character capsules and other pawns'],
            ['`ECC_PhysicsBody`', 'Object type', 'Simulated physics objects'],
            ['`ECC_Vehicle`, `ECC_Destructible`', 'Object type', 'Vehicles, destructible meshes'],
            ['`ECC_Visibility`', 'Trace channel', '"Can I see / shoot through this?" — line of sight, hitscan, mouse picking'],
            ['`ECC_Camera`', 'Trace channel', '"Should the camera collide with this?" — spring arms avoiding walls'],
          ],
        },
        {
          type: 'p',
          text: 'An [[collision-object-type|object type]] is an **identity**: each component has exactly one, and it is how *other* things recognise it. A [[trace-channel]] is a **question** asked by a query. Components never *are* a trace channel; they only respond to it. When you trace on `ECC_Visibility`, every component in the way is asked "what is your response to Visibility?"',
        },
        {
          type: 'p',
          text: 'Responses therefore cover both kinds: a component has a response to every object type (how it reacts to *things*) and to every trace channel (how it reacts to *questions*). A pane of glass might be a WorldStatic object that **Blocks** pawns (you cannot walk through it) but **Ignores** Visibility (you can see and shoot through it).',
        },
        {
          type: 'callout',
          variant: 'analogy',
          text: 'Think of a party. Your object type is your name badge — "Pawn" — and others decide how to treat you based on it. Trace channels are questions someone shouts across the room: "Can anyone block my view?" Everyone answers for themselves, whatever their badge says.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'A practical Camera-channel trick',
          text: 'Small props (lamp posts, bushes) that make a third-person camera jitter as it collides with them can simply set their **Camera** response to Ignore. The spring arm traces on `ECC_Camera`, so it will pass through those props while still respecting walls.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'A component can have several object types at once — for example both Pawn and PhysicsBody — so it is recognised by more systems.',
      answer: false,
      explanation:
        'Each component has exactly **one** object type: it is the component\'s identity. What it can have many of is *responses* — one for every object type and trace channel. If you need something that behaves like a pawn in some interactions and like a physics body in others, you either adjust responses on the other side or create a custom object channel that the relevant components respond to.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'Responses and the interaction rule',
      blocks: [
        {
          type: 'p',
          text: 'Responses are ordered from weakest to strongest: **Ignore < Overlap < Block**. When two components A and B meet, the engine looks at A\'s response to B\'s object type *and* B\'s response to A\'s object type, and the **weaker** of the two wins:',
        },
        {
          type: 'code',
          title: 'Illustrative — the rule the engine applies',
          code: `ECollisionResponse Resolve(ECollisionResponse AToB,
                           ECollisionResponse BToA) {
    // ECR_Ignore (0) < ECR_Overlap (1) < ECR_Block (2)
    return FMath::Min(AToB, BToA);
}`,
          annotations: [
            { lines: '1-2', text: '`AToB`: how A responds to B\'s object type. `BToA`: how B responds to A\'s.' },
            { lines: 4, text: 'Both must Block to block. If either Ignores, nothing happens. Otherwise — at least one Overlap, no Ignore — it is an overlap.' },
          ],
        },
        {
          type: 'table',
          headers: ['A', 'B', 'A → B', 'B → A', 'Result'],
          rows: [
            ['Player capsule (Pawn)', 'Wall (WorldStatic, BlockAll)', 'Block', 'Block', '**Block** — the player is stopped'],
            ['Player capsule (Pawn)', 'Trigger box (WorldDynamic, Trigger)', 'Block', 'Overlap', '**Overlap** — events fire if both generate overlaps'],
            ['Ghost (Pawn, ignores WorldStatic)', 'Wall (BlockAll)', 'Ignore', 'Block', '**Ignore** — the ghost walks through'],
            ['Debris (PhysicsBody, ignores Pawn)', 'Player capsule', 'Ignore', 'Block', '**Ignore** — no pushing, no events'],
          ],
        },
        {
          type: 'p',
          text: 'Traces are one-sided: a trace on a channel has no object type of its own to be responded to, so each component\'s response *to that channel* decides alone. **Block** stops the trace and becomes the hit; **Overlap** lets it continue but is reported by multi traces; **Ignore** is invisible to it.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why "the weaker response wins"?',
          text: 'It lets either side opt out without editing the other. To make a ghost pass through walls you change only the ghost (Ignore WorldStatic); every wall in the game stays untouched. To make debris harmless to players you change only the debris. If blocking required just one side, every special case would mean auditing every other object in the project.',
        },
        {
          type: 'callout',
          variant: 'warning',
          text: 'An Overlap *result* is not enough for overlap *events*. Both components also need Generate Overlap Events enabled, as you saw in the previous unit. A surprising number of "my trigger does nothing" bugs are a correct response table with the flag off on one side.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'mcq',
      prompt: 'A pickup\'s sphere is **WorldDynamic** and responds **Overlap** to Pawn. The player\'s capsule is **Pawn** and responds **Block** to WorldDynamic. Both have Generate Overlap Events enabled. What happens when the player runs into the pickup?',
      options: [
        {
          text: 'The player is blocked, because the capsule Blocks WorldDynamic',
          why: 'Blocking needs *both* sides to Block. The sphere only Overlaps Pawn, so the weaker response — Overlap — wins.',
        },
        {
          text: 'The player passes through and overlap events fire',
          correct: true,
          why: 'Right: min(Block, Overlap) = Overlap, and with the flag on both sides, begin/end overlap events fire.',
        },
        {
          text: 'Nothing at all happens',
          why: 'Nothing would happen only if one side Ignored the other. Neither does here.',
        },
        {
          text: 'Both a hit event and an overlap event fire',
          why: 'A pair resolves to a single result. Hits come from Block results; this pair resolves to Overlap.',
        },
      ],
      explanation:
        'Apply the rule mechanically: take each side\'s response to the other\'s object type, and the weaker one wins. That is why pickups and triggers only need to say "Overlap Pawn" — the player\'s default "Block everything" capsule does not need to change.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Presets (collision profiles)',
      blocks: [
        {
          type: 'p',
          text: 'Configuring Collision Enabled, Object Type and a dozen responses on every component would be tedious and error-prone. A [[collision-profile]] (shown in the editor as a *Collision Preset*) bundles all three under a name:',
        },
        {
          type: 'table',
          headers: ['Preset', 'Enabled', 'Object type', 'In short'],
          rows: [
            ['`NoCollision`', 'No collision', '—', 'Off'],
            ['`BlockAll`', 'Query & physics', 'WorldStatic', 'Static geometry that blocks everything'],
            ['`BlockAllDynamic`', 'Query & physics', 'WorldDynamic', 'Moving geometry that blocks everything'],
            ['`OverlapAllDynamic`', 'Query only', 'WorldDynamic', 'Overlaps everything'],
            ['`Pawn`', 'Query & physics', 'Pawn', 'Character capsules'],
            ['`CharacterMesh`', 'Query only', 'Pawn', 'A character\'s skeletal mesh, used for hit detection'],
            ['`PhysicsActor`', 'Query & physics', 'PhysicsBody', 'Simulated props'],
            ['`Trigger`', 'Query only', 'WorldDynamic', 'Trigger volumes: overlap all object types'],
            ['`Ragdoll`', 'Query & physics', 'PhysicsBody', 'Simulated skeletal meshes on death'],
          ],
        },
        {
          type: 'p',
          text: 'Pick a preset from the **Collision Presets** dropdown in a component\'s Details panel. Change any single response and the dropdown switches to **Custom…** — the component now has its own private settings. You can define your own presets in **Project Settings → Engine → Collision → Preset**; they are saved to `Config/DefaultEngine.ini` under `[/Script/Engine.CollisionProfile]`.',
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why prefer presets over Custom?',
          text: 'A preset states *intent* ("this is a projectile") and gives you a single place to change behaviour. When projectiles should start ignoring a new "Foliage" channel, you edit one preset instead of hunting down every component set to Custom. Custom is fine for genuine one-offs; for anything that appears more than twice, make a preset.',
        },
        {
          type: 'callout',
          variant: 'warning',
          text: 'Editing a built-in preset changes every component in the project that uses it. Prefer creating a new preset for special needs, and be careful when modifying one that is already in wide use.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'fill',
      prompt: 'Make this barrel a simulated physics prop using the built-in preset, then stop the third-person camera boom from colliding with it.',
      template: `Mesh->SetCollisionProfileName(TEXT("___"));
Mesh->SetCollisionResponseToChannel(___, ___);
Mesh->SetSimulatePhysics(true);`,
      blanks: [{ answers: ['PhysicsActor'] }, { answers: ['ECC_Camera'] }, { answers: ['ECR_Ignore'] }],
      wordBank: ['PhysicsActor', 'Trigger', 'Pawn', 'ECC_Camera', 'ECC_Visibility', 'ECR_Ignore', 'ECR_Overlap', 'ECR_Block'],
      explanation:
        '`PhysicsActor` is the preset for simulated props (PhysicsBody object type, query and physics). The camera boom traces on the **Camera** channel, so setting `ECC_Camera` to `ECR_Ignore` lets it pass through the barrel. Ignoring `ECC_Visibility` instead would make the barrel invisible to line-of-sight and hitscan traces — a very different change. The profile line comes first, because applying a profile resets all responses.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'Custom channels',
      blocks: [
        {
          type: 'p',
          text: 'The built-in channels run out quickly. An interaction system wants a trace that hits only interactable objects; a shooter wants projectiles to be their own kind of object. In **Project Settings → Engine → Collision** you can add up to **18** custom channels, each either an *Object Channel* or a *Trace Channel*, with a name and a default response.',
        },
        {
          type: 'code',
          lang: 'ini',
          title: 'Config/DefaultEngine.ini (written by the editor)',
          code: `[/Script/Engine.CollisionProfile]
+DefaultChannelResponses=(Channel=ECC_GameTraceChannel1,DefaultResponse=ECR_Ignore,bTraceType=True,bStaticObject=False,Name="Interact")
+DefaultChannelResponses=(Channel=ECC_GameTraceChannel2,DefaultResponse=ECR_Block,bTraceType=False,bStaticObject=False,Name="Projectile")`,
          annotations: [
            { lines: 2, text: 'A **trace** channel named Interact, stored in slot `ECC_GameTraceChannel1`. Default response Ignore: only objects that explicitly Block it will be hit by interaction traces.' },
            { lines: 3, text: 'An **object** channel (`bTraceType=False`) named Projectile in the next free slot. Custom object channels also use the `ECC_GameTraceChannelN` names.' },
          ],
        },
        {
          type: 'p',
          text: 'The friendly name ("Interact") lives only in config. C++ sees the fixed enum slot, so give the slot a readable alias in one project header:',
        },
        {
          type: 'code',
          title: 'MyGameCollision.h',
          code: `#pragma once

#include "Engine/EngineTypes.h"

// Must match Project Settings > Engine > Collision.
inline constexpr ECollisionChannel ECC_Interact =
    ECC_GameTraceChannel1;
inline constexpr ECollisionChannel ECC_Projectile =
    ECC_GameTraceChannel2;`,
          annotations: [
            { lines: 3, text: 'Declares `ECollisionChannel` and its values.' },
            { lines: 5, text: 'The comment matters: this file and the project settings must agree, and nothing checks it for you.' },
            { lines: '6-9', text: 'Typed [[constexpr]] constants, the modern alternative to a macro. Many projects (including Epic\'s Lyra sample) use `#define` aliases for the same purpose.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does C++ use slot numbers instead of names?',
          text: 'Collision filtering happens millions of times per second inside the physics engine, where a channel must be a small integer that fits in a bit mask — not a string to look up. Unreal reserves a fixed set of slots in the enum and lets each project label them in config. The cost is that if you delete a channel and create another, the slot assignment can change, and your alias header must be updated to match.',
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'bug',
      prompt: 'The camera boom still collides with this barrel even though the code tells it to ignore the Camera channel. Tap the line that causes the problem.',
      code: `AExplosiveBarrel::AExplosiveBarrel() {
    Mesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Mesh"));
    SetRootComponent(Mesh);
    Mesh->SetCollisionResponseToChannel(ECC_Camera, ECR_Ignore);
    Mesh->SetCollisionProfileName(TEXT("PhysicsActor"));
    Mesh->SetSimulatePhysics(true);
}`,
      bugLines: [4, 5],
      hint: 'What does applying a profile do to responses that were set before it?',
      explanation:
        'Order matters. `SetCollisionProfileName` replaces the Collision Enabled mode, the object type **and every response** with the preset\'s values, so the Camera = Ignore set on line 4 is overwritten on line 5. Apply the profile first, then make individual tweaks. (Doing so turns the component\'s preset into "Custom" in the editor, which is expected.)',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'Setting collision from C++',
      blocks: [
        {
          type: 'table',
          headers: ['Function', 'Sets'],
          rows: [
            ['`SetCollisionProfileName(FName)`', 'Everything below at once, from a preset'],
            ['`SetCollisionEnabled(ECollisionEnabled::Type)`', 'Query / physics participation'],
            ['`SetCollisionObjectType(ECollisionChannel)`', 'What the component is'],
            ['`SetCollisionResponseToAllChannels(ECollisionResponse)`', 'One response for every channel'],
            ['`SetCollisionResponseToChannel(ECollisionChannel, ECollisionResponse)`', 'One response for one channel'],
            ['`SetGenerateOverlapEvents(bool)`', 'The overlap-event flag (separate from profiles)'],
          ],
        },
        {
          type: 'code',
          title: 'Projectile.cpp — a fully custom setup',
          code: `#include "MyGameCollision.h"

AProjectile::AProjectile() {
    Collision = CreateDefaultSubobject<USphereComponent>(
        TEXT("Collision"));
    SetRootComponent(Collision);

    Collision->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
    Collision->SetCollisionObjectType(ECC_Projectile);
    Collision->SetCollisionResponseToAllChannels(ECR_Block);
    Collision->SetCollisionResponseToChannel(
        ECC_Projectile, ECR_Ignore);
    Collision->SetCollisionResponseToChannel(ECC_Camera, ECR_Ignore);
}`,
          annotations: [
            { lines: 1, text: 'The alias header from the previous card, for `ECC_Projectile`.' },
            { lines: 8, text: 'Projectiles move by sweeping (queries); they do not need the physics solver.' },
            { lines: 9, text: 'Our custom object channel: other components can now respond to projectiles specifically.' },
            { lines: '10-13', text: 'Start from "block everything", then carve out exceptions: bullets pass through each other and do not disturb the camera.' },
          ],
        },
        {
          type: 'p',
          text: 'Collision can change at run time too — an opened door switches to `NoCollision`, a "ghost" power-up makes the player\'s capsule ignore other pawns for a few seconds:',
        },
        {
          type: 'code',
          title: 'Run-time changes',
          code: `Door->SetCollisionEnabled(ECollisionEnabled::NoCollision);

GetCapsuleComponent()->SetCollisionResponseToChannel(
    ECC_Pawn, ECR_Ignore);`,
          annotations: [
            { lines: 1, text: 'The door no longer blocks, overlaps or appears in traces.' },
            { lines: '3-4', text: 'Remember to restore `ECR_Block` when the power-up ends.' },
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          text: 'Changing collision settings at run time can force the engine to rebuild physics state for the component. It is fine for events like opening a door; avoid toggling collision every frame.',
        },
        {
          type: 'callout',
          variant: 'tip',
          text: 'To apply a built-in preset without typing its name as a string, include `Engine/CollisionProfile.h` and use the static names on `UCollisionProfile`, e.g. `Mesh->SetCollisionProfileName(UCollisionProfile::PhysicsActor_ProfileName);` — `Pawn_ProfileName`, `BlockAll_ProfileName` and `NoCollision_ProfileName` exist too.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Debugging',
          text: 'Type `show collision` in the console during Play to draw every collision shape. In the Details panel, expand a component\'s **Collision Presets** to see the full response table it is actually using.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'You created a custom trace channel called **Interact** in Project Settings, and it was assigned the first free slot. How do you pass it to `LineTraceSingleByChannel` in C++?',
      options: [
        {
          text: '`ECC_Interact` — Unreal generates an enum value from the name you typed',
          why: 'Nothing is generated. The name lives in config; C++ only knows the fixed slots. `ECC_Interact` exists only if *you* define it as an alias.',
        },
        {
          text: '`FName(TEXT("Interact"))`',
          why: 'The function takes an `ECollisionChannel`, not a name. (Profile-based traces take names, but that is a different function.)',
        },
        {
          text: '`ECC_GameTraceChannel1`, ideally through a project alias such as `ECC_Interact`',
          correct: true,
          why: 'Yes. Custom channels occupy `ECC_GameTraceChannel1`…`18` in creation order; an alias in one header keeps call sites readable.',
        },
        {
          text: '`ECC_Visibility`, then filter the results by name',
          why: 'That traces a different channel entirely, so objects set up to Block Interact (but not Visibility) would be missed.',
        },
      ],
      explanation:
        'The editor maps your friendly name to a slot in `DefaultEngine.ini`; C++ addresses the slot. Define the alias once (`inline constexpr ECollisionChannel ECC_Interact = ECC_GameTraceChannel1;`) and keep it in sync if channels are ever deleted or reordered.',
    },
    // ------------------------------------------------------------------ 13
    {
      kind: 'order',
      linesAreCode: false,
      prompt: 'Put the steps for adding an interaction trace channel in order, from creating it to using it in C++.',
      lines: [
        'Project Settings → Engine → Collision → New Trace Channel "Interact", default response Ignore',
        'The editor saves it to DefaultEngine.ini as ECC_GameTraceChannel1',
        'Add the alias ECC_Interact = ECC_GameTraceChannel1 in MyGameCollision.h',
        'Call LineTraceSingleByChannel(..., ECC_Interact, ...) from the character',
      ],
      distractors: ['Add an ECC_Interact value to the ECollisionChannel enum in the engine\'s EngineTypes.h'],
      explanation:
        'Channels are created in project settings, stored as slots in config, aliased in your own header, and only then used in code. Editing the engine\'s `ECollisionChannel` enum is never the answer — the custom slots already exist for exactly this purpose, and modifying engine headers would make every engine upgrade painful.',
    },
  ],
  takeaways: [
    'Collision Enabled chooses participation: `NoCollision`, `QueryOnly` (traces, sweeps, overlaps), `PhysicsOnly` (simulation) or `QueryAndPhysics`.',
    'An object type is what a component *is* (exactly one); a trace channel is a question a query *asks*; responses cover both.',
    'Ignore < Overlap < Block, and the weaker response of the pair wins: both must Block to block; any Ignore means nothing; otherwise Overlap.',
    'Presets (collision profiles) bundle mode, object type and responses; changing one response makes a component "Custom".',
    'Custom channels live in `DefaultEngine.ini` and appear in C++ as `ECC_GameTraceChannel1`…`18` — alias them in one header.',
    'In C++, call `SetCollisionProfileName` first, then `SetCollisionResponseToChannel` tweaks; profiles overwrite earlier responses.',
  ],
  reading: [
    {
      title: 'Collision Overview',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-in-unreal-engine---overview',
      source: 'unreal-docs',
      note: 'Epic\'s worked examples of how pairs of responses interact, with diagrams.',
    },
    {
      title: 'Collision Response Reference',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-response-reference-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Every field of the collision settings panel and the full list of default presets.',
    },
    {
      title: 'Add a Custom Object Type to Your Project',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/add-a-custom-object-type-to-your-project-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Step-by-step creation of custom channels and presets in Project Settings.',
    },
    {
      title: 'Collision Filtering',
      url: 'https://www.unrealengine.com/en-US/blog/collision-filtering',
      source: 'article',
      note: 'An Epic blog post explaining the "least blocking response wins" rule and how to design channels around it.',
    },
  ],
};
