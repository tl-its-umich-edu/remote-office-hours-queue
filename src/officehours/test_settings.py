import os
from django.test import TestCase
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email

class ChannelLayersConfigTest(TestCase):
    def test_base_dir(self):
        # BASE_DIR should be set to the project root, and it should be an existing directory
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.assertTrue(os.path.isdir(base_dir), f"The BASE_DIR path '{base_dir}' does not exist.")

        #check that certain key directories/files exist relative to BASE_DIR
        manage_py = os.path.join(base_dir, 'manage.py')
        self.assertTrue(os.path.isfile(manage_py), f"The 'manage.py' file does not exist at '{manage_py}'.")

        #check that other expected directories exist
        for subdir in ['officehours', 'officehours_api']:
            subdir_path = os.path.join(base_dir, subdir)
            self.assertTrue(os.path.isdir(subdir_path), f"The expected subdir '{subdir}' does not exist at '{subdir_path}'.")
            
    def test_debug_value(self):
        self.assertIsInstance(settings.DEBUG, bool)

    def test_allowed_hosts(self):
        self.assertIsInstance(settings.ALLOWED_HOSTS, list)
        
    def test_watchman_tokens(self):
        if settings.WATCHMAN_TOKENS is not None:
            self.assertEqual(settings.WATCHMAN_TOKENS, settings.WATCHMAN_TOKENS.strip())
            
    def test_login_redirect_urls(self):
        self.assertEqual(settings.LOGIN_URL, settings.LOGIN_URL.strip())
        self.assertEqual(settings.LOGIN_REDIRECT_URL, settings.LOGIN_REDIRECT_URL.strip())
        self.assertEqual(settings.LOGOUT_REDIRECT_URL, settings.LOGOUT_REDIRECT_URL.strip())
        
        self.assertTrue(settings.LOGIN_URL.startswith('/'))
        self.assertTrue(settings.LOGIN_REDIRECT_URL.startswith('/'))
        self.assertTrue(settings.LOGOUT_REDIRECT_URL.startswith('/'))

    def test_logging_config(self):
        self.assertTrue(isinstance(settings.LOGGING, dict))
        self.assertIn('handlers', settings.LOGGING)
        self.assertIn('loggers', settings.LOGGING)
        self.assertIn('console', settings.LOGGING['handlers'])
        self.assertIn('mail_admins', settings.LOGGING['handlers'])
        self.assertIn('django', settings.LOGGING['loggers'])
        self.assertIn('mozilla_django_oidc', settings.LOGGING['loggers'])
        
    def test_staticfiles_dirs(self):
        self.assertIsInstance(settings.STATICFILES_DIRS, tuple)
        
    def test_static_files_config(self):
        self.assertTrue(settings.STATIC_URL.startswith('/'))
        self.assertTrue(settings.STATIC_ROOT.endswith('staticfiles'))

    def test_feedback_email(self):
        if settings.FEEDBACK_EMAIL is not None:
            self.assertEqual(settings.FEEDBACK_EMAIL, settings.FEEDBACK_EMAIL.strip())
            try:
                validate_email(settings.FEEDBACK_EMAIL)
                valid_email = True
            except ValidationError:
                valid_email = False
            self.assertTrue(valid_email, "FEEDBACK_EMAIL is not a valid email")

    def test_safedelete_config(self):
        self.assertIs(settings.SAFE_DELETE_INTERPRET_UNDELETED_OBJECTS_AS_CREATED, True)

    def test_drf_api_tracking_config(self):
        self.assertIs(settings.DRF_TRACKING_ADMIN_LOG_READONLY, True)
        self.assertIsInstance(settings.LOGGING_METHODS, list)
        for method in settings.LOGGING_METHODS:
            self.assertIn(method, ['POST', 'PUT', 'PATCH', 'DELETE'])

    def test_email_settings(self):
        if settings.EMAIL_HOST is not None:
            self.assertEqual(settings.EMAIL_HOST, settings.EMAIL_HOST.strip())
        self.assertTrue(settings.EMAIL_SUBJECT_PREFIX.startswith('['))
        self.assertTrue(settings.EMAIL_SUBJECT_PREFIX.endswith(']'))
        self.assertEqual(settings.EMAIL_SUBJECT_PREFIX, settings.EMAIL_SUBJECT_PREFIX.strip())

    def test_admins_and_managers(self):
        self.assertIsInstance(settings.ADMINS, list)
        for admin in settings.ADMINS:
            self.assertIsInstance(admin, tuple)
            name, email = admin
            self.assertTrue(name)
            if email is not None:
                self.assertEqual(email, email.strip())  
            # else:  TODO: Do we need to consider when admin email is not provided?       
            #     self.fail("Admin email cannot be None")

        self.assertIsInstance(settings.MANAGERS, list)
        self.assertTrue(set(settings.ADMINS).issubset(set(settings.MANAGERS)))

    def test_google_analytics_id(self):
        if settings.GA_TRACKING_ID is not None:
            self.assertEqual(settings.GA_TRACKING_ID, settings.GA_TRACKING_ID.strip())

    def test_channel_layers(self):
        redis_host = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0][0]
        redis_port = settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0][1]
        self.assertEqual(redis_host, redis_host.strip())
        self.assertIsInstance(redis_port, int)  

    def test_twilio_settings(self):
        if settings.TWILIO_ACCOUNT_SID is not None:
            self.assertEqual(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_ACCOUNT_SID.strip())
        if settings.TWILIO_AUTH_TOKEN is not None:
            self.assertEqual(settings.TWILIO_AUTH_TOKEN, settings.TWILIO_AUTH_TOKEN.strip())
        if settings.TWILIO_MESSAGING_SERVICE_SID is not None:
            self.assertEqual(settings.TWILIO_MESSAGING_SERVICE_SID, settings.TWILIO_MESSAGING_SERVICE_SID.strip())

    def test_zoom_urls(self):
        self.assertEqual(settings.ZOOM_DOCS_URL, settings.ZOOM_DOCS_URL.strip())
        self.assertEqual(settings.ZOOM_BASE_DOMAIN_URL, settings.ZOOM_BASE_DOMAIN_URL.strip())
        self.assertEqual(settings.ZOOM_PROFILE_URL, settings.ZOOM_PROFILE_URL.strip())
        self.assertEqual(settings.ZOOM_INTL_URL, settings.ZOOM_INTL_URL.strip())
        self.assertEqual(settings.ZOOM_TELE_NUM, settings.ZOOM_TELE_NUM.strip())
        if settings.ZOOM_SIGN_IN_HELP is not None:
            self.assertEqual(settings.ZOOM_SIGN_IN_HELP, settings.ZOOM_SIGN_IN_HELP.strip())
            
    def test_backend_clients(self):
        self.assertEqual(settings.ZOOM_CLIENT_ID, settings.ZOOM_CLIENT_ID.strip())
        self.assertEqual(settings.ZOOM_CLIENT_SECRET, settings.ZOOM_CLIENT_SECRET.strip())
                
    def test_backend_client_ids_and_secrets(self):
        self.assertEqual(settings.ZOOM_CLIENT_ID, settings.ZOOM_CLIENT_ID.strip())
        self.assertEqual(settings.ZOOM_CLIENT_SECRET, settings.ZOOM_CLIENT_SECRET.strip())
        
    def test_enabled_backends(self):
        self.assertIn('inperson', settings.ENABLED_BACKENDS)
        if 'zoom' in settings.ENABLED_BACKENDS:
            self.assertTrue(settings.ZOOM_CLIENT_ID and settings.ZOOM_CLIENT_SECRET)
                    
    def test_default_allowed_backends(self):
        self.assertIsInstance(settings.DEFAULT_ALLOWED_BACKENDS, list)
        for backend in settings.DEFAULT_ALLOWED_BACKENDS:
            self.assertIsInstance(backend, str)
            self.assertEqual(backend, backend.strip())       
