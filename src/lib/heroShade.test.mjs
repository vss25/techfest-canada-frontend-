// The hero shade choices. Run: node --test src/lib/heroShade.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { HERO_SHADES, heroShadeBackground, shadeKey } from "./heroShade.js";

test("default is exactly the look before the setting existed", () => {
  assert.equal(heroShadeBackground("default", "full"), "linear-gradient(90deg, rgba(21,16,53,0.75) 0%, rgba(21,16,53,0.35) 55%, rgba(21,16,53,0) 100%)");
  assert.equal(heroShadeBackground("default", "soon"), "linear-gradient(90deg, rgba(21,16,53,0.85) 0%, rgba(21,16,53,0.45) 60%, rgba(21,16,53,0.15) 100%)");
  assert.equal(heroShadeBackground("default", "phoneFull"), "linear-gradient(0deg, rgba(21,16,53,0.85) 0%, rgba(21,16,53,0.35) 55%, rgba(21,16,53,0.1) 100%)");
  assert.equal(heroShadeBackground("default", "phoneSoon"), "linear-gradient(0deg, rgba(21,16,53,0.9) 0%, rgba(21,16,53,0.4) 60%, rgba(21,16,53,0.15) 100%)");
  assert.equal(heroShadeBackground(undefined), heroShadeBackground("default"));
  assert.equal(heroShadeBackground("purple-ish"), heroShadeBackground("default"));
});

test("light is lighter, strong darker, none clear, brand adds the tint", () => {
  assert.match(heroShadeBackground("light"), /rgba\(21,16,53,0.41\) 0%/);
  assert.match(heroShadeBackground("strong"), /rgba\(21,16,53,0.94\) 0%/);
  assert.match(heroShadeBackground("strong", "soon"), /rgba\(21,16,53,0.95\) 0%/, "capped");
  assert.equal(heroShadeBackground("none"), "transparent");
  assert.match(heroShadeBackground("brand"), /^radial-gradient\(.*214,48,140.*linear-gradient\(90deg, rgba\(21,16,53,0.75\)/);
});

test("the keys the admin offers are the ones the backend accepts", () => {
  assert.deepEqual(HERO_SHADES.map((s) => s.key), ["default", "light", "strong", "brand", "none"]);
  assert.equal(shadeKey("none"), "none");
  assert.equal(shadeKey(""), "default");
});
