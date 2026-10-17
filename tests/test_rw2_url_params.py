"""Exercise URL startup and form serialization with no external network access."""

from datetime import datetime, timezone
import re
from urllib.parse import parse_qs, urlencode, urlparse

import pytest
from playwright.sync_api import expect, sync_playwright

from test_rw1_browser import REPO_ROOT, handle_offline_route, server  # noqa: F401


FROM = "37,-122"
TO = "35.5,-119"
WHEN = "2026-10-18T09:30"
LEGACY = "2026-10-19T16:45"
ARTIFACTS = REPO_ROOT / "artifacts" / "RW-2"


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        yield browser
        browser.close()


@pytest.fixture(params=[1280, 390], ids=["desktop-1280", "mobile-390"])
def page(browser, request):
    mobile = request.param == 390
    context = browser.new_context(
        viewport={"width": request.param, "height": 844 if mobile else 800},
        device_scale_factor=1,
        is_mobile=mobile,
        has_touch=mobile,
        locale="en-US",
        timezone_id="America/Los_Angeles",
        service_workers="block",
    )
    page = context.new_page()
    page.clock.set_fixed_time(datetime(2026, 10, 17, 19, tzinfo=timezone.utc))
    page.route("**/*", handle_offline_route)
    yield page
    context.close()


def wait_for_trip(page):
    expect(page.locator("body")).to_have_class(re.compile(r"\bplanned\b"))
    expect(page.locator("#go")).to_be_enabled()
    expect(page.locator("#loader")).to_be_hidden()
    expect(page.locator(".card").first).to_be_visible()


def assert_picker(page, mode, when=None):
    for candidate in ("now", "depart", "arrive"):
        expect(page.locator(f'[data-tm="{candidate}"]')).to_have_attribute(
            "aria-checked", str(candidate == mode).lower()
        )
    if when:
        expect(page.locator("#ptime")).to_have_value(when[11:16])
        day = datetime.fromisoformat(when).strftime("%a, %b %-d")
        expect(page.locator("#pdate")).to_have_text(day)
    else:
        expect(page.locator("#picker")).not_to_have_class(re.compile(r"\bopen\b"))


def edit_trip(page):
    # Successful startup collapses the form on mobile; use the actual Edit control.
    page.locator("#routeRow").click()
    expect(page.locator("#from")).to_be_visible()


def assert_query(page, expected):
    assert parse_qs(urlparse(page.url).query, keep_blank_values=True) == {
        key: [value] for key, value in expected.items()
    }


@pytest.mark.parametrize(
    "params,mode,when",
    [
        ({}, "now", None),
        ({"mode": "now", "t": WHEN}, "now", None),
        ({"mode": "depart", "t": WHEN}, "depart", WHEN),
        ({"mode": "arrive", "t": WHEN}, "arrive", WHEN),
        ({"t": WHEN}, "depart", WHEN),
        ({"depart": LEGACY}, "depart", LEGACY),
        ({"mode": "arrive", "t": WHEN, "depart": LEGACY}, "arrive", WHEN),
        ({"mode": "depart", "t": "", "depart": LEGACY}, "depart", LEGACY),
        ({"mode": "depart", "t": "invalid", "depart": LEGACY}, "now", None),
        ({"mode": "arrive"}, "now", None),
        ({"mode": "unknown", "t": WHEN}, "now", None),
    ],
    ids=["now", "explicit-now", "depart", "arrive", "implicit-depart", "legacy",
         "t-precedence", "empty-t-fallback", "invalid-t", "missing-t", "unknown-mode"],
)
def test_url_initializes_trip(page, server, params, mode, when):
    query = {"from": FROM, "to": TO, **params}
    page.goto(f"{server}/?{urlencode(query)}")
    wait_for_trip(page)
    # Startup must preserve shared/legacy URLs rather than silently rewrite them.
    assert_query(page, query)
    expect(page.locator("#from")).to_have_value(FROM)
    expect(page.locator("#to")).to_have_value(TO)
    assert_picker(page, mode, when)
    if mode == "depart":
        clock_time = datetime.fromisoformat(when).strftime("%-I:%M")
        expect(page.locator("#scrubStart")).to_contain_text(clock_time)
    elif mode == "arrive":
        expect(page.locator("#scrubEnd")).to_contain_text("9:30")
        expect(page.locator("#summary .leave")).to_contain_text("7:30")


@pytest.mark.parametrize("mode", ["now", "depart", "arrive"])
def test_form_serializes_and_reloads_trip(page, server, mode):
    # Start with timed legacy params so Leave now must remove all stale time keys.
    page.goto(f"{server}/?{urlencode({'from': FROM, 'to': TO, 'depart': LEGACY})}")
    wait_for_trip(page)
    edit_trip(page)
    start = "San José + café & coast, CA"
    destination = "Los Ángeles / Union #2?"
    page.locator("#from").fill(start)
    page.locator("#to").fill(destination)
    page.locator(f'[data-tm="{mode}"]').click()
    if mode != "now":
        page.locator('.day[data-d="1"]').click()
        page.locator("#ptime").fill("09:30")
        page.locator("#ptime").press("Tab")
    page.locator("#go").click()
    wait_for_trip(page)
    expected = {"from": start, "to": destination}
    if mode != "now":
        expected.update(mode=mode, t=WHEN)
    assert_query(page, expected)

    page.reload()
    wait_for_trip(page)
    assert_query(page, expected)
    expect(page.locator("#from")).to_have_value(start)
    expect(page.locator("#to")).to_have_value(destination)
    assert_picker(page, mode, WHEN if mode != "now" else None)
    if mode == "arrive":
        edit_trip(page)
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        width = page.viewport_size["width"]
        screenshot = ARTIFACTS / f"rw2-url-roundtrip-{width}.png"
        page.screenshot(path=str(screenshot))
        assert screenshot.stat().st_size > 0


def test_legacy_depart_serializes_as_mode_and_t(page, server):
    page.goto(f"{server}/?{urlencode({'from': FROM, 'to': TO, 'depart': LEGACY})}")
    wait_for_trip(page)
    edit_trip(page)
    page.locator("#go").click()
    wait_for_trip(page)
    assert_query(page, {"from": FROM, "to": TO, "mode": "depart", "t": LEGACY})
    page.reload()
    wait_for_trip(page)
    assert_picker(page, "depart", LEGACY)
