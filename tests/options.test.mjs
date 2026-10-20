import test from "node:test";
import assert from "node:assert/strict";
import {parseOptionsText,resolveSelection,optionsToText} from "../lib/options.ts";

test("parses option lines", () => {
  const o = parseOptionsText("Size: S, M, L\n\nColor: Red, Red, Blue\nbad line");
  assert.deepEqual(o, [{name:"Size",values:["S","M","L"]},{name:"Color",values:["Red","Blue"]}]);
  assert.equal(optionsToText(o), "Size: S, M, L\nColor: Red, Blue");
});
test("requires a valid value for every option", () => {
  const o = parseOptionsText("Size: S, M");
  assert.equal(resolveSelection(o, {Size:"M"}).label, "Size: M");
  assert.equal(resolveSelection(o, {Size:"XL"}).ok, false);
  assert.equal(resolveSelection(o, undefined).ok, false);
  assert.deepEqual(resolveSelection([], undefined), {ok:true,label:""});
});
