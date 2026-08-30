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
    await page.getByRole("button", { name: "Select First image" }).click();
    await page.getByRole("button", { name: "Increase First image size" }).click();
    await expect(page.getByLabel("Scale").first()).toHaveValue("105");
    const firstImage = page.getByRole("button", { name: "Select First image" });
    const imageBounds = await firstImage.boundingBox();
    if (!imageBounds) throw new Error("First image preview is unavailable.");
    await page.mouse.move(
      imageBounds.x + imageBounds.width / 2,
      imageBounds.y + imageBounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      imageBounds.x + imageBounds.width / 2 + 20,
      imageBounds.y + imageBounds.height / 2 + 20,
    );
    await page.mouse.up();
    await expect
      .poll(async () => Number(await page.locator('input[type="number"]').first().inputValue()))
      .toBeGreaterThan(15);

    const resizeHandle = page.getByRole("button", {
      name: "Resize First image from bottom right",
    });
    await resizeHandle.scrollIntoViewIfNeeded();
    const handleBounds = await resizeHandle.boundingBox();
    if (!handleBounds) throw new Error("First image resize handle is unavailable.");
    expect(
      await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.getAttribute("aria-label"),
        {
          x: handleBounds.x + handleBounds.width / 2,
          y: handleBounds.y + handleBounds.height / 2,
        },
      ),
    ).toBe("Resize First image from bottom right");
    await expect(resizeHandle).toBeVisible();
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
    await page.getByRole("button", { name: "Rotate right 90 degrees" }).first().click();
    await expect(page.locator('input[type="number"]').nth(3)).toHaveValue("90");
    await expect
      .poll(async () => {
        const bounds = await firstImage.boundingBox();
        return bounds ? bounds.width > bounds.height : false;
      })
      .toBe(true);
    await page.getByRole("button", { name: "Collapse First image" }).click();
    await expect(
      page.getByRole("button", { name: "Expand First image" }),
    ).toHaveAttribute("aria-expanded", "false");
    await page.screenshot({
      path: "test-results/supplied-id-images-edited.png",
      fullPage: true,
    });

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const downloadedPdf = await download;
    expect(downloadedPdf.suggestedFilename()).toBe("print-both-sides.pdf");
    await downloadedPdf.saveAs("test-results/print-both-sides.pdf");
  });
}
