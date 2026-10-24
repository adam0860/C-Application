import type { Unit } from '../../types';
import { lesson as cppExceptions } from './cpp-exceptions';
import { lesson as cppExceptionSafety } from './cpp-exception-safety';
import { lesson as cppOptionalVariantExpected } from './cpp-optional-variant-expected';

export const unit: Unit = {
  id: "cpp-u14-errors",
  title: "Error Handling",
  description: "Exceptions, exception safety, and value-based error handling with optional, variant and expected.",
  icon: "🛡️",
  lessons: [cppExceptions, cppExceptionSafety, cppOptionalVariantExpected],
};
