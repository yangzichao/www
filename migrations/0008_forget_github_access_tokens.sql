UPDATE sessions SET encrypted_access_token = NULL WHERE encrypted_access_token IS NOT NULL;
