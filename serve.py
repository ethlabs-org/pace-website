# Serves the mockup at http://localhost:8791/ (or the port given) and tells the browser not to keep stale copies.
# Python's plain http.server sends no cache headers, so a browser may reuse an old index.html for hours after it
# changes. With Cache-Control: no-cache it checks with the server on every load.
#   python3 serve.py [port]
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
root = os.path.dirname(os.path.abspath(__file__))
print(f'Serving the mockup at http://localhost:{port}/')
http.server.ThreadingHTTPServer(('', port), functools.partial(NoCache, directory=root)).serve_forever()
