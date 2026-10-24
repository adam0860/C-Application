import type { Unit } from '../../types';
import { lesson as cppInheritance } from './cpp-inheritance';
import { lesson as cppVirtualFunctions } from './cpp-virtual-functions';
import { lesson as cppVtables } from './cpp-vtables';
import { lesson as cppAbstractInterfaces } from './cpp-abstract-interfaces';

export const unit: Unit = {
  id: "cpp-u10-inheritance",
  title: "Inheritance and Polymorphism",
  description: "Base and derived classes, virtual functions, vtables and abstract interfaces.",
  icon: "🧬",
  lessons: [cppInheritance, cppVirtualFunctions, cppVtables, cppAbstractInterfaces],
};
