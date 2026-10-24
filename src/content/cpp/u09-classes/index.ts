import type { Unit } from '../../types';
import { lesson as cppStructsClasses } from './cpp-structs-classes';
import { lesson as cppConstructors } from './cpp-constructors';
import { lesson as cppDestructorsThis } from './cpp-destructors-this';
import { lesson as cppConstStaticMembers } from './cpp-const-static-members';
import { lesson as cppOperatorOverloading } from './cpp-operator-overloading';

export const unit: Unit = {
  id: "cpp-u09-classes",
  title: "Classes and Objects",
  description: "Designing your own types: members, constructors, destructors, const correctness and operators.",
  icon: "🏗️",
  lessons: [cppStructsClasses, cppConstructors, cppDestructorsThis, cppConstStaticMembers, cppOperatorOverloading],
};
