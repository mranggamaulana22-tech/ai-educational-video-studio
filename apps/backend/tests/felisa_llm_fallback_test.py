import json

from app import felisa_chat


def fake_gen_factory(behaviour):
    calls = []

    def gen(provider, system, messages, model):
        calls.append(provider)
        action = behaviour[provider]
        if action == "fail":
            raise SystemExit(f"[GAGAL] {provider} mati")
        if action == "bad":
            return "bukan json"
        return json.dumps({"reply": f"halo dari {provider}"})

    return gen, calls


def main():
    order = ["gemini", "openrouter", "deepseek"]

    gen, calls = fake_gen_factory({"gemini": "ok", "openrouter": "ok", "deepseek": "ok"})
    assert felisa_chat.llm_reply("hai", "id", "Bos", providers=order, gen=gen) == "halo dari gemini"
    assert calls == ["gemini"]

    gen, calls = fake_gen_factory({"gemini": "fail", "openrouter": "ok", "deepseek": "ok"})
    assert felisa_chat.llm_reply("hai", "id", "Bos", providers=order, gen=gen) == "halo dari openrouter"
    assert calls == ["gemini", "openrouter"]

    gen, calls = fake_gen_factory({"gemini": "bad", "openrouter": "fail", "deepseek": "ok"})
    assert felisa_chat.llm_reply("hai", "id", "Bos", providers=order, gen=gen) == "halo dari deepseek"

    gen, calls = fake_gen_factory({"gemini": "fail", "openrouter": "fail", "deepseek": "fail"})
    try:
        felisa_chat.llm_reply("hai", "id", "Bos", providers=order, gen=gen)
        raise AssertionError("harus gagal")
    except RuntimeError as exc:
        assert "llm_gagal" in str(exc)

    print("OK")


if __name__ == "__main__":
    main()