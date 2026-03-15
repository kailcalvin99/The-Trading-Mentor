BEGIN;

DELETE FROM user_subscriptions WHERE user_id IN (
  SELECT id FROM users WHERE LOWER(email) = 'alexcalvin.ac@gmail.com'
);

DELETE FROM users WHERE LOWER(email) = 'alexcalvin.ac@gmail.com';

COMMIT;
