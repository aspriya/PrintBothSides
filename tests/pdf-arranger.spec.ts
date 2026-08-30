import { expect, test } from "@playwright/test";

const frontImage = process.env.PRINT_BOTH_SIDES_FRONT;
const backImage = process.env.PRINT_BOTH_SIDES_BACK;

if (!frontImage || !backImage) {
  test.skip("requires local front and back image paths", () => {});
} else {
  test("arranges the supplied ID images and downloads a PDF", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Choose image 1").setInputFiles(frontImage);
    await page.getByLabel("Choose image 2").setInputFiles(backImage);

    await expect(page.getByText("Ashan Priyadarshana - ID Front.jpg")).toBeVisible();
    await expect(page.getByText("Ashan.Priyadarshana - ID Back.jpg")).toBeVisible();
    await page.screenshot({
      path: "test-results/supplied-id-images-original.png",
      fullPage: true,
    });

    const firstScale = page.getByLabel("Scale").first();
    const firstTilt = page.getByLabel("Horizontal tilt").first();
    const firstCropTop = page.getByLabel("Top 0%").first();
    await firstScale.fill("85");
    await firstTilt.fill("12");
    await firstCropTop.fill("8");
    await page.getByRole("button", { name: "Mirror horizontal" }).first().click();

    await expect(firstScale).toHaveValue("85");
    await expect(firstTilt).toHaveValue("12");
    await expect(page.getByLabel("Top 8%").first()).toHaveValue("8");
    await expect(
      page.getByRole("button", { name: "Mirror horizontal" }).first(),
    ).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({
      path: "test-results/supplied-id-images-edited.png",
      fullPage: true,
    });

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    expect((await download).suggestedFilename()).toBe("print-both-sides.pdf");
  });
}
