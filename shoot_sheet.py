import asyncio
from playwright.async_api import async_playwright
U="http://localhost:47331/"
async def st(pg): return await pg.evaluate("({snap:document.querySelector('#panel').dataset.snap,h:getComputedStyle(document.documentElement).getPropertyValue('--sheet-h'),ctrl:document.querySelector('.controls').getBoundingClientRect().bottom,top:document.querySelector('#panel').getBoundingClientRect().top,ov:getComputedStyle(document.querySelector('#scroller')).overflowY})")
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    ctx=await b.new_context(viewport={"width":390,"height":844},device_scale_factor=2,has_touch=True,is_mobile=True,locale="en-US",timezone_id="America/Los_Angeles")
    pg=await ctx.new_page();errs=[];pg.on("pageerror",lambda e:errs.append(str(e)));pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
    await pg.goto(U);await pg.wait_for_timeout(1200);print("init",await st(pg))
    await pg.screenshot(path="shots/sheet-half.png")
    cdp=await ctx.new_cdp_session(pg)
    async def touchdrag(y0,y1,steps,dt):
      await cdp.send("Input.dispatchTouchEvent",{"type":"touchStart","touchPoints":[{"x":195,"y":y0}]})
      for i in range(1,steps+1):
        await cdp.send("Input.dispatchTouchEvent",{"type":"touchMove","touchPoints":[{"x":195,"y":y0+(y1-y0)*i/steps}]});await pg.wait_for_timeout(dt)
      await cdp.send("Input.dispatchTouchEvent",{"type":"touchEnd","touchPoints":[]});await pg.wait_for_timeout(700)
    hy=lambda: pg.evaluate("document.querySelector('#handle').getBoundingClientRect().top+12")
    await touchdrag(await hy(),(await hy())+260,12,16);print("slow drag down",await st(pg))
    await pg.screenshot(path="shots/sheet-peek.png")
    await touchdrag(await hy(),(await hy())-120,4,8);print("flick up",await st(pg))
    await touchdrag(await hy(),(await hy())-500,14,16);print("drag up",await st(pg))
    await pg.screenshot(path="shots/sheet-full.png")
    await pg.mouse.click(195,await hy());await pg.wait_for_timeout(600);print("tap cycle",await st(pg))
    await pg.mouse.click(195,await hy());await pg.wait_for_timeout(600);print("tap cycle",await st(pg))
    # plan route
    await pg.fill("#from","San Jose, CA");await pg.fill("#to","Los Angeles, CA")
    await pg.click("[data-tm=arrive]");await pg.click("#go")
    await pg.wait_for_selector(".card",timeout=60000);await pg.wait_for_timeout(2500)
    print("planned",await st(pg),pg.url)
    print("peek text",(await pg.locator("#peek").inner_text()).replace("\n"," | "))
    await pg.screenshot(path="shots/sheet-route-390.png")
    await touchdrag(await hy(),(await hy())+300,4,8);await pg.wait_for_timeout(600);print("flick down",await st(pg))
    await pg.screenshot(path="shots/sheet-route-peek-390.png")
    await pg.mouse.click(195,await hy());await pg.mouse.click(195,0+await hy()) if False else None
    print("errors",errs);await ctx.close()
    ctx=await b.new_context(viewport={"width":1280,"height":800},device_scale_factor=1,locale="en-US",timezone_id="America/Los_Angeles")
    pg=await ctx.new_page();pg.on("pageerror",lambda e:errs.append(str(e)))
    await pg.goto(U+"?from=Dallas%2C%20TX&to=Chicago%2C%20IL");await pg.wait_for_selector(".card",timeout=60000);await pg.wait_for_timeout(2500)
    await pg.screenshot(path="shots/sheet-desktop.png")
    r=await pg.locator("#resizer").bounding_box();await pg.mouse.move(r["x"]+6,r["y"]+r["height"]/2);await pg.mouse.down();await pg.mouse.move(r["x"]+126,r["y"]+r["height"]/2,steps=8);await pg.mouse.up();await pg.wait_for_timeout(900)
    print("desk w",await pg.evaluate("document.querySelector('#panel').offsetWidth"))
    await pg.screenshot(path="shots/sheet-desktop-resized.png")
    await pg.click("#panelToggle");await pg.wait_for_timeout(900);await pg.screenshot(path="shots/sheet-desktop-collapsed.png")
    print("errors",errs);await b.close()
asyncio.run(main())
