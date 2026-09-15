DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
DELETE FROM user_auth_attempts WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
DELETE FROM admin_login_attempts WHERE attempted_at < CURRENT_TIMESTAMP - INTERVAL '1 day';
