CREATE TABLE app_users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_identities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('password', 'google')),
  provider_subject TEXT NOT NULL,
  password_salt TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_subject),
  UNIQUE (user_id, provider),
  CHECK (
    (provider = 'password' AND password_salt IS NOT NULL AND password_hash IS NOT NULL)
    OR
    (provider = 'google' AND password_salt IS NULL AND password_hash IS NULL)
  )
);

CREATE TABLE user_sessions (
  token_hash TEXT PRIMARY KEY CHECK (char_length(token_hash) = 64),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX user_sessions_expiration_idx ON user_sessions(expires_at);

CREATE TABLE custom_teams (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  primary_color CHAR(7) NOT NULL CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  roster JSONB NOT NULL CHECK (jsonb_typeof(roster) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX custom_teams_owner_updated_idx ON custom_teams(owner_id, updated_at DESC);

CREATE TABLE tactical_boards (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  custom_team_id UUID REFERENCES custom_teams(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  state_version SMALLINT NOT NULL CHECK (state_version = 1),
  state JSONB NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX tactical_boards_owner_updated_idx ON tactical_boards(owner_id, updated_at DESC);
CREATE INDEX tactical_boards_custom_team_idx ON tactical_boards(custom_team_id);
