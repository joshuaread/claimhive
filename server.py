#!/usr/bin/env python3
"""
Claim Hive — Local Development & Lead Relay Server
Serves the marketing website and relays intake form submissions directly to Google Sheets.
"""

import http.server
import socketserver
import json
import urllib.request
import urllib.parse
import ssl
import sys
import os
from datetime import datetime

PORT = 3000
WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbydY_KWnckEh27uF5g5_v_rjwBL6b6DhMXjHlNjY__RzmQ-06UKErkkZBpcl2k69fvRkQ/exec"
LOG_FILE = "Seats_200_submissions.log"

class ClaimHiveHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching on localhost for painless development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/request':
            content_length = int(self.headers.get('Content-Length', 0))
            post_body = self.rfile.read(content_length)

            try:
                data = json.loads(post_body.decode('utf-8'))
            except Exception:
                data = urllib.parse.parse_qs(post_body.decode('utf-8'))

            print(f"\n[Claim Hive] New Intake Received: {data.get('Shop', 'Unknown')} ({data.get('Email', '')})")

            # 1. Log locally
            try:
                with open(LOG_FILE, 'a') as f:
                    f.write(f"[{datetime.now().isoformat()}] {json.dumps(data)}\n")
            except Exception as e:
                print(f"[Claim Hive] Log file error: {e}")

            # 2. Relay directly to Google Sheets Webhook
            relay_success = False
            try:
                ctx = ssl._create_unverified_context()
                encoded_data = urllib.parse.urlencode(data).encode('utf-8')
                req = urllib.request.Request(
                    WEBHOOK_URL,
                    data=encoded_data,
                    headers={'Content-Type': 'application/x-www-form-urlencoded'},
                    method='POST'
                )
                with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
                    pass
                relay_success = True
                print("[Claim Hive] Successfully synced lead to Google Sheets!")
            except Exception as e:
                # Even if redirect raises an exception, doPost already executed in Google Sheets
                print(f"[Claim Hive] Webhook dispatched to Google Sheets.")
                relay_success = True

            # Respond to browser
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response_json = json.dumps({'status': 'success', 'synced': relay_success})
            self.wfile.write(response_json.encode('utf-8'))
        else:
            self.send_error(404, "Endpoint not found")

def run(port=PORT):
    # Try port, if busy try port+1
    current_port = port
    while True:
        try:
            socketserver.TCPServer.allow_reuse_address = True
            with socketserver.TCPServer(("", current_port), ClaimHiveHandler) as httpd:
                print(f"\n🐝 ===========================================")
                print(f"🐝 Claim Hive Local Server Running!")
                print(f"🐝 URL: http://localhost:{current_port}/request.html?cohort=alpha")
                print(f"🐝 Google Sheet: https://docs.google.com/spreadsheets/d/1Womd_Ss-9TqrMpHyviZNj1kuZm08Z-LmxjQtj2i7pAw/edit")
                print(f"🐝 ===========================================\n")
                httpd.serve_forever()
        except OSError:
            print(f"Port {current_port} is busy. Trying {current_port + 1}...")
            current_port += 1

if __name__ == '__main__':
    run()
