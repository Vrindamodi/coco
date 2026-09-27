"""Unit tests for the two-pass Whisper transcription in groq_client.

These mock the Groq SDK so they run without a key or network.
"""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.services import groq_client


def _verbose(text, *, language=None, logprob=-0.3, no_speech=0.05):
    segment = {"avg_logprob": logprob, "no_speech_prob": no_speech}
    return {"text": text, "language": language, "segments": [segment]}


def _client_returning(*responses):
    client = MagicMock()
    client.audio.transcriptions.create.side_effect = list(responses)
    return client


def _calls(client):
    return [c.kwargs for c in client.audio.transcriptions.create.call_args_list]


def test_auto_detect_runs_first_without_a_language_hint():
    client = _client_returning(_verbose("मैं ठीक हूँ", language="hindi"))
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="as")

    (call,) = _calls(client)
    assert "language" not in call
    assert "prompt" not in call
    assert call["response_format"] == "verbose_json"
    assert call["temperature"] == 0
    assert result.text == "मैं ठीक हूँ"
    assert result.language == "hi"


def test_unsupported_detected_language_falls_back_to_forced_bengali_for_assamese():
    client = _client_returning(
        _verbose("Nömoşkar Koko", language="turkish", logprob=-0.8),
        _verbose("নমস্কাৰ ক’ক’", language="bengali", logprob=-0.1),
    )
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="as")

    first, second = _calls(client)
    assert "language" not in first
    assert second["language"] == "bn"
    assert result.text == "নমস্কাৰ ক’ক’"
    # The hint fixes the script; the language reported is the app language.
    assert result.language == "as"


def test_low_confidence_auto_pass_falls_back_to_hint():
    client = _client_returning(
        _verbose("garbled", language="english", logprob=-1.8),
        _verbose("Hello Coco", language="english", logprob=-0.2),
    )
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="en")

    assert len(_calls(client)) == 2
    assert result.text == "Hello Coco"


def test_confident_auto_pass_is_kept():
    client = _client_returning(_verbose("Hello Coco", language="english", logprob=-0.1))
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="as")

    assert len(_calls(client)) == 1
    assert result.text == "Hello Coco"
    assert result.language == "en"


def test_silence_returns_empty_transcript():
    client = _client_returning(
        _verbose("", language="english", no_speech=0.7),
        _verbose("Thank you.", language="english", no_speech=0.95),
    )
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="en")

    assert result.is_empty
    assert len(_calls(client)) == 2


def test_pause_before_speaking_is_not_silence():
    """Seen in production: no_speech 0.70 with a confident forced transcript.

    The patient taps, pauses, then speaks. Whisper flags the quiet opening as
    probable no-speech yet decodes the words behind it with confidence, and
    its own decoder keeps such segments. Rejecting them cost real utterances.
    """
    client = _client_returning(
        _verbose("Hello", language="english", logprob=-0.71, no_speech=0.70),
        _verbose("মই ভালে আছোঁ", language="bengali", logprob=-0.26, no_speech=0.70),
    )
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="as")

    assert result.text == "মই ভালে আছোঁ"
    assert result.language == "as"


def test_high_no_speech_with_guessed_words_is_silence():
    client = _client_returning(
        _verbose("uh", language="english", logprob=-1.4, no_speech=0.8),
        _verbose("uh", language="bengali", logprob=-1.25, no_speech=0.8),
    )
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="as")

    assert result.is_empty


def test_doubtful_auto_pass_gets_a_second_opinion():
    """A middling "English" guess on Assamese speech triggers the forced pass,
    and the more confident of the two wins."""
    client = _client_returning(
        _verbose("Moi bhal asu", language="english", logprob=-0.69, no_speech=0.1),
        _verbose("মই ভাল আছোঁ", language="bengali", logprob=-0.2, no_speech=0.1),
    )
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="as")

    assert len(_calls(client)) == 2
    assert result.text == "মই ভাল আছোঁ"


def test_doubtful_auto_pass_is_kept_when_forced_is_worse():
    client = _client_returning(
        _verbose("Where is my home", language="english", logprob=-0.69, no_speech=0.1),
        _verbose("garbled", language="bengali", logprob=-1.6, no_speech=0.1),
    )
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="as")

    assert result.text == "Where is my home"
    assert result.language == "en"


def test_hallucination_phrase_alone_is_rejected():
    client = _client_returning(
        _verbose("Thank you for watching!", language="english"),
        _verbose("धन्यवाद।", language="hindi"),
    )
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="hi")

    assert result.is_empty


def test_no_hint_means_single_pass():
    client = _client_returning(_verbose("", language=None, no_speech=0.9))
    with patch.object(groq_client, "_get_client", return_value=client):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint=None)

    assert len(_calls(client)) == 1
    assert result.is_empty


def test_parse_handles_sdk_objects_and_language_names():
    response = SimpleNamespace(
        text=" hi there ",
        language="English",
        segments=[
            SimpleNamespace(avg_logprob=-0.5, no_speech_prob=0.1),
            SimpleNamespace(avg_logprob=-0.7, no_speech_prob=0.3),
        ],
    )
    parsed = groq_client._parse_verbose(response)
    assert parsed.text == "hi there"
    assert parsed.language == "en"
    assert parsed.confidence == -0.6
    assert abs(parsed.no_speech_prob - 0.2) < 1e-9


# --- Local provider ---------------------------------------------------------


def _local_response(payload, status_code=200):
    import httpx

    request = httpx.Request("POST", "http://local")
    return httpx.Response(status_code, json=payload, request=request)


def test_local_provider_posts_to_whisper_cpp_and_ollama(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "AI_PROVIDER", "local")
    monkeypatch.setattr(settings, "LOCAL_STT_URL", "http://stt:8081")
    monkeypatch.setattr(settings, "LOCAL_LLM_URL", "http://llm:11434")
    monkeypatch.setattr(settings, "LOCAL_LLM_MODEL", "gemma3:4b")

    posts = []

    def fake_post(url, **kwargs):
        posts.append((url, kwargs))
        if url.endswith("/inference"):
            return _local_response(_verbose("Hello Coco", language="en"))
        return _local_response(
            {"choices": [{"message": {"content": " Hi there! "}}]}
        )

    with patch.object(groq_client.httpx, "post", side_effect=fake_post):
        result = groq_client.transcribe_audio(b"...", "a.m4a", language_hint="as")
        reply = groq_client.chat_completion([{"role": "user", "content": "hi"}])

    stt_url, stt_kwargs = posts[0]
    assert stt_url == "http://stt:8081/inference"
    assert stt_kwargs["data"]["language"] == "auto"
    assert stt_kwargs["data"]["response_format"] == "verbose_json"
    assert "file" in stt_kwargs["files"]
    assert result.text == "Hello Coco"
    assert result.language == "en"

    llm_url, llm_kwargs = posts[1]
    assert llm_url == "http://llm:11434/v1/chat/completions"
    assert llm_kwargs["json"]["model"] == "gemma3:4b"
    assert reply == "Hi there!"


def test_local_provider_unreachable_gives_503(monkeypatch):
    import httpx

    from fastapi import HTTPException

    from app.config import settings

    monkeypatch.setattr(settings, "AI_PROVIDER", "local")

    def fake_post(url, **kwargs):
        raise httpx.ConnectError("refused", request=httpx.Request("POST", url))

    with patch.object(groq_client.httpx, "post", side_effect=fake_post):
        try:
            groq_client.transcribe_audio(b"...", "a.m4a", language_hint="en")
        except HTTPException as exc:
            assert exc.status_code == 503
            assert "offline-ai.sh" in exc.detail
        else:
            raise AssertionError("expected HTTPException")
