export function serialize (state, options) {
  const deduplicateInstances = options?.deduplicateInstances ?? true
  
  // Scan for duplicates and circular refs
  const { duplicates, circularRefs } = walkCyclical(state)
  
  // Only track what we need based on options
  const instancesToTrack = deduplicateInstances ? [...duplicates] : [...circularRefs]
  const instancesMap = new Map(instancesToTrack.map(d => [d, null]))
  
  // Second pass: replace instances with placeholders, add _constructorName
  return JSON.stringify(state, (_, value) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const instanceId = instancesMap.get(value)
      
      if (typeof instanceId === 'number') {
        return { _instanceReference: instanceId }
      }
      
      const copy = { ...value }
      
      if (instanceId === null) {
        const id = instancesToTrack.indexOf(value)
        instancesMap.set(value, id)
        copy._instanceReferenceId = id
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
      case 'Wacksonan':
      return NaN
      case 'Wacksondefined':
      return undefined
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

function walkCyclical (value, visitor, seen = new WeakSet(), parent = null, key = null, path = new Set(), duplicates = new Set(), circularRefs = new Set()) {
  if (typeof value !== 'object' || value === null) return { duplicates, circularRefs }
  
  if (seen.has(value)) {
    duplicates.add(value)
    // If it's in the current path, it's circular
    if (path.has(value)) {
      circularRefs.add(value)
    }
    return { duplicates, circularRefs }
  }
  
  seen.add(value)
  path.add(value)
  visitor?.(value, parent, key)
  
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkCyclical(value[i], visitor, seen, value, i, path, duplicates, circularRefs)
    }
  } else {
    for (const k of Object.keys(value)) {
      walkCyclical(value[k], visitor, seen, value, k, path, duplicates, circularRefs)
    }
  }
  
  path.delete(value)
  return { duplicates, circularRefs }
}

