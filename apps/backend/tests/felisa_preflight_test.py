from app import felisa_preflight as pf


def main():
    full = lambda n: True
    r = pf.run_preflight(today="2000-01-01", which=lambda n: "/x/ffmpeg", env_filled=full)
    assert r["ok"] and r["level"] == "ok", r

    r = pf.run_preflight(today="2000-01-01", which=lambda n: None, env_filled=full)
    assert not r["ok"] and r["level"] == "error"

    only_gemini = lambda n: n == "GEMINI_API_KEY"
    r = pf.run_preflight(today="2000-01-01", which=lambda n: "x", env_filled=only_gemini)
    assert r["ok"] and r["level"] == "warn"

    r = pf.run_preflight(today="2000-01-01", which=lambda n: "x", env_filled=lambda n: False)
    assert not r["ok"]
    assert pf.preflight_line({"level": "ok"}, "id").startswith("Semua siap")
    assert pf.preflight_line({"level": "warn"}, "en").startswith("Boss, something")
    assert pf.preflight_line({"level": "error"}, "id").startswith("Bos, ada")
    print("OK")


if __name__ == "__main__":
    main()