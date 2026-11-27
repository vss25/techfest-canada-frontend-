/* node --test src/redesign/approved/attendeeOrder.test.mjs: the ticket panel's attendee answers → the checkout. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDraft, orderFrom } from "./attendeeOrder.js";

const types = [{ id: "a", name: "Connect" }, { id: "a", name: "Connect" }];
const person = (first, last, email, extra = {}) => ({ first, last, email, company: "", title: "", ...extra });

test("for me: ticket 1 is the booker; company and title go with each attendee", () => {
  const d = { ...emptyDraft(2), people: [person("Ann", "Lee", "ann@x.ca", { company: "Acme" }), person("Bo", "Ng", "bo@x.ca", { title: "CTO" })] };
  const o = orderFrom(d, types);
  assert.equal(o.error, undefined);
  assert.deepEqual(o.booker, { name: "Ann Lee", email: "ann@x.ca" });
  assert.deepEqual(o.attendees[0], { firstName: "Ann", lastName: "Lee", email: "ann@x.ca", ticketTypeId: "a", company: "Acme" });
  assert.deepEqual(o.attendees[1], { firstName: "Bo", lastName: "Ng", email: "bo@x.ca", ticketTypeId: "a", title: "CTO" });
});

test("not for me: the buyer's own details are the booker, and are required", () => {
  const people = [person("Ann", "Lee", "ann@x.ca"), person("Bo", "Ng", "bo@x.ca")];
  assert.equal(orderFrom({ forMe: false, buyer: { first: "", last: "", email: "" }, people }, types).at, "buyer");
  const o = orderFrom({ forMe: false, buyer: { first: "Cy", last: "Ro", email: "cy@x.ca" }, people }, types);
  assert.deepEqual(o.booker, { name: "Cy Ro", email: "cy@x.ca" });
  assert.equal(o.attendees.length, 2);
});

test("a missing attendee is named by ticket number; no draft at all asks for ticket 1", () => {
  const d = { ...emptyDraft(2), people: [person("Ann", "Lee", "ann@x.ca"), person("Bo", "", "bo@x.ca")] };
  assert.equal(orderFrom(d, types).at, 1);
  assert.equal(orderFrom(null, types).at, 0);
});
