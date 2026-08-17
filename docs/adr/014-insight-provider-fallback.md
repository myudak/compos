# ADR-014: Insight Provider dan Fallback

**Status:** Diterima

Insight berjalan async dan hanya mengirim aggregate features ke OpenAI-compatible provider. Provider
timeout 15 detik, dicoba maksimal tiga kali, lalu deterministic local analytics disimpan dengan source
`LOCAL_ANALYTICS`. Fallback tidak boleh dilabeli AI. Mengirim raw transaction atau menahan request
Owner sampai provider selesai ditolak karena privacy, latency, dan availability.
