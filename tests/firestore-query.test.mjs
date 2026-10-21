import test from "node:test";
import assert from "node:assert/strict";
import {equalityFilters} from "../lib/firestore.ts";

test("plain equality filters use Firestore queries", () => {
  assert.deepEqual(equalityFilters({status:"PENDING",published:true}), [{field:"status",value:"PENDING"},{field:"published",value:true}]);
});
test("anything else falls back to the in-memory matcher", () => {
  assert.equal(equalityFilters(undefined), null);
  assert.equal(equalityFilters({}), null);
  assert.equal(equalityFilters({id:"x"}), null);
  assert.equal(equalityFilters({OR:[{a:1}]}), null);
  assert.equal(equalityFilters({a:{contains:"x"}}), null);
  assert.equal(equalityFilters({"a.b":1}), null);
  assert.equal(equalityFilters({a:null}), null);
  assert.equal(equalityFilters({a:new Date()}), null);
});
