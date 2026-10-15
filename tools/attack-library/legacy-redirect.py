from http.server import HTTPServer,BaseHTTPRequestHandler
class Redirect(BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(302);self.send_header('Location','http://127.0.0.1:4321'+self.path);self.send_header('Cache-Control','no-store');self.end_headers()
 def log_message(self,*args):pass
HTTPServer(('127.0.0.1',4320),Redirect).serve_forever()
