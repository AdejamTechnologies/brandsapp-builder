import { createDefaultRegistry, type PropSchema } from "@brandsapp/builder-core"

export const registry = createDefaultRegistry()

export interface ModuleInfo {
  name: string
  category: string
  schema: PropSchema
  defaults: Record<string, unknown>
  canHaveChildren: boolean
}

export function moduleList(): ModuleInfo[] {
  return registry.names().map((name) => {
    const d = registry.get(name)!
    return {
      name,
      category: d.category,
      schema: d.schema,
      defaults: d.defaults,
      canHaveChildren: d.contentModel.children !== "none",
    }
  })
}

export function moduleInfo(name: string): ModuleInfo | undefined {
  const d = registry.get(name)
  if (!d) return undefined
  return {
    name,
    category: d.category,
    schema: d.schema,
    defaults: d.defaults,
    canHaveChildren: d.contentModel.children !== "none",
  }
}
