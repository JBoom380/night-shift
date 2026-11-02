"""Clue views in normal play mode, from standing height (1.65 m).
clue_view_N.png: 2.4 m away, shimmer at rest. clue_view_N_b.png: 5 m away, at the sparkle peak.
Run: NS_BASE=http://127.0.0.1:8771/ python -I tests/clue_views.py
"""
import math
import os

from playwright.sync_api import sync_playwright

BASE = os.environ.get("NS_BASE", "http://127.0.0.1:8765/")
SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
EYE = 1.65


def stand(c, back):
    px = max(-0.9, min(0.9, c["x"] * 0.25))
    pz = c["z"] - back
    dx, dz = c["x"] - px, c["z"] - pz
    yaw = math.degrees(math.atan2(-dx, -dz))
    pitch = math.degrees(math.atan2(c["y"] - EYE, math.hypot(dx, dz)))
    return px, pz, yaw, pitch


def main():
    errs = []
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-angle=d3d11", "--enable-gpu"])
        ctx = b.new_context(viewport={"width": 1280, "height": 720})
        pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(BASE, wait_until="load")
        pg.wait_for_selector("#btn-start", state="visible", timeout=60000)
        pg.wait_for_function("window.NS_DEBUG && NS_DEBUG.splatLoaded === true", timeout=120000)
        pg.click("#btn-start")
        for _ in range(3):
            pg.click("#pro-text")
            pg.wait_for_timeout(250)
        pg.wait_for_function("NS_DEBUG.alleyShown === true", timeout=60000)
        clues = pg.evaluate("NS_DEBUG.clues()")
        for i, c in enumerate(clues):
            for back, name, ph in ((2.4, "clue_view_%d.png", 3.0), (5.0, "clue_view_%d_b.png", 0.72)):
                px, pz, yaw, pitch = stand(c, back)
                pg.evaluate("NS_DEBUG.place(%f,%f,%f,%f)" % (px, pz, yaw, pitch))
                pg.evaluate("NS_DEBUG.shimmerPhase(%f)" % ph)
                pg.wait_for_timeout(1200)
                pg.screenshot(path=os.path.join(SHOTS, name % (i + 1)))
            print("clue", i + 1, "at", c)
        pg.evaluate("NS_DEBUG.shimmerPhase()")
        ctx.close()
        b.close()
    print("errors", errs)
    return 1 if errs else 0


if __name__ == "__main__":
    raise SystemExit(main())
