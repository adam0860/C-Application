import type { GlossaryEntry } from '../types';
import { cppGlossary } from './cpp';
import { unrealGlossary } from './unreal';
import { glossary as cpp_u01 } from '../cpp/u01-getting-started/glossary';
import { glossary as cpp_u02 } from '../cpp/u02-variables-types/glossary';
import { glossary as cpp_u03 } from '../cpp/u03-operators/glossary';
import { glossary as cpp_u04 } from '../cpp/u04-strings-io/glossary';
import { glossary as cpp_u05 } from '../cpp/u05-control-flow/glossary';
import { glossary as cpp_u06 } from '../cpp/u06-functions/glossary';
import { glossary as cpp_u07 } from '../cpp/u07-containers/glossary';
import { glossary as cpp_u08 } from '../cpp/u08-pointers/glossary';
import { glossary as cpp_u09 } from '../cpp/u09-classes/glossary';
import { glossary as cpp_u10 } from '../cpp/u10-inheritance/glossary';
import { glossary as cpp_u11 } from '../cpp/u11-modern-memory/glossary';
import { glossary as cpp_u12 } from '../cpp/u12-templates/glossary';
import { glossary as cpp_u13 } from '../cpp/u13-stl/glossary';
import { glossary as cpp_u14 } from '../cpp/u14-errors/glossary';
import { glossary as cpp_u15 } from '../cpp/u15-modern/glossary';
import { glossary as cpp_u16 } from '../cpp/u16-building/glossary';
import { glossary as cpp_u17 } from '../cpp/u17-concurrency/glossary';
import { glossary as unreal_u01 } from '../unreal/u01-intro/glossary';
import { glossary as unreal_u02 } from '../unreal/u02-core-types/glossary';
import { glossary as unreal_u03 } from '../unreal/u03-uobject/glossary';
import { glossary as unreal_u04 } from '../unreal/u04-actors/glossary';
import { glossary as unreal_u05 } from '../unreal/u05-exposure/glossary';
import { glossary as unreal_u06 } from '../unreal/u06-gameplay-framework/glossary';
import { glossary as unreal_u07 } from '../unreal/u07-input/glossary';
import { glossary as unreal_u08 } from '../unreal/u08-delegates/glossary';
import { glossary as unreal_u09 } from '../unreal/u09-collision/glossary';
import { glossary as unreal_u10 } from '../unreal/u10-time/glossary';
import { glossary as unreal_u11 } from '../unreal/u11-memory/glossary';
import { glossary as unreal_u12 } from '../unreal/u12-communication/glossary';
import { glossary as unreal_u13 } from '../unreal/u13-data/glossary';
import { glossary as unreal_u14 } from '../unreal/u14-networking/glossary';
import { glossary as unreal_u15 } from '../unreal/u15-debugging/glossary';
import { glossary as unreal_u16 } from '../unreal/u16-capstone/glossary';
import { glossary as sfml_u01 } from '../sfml/u01-setup/glossary';
import { glossary as sfml_u02 } from '../sfml/u02-input-time/glossary';
import { glossary as sfml_u03 } from '../sfml/u03-drawing/glossary';
import { glossary as sfml_u04 } from '../sfml/u04-animation-audio/glossary';
import { glossary as sfml_u05 } from '../sfml/u05-gameplay/glossary';
import { glossary as sfml_u06 } from '../sfml/u06-projects/glossary';
import { glossary as arch_u01 } from '../arch/u01-data/glossary';
import { glossary as arch_u02 } from '../arch/u02-logic/glossary';
import { glossary as arch_u03 } from '../arch/u03-isa/glossary';
import { glossary as arch_u04 } from '../arch/u04-cpp-to-machine/glossary';
import { glossary as arch_u05 } from '../arch/u05-processor/glossary';
import { glossary as arch_u06 } from '../arch/u06-modern-cpus/glossary';
import { glossary as arch_u07 } from '../arch/u07-memory-hierarchy/glossary';
import { glossary as arch_u08 } from '../arch/u08-multicore/glossary';
import { glossary as arch_u09 } from '../arch/u09-performance/glossary';
import { glossary as arch_u10 } from '../arch/u10-gpu-io/glossary';
import { glossary as os_u01 } from '../os/u01-intro/glossary';
import { glossary as os_u02 } from '../os/u02-processes/glossary';
import { glossary as os_u03 } from '../os/u03-scheduling/glossary';
import { glossary as os_u04 } from '../os/u04-memory/glossary';
import { glossary as os_u05 } from '../os/u05-threads/glossary';
import { glossary as os_u06 } from '../os/u06-concurrency/glossary';
import { glossary as os_u07 } from '../os/u07-storage/glossary';
import { glossary as os_u08 } from '../os/u08-ipc-networking/glossary';
import { glossary as os_u09 } from '../os/u09-security-virtualization/glossary';

export const glossary: GlossaryEntry[] = [
  ...cppGlossary,
  ...unrealGlossary,
  ...cpp_u01,
  ...cpp_u02,
  ...cpp_u03,
  ...cpp_u04,
  ...cpp_u05,
  ...cpp_u06,
  ...cpp_u07,
  ...cpp_u08,
  ...cpp_u09,
  ...cpp_u10,
  ...cpp_u11,
  ...cpp_u12,
  ...cpp_u13,
  ...cpp_u14,
  ...cpp_u15,
  ...cpp_u16,
  ...cpp_u17,
  ...unreal_u01,
  ...unreal_u02,
  ...unreal_u03,
  ...unreal_u04,
  ...unreal_u05,
  ...unreal_u06,
  ...unreal_u07,
  ...unreal_u08,
  ...unreal_u09,
  ...unreal_u10,
  ...unreal_u11,
  ...unreal_u12,
  ...unreal_u13,
  ...unreal_u14,
  ...unreal_u15,
  ...unreal_u16,
  ...sfml_u01,
  ...sfml_u02,
  ...sfml_u03,
  ...sfml_u04,
  ...sfml_u05,
  ...sfml_u06,
  ...arch_u01,
  ...arch_u02,
  ...arch_u03,
  ...arch_u04,
  ...arch_u05,
  ...arch_u06,
  ...arch_u07,
  ...arch_u08,
  ...arch_u09,
  ...arch_u10,
  ...os_u01,
  ...os_u02,
  ...os_u03,
  ...os_u04,
  ...os_u05,
  ...os_u06,
  ...os_u07,
  ...os_u08,
  ...os_u09,
];
