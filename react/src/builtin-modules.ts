import type { RakunModuleComponent } from './registry'
import { StructuredData } from './StructuredData'

export const getRakunBuiltinModuleComponent = (
  name: string,
): RakunModuleComponent | null => (name === 'StructuredData' ? StructuredData : null)
