import json
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import pytest
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
LEAFLET_JS_PATH = REPO_ROOT / "tests" / "support" / "leaflet.js"
LEAFLET_CSS_PATH = REPO_ROOT / "tests" / "support" / "leaflet.css"

TINY_PNG = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02"
    b"\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
)


def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def server():
    port = get_free_port()
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        cwd=str(REPO_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    start = time.time()
    while time.time() - start < 10:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.05)
    else:
        proc.kill()
        raise RuntimeError("Local test server failed to start")

    yield f"http://127.0.0.1:{port}"

    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()


def handle_offline_route(route, request):
    url = request.url
    parsed = urlparse(url)

    # Let local server requests through
    if parsed.hostname in ("127.0.0.1", "localhost"):
        route.continue_()
        return

    # Intercept and fulfill all non-local requests offline
    if "leaflet.js" in url:
        body = LEAFLET_JS_PATH.read_bytes() if LEAFLET_JS_PATH.exists() else b""
        route.fulfill(status=200, content_type="application/javascript", body=body)
    elif "leaflet.css" in url:
        body = LEAFLET_CSS_PATH.read_bytes() if LEAFLET_CSS_PATH.exists() else b""
        route.fulfill(status=200, content_type="text/css", body=body)
    elif "router.project-osrm.org" in url:
        mock_route = {
            "code": "Ok",
            "routes": [
                {
                    "duration": 7200,
                    "distance": 200000,
                    "geometry": {
                        "coordinates": [
                            [-122.0, 37.0],
                            [-121.5, 36.6],
                            [-121.0, 36.2],
                            [-120.5, 35.8],
                            [-119.0, 35.5],
                        ]
                    },
                    "legs": [
                        {
                            "annotation": {"duration": [1800, 1800, 1800, 1800]},
                            "steps": [{"distance": 200000, "name": "Highway 101", "ref": "US 101"}],
                        }
                    ],
                }
            ],
        }
        route.fulfill(status=200, content_type="application/json", body=json.dumps(mock_route))
    elif "api.open-meteo.com/v1/forecast" in url:
        qs = parse_qs(parsed.query)
        coords_count = len(qs.get("latitude", [""])[0].split(","))
        now_hour = int(time.time() // 3600 * 3600)
        times = [now_hour - 7200 + i * 3600 for i in range(48)]
        sample_forecast = {
            "timezone": "America/Los_Angeles",
            "hourly": {
                "time": times,
                "temperature_2m": [15 + (i % 6) for i in range(len(times))],
                "precipitation_probability": [10 * (i % 4) for i in range(len(times))],
                "precipitation": [0.0] * len(times),
                "weather_code": [0 if (i % 3 == 0) else 1 for i in range(len(times))],
                "wind_speed_10m": [12] * len(times),
                "wind_gusts_10m": [18] * len(times),
                "visibility": [10000] * len(times),
                "snowfall": [0.0] * len(times),
                "is_day": [1] * len(times),
            },
        }
        data = [sample_forecast] * max(1, coords_count)
        route.fulfill(status=200, content_type="application/json", body=json.dumps(data))
    elif "geocoding-api.open-meteo.com" in url:
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"results": [{"latitude": 37.0, "longitude": -122.0, "name": "Location", "admin1": "CA", "country_code": "US"}]}),
        )
    elif "nominatim.openstreetmap.org" in url:
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps([{"lat": "37.0", "lon": "-122.0", "display_name": "Location, CA, USA", "name": "Location"}]),
        )
    elif "rainviewer.com" in url:
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({"radar": {"past": [{"time": 1700000000, "path": "/v2/radar/1700000000/256/{z}/{x}/{y}/2/1_1.png"}]}}),
        )
    elif url.endswith(".png") or "tile.openstreetmap.org" in url:
        route.fulfill(status=200, content_type="image/png", body=TINY_PNG)
    elif "fonts.googleapis.com" in url:
        route.fulfill(status=200, content_type="text/css", body="")
    elif "fonts.gstatic.com" in url:
        route.fulfill(status=200, content_type="font/woff2", body=b"")
    else:
        route.fulfill(status=200, content_type="text/plain", body="")


def test_rw1_desktop_scrubber_and_timeline():
    # Dedicated test function that runs standalone or with pytest
    pass


def test_rw1_browser_regression_and_touch_action(server):
    artifacts_dir = REPO_ROOT / "artifacts" / "RW-1"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # ---------- 1. Desktop 1280x800 ----------
        desk_context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            device_scale_factor=1,
            locale="en-US",
            timezone_id="America/Los_Angeles",
        )
        desk_page = desk_context.new_page()
        desk_page.route("**/*", handle_offline_route)

        desk_page.goto(f"{server}/?from=37,-122&to=35.5,-119")
        desk_page.wait_for_selector(".card", timeout=15000)

        # Assert computed touch-action of .timeline is not 'pan-x pinch-zoom' at 1280px
        touch_action_1280 = desk_page.eval_on_selector("#timeline", "el => getComputedStyle(el).touchAction")
        assert touch_action_1280 != "pan-x pinch-zoom", f"Expected desktop touch-action != 'pan-x pinch-zoom', got {touch_action_1280}"

        # Check initial selected card
        initial_sel = desk_page.locator(".card.sel")
        assert initial_sel.count() == 1
        initial_k = initial_sel.get_attribute("data-k")

        # Drive scrubber with keyboard: focus #scrub, press End
        desk_page.focus("#scrub")
        desk_page.keyboard.press("End")
        desk_page.wait_for_timeout(200)

        # Assert selected card changed
        new_sel = desk_page.locator(".card.sel")
        assert new_sel.count() == 1
        new_k = new_sel.get_attribute("data-k")
        assert new_k != initial_k, f"Expected selected card to change from {initial_k}, but remained {new_k}"

        # Assert #scrub is still within viewport and within panel scroller's visible rect
        scrub_box = desk_page.locator("#scrub").bounding_box()
        scroller_box = desk_page.locator("#scroller").bounding_box()
        assert scrub_box is not None and scroller_box is not None

        # Inside viewport
        assert scrub_box["y"] >= 0, f"Scrubber top {scrub_box['y']} is above viewport"
        assert scrub_box["y"] + scrub_box["height"] <= 800, f"Scrubber bottom {scrub_box['y'] + scrub_box['height']} is below viewport"

        # Inside scroll container visible rect
        assert scrub_box["y"] >= scroller_box["y"], f"Scrubber top {scrub_box['y']} is above scroller visible top {scroller_box['y']}"
        assert scrub_box["y"] + scrub_box["height"] <= scroller_box["y"] + scroller_box["height"], (
            f"Scrubber bottom {scrub_box['y'] + scrub_box['height']} is below scroller visible bottom {scroller_box['y'] + scroller_box['height']}"
        )

        # Save desktop scrubbed screenshot
        desktop_shot = artifacts_dir / "rw1-desktop-1280-scrubbed.png"
        desk_page.screenshot(path=str(desktop_shot))
        assert desktop_shot.exists() and desktop_shot.stat().st_size > 0
        desk_context.close()

        # ---------- 2. Mobile 390x844 ----------
        mob_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            has_touch=True,
            is_mobile=True,
            locale="en-US",
            timezone_id="America/Los_Angeles",
        )
        mob_page = mob_context.new_page()
        mob_page.route("**/*", handle_offline_route)

        mob_page.goto(f"{server}/?from=37,-122&to=35.5,-119")
        mob_page.wait_for_selector(".card", timeout=15000)

        # Assert computed touch-action of .timeline is 'pan-x pinch-zoom' at 390px
        touch_action_390 = mob_page.eval_on_selector("#timeline", "el => getComputedStyle(el).touchAction")
        assert touch_action_390 == "pan-x pinch-zoom", f"Expected mobile touch-action 'pan-x pinch-zoom', got {touch_action_390}"

        # Ensure timeline cards are rendered in the sheet
        cards_count = mob_page.locator(".card").count()
        assert cards_count >= 2

        # Save mobile screenshot with sheet showing timeline
        mobile_shot = artifacts_dir / "rw1-mobile-390.png"
        mob_page.screenshot(path=str(mobile_shot))
        assert mobile_shot.exists() and mobile_shot.stat().st_size > 0
        mob_context.close()

        browser.close()
