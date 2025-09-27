// wack tests
import { serialize, deserialize } from './wackson.js'

class X {
    constructor () {
        this.a = 1
    }
}

class Y extends X {
    constructor () {
        super()
        this.b = 2
    }
}

const thing = new X()
const stuff = new Y()

stuff.self = stuff
stuff.blah = thing
stuff.bleh = thing
stuff.bluh = thing

const serializedStuff = serialize(stuff)

assert(typeof serializedStuff === 'string')

const deserializedStuff = deserialize(serializedStuff)

assert(deserializedStuff._constructorName === 'Y')
assert(deserializedStuff.a === 1)
assert(deserializedStuff.b === 2)
assert(deserializedStuff.self === deserializedStuff)
assert(deserializedStuff.blah._constructorName === 'X')
assert(deserializedStuff.blah === deserializedStuff.bleh)

const deserializedClassStuff = deserialize(serializedStuff, { X, Y })

assert(deserializedClassStuff._constructorName === undefined)
assert(deserializedClassStuff.self instanceof Y)
assert(deserializedClassStuff.blah instanceof X)

const weirdStuff = {
  a: undefined,
  b: null,
  c: NaN,
  d: Infinity,
  e: -Infinity,
  f: -0,
}

const deserializedWeirdStuff = deserialize(serialize(weirdStuff))

assert(deserializedWeirdStuff.a === undefined)
assert(deserializedWeirdStuff.b === null)
assert(Number.isNaN(deserializedWeirdStuff.c))
assert(deserializedWeirdStuff.d === Infinity)
assert(deserializedWeirdStuff.e === -Infinity)
assert(Object.is(deserializedWeirdStuff.f, -0))

function assert (val) {
  if (!val) {
    throw new Error('assertion failed')
  }
}

console.log("everything's fine")
