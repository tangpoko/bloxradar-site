-- BloxRadar schema. Safe to run more than once.

-- One row per game we have ever seen. Holds the latest details plus the all-time peak.
CREATE TABLE IF NOT EXISTS games (
  universe_id     BIGINT UNSIGNED PRIMARY KEY,
  root_place_id   BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(255) NOT NULL,
  creator_id      BIGINT UNSIGNED NOT NULL,
  creator_name    VARCHAR(255) NOT NULL,
  creator_type    ENUM('User','Group') NOT NULL,
  genre_l1        VARCHAR(64) NULL,
  genre_l2        VARCHAR(64) NULL,
  max_players     INT UNSIGNED NULL,
  visits          BIGINT UNSIGNED NULL,
  favorites       BIGINT UNSIGNED NULL,
  up_votes        BIGINT UNSIGNED NULL,
  down_votes      BIGINT UNSIGNED NULL,
  icon_url        VARCHAR(512) NULL,
  created_at      DATETIME NOT NULL,   -- when the game was made on Roblox
  updated_at      DATETIME NULL,       -- last time the developer published
  first_seen      DATETIME NOT NULL,   -- first time BloxRadar saw it
  last_seen       DATETIME NOT NULL,
  last_charted    DATETIME NULL,       -- last time it appeared in any Roblox chart
  last_above_min  DATETIME NULL,       -- last reading at or above the tracking minimum
  miss_count      TINYINT UNSIGNED NOT NULL DEFAULT 0,  -- runs in a row Roblox did not return it
  icon_checked_at DATETIME NULL,
  daily_checked_at DATETIME NULL,      -- last time src/daily.js read its badges, passes and media
  description     TEXT NULL,
  players         INT UNSIGNED NOT NULL DEFAULT 0,  -- latest reading. Only live when last_seen is the latest run.
  peak_players    INT UNSIGNED NOT NULL DEFAULT 0,
  peak_at         DATETIME NULL,
  INDEX idx_players (players),
  INDEX idx_live (last_seen, players),
  INDEX idx_created (created_at),
  INDEX idx_creator (creator_type, creator_id),
  INDEX idx_genre (genre_l1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per game per collector run (every 10 minutes). Pruned after RAW_RETENTION_DAYS.
CREATE TABLE IF NOT EXISTS snapshots (
  universe_id  BIGINT UNSIGNED NOT NULL,
  ts           DATETIME NOT NULL,
  players      INT UNSIGNED NOT NULL,
  PRIMARY KEY (universe_id, ts),
  INDEX idx_ts (ts)
) ENGINE=InnoDB;

-- Hourly average and maximum per game. Kept forever, so long-term history stays small.
CREATE TABLE IF NOT EXISTS hourly (
  universe_id  BIGINT UNSIGNED NOT NULL,
  hour         DATETIME NOT NULL,
  avg_players  INT UNSIGNED NOT NULL,
  max_players  INT UNSIGNED NOT NULL,
  PRIMARY KEY (universe_id, hour),
  INDEX idx_hour (hour)
) ENGINE=InnoDB;

-- Position of each game in each Roblox chart (Top Earning, Up-and-Coming and so on).
-- This is the position in the list Roblox serves a logged-out visitor, not an official rank:
-- Roblox filters a few entries out, so positions can be off by one or two.
CREATE TABLE IF NOT EXISTS sort_positions (
  sort_id      VARCHAR(64) NOT NULL,
  universe_id  BIGINT UNSIGNED NOT NULL,
  position     SMALLINT UNSIGNED NOT NULL,
  best_position SMALLINT UNSIGNED NOT NULL,
  best_at      DATETIME NOT NULL,
  last_seen    DATETIME NOT NULL,
  prev_position SMALLINT UNSIGNED NULL,  -- the position before the last move, null if it has not moved
  moved_at     DATETIME NULL,            -- when it last moved. The site shows an arrow for 24 hours.
  PRIMARY KEY (sort_id, universe_id),
  INDEX idx_sort_pos (sort_id, last_seen, position),
  INDEX idx_universe (universe_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Daily data, written by src/daily.js. Collected from launch day so the history
-- exists when the pages that use it get built.
-- ---------------------------------------------------------------------------

-- One row per game per day: votes, favorites, visits, and the badge-based estimates.
-- daily_players_est = past-day awards / win rate of the game's most commonly earned badge.
-- This is our reading of Roblox's numbers, not a figure Roblox publishes.
CREATE TABLE IF NOT EXISTS game_daily (
  universe_id       BIGINT UNSIGNED NOT NULL,
  day               DATE NOT NULL,
  up_votes          BIGINT UNSIGNED NULL,
  down_votes        BIGINT UNSIGNED NULL,
  favorites         BIGINT UNSIGNED NULL,
  visits            BIGINT UNSIGNED NULL,
  daily_players_est INT UNSIGNED NULL,
  est_badge_id      BIGINT UNSIGNED NULL,
  new_player_share  DECIMAL(6,4) NULL,  -- win rate of a "welcome"/"joined" badge, when one exists
  new_badge_id      BIGINT UNSIGNED NULL,
  PRIMARY KEY (universe_id, day),
  INDEX idx_day (day)
) ENGINE=InnoDB;

-- The most-earned badges of each game, per day (top BADGES_PER_GAME by past-day awards).
-- Kept so funnels and better estimates can be worked out later from the raw numbers.
-- Pruned after BADGE_RETENTION_DAYS (180) to stay inside Hostinger's 3 GB database limit.
CREATE TABLE IF NOT EXISTS badge_daily (
  badge_id          BIGINT UNSIGNED NOT NULL,
  day               DATE NOT NULL,
  universe_id       BIGINT UNSIGNED NOT NULL,
  name              VARCHAR(255) NOT NULL,
  past_day_awarded  INT UNSIGNED NOT NULL,
  win_rate          DECIMAL(6,4) NOT NULL,  -- Roblox calls it a percentage but sends a fraction: 0.059 = 5.9%
  awarded_total     BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (badge_id, day),
  INDEX idx_game_day (universe_id, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Game passes and developer products, current state.
CREATE TABLE IF NOT EXISTS products (
  kind         ENUM('pass','devproduct') NOT NULL,
  product_id   BIGINT UNSIGNED NOT NULL,   -- pass id, or developer product id
  universe_id  BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL,
  price        INT UNSIGNED NULL,          -- Robux. Some developer products come back with no price.
  for_sale     TINYINT(1) NOT NULL,
  created_at   DATETIME NULL,
  updated_at   DATETIME NULL,
  first_seen   DATETIME NOT NULL,
  last_seen    DATETIME NOT NULL,
  PRIMARY KEY (kind, product_id),
  INDEX idx_universe (universe_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dated record of everything we can see change on a game, for the change log.
-- kind: name, description, icon, thumbnails, product_added, product_removed, price, for_sale.
-- For products, ref_id is the product id and the values are the old and new price or flag.
CREATE TABLE IF NOT EXISTS game_changes (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  universe_id  BIGINT UNSIGNED NOT NULL,
  ts           DATETIME NOT NULL,
  kind         VARCHAR(32) NOT NULL,
  ref_id       BIGINT UNSIGNED NULL,
  old_value    TEXT NULL,
  new_value    TEXT NULL,
  INDEX idx_game_ts (universe_id, ts),
  INDEX idx_ts (ts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Latest seen value of each watched text field, so daily.js can spot changes cheaply.
CREATE TABLE IF NOT EXISTS game_media (
  universe_id  BIGINT UNSIGNED NOT NULL,
  kind         VARCHAR(32) NOT NULL,       -- name, description, icon, thumbnails; thumb_urls (not logged as a change)
  value        TEXT NOT NULL,
  updated_at   DATETIME NOT NULL,
  PRIMARY KEY (universe_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per collector run, for checking that the collector is healthy.
CREATE TABLE IF NOT EXISTS runs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job           VARCHAR(16) NOT NULL DEFAULT 'collect',  -- 'collect' (every 10 min), 'daily' or 'discover'
  started_at    DATETIME NOT NULL,
  finished_at   DATETIME NULL,
  games_tracked INT UNSIGNED NULL,
  games_read    INT UNSIGNED NULL,
  total_players BIGINT UNSIGNED NULL,
  error         TEXT NULL,   -- the run failed or was skipped; its data is not trustworthy
  warning       TEXT NULL    -- the run finished and saved its data, but some games were not read
) ENGINE=InnoDB;

-- Each game's best position in each chart, per hour. The collector writes the current hour on
-- every run, keeping the best (lowest) position seen in that hour. Kept CHART_HOURLY_DAYS (90)
-- days; chart_daily below keeps the per-day summary forever.
CREATE TABLE IF NOT EXISTS chart_hourly (
  universe_id  BIGINT UNSIGNED NOT NULL,
  sort_id      VARCHAR(64) NOT NULL,
  hour         DATETIME NOT NULL,
  position     SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (universe_id, sort_id, hour),
  INDEX idx_hour (hour)
) ENGINE=InnoDB;

-- One row per game per chart per UTC day it was in that chart: best position and hours in it.
-- Rolled up from chart_hourly once an hour by the collector.
CREATE TABLE IF NOT EXISTS chart_daily (
  universe_id   BIGINT UNSIGNED NOT NULL,
  sort_id       VARCHAR(64) NOT NULL,
  day           DATE NOT NULL,
  best_position SMALLINT UNSIGNED NOT NULL,
  hours_in      TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (universe_id, sort_id, day),
  INDEX idx_day (day)
) ENGINE=InnoDB;

-- Events games announce through Roblox's events feature (updates, live events), from src/daily.js.
CREATE TABLE IF NOT EXISTS game_events (
  event_id     BIGINT UNSIGNED PRIMARY KEY,
  universe_id  BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(255) NOT NULL,
  category     VARCHAR(32) NULL,          -- Roblox's first category, such as contentUpdate or activity
  start_at     DATETIME NOT NULL,
  end_at       DATETIME NULL,
  first_seen   DATETIME NOT NULL,
  last_seen    DATETIME NOT NULL,
  INDEX idx_universe (universe_id, start_at),
  INDEX idx_start (start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Games found by keyword search that are not in any Roblox chart. src/discover.js (hourly) writes
-- them, and the collector reads every one with enough players, which adds it to `games`.
CREATE TABLE IF NOT EXISTS discovered (
  universe_id  BIGINT UNSIGNED PRIMARY KEY,
  players      INT UNSIGNED NOT NULL,  -- player count in the search result when last seen
  seen_at      DATETIME NOT NULL,
  INDEX idx_seen (seen_at)
) ENGINE=InnoDB;

-- Marketplace (catalog) items seen in the lists src/catalog.js reads once a day.
-- item_type is Roblox's own: an Asset (one accessory, shirt...) or a Bundle (body, animation set).
CREATE TABLE IF NOT EXISTS catalog_items (
  item_type    ENUM('Asset','Bundle') NOT NULL,
  item_id      BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL,
  creator_id   BIGINT UNSIGNED NOT NULL,
  creator_name VARCHAR(255) NOT NULL,
  creator_type ENUM('User','Group') NOT NULL,
  kind         VARCHAR(64) NULL,          -- Roblox's first taxonomy name, such as Hair or Shirt
  thumb_url    VARCHAR(512) NULL,         -- 150 px picture; bundle addresses expire after 30 days
  thumb_at     DATETIME NULL,             -- when thumb_url was read
  created_at   DATETIME NULL,             -- when the item was made on Roblox
  first_seen   DATETIME NOT NULL,
  last_seen    DATETIME NOT NULL,
  PRIMARY KEY (item_type, item_id),
  INDEX idx_creator (creator_id),
  INDEX idx_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per item per UTC day it was in any list we read: price, favourites and, for limiteds
-- and collectibles, the lowest resale price and total quantity.
CREATE TABLE IF NOT EXISTS catalog_daily (
  item_type      ENUM('Asset','Bundle') NOT NULL,
  item_id        BIGINT UNSIGNED NOT NULL,
  day            DATE NOT NULL,
  price          INT UNSIGNED NULL,       -- Robux, NULL when not on sale
  favorites      BIGINT UNSIGNED NULL,
  lowest_resale  INT UNSIGNED NULL,
  total_quantity INT UNSIGNED NULL,
  PRIMARY KEY (item_type, item_id, day),
  INDEX idx_day (day)
) ENGINE=InnoDB;

-- Position in each list per day. The sold_* lists are Roblox's own best-selling order for paid
-- items over the past day, week, month and all time. Roblox gives the order, not sales counts.
CREATE TABLE IF NOT EXISTS catalog_rank_daily (
  list_name  VARCHAR(16) NOT NULL,        -- sold_1d, sold_7d, sold_30d, sold_all, favorited, newest; a list
                                          -- inside one catalog subcategory adds @ and its id, e.g. sold_7d@64
  day        DATE NOT NULL,
  pos        SMALLINT UNSIGNED NOT NULL,  -- 1 is the top
  item_type  ENUM('Asset','Bundle') NOT NULL,
  item_id    BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (list_name, day, pos),
  INDEX idx_item (item_type, item_id, day)
) ENGINE=InnoDB;