from django.test import TestCase, Client


class UITestCase(TestCase):

    def test_robots_txt(self):
        c = Client()
        response = c.get('/robots.txt')
        self.assertEqual(response.status_code, 200)

    def test_favicon_ico(self):
        c = Client()
        response = c.get('/static/favicon.ico')
        self.assertEqual(response.status_code, 200)
