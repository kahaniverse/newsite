// Throwaway diagnostic: drive the demo-login flow in the real browser and report
// where it lands. Delete after debugging.
import { selectDriver } from "@mydemo/core";
import { config } from "./config.ts";

async function main() {
const driver = selectDriver(config);
const s = await driver.start(config);
try {
  await s.helpers.goto("/demo-login");
  await s.helpers.waitFor("demo-login");
  console.log("ON demo-login url =", await s.browser.getUrl());
  await s.helpers.click("demo-login");
  await s.browser.pause(4000);
  console.log("AFTER click url   =", await s.browser.getUrl());
  console.log("title             =", await s.browser.getTitle());
  const src = await s.browser.getPageSource();
  const dims = await s.browser.execute(() => ({
    innerWidth: window.innerWidth,
    dpr: window.devicePixelRatio,
    narrowVisible: !!document.querySelector(".block.md\\:hidden"),
  }));
  console.log("viewport          :", JSON.stringify(dims));
  for (const id of ["universe-hero", "story-card", "page-card"]) {
    const el = await s.browser.$(`[data-testid="${id}"]`);
    const ex = await el.isExisting();
    console.log(`  ${id}: existing=${ex} displayed=${ex ? await el.isDisplayed() : "n/a"} size=${ex ? JSON.stringify(await el.getSize()) : "n/a"}`);
  }
  const hero = await s.browser.$('[data-testid="universe-hero"]');
  console.log("hero isExisting   :", await hero.isExisting());
  console.log("hero isDisplayed  :", await hero.isExisting() ? await hero.isDisplayed() : "n/a");
  try { console.log("hero size         :", JSON.stringify(await hero.getSize())); } catch (e) { console.log("size err", String(e)); }
  console.log("has universe-hero :", src.includes("universe-hero"));
  console.log("has landing-carousel:", src.includes("landing-carousel"));
  console.log("mentions /login   :", src.includes("/login") || src.toLowerCase().includes("sign in"));
  const cookies = await s.browser.getCookies();
  console.log("cookies           :", cookies.map((c) => c.name).join(", "));
  console.log("snippet           :", src.replace(/\s+/g, " ").slice(0, 300));
} finally {
  await s.teardown();
}
}
main().catch((e) => { console.error(e); process.exit(1); });
