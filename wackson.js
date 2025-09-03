export function serialize (state, options) {
  // preliminary scan allows us to tag only duplicate instances
  const duplicatesMap = new Map([...walkCyclical(state).duplicates].map(d => [d, null]))

  // Second pass: replace repeated instances with placeholders, add _constructorName
  return JSON.stringify(state, (_, value) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const duplicateId = duplicatesMap.get(value)
      if (typeof duplicateId === 'number') {
        return { _instanceReference: duplicateId }
      }

      const copy = Array.isArray(value) ? [...value] : { ...value }

      if (duplicateId === null) {
        const id = Math.random()
        duplicatesMap.set(value, id)
        copy._instanceReferenceId = id
      }

      if (value.constructor !== Object && value.constructor !== Array) {
        copy._constructorName = value.constructor.name
      }

      return copy
    }

    return value
  }, options?.space)
}

export function deserialize (serialized, registry) {
  const parsed = JSON.parse(serialized)
  const idMap = new Map()

  // restore prototype, gather repeated instance placeholder meta
  walkCyclical(parsed, (node) => {
    if (node._instanceReferenceId != null) {
      const id = node._instanceReferenceId
      delete node._instanceReferenceId
      idMap.set(id, node)
    }

    if (registry && node._constructorName) {
      const constructor = registry[node._constructorName]
      if (!constructor) {
        throw new Error(`Constructor ${node._constructorName} is not in registry`)
      }
      Object.setPrototypeOf(node, constructor.prototype)
      delete node._constructorName
    }
  })

  // restore repeated instance references
  walkCyclical(parsed, (node, parent, key) => {
    if (node?._instanceReference != null) {
      const ref = idMap.get(node._instanceReference)
      if (!ref) {
        throw new Error(`Unknown _instanceReference: ${node._instanceReference}`)
      }
      parent[key] = ref
    }
  })

  return parsed
}

function walkCyclical (value, visitor, seen = new WeakSet(), parent = null, key = null, duplicates = new Set()) {
  if (typeof value !== 'object' || value === null) return duplicates

  if (seen.has(value)) {
    duplicates.add(value)
    return
  }

  seen.add(value)
  visitor?.(value, parent, key)

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkCyclical(value[i], visitor, seen, value, i, duplicates)
    }
  } else {
    for (const k of Object.keys(value)) {
      walkCyclical(value[k], visitor, seen, value, k, duplicates)
    }
  }

  return { duplicates }
}
