from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# Your Account Sid and Auth Token from twilio.com/user/account
# Store them in the environment variables:
# "TWILIO_ACCOUNT_SID" and "TWILIO_AUTH_TOKEN"
client = Client()

def is_valid_number(number):
    try:
        response = client.lookups.phone_numbers(number).fetch(type="carrier")
        return True
    except TwilioRestException as e:
        if e.code == 20404:
            return False
        else:
            raise e

print(is_valid_number('19999999999')) # False
print(is_valid_number('15108675309')) # True
print(is_valid_number('15179025789')) # True
print(is_valid_number('15174039570')) # True
print(is_valid_number('1111111111')) # False
print(is_valid_number('151086753')) # False