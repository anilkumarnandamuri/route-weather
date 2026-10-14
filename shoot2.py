import asyncio,datetime
from playwright.async_api import async_playwright
U="http://localhost:47331/"
t=(datetime.datetime.now()+datetime.timedelta(days=1)).strftime("%Y-%m-%dT09:00")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for w,h in [(390,844),(1280,800)]:
      ctx=await b.new_context(viewport={"width":w,"height":h},device_scale_factor=2,locale="en-US",timezone_id="America/Los_Angeles")
      pg=await ctx.new_page();errs=[]
      pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None);pg.on("pageerror",lambda e:errs.append(str(e)))
      await pg.goto(U);await pg.wait_for_timeout(1200)
      await pg.screenshot(path=f"shots/time-now-form-{w}.png")
      await pg.fill("#from","San Jose, CA");await pg.fill("#to","Los Angeles, CA")
      await pg.click("[data-tm=depart]");await pg.click(".day[data-d='1']");await pg.wait_for_timeout(600)
      await pg.screenshot(path=f"shots/time-depart-form-{w}.png")
      await pg.click("[data-tm=arrive]");await pg.click("[data-step='15']");await pg.wait_for_timeout(600)
      await pg.screenshot(path=f"shots/time-arrive-form-{w}.png")
      await pg.click("#go");await pg.wait_for_selector(".card",timeout=60000);await pg.wait_for_timeout(2500)
      print(w,"arrive url",pg.url,"leave:",await pg.locator(".leave").inner_text())
      await pg.screenshot(path=f"shots/time-arrive-result-{w}.png")
      for mode in ["now","depart","arrive"]:
        q=f"?from=Dallas%2C%20TX&to=Chicago%2C%20IL"+("" if mode=="now" else f"&mode={mode}&t={t}")
        await pg.goto(U+q);await pg.wait_for_selector(".card",timeout=60000);await pg.wait_for_timeout(2500)
        s=await pg.locator("#summary").inner_text()
        print(w,mode,s.replace("\n"," | "))
        await pg.screenshot(path=f"shots/time-{mode}-result-{w}.png")
      print(w,"errors",errs);await ctx.close()
    await b.close()
asyncio.run(main())
