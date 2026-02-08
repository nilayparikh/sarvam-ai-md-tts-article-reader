"""
Simple API test script to verify TTS functionality.
Uses httpx (already installed) instead of requests.
"""
import httpx
import json
import time
import base64

BASE_URL = "http://localhost:8000"
client = httpx.Client(timeout=120.0)

# Sample Hindi text for testing
SAMPLE_TEXT = """Google ka Nested Learning (NL) paper argue karta hai ki deep learning ka "stack of layers" wala view ek illusion hai; instead, neural networks ko nested optimization loops ki ek hierarchy ki tarah dekhna chahiye jo alag-alag frequencies par operate karte hain.

Authors ne demonstrate kiya hai ki standard components, jaise ki optimizer (e.g., Adam), actually primitive memory systems hain jinhe learnable neural networks, ya "Deep Optimizers" se replace kiya ja sakta hai. Is concept ko formalize karke, unhone HOPE (Higher-Order Processing Engine) introduce kiya hai—ek self-referential architecture jo human brain ki ability ko mimic karta hai taaki memory ko alag-alag time scales par consolidate kiya ja sake—context ke liye fast, aur knowledge ke liye slow.
"""


def test_health():
    """Test health endpoint."""
    print("\n=== Testing Health Endpoint ===")
    resp = client.get(f"{BASE_URL}/api/health")
    if resp.status_code == 200:
        data = resp.json()
        print(f"✓ Status: {data['status']}")
        print(f"✓ Version: {data['version']}")
        print(f"✓ Sarvam API Configured: {data['sarvam_api_configured']}")
        return data['sarvam_api_configured']
    else:
        print(f"✗ Health check failed: {resp.status_code}")
        return False


def test_parse_content():
    """Test parse content endpoint."""
    print("\n=== Testing Parse Content Endpoint ===")
    resp = client.post(
        f"{BASE_URL}/api/parse/content",
        data={
            "content": SAMPLE_TEXT,
            "filename": "test.md",
            "language": "hi"
        }
    )
    if resp.status_code == 200:
        data = resp.json()
        title = data.get('title') or "(no title)"
        print(f"✓ Title: {title[:50]}...")
        print(f"✓ Chunks: {len(data['chunks'])}")
        print(f"✓ Total characters: {data['total_characters']}")
        return data
    else:
        print(f"✗ Parse failed: {resp.status_code}")
        print(resp.text)
        return None


def test_tts_generate(parsed_doc):
    """Test TTS generation with just first chunk."""
    print("\n=== Testing TTS Generation (1 chunk) ===")

    # Generate TTS using file-based approach
    resp = client.post(
        f"{BASE_URL}/api/tts/generate",
        json={
            "file_path": "hi/artilce-1.md",
            "settings": {
                "speaker": "shubh",
                "model": "bulbul:v3",
                "target_language_code": "hi-IN",
                "pace": 1.1,
                "speech_sample_rate": 48000,
                "enable_preprocessing": True,
                "temperature": 0.6,
            },
            "chunks_to_generate": [0]  # Only first chunk for quick test
        }
    )

    if resp.status_code == 200:
        data = resp.json()
        print(f"✓ Job ID: {data['job_id']}")
        print(f"✓ Status: {data['status']}")
        print(f"✓ Completed: {data['completed_chunks']}/{data['total_chunks']}")
        if data.get('results'):
            print(f"✓ Results: {len(data['results'])} chunk(s)")
            for i, chunk in enumerate(data['results']):
                if chunk.get('error'):
                    print(f"  ✗ Chunk {chunk.get('chunk_id', i)}: Error - {chunk['error']}")
                elif chunk.get('audio_base64'):
                    audio_len = len(base64.b64decode(chunk['audio_base64']))
                    print(f"  ✓ Chunk {chunk.get('chunk_id', i)}: {audio_len} bytes of audio")
                else:
                    print(f"  ? Chunk {chunk.get('chunk_id', i)}: No audio or error")
        else:
            print("  ⚠ No results returned")
        return data['job_id']
    else:
        print(f"✗ TTS generation failed: {resp.status_code}")
        print(resp.text)
        return None


def test_export_download(job_id):
    """Test export and download."""
    print("\n=== Testing Export & Download ===")

    # Export as MP3
    resp = client.post(
        f"{BASE_URL}/api/tts/export",
        json={
            "job_id": job_id,
            "filename": "test_export",
            "format": "mp3"
        }
    )

    if resp.status_code == 200:
        data = resp.json()
        if data.get('success'):
            print(f"✓ Export successful")
            print(f"✓ Output path: {data['output_path']}")
            print(f"✓ File size: {data['file_size_bytes']} bytes")
            print(f"✓ Duration: {data['duration_seconds']:.2f} seconds")

            # Test download
            download_resp = client.get(f"{BASE_URL}/api/tts/download/{job_id}?format=mp3")
            if download_resp.status_code == 200:
                print(f"✓ Download successful: {len(download_resp.content)} bytes")
                # Save to file for verification
                with open("test_output.mp3", "wb") as f:
                    f.write(download_resp.content)
                print(f"✓ Saved to test_output.mp3")
                return True
            else:
                print(f"✗ Download failed: {download_resp.status_code}")
        else:
            print(f"✗ Export failed: {data.get('error')}")
    else:
        print(f"✗ Export request failed: {resp.status_code}")
        print(resp.text)

    return False


def test_summary(job_id):
    """Test API call summary."""
    print("\n=== Testing API Call Summary ===")
    resp = client.get(f"{BASE_URL}/api/tts/summary/{job_id}")

    if resp.status_code == 200:
        data = resp.json()
        print(f"✓ Job ID: {data['job_id']}")
        print(f"✓ Filename: {data['filename']}")
        print(f"✓ Total API calls: {data['total_api_calls']}")
        print(f"✓ Successful calls: {data['successful_calls']}")
        print(f"✓ Failed calls: {data['failed_calls']}")
        print(f"✓ Total characters: {data['total_characters']}")
        print(f"✓ Total bytes sent: {data['total_bytes_sent']}")
        print(f"✓ Total bytes received: {data['total_bytes_received']}")
        print(f"✓ Total duration: {data['total_duration_ms']}ms")
        print(f"✓ Avg response time: {data['average_response_time_ms']:.2f}ms")
        return True
    else:
        print(f"✗ Summary failed: {resp.status_code}")
        print(resp.text)
        return False


def main():
    print("=" * 60)
    print("TTS API Test Suite")
    print("=" * 60)

    # 1. Health check
    api_ready = test_health()
    if not api_ready:
        print("\n⚠ WARNING: Sarvam API key not configured!")
        print("TTS generation will fail without API key.")

    # 2. Parse content
    parsed = test_parse_content()
    if not parsed:
        print("\n✗ Parse test failed, aborting.")
        return

    # 3. Generate TTS (only if API configured)
    if api_ready:
        job_id = test_tts_generate(parsed)
        if job_id:
            # 4. Test summary
            test_summary(job_id)

            # 5. Export and download
            test_export_download(job_id)
    else:
        print("\n⚠ Skipping TTS generation tests (API not configured)")

    print("\n" + "=" * 60)
    print("Test Suite Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
