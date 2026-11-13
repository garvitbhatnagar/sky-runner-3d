"""
Sky Runner 3D - Python Server & Backend Engine
Handles static assets serving, high score persistence, network discovery, and mobile QR code generation.
Runs out of the box with zero external dependencies required.
"""

import os
import sys
import json
import socket
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
SCORES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scores.json')
quit_event = threading.Event()

def get_local_ip():
    """Detect the local Wi-Fi / LAN IP address for Android & iOS mobile connections."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

def load_scores():
    if os.path.exists(SCORES_FILE):
        try:
            with open(SCORES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {"high_score": 0, "max_level": 1, "history": []}

def save_scores(data):
    try:
        with open(SCORES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[Error saving scores]: {e}")

class GameRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable caching for instant updates
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/highscores':
            scores = load_scores()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(scores).encode('utf-8'))
            return
        elif self.path == '/manifest.json':
            manifest_path = os.path.join(STATIC_DIR, 'manifest.json')
            if os.path.exists(manifest_path):
                self.send_response(200)
                self.send_header('Content-Type', 'application/manifest+json')
                self.end_headers()
                with open(manifest_path, 'rb') as f:
                    self.wfile.write(f.read())
                return

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/highscores':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                new_data = json.loads(body.decode('utf-8'))
                scores = load_scores()
                new_score = int(new_data.get('score', 0))
                if new_score > scores.get('high_score', 0):
                    scores['high_score'] = new_score
                level = int(new_data.get('level', 1))
                if level > scores.get('max_level', 1):
                    scores['max_level'] = level
                scores.setdefault('history', []).append(new_data)
                # Keep last 50 history entries
                scores['history'] = scores['history'][-50:]
                save_scores(scores)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "scores": scores}).encode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        elif self.path == '/api/quit':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "quitting"}')
            print("\n[Game] Quit command received from menu. Shutting down...")
            quit_event.set()
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        # Silence routine static asset logs
        return

def run_server(host='0.0.0.0', port=8000):
    server = ThreadingHTTPServer((host, port), GameRequestHandler)
    print(f"[Server] Sky Runner 3D backend running on port {port}")
    while not quit_event.is_set():
        server.handle_request()
    server.server_close()
    print("[Server] Server stopped successfully.")

if __name__ == '__main__':
    run_server()
