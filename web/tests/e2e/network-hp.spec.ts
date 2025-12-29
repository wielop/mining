import { expect, test } from "@playwright/test";
import { parseFirstNumber, fromHundredths } from "./helpers/parse";
import { fetchNetworkHp } from "./helpers/onchain";

const expectClose = (actual: number, expected: number, tolerance = 0.02) => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
};

test("network HP breakdown matches on-chain", async ({ page, request }) => {
  const res = await request.get("/api/network/hp-breakdown");
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as {
    baseHp?: string;
    rigBuffHp?: string;
    error?: string;
  };
  expect(data.error).toBeUndefined();
  expect(typeof data.baseHp).toBe("string");
  expect(typeof data.rigBuffHp).toBe("string");

  const baseHp = BigInt(data.baseHp ?? "0");
  const rigBuffHp = BigInt(data.rigBuffHp ?? "0");
  const networkHp = await fetchNetworkHp();
  const accountBonus =
    networkHp > baseHp + rigBuffHp ? networkHp - baseHp - rigBuffHp : 0n;

  await page.goto("/e2e");
  await expect(page.getByTestId("network-hp")).toContainText("HP");
  await expect(page.getByTestId("network-base-hp")).not.toHaveText("-");

  const uiNetworkHp = parseFirstNumber(await page.getByTestId("network-hp").innerText());
  const uiBaseHp = parseFirstNumber(await page.getByTestId("network-base-hp").innerText());
  const uiRigBuff = parseFirstNumber(await page.getByTestId("network-rig-buffs").innerText());
  const uiAccountBonus = parseFirstNumber(
    await page.getByTestId("network-account-bonus").innerText()
  );

  expectClose(uiNetworkHp, fromHundredths(networkHp));
  expectClose(uiBaseHp, fromHundredths(baseHp));
  expectClose(uiRigBuff, fromHundredths(rigBuffHp));
  expectClose(uiAccountBonus, fromHundredths(accountBonus));
});
