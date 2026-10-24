import type { Lesson } from '../../types';

export const lesson: Lesson = {
  id: 'ue-capstone-projectile',
  title: 'A Projectile Weapon with Damage',
  summary:
    'Fire real projectiles from a muzzle socket, deal point damage into the health component, control fire rate with timers, and make it work in multiplayer.',
  minutes: 25,
  objectives: [
    'Build an `AProjectile` with a sphere collision root and a configured `UProjectileMovementComponent`',
    'Turn `OnComponentHit` into damage with `UGameplayStatics::ApplyPointDamage`, crediting the instigator',
    'Prevent self-hits with `IgnoreActorWhenMoving`, and explain the difference between Owner and Instigator',
    'Fire from a character using `TSubclassOf`, a muzzle socket transform and `FActorSpawnParameters`',
    'Control fire rate with a looping timer, and spawn and validate shots on the server in multiplayer',
  ],
  steps: [
    {
      kind: 'concept',
      title: 'The brief: a weapon that fires real projectiles',
      blocks: [
        {
          type: 'p',
          text: 'The final capstone ties everything together. The player holds the fire button; plasma bolts leave the gun\'s muzzle at a steady rate, fly with a slight drop, and explode against whatever they hit. Enemies hit by them lose health through the health component you built — which never learns that projectiles exist. Missed shots clean themselves up. And it all works in multiplayer.',
        },
        {
          type: 'compare',
          left: {
            title: 'Hitscan',
            tone: 'neutral',
            text: 'A [[line-trace|line trace]] at the moment of firing: the hit is instant. Cheap and precise — ideal for rifles and lasers. You already know how to do this.',
          },
          right: {
            title: 'Projectile',
            tone: 'neutral',
            text: 'An actor that travels: it takes time, can drop, bounce or home in, and can be seen and dodged. Ideal for rockets, grenades, arrows and plasma — and the subject of this lesson.',
          },
        },
        {
          type: 'list',
          items: [
            '**`AProjectile`** — collision, movement, damage on impact, self-cleanup.',
            '**The character** — chooses *which* projectile (`TSubclassOf`), *where* it spawns (a muzzle socket) and *how often* (a timer).',
            '**The damage pipeline** — `ApplyPointDamage` → `TakeDamage` → `OnTakeAnyDamage` → `UHealthComponent`.',
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why route damage through the engine again?',
          text: 'Because the projectile then works on *anything*: enemies, players, explosive barrels, destructible doors — every actor with a health component, plus any actor that overrides `TakeDamage` its own way. The weapon and the targets stay completely independent, so either side can change without touching the other.',
        },
      ],
    },
    {
      kind: 'concept',
      title: 'Step 1: the projectile actor',
      blocks: [
        {
          type: 'code',
          title: 'Projectile.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Projectile.generated.h"

class USphereComponent;
class UStaticMeshComponent;
class UProjectileMovementComponent;
class UDamageType;

UCLASS()
class MYGAME_API AProjectile : public AActor
{
    GENERATED_BODY()

public:
    AProjectile();

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<USphereComponent> CollisionComponent;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UStaticMeshComponent> MeshComponent;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UProjectileMovementComponent> ProjectileMovement;

    UPROPERTY(EditDefaultsOnly, Category = "Damage",
        meta = (ClampMin = "0.0"))
    float Damage = 20.f;

    UPROPERTY(EditDefaultsOnly, Category = "Damage")
    TSubclassOf<UDamageType> DamageTypeClass;
};`,
          annotations: [
            { lines: '7-10', text: 'All forward-declared; the `.cpp` includes the full headers.' },
            { lines: '23-30', text: 'The same root-collision-plus-visual-mesh structure as the pickup, plus a movement component.' },
            { lines: '32-34', text: 'Damage per hit, tuned per Blueprint (`BP_PlasmaBolt` 20, `BP_Rocket` 120).' },
            { lines: '36-37', text: 'An optional [[damage-type]] class (`UDT_Fire`, `UDT_Explosive`…) that receivers can inspect for resistances. Left empty, the engine uses the base `UDamageType`.' },
          ],
        },
        {
          type: 'code',
          title: 'Projectile.cpp',
          code: `#include "Projectile.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/ProjectileMovementComponent.h"

AProjectile::AProjectile()
{
    PrimaryActorTick.bCanEverTick = false;

    CollisionComponent = CreateDefaultSubobject<USphereComponent>(
        TEXT("Collision"));
    CollisionComponent->InitSphereRadius(8.f);
    CollisionComponent->SetCollisionProfileName(
        TEXT("BlockAllDynamic"));
    SetRootComponent(CollisionComponent);

    MeshComponent = CreateDefaultSubobject<UStaticMeshComponent>(
        TEXT("Mesh"));
    MeshComponent->SetupAttachment(CollisionComponent);
    MeshComponent->SetCollisionEnabled(
        ECollisionEnabled::NoCollision);

    ProjectileMovement = CreateDefaultSubobject<
        UProjectileMovementComponent>(TEXT("ProjectileMovement"));
    ProjectileMovement->UpdatedComponent = CollisionComponent;
    ProjectileMovement->InitialSpeed = 3000.f;
    ProjectileMovement->MaxSpeed = 3000.f;
    ProjectileMovement->bRotationFollowsVelocity = true;
    ProjectileMovement->bShouldBounce = false;
    ProjectileMovement->ProjectileGravityScale = 0.3f;

    InitialLifeSpan = 5.f;
}`,
          annotations: [
            { lines: 8, text: 'The movement component ticks; the actor does not need to.' },
            { lines: '12-14', text: 'A small sphere that **blocks**, so it produces hit events. `BlockAllDynamic` works out of the box; a real project usually adds a custom *Projectile* object channel so, for example, projectiles can pass through each other.' },
            { lines: 25, text: 'The component that gets moved — the collision root, so every move is a collision sweep. (Epic\'s templates assign it this way in the constructor.)' },
            { lines: 26, text: '`InitialSpeed` in cm/s. The projectile flies along the forward (X) axis of its **spawn rotation** at this speed.' },
            { lines: 27, text: '`MaxSpeed` caps the speed (0 = no limit) — relevant once gravity or acceleration could push it faster.' },
            { lines: 28, text: '`bRotationFollowsVelocity` turns the actor to face its direction of travel each frame, so an arrow tips downward as it drops.' },
            { lines: 29, text: '`bShouldBounce = false`: stop at the first blocking hit. Set it to `true` (with `Bounciness` and `Friction`) for grenades.' },
            { lines: 30, text: 'A light 30 % gravity for a gentle arc. 0 flies dead straight; 1 is full gravity.' },
            { lines: 32, text: 'An [[actor-lifespan]]: missed shots destroy themselves after 5 seconds instead of flying forever.' },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'The character spawns an `AProjectile` with `InitialSpeed = 3000`. In which direction does it fly?',
      options: [
        {
          text: 'Along the world X axis, whatever the spawn rotation',
          why: 'The default velocity is interpreted in the projectile\'s *local* space (`bInitialVelocityInLocalSpace` is true by default), so it follows the actor\'s orientation, not the world axes.',
        },
        {
          text: 'Along the forward (X) axis of the rotation it was spawned with',
          correct: true,
          why: 'The component\'s default velocity points along local +X; at initialization `InitialSpeed` rescales it and it is converted to world space using the spawn rotation. Aim by choosing the spawn rotation.',
        },
        {
          text: 'Automatically towards the crosshair',
          why: 'The movement component knows nothing about cameras or crosshairs. Aiming at the crosshair is your job, when you compute the spawn rotation.',
        },
        {
          text: 'In the direction the instigator is moving',
          why: 'The instigator\'s velocity is not inherited unless you add it yourself.',
        },
      ],
      explanation:
        '`UProjectileMovementComponent` starts with a velocity along its local forward axis, scaled to `InitialSpeed` and rotated by the actor\'s spawn rotation. That makes spawning simple: put the projectile where the shot starts, rotate it where the shot should go, and the component does the rest.',
    },
    {
      kind: 'concept',
      title: 'Step 2: what the movement component does for you',
      blocks: [
        {
          type: 'p',
          text: 'Every tick, the [[projectile-movement-component]] integrates velocity (plus gravity), then **sweeps** the collision sphere from the old position to the new one. If the sweep hits something that blocks, the projectile stops at the contact point (or bounces, if enabled) and the hit is reported.',
        },
        {
          type: 'table',
          headers: ['Property / event', 'What it does'],
          rows: [
            ['`InitialSpeed`, `MaxSpeed`', 'Launch speed and speed cap (cm/s)'],
            ['`ProjectileGravityScale`', 'Multiplier on world gravity: 0 straight, 1 full arc'],
            ['`bRotationFollowsVelocity`', 'Face the direction of travel'],
            ['`bShouldBounce`, `Bounciness`, `Friction`', 'Bounce instead of stopping, and how much energy each bounce keeps'],
            ['`bIsHomingProjectile`, `HomingTargetComponent`, `HomingAccelerationMagnitude`', 'Steer towards a target, for homing missiles'],
            ['`OnProjectileStop`, `OnProjectileBounce`', 'Delegates fired when it stops or bounces'],
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why not just simulate physics?',
          text: 'A physics-simulated sphere moving 30 m/s can pass straight through a thin wall between two physics steps unless you enable continuous collision detection. The projectile component *sweeps* every move, so tunnelling cannot happen by design. It is also cheaper, predictable and easy to replicate — clients can simulate the same flight from the same starting velocity. Use real physics for objects that must tumble and interact; use the movement component for things that fly.',
        },
        {
          type: 'callout',
          variant: 'note',
          title: 'Hit events from sweeps',
          text: 'Blocking hits from swept movement always dispatch `OnComponentHit` on both components. The *Simulation Generates Hit Events* checkbox (`SetNotifyRigidBodyCollision`) is only needed for bodies driven by the **physics simulation** — a common source of confusion, and of checkboxes ticked for no reason.',
        },
      ],
    },
    {
      kind: 'truefalse',
      prompt: 'For `OnComponentHit` to fire when a projectile-movement-driven sphere hits a wall, you must enable *Simulation Generates Hit Events* on the sphere.',
      answer: false,
      explanation:
        'Movement sweeps report their blocking hits through `OnComponentHit` regardless of that setting. *Simulation Generates Hit Events* controls whether collisions computed by the physics engine for simulating bodies are reported. What the projectile *does* need is a collision setup where it and the target block each other.',
    },
    {
      kind: 'concept',
      title: 'Step 3: impact — from hit to damage',
      blocks: [
        {
          type: 'code',
          title: 'Projectile.h (private)',
          code: `private:
    UFUNCTION()
    void HandleHit(UPrimitiveComponent* HitComponent,
        AActor* OtherActor, UPrimitiveComponent* OtherComp,
        FVector NormalImpulse, const FHitResult& Hit);`,
          annotations: [
            { lines: '2-5', text: 'A `UFUNCTION` matching `FComponentHitSignature` — the [[hit-event]] signature from the delegates unit.' },
          ],
        },
        {
          type: 'code',
          title: 'Projectile.cpp',
          code: `#include "Kismet/GameplayStatics.h"
#include "GameFramework/Pawn.h"

void AProjectile::BeginPlay()
{
    Super::BeginPlay();
    CollisionComponent->OnComponentHit.AddDynamic(
        this, &AProjectile::HandleHit);
}

void AProjectile::HandleHit(UPrimitiveComponent* HitComponent,
    AActor* OtherActor, UPrimitiveComponent* OtherComp,
    FVector NormalImpulse, const FHitResult& Hit)
{
    if (!HasAuthority())
    {
        return;   // clients only watch; the server decides
    }

    if (OtherActor && OtherActor != GetInstigator())
    {
        UGameplayStatics::ApplyPointDamage(OtherActor, Damage,
            GetVelocity().GetSafeNormal(), Hit,
            GetInstigatorController(), this, DamageTypeClass);
    }

    Destroy();
}`,
          annotations: [
            { lines: 6, text: '`Super::BeginPlay()` is what applies `InitialLifeSpan` — forget it and missed shots live forever.' },
            { lines: '15-18', text: 'Damage is a gameplay decision, so only the [[authority]] makes it. In single player this is always true.' },
            { lines: 20, text: 'Hitting the world still destroys the projectile, but only actors other than the shooter take damage.' },
            { lines: '22-24', text: '[[apply-damage|`ApplyPointDamage`]] arguments: victim, amount, the direction the shot came from, the full hit result, the controller to credit, the causer (this projectile) and the damage type.' },
            { lines: 23, text: 'Our velocity, normalized, is exactly "the direction the hit came from" — useful for hit reactions and directional damage indicators.' },
            { lines: 24, text: '`GetInstigatorController()` gives the controller of the pawn that fired, so the kill is credited to the right player — it arrives in the health component as `InstigatedBy`.' },
            { lines: 27, text: 'Impact effects would play here, at `Hit.ImpactPoint`, before the actor goes away.' },
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', '`ApplyDamage`', '`ApplyPointDamage`'],
          rows: [
            ['Carries', 'Amount, instigator, causer, damage type', 'All of that plus hit location, bone, normal and shot direction'],
            ['Fires on the victim', '`OnTakeAnyDamage`', '`OnTakePointDamage` **and** `OnTakeAnyDamage`'],
            ['Use for', 'Damage with no point of impact (poison, lava)', 'Bullets and projectiles: headshots, hit reactions, decals'],
          ],
          caption: 'Both reach `OnTakeAnyDamage`, so the health component works unchanged with either.',
        },
      ],
    },
    {
      kind: 'fill',
      prompt: 'Complete the impact handler so the victim learns where the shot hit and the shooter gets the credit.',
      template: `void AProjectile::HandleHit(UPrimitiveComponent* HitComponent,
    AActor* OtherActor, UPrimitiveComponent* OtherComp,
    FVector NormalImpulse, const FHitResult& Hit)
{
    if (!HasAuthority()) { return; }

    UGameplayStatics::___(OtherActor, Damage,
        GetVelocity().GetSafeNormal(), Hit,
        ___(), this, DamageTypeClass);
    Destroy();
}`,
      blanks: [{ answers: ['ApplyPointDamage'] }, { answers: ['GetInstigatorController'] }],
      wordBank: ['ApplyPointDamage', 'ApplyDamage', 'TakeDamage', 'GetInstigatorController', 'GetInstigator', 'GetOwner'],
      explanation:
        '`ApplyPointDamage` is the variant that takes a hit direction and an `FHitResult`; `ApplyDamage` has no such parameters, and `TakeDamage` is the virtual function on the victim that these helpers call for you. The instigator parameter is an `AController*`: `GetInstigatorController()` returns one, while `GetInstigator()` returns the pawn and `GetOwner()` an actor — wrong types for this parameter.',
    },
    {
      kind: 'concept',
      title: 'Step 4: don\'t shoot yourself — Owner, Instigator and ignoring',
      blocks: [
        {
          type: 'p',
          text: 'The muzzle is a few centimetres from the shooter\'s own capsule — sometimes inside it. The projectile\'s very first sweep could hit the shooter. The fix is to tell the collision component to ignore the actor that fired it:',
        },
        {
          type: 'code',
          title: 'Projectile.cpp',
          code: `void AProjectile::BeginPlay()
{
    Super::BeginPlay();

    if (APawn* Shooter = GetInstigator())
    {
        CollisionComponent->IgnoreActorWhenMoving(Shooter, true);
    }

    CollisionComponent->OnComponentHit.AddDynamic(
        this, &AProjectile::HandleHit);
}`,
          annotations: [
            { lines: 5, text: 'The [[damage-instigator|instigator]] is set by `SpawnActor` from the spawn parameters *before* BeginPlay runs, so it is valid here — unlike in the constructor.' },
            { lines: 7, text: '`IgnoreActorWhenMoving` makes this component\'s movement sweeps pass through every component of that actor.' },
          ],
        },
        {
          type: 'table',
          headers: ['Aspect', 'Owner', 'Instigator'],
          rows: [
            ['Means', 'Who *owns* this actor (an ownership chain)', 'Which pawn is *responsible* for what it does'],
            ['Used for', 'Networking: which connection may call RPCs on it, owner-only relevancy and replication conditions', 'Damage credit (`GetInstigatorController()`), friendly-fire checks, self-ignore'],
            ['For our projectile', 'The character that fired', 'The character that fired'],
          ],
        },
        {
          type: 'p',
          text: 'They are often the same actor, as here, but they answer different questions. A turret placed by a player might be owned by the game mode while still crediting its kills to the player who placed it.',
        },
        {
          type: 'callout',
          variant: 'tip',
          title: 'The other direction',
          text: '`IgnoreActorWhenMoving` only affects *the projectile\'s* sweeps. If the shooter can run into its own slow projectile, also make the pawn ignore it (`APawn::MoveIgnoreActorAdd`), or use a custom collision channel so pawns and their projectiles never block each other.',
        },
      ],
    },
    {
      kind: 'bug',
      prompt: 'Shots sometimes explode instantly against the player who fired them, as if the "ignore" line did nothing. Tap the line responsible.',
      code: `AProjectile::AProjectile()
{
    CollisionComponent = CreateDefaultSubobject<USphereComponent>(
        TEXT("Collision"));
    CollisionComponent->InitSphereRadius(8.f);
    SetRootComponent(CollisionComponent);

    // Never collide with whoever fired us
    CollisionComponent->IgnoreActorWhenMoving(GetInstigator(), true);

    ProjectileMovement = CreateDefaultSubobject<
        UProjectileMovementComponent>(TEXT("ProjectileMovement"));
    ProjectileMovement->InitialSpeed = 3000.f;
    InitialLifeSpan = 5.f;
}`,
      bugLines: [9],
      hint: 'When is the instigator set, compared with when the constructor runs?',
      explanation:
        'The constructor runs before `SpawnActor` applies the spawn parameters — and also for the CDO, which never has an instigator. `GetInstigator()` is therefore `nullptr` on line 9, so nothing is ignored. Move the call to `BeginPlay`, where the instigator has been set. It is the constructor-versus-BeginPlay rule from the crashes lesson, showing up as a gameplay bug instead of a crash.',
    },
    {
      kind: 'concept',
      title: 'Step 5: firing from the character',
      blocks: [
        {
          type: 'code',
          title: 'MyCharacter.h (weapon additions)',
          code: `class AProjectile;
class UInputAction;

// ...inside AMyCharacter:
protected:
    UPROPERTY(EditDefaultsOnly, Category = "Weapon")
    TSubclassOf<AProjectile> ProjectileClass;

    UPROPERTY(EditDefaultsOnly, Category = "Weapon")
    FName MuzzleSocketName = FName(TEXT("Muzzle"));

    UPROPERTY(EditDefaultsOnly, Category = "Input")
    TObjectPtr<UInputAction> FireAction;

private:
    void SpawnProjectile();`,
          annotations: [
            { lines: '6-7', text: 'A [[tsubclassof|`TSubclassOf`]] holds a *class*, not an object. Designers pick `BP_PlasmaBolt` or `BP_Rocket` from a dropdown that only lists `AProjectile` subclasses.' },
            { lines: '9-10', text: 'The [[mesh-socket|socket]] on the character\'s skeletal mesh where shots begin. A name rather than a hard-coded offset, so animators can move it.' },
            { lines: '12-13', text: 'The Enhanced Input action, assigned in the Blueprint like the movement actions from the input unit.' },
          ],
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `#include "Projectile.h"
#include "Components/SkeletalMeshComponent.h"

void AMyCharacter::SpawnProjectile()
{
    USkeletalMeshComponent* MeshComp = GetMesh();
    if (!ProjectileClass
        || !MeshComp->DoesSocketExist(MuzzleSocketName))
    {
        UE_LOG(LogTemp, Warning,
            TEXT("%s: weapon is not configured"), *GetName());
        return;
    }

    const FVector SpawnLocation =
        MeshComp->GetSocketLocation(MuzzleSocketName);
    const FRotator SpawnRotation = GetControlRotation();

    FActorSpawnParameters SpawnParams;
    SpawnParams.Owner = this;
    SpawnParams.Instigator = this;
    SpawnParams.SpawnCollisionHandlingOverride =
        ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

    GetWorld()->SpawnActor<AProjectile>(ProjectileClass,
        SpawnLocation, SpawnRotation, SpawnParams);
}`,
          annotations: [
            { lines: '7-13', text: 'Both values come from designers, so they are validated with an `if` and a log, as the assertions lesson recommended — not with `check`. `GetSocketLocation` would silently return the mesh origin (the character\'s feet) for a missing socket.' },
            { lines: '15-16', text: 'Where the shot starts: the socket\'s current world location, which follows the animated gun.' },
            { lines: 17, text: 'Where it goes: the controller\'s aim, so shots follow the camera rather than the gun\'s animated wobble.' },
            { lines: '20-21', text: 'Owner for networking, Instigator for damage credit and self-ignore — both applied before the projectile\'s BeginPlay runs.' },
            { lines: '22-23', text: 'Never silently skip a shot because the muzzle overlaps something; spawning inside a wall simply hits it next frame.' },
            { lines: '25-26', text: '[[spawnactor|`SpawnActor<T>`]] with the class chosen by the designer. The return value is the new projectile, should you need it.' },
          ],
        },
        {
          type: 'deepdive',
          title: 'Making shots converge on the crosshair',
          blocks: [
            {
              type: 'p',
              text: 'The muzzle is offset from the camera, so a shot fired along the camera\'s rotation from the muzzle travels parallel to the crosshair line and misses close targets. Shooters fix this by tracing from the camera to find what the crosshair is on, then aiming from the muzzle at that point:',
            },
            {
              type: 'code',
              title: 'MyCharacter.cpp',
              code: `FVector EyeLocation;
FRotator EyeRotation;
GetActorEyesViewPoint(EyeLocation, EyeRotation);
const FVector TraceEnd =
    EyeLocation + EyeRotation.Vector() * 10000.0;

FHitResult Hit;
FCollisionQueryParams Params;
Params.AddIgnoredActor(this);
const bool bHit = GetWorld()->LineTraceSingleByChannel(
    Hit, EyeLocation, TraceEnd, ECC_Visibility, Params);
const FVector AimPoint = bHit ? Hit.ImpactPoint : TraceEnd;

const FRotator SpawnRotation =
    (AimPoint - SpawnLocation).Rotation();`,
              annotations: [
                { lines: 3, text: 'For a pawn, the eyes viewpoint uses its view location and control rotation — the crosshair\'s direction.' },
                { lines: '14-15', text: 'Aim from the muzzle at whatever the crosshair is on.' },
              ],
            },
          ],
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Why is the weapon\'s projectile stored as `TSubclassOf<AProjectile>` rather than `AProjectile*` or `UClass*`?',
      options: [
        {
          text: '`AProjectile*` would point at one existing projectile object, not describe a kind of projectile to spawn',
          why: 'True as far as it goes — but it does not explain why `TSubclassOf` beats a plain `UClass*`. The best answer covers both.',
        },
        {
          text: '`TSubclassOf` spawns actors faster than `UClass*`',
          why: '`TSubclassOf` wraps a `UClass*`; spawning costs exactly the same.',
        },
        {
          text: 'It stores a class, and restricts the editor picker and C++ assignments to `AProjectile` and its subclasses',
          correct: true,
          why: 'A class is what `SpawnActor` needs. A bare `UClass*` would let a designer pick any class at all — a light, a sound — and the mistake would only surface at run time.',
        },
        {
          text: 'Only `TSubclassOf` properties can be marked `EditDefaultsOnly`',
          why: 'Any reflected property type can use `EditDefaultsOnly`.',
        },
      ],
      explanation:
        '`TSubclassOf<T>` is a type-safe `UClass*`: it holds a class rather than an instance, the Details panel only offers `T` and its subclasses, and assigning an unrelated class in C++ fails. It is the standard way to let designers choose *what to spawn*.',
    },
    {
      kind: 'concept',
      title: 'Step 6: fire rate with a looping timer',
      blocks: [
        {
          type: 'p',
          text: 'Holding the button should fire at a fixed rate — say 10 shots per second — no matter the frame rate. Pressing faster than that must not fire faster. A looping [[timer-manager|timer]] gives both properties without any Tick code.',
        },
        {
          type: 'code',
          title: 'MyCharacter.h (more additions)',
          code: `protected:
    // 0.1 s between shots = 600 rounds per minute
    UPROPERTY(EditDefaultsOnly, Category = "Weapon",
        meta = (ClampMin = "0.01"))
    float TimeBetweenShots = 0.1f;

private:
    void StartFire();
    void StopFire();
    void FireOnce();

    FTimerHandle FireTimerHandle;
    double LastFireTime = -1.0e9;   // "long ago"`,
          annotations: [
            { lines: 13, text: '`double`, because `UWorld::GetTimeSeconds()` returns a `double` in UE5. Starting far in the past means the very first shot is never delayed.' },
          ],
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `void AMyCharacter::SetupPlayerInputComponent(
    UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    if (UEnhancedInputComponent* Input =
            Cast<UEnhancedInputComponent>(PlayerInputComponent))
    {
        // ...movement bindings from the input unit...
        Input->BindAction(FireAction, ETriggerEvent::Started,
            this, &AMyCharacter::StartFire);
        Input->BindAction(FireAction, ETriggerEvent::Completed,
            this, &AMyCharacter::StopFire);
    }
}

void AMyCharacter::StartFire()
{
    const double Now = GetWorld()->GetTimeSeconds();
    const float FirstDelay = static_cast<float>(
        FMath::Max(LastFireTime + TimeBetweenShots - Now, 0.0));

    GetWorldTimerManager().SetTimer(FireTimerHandle, this,
        &AMyCharacter::FireOnce, TimeBetweenShots, true,
        FirstDelay);
}

void AMyCharacter::StopFire()
{
    GetWorldTimerManager().ClearTimer(FireTimerHandle);
}

void AMyCharacter::FireOnce()
{
    LastFireTime = GetWorld()->GetTimeSeconds();
    SpawnProjectile();   // becomes ServerFire() in Step 7
}`,
          annotations: [
            { lines: '10-13', text: '`Started` fires once on press, `Completed` once on release — exactly the edges we need. (`Triggered` would fire every frame while held.)' },
            { lines: '19-21', text: 'If the last shot was 0.04 s ago and the interval is 0.1 s, the first shot waits 0.06 s. Otherwise it fires immediately. This is what stops click-spamming from beating the fire rate.' },
            { lines: '23-25', text: 'A looping timer (`true`) with `TimeBetweenShots` as the interval and the computed first delay. One-shot weapons would simply not loop.' },
            { lines: 30, text: 'Releasing the button cancels the remaining shots.' },
          ],
        },
        {
          type: 'callout',
          variant: 'why',
          title: 'Why a timer instead of counting in Tick?',
          text: 'A Tick accumulator works, but it runs every frame while the player is not even firing, spreads weapon state across Tick and input code, and is easy to get subtly frame-rate dependent. The timer is event-driven — it costs nothing while idle — and the timer manager keeps the interval in game time. If a frame takes longer than the interval, a looping timer catches up by firing the extra calls, so the average fire rate holds even at low frame rates.',
        },
      ],
    },
    {
      kind: 'order',
      prompt: 'The player taps fire twice very quickly, then holds the button. Put the steps of one held burst in order.',
      lines: [
        'Pressing the button triggers `ETriggerEvent::Started`, which calls `StartFire()`',
        '`StartFire()` computes the first delay from `LastFireTime` so the fire rate cannot be beaten',
        'The looping timer calls `FireOnce()`, which records `LastFireTime`',
        'A projectile is spawned at the muzzle with Owner and Instigator set',
        'Releasing the button triggers `ETriggerEvent::Completed`, and `StopFire()` clears the timer',
      ],
      distractors: ['`Tick` checks every frame whether the fire button is still held'],
      explanation:
        'Input edges start and stop the timer; the timer does the repetition; the first-delay calculation enforces the rate across separate presses. Nothing polls in Tick, so an idle weapon costs nothing.',
    },
    {
      kind: 'concept',
      title: 'Step 7: multiplayer — spawn on the server, replicate the projectile',
      blocks: [
        {
          type: 'p',
          text: 'In multiplayer, a projectile that deals damage is gameplay state, so the **server** spawns it. The client sends a request with a Server [[rpc|RPC]]; the server checks it, spawns a *replicated* projectile, and the engine creates a copy on every client.',
        },
        {
          type: 'code',
          title: 'MyCharacter.h (multiplayer additions)',
          code: `private:
    UFUNCTION(Server, Reliable)
    void ServerFire();

    double LastServerFireTime = -1.0e9;`,
          annotations: [
            { lines: '2-3', text: 'Called on the owning client, executed on the server. Called on the server itself (a listen-server host), it simply runs locally.' },
            { lines: 5, text: 'The server\'s own record of the last accepted shot, used to reject cheating clients.' },
          ],
        },
        {
          type: 'code',
          title: 'MyCharacter.cpp',
          code: `void AMyCharacter::FireOnce()
{
    LastFireTime = GetWorld()->GetTimeSeconds();
    ServerFire();
}

void AMyCharacter::ServerFire_Implementation()
{
    const double Now = GetWorld()->GetTimeSeconds();

    // Never trust the client's timer: allow a little
    // slack for network jitter, reject anything faster.
    if (Now - LastServerFireTime < TimeBetweenShots * 0.9)
    {
        return;
    }
    LastServerFireTime = Now;
    SpawnProjectile();
}`,
          annotations: [
            { lines: 4, text: 'The client\'s timer decides *when to ask*; the server decides *whether to fire*.' },
            { lines: '13-16', text: 'A modified client could call `ServerFire` 1000 times a second. The server enforces the real fire rate — the RPC lesson\'s "never trust the client", applied.' },
          ],
        },
        {
          type: 'code',
          title: 'Projectile.cpp (constructor additions)',
          code: `    bReplicates = true;
    SetReplicateMovement(true);`,
          annotations: [
            { lines: 1, text: 'The server\'s projectile is replicated: every client gets its own copy, and destroying it on the server destroys the copies.' },
            { lines: 2, text: 'Clients run the movement component themselves for smooth flight, while replicated movement corrects any drift.' },
          ],
        },
        {
          type: 'list',
          items: [
            '**Damage stays on the server.** The `HasAuthority()` check in `HandleHit` already ensures it; pawns also ignore damage applied without authority by default.',
            '**Health reaches clients by itself.** The health component replicates `CurrentHealth`, and its RepNotify fires `OnHealthChanged` and `OnDeath` there — the first capstone pays off.',
            '**Cosmetics belong on every machine.** Spawn impact effects on clients, for example from an unreliable `NetMulticast` RPC or from the projectile\'s `Destroyed()`, which also runs on clients.',
          ],
        },
        {
          type: 'callout',
          variant: 'perf',
          title: 'Latency and pooling',
          text: 'With this design, a client sees its own shot only after a round trip to the server. Competitive shooters hide that with *client-side prediction*: the shooter spawns a purely cosmetic projectile immediately while the server runs the real one. And at very high fire rates, spawning and destroying hundreds of actors costs real time; games then *pool* projectiles, deactivating and reusing them like the pickup does instead of destroying them.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'Which design is correct for a damaging projectile in a networked game?',
      options: [
        {
          text: 'The client spawns the projectile locally, and it replicates up to the server',
          why: 'Replication only flows from server to clients. An actor spawned on a client exists on that client alone, and its damage would be invisible to the server.',
        },
        {
          text: 'Every machine spawns its own projectile, and each applies damage when its copy hits',
          why: 'Copies on different machines can hit different things, and damage would be applied several times. Gameplay state must have one authority.',
        },
        {
          text: 'The client asks via a Server RPC; the server validates the request and spawns a replicated projectile that alone applies damage',
          correct: true,
          why: 'One authoritative projectile on the server decides hits and damage; replication shows it to everyone, and health replicates back. Validation stops clients from firing faster than allowed.',
        },
        {
          text: 'The client applies damage instantly with `ApplyPointDamage`, then tells the server what happened',
          why: 'Damage applied on a client changes nothing authoritative (pawns ignore it there by default), and trusting a client\'s report of hits invites cheating.',
        },
      ],
      explanation:
        'The server owns gameplay outcomes: it spawns the real projectile, simulates it, and applies damage. Clients send *requests* (RPCs) and receive *results* (replicated actors and properties). Prediction and cosmetics can be layered on top, but the authority never moves to the client.',
    },
    {
      kind: 'concept',
      title: 'The complete projectile',
      blocks: [
        {
          type: 'code',
          title: 'Projectile.h',
          code: `#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Projectile.generated.h"

class USphereComponent;
class UStaticMeshComponent;
class UProjectileMovementComponent;
class UDamageType;

UCLASS()
class MYGAME_API AProjectile : public AActor
{
    GENERATED_BODY()

public:
    AProjectile();

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<USphereComponent> CollisionComponent;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UStaticMeshComponent> MeshComponent;

    UPROPERTY(VisibleAnywhere, Category = "Components")
    TObjectPtr<UProjectileMovementComponent> ProjectileMovement;

    UPROPERTY(EditDefaultsOnly, Category = "Damage",
        meta = (ClampMin = "0.0"))
    float Damage = 20.f;

    UPROPERTY(EditDefaultsOnly, Category = "Damage")
    TSubclassOf<UDamageType> DamageTypeClass;

private:
    UFUNCTION()
    void HandleHit(UPrimitiveComponent* HitComponent,
        AActor* OtherActor, UPrimitiveComponent* OtherComp,
        FVector NormalImpulse, const FHitResult& Hit);
};`,
        },
        {
          type: 'code',
          title: 'Projectile.cpp',
          code: `#include "Projectile.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/ProjectileMovementComponent.h"
#include "Kismet/GameplayStatics.h"

AProjectile::AProjectile()
{
    PrimaryActorTick.bCanEverTick = false;

    CollisionComponent = CreateDefaultSubobject<USphereComponent>(
        TEXT("Collision"));
    CollisionComponent->InitSphereRadius(8.f);
    CollisionComponent->SetCollisionProfileName(
        TEXT("BlockAllDynamic"));
    SetRootComponent(CollisionComponent);

    MeshComponent = CreateDefaultSubobject<UStaticMeshComponent>(
        TEXT("Mesh"));
    MeshComponent->SetupAttachment(CollisionComponent);
    MeshComponent->SetCollisionEnabled(
        ECollisionEnabled::NoCollision);

    ProjectileMovement = CreateDefaultSubobject<
        UProjectileMovementComponent>(TEXT("ProjectileMovement"));
    ProjectileMovement->UpdatedComponent = CollisionComponent;
    ProjectileMovement->InitialSpeed = 3000.f;
    ProjectileMovement->MaxSpeed = 3000.f;
    ProjectileMovement->bRotationFollowsVelocity = true;
    ProjectileMovement->bShouldBounce = false;
    ProjectileMovement->ProjectileGravityScale = 0.3f;

    InitialLifeSpan = 5.f;

    bReplicates = true;
    SetReplicateMovement(true);
}

void AProjectile::BeginPlay()
{
    Super::BeginPlay();

    if (APawn* Shooter = GetInstigator())
    {
        CollisionComponent->IgnoreActorWhenMoving(Shooter, true);
    }

    CollisionComponent->OnComponentHit.AddDynamic(
        this, &AProjectile::HandleHit);
}

void AProjectile::HandleHit(UPrimitiveComponent* HitComponent,
    AActor* OtherActor, UPrimitiveComponent* OtherComp,
    FVector NormalImpulse, const FHitResult& Hit)
{
    if (!HasAuthority())
    {
        return;
    }

    if (OtherActor && OtherActor != GetInstigator())
    {
        UGameplayStatics::ApplyPointDamage(OtherActor, Damage,
            GetVelocity().GetSafeNormal(), Hit,
            GetInstigatorController(), this, DamageTypeClass);
    }

    Destroy();
}`,
          annotations: [
            { lines: '8-38', text: 'Construction: components, movement tuning, lifespan and replication — all defaults, nothing that needs a world.' },
            { lines: '40-51', text: 'Runtime wiring: ignore the shooter (now known), listen for hits.' },
            { lines: '53-70', text: 'The server turns a hit into damage through the engine pipeline, then removes the projectile everywhere.' },
          ],
        },
        {
          type: 'p',
          text: 'Step back and look at what the three capstones add up to: a character fires a server-validated, replicated projectile; it applies point damage through the engine\'s pipeline; a health component clamps, replicates and broadcasts the change; a death handler ragdolls the enemy; and a pickup heals the player through the same component. None of these classes knows the others\' concrete types. That is what well-factored Unreal C++ looks like.',
        },
      ],
    },
    {
      kind: 'mcq',
      prompt: 'After a long play session, the World Outliner shows thousands of projectiles that missed and are still flying. `InitialLifeSpan = 5.f` is set in the constructor. What is the most likely cause?',
      options: [
        {
          text: '`InitialLifeSpan` only works for physics-simulated actors',
          why: 'Lifespan applies to any actor; it is just a timer that calls `Destroy`.',
        },
        {
          text: 'The projectile\'s `BeginPlay` override does not call `Super::BeginPlay()`',
          correct: true,
          why: '`AActor::BeginPlay` is what turns `InitialLifeSpan` into a destroy timer. Skip it and the lifespan never starts — along with component BeginPlay and the Blueprint BeginPlay event.',
        },
        {
          text: '`MaxSpeed` is too high for the lifespan timer to keep up',
          why: 'Speed and lifespan are unrelated; the lifespan is measured in game time, not distance.',
        },
        {
          text: 'Timers stop working when an actor is moving',
          why: 'Timers run on the world\'s timer manager regardless of what the actor is doing.',
        },
      ],
      explanation:
        'This is the "forgotten `Super::`" bug from the crashes lesson in its natural habitat. The base implementation of `BeginPlay` does real work — including applying `InitialLifeSpan` — so overriding it without calling it silently disables that work. Make `Super::BeginPlay()` the first line, every time.',
    },
  ],
  takeaways: [
    'A projectile is a small blocking collision root plus a `UProjectileMovementComponent`, which sweeps every move so fast shots cannot tunnel.',
    'The projectile flies along its spawn rotation at `InitialSpeed`; tune `MaxSpeed`, gravity scale, bouncing and `bRotationFollowsVelocity` per weapon.',
    'Turn `OnComponentHit` into `ApplyPointDamage`, passing the shot direction, hit result and `GetInstigatorController()` for credit.',
    'Set Owner and Instigator through `FActorSpawnParameters`, and ignore the instigator in `BeginPlay` — it is not set yet in the constructor.',
    'Let designers pick the projectile with `TSubclassOf`, spawn at a validated muzzle socket, and control fire rate with a looping timer.',
    'In multiplayer, clients request shots via a Server RPC; the server validates the rate, spawns a replicated projectile and alone applies damage.',
  ],
  reading: [
    {
      title: 'Multiplayer Programming Quick Start',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/multiplayer-programming-quick-start-for-unreal-engine',
      source: 'unreal-docs',
      note: 'Epic\'s walkthrough of a replicated health system and a server-spawned projectile — a close cousin of these capstones.',
    },
    {
      title: 'Damage in UE4',
      url: 'https://www.unrealengine.com/en-US/blog/damage-in-ue4',
      source: 'article',
      note: 'How ApplyDamage, ApplyPointDamage, damage events and damage types fit together.',
    },
    {
      title: 'Enhanced Input',
      url: 'https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine',
      source: 'unreal-docs',
      note: 'Trigger events such as Started, Triggered and Completed, used here to start and stop firing.',
    },
  ],
};
