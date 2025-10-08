export function serialize (state, options) {
  // preliminary scan allows us to tag only duplicate instances
  const { duplicates, circular } = walkCyclical(state)
  const duplicatesArr = [...duplicates]
  const duplicatesMap = new Map(duplicatesArr.map(d => [d, null]))
  const deduplicateInstances = options?.deduplicateInstances !== false
  
  // Second pass: replace repeated instances with placeholders, add _constructorName
  return JSON.stringify(state, (_, value) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const duplicateId = duplicatesMap.get(value)
      const isCircular = circular.has(value)
      
      // Always use placeholder for circular references
      if (typeof duplicateId === 'number' && isCircular) {
        return { _instanceReference: duplicateId }
      }
      
      if (deduplicateInstances && typeof duplicateId === 'number') {
        return { _instanceReference: duplicateId }
      }
      
      const copy = { ...value }
      
      if (duplicateId === null) {
        const id = duplicatesArr.indexOf(value)
        duplicatesMap.set(value, id)
        copy._instanceReferenceId = id
      } else if (!deduplicateInstances && typeof duplicateId === 'number') {
        // Keep the data but mark it as a reference (only for non-circular)
        copy._instanceReference = duplicateId
      }
      
      if (value.constructor && value.constructor !== Object && value.constructor !== Array) {
        copy._constructorName = value.constructor.name
      }
      return copy
    } else if (Number.isNaN(value)) {
      return 'Wacksonan'
    } else if (Object.is(value, -0)) {
      return 'Wacksonegativezero'
    } else {
      switch (value) {
        case Infinity:
        return 'Wacksonfinity'
        case -Infinity:
        return 'Wacksonegativinfinity'
        case undefined:
        return 'Wacksondefined'
        default:
        return value
      }
    }
  }, options?.space)
}

export function deserialize (serialized, registry) {
  const parsed = JSON.parse(serialized, (_, value) => {
    switch (value) {
      case 'Wacksonfinity':
      return Infinity
      case 'Wacksonegativinfinity':
      return -Infinity
      case 'Wacksondefined':
      return undefined
      case 'Wacksonan':
      return NaN
      case 'Wacksonegativezero':
      return -0
      default:
      return value
    }
  })
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

function walkCyclical (value, visitor, seen = new WeakSet(), parent = null, key = null, duplicates = new Set(), circular = new Set(), path = new WeakSet()) {
  if (typeof value !== 'object' || value === null) return { duplicates, circular }
  if (seen.has(value)) {
    duplicates.add(value)
    // If we've seen it in our current path, it's circular
    if (path.has(value)) {
      circular.add(value)
    }
    return
  }
  seen.add(value)
  path.add(value)
  visitor?.(value, parent, key)
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkCyclical(value[i], visitor, seen, value, i, duplicates, circular, path)
    }
  } else {
    for (const k of Object.keys(value)) {
      walkCyclical(value[k], visitor, seen, value, k, duplicates, circular, path)
    }
  }
  path.delete(value)
  return { duplicates, circular }
}
