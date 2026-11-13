"""
Sky Runner 3D - Main Application Launcher
Cross-platform 3D Endless Runner Game designed in Python.
Supports:
 - Windows (Native Desktop Window via pywebview or Browser)
 - Android & iOS (Instant Mobile Play via Wi-Fi & Terminal QR Code)
"""

import sys
import os
import time
import socket
import threading
import webbrowser
import argparse

# Import local server utilities
from server import run_server, get_local_ip, quit_event

def print_banner(local_ip, port):
    print("=" * 68)
    print("        ⚡  SKY RUNNER 3D - ENDLESS HORIZON  ⚡")
    print("        3D Graphics • Real-Time Physics • Infinite Levels (1 → ∞)")
    print("=" * 68)
    print(f" [Windows Desktop] : http://localhost:{port}")
    print(f" [Android & iOS]   : http://{local_ip}:{port}")
    print(f" [Custom Domain]   : https://sky-runner-3d.com  (via python main.py --https)")
    print("-" * 68)

    # Generate Terminal QR Code for Android & iOS mobile testing
    try:
        import qrcode
        qr = qrcode.QRCode(box_size=1, border=2)
        qr.add_data(f"http://{local_ip}:{port}")
        qr.make(fit=True)
        print(" [SCAN TO PLAY ON MOBILE (Android / iPhone / iPad)]:")
        qr.print_ascii(invert=True)
        print("-" * 68)
    except Exception:
        pass

    print(" Controls:")
    print("  - Steer: Arrow Keys / A & D  |  Swipe Left & Right")
    print("  - Jump:  Space / W / Up Arrow |  Swipe Up")
    print("  - Slide: S / Down Arrow       |  Swipe Down")
    print("  - Pause: P / Escape")
    print("=" * 68)

class DesktopApi:
    """Python bridge exposed to JavaScript in pywebview."""
    def __init__(self, window):
        self._window = window

    def quit(self):
        print("[DesktopApi] Quit command received. Closing window...")
        quit_event.set()
        if self._window:
            self._window.destroy()

def launch_desktop(port):
    local_url = f"http://127.0.0.1:{port}"
    try:
        import webview
        print("[Launcher] Launching native Windows 3D desktop window...")

        api = DesktopApi(None)
        window = webview.create_window(
            title="Sky Runner 3D - Endless Horizon",
            url=local_url,
            width=1280,
            height=760,
            resizable=True,
            min_size=(800, 500),
            js_api=api
        )
        api._window = window

        # When window is closed by the user, trigger quit event
        def on_closed():
            quit_event.set()
        window.events.closed += on_closed

        # Start webview GUI loop
        webview.start()

    except Exception as e:
        print(f"[Launcher] pywebview notice: {e}")
        print(f"[Launcher] Opening in default web browser: {local_url}")
        webbrowser.open(local_url)

        # Keep server alive until interrupt or quit_event
        try:
            while not quit_event.is_set():
                time.sleep(0.5)
        except KeyboardInterrupt:
            print("\n[Launcher] Exiting...")
            quit_event.set()

def main():
    parser = argparse.ArgumentParser(description="Sky Runner 3D Launcher")
    parser.add_argument("--port", type=int, default=8000, help="Port to serve game on")
    parser.add_argument("--browser", action="store_true", help="Force opening in browser instead of desktop window")
    parser.add_argument("--https", action="store_true", help="Run with secure HTTPS for https://sky-runner-3d.com")
    args = parser.parse_args()

    if args.https:
        from https_server import run_https_server
        run_https_server()
        return

    port = args.port
    local_ip = get_local_ip()

    # Start Python background server
    server_thread = threading.Thread(target=run_server, args=('0.0.0.0', port), daemon=True)
    server_thread.start()

    time.sleep(0.3)
    print_banner(local_ip, port)

    if args.browser:
        webbrowser.open(f"http://localhost:{port}")
        try:
            while not quit_event.is_set():
                time.sleep(0.5)
        except KeyboardInterrupt:
            quit_event.set()
    else:
        launch_desktop(port)

if __name__ == '__main__':
    main()
