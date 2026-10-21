import test from "node:test";
import assert from "node:assert/strict";
import {firestoreStructuredQuery} from "../lib/firestore.ts";

test("plain equality filters use Firestore structured queries", () => {
  const query = firestoreStructuredQuery("product", {status:"PENDING",published:true}, undefined, undefined, undefined);
  assert.deepEqual(query.where, {
    compositeFilter: {
      op: "AND",
      filters: [
        {fieldFilter:{field:{fieldPath:"status"},op:"EQUAL",value:{stringValue:"PENDING"}}},
        {fieldFilter:{field:{fieldPath:"published"},op:"EQUAL",value:{booleanValue:true}}}
      ]
    }
  });
});

test("unsupported filters fall back to the in-memory matcher", () => {
  assert.equal(firestoreStructuredQuery("product", undefined, undefined, undefined, undefined), null);
  assert.equal(firestoreStructuredQuery("product", {}, undefined, undefined, undefined), null);
  assert.equal(firestoreStructuredQuery("product", {id:"x"}, undefined, undefined, undefined), null);
  assert.equal(firestoreStructuredQuery("product", {OR:[{a:1}]}, undefined, undefined, undefined), null);
  assert.equal(firestoreStructuredQuery("product", {a:{contains:"x"}}, undefined, undefined, undefined), null);
  assert.equal(firestoreStructuredQuery("product", {"a.b":1}, undefined, undefined, undefined), null);
  assert.equal(firestoreStructuredQuery("product", {a:null}, undefined, undefined, undefined), null);
});

test("supported range, in, ordering and limit filters are represented in the server query", () => {
  const query = firestoreStructuredQuery("product", {stock:{gt:0}, categoryId:{in:["a","b"]}}, [{stock:"desc"}], 10, 0);
  assert.ok(query);
  assert.equal(query.limit, 10);
  assert.equal(query.orderBy[0].field.fieldPath, "stock");
  assert.equal(query.where.compositeFilter.filters.length, 2);
});
