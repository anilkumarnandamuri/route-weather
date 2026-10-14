import asyncio,sys
from playwright.async_api import async_playwright
R=[("sj-la","San Jose, CA","Los Angeles, CA"),("dal-chi","Dallas, TX","Chicago, IL")]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for name,f,t in R:
      for w,h in [(390,844),(1280,800)]:
        for theme in (["dark","light"] if name=="sj-la" else ["dark"]):
          ctx=await b.new_context(viewport={"width":w,"height":h},device_scale_factor=2,locale="en-US",timezone_id="America/Los_Angeles")
          await ctx.add_init_script(f"localStorage.setItem('rw-theme','{theme}')")
          pg=await ctx.new_page();errs=[]
          pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None);pg.on("pageerror",lambda e:errs.append(str(e)))
          from urllib.parse import quote
          await pg.goto(f"http://localhost:55515/?from={quote(f)}&to={quote(t)}")
          await pg.wait_for_selector(".card",timeout=60000);await pg.wait_for_timeout(3500)
          out=f"shots/{name}-{w}-{theme}.png";await pg.screenshot(path=out)
          print(out,"cards",await pg.locator(".card").count(),"segs",await pg.locator(".seg-line").count(),"errors",errs)
          if name=="sj-la" and w==390 and theme=="dark":
            await pg.click("#radarBtn");await pg.wait_for_timeout(3000);await pg.screenshot(path="shots/sj-la-390-radar.png")
            await pg.click("[data-mode=temp]");await pg.wait_for_timeout(800);await pg.screenshot(path="shots/sj-la-390-temp.png");print("extra errs",errs)
          await ctx.close()
    ctx=await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2);pg=await ctx.new_page();await pg.goto("http://localhost:55515/");await pg.wait_for_timeout(2000);await pg.screenshot(path="shots/home-390.png")
    await b.close()
asyncio.run(main())
