import type { Unit } from '../../types';
import { lesson as archBitsBytes } from './arch-bits-bytes';
import { lesson as archIntegers } from './arch-integers';
import { lesson as archFloatingPoint } from './arch-floating-point';

export const unit: Unit = {
  id: "arch-u01-data",
  title: "Data Representation",
  description: "Bits, bytes, hex and endianness; integers and two's complement with overflow in C++; and IEEE 754 floating point with its traps.",
  icon: "🔢",
  lessons: [archBitsBytes, archIntegers, archFloatingPoint],
};
