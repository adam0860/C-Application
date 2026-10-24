import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-soft-references',
  title: 'Hard vs Soft References and Asset Loading',
  summary:
    'Why one innocent pointer can drag gigabytes into memory, how soft references store a path instead, and how to load assets without hitches.',
  minutes: 17,
  objectives: [
    'Explain how hard references create load chains, and find them with the Size Map and Reference Viewer',
    'Declare `TSoftObjectPtr` and `TSoftClassPtr` properties and use `IsNull`, `IsPending`, `Get` and `LoadSynchronous` correctly',
    'Load assets asynchronously with `FStreamableManager::RequestAsyncLoad` and manage the returned handle',
    'Describe what `FSoftObjectPath` stores and why hard-coded path strings are fragile',
    'Decide when a soft reference is worth its extra complexity',
  ],
  steps: [
    // ------------------------------------------------------------------ 1
    {
      kind: 'concept',
      title: 'Hard references load everything they touch',
      blocks: [
        {
          type: 'p',
          text: 'Every pointer to an [[asset]] that you have seen so far is a [[hard-reference]]. When an object that holds a hard reference is loaded, the engine must load the referenced asset **first**, because the pointer has to point at a real object the moment loading finishes. Then that asset\'s own hard references load, and theirs, and so on: a **load chain**.',
        },
        {
          type: 'code',
          title: 'Armoury.h',
          code: `UCLASS()
class MYGAME_API AArmoury : public AActor {
    GENERATED_BODY()

protected:
    // Every weapon class listed here loads with the armoury
    UPROPERTY(EditDefaultsOnly, Category = "Armoury")
    TArray<TSubclassOf<AWeapon>> AllWeapons;

    // ...and so does this 4K showcase mesh
    UPROPERTY(EditDefaultsOnly, Category = "Armoury")
    TObjectPtr<UStaticMesh> ShowcaseMesh;
};`,
          annotations: [
            { lines: 8, text: '[[tsubclassof|TSubclassOf]] holds a `UClass*` — a hard reference. If designers fill it with 40 weapon Blueprints in `BP_Armoury`, all 40 classes load whenever `BP_Armoury` does.' },
            { lines: 12, text: 'Same for direct asset pointers. The C++ declaration costs nothing; the cost appears when an asset (here, the Blueprint\'s defaults) assigns a value.' },
          ],
        },
        {
          type: 'steps',
          items: [
            { title: 'The level loads `BP_Armoury`', text: 'Its class defaults hard-reference 40 weapon Blueprints and a showcase mesh.' },
            { title: 'Each weapon Blueprint loads', text: 'Each one hard-references its skeletal mesh, materials, firing sounds, muzzle-flash particle system and animation montages.' },
            { title: 'Each of those loads', text: 'Materials pull in textures; montages pull in skeletons; particle systems pull in more materials and meshes.' },
            { title: 'Result', text: 'Placing one armoury in a level costs hundreds of megabytes of memory and seconds of load time, even if the player never touches a single weapon.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why must loading follow hard references?',
          text: 'A hard reference is a real pointer to a real object. The engine guarantees that once an object has finished loading, its object pointers are valid — that is what lets your code use `ShowcaseMesh->` without asking whether the mesh exists. The only way to keep that promise is to load the target before (or together with) the referencer. Convenience now, memory cost always.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Seeing the chain',
          text: 'Right-click any asset in the Content Browser. **Size Map** shows how much memory and disk the asset drags in with all of its dependencies — often a shock. **Reference Viewer** draws the dependency graph and can show hard and soft references separately. Together they are the [[reference-viewer]] toolkit for hunting load chains.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'C++ classes are not assets',
          text: 'Code is always loaded, so a C++ class costs no asset loading by itself. Load chains come from **values** stored in assets — Blueprint defaults, placed actors in levels, data assets — and from `ConstructorHelpers::FObjectFinder` in constructors, which bakes a hard reference into the class default object. This is one reason Epic recommends C++ base classes and interfaces for communication: referring to `AWeapon` (C++) is free, referring to `BP_Rifle` (an asset) is not.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      kind: 'mcq',
      prompt: '`BP_MenuGameMode`, used only in the main menu, has a property `TSubclassOf<ACharacter> PreviewCharacter` set to `BP_Knight`. `BP_Knight` hard-references 300 MB of meshes, textures and animations. The menu never spawns a knight. What happens when the main menu loads?',
      options: [
        { text: 'Nothing extra: assets only load when an actor using them is spawned', why: 'Loading is driven by references, not by spawning. The class reference alone forces the class — and everything it references — to load.' },
        { text: 'Only the `BP_Knight` class loads; its meshes wait until a knight is spawned', why: 'A Blueprint class\'s defaults hard-reference its meshes and animations, so loading the class loads them too.' },
        { text: '`BP_Knight` and its entire 300 MB dependency chain load with the menu', correct: true, why: 'The game mode hard-references the class, the class hard-references its assets, and the engine follows every link.' },
        { text: 'The engine warns about the unused reference and skips it in packaged builds', why: 'The engine cannot know the reference is unused at runtime. It loads what you reference.' },
      ],
      explanation:
        'Hard references are followed transitively at load time, regardless of whether gameplay ever uses them. Opening the Size Map on `BP_MenuGameMode` would show the 300 MB knight hanging off it. Making `PreviewCharacter` a `TSoftClassPtr<ACharacter>` would break the chain: the menu would load only a path, and the knight could be loaded later, if and when it is needed.',
    },
    // ------------------------------------------------------------------ 3
    {
      kind: 'concept',
      title: 'Soft references store a path',
      blocks: [
        {
          type: 'p',
          text: 'A [[soft-reference]] refers to an asset by **name** rather than by address. [[tsoftobjectptr|TSoftObjectPtr<T>]] and [[tsoftclassptr|TSoftClassPtr<T>]] hold an [[fsoftobjectpath]] such as `/Game/Weapons/SM_Rifle.SM_Rifle`, plus a cached weak pointer to the object if it happens to be loaded. Loading the owner loads only the path.',
        },
        {
          type: 'code',
          title: 'Armoury.h (soft)',
          code: `UCLASS()
class MYGAME_API AArmoury : public AActor {
    GENERATED_BODY()

protected:
    // Paths only: nothing loads with the armoury
    UPROPERTY(EditDefaultsOnly, Category = "Armoury")
    TArray<TSoftClassPtr<AWeapon>> AllWeapons;

    UPROPERTY(EditDefaultsOnly, Category = "Armoury")
    TSoftObjectPtr<UStaticMesh> ShowcaseMesh;
};`,
          annotations: [
            { lines: 8, text: '`TSoftClassPtr<AWeapon>` is the soft counterpart of `TSubclassOf<AWeapon>`. The editor still shows a class picker filtered to `AWeapon` subclasses.' },
            { lines: 11, text: '`TSoftObjectPtr<UStaticMesh>` is the soft counterpart of `TObjectPtr<UStaticMesh>`. Designers see the same asset picker; only the loading behaviour changes.' },
          ],
        },
        {
          type: 'table',
          headers: ['Call', 'Returns', 'Loads?'],
          rows: [
            ['`IsNull()`', '`true` if no asset was assigned (empty path)', 'No'],
            ['`IsPending()`', '`true` if a path is set but the asset is not in memory', 'No'],
            ['`IsValid()`', '`true` if the asset is currently loaded', 'No'],
            ['`Get()`', 'The object if loaded, otherwise `nullptr`', '**No**'],
            ['`LoadSynchronous()`', 'The object, loading it right now if needed', 'Yes — blocks'],
            ['`ToSoftObjectPath()`', 'The underlying `FSoftObjectPath`', 'No'],
          ],
        },
        {
          type: 'memory',
          caption: 'A soft pointer before and after its asset is loaded',
          regions: [
            {
              label: 'AArmoury',
              kind: 'heap',
              cells: [
                { name: 'ShowcaseMesh.Path', type: 'FSoftObjectPath', value: '"/Game/Props/SM_Showcase.SM_Showcase"' },
                { name: 'ShowcaseMesh.Cache', type: 'weak pointer', value: 'null → (after load) mesh', pointsTo: 'mesh' },
              ],
            },
            {
              label: 'Memory after something loads the asset',
              kind: 'heap',
              cells: [
                { id: 'mesh', type: 'UStaticMesh', value: 'SM_Showcase (loaded)', highlight: true },
              ],
            },
          ],
        },
        {
          type: 'callout',
          variant: 'analogy',
          title: 'A bookmark, not a download',
          text: 'A hard reference is like a document with every image embedded: open it and everything comes with it. A soft reference is a link: tiny to store, and the content is fetched only when you click — at the cost of waiting for it then.',
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      kind: 'truefalse',
      prompt: 'Calling `Get()` on a `TSoftObjectPtr` loads the asset from disk if it is not already in memory.',
      answer: false,
      explanation:
        '`Get()` only resolves the path against objects that are **already loaded**, returning `nullptr` otherwise. Loading is always an explicit decision: `LoadSynchronous()` (blocking) or an async request through `FStreamableManager`. This is deliberate — a hidden disk read inside an innocent-looking getter would cause unexplained hitches.',
    },
    // ------------------------------------------------------------------ 5
    {
      kind: 'concept',
      title: 'LoadSynchronous: simple, but it stalls the frame',
      blocks: [
        {
          type: 'p',
          text: 'The simplest way to resolve a soft reference is `LoadSynchronous()`. If the asset is already loaded it returns immediately; otherwise it reads the package from disk, decompresses it, loads all *its* hard dependencies, and only then returns.',
        },
        {
          type: 'code',
          title: 'Armoury.cpp',
          code: `void AArmoury::ShowShowcase() {
    // Blocks the game thread until the mesh is in memory
    UStaticMesh* Mesh = ShowcaseMesh.LoadSynchronous();
    if (Mesh) {
        Display->SetStaticMesh(Mesh);
    }
}`,
          annotations: [
            { lines: 3, text: 'Everything else on the game thread waits — gameplay, input handling, animation updates. A 60 ms load at 60 fps means about four frames with no updates.' },
            { lines: 5, text: 'Storing the mesh in the component matters: `UStaticMeshComponent` keeps it in a `UPROPERTY`, which is now the **strong** reference keeping the mesh loaded.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Loaded is not the same as kept',
          text: 'A soft pointer\'s cache is weak: it does not keep the asset alive. If you load something and only keep the raw pointer in a local variable, the next garbage collection can unload it again, and the next `Get()` returns null. After loading, store the asset in a strong reference — a `UPROPERTY` member, a component, or a held streamable handle.',
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'When a blocking load is acceptable',
          text: 'Behind a loading screen, during initialisation before gameplay starts, in editor tools, or for assets you know are tiny and probably already loaded. In the middle of gameplay — opening an inventory, spawning an enemy, switching weapons — a synchronous load is a hitch players will feel. That is what asynchronous loading is for.',
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      kind: 'bug',
      prompt: 'In packaged builds, shop item icons are often blank, although they always appear when testing in the editor. Tap the line responsible.',
      code: `// UPROPERTY(EditDefaultsOnly) TSoftObjectPtr<UTexture2D> ItemIcon;

void UShopEntryWidget::ShowItem() {
    NameText->SetText(ItemName);
    UTexture2D* Icon = ItemIcon.Get();
    IconImage->SetBrushFromTexture(Icon);
}`,
      bugLines: [5],
      hint: 'Which soft pointer call never loads anything?',
      explanation:
        '`Get()` returns the texture only if something else has already loaded it. In the editor, the icon is often in memory already — you opened it, or the Content Browser generated a thumbnail — so the bug hides. In a packaged build nothing has loaded it, `Get()` returns null, and the image is blank. Fix: request an async load and set the brush in the completion callback (showing a placeholder meanwhile), or call `LoadSynchronous()` if a tiny stall is acceptable.',
    },
    // ------------------------------------------------------------------ 7
    {
      kind: 'concept',
      title: 'Async loading with FStreamableManager',
      blocks: [
        {
          type: 'p',
          text: '[[async-loading|Asynchronous loading]] reads the asset in the background while the game keeps running, then calls you back on the game thread. The engine object that does it is the [[streamable-manager]]; the [[asset-manager]] owns a shared instance you can reach from anywhere.',
        },
        {
          type: 'code',
          title: 'TrophyPedestal.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Engine/StreamableManager.h"
#include "TrophyPedestal.generated.h"

UCLASS()
class MYGAME_API ATrophyPedestal : public AActor {
    GENERATED_BODY()

public:
    void ShowTrophy(TSoftObjectPtr<UStaticMesh> Trophy);

private:
    void OnTrophyLoaded();

    UPROPERTY(VisibleAnywhere, Category = "Pedestal")
    TObjectPtr<UStaticMeshComponent> Display;

    TSoftObjectPtr<UStaticMesh> PendingTrophy;
    TSharedPtr<FStreamableHandle> LoadHandle;
};`,
          annotations: [
            { lines: 5, text: 'Declares `FStreamableManager`, `FStreamableHandle` and `FStreamableDelegate`.' },
            { lines: 22, text: 'The request handle is a plain C++ object, so it is managed by a `TSharedPtr` — the smart pointers from the previous lesson. While you hold it, the requested assets stay referenced.' },
          ],
        },
        {
          type: 'code',
          title: 'TrophyPedestal.cpp',
          code: `#include "TrophyPedestal.h"
#include "Engine/AssetManager.h"

void ATrophyPedestal::ShowTrophy(
    TSoftObjectPtr<UStaticMesh> Trophy) {
    PendingTrophy = Trophy;
    if (Trophy.IsValid()) {       // already in memory
        OnTrophyLoaded();
        return;
    }
    FStreamableManager& Streamable =
        UAssetManager::GetStreamableManager();
    LoadHandle = Streamable.RequestAsyncLoad(
        Trophy.ToSoftObjectPath(),
        FStreamableDelegate::CreateUObject(
            this, &ATrophyPedestal::OnTrophyLoaded));
}

void ATrophyPedestal::OnTrophyLoaded() {
    if (UStaticMesh* Mesh = PendingTrophy.Get()) {
        Display->SetStaticMesh(Mesh);
    }
    LoadHandle.Reset();  // the component now keeps it loaded
}`,
          annotations: [
            { lines: '7-10', text: 'Skip the request entirely when the asset is already loaded.' },
            { lines: '11-12', text: '`UAssetManager::GetStreamableManager()` is a static accessor for the project-wide streamable manager.' },
            { lines: '13-16', text: '`RequestAsyncLoad` accepts one path or a `TArray<FSoftObjectPath>`. The callback is an `FStreamableDelegate`; `CreateUObject` binds it weakly, so it will not run on a destroyed pedestal.' },
            { lines: 20, text: 'In the callback, `Get()` succeeds because the asset is now in memory.' },
            { lines: 23, text: 'Once a strong reference (the component) holds the mesh, the handle is no longer needed. Dropping it lets the asset unload later when nothing uses it.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why does the handle matter?',
          text: 'Between the moment loading finishes and the moment your callback stores the asset somewhere strong, *something* must keep it from being garbage collected. That something is the `FStreamableHandle`. Keep it for as long as you want the assets guaranteed in memory — for example, preload a level\'s enemy classes and hold the handle until the level ends — and release it when you are done. You can also cancel a request in flight with `LoadHandle->CancelHandle()`.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'Design for the wait',
          text: 'Async loading changes the shape of your feature: there is now a moment where the asset is not ready. Show a placeholder or spinner, disable the button, or start loading earlier (when the shop opens rather than when an item is hovered). Blueprint offers the same capability through the *Async Load Asset* node.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      kind: 'order',
      prompt: 'Put the steps of a hitch-free asset load in order.',
      lines: [
        'Declare the asset as a `TSoftObjectPtr` property so loading its owner loads only a path',
        'Call `RequestAsyncLoad` with its `FSoftObjectPath` and a completion delegate',
        'Keep the returned `FStreamableHandle` while the load is in flight',
        'In the callback, `Get()` the now-loaded asset',
        'Store the asset in a strong reference, then release the handle',
      ],
      linesAreCode: false,
      explanation:
        'The soft property breaks the load chain; the async request moves disk work off the game thread; the handle keeps the result alive until you take ownership; `Get()` works once loading has finished; and a strong reference (a `UPROPERTY` or component) keeps the asset in memory after the handle is gone.',
    },
    // ------------------------------------------------------------------ 9
    {
      kind: 'concept',
      title: 'FSoftObjectPath and soft classes',
      blocks: [
        {
          type: 'p',
          text: '`FSoftObjectPath` is the untyped path inside every soft pointer. Use `TSoftObjectPtr`/`TSoftClassPtr` for properties (they add type safety and filtered pickers) and `FSoftObjectPath` where you need a list of mixed asset types, such as a preload list.',
        },
        {
          type: 'code',
          title: 'BossArena.cpp',
          code: `// In the header:
//   UPROPERTY(EditDefaultsOnly, Category = "Boss")
//   TSoftClassPtr<AEnemy> BossClass;

void ABossArena::StartEncounter() {
    // Called behind the arena's intro cinematic fade
    UClass* Loaded = BossClass.LoadSynchronous();
    if (Loaded) {
        GetWorld()->SpawnActor<AEnemy>(
            Loaded, SpawnPoint->GetComponentTransform());
    }
}`,
          annotations: [
            { lines: 3, text: 'A soft class reference. Its path looks like `/Game/Enemies/BP_Dragon.BP_Dragon_C` — Blueprint-generated classes carry a `_C` suffix.' },
            { lines: 7, text: 'For a class, `LoadSynchronous()` returns a `UClass*`, ready to pass to [[spawnactor|SpawnActor]]. A blocking load is acceptable here because the screen is fading.' },
          ],
        },
        {
          type: 'callout',
          variant: 'warning',
          title: 'Avoid hard-coded path strings',
          text: '`FSoftObjectPath(TEXT("/Game/Enemies/BP_Dragon.BP_Dragon_C"))` in C++ breaks silently when someone renames or moves the asset. The editor fixes up soft references stored in **assets** when they are renamed, but it cannot edit string literals in your code. Expose a `UPROPERTY` and let designers pick the asset instead.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Soft does not mean "excluded from the build"',
          text: 'When packaging, the cooker follows soft references from cooked content too, so softly referenced assets still ship. Soft references change **when** an asset is loaded at runtime, not **whether** it is included in the game.',
        },
        {
          type: 'deepdive',
          title: 'Inside FSoftObjectPath',
          blocks: [
            {
              type: 'p',
              text: 'Since UE 5.1 an `FSoftObjectPath` stores an `FTopLevelAssetPath` (the package name and asset name, both as `FName`s) plus an optional sub-object string for objects nested inside an asset. Useful members:',
            },
            {
              type: 'list',
              items: [
                '`ResolveObject()` — find the object if it is already loaded, without loading (what `Get()` uses).',
                '`TryLoad()` — load synchronously and return the object.',
                '`IsValid()` — whether the path is non-empty (not whether the asset is loaded!).',
                '`ToString()` — the full path, handy for logging.',
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      kind: 'fill',
      prompt: 'Complete the declarations and calls.',
      template: `// A boss Blueprint class that should not load with the arena
UPROPERTY(EditDefaultsOnly, Category = "Boss")
___<AEnemy> BossClass;

// During the fade-out: load now, blocking
UClass* Loaded = BossClass.___();

// Is a music path set, but the track not loaded yet?
if (VictoryMusic.___()) {
    StartMusicPreload();
}`,
      blanks: [{ answers: ['TSoftClassPtr'] }, { answers: ['LoadSynchronous'] }, { answers: ['IsPending'] }],
      wordBank: ['TSoftClassPtr', 'LoadSynchronous', 'IsPending', 'TSubclassOf', 'TSoftObjectPtr', 'Get', 'IsNull'],
      explanation:
        'A class that should not load with its owner needs `TSoftClassPtr` — `TSubclassOf` is a hard reference, and `TSoftObjectPtr` is for asset objects rather than classes. `LoadSynchronous()` is the blocking load; `Get()` would return null if the class were not already loaded. `IsPending()` is true exactly when a path is set but the asset is not in memory; `IsNull()` would only tell you whether a path is set at all.',
    },
    // ------------------------------------------------------------------ 11
    {
      kind: 'concept',
      title: 'When soft references are worth it',
      blocks: [
        {
          type: 'p',
          text: 'Soft references are not "better" hard references. They trade simplicity for control: every soft reference introduces a loading step, a not-yet-loaded state, and a strong reference you must manage afterwards. Use them where the memory or load-time savings are real.',
        },
        {
          type: 'table',
          headers: ['Usually soft', 'Usually hard'],
          rows: [
            ['Large optional content: cosmetics, skins, alternate outfits', 'Assets always needed with their owner: a character\'s own mesh and animations'],
            ['Catalogues: every item\'s icon and mesh in a [[data-table]] or [[data-asset]]', 'Small assets used constantly: UI click sounds, common materials'],
            ['References from always-loaded objects (GameMode, GameInstance) to content needed only sometimes', 'Things needed instantly with no time to load: the projectile a gun fires every shot'],
            ['Per-level or per-biome content chosen at runtime', 'Assets that share a lifetime with the referencing asset anyway'],
          ],
        },
        {
          type: 'list',
          items: [
            '**Audit first.** Open the Size Map on your game mode, player character, game instance and main HUD. These are always loaded, so whatever they hard-reference is always in memory.',
            '**Break the biggest chains.** Convert the few references that pull in the most, not every pointer in the project.',
            '**Prefer C++ types in references and casts.** Referencing a C++ class costs no asset loading; referencing a Blueprint class loads it and its dependencies. The casting lesson returns to this.',
            '**Scale up with the Asset Manager.** For large projects, Primary Assets and *bundles* let the Asset Manager load and unload groups of soft-referenced content by name — covered with data assets later in the course.',
          ],
        },
        {
          type: 'callout',
          variant: 'unreal',
          title: 'Bridge to standard C++',
          text: 'Standard C++ has no built-in asset system, so there is no direct equivalent. The closest idea is the difference between linking a library at build time (always loaded, like a hard reference) and loading a plugin with `dlopen`/`LoadLibrary` by file name when needed (like a soft reference) — with the same trade-off between convenience and control.',
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      kind: 'mcq',
      prompt: 'Which of these references gains the most from becoming a soft reference?',
      options: [
        { text: 'The player character\'s own skeletal mesh, referenced by `BP_PlayerCharacter`', why: 'The character cannot appear without its mesh, so they always load together. A soft reference would only add a loading step.' },
        { text: 'The 150 unlockable weapon skins listed by the always-loaded cosmetics menu data asset', correct: true, why: 'Large, optional, mostly unused at any moment, and referenced from something that is always loaded — the textbook case for soft references with on-demand loading.' },
        { text: 'The 4 KB click sound every menu button plays', why: 'Tiny and used constantly. A soft reference would save almost nothing and add complexity and first-click latency.' },
        { text: 'The projectile class a rifle spawns on every shot', why: 'It is needed instantly and repeatedly while the rifle exists. Loading it on first shot would cause a hitch at the worst possible moment.' },
      ],
      explanation:
        'Soft references pay off when an asset is **big**, **optional** and referenced from something that is **loaded far more often than the asset is used**. The cosmetics catalogue would otherwise keep 150 skins in memory permanently. Assets that are always needed alongside their owner, or needed instantly, are better left as hard references.',
    },
  ],
  takeaways: [
    'A hard reference forces its target — and the target\'s hard references, transitively — to load with the owner.',
    'Find load chains with the Size Map and Reference Viewer; audit always-loaded objects first.',
    '`TSoftObjectPtr` / `TSoftClassPtr` store an `FSoftObjectPath`; `Get()` never loads, `LoadSynchronous()` blocks the game thread.',
    'Async loading via `UAssetManager::GetStreamableManager().RequestAsyncLoad` avoids hitches; hold the returned `FStreamableHandle` until a strong reference owns the asset.',
    'A soft pointer\'s cache is weak: after loading, keep the asset in a `UPROPERTY`, component or handle, or it may be unloaded.',
    'Prefer picker-assigned `UPROPERTY` soft references over hard-coded path strings; soft-referenced assets still ship in the build.',
    'Use soft references for big, optional content referenced from frequently loaded objects — not for everything.',
  ],
  reading: [
    {
      title: 'Referencing Assets',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/referencing-assets-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s overview of hard and soft references, `TSoftObjectPtr` and `FSoftObjectPath`.',
    },
    {
      title: 'Asynchronous Asset Loading',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/asynchronous-asset-loading-in-unreal-engine',
      source: 'unreal-docs',
      note: 'How `FStreamableManager` requests and handles work, with examples.',
    },
    {
      title: 'Asset Management',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/asset-management-in-unreal-engine',
      source: 'unreal-docs',
      note: 'The Asset Manager, Primary Assets and bundles — the next step for large projects.',
    },
  ],
};
