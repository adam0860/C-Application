import type { Unit } from '../../types';
import { lesson as cppEnums } from './cpp-enums';
import { lesson as cppStructuredBindingsTuples } from './cpp-structured-bindings-tuples';
import { lesson as cppConstexprCompileTime } from './cpp-constexpr-compile-time';
import { lesson as cppNamespacesTypeAliases } from './cpp-namespaces-type-aliases';

export const unit: Unit = {
  id: "cpp-u15-modern",
  title: "The Modern C++ Toolbox",
  description: "enum class, tuples and structured bindings, compile-time programming, namespaces and aliases.",
  icon: "✨",
  lessons: [cppEnums, cppStructuredBindingsTuples, cppConstexprCompileTime, cppNamespacesTypeAliases],
};
