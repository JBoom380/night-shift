import os
import sys

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "tests", "shots")
ARGS = ["--use-angle=d3d11", "--enable-gpu"]
DESKTOP = {"width": 1280, "height": 720}
PHONE = {"width": 390, "height": 844}

# Records every assignment to a media element src, so the test can see each cue request.
AUDIO_SPY = """
(() => {
  window.__audio = [];
  const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
  Object.defineProperty(HTMLMediaElement.prototype, 'src', {
    configurable: true,
    enumerable: d.enumerable,
    get() { return d.get.call(this); },
    set(v) { window.__audio.push(String(v)); d.set.call(this, v); }
  });
})();
"""

CUES = {
    "title": "01_neon_rain_main_theme",
    "prologue": "02_the_office",
    "ending": "03_velas_theme",
    "alley": "05_somebody_elses_rain",
    "landlord": "06_interrogation",
    "board": "09_the_glass_saint",
    "rain": "rain_13_ext_alley_gutter",
}


def shot(page, name):
    path = os.path.join(SHOTS, name)
    page.screenshot(path=path)
    print("shot", path)


def watch(page, label, errors):
    def on_console(msg):
        if msg.type == "error":
            errors.append("[%s] console: %s" % (label, msg.text))

    def on_error(exc):
        errors.append("[%s] pageerror: %s" % (label, exc))

    page.on("console", on_console)
    page.on("pageerror", on_error)


def check(errors, label, cond, msg):
    if not cond:
        errors.append("[%s] assert failed: %s" % (label, msg))
        print("ASSERT FAILED:", label, msg)


def act(page, selector, phone):
    if phone:
        page.tap(selector)
    else:
        page.click(selector)


def new_context(browser, viewport, phone):
    ctx = browser.new_context(
        viewport=viewport,
        has_touch=phone,
        is_mobile=phone,
        device_scale_factor=1,
    )
    ctx.add_init_script(AUDIO_SPY)
    return ctx


def run_session(browser, label, viewport, phone, errors):
    suffix = "_phone" if phone else ""
    ctx = new_context(browser, viewport, phone)
    page = ctx.new_page()
    watch(page, label, errors)
    page.goto(BASE, wait_until="load")
    page.wait_for_function("window.NS_DEBUG && NS_DEBUG.splatLoaded === true", timeout=120000)
    check(errors, label, page.evaluate("NS_DEBUG.splatLoaded") is True, "splat did not load")
    page.wait_for_selector("#btn-start", state="visible", timeout=60000)
    page.wait_for_timeout(1200)
    if not phone:
        shot(page, "title.png")
    act(page, "#btn-start", phone)
    page.wait_for_selector("#scr-prologue.on", timeout=10000)
    page.wait_for_timeout(500)
    shot(page, "prologue.png" if not phone else "prologue_phone.png")
    for _ in range(3):
        act(page, "#pro-text", phone)
        page.wait_for_timeout(300)
    page.wait_for_selector("#hud:not([hidden])", timeout=10000)
    page.wait_for_timeout(2000)
    shot(page, "alley_phone.png" if phone else "alley_desktop.png")
    page.evaluate("NS_DEBUG.place(0, -10, 180, 0)")
    page.wait_for_timeout(500)
    shot(page, "alley_real_phone.png" if phone else "alley_real_desktop.png")
    print(label, "fps", round(page.evaluate("NS_DEBUG.fps"), 1), "splat", page.evaluate("NS_DEBUG.splatLoaded"))
    if not phone:
        page.keyboard.press("KeyN")
        page.wait_for_selector("#scr-notebook.on", timeout=5000)
        page.wait_for_timeout(300)
        shot(page, "notebook.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        page.evaluate("NS_DEBUG.aim(3)")
        page.wait_for_timeout(600)
        shot(page, "clue_in_alley.png")

    # Clues 1 to 5, then the landlord dialog, then clues 6 to 9.
    page.evaluate("NS_DEBUG.holdFigure(true)")
    for i in range(5):
        st = page.evaluate("NS_DEBUG.inspect(%d)" % i)
        check(errors, label, st == "card", "inspect %d gave state %s" % (i, st))
        page.wait_for_selector("#scr-card.on", timeout=5000)
        act(page, "#btn-card-close", phone)
        page.wait_for_timeout(200)
    dbg = page.evaluate("NS_DEBUG.state()")
    check(errors, label, dbg["figureActive"] is True, "landlord not active after clue 5: %s" % dbg)

    page.evaluate("NS_DEBUG.place(0, 2.6, 0, 0)")
    page.wait_for_timeout(600)
    shot(page, "landlord_figure.png" if not phone else "landlord_figure_phone.png")
    page.evaluate("NS_DEBUG.holdFigure(false)")
    page.evaluate("NS_DEBUG.place(0, -10, 180, 0)")
    st = page.evaluate("NS_DEBUG.inspect(5)")
    check(errors, label, st == "dialog", "dialog did not start after clue 5, state %s" % st)
    page.wait_for_selector("#scr-dialog.on", timeout=5000)
    page.wait_for_timeout(400)
    shot(page, "landlord%s.png" % suffix)
    lines = 0
    for _ in range(30):
        if not page.is_visible("#scr-dialog.on"):
            break
        act(page, "#dlg-text", phone)
        lines += 1
        page.wait_for_timeout(150)
    check(errors, label, not page.is_visible("#scr-dialog.on"), "dialog did not end")
    dbg = page.evaluate("NS_DEBUG.state()")
    check(errors, label, dbg["landlordDone"] is True and dbg["state"] == "alley", "after dialog: %s" % dbg)
    print(label, "landlord dialog advanced", lines, "times")

    for i in range(5, 9):
        st = page.evaluate("NS_DEBUG.inspect(%d)" % i)
        check(errors, label, st == "card", "inspect %d gave state %s" % (i, st))
        page.wait_for_selector("#scr-card.on", timeout=5000)
        act(page, "#btn-card-close", phone)
        page.wait_for_timeout(200)
    page.wait_for_selector("#btn-board:not([hidden])", timeout=5000)
    page.wait_for_timeout(500)
    if not phone:
        page.evaluate("NS_DEBUG.place(0, 6.0, 180, 0)")
        page.wait_for_timeout(600)
        shot(page, "basement_end.png")
    print(label, "board button top element:", page.evaluate(
        "(() => { const r = document.getElementById('btn-board').getBoundingClientRect();"
        " const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);"
        " return e ? e.tagName + '#' + e.id : 'none'; })()"), page.evaluate("NS_DEBUG.state()"))
    act(page, "#btn-board", phone)
    page.wait_for_selector("#scr-board.on", timeout=5000)
    page.wait_for_timeout(500)

    short = page.evaluate(
        "Array.from(document.querySelectorAll('.pin-sec')).map(e => e.textContent)"
    )
    check(errors, label, all((s == "" or s.startswith("Sec. ")) for s in short),
          "pin sections not short: %s" % short)
    check(errors, label, not any("Moscow" in s for s in short), "full section text on a pin")
    act(page, "#pins .pin >> nth=0", phone)
    page.wait_for_timeout(200)
    detail = page.inner_text("#detail")
    check(errors, label, "Not more than four" in detail, "tap on pin did not show full text")

    if not phone:
        fits = page.evaluate(
            "(() => { const s = document.getElementById('scr-board');"
            " return s.scrollHeight <= s.clientHeight + 1; })()"
        )
        check(errors, label, fits, "board page scrolls at 1280x720")

    wrong = page.evaluate("NS_STORY.board.suspects.find(s => !s.correct).name")
    right = page.evaluate("NS_STORY.board.suspects.find(s => s.correct).name")
    page.locator("#suspects button", has_text=wrong).first.click() if not phone \
        else page.locator("#suspects button", has_text=wrong).first.tap()
    page.wait_for_function("document.getElementById('detail').textContent.indexOf('Rebuttal') >= 0", timeout=5000)
    page.wait_for_timeout(300)
    shot(page, "board_wrong%s.png" % suffix)

    page.locator("#suspects button", has_text=right).first.click() if not phone \
        else page.locator("#suspects button", has_text=right).first.tap()
    page.wait_for_function("document.getElementById('detail').textContent.indexOf('Verdict') >= 0", timeout=5000)
    page.wait_for_selector("#btn-verdict-next:not([hidden])", timeout=5000)
    page.wait_for_timeout(300)
    shot(page, "verdict%s.png" % suffix)

    act(page, "#btn-verdict-next", phone)
    page.wait_for_selector("#scr-ending.on", timeout=5000)
    page.wait_for_timeout(300)
    shot(page, "ending%s.png" % suffix)
    taps = 0
    while not page.is_visible("#scr-credits.on") and taps < 10:
        act(page, "#end-text", phone)
        taps += 1
        page.wait_for_timeout(200)
    page.wait_for_selector("#scr-credits.on", timeout=5000)
    page.wait_for_timeout(300)
    shot(page, "credits%s.png" % suffix)
    check(errors, label, page.inner_text("#cr-sources").strip() != "", "credits sources empty")
    check(errors, label, page.locator("#scr-credits a[href='https://superspl.at/scene/23533997']").count() == 1,
          "credits scene link missing")
    check(errors, label, page.locator("#scr-credits a[href='https://creativecommons.org/licenses/by/4.0/']").count() == 1,
          "credits license link missing")
    visible = page.evaluate(
        "(() => { const a = document.querySelector(\"#scr-credits a[href='https://creativecommons.org/licenses/by/4.0/']\");"
        " const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()")
    check(errors, label, visible, "CC BY link is below the fold at this viewport")

    audio = page.evaluate("window.__audio")
    for key, name in CUES.items():
        found = any(name in src for src in audio)
        check(errors, label, found, "no audio request for cue %s (%s)" % (key, name))
    print(label, "audio requests:", len(audio))
    ctx.close()


def run_debug(browser, name, query, viewport, phone, errors, screen_id, shot_name):
    ctx = new_context(browser, viewport, phone)
    page = ctx.new_page()
    watch(page, name, errors)
    page.goto(BASE + query, wait_until="load")
    page.wait_for_selector(screen_id + ".on", timeout=60000)
    page.wait_for_timeout(1500)
    shot(page, shot_name)
    ctx.close()


def main():
    os.makedirs(SHOTS, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=ARGS)
        try:
            run_session(browser, "desktop", DESKTOP, False, errors)
            run_session(browser, "phone", PHONE, True, errors)
            run_debug(browser, "card", "?debug=card", DESKTOP, False, errors, "#scr-card", "card.png")
            run_debug(browser, "board", "?debug=board", DESKTOP, False, errors, "#scr-board", "board.png")
            run_debug(browser, "board-phone", "?debug=board", PHONE, True, errors, "#scr-board", "board_phone.png")
        finally:
            browser.close()

    if errors:
        print("FAIL: %d problem(s)" % len(errors))
        for e in errors:
            print(e)
        return 1
    print("PASS: flow, audio cues, no console or page errors. Screens saved to", SHOTS)
    return 0


if __name__ == "__main__":
    sys.exit(main())
