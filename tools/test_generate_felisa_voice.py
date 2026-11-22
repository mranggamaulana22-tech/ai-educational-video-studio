import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import generate_felisa_voice as module


class FelisaVoiceMockTests(unittest.TestCase):
    def test_priority_puts_greetings_and_approval_before_other_lines(self):
        ordered = sorted(module.LINES["id"].keys(), key=module.line_priority)
        self.assertTrue(ordered[:4][0].startswith("greeting_"))
        self.assertIn("status_completed_v1", ordered[:10])
        self.assertIn("status_waiting_approval_v1", ordered[:10])
        self.assertLess(ordered.index("greeting_pagi"), ordered.index("error_invalid_output"))
        self.assertLess(ordered.index("status_completed_v1"), ordered.index("error_invalid_output"))
        self.assertLess(ordered.index("error_invalid_output"), ordered.index("explain_status"))

    def test_quota_exhausted_has_no_retry_or_sleep(self):
        sleep = unittest.mock.Mock()
        with patch.object(
            module,
            "synthesize_gemini",
            side_effect=RuntimeError("quota_exhausted|resource exhausted"),
        ) as synthesize:
            with self.assertRaises(RuntimeError) as raised:
                module.synthesize_gemini_with_retry("test", "Leda", "style", Path("test.wav"), sleep_fn=sleep)

        self.assertEqual(synthesize.call_count, 1)
        sleep.assert_not_called()
        self.assertIn("quota_exhausted", str(raised.exception))

    def test_main_stops_after_three_mocked_successes_in_priority_order(self):
        calls = []

        def fake_synthesize(text, voice, style, output, progress="", sleep_fn=None, call_state=None, max_calls=None):
            line_id = progress.rsplit("/", 1)[-1]
            calls.append(line_id)
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(b"mock wav")

        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.object(module, "OUTPUT_DIR", Path(temp_dir)), patch.object(
                module,
                "synthesize_gemini_with_retry",
                side_effect=fake_synthesize,
            ), patch.object(
                module,
                "read_setting",
                side_effect=lambda primary, alias="", default="": {
                    "TTS_PROVIDER": "gemini",
                    "FELISA_VOICE": "Leda",
                    "NARRATOR_VOICE": "Kore",
                    "FELISA_TTS_DELAY_SECONDS": "0",
                    "FELISA_TTS_MAX_CALLS": "3",
                }.get(primary, default),
            ), patch.object(
                sys,
                "argv",
                ["generate_felisa_voice.py", "--lang", "id", "--voice", "Leda", "--force", "--max-calls", "3"],
            ):
                result = module.main()

        self.assertEqual(result, 1)
        self.assertEqual(calls, ["greeting_pagi", "greeting_siang", "greeting_sore"])


if __name__ == "__main__":
    unittest.main()
