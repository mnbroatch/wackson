# Ultra-lightweight JavaScript serializer/deserializer

wackson: kinda like jackson, but wack. Also not very much like jackson.

The goal is to send a complex object through the tubes, preserving custom classes and reference equalities including circular references

You probably shouldn't use this. But if you can get away with it, it is < 100 lines of vanilla JS, so that's something.

Handles:
    - circular references
    - by-reference object deduplication and structure recreation
    - prototype restoration

Does not handle:
    - Array reference deduplication (will anyone need this? would have to add wrappers all over)
    - function serialization (closures would be hell)
    - more obscure data types like Map, Set, Symbol (some could be added fairly easily)
    - side effects in constructors (don't do this anyway please)
    - very old javascript versions
    - And Much More!

If you want it to do something else, you're probably better off just editing the code for your own needs rather than trying to make this package customizable.

Currently only available as the raw ES file because again, you can change the export format yourself; why maintain a build process...

Currently untested, because to test it wouldn't be wack enough

## Usage

If you pass a registry object (map of all relevant constructor names to constructors) to `deserialize`, it will restore the prototypes of serialized objects and `_constructorName` will be deleted. If you do not, they will be plain objects and they will still have a `_constrcutorName` property.

```
import { serialize, deserialize } from 'wackson' // or, you know, just copy and paste the 100 or so lines into your project

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

console.log(serializedStuff)
// output:
//
// {
//   "a": 1,
//   "b": 2,
//   "self": {
//     "_instanceReference": 0.28643731385907323
//   },
//   "blah": {
//     "a": 1,
//     "_instanceReferenceId": 0.769051027807722,
//     "_constructorName": "X"
//   },
//   "bleh": {
//     "_instanceReference": 0.769051027807722
//   },
//   "bluh": {
//     "_instanceReference": 0.769051027807722
//   },
//   "_instanceReferenceId": 0.28643731385907323,
//   "_constructorName": "Y"
// }


console.log(deserialize(serializedStuff))
// output:
//
// {
//   a : 1
//   b : 2
//   blah : {a: 1, _constructorName: 'X'}
//   bleh : {a: 1, _constructorName: 'X'}
//   bluh : {a: 1, _constructorName: 'X'}
//   self : {a: 1, b: 2, self: {...}, blah: {...}, bleh: {...}, bluh: {...}, _constructorName : "Y"}
//   _constructorName : "Y"
// }


console.log(deserialize(serializedStuff, { X, Y }))
// output:
//
// {
//   a : 1
//   b : 2
//   blah : X {a: 1}
//   bleh : X {a: 1}
//   bluh : X {a: 1}
//   self : Y {a: 1, b: 2, self: Y, blah: X, bleh: X, bluh: X }
//   [[Prototype]] : X
//     constructor : class Y
// }
// 

```

License: Steal away! I am not liable yada yada

