import test from "node:test";
import assert from "node:assert/strict";
import {generateVariantCombinations,variantKey,resolveProductVariant,normalizeVariants} from "../lib/product-variants.ts";

test("generates all size and colour combinations",()=>{
  const combos=generateVariantCombinations([{name:"Size",values:["S","M"]},{name:"Color",values:["Black","White"]}]);
  assert.equal(combos.length,4);
  assert.deepEqual(combos[0],{Size:"S",Color:"Black"});
  assert.deepEqual(combos[3],{Size:"M",Color:"White"});
});

test("caps generated combinations to protect admin UI",()=>{
  const combos=generateVariantCombinations([{name:"Size",values:Array.from({length:30},(_,i)=>"S"+i)},{name:"Color",values:Array.from({length:30},(_,i)=>"C"+i)}]);
  assert.equal(combos.length,200);
});

test("variant keys do not depend on option property order",()=>{
  assert.equal(variantKey({Size:"M",Color:"Black"}),variantKey({Color:"Black",Size:"M"}));
});

test("resolves selected variant and keeps its own stock and price",()=>{
  const variants=normalizeVariants([{options:{Size:"M",Color:"Black"},price:850,salePrice:799,stock:4}]);
  const found=resolveProductVariant(variants,{Color:"Black",Size:"M"});
  assert.equal(found.price,850);
  assert.equal(found.salePrice,799);
  assert.equal(found.stock,4);
  assert.equal(resolveProductVariant(variants,{Size:"L",Color:"Black"}),null);
});
