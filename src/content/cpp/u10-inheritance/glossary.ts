import type { GlossaryEntry } from '../../types';

// Glossary terms introduced by this unit that are NOT in scripts/glossary-master.ts.
export const glossary: GlossaryEntry[] = [
  {
    id: 'is-a-relationship',
    term: 'Is-a Relationship',
    aliases: ['is-a', 'has-a', 'composition'],
    course: 'cpp',
    category: 'OOP',
    short: 'The test for public inheritance: `D` may derive from `B` only if every `D` can be used wherever a `B` is expected. If `D` merely *has* a `B`, make it a member instead (composition).',
    long: 'Public inheritance promises substitutability: code written for the base must keep working when handed a derived object (the Liskov Substitution Principle). "A sword is a weapon" passes; "a player is an inventory" fails — a player *has* an inventory, which is modelled as a data member. This has-a style is called **composition** and is usually the more flexible choice; Unreal leans on it heavily through components.',
    example: `class Sword : public Weapon {};   // is-a
class Player : public Entity {
    Inventory inventory_;            // has-a
};`,
    see: ['inheritance', 'base-class', 'derived-class'],
  },
  {
    id: 'name-hiding',
    term: 'Name Hiding',
    course: 'cpp',
    category: 'OOP',
    short: 'When a derived class declares a member with the same name as a base member, it hides **all** base members of that name, including overloads with different parameters.',
    long: 'Name lookup stops at the first scope that contains the name, and overload resolution only considers what was found there. Bring the base overloads back with `using Base::name;`, or call a specific one with a qualified name such as `Base::name(args)`.',
    example: `struct Entity { void heal(); void heal(int); };
struct Player : Entity {
    using Entity::heal;  // without this, heal() is hidden
    void heal(int amount);
};`,
    see: ['inheritance', 'function-overloading', 'overload-resolution'],
  },
  {
    id: 'static-binding',
    term: 'Static Binding',
    aliases: ['early binding', 'static dispatch'],
    course: 'cpp',
    category: 'OOP',
    short: 'Choosing which function a call runs at **compile time**, from the static (declared) type of the expression. All non-virtual calls are statically bound.',
    long: 'Given `Entity& e = boss; e.describe();`, a non-virtual `describe` is chosen from the type `Entity&` written in the code, so `Entity::describe` runs even though the object is a `Boss`. Static binding allows direct calls and inlining. The alternative, dynamic binding, is enabled with `virtual`.',
    see: ['dynamic-dispatch', 'virtual-function', 'dynamic-type'],
  },
  {
    id: 'dynamic-type',
    term: 'Static Type vs Dynamic Type',
    aliases: ['dynamic type', 'static type', 'runtime type'],
    course: 'cpp',
    category: 'OOP',
    short: 'The **static type** is the type written in the code (`Enemy&`); the **dynamic type** is the type of the object actually there at run time (`Dragon`). Virtual calls follow the dynamic type.',
    example: `Dragon smaug;
Enemy& e = smaug;  // static type: Enemy&
                   // dynamic type: Dragon`,
    see: ['static-binding', 'dynamic-dispatch', 'polymorphism'],
  },
  {
    id: 'vptr',
    term: 'vptr (Virtual Table Pointer)',
    aliases: ['vptr', 'virtual pointer', 'vfptr'],
    course: 'cpp',
    category: 'OOP',
    short: 'A hidden pointer stored inside every object of a class with virtual functions, pointing at that class\'s vtable. It is how a virtual call finds the right function at run time.',
    long: 'The vptr is set by each constructor as the object is built (so during a base constructor it points at the base\'s vtable) and reset by each destructor. It adds one pointer (8 bytes on 64-bit platforms) to the size of every polymorphic object. The C++ standard does not mention vptrs — they are the implementation technique used by GCC, Clang and MSVC.',
    see: ['vtable', 'dynamic-dispatch', 'virtual-function'],
  },
  {
    id: 'devirtualization',
    term: 'Devirtualization',
    course: 'cpp',
    category: 'Performance',
    short: 'A compiler optimization that turns a virtual call into a direct (and inlinable) call when the compiler can prove the object\'s dynamic type.',
    long: 'Typical cases: calling through a local object whose type is known, calling a function marked `final`, or calling on a class marked `final`. Link-time optimization can devirtualize more calls by seeing the whole program.',
    see: ['vtable', 'final', 'inline'],
  },
  {
    id: 'multiple-inheritance',
    term: 'Multiple Inheritance',
    aliases: ['diamond problem'],
    course: 'cpp',
    category: 'OOP',
    short: 'A class deriving from more than one base: `class Barrel : public IDamageable, public IInteractable`. Safe and common for interfaces; tricky for bases that carry state.',
    long: 'Inheriting several stateless interfaces is idiomatic. Inheriting several stateful classes can lead to the *diamond problem*: if both bases derive from a common class, the derived object contains two copies of it unless *virtual inheritance* is used. Unreal allows only one `UObject`-based base plus any number of interfaces.',
    see: ['interface', 'inheritance', 'abstract-class'],
  },
  {
    id: 'rtti',
    term: 'RTTI (Run-Time Type Information)',
    aliases: ['RTTI', 'typeid'],
    course: 'cpp',
    category: 'OOP',
    short: 'Type information the compiler stores for polymorphic classes so that `dynamic_cast` and `typeid` can inspect an object\'s dynamic type at run time.',
    long: 'RTTI is usually reached through the vtable, so it only exists for classes with at least one virtual function. Some projects disable it to save binary size — Unreal Engine modules compile without RTTI by default and use Unreal\'s own reflection-based `Cast<T>()` instead of `dynamic_cast`.',
    see: ['dynamic-cast', 'vtable', 'ue-cast'],
  },
];
