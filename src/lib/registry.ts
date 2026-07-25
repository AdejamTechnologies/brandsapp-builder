import { createDefaultRegistry, type PropSchema } from "@brandsapp/builder-core"

export const registry = createDefaultRegistry()

export interface ModuleInfo {
  name: string
  category: string
  schema: PropSchema
  defaults: Record<string, unknown>
  defaultClasses?: string
  canHaveChildren: boolean
}

const toInfo = (name: string): ModuleInfo => {
  const d = registry.get(name)!
  return {
    name,
    category: d.category,
    schema: d.schema,
    defaults: d.defaults,
    defaultClasses: d.defaultClasses,
    canHaveChildren: d.contentModel.children !== "none",
  }
}

export function moduleList(): ModuleInfo[] {
  return registry.names().map(toInfo)
}

export function moduleInfo(name: string): ModuleInfo | undefined {
  return registry.get(name) ? toInfo(name) : undefined
}
